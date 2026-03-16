import * as os from "os";
import Active from "../active";
import API from "../api";
import InsertHistory from "./insert-history";
import Log from "../log";
import MainWindow from "../windows/main";
import MiniModeWindow from "../windows/mini-mode";
import NativeCommands from "./native-commands";
import NUX from "../nux";
import PluginManager from "../ipc/plugin-manager";
import RendererBridge from "../bridge";
import RevisionBoxWindow from "../windows/revision-box";
import Settings from "../settings";
import Stream from "../stream/stream";
import System from "./system";
import { core } from "../../gen/core";
import { commandTypeToString, isMetaResponse, isValidAlternative } from "../../shared/alternatives";

// Focus verification imports
import FocusVerificationService, {
  FocusLayer,
  FocusTarget,
  FocusSourceOfTruth,
  FocusState,
} from "../runtime/focus-verification-service";
import { FocusAuthority } from "../runtime/focus-authority-service";
import FocusHistoryService from "../runtime/focus-history-service";

// Focus pre-validation imports (FP-2.1)
import FocusPreValidator from "../runtime/focus-pre-validator";

// Focus post-validation imports (FP-2.2)
import FocusPostValidator, { FocusTransfer } from "../runtime/focus-post-validator";
import { ContractValidationResult, ContractResult, ContractViolation } from "../runtime/focus-transfer-contract";

// Focus safety monitor imports (FP-2.3)
import FocusSafetyMonitor from "../runtime/focus-safety-monitor";
import { InvariantResult, InvariantCheckRecord } from "../runtime/focus-safety-monitor";

// Focus failure analyzer imports (FP-2.4)
import FocusFailureAnalyzer from "../runtime/focus-failure-analyzer";
import { FocusFailure, FailureAnalysis, FailureType, FailureSeverity, RecommendedAction } from "../runtime/focus-failure-modes";

// Intent routing imports (FP-6A/6B)
import IntentRoutingService from "../runtime/intent-routing-service";
import { RegionKind } from "../runtime/focus-region-service";
import { ControlType } from "../runtime/focus-precision-service";

// Region focus handler imports (FP-3A)
import FocusRegionHandler from "../runtime/focus-region-handler";

export default class Executor {
  private chainFinishedPromise = Promise.resolve();
  private lastEndpointId: string = "";
  private miniModeHideTimeout?: NodeJS.Timeout;
  private pending?: core.ICommandsResponse;
  private resolveChainFinished = () => {};

  // Focus verification services (FP-1.1)
  private focusVerificationService: FocusVerificationService;
  private focusHistoryService: FocusHistoryService;

  // Focus pre-validator (FP-2.1)
  private focusPreValidator: FocusPreValidator;

  // Focus post-validator (FP-2.2)
  private focusPostValidator: FocusPostValidator;

  // Focus safety monitor (FP-2.3)
  private focusSafetyMonitor: FocusSafetyMonitor;

  // Focus failure analyzer (FP-2.4)
  private focusFailureAnalyzer: FocusFailureAnalyzer;

  // Intent routing service (FP-6A/6B)
  private intentRoutingService: IntentRoutingService;

  // Region focus handler (FP-3A)
  private regionHandler: FocusRegionHandler;

  // Map of region keywords to RegionKind
  private readonly regionKeywords: Record<string, RegionKind> = {
    "editor": RegionKind.EDITOR,
    "sidebar": RegionKind.SIDEBAR,
    "terminal": RegionKind.TERMINAL,
    "explorer": RegionKind.EXPLORER,
    "search": RegionKind.SEARCH,
    "address bar": RegionKind.ADDRESS_BAR,
    "address": RegionKind.ADDRESS_BAR,
    "page": RegionKind.PAGE,
    "panel": RegionKind.PANEL,
  };

  /**
   * Detect if a focus command targets a region within an application
   * e.g., "focus editor" -> region: EDITOR, app: vscode
   * e.g., "focus address bar" -> region: ADDRESS_BAR, app: chrome
   * 
   * NOTE: "terminal" and "term" specifically refer to VS Code terminal (region focus)
   * Use "focus console" to focus the system terminal (gnome-terminal)
   */
  private detectRegionTarget(commandText: string): { app: string; region: RegionKind } | null {
    const lower = commandText.toLowerCase().trim();
    
    // Special handling: "focus console" should go to gnome-terminal (not a region)
    // Return null so it goes through normal focus handling
    if (lower === "console" || lower.startsWith("focus console")) {
      return null;
    }
    
    // Check for VS Code regions
    if (lower.includes("vscode") || lower.includes("code")) {
      for (const [keyword, region] of Object.entries(this.regionKeywords)) {
        if (lower.includes(keyword)) {
          // VS Code doesn't support address bar
          if (region === RegionKind.ADDRESS_BAR) continue;
          return { app: "vscode", region };
        }
      }
    }
    
    // Check for Chrome regions
    if (lower.includes("chrome") || lower.includes("browser")) {
      for (const [keyword, region] of Object.entries(this.regionKeywords)) {
        if (lower.includes(keyword)) {
          return { app: "chrome", region };
        }
      }
    }
    
    // Check for standalone region commands (assume VS Code as default)
    // BUT exclude "terminal" and "term" - those should be region focus in VS Code
    for (const [keyword, region] of Object.entries(this.regionKeywords)) {
      if (lower.endsWith(keyword) || lower === keyword) {
        // Terminal ambiguity - redirect to VS Code terminal region
        if (region === RegionKind.TERMINAL) {
          // This is "focus terminal" or "focus term" - VS Code terminal region
          return { app: "vscode", region };
        }
        return { app: "vscode", region };
      }
    }
    
    return null;
  }

  // Store pre-validation result for comparison
  private lastPreValidationResult?: {
    canProceed: boolean;
    blockingIssues: string[];
  };

