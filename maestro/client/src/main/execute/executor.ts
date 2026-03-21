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
import SettingsWindow from "../windows/settings";
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
import ExecutionTrace from "../runtime/execution-trace";

// Focus pre-validation imports (FP-2.1)
import FocusPreValidator from "../runtime/focus-pre-validator";

// Focus post-validation imports (FP-2.2)
import FocusPostValidator, { FocusTransfer } from "../runtime/focus-post-validator";
import { ContractResult, ContractViolation } from "../runtime/focus-transfer-contract";

// Focus safety monitor imports (FP-2.3)
import FocusSafetyMonitor from "../runtime/focus-safety-monitor";
import { InvariantResult } from "../runtime/focus-safety-monitor";

// Focus failure analyzer imports (FP-2.4)
import FocusFailureAnalyzer from "../runtime/focus-failure-analyzer";
import { FocusFailure, FailureAnalysis, FailureType, FailureSeverity } from "../runtime/focus-failure-modes";

// Intent routing imports (FP-6A/6B)
import IntentRoutingService from "../runtime/intent-routing-service";
import { RegionKind } from "../runtime/focus-region-service";
import { ControlType } from "../runtime/focus-precision-service";

// Region focus handler imports (FP-3A)
import FocusRegionHandler from "../runtime/focus-region-handler";

// Focus recovery imports (FP-5A/5B)
import FocusRecoveryService from "../runtime/focus-recovery-service";

// Identity and Security imports (FP-2A)
import IdentityGatewayService from "../runtime/identity-gateway-service";
import { CommandRiskLevel, AuthorizationDecision, InteractionMode } from "../runtime/authorization-service";
import { SecurityMode } from "../runtime/security-mode-service";
import SecuritySessionPolicyService, {
  SecuritySessionPersistenceState,
  SecurityTrustState,
} from "../runtime/security-session-policy-service";
import { phase3BReplayAuditService } from "../runtime/phase3b-replay-audit-service";

