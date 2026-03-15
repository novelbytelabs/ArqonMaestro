import TalonAdapter from "./talon-adapter";

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
  // ─── getAdapterRecord() contract tests ───────────────────────────────────

  test("getAdapterRecord returns correct adapterId", () => {
    const adapter = new TalonAdapter();
    const record = adapter.getAdapterRecord();
    assert(record.adapterId === "talon_adapter", `expected talon_adapter, got ${record.adapterId}`);
  });

  test("getAdapterRecord declares fallback_ui kind", () => {
    const adapter = new TalonAdapter();
    const record = adapter.getAdapterRecord();
    assert(record.adapterKind === "fallback_ui", `expected fallback_ui, got ${record.adapterKind}`);
  });

  test("getAdapterRecord declares talon_fallback route class", () => {
    const adapter = new TalonAdapter();
    const record = adapter.getAdapterRecord();
    assert(record.routeClass === "talon_fallback", `expected talon_fallback, got ${record.routeClass}`);
  });

  test("getAdapterRecord declares default trust tier 4", () => {
    const adapter = new TalonAdapter();
    const record = adapter.getAdapterRecord();
    assert(record.defaultTrustTier === 4, `expected 4, got ${record.defaultTrustTier}`);
  });

  test("getAdapterRecord declares blockedInSecureMode true", () => {
    const adapter = new TalonAdapter();
    const record = adapter.getAdapterRecord();
    assert(record.blockedInSecureMode === true, "expected blockedInSecureMode to be true");
  });

  test("getAdapterRecord declares blockedInSharedRoomWithoutVerification true", () => {
    const adapter = new TalonAdapter();
    const record = adapter.getAdapterRecord();
    assert(
      record.blockedInSharedRoomWithoutVerification === true,
      "expected blockedInSharedRoomWithoutVerification to be true"
    );
  });

  test("getAdapterRecord has exactly 4 executors", () => {
    const adapter = new TalonAdapter();
    const record = adapter.getAdapterRecord();
    assert(record.executors.length === 4, `expected 4 executors, got ${record.executors.length}`);
  });

  test("getAdapterRecord executor ids are unique", () => {
    const adapter = new TalonAdapter();
    const record = adapter.getAdapterRecord();
    const ids = record.executors.map((e) => e.executorId);
    const unique = new Set(ids);
    assert(unique.size === 4, `expected 4 unique executor IDs, got ${unique.size}`);
  });

  // ─── Executor record tests ────────────────────────────────────────────────

  test("focus executor declares focus_transfer: true", () => {
    const adapter = new TalonAdapter();
    const executor = adapter.getExecutor("focus");
    assert(executor !== undefined, "focus executor must exist");
    assert(
      executor!.executionModes.focusTransfer === true,
      "focus executor must declare focusTransfer: true"
    );
  });

  test("click executor declares focus_transfer: false", () => {
    const adapter = new TalonAdapter();
    const executor = adapter.getExecutor("click");
    assert(executor !== undefined, "click executor must exist");
    assert(
      executor!.executionModes.focusTransfer === false,
      "click executor must not declare focusTransfer"
    );
  });

  test("scroll executor declares low security sensitivity", () => {
    const adapter = new TalonAdapter();
    const executor = adapter.getExecutor("scroll");
    assert(executor !== undefined, "scroll executor must exist");
    assert(
      executor!.securitySensitivity === "low",
      `expected low sensitivity for scroll, got ${executor!.securitySensitivity}`
    );
  });

  test("press executor declares medium security sensitivity", () => {
    const adapter = new TalonAdapter();
    const executor = adapter.getExecutor("press");
    assert(executor !== undefined, "press executor must exist");
    assert(
      executor!.securitySensitivity === "medium",
      `expected medium sensitivity for press, got ${executor!.securitySensitivity}`
    );
  });

  test("focus executor does not support background execution", () => {
    const adapter = new TalonAdapter();
    const executor = adapter.getExecutor("focus");
    assert(executor !== undefined, "focus executor must exist");
    assert(
      executor!.executionModes.backgroundExecution === false,
      "Talon focus must not support background execution"
    );
  });

  // ─── getTrustTier() tests ─────────────────────────────────────────────────

  test("focus verb without a11y backing returns tier 4", () => {
    const adapter = new TalonAdapter();
    const tier = adapter.getTrustTier("focus", false);
    assert(tier === 4, `expected tier 4 without a11y backing, got ${tier}`);
  });

  test("focus verb with a11y backing returns tier 3", () => {
    const adapter = new TalonAdapter();
    const tier = adapter.getTrustTier("focus", true);
    assert(tier === 3, `expected tier 3 with a11y backing, got ${tier}`);
  });

  test("click verb always returns tier 4", () => {
    const adapter = new TalonAdapter();
    const tier = adapter.getTrustTier("click");
    assert(tier === 4, `expected tier 4 for click, got ${tier}`);
  });

  // ─── canHandle() policy gate tests ───────────────────────────────────────

  test("canHandle focus/window/standard returns true", () => {
    const adapter = new TalonAdapter();
    assert(adapter.canHandle("focus", "window", "standard"), "expected canHandle to return true");
  });

  test("canHandle click/visible_ui/standard returns true", () => {
    const adapter = new TalonAdapter();
    assert(adapter.canHandle("click", "visible_ui", "standard"), "expected canHandle to return true");
  });

  test("canHandle scroll/panel/standard returns true", () => {
    const adapter = new TalonAdapter();
    assert(adapter.canHandle("scroll", "panel", "standard"), "expected canHandle to return true");
  });

  test("canHandle press/window/standard returns true", () => {
    const adapter = new TalonAdapter();
    assert(adapter.canHandle("press", "window", "standard"), "expected canHandle to return true");
  });

  test("canHandle focus/window/secure returns false (secure mode block)", () => {
    const adapter = new TalonAdapter();
    assert(!adapter.canHandle("focus", "window", "secure"), "expected canHandle to return false in secure mode");
  });

  test("canHandle click/visible_ui/secure returns false (secure mode block)", () => {
    const adapter = new TalonAdapter();
    assert(!adapter.canHandle("click", "visible_ui", "secure"), "expected canHandle to return false in secure mode");
  });

  test("canHandle shared_room mode returns true (verification handled by policy engine)", () => {
    const adapter = new TalonAdapter();
    // Shared room mode is not blocked at the adapter level; the policy engine
    // enforces speaker verification. canHandle() only gates on secure mode.
    assert(adapter.canHandle("focus", "window", "shared_room"), "expected canHandle to return true in shared_room");
  });

  test("canHandle blocked verb (delete) returns false", () => {
    const adapter = new TalonAdapter();
    assert(!adapter.canHandle("delete", "visible_ui", "standard"), "delete must be blocked");
  });

  test("canHandle blocked verb (execute_shell) returns false", () => {
    const adapter = new TalonAdapter();
    assert(!adapter.canHandle("execute_shell", "window", "standard"), "execute_shell must be blocked");
  });

  test("canHandle unknown verb returns false", () => {
    const adapter = new TalonAdapter();
    assert(!adapter.canHandle("dictate", "window", "standard"), "unknown verb must not be handled");
  });

  test("canHandle unknown surface returns false", () => {
    const adapter = new TalonAdapter();
    assert(!adapter.canHandle("focus", "all_surfaces", "standard"), "all_surfaces must not be handled");
  });

  test("canHandle focus with empty surface returns false", () => {
    const adapter = new TalonAdapter();
    assert(!adapter.canHandle("focus", "", "standard"), "empty surface must not be handled");
  });

  // ─── blocked verb list contract tests ────────────────────────────────────

  test("adapter record blocked verbs include delete", () => {
    const adapter = new TalonAdapter();
    const record = adapter.getAdapterRecord();
    assert(record.blockedVerbs.includes("delete"), "blockedVerbs must include delete");
  });

  test("adapter record blocked verbs include sudo", () => {
    const adapter = new TalonAdapter();
    const record = adapter.getAdapterRecord();
    assert(record.blockedVerbs.includes("sudo"), "blockedVerbs must include sudo");
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