  constructor(
    private active: Active,
    private api: API,
    private bridge: RendererBridge,
    private insertHistory: InsertHistory,
    private log: Log,
    private mainWindow: MainWindow,
    private miniModeWindow: MiniModeWindow,
    private nativeCommands: NativeCommands,
    private nux: NUX,
    private pluginManager: PluginManager,
    private revisionBoxWindow: RevisionBoxWindow,
    private settings: Settings,
    private stream: Stream,
    private system: System,
    private commandHandler: () => any
  ) {
    this.newChainFinishedPromise();
    // Initialize focus verification services
    this.focusVerificationService = new FocusVerificationService();
    this.focusHistoryService = new FocusHistoryService({ maxEntries: 100 });

    // Initialize focus pre-validator (FP-2.1)
    this.focusPreValidator = new FocusPreValidator({ verboseLogging: true });

    // Initialize focus post-validator (FP-2.2)
    this.focusPostValidator = new FocusPostValidator({ verboseLogging: true });

    // Initialize focus safety monitor (FP-2.3)
    this.focusSafetyMonitor = new FocusSafetyMonitor({
      verboseLogging: true,
      checkIntervalMs: 5000,
      blockOnCriticalFailure: false,
    });

    // Initialize focus failure analyzer (FP-2.4)
    this.focusFailureAnalyzer = new FocusFailureAnalyzer({ verboseLogging: true });

    // Initialize intent routing service (FP-6A/6B)
    this.intentRoutingService = new IntentRoutingService();

    // Initialize region handler (FP-3A)
    this.regionHandler = new FocusRegionHandler({ verboseLogging: true });
  }

  private addToHistory(response: core.ICommandsResponse) {
    if (
      !response.execute ||
      (response.execute.commands || []).some(
        (command) =>
          command.type == core.CommandType.COMMAND_TYPE_USE ||
          command.type == core.CommandType.COMMAND_TYPE_CANCEL
      )
    ) {
      return;
    }

    this.stream.sendCallbackRequest({
      type: core.CallbackType.CALLBACK_TYPE_ADD_TO_HISTORY,
      text: response.execute.transcript!,
    });
  }

  private async checkClickable(command: core.ICommand, clickables: any[]): Promise<boolean> {
    if (this.active.isFirstPartyBrowser() && this.active.pluginConnected()) {
      const clickableResult = await this.pluginManager.sendCommandToApp(this.active.app, {
        type: core.CommandType.COMMAND_TYPE_CLICKABLE,
        path: command.path,
      });

      return clickableResult && clickableResult.data.clickable;
    } else if (this.active.app == "system dialog") {
      return clickables.indexOf(command.path) > -1;
    }

    return false;
  }

  private async handleResponseFromPlugin(forwarded: any) {
    // ChunkManager calls this with await this.executor.execute(this.response); so we want to be sure that
    // all the commands in a chain are executed before this returns. In the branch above, if there are
    // remaining commands, send a text request to run the next one and await this.chainFinishedPromise.
    // By the time we reach this branch, we will have executed all the remaining commands, so we want to resolve
    // this.chainFinishedPromise by calling its resolve function, this.resolveChainFinished, and make a new one.
    this.resolveChainFinished();
    this.newChainFinishedPromise();

    if (forwarded && forwarded.message) {
      if (forwarded.message == "callback") {
        await this.stream.sendEditorStateRequest();
        this.stream.sendCallbackRequest({
          type: forwarded.data.type,
        });
      } else if (forwarded.message == "sendText") {
        this.stream.sendTextRequest(forwarded.data.text, true);
      } else if (forwarded.message == "open") {
        await this.stream.sendEditorStateRequest();
        this.stream.sendCallbackRequest({
          type: core.CallbackType.CALLBACK_TYPE_OPEN_FILE,
        });
      } else if (forwarded.message == "paste") {
        // remove once deprecated from the chrome extension
        await this.system.pressKey("v", [os.platform() === "darwin" ? "command" : "control"]);
      }
    }
  }

  private hasExecute(response: core.ICommandsResponse): boolean {
    return !!(
      response.execute &&
      response.execute.commands &&
      response.execute.commands.length > 0
    );
  }

  private async invalidateBadApplicationCommands(
    response: core.ICommandsResponse,
    getApps: () => Promise<string[]>,
    shouldCheck: (command: core.ICommand) => boolean
  ): Promise<any> {
    if (
      response.alternatives &&
      response.alternatives.length > 0 &&
      response.alternatives.some((alternative: core.ICommandsResponseAlternative) =>
        (alternative.commands || []).some((command: core.ICommand) => shouldCheck(command))
      )
    ) {
      let apps: string[] = [];
      try {
        apps = await getApps();
      } catch (e) {
        // If we can't get running apps, don't invalidate (fail-open)
        this.log.logVerbose("Could not get running apps - not invalidating commands");
        return response;
      }

      let seen: { [k: string]: boolean } = {};
      for (let i = 0; i < response.alternatives.length; i++) {
        const alternative = response.alternatives[i];
        if (
          !alternative.commands ||
          alternative.commands.every((command: core.ICommand) => !shouldCheck(command))
        ) {
          continue;
        }

        const matches = await this.system.applicationMatches(alternative.commands[0].text!, apps);
        if (matches.length == 0 || seen[matches[0]]) {
          alternative.commands[0].type = core.CommandType.COMMAND_TYPE_INVALID;
        } else {
          seen[matches[0]] = true;
        }
      }

      if (
        response.execute &&
        response.execute.commands &&
        this.hasExecute(response) &&
        (await this.system.applicationMatches(response.execute.commands[0].text!, apps).length) == 0
      ) {
        response.execute = null;
      }
    }

    return response;
  }

