/**
 * Tests for SurfaceModelService
 *
 * Phase 4C: Surface Expansion Foundations (FP-9A)
 *
 * Test framework: plain ts-node compatible (same pattern as other runtime tests).
 * No Jest runner required.
 */

import {
  SurfaceModelService,
  SurfaceRecord,
  SurfaceContext,
  SurfaceType,
} from "../surface-model-service";

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

const service = new SurfaceModelService();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(type: SurfaceType, visibility: SurfaceRecord["visibility"] = "focused"): SurfaceRecord {
  const surfaceClass = (() => {
    if (["dialog", "command_palette", "quick_open", "menu", "popup"].includes(type)) return "overlay" as const;
    if (["integrated_terminal", "sidebar", "panel", "problems", "output", "tab_group"].includes(type)) return "subsurface" as const;
    if (["shell_executor", "build_runner", "mcp_executor"].includes(type)) return "virtual" as const;
    if (["background_task"].includes(type)) return "background" as const;
    if (["field", "search_field", "prompt", "selection"].includes(type)) return "interaction" as const;
    return "root" as const;
  })();
  return service.buildSurfaceRecord({
    surfaceType: type,
    surfaceClass,
    surfaceId: `${type}:01`,
    label: type.replace(/_/g, " "),
    visibility,
  });
}

function makeContext(
  active: SurfaceRecord | null,
  previous: SurfaceRecord | null = null,
  overlay: SurfaceRecord | null = null
): SurfaceContext {
  return service.buildContext({ activeSurface: active, previousSurface: previous, activeOverlay: overlay });
}

console.log("\n=== SurfaceModelService Tests ===\n");

// ---------------------------------------------------------------------------
// Alias normalization
// ---------------------------------------------------------------------------

test("'editor' normalizes to editor", () => {
  assert(service.normalizeAlias("editor") === "editor", "alias must resolve");
});

test("'vscode' normalizes to editor", () => {
  assert(service.normalizeAlias("vscode") === "editor", "vscode alias");
});

test("'VS Code' normalizes to editor (case-insensitive)", () => {
  assert(service.normalizeAlias("VS Code") === "editor", "case insensitive");
});

test("'chrome' normalizes to browser", () => {
  assert(service.normalizeAlias("chrome") === "browser", "chrome alias");
});

test("'terminal' normalizes to external_terminal", () => {
  assert(service.normalizeAlias("terminal") === "external_terminal", "terminal default");
});

test("'integrated terminal' normalizes to integrated_terminal", () => {
  assert(service.normalizeAlias("integrated terminal") === "integrated_terminal", "integrated terminal");
});

test("'logs' normalizes to output", () => {
  assert(service.normalizeAlias("logs") === "output", "logs alias");
});

test("'command palette' normalizes to command_palette", () => {
  assert(service.normalizeAlias("command palette") === "command_palette", "command palette");
});

test("unknown alias returns 'unknown'", () => {
  assert(service.normalizeAlias("zork_terminal_9000") === "unknown", "unknown alias");
});

test("isKnownAlias returns true for known alias", () => {
  assert(service.isKnownAlias("chrome") === true, "chrome is known");
});

test("isKnownAlias returns false for unknown alias", () => {
  assert(service.isKnownAlias("zork") === false, "zork is unknown");
});

// ---------------------------------------------------------------------------
// Surface record construction
// ---------------------------------------------------------------------------

test("buildSurfaceRecord produces correct identity for editor", () => {
  const rec = makeRecord("editor");
  assert(rec.identity.surfaceType === "editor", "type");
  assert(rec.identity.surfaceClass === "root", "class");
});

test("editor surface default capabilities: canFocus=true, canRunCommands=false", () => {
  const rec = makeRecord("editor");
  assert(rec.capabilities.canFocus === true, "editor canFocus");
  assert(rec.capabilities.canRunCommands === false, "editor cannot run commands");
});

test("integrated_terminal supports bound execution", () => {
  const rec = makeRecord("integrated_terminal");
  assert(rec.capabilities.canBindExecution === true, "integrated_terminal can bind");
  assert(rec.capabilities.canRunCommands === true, "integrated_terminal can run");
});

test("external_terminal requires focus, cannot bind", () => {
  const rec = makeRecord("external_terminal");
  assert(rec.capabilities.canBindExecution === false, "external terminal cannot bind");
  assert(rec.capabilities.canFocus === true, "external terminal can focus");
});

