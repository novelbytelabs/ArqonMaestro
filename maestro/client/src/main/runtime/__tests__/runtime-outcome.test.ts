import { core } from "../../../gen/core";
import { RuntimeOutcomeClassifier } from "../runtime-outcome";

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
    console.log(`✗ ${name}`);
    console.log(`  ${error}`);
  }
}

function testEach(name: string, cases: { input: core.ICommandsResponse; expected: string }[]): void {
  const classifier = new RuntimeOutcomeClassifier();
  for (const { input, expected } of cases) {
    const outcome = classifier.classify(input);
    assert(
      outcome.type === expected,
      `Expected type "${expected}" but got "${outcome.type}"`
    );
  }
  passed++;
  console.log(`✓ ${name}`);
}

// Test helper to create CommandsResponse
function createResponse(overrides: Partial<core.ICommandsResponse> = {}): core.ICommandsResponse {
  return new core.CommandsResponse({
    chunkId: "test-chunk",
    final: true,
    ...overrides,
  });
}

function createCommand(type: core.CommandType, text?: string): core.ICommand {
  return {
    type,
    text,
  };
}

console.log("\n=== RuntimeOutcomeClassifier Tests ===\n");

// Presentation_only outcomes
test("classifies no-op commands as presentation_only", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    execute: {
      transcript: "test",
      commands: [createCommand(core.CommandType.COMMAND_TYPE_NONE, "test")],
    },
  });

  const outcome = classifier.classify(response, "presentation_only", "test-chunk", "session-1");

  assert(outcome.type === "presentation_only", `Expected presentation_only, got ${outcome.type}`);
  assert(outcome.reason === "no_op_or_invalid_commands", `Expected no_op_or_invalid_commands, got ${outcome.reason}`);
  assert(outcome.hasExecutable === false, "Expected hasExecutable to be false");
});

test("classifies invalid commands as presentation_only", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    execute: {
      transcript: "test",
      commands: [createCommand(core.CommandType.COMMAND_TYPE_INVALID, "test")],
    },
  });

  const outcome = classifier.classify(response, "presentation_only", "test-chunk", "session-1");

  assert(outcome.type === "presentation_only", `Expected presentation_only, got ${outcome.type}`);
  assert(outcome.reason === "no_op_or_invalid_commands", `Expected no_op_or_invalid_commands, got ${outcome.reason}`);
});

test("classifies no commands extracted as presentation_only", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({});

  const outcome = classifier.classify(response, "presentation_only", "test-chunk", "session-1");

  assert(outcome.type === "presentation_only", `Expected presentation_only, got ${outcome.type}`);
  assert(outcome.reason === "no_commands_extracted", `Expected no_commands_extracted, got ${outcome.reason}`);
});

// Chooser_required outcomes
test("classifies alternatives without execution as chooser_required", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    alternatives: [
      {
        transcript: "open file",
        commands: [createCommand(core.CommandType.COMMAND_TYPE_OPEN_FILE, "file")],
      },
      {
        transcript: "open in browser",
        commands: [createCommand(core.CommandType.COMMAND_TYPE_OPEN_IN_BROWSER, "url")],
      },
    ],
  });

  const outcome = classifier.classify(response, "navigation_plugin", "test-chunk", "session-1");

  assert(outcome.type === "chooser_required", `Expected chooser_required, got ${outcome.type}`);
  assert(outcome.reason === "ambiguous_alternatives", `Expected ambiguous_alternatives, got ${outcome.reason}`);
  assert(outcome.hasExecutable === false, "Expected hasExecutable to be false");
  assert(outcome.alternativesCount === 2, `Expected 2 alternatives, got ${outcome.alternativesCount}`);
});

test("classifies all-invalid alternatives as presentation_only", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    alternatives: [
      {
        transcript: "open file",
        // Note: INVALID without text - this is an unparseable command
        // When alternatives exist but are all invalid, and there's no execute,
        // this is technically a chooser situation (user needs to rephrase)
        // because the system received alternatives but couldn't execute any
        commands: [createCommand(core.CommandType.COMMAND_TYPE_INVALID, undefined)],
      },
    ],
  });

  const outcome = classifier.classify(response, "unknown_legacy", "test-chunk", "session-1");

  // With the new precedence, this is now chooser_required because there are
  // alternatives (even if invalid) and no executable commands
  assert(outcome.type === "chooser_required", `Expected chooser_required, got ${outcome.type}`);
  assert(outcome.reason === "ambiguous_alternatives", `Expected ambiguous_alternatives, got ${outcome.reason}`);
});