  private async invalidateBadClickCommands(response: core.ICommandsResponse): Promise<any> {
    // invalidate click commands that don't correspond to any elements on the page
    if (
      response.alternatives &&
      response.alternatives.length > 0 &&
      response.alternatives
        .filter((e: core.ICommandsResponseAlternative) => isValidAlternative(e))
        .find((e: core.ICommandsResponseAlternative) => e.transcript!.startsWith("click "))
    ) {
      const clickables = await this.system.clickable();
      for (let i = 0; i < response.alternatives.length; i++) {
        if (!response.alternatives[i].transcript!.startsWith("click ")) {
          continue;
        }

        let command = response.alternatives[i].commands![0];
        if (!(await this.checkClickable(command, clickables))) {
          command.type = core.CommandType.COMMAND_TYPE_INVALID;
        }
      }

      return response;
    }

    return response;
  }

  private async invalidateBadUseCommands(response: core.ICommandsResponse): Promise<any> {
    // invalidate use commands that are too big for the pending list
    const isInvalid = async (alternative: core.ICommandsResponseAlternative) => {
      if (!alternative) {
        return true;
      }

      const use = (alternative.commands || []).filter(
        (e: core.ICommand) => e.type == core.CommandType.COMMAND_TYPE_USE
      );

      const invalidPending =
        use.length > 0 &&
        (!this.pending || (this.pending && use[0].index! > this.pending.alternatives!.length));

      if (this.active.isFirstPartyBrowser() && this.active.pluginConnected()) {
        let invalidChrome = false;
        if (use.length > 0) {
          const clickableResult = await this.pluginManager.sendCommandToApp(this.active.app, {
            type: core.CommandType.COMMAND_TYPE_CLICKABLE,
            path: use[0].index!.toString(),
          });

          if (!clickableResult || !clickableResult.data.clickable) {
            invalidChrome = true;
          } else {
            // the extension tells us there's a valid command, so don't run any pending command on the client too
            this.clearPending();
          }
        }

        return invalidChrome && invalidPending;
      } else {
        return invalidPending;
      }
    };

    if (response.alternatives) {
      for (let i = 0; i < response.alternatives.length; i++) {
        if ((await isInvalid(response.alternatives[i])) && response.alternatives[i].commands) {
          response.alternatives[i].commands!.map((e: core.ICommand) => {
            e.type = core.CommandType.COMMAND_TYPE_INVALID;
          });
        }
      }
    }

    if (response.execute && (await isInvalid(response.execute))) {
      response.execute = null;
    }

    return response;
  }

  private async invalidateMaxKeystrokeCommands(response: any): Promise<any> {
    const state = await this.active.getEditorState();
    for (let alternative of response.alternatives) {
      let count: number = 0;
      for (const command of alternative.commands) {
        const commandType = command.type;
        if (commandType == core.CommandType.COMMAND_TYPE_DIFF && !state.canSetState) {
          count += this.nativeCommands.diffKeystrokesCount(state, command);
        } else if (commandType == core.CommandType.COMMAND_TYPE_INSERT) {
          count += this.nativeCommands.insertKeystrokesCount(state, command.text);
        } else if (
          commandType == core.CommandType.COMMAND_TYPE_UNDO &&
          this.nativeCommands.needsUndoStack(state) &&
          this.nativeCommands.canUndo(state)
        ) {
          count += this.nativeCommands.undoKeystrokesCount(state);
        } else if (
          commandType == core.CommandType.COMMAND_TYPE_REDO &&
          this.nativeCommands.needsUndoStack(state) &&
          this.nativeCommands.canRedo()
        ) {
          count += this.nativeCommands.redoKeystrokesCount(state);
        }
      }

      if (count >= this.nativeCommands.maxKeystrokes) {
        alternative.description = "Too many keystrokes: " + alternative.description;
        alternative.commands.map((e: any) => {
          e.type = core.CommandType.COMMAND_TYPE_INVALID;
        });
      }
    }

    return response;
  }

  private newChainFinishedPromise() {
    this.chainFinishedPromise = new Promise((resolve) => {
      this.resolveChainFinished = resolve;
    });
  }

  private removeCommandsForUseOrCancel(response: core.ICommandsResponse): any {
    if (isMetaResponse(response) && response.alternatives && response.alternatives.length > 0) {
      response.execute = response.alternatives[0];
      response.alternatives = [];
    }

    return response;
  }

  private savePendingResponseIfNeeded(response: core.ICommandsResponse) {
    // ignore execute-only responses
    if (
      (!response.alternatives || response.alternatives.length == 0) &&
      this.hasExecute(response)
    ) {
      return;
    }

    const filteredResponse = new core.CommandsResponse({
      endpointId: response.endpointId!,
      alternatives: response.alternatives!.filter((e: core.ICommandsResponseAlternative) =>
        isValidAlternative(e)
      ),
    });

    this.pending = filteredResponse;
  }

