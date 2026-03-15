import RuntimeCommandDispatcher from "./runtime-command-dispatcher";
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

function responseWith(commandTypes: Array<core.CommandType | number>): core.ICommandsResponse {
  return {
    execute: {
      commands: commandTypes.map((type) => ({ type: type as core.CommandType })),
      transcript: "synthetic",
    },
    final: true,
  } as unknown as core.ICommandsResponse;
}

function createDispatcher() {
  const log = { logVerbose: () => {} } as any;
  const custom = {} as any;
  const executor = {} as any;
  const emitter = new RuntimeCommandEmitter(log);
  return new RuntimeCommandDispatcher(custom, emitter, executor, log);
}

function run(): void {
  test("pure focus stays focus_local", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(responseWith([core.CommandType.COMMAND_TYPE_FOCUS]));

    assert(plan.route === "focus_local", `expected focus_local, got ${plan.route}`);
    assert(
      plan.reason === "all_commands_support_focus_local",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("mixed local commands use composite_local", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(
      responseWith([core.CommandType.COMMAND_TYPE_FOCUS, core.CommandType.COMMAND_TYPE_RUN])
    );

    assert(plan.route === "composite_local", `expected composite_local, got ${plan.route}`);
    assert(
      plan.reason === "mixed_commands_support_composite_local",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("pure navigation uses navigation_plugin", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(responseWith([core.CommandType.COMMAND_TYPE_NEXT]));

    assert(plan.route === "navigation_plugin", `expected navigation_plugin, got ${plan.route}`);
    assert(
      plan.reason === "navigation_requires_plugin_assisted_route",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("mixed bundle with plugin-assisted navigation uses mixed_plugin_assisted", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(
      responseWith([core.CommandType.COMMAND_TYPE_FOCUS, core.CommandType.COMMAND_TYPE_NEXT])
    );

    assert(
      plan.route === "mixed_plugin_assisted",
      `expected mixed_plugin_assisted, got ${plan.route}`
    );
    assert(
      plan.reason === "mixed_commands_require_plugin_assisted_route",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("pure plugin-dependent editing uses editing_plugin", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(responseWith([core.CommandType.COMMAND_TYPE_INSERT]));

    assert(plan.route === "editing_plugin", `expected editing_plugin, got ${plan.route}`);
    assert(
      plan.reason === "editing_requires_plugin_assisted_route",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("debugger editing commands use editing_plugin", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(responseWith([core.CommandType.COMMAND_TYPE_DEBUGGER_PAUSE]));

    assert(plan.route === "editing_plugin", `expected editing_plugin, got ${plan.route}`);
    assert(
      plan.reason === "editing_requires_plugin_assisted_route",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("pure system commands use system_plugin", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(responseWith([core.CommandType.COMMAND_TYPE_SNIPPET]));

    assert(plan.route === "system_plugin", `expected system_plugin, got ${plan.route}`);
    assert(
      plan.reason === "system_requires_plugin_assisted_route",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("non-local focus family uses focus_plugin", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(responseWith([core.CommandType.COMMAND_TYPE_CLOSE_WINDOW]));

    assert(plan.route === "focus_plugin", `expected focus_plugin, got ${plan.route}`);
    assert(
      plan.reason === "focus_requires_plugin_assisted_route",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("newly classified navigation dom commands use navigation_plugin", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(responseWith([core.CommandType.COMMAND_TYPE_DOM_CLICK]));

    assert(plan.route === "navigation_plugin", `expected navigation_plugin, got ${plan.route}`);
    assert(
      plan.reason === "navigation_requires_plugin_assisted_route",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("no commands stays presentation_only", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan({ execute: { commands: [] } } as unknown as core.ICommandsResponse);

    assert(plan.route === "presentation_only", `expected presentation_only, got ${plan.route}`);
    assert(plan.reason === "no_routable_commands", `unexpected reason: ${plan.reason}`);
  });

  test("mixed bundle with system plugin command uses mixed_plugin_assisted", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(
      responseWith([core.CommandType.COMMAND_TYPE_FOCUS, core.CommandType.COMMAND_TYPE_SNIPPET])
    );

    assert(
      plan.route === "mixed_plugin_assisted",
      `expected mixed_plugin_assisted, got ${plan.route}`
    );
    assert(
      plan.reason === "mixed_commands_require_plugin_assisted_route",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("mixed bundles with repeat use mixed_plugin_assisted", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(
      responseWith([core.CommandType.COMMAND_TYPE_FOCUS, core.CommandType.COMMAND_TYPE_REPEAT])
    );

    assert(
      plan.route === "mixed_plugin_assisted",
      `expected mixed_plugin_assisted, got ${plan.route}`
    );
    assert(
      plan.reason === "mixed_commands_require_plugin_assisted_route",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("mixed bundles with debugger commands use mixed_plugin_assisted", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(
      responseWith([core.CommandType.COMMAND_TYPE_FOCUS, core.CommandType.COMMAND_TYPE_DEBUGGER_PAUSE])
    );

    assert(
      plan.route === "mixed_plugin_assisted",
      `expected mixed_plugin_assisted, got ${plan.route}`
    );
    assert(
      plan.reason === "mixed_commands_require_plugin_assisted_route",
      `unexpected reason: ${plan.reason}`
    );
  });

  test("mixed unresolved with unknown command id routes to unknown_legacy", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(
      responseWith([core.CommandType.COMMAND_TYPE_FOCUS, 999])
    );

    assert(plan.route === "unknown_legacy", `expected unknown_legacy, got ${plan.route}`);
    assert(plan.reason === "unknown_command_family_in_mixed_bundle", `unexpected reason: ${plan.reason}`);
  });

  test("unknown commands stay in unknown_legacy", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(responseWith([999]));

    assert(plan.route === "unknown_legacy", `expected unknown_legacy, got ${plan.route}`);
    assert(plan.reason === "unknown_command_family", `unexpected reason: ${plan.reason}`);
  });

  test("none and invalid commands stay presentation_only", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(
      responseWith([core.CommandType.COMMAND_TYPE_NONE, core.CommandType.COMMAND_TYPE_INVALID])
    );

    assert(plan.route === "presentation_only", `expected presentation_only, got ${plan.route}`);
    assert(plan.reason === "no_op_or_invalid_commands", `unexpected reason: ${plan.reason}`);
  });

  test("focus plus ping routes as focus_local after ignorable filtering", () => {
    const dispatcher = createDispatcher();
    const plan = dispatcher.plan(
      responseWith([core.CommandType.COMMAND_TYPE_FOCUS, core.CommandType.COMMAND_TYPE_PING])
    );

    assert(plan.route === "focus_local", `expected focus_local, got ${plan.route}`);
    assert(
      plan.reason === "all_commands_support_focus_local",
      `unexpected reason: ${plan.reason}`
    );
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
