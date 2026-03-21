/**
 * Tests for ModalAwarenessService
 *
 * Phase 4B: Modal Awareness Foundations (FP-8A)
 *
 * Test framework: plain ts-node compatible (same pattern as other runtime tests).
 * No Jest runner required.
 */

import {
  ModalAwarenessService,
  ModalSignal,
  ModalContext,
} from "../modal-awareness-service";

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

/** Create a signal with everything false (no modal) */
function noSignal(overrides: Partial<ModalSignal> = {}): ModalSignal {
  return {
    modalContainerDetected: false,
    containerHint: null,
    focusTrapDetected: false,
    backdropDetected: false,
    notificationDetected: false,
    quickOpenDetected: false,
    ...overrides,
  };
}

const service = new ModalAwarenessService();

console.log("\n=== ModalAwarenessService Tests ===\n");

// ---------------------------------------------------------------------------
// classifyContext — no modal
// ---------------------------------------------------------------------------

test("no signal produces none overlay state", () => {
  const ctx = service.classifyContext(noSignal());
  assert(ctx.overlayState === "none", `expected none, got ${ctx.overlayState}`);
  assert(ctx.modalType === null, "modalType should be null");
  assert(ctx.classification === null, "classification should be null");
  assert(ctx.blocksNonReflex === false, "should not block");
  assert(ctx.focusTrapped === false, "focus should not be trapped");
});

// ---------------------------------------------------------------------------
// classifyContext — blocking dialog (focus trap + backdrop)
// ---------------------------------------------------------------------------

test("focus trap AND backdrop → blocking dialog", () => {
  const ctx = service.classifyContext(noSignal({
    focusTrapDetected: true,
    backdropDetected: true,
  }));
  assert(ctx.overlayState === "active", `expected active, got ${ctx.overlayState}`);
  assert(ctx.modalType === "dialog", `expected dialog, got ${ctx.modalType}`);
  assert(ctx.classification === "blocking", `expected blocking, got ${ctx.classification}`);
  assert(ctx.blocksNonReflex === true, "blocking dialog must block non-reflex");
  assert(ctx.focusTrapped === true, "focus must be trapped");
});

// ---------------------------------------------------------------------------
// classifyContext — blocking dialog (focus trap, no backdrop)
// ---------------------------------------------------------------------------

test("focus trap only (no backdrop) → blocking dialog", () => {
  const ctx = service.classifyContext(noSignal({ focusTrapDetected: true }));
  assert(ctx.overlayState === "active", `expected active, got ${ctx.overlayState}`);
  assert(ctx.modalType === "dialog", `expected dialog, got ${ctx.modalType}`);
  assert(ctx.classification === "blocking", `expected blocking, got ${ctx.classification}`);
  assert(ctx.blocksNonReflex === true, "should block non-reflex");
  assert(ctx.focusTrapped === true, "focus should be trapped");
});

// ---------------------------------------------------------------------------
// classifyContext — quick_open with focus trap
// ---------------------------------------------------------------------------

test("focus trap + quickOpen → blocking quick_open", () => {
  const ctx = service.classifyContext(noSignal({
    focusTrapDetected: true,
    quickOpenDetected: true,
  }));
  assert(ctx.overlayState === "active", `expected active, got ${ctx.overlayState}`);
  assert(ctx.modalType === "quick_open", `expected quick_open, got ${ctx.modalType}`);
  assert(ctx.classification === "blocking", `expected blocking, got ${ctx.classification}`);
  assert(ctx.blocksNonReflex === true, "quick_open with trap should block");
});

// ---------------------------------------------------------------------------
// classifyContext — navigation overlay (backdrop, no trap)
// ---------------------------------------------------------------------------

test("backdrop only (no focus trap) → navigation overlay", () => {
  const ctx = service.classifyContext(noSignal({ backdropDetected: true }));
  assert(ctx.overlayState === "active", `expected active, got ${ctx.overlayState}`);
  assert(ctx.modalType === "overlay", `expected overlay, got ${ctx.modalType}`);
  assert(ctx.classification === "navigation", `expected navigation, got ${ctx.classification}`);
  assert(ctx.blocksNonReflex === false, "navigation overlay does not block");
  assert(ctx.focusTrapped === false, "focus not trapped");
});

// ---------------------------------------------------------------------------
// classifyContext — quick_open without trap/backdrop
// ---------------------------------------------------------------------------