  private setExecuteToFirstAlternativeIfNeeded(response: core.ICommandsResponse): any {
    const valid = (response.alternatives || []).filter((e: core.ICommandsResponseAlternative) =>
      isValidAlternative(e)
    );

    if (this.hasExecute(response) || valid.length == 0) {
      return response;
    }

    const autoExecuteCommandTypes: core.CommandType[] = [
      core.CommandType.COMMAND_TYPE_DIFF,
      core.CommandType.COMMAND_TYPE_CANCEL,
      core.CommandType.COMMAND_TYPE_CLIPBOARD,
      core.CommandType.COMMAND_TYPE_COPY,
      core.CommandType.COMMAND_TYPE_INSERT,
      core.CommandType.COMMAND_TYPE_SCROLL,
      core.CommandType.COMMAND_TYPE_LANGUAGE_MODE,
      core.CommandType.COMMAND_TYPE_NEXT,
      core.CommandType.COMMAND_TYPE_PASTE,
      core.CommandType.COMMAND_TYPE_PAUSE,
      core.CommandType.COMMAND_TYPE_REDO,
      core.CommandType.COMMAND_TYPE_SAVE,
      core.CommandType.COMMAND_TYPE_SHOW,
      core.CommandType.COMMAND_TYPE_UNDO,
      core.CommandType.COMMAND_TYPE_USE,
      core.CommandType.COMMAND_TYPE_DEBUGGER_CONTINUE,
      core.CommandType.COMMAND_TYPE_DEBUGGER_INLINE_BREAKPOINT,
      core.CommandType.COMMAND_TYPE_DEBUGGER_PAUSE,
      core.CommandType.COMMAND_TYPE_DEBUGGER_SHOW_HOVER,
      core.CommandType.COMMAND_TYPE_DEBUGGER_START,
      core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_INTO,
      core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_OUT,
      core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_OVER,
      core.CommandType.COMMAND_TYPE_DEBUGGER_STOP,
      core.CommandType.COMMAND_TYPE_DEBUGGER_TOGGLE_BREAKPOINT,
      core.CommandType.COMMAND_TYPE_START_DICTATE,
      core.CommandType.COMMAND_TYPE_STOP_DICTATE,
      core.CommandType.COMMAND_TYPE_SHOW_REVISION_BOX,
      core.CommandType.COMMAND_TYPE_HIDE_REVISION_BOX,
      // FP-6A: Add FOCUS to auto-execute so "focus chrome" works automatically
      core.CommandType.COMMAND_TYPE_FOCUS,
    ];

    const executeKeys: string[] = [
      "up",
      "down",
      "left",
      "right",
      "space",
      "enter",
      "tab",
      "pagedown",
      "pageup",
    ];

    if (!valid[0].transcript || !valid[0].commands || valid[0].commands.length == 0) {
      return response;
    }

    // run commands are often in a terminal, where we don't want to do things unexpectedly
    if (valid[0].transcript.startsWith("run")) {
      return response;
    }

    // focus commands should always auto-execute (FP-6A)
    if (valid[0].transcript.startsWith("focus")) {
      response.execute = valid[0];
      return response;
    }

    if (
      valid.length == 1 ||
      valid[0].commands.every(
        (e) =>
          autoExecuteCommandTypes.includes(e.type || core.CommandType.COMMAND_TYPE_NONE) ||
          (e.type == core.CommandType.COMMAND_TYPE_PRESS && executeKeys.includes(e.text || ""))
      )
    ) {
      response.execute = valid[0];
    } else if (valid[0].commands[0].type == core.CommandType.COMMAND_TYPE_CUSTOM) {
      const custom = this.active.customCommands.filter(
        (e) => e.id == valid[0].commands![0].customCommandId && e.autoExecute
      );

      if (custom.length > 0) {
        response.execute = valid[0];
      }
    }

    return response;
  }

  clearPending() {
    this.pending = undefined;
  }