test("shell_executor cannot focus, can bind and background", () => {
  const rec = service.buildSurfaceRecord({
    surfaceType: "shell_executor",
    surfaceClass: "virtual",
    surfaceId: "shell:01",
    label: "shell executor",
  });
  assert(rec.capabilities.canFocus === false, "shell_executor cannot focus");
  assert(rec.capabilities.canBindExecution === true, "shell_executor can bind");
  assert(rec.capabilities.executionModes.includes("background_allowed"), "background allowed");
});

test("unknown surface type gets conservative fallback capabilities", () => {
  const caps = service.defaultCapabilities("unknown");
  assert(caps.canFocus === false, "unknown: no focus");
  assert(caps.canBindExecution === false, "unknown: no binding");
  assert(caps.executionModes[0] === "focus_required", "unknown: focus_required default");
});

test("terminal surface has elevated security level", () => {
  const rec = makeRecord("external_terminal");
  assert(rec.securityLevel === "elevated", "terminal is elevated");
});

test("dialog surface has sensitive security level", () => {
  const rec = makeRecord("dialog");
  assert(rec.securityLevel === "sensitive", "dialog is sensitive");
});

test("editor surface has normal security level", () => {
  const rec = makeRecord("editor");
  assert(rec.securityLevel === "normal", "editor is normal");
});

// ---------------------------------------------------------------------------
// Surface context
// ---------------------------------------------------------------------------

test("noSurfaceContext returns unknown confidence and null surfaces", () => {
  const ctx = service.noSurfaceContext();
  assert(ctx.activeSurface === null, "no active surface");
  assert(ctx.confidence === "unknown", "unknown confidence");
  assert(ctx.overlayIsFocusBlocking === false, "no blocking overlay");
});

test("focused surface produces high confidence context", () => {
  const ctx = makeContext(makeRecord("editor", "focused"));
  assert(ctx.activeSurface !== null, "active surface present");
  assert(ctx.confidence === "high", `expected high, got ${ctx.confidence}`);
});

test("visible (not focused) surface produces medium confidence", () => {
  const ctx = makeContext(makeRecord("browser", "visible"));
  assert(ctx.confidence === "medium", `expected medium, got ${ctx.confidence}`);
});

test("hidden surface produces low confidence", () => {
  const ctx = makeContext(makeRecord("integrated_terminal", "hidden"));
  assert(ctx.confidence === "low", `expected low, got ${ctx.confidence}`);
});

test("overlay is focus-blocking when overlay surface has canFocus=true", () => {
  const ctx = makeContext(
    makeRecord("editor", "focused"),
    null,
    makeRecord("dialog", "focused")
  );
  assert(ctx.overlayIsFocusBlocking === true, "dialog overlay should block focus");
});

test("all context fields present and valid", () => {
  const ctx = makeContext(makeRecord("editor"));
  assert(ctx.timestamp > 0, "timestamp must be positive");
  assert(ctx.reason.length > 0, "reason must be non-empty");
  assert(ctx.confidence !== undefined, "confidence must be defined");
});

// ---------------------------------------------------------------------------
// Surface resolution
// ---------------------------------------------------------------------------

test("resolveSurface returns active surface when type matches noun", () => {
  const editorSurface = makeRecord("editor", "focused");
  const ctx = makeContext(editorSurface);
  const resolved = service.resolveSurface("editor", ctx);
  assert(resolved !== null, "should resolve");
  assert(resolved!.identity.surfaceType === "editor", "should resolve to editor");
});

test("resolveSurface resolves alias 'vscode' to editor surface", () => {
  const editorSurface = makeRecord("editor", "focused");
  const ctx = makeContext(editorSurface);
  const resolved = service.resolveSurface("vscode", ctx);
  assert(resolved !== null, "alias should resolve");
  assert(resolved!.identity.surfaceType === "editor", "alias resolves to editor");
});

test("resolveSurface returns overlay if noun matches overlay type", () => {
  const editorSurface = makeRecord("editor", "focused");
  const dialogSurface = makeRecord("dialog", "focused");
  const ctx = makeContext(editorSurface, null, dialogSurface);
  const resolved = service.resolveSurface("dialog", ctx);
  assert(resolved !== null, "should resolve overlay");
  assert(resolved!.identity.surfaceType === "dialog", "resolves to dialog overlay");
});

test("resolveSurface finds surface in candidate list", () => {
  const ctx = makeContext(makeRecord("editor", "focused"));
  const terminalRecord = makeRecord("integrated_terminal", "visible");
  const resolved = service.resolveSurface("integrated terminal", ctx, [terminalRecord]);
  assert(resolved !== null, "should find in candidates");
  assert(resolved!.identity.surfaceType === "integrated_terminal", "resolves to integrated_terminal");
});