test("quickOpen only (no trap, no backdrop) → navigation quick_open", () => {
  const ctx = service.classifyContext(noSignal({ quickOpenDetected: true }));
  assert(ctx.overlayState === "active", `expected active, got ${ctx.overlayState}`);
  assert(ctx.modalType === "quick_open", `expected quick_open, got ${ctx.modalType}`);
  assert(ctx.classification === "navigation", `expected navigation, got ${ctx.classification}`);
  assert(ctx.blocksNonReflex === false, "quick_open without trap does not block");
});

// ---------------------------------------------------------------------------
// classifyContext — notification
// ---------------------------------------------------------------------------

test("notification detected → informational notification", () => {
  const ctx = service.classifyContext(noSignal({ notificationDetected: true }));
  assert(ctx.overlayState === "active", `expected active, got ${ctx.overlayState}`);
  assert(ctx.modalType === "notification", `expected notification, got ${ctx.modalType}`);
  assert(ctx.classification === "informational", `expected informational, got ${ctx.classification}`);
  assert(ctx.blocksNonReflex === false, "notification does not block");
  assert(ctx.focusTrapped === false, "notification does not trap focus");
});

// ---------------------------------------------------------------------------
// classifyContext — transient popup (container + hint, no trap/backdrop)
// ---------------------------------------------------------------------------

test("container detected with hint → transient popup", () => {
  const ctx = service.classifyContext(noSignal({
    modalContainerDetected: true,
    containerHint: "popup",
  }));
  assert(ctx.overlayState === "active", `expected active, got ${ctx.overlayState}`);
  assert(ctx.modalType === "popup", `expected popup, got ${ctx.modalType}`);
  assert(ctx.classification === "transient", `expected transient, got ${ctx.classification}`);
  assert(ctx.blocksNonReflex === false, "transient popup does not block");
});

// ---------------------------------------------------------------------------
// classifyContext — unknown (container detected, no hint)
// ---------------------------------------------------------------------------

test("container detected without hint → unknown", () => {
  const ctx = service.classifyContext(noSignal({ modalContainerDetected: true }));
  assert(ctx.overlayState === "unknown", `expected unknown, got ${ctx.overlayState}`);
  assert(ctx.modalType === null, "modalType should be null on unknown");
  assert(ctx.classification === null, "classification should be null on unknown");
  assert(ctx.blocksNonReflex === false, "unknown does not declare blocking (routing handles it)");
});

// ---------------------------------------------------------------------------
// Result structure integrity
// ---------------------------------------------------------------------------

test("all context fields present on none result", () => {
  const ctx = service.classifyContext(noSignal());
  assert(ctx.overlayState !== undefined, "overlayState must be present");
  assert(ctx.blocksNonReflex !== undefined, "blocksNonReflex must be present");
  assert(ctx.focusTrapped !== undefined, "focusTrapped must be present");
  assert(ctx.reason.length > 0, "reason must be non-empty");
  assert(ctx.timestamp > 0, "timestamp must be positive");
});

test("all context fields present on blocking result", () => {
  const ctx = service.classifyContext(noSignal({ focusTrapDetected: true, backdropDetected: true }));
  assert(ctx.overlayState === "active", "overlayState must be active");
  assert(ctx.modalType !== null, "modalType must not be null on active");
  assert(ctx.classification !== null, "classification must not be null on active");
  assert(ctx.reason.length > 0, "reason must be non-empty");
  assert(ctx.timestamp > 0, "timestamp must be positive");
});

// ---------------------------------------------------------------------------
// evaluateRoutingImpact — no modal
// ---------------------------------------------------------------------------

test("none overlay → pass for non-reflex command", () => {
  const ctx = service.noModalContext();
  const decision = service.evaluateRoutingImpact(ctx, false);
  assert(decision.impact === "pass", `expected pass, got ${decision.impact}`);
});

test("none overlay → pass for reflex command", () => {
  const ctx = service.noModalContext();
  const decision = service.evaluateRoutingImpact(ctx, true);
  assert(decision.impact === "pass", `expected pass, got ${decision.impact}`);
});

// ---------------------------------------------------------------------------
// evaluateRoutingImpact — unknown overlay
// ---------------------------------------------------------------------------

test("unknown overlay → reflex_only for non-reflex command", () => {
  const ctx = service.classifyContext(noSignal({ modalContainerDetected: true }));
  assert(ctx.overlayState === "unknown", "pre-condition: unknown state");
  const decision = service.evaluateRoutingImpact(ctx, false);
  assert(decision.impact === "reflex_only", `expected reflex_only, got ${decision.impact}`);
});

test("unknown overlay → pass for reflex command", () => {
  const ctx = service.classifyContext(noSignal({ modalContainerDetected: true }));
  const decision = service.evaluateRoutingImpact(ctx, true);
  assert(decision.impact === "pass", `reflex passes even in unknown modal state, got ${decision.impact}`);
});