  async execute(response: core.ICommandsResponse, updateRenderer: boolean = true) {
    this.lastEndpointId = response.endpointId!;

    // reset the state of the alternatives spinner each time a new command is executed,
    // and if the command needs a spinner, it will set it back below
    this.bridge.setState(
      {
        alternativesSpinner: [],
      },
      [this.mainWindow, this.miniModeWindow]
    );

    if (updateRenderer) {
      this.showAlternativesIfPresent(response);
    }

    if (response.alternatives && response.alternatives.length > 0) {
      this.nativeCommands.useNeedsUndo = false;
    }

    if (!this.hasExecute(response)) {
      this.resolveChainFinished();
      this.newChainFinishedPromise();
      return;
    } else {
      this.addToHistory(response);
    }

    let forwardToPlugin = true;
    if (
      (this.active.app == "jetbrains" && this.active.filename == "jetbrains-modal") ||
      this.revisionBoxWindow.shown()
    ) {
      forwardToPlugin = false;
    }
    if (
      forwardToPlugin &&
      !this.settings.getNuxCompleted() &&
      response.execute &&
      response.execute.commands
    ) {
      for (const command of response.execute.commands) {
        if (command.type == core.CommandType.COMMAND_TYPE_UNDO) {
          forwardToPlugin = false;
        }
      }
    }

    let pluginResponse;
    if (forwardToPlugin) {
      // try forwarding commands to the active application plugin
      try {
        pluginResponse = await this.pluginManager.sendResponseToApp(this.active.app, response);
      } catch (e) {
        console.log(e);
      }
    }

    // process supported commands with the client's handler directly
    if (response.execute && response.execute.commands) {
      for (const command of response.execute.commands) {
        const commandType = commandTypeToString(command.type!);
        if (commandType in this.commandHandler()) {
          if (
            command.type != core.CommandType.COMMAND_TYPE_DIFF &&
            command.type != core.CommandType.COMMAND_TYPE_INSERT &&
            command.type != core.CommandType.COMMAND_TYPE_RUN
          ) {
            this.insertHistory.clear();
          }

          // FP-3A: Check if this is a region focus command BEFORE executing the command
          // "focus terminal" should go to VS Code terminal, not gnome-terminal
          let skipCommandHandler = false;
          if (command.type == core.CommandType.COMMAND_TYPE_FOCUS && command.text) {
            const regionTarget = this.detectRegionTarget(command.text);
            if (regionTarget) {
              console.log(`[EXECUTOR] Region focus detected: app=${regionTarget.app}, region=${regionTarget.region}`);
              
              // Log region focus for history
              this.log.logVerbose(`Region focus: ${regionTarget.region} in ${regionTarget.app}`);
              
              // Focus the region within the application using the region handler
              try {
                const target: FocusTarget = {
                  entity: regionTarget.app,
                  layer: FocusLayer.REGION,
                  regionKind: regionTarget.region,
                };
                
                const regionResult = await this.regionHandler.executeRegionTransfer(target, {});
                if (regionResult.success) {
                  console.log(`[EXECUTOR] Region focus SUCCESS: ${regionResult.details}`);
                  this.log.logVerbose(`Region focus succeeded: ${regionResult.details}`);
                } else {
                  console.log(`[EXECUTOR] Region focus FAILED: ${regionResult.details}`);
                  this.log.logVerbose(`Region focus failed: ${regionResult.details}`);
                }
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.log(`[EXECUTOR] Region focus error: ${errorMsg}`);
                this.log.logVerbose(`Region focus error: ${errorMsg}`);
              }
              
              // Skip the normal focus handler - we've already handled the region
              skipCommandHandler = true;
            }
          }

          // Execute the command handler unless we handled it as a region focus
          if (!skipCommandHandler) {
            await this.commandHandler()[commandType](command);
          }

          // FP-1.1: Verify focus transfer after FOCUS command
          if (command.type == core.CommandType.COMMAND_TYPE_FOCUS && command.text && !skipCommandHandler) {
            
            // FP-6A/6B: Run intent routing before focus transfer
            console.log(`[EXECUTOR] Running intent routing for: ${command.text}`);
            const routingResult = this.intentRoutingService.routeCommandHardened({
              command: command.text!,
              currentApplication: this.active.app,
            });

            console.log(`[EXECUTOR] Routing result: success=${routingResult.telemetry.success}, outcome=${routingResult.telemetry.outcome}`);

            // Log intent routing result
            this.log.logVerbose(
              `[ROUTING] command="${command.text}"` +
              ` outcome=${routingResult.telemetry.outcome}` +
              ` focusAgreement=${routingResult.telemetry.focusRoutingAgreement}` +
              ` success=${routingResult.telemetry.success}`
            );

            // If routing failed, abort the focus transfer (but focus may have already happened)
            // For FOCUS commands, allow through even if routing fails - focus already executed
            if (!routingResult.telemetry.success && command.type != core.CommandType.COMMAND_TYPE_FOCUS) {
              console.log(`[EXECUTOR] Routing failed, aborting focus transfer: ${routingResult.telemetry.error}`);
              this.log.logVerbose(
                `[ROUTING] Aborted: ${routingResult.telemetry.error || routingResult.result.error}`
              );
              // Continue to next command - don't attempt the transfer
              continue;
            } else if (!routingResult.telemetry.success) {
              // FOCUS command - routing failed but xdotool may have already run, allow through
              console.log(`[EXECUTOR] FOCUS command - routing failed but allowing through: ${routingResult.telemetry.error}`);
            }

            // FP-2.3: Run pre-transfer invariant checks
            await this.checkSafetyInvariantsPreTransfer();

            // FP-2.1: Run pre-validation before focus transfer
            const preValidation = await this.preValidateFocusTransfer(
              command.text,
              FocusLayer.APPLICATION
            );

            // Store pre-validation result for post-comparison
            this.lastPreValidationResult = {
              canProceed: preValidation.canProceed,
              blockingIssues: preValidation.blockingIssues,
            };

            // Get and store pre-transfer state for side-effect comparison
            const preTransferState = await this.focusPreValidator.getCurrentSourceState();
            this.focusPostValidator.setPreTransferState(preTransferState);

            // Skip transfer if pre-validation failed
            if (!preValidation.canProceed) {
              this.log.logVerbose(
                `Focus pre-validation FAILED: ${preValidation.blockingIssues.join("; ")}`
              );
              // Continue to next command - don't attempt the transfer
              continue;
            }

            this.log.logVerbose(
              "Focus pre-validation PASSED - proceeding with transfer"
            );

            // Proceed with focus transfer verification
            const verificationResult = await this.verifyFocusTransfer(
              command.text,
              FocusLayer.APPLICATION
            );

            // FP-2.2: Run post-validation after focus transfer
            await this.postValidateFocusTransfer(
              command.text,
              FocusLayer.APPLICATION,
              preTransferState,
              verificationResult
            );

            // FP-2.3: Run post-transfer invariant checks
            await this.checkSafetyInvariantsPostTransfer();
          }

          if (
            command.type == core.CommandType.COMMAND_TYPE_RUN ||
            command.type == core.CommandType.COMMAND_TYPE_PRESS
          ) {
            this.insertHistory.clear();
          }
        }
      }
    }

    if (response.execute && response.execute.remaining) {
      await this.executeChain(response.execute.remaining);
    } else {
      this.handleResponseFromPlugin(pluginResponse);
    }

    this.nux.updateForResponse(response);
  }

  async executePending(index: number) {
    if (this.pending && this.pending.alternatives) {
      const alternative = this.pending.alternatives[index];
      if (alternative) {
        if (this.settings.getLogAudio() || this.settings.getLogSource()) {
          this.api.logEvent("client.stream.resolution", {
            dt: Date.now(),
            data: {
              endpoint_id: this.lastEndpointId,
              resolved_alternative_id: alternative.alternativeId,
              resolved_endpoint_id: this.pending.endpointId,
            },
          });
        }

        await this.execute({ execute: alternative }, false);
        this.bridge.setState(
          {
            highlighted: [index],
          },
          [this.mainWindow, this.miniModeWindow]
        );
      }
    }
  }

  async executeChain(text: string) {
    this.log.logVerbose(`Executing chain: ${text}`);
    await this.stream.sendInitializeRequest();
    this.stream.sendCallbackRequest({
      type: core.CallbackType.CALLBACK_TYPE_CHAIN,
      text,
    });

    await this.chainFinishedPromise;
  }

  async postProcessResponse(response: core.ICommandsResponse) {
    if (!response.alternatives) {
      return response;
    }

    if (os.platform() != "linux") {
      response = await this.invalidateBadApplicationCommands(
        response,
        () => this.system.installedApplications(),
        (command: core.ICommand) => command.type == core.CommandType.COMMAND_TYPE_LAUNCH
      );
    }

    response = await this.invalidateBadApplicationCommands(
      response,
      () => this.system.runningApplications(),
      (command: core.ICommand) =>
        command.type == core.CommandType.COMMAND_TYPE_QUIT
    );

    response = await this.invalidateBadClickCommands(response);
    response = await this.invalidateBadUseCommands(response);
    response = await this.invalidateMaxKeystrokeCommands(response);
    response = this.removeCommandsForUseOrCancel(response);
    response = this.truncateAlternativesIfNeeded(response);
    response = this.setExecuteToFirstAlternativeIfNeeded(response);
    return response;
  }

