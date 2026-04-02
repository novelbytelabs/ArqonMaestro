export type FocusAuthorityType = "verified" | "heuristic" | "unknown";

export type FocusDeltaKind =
  | "app_switch"
  | "window_switch"
  | "region_transition"
  | "selection_change"
  | "caret_move"
  | "mode_transition"
  | "command_surface_activation"
  | "unknown";

export type TaskHistoryOutcome = "success" | "blocked" | "undone" | "unknown";

export interface FocusSnapshot {
  appId: string | null;
  windowId: string | null;
  regionId: string | null;
  subregionId: string | null;
  controlId: string | null;
  caretOffset: number | null;
  hasSelection: boolean | null;
  selectionTextLength: number | null;
  focusConfidence: number | null;
  authorityType: FocusAuthorityType;
  snapshotAgeMs: number | null;
}

export interface FocusDeltaEvent {
  kind: FocusDeltaKind;
  fromId: string | null;
  toId: string | null;
  ageMs: number | null;
}

export interface TaskHistoryDeltaEntry {
  semanticAddressId: string | null;
  mergedText: string | null;
  outcome: TaskHistoryOutcome;
  ageMs: number | null;
}

export interface FocusContextEnvelopeSummary {
  appId: string | null;
  regionId: string | null;
  authorityType: FocusAuthorityType;
  recentFocusDeltaCount: number;
  recentTaskHistoryCount: number;
  deicticResolutionEligible: boolean;
}

export interface FocusConditionedCommandContextEnvelope {
  schemaVersion: "h3_focus_command_context_v1";
  generatedAtMs: number;
  snapshot: FocusSnapshot | null;
  focusDelta: FocusDeltaEvent[];
  taskHistoryDelta: TaskHistoryDeltaEntry[];
  contextEligible: boolean;
  snapshotFresh: boolean;
  ineligibilityReasons: string[];
  summary: FocusContextEnvelopeSummary;
}

export interface BuildFocusConditionedCommandContextInput {
  nowMs?: number;
  snapshot?: Partial<FocusSnapshot> | null;
  focusDelta?: Array<Partial<FocusDeltaEvent>> | null;
  taskHistoryDelta?: Array<Partial<TaskHistoryDeltaEntry>> | null;
  freshnessWindowMs?: number;
  minimumFocusConfidence?: number;
  maxFocusDelta?: number;
  maxTaskHistoryDelta?: number;
}

export interface FocusContextAdvisoryHints {
  rankingEligible: boolean;
  legalityEligible: boolean;
  deicticResolutionEligible: boolean;
  reasonCodes: string[];
}

export const FOCUS_COMMAND_CONTEXT_SCHEMA_VERSION = "h3_focus_command_context_v1" as const;
export const DEFAULT_FOCUS_CONTEXT_FRESHNESS_WINDOW_MS = 60_000;
export const DEFAULT_FOCUS_CONTEXT_MIN_CONFIDENCE = 0.75;
export const DEFAULT_FOCUS_CONTEXT_MAX_FOCUS_DELTA = 8;
export const DEFAULT_FOCUS_CONTEXT_MAX_TASK_HISTORY = 8;

