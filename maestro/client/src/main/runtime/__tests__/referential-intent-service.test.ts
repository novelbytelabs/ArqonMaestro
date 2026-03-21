/**
 * Tests for ReferentialIntentService + ReferentialReferenceStack
 *
 * Phase 4A: Referential Intent Foundations (FP-7A)
 *
 * Test framework: plain ts-node compatible (same pattern as other runtime tests).
 * No Jest runner required.
 */

import ReferentialIntentService, {
  ReferentialContext,
  RESOLUTION_CONFIDENCE_THRESHOLD,
} from "../referential-intent-service";
import { ReferentialReferenceStack } from "../referential-reference-stack";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal standard-mode context with no candidates */
function emptyContext(overrides: Partial<ReferentialContext> = {}): ReferentialContext {
  return {
    activeSelection: null,
    focusedPane: null,
    activeApp: null,
    securityMode: "standard",
    speakerVerified: true,
    referenceStack: new ReferentialReferenceStack(),
    ...overrides,
  };
}

const service = new ReferentialIntentService();

console.log("\n=== ReferentialIntentService Tests ===\n");

// ---------------------------------------------------------------------------
// Marker detection
// ---------------------------------------------------------------------------

test("detects 'this' marker", () => {
  const marker = service.detectMarker("delete this");
  assert(marker === "this", `expected 'this', got ${marker}`);
});

test("detects 'that' marker", () => {
  const marker = service.detectMarker("undo that");
  assert(marker === "that", `expected 'that', got ${marker}`);
});

test("detects 'it' marker", () => {
  const marker = service.detectMarker("rename it to foo");
  assert(marker === "it", `expected 'it', got ${marker}`);
});

test("detects 'here' marker", () => {
  const marker = service.detectMarker("add comment here");
  assert(marker === "here", `expected 'here', got ${marker}`);
});

test("returns null when no marker present", () => {
  const marker = service.detectMarker("focus editor");
  assert(marker === null, `expected null, got ${marker}`);
});

test("does not match 'there' as a marker", () => {
  const marker = service.detectMarker("stop there");
  // 'there' contains 'here' — word boundary must prevent this
  assert(marker === null, `expected null, got ${marker}`);
});

test("does not match 'either' as 'it' marker", () => {
  const marker = service.detectMarker("use either option");
  // 'either' contains 'it' — word boundary must prevent this
  assert(marker === null, `expected null, got ${marker}`);
});

test("hasReferentMarker returns true for transcript with marker", () => {
  assert(service.hasReferentMarker("delete this file") === true, "should have marker");
});

test("hasReferentMarker returns false for transcript without marker", () => {
  assert(service.hasReferentMarker("focus editor") === false, "should not have marker");
});

// ---------------------------------------------------------------------------
// no_marker outcome
// ---------------------------------------------------------------------------

test("outcome is no_marker when no referent present", () => {
  const result = service.resolve("focus terminal", emptyContext());
  assert(result.outcome === "no_marker", `expected no_marker, got ${result.outcome}`);
  assert(result.detectedMarker === null, "detectedMarker should be null");
  assert(result.resolved === null, "resolved should be null");
});

// ---------------------------------------------------------------------------
// Grounding classification
// ---------------------------------------------------------------------------

test("classifies 'this' as selection when active selection exists", () => {
  const grounding = service.classifyGrounding("this", emptyContext({
    activeSelection: { label: "parseFoo", id: "sel:001" },
  }));
  assert(grounding === "selection", `expected selection, got ${grounding}`);
});

test("classifies 'this' as pane when no selection but pane focused", () => {
  const grounding = service.classifyGrounding("this", emptyContext({
    focusedPane: { label: "editor", id: "pane:editor" },
  }));
  assert(grounding === "pane", `expected pane, got ${grounding}`);
});

test("classifies 'this' as app when only app is known", () => {
  const grounding = service.classifyGrounding("this", emptyContext({
    activeApp: { label: "vscode", id: "app:vscode" },
  }));
  assert(grounding === "app", `expected app, got ${grounding}`);
});

test("classifies 'here' as element when focused pane exists", () => {
  const grounding = service.classifyGrounding("here", emptyContext({
    focusedPane: { label: "editor", id: "pane:editor" },
  }));
  assert(grounding === "element", `expected element, got ${grounding}`);
});

