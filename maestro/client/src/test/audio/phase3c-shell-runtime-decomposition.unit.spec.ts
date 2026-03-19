import { core } from "../../gen/core";
import RuntimeCommandDispatcher from "../../main/runtime/runtime-command-dispatcher";
import RuntimeCommandEmitter from "../../main/runtime/runtime-command-emitter";
import {
  RuntimeExecutionPort,
  RuntimeShellCallbackPort,
} from "../../main/runtime/runtime-dispatch-ports";

describe("Phase 3C shell/runtime decomposition", () => {
  it("dispatches through runtime ports without concrete shell/executor classes", async () => {
    const log = { logVerbose: () => {} } as any;
    const emitter = new RuntimeCommandEmitter(log);

    const shellPort: RuntimeShellCallbackPort = {
      send: jest.fn(),
    };

    const executionPort: RuntimeExecutionPort = {
      executeLocalRoute: jest.fn(async () => {}),
      executePluginAssistedRoute: jest.fn(async () => {}),
      execute: jest.fn(async () => {}),
    };

    const dispatcher = new RuntimeCommandDispatcher(shellPort, emitter, executionPort, log);

    const response = {
      execute: {
        commands: [{ type: core.CommandType.COMMAND_TYPE_FOCUS }],
        transcript: "focus terminal",
      },
      final: true,
      chunkId: "c-phase3c-1",
    } as unknown as core.ICommandsResponse;

    await dispatcher.dispatch(response, {
      securityMode: "standard",
      speakerVerified: true,
      interactionMode: "command",
    });

    expect(executionPort.executeLocalRoute).toHaveBeenCalledTimes(1);
    expect(executionPort.executePluginAssistedRoute).not.toHaveBeenCalled();
    expect(executionPort.execute).not.toHaveBeenCalled();
  });
});
