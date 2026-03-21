import RuntimeCommandEmitter from "./runtime-command-emitter";
import { core } from "../../gen/core";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${name}: ${error}`);
  }
}

function run(): void {
  const log = { logVerbose: () => {} } as any;
  const emitter = new RuntimeCommandEmitter(log);

  test("unknown numeric command type falls back safely", () => {
    const response = {
      execute: {
        commands: [{ type: 999 as core.CommandType }],
        transcript: "unknown command",
      },
      final: true,
      chunkId: "chunk-1",
    } as unknown as core.ICommandsResponse;

    const commands = emitter.emit(response);
    assert(commands.length === 1, `expected one command, got ${commands.length}`);
    assert(commands[0].type === "COMMAND_TYPE_UNKNOWN", `unexpected type: ${commands[0].type}`);
    assert(commands[0].verb === "unknown", `unexpected verb: ${commands[0].verb}`);
    assert(commands[0].family === "unknown", `unexpected family: ${commands[0].family}`);
  });

  test("none command type preserves canonical string", () => {
    const response = {
      execute: {
        commands: [{ type: core.CommandType.COMMAND_TYPE_NONE }],
      },
      final: true,
    } as unknown as core.ICommandsResponse;

    const commands = emitter.emit(response);
    assert(commands[0].type === "COMMAND_TYPE_NONE", `unexpected type: ${commands[0].type}`);
    assert(commands[0].verb === "none", `unexpected verb: ${commands[0].verb}`);
  });

  test("close window classifies as focus family", () => {
    const response = {
      execute: {
        commands: [{ type: core.CommandType.COMMAND_TYPE_CLOSE_WINDOW }],
      },
      final: true,
    } as unknown as core.ICommandsResponse;

    const commands = emitter.emit(response);
    assert(commands[0].family === "focus", `unexpected family: ${commands[0].family}`);
    assert(commands[0].object.type === "surface", `unexpected object type: ${commands[0].object.type}`);
  });

  test("dom click classifies as navigation family", () => {
    const response = {
      execute: {
        commands: [{ type: core.CommandType.COMMAND_TYPE_DOM_CLICK }],
      },
      final: true,
    } as unknown as core.ICommandsResponse;

    const commands = emitter.emit(response);
    assert(commands[0].family === "navigation", `unexpected family: ${commands[0].family}`);
    assert(commands[0].object.type === "ui", `unexpected object type: ${commands[0].object.type}`);
  });

  test("style classifies as editing family", () => {
    const response = {
      execute: {
        commands: [{ type: core.CommandType.COMMAND_TYPE_STYLE }],
      },
      final: true,
    } as unknown as core.ICommandsResponse;

    const commands = emitter.emit(response);
    assert(commands[0].family === "editing", `unexpected family: ${commands[0].family}`);
  });

  test("show revision box classifies as editing family", () => {
    const response = {
      execute: {
        commands: [{ type: core.CommandType.COMMAND_TYPE_SHOW_REVISION_BOX }],
      },
      final: true,
    } as unknown as core.ICommandsResponse;

    const commands = emitter.emit(response);
    assert(commands[0].family === "editing", `unexpected family: ${commands[0].family}`);
  });

  test("debugger pause classifies as editing family", () => {
    const response = {
      execute: {
        commands: [{ type: core.CommandType.COMMAND_TYPE_DEBUGGER_PAUSE }],
      },
      final: true,
    } as unknown as core.ICommandsResponse;

    const commands = emitter.emit(response);
    assert(commands[0].family === "editing", `unexpected family: ${commands[0].family}`);
    assert(commands[0].object.type === "entity", `unexpected object type: ${commands[0].object.type}`);
  });

  test("evaluate-in-plugin classifies as system family", () => {
    const response = {
      execute: {
        commands: [{ type: core.CommandType.COMMAND_TYPE_EVALUATE_IN_PLUGIN }],
      },
      final: true,
    } as unknown as core.ICommandsResponse;

    const commands = emitter.emit(response);
    assert(commands[0].family === "system", `unexpected family: ${commands[0].family}`);
  });

  test("logout classifies as system family", () => {
    const response = {
      execute: {
        commands: [{ type: core.CommandType.COMMAND_TYPE_LOGOUT }],
      },
      final: true,
    } as unknown as core.ICommandsResponse;

    const commands = emitter.emit(response);
    assert(commands[0].family === "system", `unexpected family: ${commands[0].family}`);
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