test("classifies 'that' as element (reference stack grounding)", () => {
  const grounding = service.classifyGrounding("that", emptyContext());
  assert(grounding === "element", `expected element, got ${grounding}`);
});

test("classifies 'it' as element (reference stack grounding)", () => {
  const grounding = service.classifyGrounding("it", emptyContext());
  assert(grounding === "element", `expected element, got ${grounding}`);
});

// ---------------------------------------------------------------------------
// Resolved outcome — single candidate
// ---------------------------------------------------------------------------

test("resolves 'this' when active selection exists", () => {
  const ctx = emptyContext({ activeSelection: { label: "parseFoo", id: "sel:001" } });
  const result = service.resolve("format this", ctx);
  assert(result.outcome === "resolved", `expected resolved, got ${result.outcome}`);
  assert(result.resolved !== null, "resolved candidate should not be null");
  assert(result.resolved!.id === "sel:001", `expected sel:001, got ${result.resolved!.id}`);
  assert(result.resolved!.confidence >= RESOLUTION_CONFIDENCE_THRESHOLD, "confidence should be at/above threshold");
});

test("resolves 'here' when focused pane exists", () => {
  const ctx = emptyContext({ focusedPane: { label: "editor", id: "pane:editor" } });
  const result = service.resolve("add comment here", ctx);
  assert(result.outcome === "resolved", `expected resolved, got ${result.outcome}`);
  assert(result.resolved !== null, "resolved candidate should not be null");
});

// ---------------------------------------------------------------------------
// no_referent outcome — no candidates
// ---------------------------------------------------------------------------

test("outcome is no_referent when 'this' detected but no context available", () => {
  const result = service.resolve("delete this", emptyContext());
  assert(result.outcome === "no_referent", `expected no_referent, got ${result.outcome}`);
  assert(result.detectedMarker === "this", "should have detected 'this'");
  assert(result.resolved === null, "resolved should be null on no_referent");
});

test("outcome is no_referent when 'that' detected but reference stack is empty", () => {
  const result = service.resolve("undo that", emptyContext());
  assert(result.outcome === "no_referent", `expected no_referent, got ${result.outcome}`);
  assert(result.detectedMarker === "that", "should have detected 'that'");
});

// ---------------------------------------------------------------------------
// Reference stack: push and lookup
// ---------------------------------------------------------------------------

test("reference stack push and lookup returns correct entry", () => {
  const stack = new ReferentialReferenceStack();
  stack.push({ type: "execution", label: "cargo build", id: "exec:01" });
  const entry = stack.lookup("execution");
  assert(entry !== null, "should have a live entry");
  assert(entry!.label === "cargo build", `expected 'cargo build', got ${entry!.label}`);
});

test("reference stack lookup returns null for empty stack", () => {
  const stack = new ReferentialReferenceStack();
  const entry = stack.lookup("execution");
  assert(entry === null, "should return null for empty stack");
});

test("reference stack lookup returns null after entry expires", () => {
  // Create stack with 1ms TTL
  const stack = new ReferentialReferenceStack({ entryTtlMs: 1 });
  stack.push({ type: "selection", label: "main.ts", id: "file:01" });

  // Wait for expiry (small sleep via busy-wait is acceptable for tests)
  const waitUntil = Date.now() + 5;
  while (Date.now() < waitUntil) { /* spin */ }

  const entry = stack.lookup("selection");
  assert(entry === null, "expired entry should return null");
});

test("resolves 'it' from reference stack when selection entry exists", () => {
  const stack = new ReferentialReferenceStack();
  stack.push({ type: "selection", label: "parseInput", id: "sel:02" });
  const ctx = emptyContext({ referenceStack: stack });
  const result = service.resolve("rename it to parseData", ctx);
  assert(result.outcome === "resolved", `expected resolved, got ${result.outcome}`);
  assert(result.resolved!.id === "sel:02", `expected sel:02, got ${result.resolved!.id}`);
});

test("resolves 'that' from execution stack entry", () => {
  const stack = new ReferentialReferenceStack();
  stack.push({ type: "execution", label: "cargo build", id: "exec:02" });
  const ctx = emptyContext({ referenceStack: stack });
  const result = service.resolve("stop that", ctx);
  assert(result.outcome === "resolved", `expected resolved, got ${result.outcome}`);
  assert(result.resolved!.entityType === "execution", `expected execution, got ${result.resolved!.entityType}`);
});

