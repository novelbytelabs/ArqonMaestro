import { core } from "../../gen/core";
import RuntimeCommandDispatcher from "../../main/runtime/runtime-command-dispatcher";
import RuntimeCommandEmitter from "../../main/runtime/runtime-command-emitter";
import { h23Recorder } from "../../main/runtime/h23-live-trace-recorder";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Executor = require("../../main/execute/executor").default;

function responseWithAlternatives(
  transcript: string,
  commands: Array<{ type: core.CommandType; text?: string }>
): core.ICommandsResponse {
  return {
    alternatives: [
      {
        transcript,
        commands: commands.map((command) => ({
          type: command.type,
          text: command.text,
        })),
      },
    ],
    final: true,
  } as unknown as core.ICommandsResponse;
}

function responseWithExecute(commands: Array<{ type: core.CommandType; text?: string }>): core.ICommandsResponse {
  return {
    execute: {
      commands: commands.map((command) => ({
        type: command.type,
        text: command.text,
      })),
      transcript: "synthetic",
    },
    final: true,
  } as unknown as core.ICommandsResponse;
}

describe("Voice command regression suite", () => {
  describe("Focus stability gate", () => {
    const originalSimpleFocus = process.env.ARQON_SIMPLE_FOCUS_MODE;

    afterEach(() => {
      process.env.ARQON_SIMPLE_FOCUS_MODE = originalSimpleFocus;
    });

    it("keeps simple focus mode enabled by default unless env disables it", () => {
      const executor = Object.create(Executor.prototype) as any;
      executor.settings = {
        getArqonFocusSimpleModeEnabled: () => true,
      };

      delete process.env.ARQON_SIMPLE_FOCUS_MODE;
      const envFocusMode = process.env.ARQON_SIMPLE_FOCUS_MODE;
      const simpleFocusMode =
        envFocusMode !== undefined
          ? envFocusMode !== "0"
          : executor.settings.getArqonFocusSimpleModeEnabled();
      expect(simpleFocusMode).toBe(true);

      process.env.ARQON_SIMPLE_FOCUS_MODE = "0";
      const envOverride = process.env.ARQON_SIMPLE_FOCUS_MODE !== "0";
      expect(envOverride).toBe(false);
    });
  });

  describe("Executor auto-activation behavior", () => {
    it("auto-activates focus alternative for 'focus chrome'", () => {
      const executor = Object.create(Executor.prototype) as any;
      const response = responseWithAlternatives("focus chrome", [
        { type: core.CommandType.COMMAND_TYPE_FOCUS, text: "chrome" },
      ]);

      const output = executor.setExecuteToFirstAlternativeIfNeeded(response);
      expect(output.execute).toBeDefined();
      expect(output.execute.commands[0].type).toBe(core.CommandType.COMMAND_TYPE_FOCUS);
      expect(output.execute.commands[0].text).toBe("chrome");
    });

    it("auto-activates focus alternative for 'focus code'", () => {
      const executor = Object.create(Executor.prototype) as any;
      const response = responseWithAlternatives("focus code", [
        { type: core.CommandType.COMMAND_TYPE_FOCUS, text: "code" },
      ]);

      const output = executor.setExecuteToFirstAlternativeIfNeeded(response);
      expect(output.execute).toBeDefined();
      expect(output.execute.commands[0].type).toBe(core.CommandType.COMMAND_TYPE_FOCUS);
      expect(output.execute.commands[0].text).toBe("code");
    });

    it("auto-activates start dictate alternative for 'dictate mode'", () => {
      const executor = Object.create(Executor.prototype) as any;
      const response = responseWithAlternatives("dictate mode", [
        { type: core.CommandType.COMMAND_TYPE_START_DICTATE },
      ]);

      const output = executor.setExecuteToFirstAlternativeIfNeeded(response);
      expect(output.execute).toBeDefined();
      expect(output.execute.commands[0].type).toBe(core.CommandType.COMMAND_TYPE_START_DICTATE);
    });

    it("auto-activates goto-line fallback alternative for 'go to line fifty two'", () => {
      const executor = Object.create(Executor.prototype) as any;
      const response = responseWithAlternatives("go to line fifty two", [
        { type: core.CommandType.COMMAND_TYPE_PRESS, text: "" },
      ]);
      executor.log = { logVerbose: jest.fn() };

      const output = executor.setExecuteToFirstAlternativeIfNeeded(response);
      expect(output.execute).toBeDefined();
      expect(output.execute.commands[0].type).toBe(core.CommandType.COMMAND_TYPE_PRESS);
      expect(output.execute.commands[0].text).toBe("g");
      expect(output.execute.commands[1].type).toBe(core.CommandType.COMMAND_TYPE_INSERT);
      expect(output.execute.commands[1].text).toBe("52");
      expect(output.execute.commands[2].text).toBe("return");
    });

    it("auto-activates tab creation alternative for 'new tab'", () => {
      const executor = Object.create(Executor.prototype) as any;
      const response = responseWithAlternatives("new tab", [
        { type: core.CommandType.COMMAND_TYPE_CREATE_TAB },
      ]);

      const output = executor.setExecuteToFirstAlternativeIfNeeded(response);
      expect(output.execute).toBeDefined();
      expect(output.execute.commands[0].type).toBe(core.CommandType.COMMAND_TYPE_CREATE_TAB);
    });

    it("auto-activates endpoint navigation fallback for 'go to end'", () => {
      const executor = Object.create(Executor.prototype) as any;
      const response = responseWithAlternatives("go to end", [
        { type: core.CommandType.COMMAND_TYPE_PRESS, text: "" },
      ]);
      executor.log = { logVerbose: jest.fn() };

      const output = executor.setExecuteToFirstAlternativeIfNeeded(response);
      expect(output.execute).toBeDefined();
      expect(output.execute.commands[0].type).toBe(core.CommandType.COMMAND_TYPE_PRESS);
      expect(output.execute.commands[0].text).toBe("g");
      expect(output.execute.commands[1].type).toBe(core.CommandType.COMMAND_TYPE_INSERT);
      expect(output.execute.commands[1].text).toBe("999999");
      expect(output.execute.commands[2].text).toBe("return");
    });

    it("synthesizes focus fallback when transcript is present but command payload is empty", () => {
      const executor = Object.create(Executor.prototype) as any;
      executor.log = { logVerbose: jest.fn() };
      const response = responseWithAlternatives("focus code", [
        { type: core.CommandType.COMMAND_TYPE_PRESS, text: "" },
      ]);

      const output = executor.setExecuteToFirstAlternativeIfNeeded(response);
      expect(output.execute).toBeDefined();
      expect(output.execute.commands[0].type).toBe(core.CommandType.COMMAND_TYPE_FOCUS);
      expect(output.execute.commands[0].text).toBe("code");
    });
  });

  describe("Runtime route classification", () => {
    const log = { logVerbose: () => undefined } as any;
    const emitter = new RuntimeCommandEmitter(log);
    const dispatcher = new RuntimeCommandDispatcher({} as any, emitter, {} as any, log);

    it("routes focus commands to focus_local", () => {
      const plan = dispatcher.plan(
        responseWithExecute([{ type: core.CommandType.COMMAND_TYPE_FOCUS, text: "chrome" }])
      );
      expect(plan.route).toBe("focus_local");
      expect(plan.reason).toBe("all_commands_support_focus_local");
    });

    it("routes dictation mode command to app_control_local", () => {
      const plan = dispatcher.plan(
        responseWithExecute([{ type: core.CommandType.COMMAND_TYPE_START_DICTATE }])
      );
      expect(plan.route).toBe("app_control_local");
      expect(plan.reason).toBe("all_commands_support_app_control_local");
    });
  });

  describe("Go-to-line execution gating regression", () => {
    const originalHardGate = process.env.H23_HARD_GATE_NUMERIC;

    afterEach(() => {
      process.env.H23_HARD_GATE_NUMERIC = originalHardGate;
      jest.restoreAllMocks();
    });

    it("executes local PRESS/INSERT/PRESS chain when H2.3 decision is missing", async () => {
      process.env.H23_HARD_GATE_NUMERIC = "true";

      const pressHandler = jest.fn().mockResolvedValue(undefined);
      const insertHandler = jest.fn().mockResolvedValue(undefined);
      const failLoud = jest.fn();

      const executor = Object.create(Executor.prototype) as any;
      executor.bridge = { setState: jest.fn(), send: jest.fn() };
      executor.mainWindow = {};
      executor.miniModeWindow = {};
      executor.log = { logVerbose: jest.fn() };
      executor.nativeCommands = {};
      executor.addToHistory = jest.fn();
      executor.checkAuthorization = jest
        .fn()
        .mockResolvedValue({ authorized: true, interactionId: 1, trustState: "verified" });
      executor.setLifecycleRendererState = jest.fn();
      executor.beginCompletionEvidenceWindow = jest.fn();
      executor.settings = { getNuxCompleted: () => true };
      executor.active = { app: "vscode", filename: "calculator.py" };
      executor.revisionBoxWindow = { shown: () => false };
      executor.pluginManager = { sendResponseToApp: jest.fn() };
      executor.insertHistory = { clear: jest.fn() };
      executor.commandHandler = () => ({
        COMMAND_TYPE_PRESS: pressHandler,
        COMMAND_TYPE_INSERT: insertHandler,
      });
      executor.handleResponseFromPlugin = jest.fn();
      executor.nux = { updateForResponse: jest.fn() };
      executor.finalizeCompletionEvidence = jest.fn();
      executor.failLoudExecution = failLoud;

      jest.spyOn(h23Recorder, "getLatestDecision").mockReturnValue(undefined as any);
      jest.spyOn(h23Recorder, "finalizeChunk").mockImplementation(() => undefined as any);

      const response = {
        chunkId: "regression-go-to-line-52",
        final: true,
        execute: {
          transcript: "go to line fifty two",
          commands: [
            {
              type: core.CommandType.COMMAND_TYPE_PRESS,
              text: "g",
              modifiers: ["control"],
              count: 1,
            },
            { type: core.CommandType.COMMAND_TYPE_INSERT, text: "52" },
            { type: core.CommandType.COMMAND_TYPE_PRESS, text: "enter", count: 1 },
          ],
        },
      } as unknown as core.ICommandsResponse;

      await executor.execute(response, false, 0);

      expect(pressHandler).toHaveBeenCalledTimes(2);
      expect(insertHandler).toHaveBeenCalledTimes(1);
      expect(executor.pluginManager.sendResponseToApp).not.toHaveBeenCalled();
      expect(failLoud).not.toHaveBeenCalled();
    });

    it("fails loud when H2.3 explicitly blocks execution", async () => {
      process.env.H23_HARD_GATE_NUMERIC = "true";

      const failLoud = jest.fn();
      const executor = Object.create(Executor.prototype) as any;
      executor.bridge = { setState: jest.fn(), send: jest.fn() };
      executor.mainWindow = {};
      executor.miniModeWindow = {};
      executor.log = { logVerbose: jest.fn() };
      executor.nativeCommands = {};
      executor.addToHistory = jest.fn();
      executor.checkAuthorization = jest
        .fn()
        .mockResolvedValue({ authorized: true, interactionId: 1, trustState: "verified" });
      executor.setLifecycleRendererState = jest.fn();
      executor.beginCompletionEvidenceWindow = jest.fn();
      executor.failLoudExecution = failLoud;
      executor.newChainFinishedPromise = jest.fn();
      executor.resolveChainFinished = jest.fn();

      jest.spyOn(h23Recorder, "getLatestDecision").mockReturnValue({
        chunkId: "blocked",
        commandClass: "parameterized",
        granted: false,
        numericEndpointRequired: true,
        reason: "test_block",
      } as any);

      const response = {
        chunkId: "blocked",
        final: true,
        execute: {
          transcript: "go to line fifty two",
          commands: [{ type: core.CommandType.COMMAND_TYPE_PRESS, text: "g" }],
        },
      } as unknown as core.ICommandsResponse;

      await executor.execute(response, false, 0);

      expect(failLoud).toHaveBeenCalled();
      expect((failLoud.mock.calls[0] || [])[0]).toBe("h23_gate_block");
    });
  });

});
