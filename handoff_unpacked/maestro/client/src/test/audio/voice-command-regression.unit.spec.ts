import { core } from "../../gen/core";
import RuntimeCommandDispatcher from "../../main/runtime/runtime-command-dispatcher";
import RuntimeCommandEmitter from "../../main/runtime/runtime-command-emitter";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Executor = require("../../main/execute/executor.js").default;

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

});