  showAlternativesIfPresent(response: core.ICommandsResponse) {
    // don't show alternatives for meta responses, since that would blow away the choices
    if (isMetaResponse(response)) {
      return;
    }

    if (response.alternatives && response.alternatives.length > 0) {
      // Debug: Log all alternatives with their commands
      for (const alt of (response.alternatives || [])) {
        console.log("[EXECUTOR] Alternative:", alt.transcript, "commands:", JSON.stringify((alt.commands || []).map((cmd: any) => ({ 
          type: core.CommandType[cmd.type], 
          typeNum: cmd.type,
          text: cmd.text 
        }))));
      }
      
      this.log.logVerbose(
        `Showing alternatives [${response.alternatives.map((e: any) => e.transcript).join(", ")}]`
      );

      this.bridge.setState(
        {
          alternatives: response.alternatives,
        },
        [this.mainWindow, this.miniModeWindow]
      );

      if (response.final) {
        this.savePendingResponseIfNeeded(response);
        this.bridge.setState(
          {
            highlighted: this.hasExecute(response) ? [0] : [],
          },
          [this.mainWindow, this.miniModeWindow]
        );
      }
    }

    if (
      (this.settings.getMiniMode() || !this.mainWindow.shown()) &&
      this.settings.getUseMiniModeHideTimeout()
    ) {
      if (this.miniModeHideTimeout) {
        clearTimeout(this.miniModeHideTimeout);
      }

      this.miniModeHideTimeout = global.setTimeout(() => {
        this.bridge.setState(
          {
            alternatives: [],
          },
          [this.mainWindow, this.miniModeWindow]
        );
      }, Math.max(1, 1000 * this.settings.getMiniModeHideTimeout()));
    }

    setTimeout(() => {
      this.bridge.send("updateMiniModeWindowHeight", {}, [this.miniModeWindow]);
    }, 50);
  }

  truncateAlternativesIfNeeded(response: core.ICommandsResponse): core.ICommandsResponse {
    if (
      (this.settings.getMiniMode() || !this.mainWindow.shown()) &&
      this.settings.getUseMiniModeFewerAlternatives()
    ) {
      response.alternatives = (response.alternatives || []).slice(
        0,
        Math.max(1, this.settings.getMiniModeFewerAlternativesCount())
      );
    }

    return response;
  }