// ---------------------------------------------------------------------------
// evaluateRoutingImpact — blocking modal
// ---------------------------------------------------------------------------

test("blocking modal → block for non-reflex command", () => {
  const ctx = service.classifyContext(noSignal({ focusTrapDetected: true, backdropDetected: true }));
  const decision = service.evaluateRoutingImpact(ctx, false);
  assert(decision.impact === "block", `expected block, got ${decision.impact}`);
});

test("blocking modal → pass for reflex command (stop/cancel/undo)", () => {
  const ctx = service.classifyContext(noSignal({ focusTrapDetected: true, backdropDetected: true }));
  const decision = service.evaluateRoutingImpact(ctx, true);
  assert(decision.impact === "pass", `reflex must pass even in blocking modal, got ${decision.impact}`);
});

// ---------------------------------------------------------------------------
// evaluateRoutingImpact — navigation modal
// ---------------------------------------------------------------------------

test("navigation modal → reroute for non-reflex command", () => {
  const ctx = service.classifyContext(noSignal({ backdropDetected: true }));
  const decision = service.evaluateRoutingImpact(ctx, false);
  assert(decision.impact === "reroute", `expected reroute, got ${decision.impact}`);
});

test("navigation modal → pass for reflex command", () => {
  const ctx = service.classifyContext(noSignal({ backdropDetected: true }));
  const decision = service.evaluateRoutingImpact(ctx, true);
  assert(decision.impact === "pass", `reflex passes in navigation modal, got ${decision.impact}`);
});

// ---------------------------------------------------------------------------
// evaluateRoutingImpact — informational modal
// ---------------------------------------------------------------------------

test("informational modal → pass for non-reflex command", () => {
  const ctx = service.classifyContext(noSignal({ notificationDetected: true }));
  const decision = service.evaluateRoutingImpact(ctx, false);
  assert(decision.impact === "pass", `notification should not block, got ${decision.impact}`);
});

// ---------------------------------------------------------------------------
// evaluateRoutingImpact — transient modal
// ---------------------------------------------------------------------------

test("transient popup → pass for non-reflex command", () => {
  const ctx = service.classifyContext(noSignal({
    modalContainerDetected: true,
    containerHint: "popup",
  }));
  const decision = service.evaluateRoutingImpact(ctx, false);
  assert(decision.impact === "pass", `transient popup should not block, got ${decision.impact}`);
});

// ---------------------------------------------------------------------------
// isBlocking shorthand
// ---------------------------------------------------------------------------

test("isBlocking returns false when no modal present", () => {
  const ctx = service.noModalContext();
  assert(service.isBlocking(ctx, false) === false, "no modal → not blocking");
});

test("isBlocking returns true for blocking modal and non-reflex", () => {
  const ctx = service.classifyContext(noSignal({ focusTrapDetected: true, backdropDetected: true }));
  assert(service.isBlocking(ctx, false) === true, "blocking modal → isBlocking true");
});

test("isBlocking returns false for blocking modal and reflex command", () => {
  const ctx = service.classifyContext(noSignal({ focusTrapDetected: true, backdropDetected: true }));
  assert(service.isBlocking(ctx, true) === false, "reflex → not blocked even in blocking modal");
});

test("isBlocking returns true for unknown modal and non-reflex", () => {
  const ctx = service.classifyContext(noSignal({ modalContainerDetected: true }));
  assert(service.isBlocking(ctx, false) === true, "unknown modal → conservatively blocking");
});

test("isBlocking returns false for informational modal and non-reflex", () => {
  const ctx = service.classifyContext(noSignal({ notificationDetected: true }));
  assert(service.isBlocking(ctx, false) === false, "informational → not blocking");
});

// ---------------------------------------------------------------------------
// Decision reason field
// ---------------------------------------------------------------------------

test("decision always has a non-empty reason", () => {
  const contexts: ModalContext[] = [
    service.noModalContext(),
    service.classifyContext(noSignal({ focusTrapDetected: true })),
    service.classifyContext(noSignal({ backdropDetected: true })),
    service.classifyContext(noSignal({ notificationDetected: true })),
    service.classifyContext(noSignal({ modalContainerDetected: true })),
  ];
  for (const ctx of contexts) {
    const d = service.evaluateRoutingImpact(ctx, false);
    assert(d.reason.length > 0, `missing reason for overlayState=${ctx.overlayState}`);
    assert(d.modalContext !== undefined, "modalContext must be present on decision");
  }
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
