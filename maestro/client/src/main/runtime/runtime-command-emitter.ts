import Log from "../log";
import { commandTypeToString } from "../../shared/alternatives";
import { core } from "../../gen/core";

export interface RuntimeCommand {
  binding: RuntimeCommandBinding;
  confirmationRequired: boolean;
  confidence: number;
  executionMetadata: RuntimeCommandExecutionMetadata;
  executorCandidates: string[];
  family: RuntimeCommandFamily;
  lane: "command";
  modifiers: string[];
  object: RuntimeCommandObject;
  postfix: string[];
  reversible: boolean;
  scope: RuntimeCommandScope | null;
  chunkId?: string;
  endpointId?: string;
  final: boolean;
  index: number;
  sessionId?: string;
  source: "legacy_commands_response";
  transcript?: string;
  type: string;
  verb: string;
}

export type RuntimeCommandFamily =
  | "editing"
  | "execution"
  | "focus"
  | "navigation"
  | "reflex"
  | "system"
  | "unknown";

export interface RuntimeCommandBinding {
  resolvedId?: string;
  strategy: "context" | "index" | "literal" | "registry" | "search";
}

export interface RuntimeCommandExecutionMetadata {
  sessionId?: string;
  timestamp: number;
  transcriptSource: "legacy_commands_response";
}

export interface RuntimeCommandObject {
  name: string;
  type: "entity" | "location" | "process" | "surface" | "symbol" | "system" | "ui";
}

export interface RuntimeCommandScope {
  type: "current_surface" | "workspace";
  value: string;
}

// Phase 1 uses a lightweight normalized command envelope so the legacy command
// response path can start emitting a deterministic runtime shape before the
// broader executor/router contract is fully replaced.
export default class RuntimeCommandEmitter {
  constructor(private log: Log) {}

  private familyForCommandType(commandType: core.CommandType): RuntimeCommandFamily {
    switch (commandType) {
      case core.CommandType.COMMAND_TYPE_BACK:
      case core.CommandType.COMMAND_TYPE_CANCEL:
      case core.CommandType.COMMAND_TYPE_PAUSE:
      case core.CommandType.COMMAND_TYPE_REDO:
      case core.CommandType.COMMAND_TYPE_UNDO:
      case core.CommandType.COMMAND_TYPE_START_DICTATE:
      case core.CommandType.COMMAND_TYPE_STOP_DICTATE:
        return "reflex";
      case core.CommandType.COMMAND_TYPE_CLOSE_WINDOW:
      case core.CommandType.COMMAND_TYPE_FOCUS:
      case core.CommandType.COMMAND_TYPE_LAUNCH:
      case core.CommandType.COMMAND_TYPE_QUIT:
      case core.CommandType.COMMAND_TYPE_WINDOW:
        return "focus";
      case core.CommandType.COMMAND_TYPE_CLICK:
      case core.CommandType.COMMAND_TYPE_CLOSE_TAB:
      case core.CommandType.COMMAND_TYPE_CREATE_TAB:
      case core.CommandType.COMMAND_TYPE_DOM_BLUR:
      case core.CommandType.COMMAND_TYPE_DOM_CLICK:
      case core.CommandType.COMMAND_TYPE_DOM_FOCUS:
      case core.CommandType.COMMAND_TYPE_DOM_SCROLL:
      case core.CommandType.COMMAND_TYPE_DUPLICATE_TAB:
      case core.CommandType.COMMAND_TYPE_FORWARD:
      case core.CommandType.COMMAND_TYPE_GO_TO_DEFINITION:
      case core.CommandType.COMMAND_TYPE_NEXT:
      case core.CommandType.COMMAND_TYPE_NEXT_TAB:
      case core.CommandType.COMMAND_TYPE_OPEN_FILE:
      case core.CommandType.COMMAND_TYPE_OPEN_FILE_LIST:
      case core.CommandType.COMMAND_TYPE_OPEN_IN_BROWSER:
      case core.CommandType.COMMAND_TYPE_PREVIOUS_TAB:
      case core.CommandType.COMMAND_TYPE_RELOAD:
      case core.CommandType.COMMAND_TYPE_SCROLL:
      case core.CommandType.COMMAND_TYPE_SEARCH:
      case core.CommandType.COMMAND_TYPE_SHOW:
      case core.CommandType.COMMAND_TYPE_SPLIT:
      case core.CommandType.COMMAND_TYPE_SWITCH_TAB:
        return "navigation";
      case core.CommandType.COMMAND_TYPE_RUN:
        return "execution";
      case core.CommandType.COMMAND_TYPE_CLIPBOARD:
      case core.CommandType.COMMAND_TYPE_COPY:
      case core.CommandType.COMMAND_TYPE_CUSTOM:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_CONTINUE:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_INLINE_BREAKPOINT:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_PAUSE:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_SHOW_HOVER:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_START:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_INTO:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_OUT:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_OVER:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_STOP:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_TOGGLE_BREAKPOINT:
      case core.CommandType.COMMAND_TYPE_DIFF:
      case core.CommandType.COMMAND_TYPE_DOM_COPY:
      case core.CommandType.COMMAND_TYPE_HIDE_REVISION_BOX:
      case core.CommandType.COMMAND_TYPE_INSERT:
      case core.CommandType.COMMAND_TYPE_PASTE:
      case core.CommandType.COMMAND_TYPE_PRESS:
      case core.CommandType.COMMAND_TYPE_SAVE:
      case core.CommandType.COMMAND_TYPE_SELECT:
      case core.CommandType.COMMAND_TYPE_SHOW_REVISION_BOX:
      case core.CommandType.COMMAND_TYPE_STYLE:
      case core.CommandType.COMMAND_TYPE_USE:
        return "editing";
      case core.CommandType.COMMAND_TYPE_CALLBACK:
      case core.CommandType.COMMAND_TYPE_CLICKABLE:
      case core.CommandType.COMMAND_TYPE_EVALUATE_IN_PLUGIN:
      case core.CommandType.COMMAND_TYPE_GET_EDITOR_STATE:
      case core.CommandType.COMMAND_TYPE_INVALID:
      case core.CommandType.COMMAND_TYPE_LANGUAGE_MODE:
      case core.CommandType.COMMAND_TYPE_LOGOUT:
      case core.CommandType.COMMAND_TYPE_NO_OP:
      case core.CommandType.COMMAND_TYPE_PING:
      case core.CommandType.COMMAND_TYPE_REPEAT:
      case core.CommandType.COMMAND_TYPE_SNIPPET:
      case core.CommandType.COMMAND_TYPE_SNIPPET_EXECUTED:
        return "system";
      default:
        return "unknown";
    }
  }