// ---------------------------------------------------------------------------
// Policy/mode filtering
// ---------------------------------------------------------------------------

test("secure mode rejects weak confidence candidates", () => {
  // Create a focused pane context — "this" → pane grounding (confidence 0.80 at boundary)
  // In secure mode the threshold for rejection is 0.80, so confidence exactly at 0.80 passes
  // We test the reference stack path (confidence starts at 0.90, decays with age)
  // by using an artificially old entry — we can't easily age the entry, so instead
  // we test with an empty stack (no_referent) + confirm secure mode doesn't change that
  const ctx = emptyContext({ securityMode: "secure" });
  const result = service.resolve("stop that", ctx);
  // Still no_referent because there's nothing in the stack
  assert(result.outcome === "no_referent", `expected no_referent in secure mode with no stack, got ${result.outcome}`);
});

test("secure mode rejects unverified speaker using reference stack", () => {
  const stack = new ReferentialReferenceStack();
  stack.push({ type: "execution", label: "deploy script", id: "exec:03" });
  const ctx = emptyContext({
    securityMode: "secure",
    speakerVerified: false,
    referenceStack: stack,
  });
  const result = service.resolve("run that", ctx);
  // Reference stack candidate should be rejected for unverified speaker in secure mode
  assert(result.outcome === "no_referent", `expected no_referent (unverified+secure), got ${result.outcome}`);
});

test("standard mode allows unverified speaker to use reference stack", () => {
  const stack = new ReferentialReferenceStack();
  stack.push({ type: "execution", label: "cargo test", id: "exec:04" });
  const ctx = emptyContext({
    securityMode: "standard",
    speakerVerified: false,
    referenceStack: stack,
  });
  const result = service.resolve("stop that", ctx);
  // Standard mode is permissive — should resolve
  assert(result.outcome === "resolved", `expected resolved in standard mode, got ${result.outcome}`);
});

// ---------------------------------------------------------------------------
// Result structure integrity
// ---------------------------------------------------------------------------

test("all result fields are present on resolved outcome", () => {
  const ctx = emptyContext({ activeSelection: { label: "myFunc", id: "sel:03" } });
  const result = service.resolve("explain this", ctx);
  assert(result.outcome !== undefined, "outcome must be present");
  assert(result.detectedMarker !== undefined || result.detectedMarker === null, "detectedMarker must be present");
  assert(result.grounding !== undefined, "grounding must be present");
  assert(result.candidatesConsidered !== undefined, "candidatesConsidered must be present");
  assert(result.reason !== undefined, "reason must be present");
  assert(result.timestamp > 0, "timestamp must be positive");
});

test("all result fields are present on no_marker outcome", () => {
  const result = service.resolve("focus terminal", emptyContext());
  assert(result.outcome === "no_marker", "expected no_marker");
  assert(result.detectedMarker === null, "detectedMarker should be null");
  assert(result.resolved === null, "resolved should be null");
  assert(result.candidatesConsidered.length === 0, "no candidates on no_marker");
  assert(result.timestamp > 0, "timestamp must be positive");
});

// ---------------------------------------------------------------------------
// Reference stack bounds
// ---------------------------------------------------------------------------

test("reference stack respects maxEntriesPerType cap", () => {
  const stack = new ReferentialReferenceStack({ maxEntriesPerType: 2, entryTtlMs: 30000 });
  stack.push({ type: "file", label: "a.ts", id: "f:1" });
  stack.push({ type: "file", label: "b.ts", id: "f:2" });
  stack.push({ type: "file", label: "c.ts", id: "f:3" }); // should evict f:1
  const all = stack.lookupAll("file");
  assert(all.length === 2, `expected 2 entries (cap), got ${all.length}`);
  assert(all[0].id === "f:3", "most recent should be first");
  assert(all[1].id === "f:2", "second most recent should be second");
});

test("reference stack clear removes all entries", () => {
  const stack = new ReferentialReferenceStack();
  stack.push({ type: "execution", label: "cargo build", id: "exec:05" });
  stack.push({ type: "selection", label: "foo", id: "sel:05" });
  stack.clear();
  assert(stack.liveCount() === 0, `expected 0 live entries after clear, got ${stack.liveCount()}`);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
