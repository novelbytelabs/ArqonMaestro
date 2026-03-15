import Log from "../log";
import { commandTypeToString } from "../../shared/alternatives";
import { core } from "../../gen/core";

export interface RuntimeCommand {
  family: RuntimeCommandFamily;
  lane: "command";
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

// Phase 1 uses a lightweight normalized command envelope so the legacy command
// response path can start emitting a deterministic runtime shape before the
// broader executor/router contract is fully replaced.
export default class RuntimeCommandEmitter {
  constructor(private log: Log) {}

  private familyForCommandType(commandType: core.CommandType): RuntimeCommandFamily {
    switch (commandType) {
      case core.CommandType.COMMAND_TYPE_CANCEL:
      case core.CommandType.COMMAND_TYPE_PAUSE:
      case core.CommandType.COMMAND_TYPE_REDO:
      case core.CommandType.COMMAND_TYPE_UNDO:
      case core.CommandType.COMMAND_TYPE_START_DICTATE:
      case core.CommandType.COMMAND_TYPE_STOP_DICTATE:
        return "reflex";
      case core.CommandType.COMMAND_TYPE_FOCUS:
      case core.CommandType.COMMAND_TYPE_LAUNCH:
      case core.CommandType.COMMAND_TYPE_QUIT:
      case core.CommandType.COMMAND_TYPE_WINDOW:
        return "focus";
      case core.CommandType.COMMAND_TYPE_GO_TO_DEFINITION:
      case core.CommandType.COMMAND_TYPE_NEXT:
      case core.CommandType.COMMAND_TYPE_NEXT_TAB:
      case core.CommandType.COMMAND_TYPE_OPEN_FILE:
      case core.CommandType.COMMAND_TYPE_OPEN_FILE_LIST:
      case core.CommandType.COMMAND_TYPE_PREVIOUS_TAB:
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
      case core.CommandType.COMMAND_TYPE_DIFF:
      case core.CommandType.COMMAND_TYPE_INSERT:
      case core.CommandType.COMMAND_TYPE_PASTE:
      case core.CommandType.COMMAND_TYPE_PRESS:
      case core.CommandType.COMMAND_TYPE_SELECT:
      case core.CommandType.COMMAND_TYPE_USE:
        return "editing";
      case core.CommandType.COMMAND_TYPE_CALLBACK:
      case core.CommandType.COMMAND_TYPE_GET_EDITOR_STATE:
      case core.CommandType.COMMAND_TYPE_LANGUAGE_MODE:
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
      (command, index): RuntimeCommand => ({
        family: this.familyForCommandType(command.type || core.CommandType.COMMAND_TYPE_NONE),
        lane: "command",
        chunkId,
        endpointId,
        final: !!response.final,
        index,
        sessionId,
        source: "legacy_commands_response",
        transcript,
        type: commandTypeToString(command.type || core.CommandType.COMMAND_TYPE_NONE),
        verb: this.verbForCommandType(
          commandTypeToString(command.type || core.CommandType.COMMAND_TYPE_NONE)
        ),
      })
    );

    if (commands.length > 0) {
      this.log.logVerbose(`[RuntimeCommandEmitter] ${JSON.stringify(commands)}`);
    }

    return commands;
  }
}