  private verbForCommandType(commandType: string): string {
    return commandType.replace(/^COMMAND_TYPE_/, "").toLowerCase();
  }

  private objectTypeForCommand(commandType: core.CommandType): RuntimeCommandObject["type"] {
    switch (commandType) {
      case core.CommandType.COMMAND_TYPE_CLOSE_WINDOW:
      case core.CommandType.COMMAND_TYPE_FOCUS:
      case core.CommandType.COMMAND_TYPE_LAUNCH:
      case core.CommandType.COMMAND_TYPE_QUIT:
      case core.CommandType.COMMAND_TYPE_WINDOW:
        return "surface";
      case core.CommandType.COMMAND_TYPE_DOM_FOCUS:
      case core.CommandType.COMMAND_TYPE_DOM_BLUR:
      case core.CommandType.COMMAND_TYPE_DOM_CLICK:
      case core.CommandType.COMMAND_TYPE_DOM_SCROLL:
      case core.CommandType.COMMAND_TYPE_CLICK:
      case core.CommandType.COMMAND_TYPE_CLOSE_TAB:
      case core.CommandType.COMMAND_TYPE_CREATE_TAB:
      case core.CommandType.COMMAND_TYPE_DUPLICATE_TAB:
      case core.CommandType.COMMAND_TYPE_FORWARD:
      case core.CommandType.COMMAND_TYPE_RELOAD:
      case core.CommandType.COMMAND_TYPE_SHOW:
      case core.CommandType.COMMAND_TYPE_SPLIT:
      case core.CommandType.COMMAND_TYPE_SWITCH_TAB:
      case core.CommandType.COMMAND_TYPE_OPEN_FILE_LIST:
      case core.CommandType.COMMAND_TYPE_PREVIOUS_TAB:
      case core.CommandType.COMMAND_TYPE_NEXT_TAB:
        return "ui";
      case core.CommandType.COMMAND_TYPE_GO_TO_DEFINITION:
        return "symbol";
      case core.CommandType.COMMAND_TYPE_OPEN_IN_BROWSER:
      case core.CommandType.COMMAND_TYPE_SEARCH:
        return "entity";
      case core.CommandType.COMMAND_TYPE_NEXT:
      case core.CommandType.COMMAND_TYPE_SCROLL:
        return "location";
      case core.CommandType.COMMAND_TYPE_RUN:
        return "process";
      case core.CommandType.COMMAND_TYPE_OPEN_FILE:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_CONTINUE:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_INLINE_BREAKPOINT:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_PAUSE:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_SHOW_HOVER:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_START:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_INTO:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_OUT:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_OVER:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_STOP:
      case core.CommandType.COMMAND_TYPE_DEBUGGER_TOGGLE_BREAKPOINT:
      case core.CommandType.COMMAND_TYPE_DOM_COPY:
      case core.CommandType.COMMAND_TYPE_HIDE_REVISION_BOX:
      case core.CommandType.COMMAND_TYPE_INSERT:
      case core.CommandType.COMMAND_TYPE_PASTE:
      case core.CommandType.COMMAND_TYPE_PRESS:
      case core.CommandType.COMMAND_TYPE_SAVE:
      case core.CommandType.COMMAND_TYPE_SELECT:
      case core.CommandType.COMMAND_TYPE_SHOW_REVISION_BOX:
      case core.CommandType.COMMAND_TYPE_STYLE:
      case core.CommandType.COMMAND_TYPE_USE:
        return "entity";
      default:
        return "system";
    }
  }

