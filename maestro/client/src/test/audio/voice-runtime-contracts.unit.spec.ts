import { core } from "../../gen/core";
import RuntimeCommandDispatcher from "../../main/runtime/runtime-command-dispatcher";
import RuntimeCommandEmitter from "../../main/runtime/runtime-command-emitter";

function responseWith(commandTypes: Array<core.CommandType | number>): core.ICommandsResponse {
  return {
    execute: {
      commands: commandTypes.map((type) => ({ type: type as core.CommandType })),
      transcript: "synthetic",
    },
    final: true,
  } as unknown as core.ICommandsResponse;
}

describe("Voice runtime contracts", () => {
  const log = { logVerbose: () => undefined } as any;
  const emitter = new RuntimeCommandEmitter(log);
  const dispatcher = new RuntimeCommandDispatcher({} as any, emitter, {} as any, log);

  describe("Emitter classification", () => {
    it("classifies focus command in focus family", () => {
      const commands = emitter.emit(responseWith([core.CommandType.COMMAND_TYPE_FOCUS]));
      expect(commands[0].family).toBe("focus");
      expect(commands[0].type).toBe("COMMAND_TYPE_FOCUS");
      expect(commands[0].verb).toBe("focus");
    });

    it("classifies start dictate command in reflex family", () => {
      const commands = emitter.emit(responseWith([core.CommandType.COMMAND_TYPE_START_DICTATE]));
      expect(commands[0].family).toBe("reflex");
      expect(commands[0].type).toBe("COMMAND_TYPE_START_DICTATE");
      expect(commands[0].object.name).toBe("dictation");
    });

    it("handles unknown numeric command type safely", () => {
      const commands = emitter.emit(responseWith([999]));
      expect(commands[0].family).toBe("unknown");
      expect(commands[0].type).toBe("COMMAND_TYPE_UNKNOWN");
      expect(commands[0].verb).toBe("unknown");
    });
  });

  describe("Dispatcher routes", () => {
    it("routes pure focus bundle to focus_local", () => {
      const plan = dispatcher.plan(responseWith([core.CommandType.COMMAND_TYPE_FOCUS]));
      expect(plan.route).toBe("focus_local");
      expect(plan.reason).toBe("all_commands_support_focus_local");
    });

    it("routes pure start_dictate bundle to app_control_local", () => {
      const plan = dispatcher.plan(responseWith([core.CommandType.COMMAND_TYPE_START_DICTATE]));
      expect(plan.route).toBe("app_control_local");
      expect(plan.reason).toBe("all_commands_support_app_control_local");
    });

    it("routes mixed focus + run to composite_local", () => {
      const plan = dispatcher.plan(
        responseWith([core.CommandType.COMMAND_TYPE_FOCUS, core.CommandType.COMMAND_TYPE_RUN])
      );
      expect(plan.route).toBe("composite_local");
      expect(plan.reason).toBe("mixed_commands_support_composite_local");
    });

    it("routes no-op only bundles to presentation_only", () => {
      const plan = dispatcher.plan(
        responseWith([core.CommandType.COMMAND_TYPE_NONE, core.CommandType.COMMAND_TYPE_INVALID])
      );
      expect(plan.route).toBe("presentation_only");
      expect(plan.reason).toBe("no_op_or_invalid_commands");
    });

    it("routes unknown bundles to unknown_legacy", () => {
      const plan = dispatcher.plan(responseWith([999]));
      expect(plan.route).toBe("unknown_legacy");
      expect(plan.reason).toBe("unknown_command_family");
    });
  });
});
