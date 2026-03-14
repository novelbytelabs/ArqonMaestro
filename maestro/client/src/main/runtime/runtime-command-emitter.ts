import Log from "../log";
import { commandTypeToString } from "../../shared/alternatives";
import { core } from "../../gen/core";

export interface RuntimeCommand {
  lane: "command";
  chunkId?: string;
  endpointId?: string;
  final: boolean;
  index: number;
  sessionId?: string;
  source: "legacy_commands_response";
  transcript?: string;
  type: string;
}

// Phase 1 uses a lightweight normalized command envelope so the legacy command
// response path can start emitting a deterministic runtime shape before the
// broader executor/router contract is fully replaced.
export default class RuntimeCommandEmitter {
  constructor(private log: Log) {}

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
        lane: "command",
        chunkId,
        endpointId,
        final: !!response.final,
        index,
        sessionId,
        source: "legacy_commands_response",
        transcript,
        type: commandTypeToString(command.type || core.CommandType.COMMAND_TYPE_NONE),
      })
    );

    if (commands.length > 0) {
      this.log.logVerbose(`[RuntimeCommandEmitter] ${JSON.stringify(commands)}`);
    }

    return commands;
  }
}
