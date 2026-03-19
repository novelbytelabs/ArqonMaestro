import { core } from "../../gen/core";

/**
 * Runtime-facing execution port.
 * Host/executor implementations adapt to this contract; runtime does not
 * depend on concrete shell classes.
 */
export interface RuntimeExecutionPort {
  executeLocalRoute(response: core.ICommandsResponse, updateRenderer?: boolean): Promise<void>;
  executePluginAssistedRoute(response: core.ICommandsResponse, updateRenderer?: boolean): Promise<void>;
  execute(response: core.ICommandsResponse, updateRenderer?: boolean): Promise<void>;
}

/**
 * Runtime-facing shell callback bridge.
 * Keeps shell IPC details outside hot-path decision logic.
 */
export interface RuntimeShellCallbackPort {
  send(channel: string, payload: unknown): void;
}