export function buildFocusConditionedCommandContext(
  input: BuildFocusConditionedCommandContextInput = {}
): FocusConditionedCommandContextEnvelope {
  const nowMs = input.nowMs ?? Date.now();
  const freshnessWindowMs = input.freshnessWindowMs ?? DEFAULT_FOCUS_CONTEXT_FRESHNESS_WINDOW_MS;
  const minimumFocusConfidence = input.minimumFocusConfidence ?? DEFAULT_FOCUS_CONTEXT_MIN_CONFIDENCE;
  const maxFocusDelta = input.maxFocusDelta ?? DEFAULT_FOCUS_CONTEXT_MAX_FOCUS_DELTA;
  const maxTaskHistoryDelta = input.maxTaskHistoryDelta ?? DEFAULT_FOCUS_CONTEXT_MAX_TASK_HISTORY;

  const snapshot = normalizeSnapshot(input.snapshot ?? null);
  const focusDelta = (input.focusDelta ?? []).slice(0, maxFocusDelta).map(normalizeFocusDeltaEvent);
  const taskHistoryDelta = (input.taskHistoryDelta ?? [])
    .slice(0, maxTaskHistoryDelta)
    .map(normalizeTaskHistoryDeltaEntry);

  const reasons: string[] = [];
  const snapshotFresh = snapshot?.snapshotAgeMs != null && snapshot.snapshotAgeMs <= freshnessWindowMs;

  if (!snapshot) {
    reasons.push("focus_snapshot_missing");
  } else {
    if (!snapshotFresh) {
      reasons.push("focus_snapshot_stale");
    }
    if (snapshot.focusConfidence == null || snapshot.focusConfidence < minimumFocusConfidence) {
      reasons.push("focus_confidence_below_minimum");
    }
    if (snapshot.authorityType !== "verified") {
      reasons.push("focus_authority_not_verified");
    }
  }

  const contextEligible = reasons.length === 0;
  const deicticResolutionEligible =
    contextEligible &&
    !!snapshot &&
    Boolean(snapshot.regionId || snapshot.controlId || snapshot.hasSelection === true);

  return {
    schemaVersion: FOCUS_COMMAND_CONTEXT_SCHEMA_VERSION,
    generatedAtMs: nowMs,
    snapshot,
    focusDelta,
    taskHistoryDelta,
    contextEligible,
    snapshotFresh,
    ineligibilityReasons: reasons,
    summary: {
      appId: snapshot?.appId ?? null,
      regionId: snapshot?.regionId ?? null,
      authorityType: snapshot?.authorityType ?? "unknown",
      recentFocusDeltaCount: focusDelta.length,
      recentTaskHistoryCount: taskHistoryDelta.length,
      deicticResolutionEligible,
    },
  };
}

export function deriveFocusContextAdvisoryHints(
  envelope: FocusConditionedCommandContextEnvelope
): FocusContextAdvisoryHints {
  return {
    rankingEligible: envelope.contextEligible,
    legalityEligible: envelope.contextEligible,
    deicticResolutionEligible: envelope.summary.deicticResolutionEligible,
    reasonCodes: [...envelope.ineligibilityReasons],
  };
}

function normalizeSnapshot(input: Partial<FocusSnapshot> | null): FocusSnapshot | null {
  if (!input) {
    return null;
  }
  return {
    appId: normalizeString(input.appId),
    windowId: normalizeString(input.windowId),
    regionId: normalizeString(input.regionId),
    subregionId: normalizeString(input.subregionId),
    controlId: normalizeString(input.controlId),
    caretOffset: normalizeNonNegativeInteger(input.caretOffset),
    hasSelection: typeof input.hasSelection === "boolean" ? input.hasSelection : null,
    selectionTextLength: normalizeNonNegativeInteger(input.selectionTextLength),
    focusConfidence: normalizeUnitInterval(input.focusConfidence),
    authorityType: normalizeAuthorityType(input.authorityType),
    snapshotAgeMs: normalizeNonNegativeInteger(input.snapshotAgeMs),
  };
}

function normalizeFocusDeltaEvent(input: Partial<FocusDeltaEvent>): FocusDeltaEvent {
  return {
    kind: normalizeFocusDeltaKind(input.kind),
    fromId: normalizeString(input.fromId),
    toId: normalizeString(input.toId),
    ageMs: normalizeNonNegativeInteger(input.ageMs),
  };
}

function normalizeTaskHistoryDeltaEntry(input: Partial<TaskHistoryDeltaEntry>): TaskHistoryDeltaEntry {
  return {
    semanticAddressId: normalizeString(input.semanticAddressId),
    mergedText: normalizeString(input.mergedText),
    outcome: normalizeTaskHistoryOutcome(input.outcome),
    ageMs: normalizeNonNegativeInteger(input.ageMs),
  };
}

function normalizeAuthorityType(value: FocusAuthorityType | undefined): FocusAuthorityType {
  if (value === "verified" || value === "heuristic") {
    return value;
  }
  return "unknown";
}

function normalizeFocusDeltaKind(value: FocusDeltaKind | undefined): FocusDeltaKind {
  switch (value) {
    case "app_switch":
    case "window_switch":
    case "region_transition":
    case "selection_change":
    case "caret_move":
    case "mode_transition":
    case "command_surface_activation":
      return value;
    default:
      return "unknown";
  }
}

function normalizeTaskHistoryOutcome(value: TaskHistoryOutcome | undefined): TaskHistoryOutcome {
  switch (value) {
    case "success":
    case "blocked":
    case "undone":
      return value;
    default:
      return "unknown";
  }
}

function normalizeString(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNonNegativeInteger(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value < 0) {
    return null;
  }
  return Math.trunc(value);
}

function normalizeUnitInterval(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value < 0 || value > 1) {
    return null;
  }
  return value;
}