test("resolveSurface returns null when no match found", () => {
  const ctx = makeContext(makeRecord("editor", "focused"));
  const resolved = service.resolveSurface("settings", ctx, []);
  assert(resolved === null, "should return null when no match");
});

// ---------------------------------------------------------------------------
// Routing constraint evaluation
// ---------------------------------------------------------------------------

test("unknown surface → unknown_surface constraint", () => {
  const ctx = service.noSurfaceContext();
  const decision = service.evaluateRoutingConstraint(ctx, null);
  assert(decision.constraint === "unknown_surface", `expected unknown_surface, got ${decision.constraint}`);
});

test("focused editor surface passes unrestricted capability check", () => {
  const ctx = makeContext(makeRecord("editor", "focused"));
  const decision = service.evaluateRoutingConstraint(ctx, null);
  assert(decision.constraint === "pass", `expected pass, got ${decision.constraint}`);
});

test("capability mismatch → block (editor cannot run commands)", () => {
  const ctx = makeContext(makeRecord("editor", "focused"));
  const decision = service.evaluateRoutingConstraint(ctx, "canRunCommands");
  assert(decision.constraint === "block", `expected block, got ${decision.constraint}`);
});

test("integrated_terminal passes canRunCommands check", () => {
  const ctx = makeContext(makeRecord("integrated_terminal", "focused"));
  const decision = service.evaluateRoutingConstraint(ctx, "canRunCommands");
  assert(decision.constraint === "pass", `integrated_terminal can run commands, got ${decision.constraint}`);
});

test("visible (not focused) editor with no bound_allowed → requires_focus", () => {
  const ctx = makeContext(makeRecord("editor", "visible"));
  const decision = service.evaluateRoutingConstraint(ctx, null);
  assert(decision.constraint === "requires_focus", `expected requires_focus, got ${decision.constraint}`);
});

test("shell_executor surface → requires_binding", () => {
  const shellRec = service.buildSurfaceRecord({
    surfaceType: "shell_executor",
    surfaceClass: "virtual",
    surfaceId: "shell:02",
    label: "shell",
    visibility: "available",
  });
  const ctx = makeContext(shellRec);
  const decision = service.evaluateRoutingConstraint(ctx, null);
  assert(decision.constraint === "requires_binding", `expected requires_binding, got ${decision.constraint}`);
});

// ---------------------------------------------------------------------------
// Modal alignment
// ---------------------------------------------------------------------------

test("dialog surface overlay is a blocking overlay", () => {
  const rec = makeRecord("dialog", "focused");
  assert(service.isBlockingOverlay(rec) === true, "dialog should be blocking overlay");
});

test("notification-type popup is not a blocking overlay", () => {
  const rec = makeRecord("popup", "focused");
  assert(service.isBlockingOverlay(rec) === false, "popup is not blocking");
});

test("editor (root class) is not a blocking overlay", () => {
  const rec = makeRecord("editor", "focused");
  assert(service.isBlockingOverlay(rec) === false, "editor is not overlay");
});

// ---------------------------------------------------------------------------
// Referential anchor
// ---------------------------------------------------------------------------

test("extractReferentialAnchor returns anchor for high-confidence context", () => {
  const ctx = makeContext(makeRecord("integrated_terminal", "focused"));
  const anchor = service.extractReferentialAnchor(ctx);
  assert(anchor !== null, "should extract anchor");
  assert(anchor!.surfaceType === "integrated_terminal", "anchor type correct");
  assert(anchor!.entityType === "surface", "entity type is surface");
});

test("extractReferentialAnchor returns null for unknown confidence", () => {
  const ctx = service.noSurfaceContext();
  const anchor = service.extractReferentialAnchor(ctx);
  assert(anchor === null, "no anchor for unknown context");
});

test("extractReferentialAnchor returns null for low confidence", () => {
  const ctx = makeContext(makeRecord("editor", "hidden"));
  const anchor = service.extractReferentialAnchor(ctx);
  assert(anchor === null, "no anchor for low-confidence context");
});

// ---------------------------------------------------------------------------
// Summarize helper
// ---------------------------------------------------------------------------

test("summarizeContext returns non-empty string", () => {
  const ctx = makeContext(makeRecord("editor", "focused"));
  const summary = service.summarizeContext(ctx);
  assert(summary.length > 0, "summary must be non-empty");
  assert(summary.includes("editor"), "summary should mention surface type");
});

test("summarizeContext on empty context mentions 'none'", () => {
  const ctx = service.noSurfaceContext();
  const summary = service.summarizeContext(ctx);
  assert(summary.includes("none"), "empty context summary should say none");
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
