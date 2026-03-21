import { core } from "../../gen/core";
import { languageSystemIntegrationService } from "../../main/runtime/language-system-integration-service";
import { surfaceModelService } from "../../main/runtime/surface-model-service";
import RuntimeCommandDispatcher from "../../main/runtime/runtime-command-dispatcher";
import RuntimeCommandEmitter from "../../main/runtime/runtime-command-emitter";
import {
  RuntimeExecutionPort,
  RuntimeShellCallbackPort,
} from "../../main/runtime/runtime-dispatch-ports";

describe("Phase 4D language/system integration", () => {
  it("fails safely when referential marker is weak/unknown", () => {
    const result = languageSystemIntegrationService.evaluate({
      transcript: "open this",
      securityMode: "standard",
      speakerVerified: true,
      interactionMode: "command",
      isReflexCommand: false,
      dominantFamily: "focus",
    });

    expect(result.status).toBe("block");
    expect(result.referential?.outcome).toBe("no_referent");
  });

  it("passes when referential marker resolves with grounded surface context", () => {
    const surface = surfaceModelService.buildSurfaceRecord({
      surfaceType: "editor",
      surfaceClass: "root",
      surfaceId: "surface_editor_1",
      label: "Editor",
      appId: "vscode",
      visibility: "focused",
    });
    const context = surfaceModelService.buildContext({
      activeSurface: surface,
    });

    const result = languageSystemIntegrationService.evaluate({
      transcript: "focus this",
      securityMode: "standard",
      speakerVerified: true,
      interactionMode: "command",
      isReflexCommand: false,
      dominantFamily: "focus",
      surfaceContext: context,
    });

    expect(result.status).toBe("pass");
    expect(result.referential?.outcome).toBe("resolved");
  });

  it("blocks dispatcher execution when language/system integration blocks", async () => {
    const log = { logVerbose: () => {} } as any;
    const emitter = new RuntimeCommandEmitter(log);
    const shellPort: RuntimeShellCallbackPort = { send: jest.fn() };
    const executionPort: RuntimeExecutionPort = {
      executeLocalRoute: jest.fn(async () => {}),
      executePluginAssistedRoute: jest.fn(async () => {}),
      execute: jest.fn(async () => {}),
    };
    const dispatcher = new RuntimeCommandDispatcher(shellPort, emitter, executionPort, log);

    const response = {
      execute: {
        commands: [{ type: core.CommandType.COMMAND_TYPE_FOCUS }],
        transcript: "focus this",
      },
      final: true,
      chunkId: "c-phase4d-1",
    } as unknown as core.ICommandsResponse;

    await dispatcher.dispatch(response, {
      securityMode: "standard",
      speakerVerified: true,
      interactionMode: "command",
    });

    expect(executionPort.executeLocalRoute).not.toHaveBeenCalled();
    expect(executionPort.executePluginAssistedRoute).not.toHaveBeenCalled();
    expect(executionPort.execute).not.toHaveBeenCalled();
  });
});