// Workflow and Nexus imports (FP-2B)
import WorkflowContractService, {
  WorkflowClass,
  StepRole,
  StepFailurePolicy,
  StepStatus,
} from "../runtime/workflow-contract-service";
import NexusProtocolBoundaryService, {
  NexusProposal,
  ProposalExecutionContext,
} from "../runtime/nexus-protocol-boundary-service";
import WorkflowExecutionService from "../runtime/workflow-nexus-integration";
import { ModalContext, modalAwarenessService } from "../runtime/modal-awareness-service";
import { SurfaceContext, surfaceModelService } from "../runtime/surface-model-service";

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

  // Focus recovery service (FP-5A/5B)
  private focusRecoveryService: FocusRecoveryService;

  // Identity and Security services (FP-2A)
  private identityGateway: IdentityGatewayService;

  // Workflow and Nexus services (FP-2B)
  private workflowService: WorkflowContractService;
  private nexusBoundary: NexusProtocolBoundaryService;
  private workflowExecutionService: WorkflowExecutionService;
  private executionTrace?: ExecutionTrace;
  private lastRuntimeSurfaceKey: string = "";
  private lastRuntimeSurfaceRecord: SurfaceContext["activeSurface"] = null;
  private lastAuthorizationDecision: string = "";
  private lastAuthorizationReason: string = "";
  private lastBlockedCommand: string = "";
  private lastBlockedAt: string = "";
  private lastAuthorizationReasonCode: string = "";
  private securitySessionPolicyService: SecuritySessionPolicyService;
  private interactionSequence = 0;
  private previousTrustState: SecurityTrustState = "unknown";

  // Map of region keywords to RegionKind
  private readonly regionKeywords: Record<string, RegionKind> = {
    editor: RegionKind.EDITOR,
    sidebar: RegionKind.SIDEBAR,
    terminal: RegionKind.TERMINAL,
    explorer: RegionKind.EXPLORER,
    search: RegionKind.SEARCH,
    "address bar": RegionKind.ADDRESS_BAR,
    address: RegionKind.ADDRESS_BAR,
    page: RegionKind.PAGE,
    panel: RegionKind.PANEL,
  };

  /**
   * Normalize a focus target name from spoken command to actual application/window name
   * "console" -> "gnome-terminal" (system terminal)
   * "terminal" -> "vscode" (VS Code internal terminal)
   * etc.
   */
  private normalizeFocusTarget(targetName: string): string {
    const normalized = (targetName || "").toLowerCase().trim();

    if (normalized.includes("chrome") || normalized.includes("browser")) {
      return "chrome";
    }
    if (normalized.includes("code") || normalized.includes("editor")) {
      return "vscode";
    }
    if (
      normalized.includes("console") ||
      normalized.includes("shell") ||
      normalized === "gnome-terminal"
    ) {
      return "gnome-terminal"; // System terminal
    }
    if (normalized.includes("terminal") || normalized.includes("term")) {
      return "vscode"; // VS Code internal terminal
    }

    return targetName;
  }

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
    for (const [keyword, region] of Object.entries(this.regionKeywords)) {
      if (lower.endsWith(keyword) || lower === keyword) {
        if (region === RegionKind.TERMINAL) {
          return { app: "vscode", region };
        }
        return { app: "vscode", region };
      }
    }

    return null;
  }

  /**
   * Parse expected recovery target for drift input.
   * This is more precise than the older partial-match logic so that
   * gnome-terminal / console do not collapse incorrectly to vscode.
   */
  private parseRecoveryExpectation(targetName: string): {
    expectedApp: string;
    expectedRegion?: RegionKind;
  } {
    const normalized = (targetName || "").toLowerCase().trim();

    if (
      normalized === "gnome-terminal" ||
      normalized.includes("console") ||
      normalized.includes("shell")
    ) {
      return { expectedApp: "gnome-terminal" };
    }

    if (normalized.includes("address")) {
      return { expectedApp: "chrome", expectedRegion: RegionKind.ADDRESS_BAR };
    }

    if (normalized.includes("page")) {
      return { expectedApp: "chrome", expectedRegion: RegionKind.PAGE };
    }

    if (normalized.includes("editor")) {
      return { expectedApp: "vscode", expectedRegion: RegionKind.EDITOR };
    }

    if (normalized === "terminal" || normalized === "term") {
      return { expectedApp: "vscode", expectedRegion: RegionKind.TERMINAL };
    }

    if (normalized.includes("chrome") || normalized.includes("browser")) {
      return { expectedApp: "chrome" };
    }

    if (normalized.includes("code") || normalized.includes("vscode")) {
      return { expectedApp: "vscode" };
    }

    return { expectedApp: targetName };
  }

  /**
   * Map control name to an honest region fallback.
   * This is used by control recovery delegates so we do not fake control recovery.
   */
  private mapControlToRegion(app: string, control: string): RegionKind | null {
    const normalizedApp = (app || "").toLowerCase().trim();
    const normalizedControl = (control || "").toLowerCase().trim();

    if (
      (normalizedApp.includes("vscode") || normalizedApp.includes("code")) &&
      (normalizedControl === ControlType.TEXT_EDITOR ||
        normalizedControl.includes("editor"))
    ) {
      return RegionKind.EDITOR;
    }

    if (
      (normalizedApp.includes("vscode") || normalizedApp.includes("code")) &&
      (normalizedControl === ControlType.TERMINAL ||
        normalizedControl.includes("terminal"))
    ) {
      return RegionKind.TERMINAL;
    }

    if (
      (normalizedApp.includes("chrome") || normalizedApp.includes("browser")) &&
      (normalizedControl === ControlType.ADDRESS_BAR ||
        normalizedControl.includes("address"))
    ) {
      return RegionKind.ADDRESS_BAR;
    }

    return null;
  }

  /**
   * Best-effort restore delegate implementation.
   * This is still a boolean delegate, so it cannot report restore depth,
   * but it will try app -> region -> control in order.
   *
   * IMPORTANT:
   * Success here only means the restore action was attempted successfully;
   * final truth still comes from re-verification inside recovery.
   */
  private async executeBestEffortRestore(
    state: import("../runtime/focus-recovery-service").VerifiedFocusState
  ): Promise<boolean> {
    try {
      await this.system.focus(state.application);

      if (state.region) {
        const target: FocusTarget = {
          entity: state.application,
          layer: FocusLayer.REGION,
          regionKind: state.region,
        };
        await this.regionHandler.executeRegionTransfer(target, {});
      }

      if (state.precisionSurface) {
        const controlRegion = this.mapControlToRegion(
          state.application,
          state.precisionSurface.controlType
        );
        if (controlRegion) {
          const target: FocusTarget = {
            entity: state.application,
            layer: FocusLayer.REGION,
            regionKind: controlRegion,
          };
          await this.regionHandler.executeRegionTransfer(target, {});
        }
      }

      return true;
    } catch (error) {
      console.log(`[RECOVERY DELEGATE] Best-effort restore failed for ${state.application}: ${error}`);
      return false;
    }
  }

  /**
   * Honest control-focus delegate.
   *
   * It does NOT fall back to raw app focus and claim control recovery.
   * Instead, it maps supported controls to region-level focus where possible.
   * Unsupported controls return false so the recovery service can downgrade or abort honestly.
   */
  private async executeHonestControlFocus(app: string, control: string): Promise<boolean> {
    try {
      const region = this.mapControlToRegion(app, control);
      if (!region) {
        console.log(
          `[RECOVERY DELEGATE] Control focus unsupported for control=${control} app=${app}`
        );
        return false;
      }

      const target: FocusTarget = {
        entity: app,
        layer: FocusLayer.REGION,
        regionKind: region,
      };

      const result = await this.regionHandler.executeRegionTransfer(target, {});
      return result.success;
    } catch (error) {
      console.log(
        `[RECOVERY DELEGATE] Honest control focus failed for control=${control} app=${app}: ${error}`
      );
      return false;
    }
  }

  /**
   * Dedicated focus command path.
   * This ensures:
   * - routing runs before focus
   * - pre-transfer state is captured before focus
   * - pre-validation is evaluated before focus
   * - post-validation sees the real pre-transfer state
   */
  private async handleFocusCommand(command: core.ICommand): Promise<void> {
    if (!command.text) {
      return;
    }

    const originalText = command.text;
    const regionTarget = this.detectRegionTarget(originalText);

    console.log(`[EXECUTOR] Running intent routing for: ${originalText}`);
    const routingResult = this.intentRoutingService.routeCommandHardened({
      command: originalText,
      currentApplication: this.active.app,
    });

    console.log(
      `[EXECUTOR] Routing result: success=${routingResult.telemetry.success}, outcome=${routingResult.telemetry.outcome}`
    );

    this.log.logVerbose(
      `[ROUTING] command="${originalText}"` +
        ` outcome=${routingResult.telemetry.outcome}` +
        ` focusAgreement=${routingResult.telemetry.focusRoutingAgreement}` +
        ` success=${routingResult.telemetry.success}`
    );

    // For FOCUS commands, routing is advisory right now. Do not block if routing says unsupported.
    if (!routingResult.telemetry.success) {
      console.log(
        `[EXECUTOR] FOCUS command - routing failed but allowing through: ${routingResult.telemetry.error}`
      );
    }

    await this.checkSafetyInvariantsPreTransfer();

    let preTransferState: FocusState | undefined;

    try {
      // Capture true pre-transfer state before any focus transfer occurs.
      preTransferState = await this.focusPreValidator.capturePreTransferState();
      this.focusPostValidator.setPreTransferState(preTransferState);

      const preValidationTargetName = regionTarget ? regionTarget.app : this.normalizeFocusTarget(originalText);
      const preValidationLayer = regionTarget ? FocusLayer.REGION : FocusLayer.APPLICATION;

      const preValidation = await this.preValidateFocusTransfer(
        preValidationTargetName,
        preValidationLayer
      );

      this.lastPreValidationResult = {
        canProceed: preValidation.canProceed,
        blockingIssues: preValidation.blockingIssues,
      };

      if (!preValidation.canProceed) {
        this.log.logVerbose(
          `Focus pre-validation FAILED: ${preValidation.blockingIssues.join("; ")}`
        );
        return;
      }

      this.log.logVerbose("Focus pre-validation PASSED - proceeding with transfer");

      // Execute focus action
      if (regionTarget) {
        console.log(
          `[EXECUTOR] Region focus detected: app=${regionTarget.app}, region=${regionTarget.region}`
        );
        this.log.logVerbose(
          `Region focus: ${regionTarget.region} in ${regionTarget.app}`
        );

        const target: FocusTarget = {
          entity: regionTarget.app,
          layer: FocusLayer.REGION,
          regionKind: regionTarget.region,
        };

        try {
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

        // Region verification is still app-level here unless the region handler
        // itself exposes a stronger verified region signal.
        const verificationResult = await this.verifyFocusTransfer(
          regionTarget.app,
          FocusLayer.APPLICATION
        );

        await this.postValidateFocusTransfer(
          regionTarget.app,
          FocusLayer.APPLICATION,
          preTransferState,
          verificationResult
        );

        await this.checkSafetyInvariantsPostTransfer();

        if (!verificationResult.success) {
          await this.runFocusRecovery(regionTarget.app, verificationResult);

          const recoveryVerification = await this.verifyFocusTransfer(
            regionTarget.app,
            FocusLayer.APPLICATION
          );

          if (!recoveryVerification.success) {
            console.log(
              `[RECOVERY] Post-recovery verification still failed: ${recoveryVerification.details}`
            );
          } else {
            console.log(
              `[RECOVERY] Post-recovery verification SUCCESS: ${recoveryVerification.details}`
            );
          }
        }
      } else {
        const commandType = commandTypeToString(command.type!);
        if (!(commandType in this.commandHandler())) {
          return;
        }

        await this.commandHandler()[commandType](command);

        const normalizedTarget = this.normalizeFocusTarget(originalText);
        console.log(
          `[EXECUTOR] Verifying focus transfer to normalized target: ${normalizedTarget} (original: ${originalText})`
        );

        const verificationResult = await this.verifyFocusTransfer(
          normalizedTarget,
          FocusLayer.APPLICATION
        );

        await this.postValidateFocusTransfer(
          normalizedTarget,
          FocusLayer.APPLICATION,
          preTransferState,
          verificationResult
        );

        await this.checkSafetyInvariantsPostTransfer();

        if (!verificationResult.success) {
          await this.runFocusRecovery(normalizedTarget, verificationResult);

          const recoveryVerification = await this.verifyFocusTransfer(
            normalizedTarget,
            FocusLayer.APPLICATION
          );

          if (!recoveryVerification.success) {
            console.log(
              `[RECOVERY] Post-recovery verification still failed: ${recoveryVerification.details}`
            );
          } else {
            console.log(
              `[RECOVERY] Post-recovery verification SUCCESS: ${recoveryVerification.details}`
            );
          }
        }
      }
    } finally {
      // Always invalidate pre-transfer cache so future validations do not reuse stale state.
      this.focusPreValidator.invalidateCache();
      this.focusPostValidator.clearCache();
    }
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
    private settingsWindow: () => Promise<SettingsWindow> | undefined,
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

    // Initialize focus recovery service (FP-5A/5B)
    this.focusRecoveryService = new FocusRecoveryService();

    // Initialize Identity and Security services (FP-2A)
    this.identityGateway = new IdentityGatewayService({
      securityModeConfig: {
        defaultMode: SecurityMode.NORMAL,
      },
    });
    this.securitySessionPolicyService = new SecuritySessionPolicyService();

    // Initialize Workflow and Nexus services (FP-2B)
    this.workflowService = new WorkflowContractService();
    this.nexusBoundary = new NexusProtocolBoundaryService();
    this.workflowExecutionService = new WorkflowExecutionService(
      this.workflowService,
      this.nexusBoundary
    );

    // Wire up delegates for recovery orchestrator (ADM-048)

    this.focusRecoveryService.setAppFocusDelegate(async (app: string): Promise<boolean> => {
      try {
        await this.system.focus(app);
        return true;
      } catch (error) {
        console.log(`[RECOVERY DELEGATE] App focus failed for ${app}: ${error}`);
        return false;
      }
    });

    this.focusRecoveryService.setRegionFocusDelegate(
      async (app: string, region: string): Promise<boolean> => {
        try {
          const regionKind = region as RegionKind;
          const target: FocusTarget = {
            entity: app,
            layer: FocusLayer.REGION,
            regionKind,
          };
          const result = await this.regionHandler.executeRegionTransfer(target, {});
          return result.success;
        } catch (error) {
          console.log(
            `[RECOVERY DELEGATE] Region focus failed for ${region} in ${app}: ${error}`
          );
          return false;
        }
      }
    );

    // Keep legacy restore delegate, but make it best-effort layered restore instead of app-only.
    this.focusRecoveryService.setRestoreDelegate(
      async (
        state: import("../runtime/focus-recovery-service").VerifiedFocusState
      ): Promise<boolean> => {
        return this.executeBestEffortRestore(state);
      }
    );

    this.focusRecoveryService.setVerifyDelegate(
      async (): Promise<{ verified: boolean; state: FocusState | null }> => {
        try {
          const state = await this.focusVerificationService.queryCurrentFocus();
          return {
            verified: state !== null,
            state,
          };
        } catch (error) {
          console.log(`[RECOVERY DELEGATE] Verification failed: ${error}`);
          return { verified: false, state: null };
        }
      }
    );

    // Honest control delegate: region-backed where supported, otherwise false.
    this.focusRecoveryService.setControlFocusDelegate(
      async (app: string, control: string): Promise<boolean> => {
        return this.executeHonestControlFocus(app, control);
      }
    );
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
      "backspace",
      "delete",
      "home",
      "end",
      "pagedown",
      "pageup",
    ];

    if (!valid[0].transcript || !valid[0].commands || valid[0].commands.length == 0) {
      return response;
    }

    if (valid[0].transcript.startsWith("run")) {
      return response;
    }

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

  setExecutionTrace(trace: ExecutionTrace): void {
    this.executionTrace = trace;
  }

  async executeLocalRoute(
    response: core.ICommandsResponse,
    updateRenderer: boolean = true
  ): Promise<void> {
    await this.execute(response, updateRenderer);
  }

  async executePluginAssistedRoute(
    response: core.ICommandsResponse,
    updateRenderer: boolean = true
  ): Promise<void> {
    await this.execute(response, updateRenderer);
  }

  async execute(response: core.ICommandsResponse, updateRenderer: boolean = true) {
    this.lastEndpointId = response.endpointId!;

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

    // FP-2A: Authorization gate - check identity before executing
    const authorizationResult = await this.checkAuthorization(response);
    if (!authorizationResult.authorized) {
      console.log(`[EXECUTOR] Authorization denied: ${authorizationResult.reason}`);
      this.log.logVerbose(`[FP-2A] Authorization denied: ${authorizationResult.reason}`);
      // Still resolve chain but don't execute
      this.resolveChainFinished();
      this.newChainFinishedPromise();
      return;
    }

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
      try {
        pluginResponse = await this.pluginManager.sendResponseToApp(this.active.app, response);
      } catch (e) {
        console.log(e);
      }
    }

    if (response.execute && response.execute.commands) {
      for (const command of response.execute.commands) {
        const commandType = commandTypeToString(command.type!);

        // Dedicated focus command path
        if (command.type == core.CommandType.COMMAND_TYPE_FOCUS) {
          await this.handleFocusCommand(command);
          continue;
        }

        if (commandType in this.commandHandler()) {
          if (
            command.type != core.CommandType.COMMAND_TYPE_DIFF &&
            command.type != core.CommandType.COMMAND_TYPE_INSERT &&
            command.type != core.CommandType.COMMAND_TYPE_RUN
          ) {
            this.insertHistory.clear();
          }

          await this.commandHandler()[commandType](command);

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
      (command: core.ICommand) => command.type == core.CommandType.COMMAND_TYPE_QUIT
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
    if (isMetaResponse(response)) {
      return;
    }

    if (response.alternatives && response.alternatives.length > 0) {
      this.log.logVerbose(
        `Showing alternatives [${response.alternatives.map((e: any) => e.transcript).join(", ")}]`
      );

      this.setAlternativesState(
        {
          alternatives: response.alternatives,
        }
      );

      if (response.final) {
        this.savePendingResponseIfNeeded(response);
        this.setAlternativesState(
          {
            highlighted: this.hasExecute(response) ? [0] : [],
          }
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
        this.setAlternativesState(
          {
            alternatives: [],
          }
        );
      }, Math.max(1, 1000 * this.settings.getMiniModeHideTimeout()));
    }

    setTimeout(() => {
      this.bridge.send("updateMiniModeWindowHeight", {}, [this.miniModeWindow]);
    }, 50);
  }

  private setAlternativesState(data: any) {
    this.bridge.setState(data, [this.mainWindow, this.miniModeWindow]);

    const settingsWindow = this.settingsWindow();
    if (!settingsWindow) {
      return;
    }

    Promise.resolve(settingsWindow)
      .then((window) => {
        if (window && window.shown()) {
          this.bridge.setState(data, [window]);
        }
      })
      .catch(() => {});
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
   * @param layer - The focus layer
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

      this.log.logVerbose(
        "Focus verification: " +
          (result.success ? "SUCCESS" : "FAILED") +
          " - " +
          result.details +
          " (confidence: " +
          result.confidence.toFixed(2) +
          ")"
      );

      this.focusHistoryService.addEntry(target, result);

      const stats = this.focusHistoryService.getStats();
      this.log.logVerbose(
        "Focus history: " +
          stats.successfulTransfers +
          "/" +
          stats.totalAttempts +
          " successful " +
          "(rate: " +
          (stats.successRate * 100).toFixed(1) +
          "%)"
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

  getFocusHistoryService(): FocusHistoryService {
    return this.focusHistoryService;
  }

  /**
   * Pre-validate a focus transfer before attempting it
   * Part of FP-2.1: Pre-transfer validation checks
   *
   * @param targetName - The name of the target application/window
   * @param layer - The focus layer
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
      const validationResult = await this.focusPreValidator.validatePreConditions(target);

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

      // Keep fail-open behavior for now, but surface it loudly.
      return {
        canProceed: true,
        valid: false,
        blockingIssues: [`Validation error: ${errorMessage}`],
        validationResult: null,
      };
    }
  }

  getFocusPreValidator(): FocusPreValidator {
    return this.focusPreValidator;
  }

  /**
   * Post-validate a focus transfer after the transfer attempt
   * Part of FP-2.2: Post-transfer contract verification
   *
   * @param targetName - The name of the target application/window
   * @param layer - The focus layer
   * @param preTransferState - The focus state before transfer
   * @param verificationResult - The result from focus verification
   * @returns Contract result with pass/fail status
   */
  async postValidateFocusTransfer(
    targetName: string,
    layer: FocusLayer,
    preTransferState: FocusState,
    verificationResult: { success: boolean; confidence: number; details: string }
  ): Promise<ContractResult> {
    const target: FocusTarget = {
      entity: targetName,
      layer,
    };

    try {
      const postTransferState = await this.focusVerificationService.queryCurrentFocus();

      const focusVerificationResult: import("../runtime/focus-verification-service").FocusVerificationResult =
        {
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

      this.focusPostValidator.setVerificationResult(focusVerificationResult, target);

      const transfer: FocusTransfer = {
        target,
        sourceState: preTransferState,
        actualState: postTransferState,
        verificationResult: focusVerificationResult,
        timestamp: new Date().toISOString(),
      };

      const validationResult = await this.focusPostValidator.validatePostConditions(transfer);

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

      this.focusHistoryService.addEntryWithContractResult(
        target,
        focusVerificationResult,
        validationResult
      );

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

  getFocusPostValidator(): FocusPostValidator {
    return this.focusPostValidator;
  }

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
      return { allSatisfied: true, violations: [] };
    }
  }

  startSafetyMonitoring(): void {
    this.focusSafetyMonitor.startMonitoring();
    this.log.logVerbose("Safety invariant monitoring started");
  }

  stopSafetyMonitoring(): void {
    this.focusSafetyMonitor.stopMonitoring();
    this.log.logVerbose("Safety invariant monitoring stopped");
  }

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
    const analysis = this.focusFailureAnalyzer.analyzeFailure(failure);
    this.logFailureAnalysis(analysis);
    this.focusHistoryService.addFailureAnalysis(analysis);
    return analysis;
  }

  /**
   * Create and analyze a failure from current focus transfer state
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
    this.log.logVerbose(
      `  Root Cause: ${analysis.rootCause.category} - ${analysis.rootCause.explanation}`
    );

    if (analysis.rootCause.evidence.length > 0) {
      this.log.logVerbose(`  Evidence:`);
      for (const evidence of analysis.rootCause.evidence) {
        this.log.logVerbose(`    - ${evidence}`);
      }
    }

    if (analysis.recoverySuggestions.length > 0) {
      this.log.logVerbose(`  Recovery Suggestions:`);
      for (const suggestion of analysis.recoverySuggestions) {
        this.log.logVerbose(
          `    [${suggestion.action}] ${suggestion.description} (priority: ${suggestion.priority})`
        );
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

  /**
   * Run focus recovery when verification fails (FP-5A / FP-5B)
   *
   * @param targetName - The target that was supposed to receive focus
   * @param verificationResult - The result from focus verification
   */
  private async runFocusRecovery(
    targetName: string,
    verificationResult: { success: boolean; confidence: number; details: string }
  ): Promise<{ recovered: boolean; action: string }> {
    try {
      const currentFocusState = await this.focusVerificationService.queryCurrentFocus();
      const { expectedApp, expectedRegion } = this.parseRecoveryExpectation(targetName);

      const driftInput = {
        expectedApp,
        expectedRegion,
        currentFocusState,
        currentStateConfidence: verificationResult.confidence,
      };

      console.log(`[RECOVERY] Running recovery for: ${targetName}`);
      this.log.logVerbose(`[FP-5A] Running focus recovery for: ${targetName}`);

      const recoveryResult = await this.focusRecoveryService.performRecovery(driftInput);

      console.log(
        `[RECOVERY] Result: ${recoveryResult.result}, driftDetected: ${recoveryResult.driftDetected}`
      );
      this.log.logVerbose(
        `[FP-5A] Recovery result: ${recoveryResult.result}, ` +
          `driftDetected: ${recoveryResult.driftDetected}, ` +
          `confidence: ${recoveryResult.finalConfidence}, ` +
          `reverified: ${recoveryResult.finalStateReverified === true}`
      );

      for (const attempt of recoveryResult.attempts) {
        this.log.logVerbose(
          `[FP-5A] Recovery attempt: action=${attempt.action}, policy=${attempt.policy}, success=${attempt.success}, details=${attempt.details}`
        );
      }

      if (recoveryResult.userSafeMessage) {
        console.log(`[RECOVERY] User message: ${recoveryResult.userSafeMessage}`);
        this.log.logVerbose(`[FP-5A] User-safe message: ${recoveryResult.userSafeMessage}`);
      }

      const recovered =
        recoveryResult.result === "recovered_by_retry" ||
        recoveryResult.result === "recovered_by_restore";

      return {
        recovered,
        action: recoveryResult.action || "none",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`[RECOVERY] Error: ${errorMsg}`);
      this.log.logVerbose(`[FP-5A] Recovery error: ${errorMsg}`);
      return { recovered: false, action: "error" };
    }
  }

  /**
   * Actually perform the recovery refocus action
   *
   * DEPRECATED: Keep only for backwards compatibility.
   * This method now delegates to the existing app focus subsystem instead of
   * touching private recovery delegates or shelling out directly.
   *
   * @deprecated Use FocusRecoveryService.performRecovery() instead
   */
  private async performRecoveryRefocus(appName: string): Promise<void> {
    console.warn(`[RECOVERY] DEPRECATED: performRecoveryRefocus called for ${appName}`);
    this.log.logVerbose(
      `[FP-5A] DEPRECATED: performRecoveryRefocus called - use FocusRecoveryService.performRecovery()`
    );

    try {
      await this.system.focus(appName);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`[RECOVERY] Refocus error: ${errorMsg}`);
      this.log.logVerbose(`[FP-5A] Deprecated refocus fallback error: ${errorMsg}`);
    }
  }

  // ==================== TEST / DEBUG METHODS ====================

  /**
   * Test method to simulate a focus failure and trigger recovery.
   * Use from browser console: window.executor.testRecovery('chrome')
   */
  async testRecovery(targetName: string): Promise<{
    success: boolean;
    recoveryTriggered: boolean;
    recoveryResult: any;
    finalFocusState: FocusState | null;
  }> {
    console.log(`[TEST] Starting recovery test for target: ${targetName}`);

    const normalizedTarget = this.normalizeFocusTarget(targetName);
    console.log(`[TEST] Normalized target: ${normalizedTarget}`);

    try {
      await this.system.focus(normalizedTarget);
      console.log(`[TEST] Focus command executed for: ${normalizedTarget}`);
    } catch (error) {
      console.log(`[TEST] Focus command error (expected if app not running): ${error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const focusState = await this.focusVerificationService.queryCurrentFocus();
    console.log(`[TEST] Current focus state: ${JSON.stringify(focusState)}`);

    const simulatedVerificationResult = {
      success:
        focusState?.entity.toLowerCase().includes(normalizedTarget.toLowerCase()) ?? false,
      confidence:
        focusState?.entity.toLowerCase().includes(normalizedTarget.toLowerCase()) ? 1 : 0,
      details: `Simulated verification: expected ${normalizedTarget}, got ${focusState?.entity ?? "unknown"}`,
    };

    console.log(`[TEST] Simulated verification result:`, simulatedVerificationResult);

    let recoveryTriggered = false;
    let recoveryResult = null;

    if (!simulatedVerificationResult.success) {
      recoveryTriggered = true;
      console.log(`[TEST] Verification failed - triggering recovery!`);
      recoveryResult = await this.runFocusRecovery(normalizedTarget, simulatedVerificationResult);
      console.log(`[TEST] Recovery result:`, recoveryResult);
    } else {
      console.log(`[TEST] Verification passed - no recovery needed`);
    }

    const finalFocusState = await this.focusVerificationService.queryCurrentFocus();
    console.log(`[TEST] Final focus state: ${JSON.stringify(finalFocusState)}`);

    return {
      success: simulatedVerificationResult.success,
      recoveryTriggered,
      recoveryResult,
      finalFocusState,
    };
  }

  /**
   * Test method to force-trigger recovery with a simulated failure.
   * Use from browser console: window.executor.forceRecoveryTest('chrome')
   */
  async forceRecoveryTest(targetName: string): Promise<any> {
    console.log(`[TEST] Force-triggering recovery test for: ${targetName}`);

    const normalizedTarget = this.normalizeFocusTarget(targetName);

    const forcedFailureResult = {
      success: false,
      confidence: 0,
      details: `Forced test failure for ${normalizedTarget}`,
    };

    console.log(`[TEST] Simulating verification failure to trigger recovery...`);
    const recoveryResult = await this.runFocusRecovery(normalizedTarget, forcedFailureResult);

    console.log(`[TEST] Force recovery result:`, recoveryResult);

    return recoveryResult;
  }

  /**
   * Get the recovery service for direct testing.
   * Use: window.executor.getRecoveryService()
   */
  getRecoveryService(): FocusRecoveryService {
    return this.focusRecoveryService;
  }

  // ==================== FP-2A: IDENTITY AND SECURITY ====================

  private deriveTrustState(): SecurityTrustState {
    const context = this.identityGateway.getIdentityContext();
    const evidence = this.identityGateway.getIdentityEvidenceStatus();
    if (context.contaminated) {
      return "contaminated";
    }
    if (!evidence.ready) {
      return "provider_degraded";
    }
    if (context.isVerified) {
      return "verified";
    }
    return "unknown";
  }

  private syncSecuritySessionTrustState(trustState: SecurityTrustState): void {
    const previous = this.previousTrustState;
    if (previous !== trustState) {
      this.securitySessionPolicyService.onTrustStateChange(previous, trustState);
      if (trustState === "contaminated") {
        this.securitySessionPolicyService.onContaminationDetected();
      } else if (trustState === "provider_degraded") {
        this.securitySessionPolicyService.onProviderDegraded();
      } else if (trustState === "verified") {
        this.securitySessionPolicyService.onVerificationEvent({ trustState });
      }
      this.recordSecuritySessionEvent("trust_state_change", undefined, trustState);
      this.previousTrustState = trustState;
    }
  }

  onTranscriptHeard(): void {
    this.securitySessionPolicyService.onHeard();
    this.recordSecuritySessionEvent("heard");
    this.publishSecuritySessionBridgeState();
  }

  onPauseToListeningBoundary(): void {
    this.securitySessionPolicyService.onPauseToListeningBoundary();
    this.recordSecuritySessionEvent("pause_to_listening");
    this.publishSecuritySessionBridgeState();
  }

  getSecuritySessionSnapshot() {
    return this.securitySessionPolicyService.getSnapshot();
  }

  exportSecuritySessionState(): SecuritySessionPersistenceState {
    return this.securitySessionPolicyService.exportState();
  }

  restoreSecuritySessionState(state?: Partial<SecuritySessionPersistenceState> | null): void {
    this.securitySessionPolicyService.restoreState(state);
    this.publishSecuritySessionBridgeState();
  }

  setSecurityPolicyMode(mode: "pilot" | "assist" | "observe" | "locked"): void {
    this.securitySessionPolicyService.setMode(mode);
    this.publishSecuritySessionBridgeState();
  }

  private publishSecuritySessionBridgeState(): void {
    const snapshot = this.securitySessionPolicyService.getSnapshot();
    this.bridge.setState(
      {
        securityPolicyMode: snapshot.mode,
        securityRequiresReauthNext: snapshot.requiresReauthNext,
        securityGraceValid: snapshot.graceValid,
        securityGraceExpiresAt: snapshot.graceExpiresAt,
        securityLastReasonCode: snapshot.lastReasonCode,
        securityLastLifecyclePhase: snapshot.lastLifecyclePhase,
        securityLastInteractionId: snapshot.lastInteractionId,
      },
      [this.mainWindow, this.miniModeWindow]
    );
  }

  private recordSecuritySessionEvent(
    phase: "heard" | "activated" | "executed" | "pause_to_listening" | "trust_state_change",
    interactionId?: number,
    trustState?: SecurityTrustState
  ): void {
    const snapshot = this.securitySessionPolicyService.getSnapshot();
    phase3BReplayAuditService.recordSecuritySessionEvent({
      phase,
      interactionId,
      trustState,
      mode: snapshot.mode,
      requiresReauthNext: snapshot.requiresReauthNext,
      graceValid: snapshot.graceValid,
      graceExpiresAt: snapshot.graceExpiresAt || undefined,
      reasonCode: snapshot.lastReasonCode,
    });
  }

  /**
   * Check authorization before executing commands (FP-2A)
   */
  private async checkAuthorization(response: core.ICommandsResponse): Promise<{
    authorized: boolean;
    reason?: string;
  }> {
    try {
      // Get the primary command to check
      const command = response.execute?.commands?.[0];
      if (!command) {
        return { authorized: true }; // No commands to authorize
      }

      // Map command type to family and risk level
      const commandType = commandTypeToString(command.type!);
      const { commandFamily, riskLevel } = this.mapCommandToRisk(commandType, command.text || "");
      const commandVerb = command.text || commandType;
      const interactionId = ++this.interactionSequence;
      const trustState = this.deriveTrustState();
      this.syncSecuritySessionTrustState(trustState);
      this.securitySessionPolicyService.onActivated({
        interactionId,
        trustState,
      });
      this.recordSecuritySessionEvent("activated", interactionId, trustState);
      const securitySession = this.securitySessionPolicyService.getAuthContext(interactionId);

      console.log(`[FP-2A] Authorizing: ${commandFamily}/${commandType} risk=${riskLevel}`);
      console.log(`[FP-2A] Identity state: ${JSON.stringify(this.identityGateway.getIdentityContext())}`);

      // Authorize through identity gateway
      const result = await this.identityGateway.authorize({
        commandFamily,
        commandVerb,
        riskLevel,
        securitySession,
      });

      console.log(`[FP-2A] Auth result: ${result.decision} - ${result.reason}`);
      this.lastAuthorizationDecision = result.decision;
      this.lastAuthorizationReason = result.reason || "";
      this.lastAuthorizationReasonCode = String(result.metadata?.reasonCode || securitySession.reasonCode || "");
      this.publishSecuritySessionBridgeState();

      if (result.decision === AuthorizationDecision.ALLOW) {
        // Maintain interaction-mode state as part of the runtime state vector.
        if (command.type === core.CommandType.COMMAND_TYPE_START_DICTATE) {
          this.identityGateway.setInteractionMode(InteractionMode.DICTATION);
        } else if (command.type === core.CommandType.COMMAND_TYPE_STOP_DICTATE) {
          this.identityGateway.setInteractionMode(InteractionMode.COMMAND);
        }
        this.securitySessionPolicyService.onExecuted();
        this.recordSecuritySessionEvent("executed", interactionId, trustState);
        return { authorized: true };
      }

      // Handle blocked or denied commands
      let reason = result.reason || "Authorization denied";
      if (result.decision === AuthorizationDecision.CONFIRM) {
        reason = "Confirmation required";
      }
      this.lastBlockedCommand = commandVerb || commandType;
      this.lastBlockedAt = new Date().toISOString();

      return { authorized: false, reason };
    } catch (error) {
      const commandType = response.execute?.commands?.[0]?.type;
      const reflexLike =
        commandType === core.CommandType.COMMAND_TYPE_CANCEL ||
        commandType === core.CommandType.COMMAND_TYPE_PAUSE ||
        commandType === core.CommandType.COMMAND_TYPE_UNDO ||
        commandType === core.CommandType.COMMAND_TYPE_REDO ||
        commandType === core.CommandType.COMMAND_TYPE_START_DICTATE ||
        commandType === core.CommandType.COMMAND_TYPE_STOP_DICTATE;
      if (reflexLike) {
        console.log(`[FP-2A] Authorization check error: ${error}, allowing reflex command`);
        return { authorized: true };
      }
      console.log(`[FP-2A] Authorization check error: ${error}, blocking command (fail-safe)`);
      this.lastAuthorizationDecision = AuthorizationDecision.DENY;
      this.lastAuthorizationReason = "Authorization subsystem error (fail-safe block)";
      this.lastAuthorizationReasonCode = "execute_suppressed_not_authorized";
      this.lastBlockedCommand =
        response.execute?.commands?.[0]?.text || commandTypeToString(commandType || 0);
      this.lastBlockedAt = new Date().toISOString();
      this.publishSecuritySessionBridgeState();
      return {
        authorized: false,
        reason: "Authorization subsystem error (fail-safe block)",
      };
    }
  }

  /**
   * Map command type to family and risk level
   */
  private mapCommandToRisk(commandType: string, commandText: string): {
    commandFamily: string;
    riskLevel: CommandRiskLevel;
  } {
    const text = (commandText || "").toLowerCase();
    const type = commandType.toLowerCase();

    // Focus commands - LOW risk (check text first since it contains the full phrase)
    if (type === "focus" || text.startsWith("focus")) {
      return { commandFamily: "focus", riskLevel: CommandRiskLevel.LOW };
    }

    // Navigation commands - LOW risk
    if (type === "next" || type === "up" || type === "down" || 
        text.startsWith("next") || text.startsWith("go to")) {
      return { commandFamily: "navigation", riskLevel: CommandRiskLevel.LOW };
    }

    // Insert/Edit commands - MEDIUM risk
    if (type === "insert" || type === "diff" || type === "paste") {
      return { commandFamily: "edit", riskLevel: CommandRiskLevel.MEDIUM };
    }

    // Run/Terminal commands - MEDIUM risk
    if (type === "run" || text.startsWith("run ") || text.startsWith("execute")) {
      return { commandFamily: "terminal", riskLevel: CommandRiskLevel.MEDIUM };
    }

    // File system commands - HIGH risk
    if (type === "delete" || text.includes("delete") || text.includes("remove")) {
      return { commandFamily: "filesystem", riskLevel: CommandRiskLevel.HIGH };
    }

    // Settings/System commands - HIGH/PRIVILEGED risk
    if (type === "settings" || text.includes("config") || text.includes("system")) {
      return { commandFamily: "system", riskLevel: CommandRiskLevel.HIGH };
    }

    // Default - assume LOW risk for basic operating commands
    return { commandFamily: "general", riskLevel: CommandRiskLevel.LOW };
  }

  /**
   * Get identity gateway for testing (FP-2A)
   * Use: window.executor.getIdentityGateway()
   */
  getIdentityGateway(): IdentityGatewayService {
    return this.identityGateway;
  }

  getLastAuthorizationStatus(): {
    decision: string;
    reason: string;
    reasonCode: string;
    securitySessionReasonCode: string;
    blockedCommand: string;
    blockedAt: string;
    securityPolicyMode: string;
    securityRequiresReauthNext: boolean;
    securityGraceValid: boolean;
    securityGraceExpiresAt: string;
    securityLastLifecyclePhase: string;
    securityLastInteractionId: number;
  } {
    const snapshot = this.securitySessionPolicyService.getSnapshot();
    return {
      decision: this.lastAuthorizationDecision,
      reason: this.lastAuthorizationReason,
      reasonCode: this.lastAuthorizationReasonCode,
      securitySessionReasonCode: snapshot.lastReasonCode,
      blockedCommand: this.lastBlockedCommand,
      blockedAt: this.lastBlockedAt,
      securityPolicyMode: snapshot.mode,
      securityRequiresReauthNext: snapshot.requiresReauthNext,
      securityGraceValid: snapshot.graceValid,
      securityGraceExpiresAt: snapshot.graceExpiresAt,
      securityLastLifecyclePhase: snapshot.lastLifecyclePhase,
      securityLastInteractionId: snapshot.lastInteractionId,
    };
  }

  /**
   * Get identity-derived policy context for runtime dispatcher decisions.
   */
  private buildRuntimeSurfaceContext(): SurfaceContext | undefined {
    const app = (this.active.app || "").trim();
    if (!app) {
      return undefined;
    }
    const surfaceType = surfaceModelService.normalizeAlias(app);
    if (surfaceType === "unknown") {
      return undefined;
    }
    const surfaceKey = `${surfaceType}:${app.toLowerCase()}`;
    const activeSurface = surfaceModelService.buildSurfaceRecord({
      surfaceType,
      surfaceClass: "root",
      surfaceId: `active:${surfaceKey}`,
      label: app,
      appId: app,
      visibility: "focused",
    });
    const previousSurface =
      this.lastRuntimeSurfaceRecord !== null && this.lastRuntimeSurfaceKey !== surfaceKey
        ? this.lastRuntimeSurfaceRecord
        : null;
    const context = surfaceModelService.buildContext({
      activeSurface,
      previousSurface,
      activeOverlay: null,
    });
    this.lastRuntimeSurfaceRecord = activeSurface;
    this.lastRuntimeSurfaceKey = surfaceKey;
    return context;
  }

  private buildRuntimeModalContext(): ModalContext | undefined {
    const app = (this.active.app || "").trim().toLowerCase();
    const filename = (this.active.filename || "").trim().toLowerCase();
    if (!app && !filename) {
      return undefined;
    }
    if (
      app === "system dialog" ||
      filename.includes("modal") ||
      filename.includes("dialog")
    ) {
      return modalAwarenessService.classifyContext({
        modalContainerDetected: true,
        containerHint: "dialog",
        focusTrapDetected: true,
        backdropDetected: true,
        notificationDetected: false,
        quickOpenDetected: false,
      });
    }
    if (filename.includes("quick-open") || filename.includes("command-palette")) {
      return modalAwarenessService.classifyContext({
        modalContainerDetected: true,
        containerHint: "quick_open",
        focusTrapDetected: true,
        backdropDetected: false,
        notificationDetected: false,
        quickOpenDetected: true,
      });
    }
    return modalAwarenessService.noModalContext();
  }

  getRuntimeDispatchPolicyContext(): {
    securityMode: "standard" | "secure" | "shared_room";
    speakerVerified: boolean;
    interactionMode: InteractionMode;
    currentApp?: string;
    targetSurface?: string;
    surfaceContext?: SurfaceContext;
    modalContext?: ModalContext;
  } {
    const context = this.identityGateway.getIdentityContext();
    const currentApp = this.active.app || undefined;
    const surfaceType = currentApp
      ? surfaceModelService.normalizeAlias(currentApp)
      : "unknown";
    const securityMode =
      context.securityMode === SecurityMode.SHARED_ROOM
        ? "shared_room"
        : context.securityMode === SecurityMode.NORMAL
          ? "standard"
          : "secure";
    return {
      securityMode,
      speakerVerified: context.isVerified,
      interactionMode: context.interactionMode,
      currentApp,
      targetSurface: surfaceType !== "unknown" ? surfaceType : undefined,
      surfaceContext: this.buildRuntimeSurfaceContext(),
      modalContext: this.buildRuntimeModalContext(),
    };
  }

  /**
   * Get workflow service for testing (FP-2B)
   * Use: window.executor.getWorkflowService()
   */
  getWorkflowService(): WorkflowContractService {
    return this.workflowService;
  }

  /**
   * Get Nexus boundary service for testing (FP-2B)
   * Use: window.executor.getNexusBoundary()
   */
  getNexusBoundary(): NexusProtocolBoundaryService {
    return this.nexusBoundary;
  }

  /**
   * Process a Nexus proposal through Maestro's boundary and create a workflow candidate when valid.
   * Execution remains Maestro-owned and policy-gated.
   */
  processNexusProposal(
    proposal: NexusProposal
  ): {
    accepted: boolean;
    workflowId?: string;
    reason?: string;
    requiresConfirmation: boolean;
  } {
    const context = this.getNexusProposalExecutionContext();
    return this.workflowExecutionService.processNexusProposal(proposal, context);
  }

  /**
   * Execute a previously created workflow through bounded, policy-aware step checks.
   * This is intentionally sequential and inspectable for Phase 2B.
   */
  async executeWorkflowById(workflowId: string): Promise<void> {
    await this.workflowExecutionService.executeWorkflow(
      workflowId,
      async (step, context) => {
        const start = Date.now();
        const riskLevel = this.mapWorkflowFamilyToRisk(step.commandFamily);
        const authResult = await this.identityGateway.authorize({
          commandFamily: step.commandFamily,
          commandVerb: step.commandVerb,
          target: step.commandTarget,
          riskLevel,
        });

        if (authResult.decision !== AuthorizationDecision.ALLOW) {
          return {
            stepId: step.stepId,
            status: StepStatus.HARD_FAILED,
            commandVerb: step.commandVerb,
            success: false,
            outputBindings: new Map(),
            warnings: [],
            errorCode: "authorization_blocked",
            errorMessage: `${authResult.decision}:${authResult.reason}`,
            elapsedMs: Date.now() - start,
          };
        }

        console.log(
          `[FP-2B] Workflow step allowed: ${JSON.stringify({
            workflowId: context.workflowId,
            stepId: step.stepId,
            commandFamily: step.commandFamily,
            origin: context.origin,
            delegationGrantId: context.delegationGrantId || "none",
            proposalId: context.proposalId || "none",
          })}`
        );

        return {
          stepId: step.stepId,
          status: StepStatus.SUCCEEDED,
          commandVerb: step.commandVerb,
          success: true,
          outputBindings: new Map(),
          warnings: [],
          elapsedMs: Date.now() - start,
        };
      }
    );
  }

  private getNexusProposalExecutionContext(): ProposalExecutionContext {
    const context = this.identityGateway.getIdentityContext();
    const securityMode =
      context.securityMode === SecurityMode.SHARED_ROOM
        ? "shared_room"
        : context.securityMode === SecurityMode.RESTRICTED
          ? "restricted"
          : context.securityMode === SecurityMode.SECURE
            ? "secure"
            : "normal";

    return {
      securityMode,
      interactionMode: context.interactionMode,
      identityState: context.identityState,
      speakerVerified: context.isVerified,
      contaminated: context.contaminated,
      identityEvidenceReady: context.identityEvidenceReady,
    };
  }

  private mapWorkflowFamilyToRisk(commandFamily: string): CommandRiskLevel {
    const family = (commandFamily || "").toLowerCase();
    if (["security", "admin", "privileged"].includes(family)) {
      return CommandRiskLevel.PRIVILEGED;
    }
    if (
      ["filesystem", "file_delete", "file_rename", "system", "settings", "process"].includes(
        family
      )
    ) {
      return CommandRiskLevel.HIGH;
    }
    if (["terminal", "execution", "build", "edit", "browser"].includes(family)) {
      return CommandRiskLevel.MEDIUM;
    }
    return CommandRiskLevel.LOW;
  }
}