// Command_execution outcomes
test("classifies valid execution as command_execution", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    execute: {
      transcript: "open file test.ts",
      commands: [createCommand(core.CommandType.COMMAND_TYPE_OPEN_FILE, "test.ts")],
    },
  });

  const outcome = classifier.classify(response, "execution_local", "test-chunk", "session-1");

  assert(outcome.type === "command_execution", `Expected command_execution, got ${outcome.type}`);
  assert(outcome.hasExecutable === true, "Expected hasExecutable to be true");
});

test("classifies reflex commands as command_execution", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    execute: {
      transcript: "undo",
      commands: [createCommand(core.CommandType.COMMAND_TYPE_UNDO, "undo")],
    },
  });

  const outcome = classifier.classify(response, "reflex_local", "test-chunk", "session-1");

  assert(outcome.type === "command_execution", `Expected command_execution, got ${outcome.type}`);
  assert(outcome.hasExecutable === true, "Expected hasExecutable to be true");
});

test("classifies focus commands as command_execution", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    execute: {
      transcript: "focus terminal",
      commands: [createCommand(core.CommandType.COMMAND_TYPE_FOCUS, "terminal")],
    },
  });

  const outcome = classifier.classify(response, "focus_local", "test-chunk", "session-1");

  assert(outcome.type === "command_execution", `Expected command_execution, got ${outcome.type}`);
  assert(outcome.hasExecutable === true, "Expected hasExecutable to be true");
});

// Metadata preservation
test("preserves chunkId and sessionId", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    chunkId: "test-chunk-id",
    execute: {
      transcript: "test",
      commands: [createCommand(core.CommandType.COMMAND_TYPE_UNDO, "test")],
    },
  });

  const outcome = classifier.classify(response, "reflex_local", "test-chunk-id", "test-session-id");

  assert(outcome.chunkId === "test-chunk-id", `Expected test-chunk-id, got ${outcome.chunkId}`);
  assert(outcome.sessionId === "test-session-id", `Expected test-session-id, got ${outcome.sessionId}`);
});

test("preserves dispatchRoute", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    execute: {
      transcript: "focus terminal",
      commands: [createCommand(core.CommandType.COMMAND_TYPE_FOCUS, "terminal")],
    },
  });

  const outcome = classifier.classify(response, "focus_local", "test-chunk", "session-1");

  assert(outcome.dispatchRoute === "focus_local", `Expected focus_local, got ${outcome.dispatchRoute}`);
});

test("sets timestamp", () => {
  const before = Date.now();
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    execute: {
      transcript: "test",
      commands: [createCommand(core.CommandType.COMMAND_TYPE_UNDO, "test")],
    },
  });
  const outcome = classifier.classify(response, "reflex_local", "test-chunk", "session-1");
  const after = Date.now();

  assert(outcome.timestamp >= before, `Timestamp should be >= ${before}`);
  assert(outcome.timestamp <= after, `Timestamp should be <= ${after}`);
});

// Edge cases
test("handles empty alternatives array", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    alternatives: [],
  });

  const outcome = classifier.classify(response, "presentation_only", "test-chunk", "session-1");

  assert(outcome.type === "presentation_only", `Expected presentation_only, got ${outcome.type}`);
  assert(outcome.alternativesCount === 0, `Expected 0, got ${outcome.alternativesCount}`);
});

test("handles mixed valid and invalid in execute", () => {
  const classifier = new RuntimeOutcomeClassifier();
  const response = createResponse({
    execute: {
      transcript: "test",
      commands: [
        createCommand(core.CommandType.COMMAND_TYPE_UNDO, "undo"),
        createCommand(core.CommandType.COMMAND_TYPE_INVALID, "invalid"),
      ],
    },
  });

  const outcome = classifier.classify(response, "reflex_local", "test-chunk", "session-1");

  assert(outcome.type === "command_execution", `Expected command_execution, got ${outcome.type}`);
  assert(outcome.hasExecutable === true, "Expected hasExecutable to be true");
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
