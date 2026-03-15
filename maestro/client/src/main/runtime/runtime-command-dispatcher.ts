import Custom from "../ipc/custom";
import Executor from "../execute/executor";
import Log from "../log";
import { core } from "../../gen/core";
import ExecutionTrace from "./execution-trace";
import RuntimeCommandEmitter, { RuntimeCommand, RuntimeCommandFamily } from "./runtime-command-emitter";

interface DispatchOptions {
  emitNormalizedCommands?: boolean;
  onNormalizedCommands?: (count: number) => void;
  onPlanned?: (plan: DispatchPlan) => void;
  sessionId?: string;
  updateRenderer?: boolean;
}

type DispatchRoute = "legacy_executor" | "presentation_only";

interface DispatchPlan {
  commands: RuntimeCommand[];
  dominantFamily:
    | RuntimeCommandFamily
    | "mixed"
    | "none";
  route: DispatchRoute;
}

export default class RuntimeCommandDispatcher {
  constructor(
    private custom: Custom,
    private emitter: RuntimeCommandEmitter,
    private executor: Executor,
    private log: Log,
    private executionTrace?: ExecutionTrace
  ) {}

  emitNormalizedCommands(response: core.ICommandsResponse, sessionId?: string): number {
    return this.emitter.emit(response, sessionId).length;
  }

  private dominantFamily(commands: RuntimeCommand[]): DispatchPlan["dominantFamily"] {
    if (commands.length === 0) {
      return "none";
    }

    const families = new Set(commands.map((command) => command.family));
    if (families.size === 1) {
      return commands[0].family;
    }

    return "mixed";
  }

  plan(response: core.ICommandsResponse, sessionId?: string): DispatchPlan {
    const commands = this.emitter.emit(response, sessionId);
    return {
      commands,
      dominantFamily: this.dominantFamily(commands),
      route: commands.length > 0 ? "legacy_executor" : "presentation_only",
    };
  }

  async dispatch(
    response: core.ICommandsResponse,
    {
      emitNormalizedCommands = false,
      onNormalizedCommands,
      onPlanned,
      sessionId,
      updateRenderer = true,
    }: DispatchOptions = {}
  ): Promise<void> {
    const plan = this.plan(response, sessionId);
    onPlanned?.(plan);
    if (emitNormalizedCommands) {
      onNormalizedCommands?.(plan.commands.length);
    }
    if (response.chunkId) {
      this.executionTrace?.recordDispatchPlan(
        response.chunkId,
        plan.route,
        plan.dominantFamily,
        sessionId
      );
    }

    this.log.logVerbose(
      `[RuntimeCommandDispatcher] ${JSON.stringify({
        chunkId: response.chunkId || "unknown",
        dominantFamily: plan.dominantFamily,
        route: plan.route,
        commandTypes: plan.commands.map((command) => command.type),
      })}`
    );
    await this.executor.execute(response, updateRenderer);
  }

  sendTextCallback(response: core.ICommandsResponse): void {
    this.custom.send("callback", {
      transcript: response.execute?.transcript,
    });
  }
}