  /**
   * Verify a focus transfer and log the result
   * Part of FP-1.1: Verification step after focus transfer
   *
   * @param targetName - The name of the target application/window
   * @param layer - The focus layer (APPLICATION or WINDOW)
   * @returns The verification result
   */
  async verifyFocusTransfer(
    targetName: string,
    layer: FocusLayer = FocusLayer.APPLICATION
  ): Promise<{
    success: boolean;
    confidence: number;
    details: string;
  }> {
    const target: FocusTarget = {
      entity: targetName,
      layer,
    };

    try {
      const result = await this.focusVerificationService.verifyFocusTransfer(target);

      // Log the verification result
      this.log.logVerbose(
        "Focus verification: " + (result.success ? "SUCCESS" : "FAILED") + " - " +
          result.details + " (confidence: " + result.confidence.toFixed(2) + ")"
      );

      // Add to history
      this.focusHistoryService.addEntry(target, result);

      // Log history stats
      const stats = this.focusHistoryService.getStats();
      this.log.logVerbose(
        "Focus history: " + stats.successfulTransfers + "/" + stats.totalAttempts + " successful " +
          "(rate: " + (stats.successRate * 100).toFixed(1) + "%)"
      );

      return {
        success: result.success,
        confidence: result.confidence,
        details: result.details,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.logVerbose(`Focus verification error: ${errorMessage}`);

      return {
        success: false,
        confidence: 0,
        details: `Verification error: ${errorMessage}`,
      };
    }
  }

  /**
   * Get the focus history service for external access
   */
  getFocusHistoryService(): FocusHistoryService {
    return this.focusHistoryService;
  }

  /**
   * Pre-validate a focus transfer before attempting it
   * Part of FP-2.1: Pre-transfer validation checks
   *
   * @param targetName - The name of the target application/window
   * @param layer - The focus layer (APPLICATION or WINDOW)
   * @returns Pre-validation result with canProceed flag
   */
  async preValidateFocusTransfer(
    targetName: string,
    layer: FocusLayer = FocusLayer.APPLICATION
  ): Promise<{
    canProceed: boolean;
    valid: boolean;
    blockingIssues: string[];
    validationResult: import("../runtime/focus-pre-validator").PreValidationResult | null;
  }> {
    const target: FocusTarget = {
      entity: targetName,
      layer,
    };

    try {
      // Run pre-validation
      const validationResult = await this.focusPreValidator.validatePreConditions(target);

      // Log validation details
      this.log.logVerbose(
        `Focus pre-validation: ${validationResult.canProceed ? "PASSED" : "FAILED"}`
      );

      for (const check of validationResult.checks) {
        this.log.logVerbose(
          `  - ${check.name}: ${check.passed ? "PASS" : "FAIL"} - ${check.details}`
        );
      }

      if (validationResult.blockingIssues.length > 0) {
        this.log.logVerbose(
          `  Blocking: ${validationResult.blockingIssues.join("; ")}`
        );
      }

      return {
        canProceed: validationResult.canProceed,
        valid: validationResult.valid,
        blockingIssues: validationResult.blockingIssues,
        validationResult,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.logVerbose(`Focus pre-validation error: ${errorMessage}`);

      // On error, we allow the transfer to proceed (fail-open policy)
      // This prevents blocking transfers due to validation issues
      return {
        canProceed: true,
        valid: false,
        blockingIssues: [`Validation error: ${errorMessage}`],
        validationResult: null,
      };
    }
  }

  /**
   * Get the pre-validator for external access
   */
  getFocusPreValidator(): FocusPreValidator {
    return this.focusPreValidator;
  }

  /**
   * Post-validate a focus transfer after the transfer attempt
   * Part of FP-2.2: Post-transfer contract verification
   *
   * @param targetName - The name of the target application/window
   * @param layer - The focus layer (APPLICATION or WINDOW)
   * @param preTransferState - The focus state before transfer
   * @param verificationResult - The result from focus verification
   * @returns Contract result with pass/fail status
   */
  async postValidateFocusTransfer(
    targetName: string,
    layer: FocusLayer,
    preTransferState: import("../runtime/focus-verification-service").FocusState,
    verificationResult: { success: boolean; confidence: number; details: string }
  ): Promise<ContractResult> {
    const target: FocusTarget = {
      entity: targetName,
      layer,
    };

    try {
      // Get the current (post-transfer) state
      const postTransferState = await this.focusVerificationService.queryCurrentFocus();

      // Build verification result object for the post-validator
      const focusVerificationResult: import("../runtime/focus-verification-service").FocusVerificationResult = {
        success: verificationResult.success,
        confidence: verificationResult.confidence,
        actual: postTransferState,
        expected: {
          entity: targetName.toLowerCase(),
          layer,
          sourceOfTruth: FocusSourceOfTruth.OPERATING_SYSTEM,
          timestamp: new Date().toISOString(),
        },
        details: verificationResult.details,
        authorityAnalysis: {
          classifications: [],
          primaryAuthority: FocusAuthority.OS_NATIVE,
          hasConflicts: false,
          timestamp: new Date().toISOString(),
        },
      };

      // Set the verification result in the post-validator
      this.focusPostValidator.setVerificationResult(focusVerificationResult, target);

      // Build the focus transfer object
      const transfer: FocusTransfer = {
        target,
        sourceState: preTransferState,
        actualState: postTransferState,
        verificationResult: focusVerificationResult,
        timestamp: new Date().toISOString(),
      };

      // Run post-validation
      const validationResult = await this.focusPostValidator.validatePostConditions(transfer);

      // Log contract violations
      if (!validationResult.passed) {
        this.log.logVerbose(
          `Focus post-validation FAILED: ${validationResult.postConditions
            .filter((pc) => !pc.satisfied)
            .map((pc) => pc.name)
            .join("; ")}`
        );

        for (const violation of validationResult.violations) {
          this.log.logVerbose(
            `  Contract violation [${violation.severity}]: ${violation.contractName}`
          );
          this.log.logVerbose(`    Expected: ${violation.expected}`);
          this.log.logVerbose(`    Actual: ${violation.actual}`);
        }

        if (validationResult.remediation.length > 0) {
          this.log.logVerbose(
            `  Remediation: ${validationResult.remediation.join("; ")}`
          );
        }
      } else {
        this.log.logVerbose(
          "Focus post-validation PASSED - all contract conditions satisfied"
        );
      }

      // Compare with pre-validation expectations
      if (this.lastPreValidationResult) {
        if (this.lastPreValidationResult.canProceed && !validationResult.passed) {
          this.log.logVerbose(
            "Contract violation: Pre-validation allowed but post-validation failed"
          );
        } else if (!this.lastPreValidationResult.canProceed && validationResult.passed) {
          this.log.logVerbose(
            "Contract info: Pre-validation blocked but post-validation passed (possible race condition)"
          );
        }
      }

      // Add to history with contract result
      this.focusHistoryService.addEntryWithContractResult(target, focusVerificationResult, validationResult);

      // Clear the cached state
      this.focusPostValidator.clearCache();

      return {
        passed: validationResult.passed,
        summary: validationResult.passed
          ? "All post-conditions satisfied"
          : `Failed: ${validationResult.postConditions
              .filter((pc) => !pc.satisfied)
              .map((pc) => pc.name)
              .join(", ")}`,
        validationResult,
        transferSuccessful: verificationResult.success && validationResult.passed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.logVerbose(`Focus post-validation error: ${errorMessage}`);

      return {
        passed: false,
        summary: `Post-validation error: ${errorMessage}`,
        validationResult: {
          passed: false,
          postConditions: [],
          violations: [
            {
              contractName: "postValidation",
              expected: "Post-validation should complete successfully",
              actual: errorMessage,
              severity: "critical",
              timestamp: new Date().toISOString(),
            },
          ],
          remediation: ["Check system state and retry"],
          confidence: 0,
          timestamp: new Date().toISOString(),
        },
        transferSuccessful: false,
      };
    }
  }

  /**
   * Get the post-validator for external access
   */
  getFocusPostValidator(): FocusPostValidator {
    return this.focusPostValidator;
  }

  /**
   * Get the safety monitor for external access
   */
  getFocusSafetyMonitor(): FocusSafetyMonitor {
    return this.focusSafetyMonitor;
  }

  /**
   * Run safety invariant checks before a focus transfer
   * Part of FP-2.3: Safety invariant enforcement
   *
   * @returns Result of invariant checks with any violations
   */
  async checkSafetyInvariantsPreTransfer(): Promise<{
    allSatisfied: boolean;
    violations: InvariantResult[];
  }> {
    try {
      const invariants = this.focusSafetyMonitor.getActiveInvariants();
      const violations: InvariantResult[] = [];

      for (const invariant of invariants) {
        const result = await this.focusSafetyMonitor.checkInvariant(invariant);

        if (!result.satisfied) {
          violations.push(result);
          this.log.logVerbose(
            `Pre-transfer invariant violation [${result.severity}]: ${invariant.name} - ${result.details}`
          );
        }
      }

      const allSatisfied = violations.length === 0;

      if (!allSatisfied) {
        const criticalViolations = violations.filter((v) => v.severity === "critical");
        if (criticalViolations.length > 0) {
          this.log.logVerbose(
            `CRITICAL: ${criticalViolations.length} critical invariant violation(s) detected before focus transfer`
          );
        }
      } else {
        this.log.logVerbose("Pre-transfer invariant checks: ALL SATISFIED");
      }

      return { allSatisfied, violations };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.logVerbose(`Pre-transfer invariant check error: ${errorMessage}`);
      // Fail open - allow transfer to proceed if invariant check fails
      return { allSatisfied: true, violations: [] };
    }
  }

  /**
   * Run safety invariant checks after a focus transfer
   * Part of FP-2.3: Safety invariant enforcement
   *
   * @returns Result of invariant checks with any violations
   */
  async checkSafetyInvariantsPostTransfer(): Promise<{
    allSatisfied: boolean;
    violations: InvariantResult[];
  }> {
    try {
      const invariants = this.focusSafetyMonitor.getActiveInvariants();
      const violations: InvariantResult[] = [];

      for (const invariant of invariants) {
        const result = await this.focusSafetyMonitor.checkInvariant(invariant);

        if (!result.satisfied) {
          violations.push(result);
          this.log.logVerbose(
            `Post-transfer invariant violation [${result.severity}]: ${invariant.name} - ${result.details}`
          );
        }
      }

      const allSatisfied = violations.length === 0;

      if (!allSatisfied) {
        const criticalViolations = violations.filter((v) => v.severity === "critical");
        if (criticalViolations.length > 0) {
          this.log.logVerbose(
            `CRITICAL: ${criticalViolations.length} critical invariant violation(s) detected after focus transfer`
          );
        }

        // Store invariant check results in history
        const historyRecords = this.focusSafetyMonitor.getHistory(10);
        for (const record of historyRecords) {
          if (!record.satisfied) {
            this.log.logVerbose(
              `  Invariant history: ${record.invariantType} - ${record.details}`
            );
          }
        }
      } else {
        this.log.logVerbose("Post-transfer invariant checks: ALL SATISFIED");
      }

      return { allSatisfied, violations };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.logVerbose(`Post-transfer invariant check error: ${errorMessage}`);
      // Fail open - don't block on check error
      return { allSatisfied: true, violations: [] };
    }
  }

  /**
   * Start the continuous safety invariant monitoring
   * Should be called when the application starts
   */
  startSafetyMonitoring(): void {
    this.focusSafetyMonitor.startMonitoring();
    this.log.logVerbose("Safety invariant monitoring started");
  }

  /**
   * Stop the continuous safety invariant monitoring
   * Should be called when the application shuts down
   */
  stopSafetyMonitoring(): void {
    this.focusSafetyMonitor.stopMonitoring();
    this.log.logVerbose("Safety invariant monitoring stopped");
  }

  /**
   * Get the failure analyzer for external access
   */
  getFocusFailureAnalyzer(): FocusFailureAnalyzer {
    return this.focusFailureAnalyzer;
  }

  /**
   * Analyze a focus transfer failure
   * Part of FP-2.4: Failure analysis integration
   *
   * @param failure - The failure to analyze
   * @returns Complete failure analysis
   */
  analyzeFocusFailure(failure: FocusFailure): FailureAnalysis {
    // Analyze the failure
    const analysis = this.focusFailureAnalyzer.analyzeFailure(failure);

    // Log failure analysis results
    this.logFailureAnalysis(analysis);

    // Add failure analysis to history
    this.focusHistoryService.addFailureAnalysis(analysis);

    return analysis;
  }

  /**
   * Create and analyze a failure from current focus transfer state
   *
   * @param type - The type of failure
   * @param error - The error that occurred
   * @param target - The target that was being transferred to
   * @param sourceState - The source state before transfer
   * @param actualState - The actual state when failure occurred
   * @param violations - Contract violations if any
   * @returns Complete failure analysis
   */
  createAndAnalyzeFailure(
    type: FailureType,
    error: Error,
    target?: FocusTarget,
    sourceState?: FocusState,
    actualState?: FocusState,
    violations?: ContractViolation[]
  ): FailureAnalysis {
    const failure: FocusFailure = {
      type,
      error,
      target,
      sourceState,
      actualState,
      violations,
      timestamp: new Date().toISOString(),
    };

    return this.analyzeFocusFailure(failure);
  }

  /**
   * Log failure analysis results
   */
  private logFailureAnalysis(analysis: FailureAnalysis): void {
    this.log.logVerbose(`[FP-2.4] Failure Analysis Report:`);
    this.log.logVerbose(`  Type: ${analysis.type}`);
    this.log.logVerbose(`  Severity: ${analysis.severity}`);
    this.log.logVerbose(`  Recoverable: ${analysis.isRecoverable}`);
    this.log.logVerbose(`  Recommended Action: ${analysis.recommendedAction}`);
    this.log.logVerbose(`  Root Cause: ${analysis.rootCause.category} - ${analysis.rootCause.explanation}`);

    if (analysis.rootCause.evidence.length > 0) {
      this.log.logVerbose(`  Evidence:`);
      for (const evidence of analysis.rootCause.evidence) {
        this.log.logVerbose(`    - ${evidence}`);
      }
    }

    if (analysis.recoverySuggestions.length > 0) {
      this.log.logVerbose(`  Recovery Suggestions:`);
      for (const suggestion of analysis.recoverySuggestions) {
        this.log.logVerbose(`    [${suggestion.action}] ${suggestion.description} (priority: ${suggestion.priority})`);
        if (suggestion.warnings && suggestion.warnings.length > 0) {
          for (const warning of suggestion.warnings) {
            this.log.logVerbose(`      WARNING: ${warning}`);
          }
        }
      }
    }

    this.log.logVerbose(`  Analysis Time: ${analysis.metadata.analysisDurationMs}ms`);
  }

  /**
   * Get failure analysis statistics
   */
  getFailureAnalysisStats(): {
    totalAnalyzed: number;
    byType: Record<FailureType, number>;
    bySeverity: Record<FailureSeverity, number>;
    averageAnalysisTime: number;
  } {
    return this.focusFailureAnalyzer.getAnalysisStats();
  }
}