  private objectNameForCommand(command: core.ICommand): string {
    if (command.type === core.CommandType.COMMAND_TYPE_START_DICTATE) {
      return "dictation";
    }

    if (command.type === core.CommandType.COMMAND_TYPE_STOP_DICTATE) {
      return "dictation";
    }

    return command.text || command.path || (command.index != null ? command.index.toString() : "current");
  }

  private bindingForCommand(commandType: core.CommandType, command: core.ICommand): RuntimeCommandBinding {
    if (command.index != null && command.index > 0) {
      return {
        resolvedId: command.index.toString(),
        strategy: "index",
      };
    }

    if (command.path) {
      return {
        resolvedId: command.path,
        strategy: "registry",
      };
    }

    if (command.text) {
      return {
        resolvedId: command.text,
        strategy:
          commandType === core.CommandType.COMMAND_TYPE_FOCUS ||
          commandType === core.CommandType.COMMAND_TYPE_LAUNCH ||
          commandType === core.CommandType.COMMAND_TYPE_QUIT
            ? "search"
            : "literal",
      };
    }

    return {
      strategy: "context",
    };
  }

  private executorCandidatesForFamily(family: RuntimeCommandFamily): string[] {
    switch (family) {
      case "reflex":
        return ["reflex_runtime", "legacy_executor"];
      case "focus":
        return ["surface_controller", "legacy_executor"];
      case "navigation":
        return ["surface_navigation", "legacy_executor"];
      case "execution":
        return ["terminal_process_route", "legacy_executor"];
      case "editing":
        return ["editor_semantic_route", "legacy_executor"];
      default:
        return ["legacy_executor"];
    }
  }

  private reversibleForCommandType(commandType: core.CommandType): boolean {
    return ![
      core.CommandType.COMMAND_TYPE_LAUNCH,
      core.CommandType.COMMAND_TYPE_QUIT,
      core.CommandType.COMMAND_TYPE_RUN,
    ].includes(commandType);
  }

  private confirmationRequiredForCommandType(commandType: core.CommandType): boolean {
    return [
      core.CommandType.COMMAND_TYPE_QUIT,
      core.CommandType.COMMAND_TYPE_RUN,
    ].includes(commandType);
  }

  private scopeForFamily(family: RuntimeCommandFamily): RuntimeCommandScope | null {
    switch (family) {
      case "editing":
      case "focus":
      case "navigation":
        return {
          type: "current_surface",
          value: "active",
        };
      case "execution":
        return {
          type: "workspace",
          value: "active",
        };
      default:
        return null;
    }
  }

  emit(response: core.ICommandsResponse, sessionId?: string): RuntimeCommand[] {
    const chunkId = response.chunkId == null ? undefined : response.chunkId;
    const endpointId = response.endpointId == null ? undefined : response.endpointId;
    const transcript =
      response.execute?.transcript != null
        ? response.execute.transcript
        : response.alternatives?.[0]?.transcript != null
          ? response.alternatives[0].transcript
          : undefined;

    const commands = (response.execute?.commands || []).map(
      (command, index): RuntimeCommand => {
        const commandType = command.type || core.CommandType.COMMAND_TYPE_NONE;
        const commandTypeName =
          commandTypeToString(commandType) || "COMMAND_TYPE_UNKNOWN";

        return {
          binding: this.bindingForCommand(commandType, command),
          confirmationRequired: this.confirmationRequiredForCommandType(commandType),
          confidence: 1.0,
          executionMetadata: {
            sessionId,
            timestamp: Date.now(),
            transcriptSource: "legacy_commands_response",
          },
          executorCandidates: this.executorCandidatesForFamily(
            this.familyForCommandType(commandType)
          ),
          family: this.familyForCommandType(commandType),
          lane: "command",
          modifiers: command.modifiers || [],
          object: {
            name: this.objectNameForCommand(command),
            type: this.objectTypeForCommand(commandType),
          },
          postfix: [],
          reversible: this.reversibleForCommandType(commandType),
          scope: this.scopeForFamily(this.familyForCommandType(commandType)),
          chunkId,
          endpointId,
          final: !!response.final,
          index,
          sessionId,
          source: "legacy_commands_response",
          transcript,
          type: commandTypeName,
          verb: this.verbForCommandType(commandTypeName),
        };
      }
    );

    if (commands.length > 0) {
      this.log.logVerbose(`[RuntimeCommandEmitter] ${JSON.stringify(commands)}`);
    }

    return commands;
  }
}
