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



export interface FocusContextRankingCandidate {
  regionId: string | null;
  canonicalPrefix: string | null;
  canonicalMergedText: string | null;
  commandFamily: string | null;
}

export interface FocusContextRankingAdjustment {
  focusRankingApplied: boolean;
  focusRankingBoost: number;
  focusRankingReasonCodes: string[];
}

export interface FocusContextLegalityCandidate {
  regionId: string | null;
  canonicalPrefix: string | null;
  canonicalMergedText: string | null;
  commandFamily: string | null;
}

export interface FocusContextLegalityAssessment {
  focusLegalityApplied: boolean;
  focusLegalityLawful: boolean | null;
  focusLegalityPenaltyApplied: boolean;
  focusLegalityPenalty: number;
  focusLegalityReasonCodes: string[];
  focusLegalityCommandKind: string | null;
}

export interface FocusContextEvidenceFields {
  focusContextSchemaVersion: string | null;
  focusContextEligible: boolean | null;
  focusSnapshotFresh: boolean | null;
  focusAuthorityType: FocusAuthorityType | null;
  focusAppId: string | null;
  focusWindowId: string | null;
  focusRegionId: string | null;
  focusSubregionId: string | null;
  focusControlId: string | null;
  focusHasSelection: boolean | null;
  focusSelectionTextLength: number | null;
  focusCaretOffset: number | null;
  focusSnapshotAgeMs: number | null;
  focusConfidence: number | null;
  focusRecentDeltaCount: number | null;
  focusRecentTaskHistoryCount: number | null;
  focusDeicticResolutionEligible: boolean | null;
  focusRankingEligible: boolean | null;
  focusLegalityEligible: boolean | null;
  focusReasonCodes: string[] | null;
  focusLegalityApplied: boolean | null;
  focusLegalityLawful: boolean | null;
  focusLegalityPenaltyApplied: boolean | null;
  focusLegalityPenalty: number | null;
  focusLegalityReasonCodes: string[] | null;
  focusLegalityCommandKind: string | null;
}

export const FOCUS_COMMAND_CONTEXT_SCHEMA_VERSION = "h3_focus_command_context_v1" as const;
export const DEFAULT_FOCUS_CONTEXT_FRESHNESS_WINDOW_MS = 60_000;
export const DEFAULT_FOCUS_CONTEXT_MIN_CONFIDENCE = 0.75;
export const DEFAULT_FOCUS_CONTEXT_MAX_FOCUS_DELTA = 8;
export const DEFAULT_FOCUS_CONTEXT_MAX_TASK_HISTORY = 8;
export const FOCUS_CONTEXT_RANKING_MAX_BOOST = 0.06;
export const FOCUS_CONTEXT_LEGALITY_UNLAWFUL_PENALTY = 0.08;

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

export function deriveFocusContextEvidenceFields(
  envelope: FocusConditionedCommandContextEnvelope | null | undefined
): FocusContextEvidenceFields {
  if (!envelope) {
    return {
      focusContextSchemaVersion: null,
      focusContextEligible: null,
      focusSnapshotFresh: null,
      focusAuthorityType: null,
      focusAppId: null,
      focusWindowId: null,
      focusRegionId: null,
      focusSubregionId: null,
      focusControlId: null,
      focusHasSelection: null,
      focusSelectionTextLength: null,
      focusCaretOffset: null,
      focusSnapshotAgeMs: null,
      focusConfidence: null,
      focusRecentDeltaCount: null,
      focusRecentTaskHistoryCount: null,
      focusDeicticResolutionEligible: null,
      focusRankingEligible: null,
      focusLegalityEligible: null,
      focusReasonCodes: null,
      focusLegalityApplied: null,
      focusLegalityLawful: null,
      focusLegalityPenaltyApplied: null,
      focusLegalityPenalty: null,
      focusLegalityReasonCodes: null,
      focusLegalityCommandKind: null,
    };
  }

  const hints = deriveFocusContextAdvisoryHints(envelope);
  const snapshot = envelope.snapshot;
  const legality = deriveFocusContextLegalityAssessment(envelope, {
    regionId: null,
    canonicalPrefix: null,
    canonicalMergedText: null,
    commandFamily: null,
  });

  return {
    focusContextSchemaVersion: envelope.schemaVersion,
    focusContextEligible: envelope.contextEligible,
    focusSnapshotFresh: envelope.snapshotFresh,
    focusAuthorityType: snapshot?.authorityType ?? null,
    focusAppId: snapshot?.appId ?? null,
    focusWindowId: snapshot?.windowId ?? null,
    focusRegionId: snapshot?.regionId ?? null,
    focusSubregionId: snapshot?.subregionId ?? null,
    focusControlId: snapshot?.controlId ?? null,
    focusHasSelection: snapshot?.hasSelection ?? null,
    focusSelectionTextLength: snapshot?.selectionTextLength ?? null,
    focusCaretOffset: snapshot?.caretOffset ?? null,
    focusSnapshotAgeMs: snapshot?.snapshotAgeMs ?? null,
    focusConfidence: snapshot?.focusConfidence ?? null,
    focusRecentDeltaCount: envelope.summary.recentFocusDeltaCount,
    focusRecentTaskHistoryCount: envelope.summary.recentTaskHistoryCount,
    focusDeicticResolutionEligible: envelope.summary.deicticResolutionEligible,
    focusRankingEligible: hints.rankingEligible,
    focusLegalityEligible: hints.legalityEligible,
    focusReasonCodes: [...hints.reasonCodes],
    focusLegalityApplied: legality.focusLegalityApplied,
    focusLegalityLawful: legality.focusLegalityLawful,
    focusLegalityPenaltyApplied: legality.focusLegalityPenaltyApplied,
    focusLegalityPenalty: legality.focusLegalityPenalty,
    focusLegalityReasonCodes: legality.focusLegalityReasonCodes,
    focusLegalityCommandKind: legality.focusLegalityCommandKind,
  };
}



export function deriveFocusContextLegalityAssessment(
  envelope: FocusConditionedCommandContextEnvelope | null | undefined,
  candidate: FocusContextLegalityCandidate
): FocusContextLegalityAssessment {
  const commandKind = detectFocusLegalityCommandKind(candidate);
  if (!commandKind) {
    return {
      focusLegalityApplied: false,
      focusLegalityLawful: null,
      focusLegalityPenaltyApplied: false,
      focusLegalityPenalty: 0,
      focusLegalityReasonCodes: ["focus_legality_not_applicable"],
      focusLegalityCommandKind: null,
    };
  }

  if (!envelope || !envelope.contextEligible) {
    return {
      focusLegalityApplied: true,
      focusLegalityLawful: false,
      focusLegalityPenaltyApplied: true,
      focusLegalityPenalty: FOCUS_CONTEXT_LEGALITY_UNLAWFUL_PENALTY,
      focusLegalityReasonCodes: ["focus_context_ineligible"],
      focusLegalityCommandKind: commandKind,
    };
  }

  if (!envelope.summary.deicticResolutionEligible) {
    return {
      focusLegalityApplied: true,
      focusLegalityLawful: false,
      focusLegalityPenaltyApplied: true,
      focusLegalityPenalty: FOCUS_CONTEXT_LEGALITY_UNLAWFUL_PENALTY,
      focusLegalityReasonCodes: ["focus_deictic_resolution_ineligible"],
      focusLegalityCommandKind: commandKind,
    };
  }

  const snapshot = envelope.snapshot;
  if (commandKind === "open_it") {
    if (snapshot?.hasSelection === true) {
      return {
        focusLegalityApplied: true,
        focusLegalityLawful: true,
        focusLegalityPenaltyApplied: false,
        focusLegalityPenalty: 0,
        focusLegalityReasonCodes: ["deictic_selection_anchor"],
        focusLegalityCommandKind: commandKind,
      };
    }
    if (snapshot?.controlId || snapshot?.regionId) {
      return {
        focusLegalityApplied: true,
        focusLegalityLawful: true,
        focusLegalityPenaltyApplied: false,
        focusLegalityPenalty: 0,
        focusLegalityReasonCodes: ["deictic_focus_anchor"],
        focusLegalityCommandKind: commandKind,
      };
    }
    return {
      focusLegalityApplied: true,
      focusLegalityLawful: false,
      focusLegalityPenaltyApplied: true,
      focusLegalityPenalty: FOCUS_CONTEXT_LEGALITY_UNLAWFUL_PENALTY,
      focusLegalityReasonCodes: ["open_it_requires_focus_anchor"],
      focusLegalityCommandKind: commandKind,
    };
  }

  if (commandKind === "go_there") {
    if (snapshot?.regionId || snapshot?.controlId || snapshot?.windowId) {
      return {
        focusLegalityApplied: true,
        focusLegalityLawful: true,
        focusLegalityPenaltyApplied: false,
        focusLegalityPenalty: 0,
        focusLegalityReasonCodes: ["deictic_navigation_anchor"],
        focusLegalityCommandKind: commandKind,
      };
    }
    return {
      focusLegalityApplied: true,
      focusLegalityLawful: false,
      focusLegalityPenaltyApplied: true,
      focusLegalityPenalty: FOCUS_CONTEXT_LEGALITY_UNLAWFUL_PENALTY,
      focusLegalityReasonCodes: ["go_there_requires_navigation_anchor"],
      focusLegalityCommandKind: commandKind,
    };
  }

  return {
    focusLegalityApplied: false,
    focusLegalityLawful: null,
    focusLegalityPenaltyApplied: false,
    focusLegalityPenalty: 0,
    focusLegalityReasonCodes: ["focus_legality_not_applicable"],
    focusLegalityCommandKind: null,
  };
}

export function deriveFocusContextRankingAdjustment(
  envelope: FocusConditionedCommandContextEnvelope | null | undefined,
  candidate: FocusContextRankingCandidate
): FocusContextRankingAdjustment {
  if (!envelope || !envelope.contextEligible) {
    return {
      focusRankingApplied: false,
      focusRankingBoost: 0,
      focusRankingReasonCodes: ["focus_context_ineligible"],
    };
  }

  const regionId = normalizeComparableValue(candidate.regionId);
  const canonicalPrefix = normalizeComparableValue(candidate.canonicalPrefix);
  const canonicalMergedText = normalizeComparableValue(candidate.canonicalMergedText);
  if (
    candidate.commandFamily !== "parameterized_open" ||
    !regionId ||
    (regionId !== "open" && regionId !== "go to")
  ) {
    return {
      focusRankingApplied: false,
      focusRankingBoost: 0,
      focusRankingReasonCodes: ["focus_ranking_not_applicable"],
    };
  }

  let boost = 0;
  const reasons: string[] = [];
  const snapshot = envelope.snapshot;
  const snapshotRegion = normalizeComparableValue(snapshot?.regionId);
  const snapshotControl = normalizeComparableValue(snapshot?.controlId);
  const snapshotApp = normalizeComparableValue(snapshot?.appId);

  if (
    snapshotApp === "chrome" &&
    (snapshotRegion === "address-bar" || snapshotControl === "omnibox" || snapshotRegion === "tab-strip")
  ) {
    boost += 0.015;
    reasons.push("browser_navigation_focus_context");
  }

  if (snapshotApp === "code" && regionId === "open" && (snapshotRegion === "explorer" || snapshotRegion === "editor")) {
    boost += 0.012;
    reasons.push("editor_open_focus_context");
  }

  const recentMergedTexts = envelope.taskHistoryDelta
    .filter((entry) => entry.outcome === "success")
    .map((entry) => normalizeComparableValue(entry.mergedText))
    .filter((entry): entry is string => Boolean(entry));

  if (canonicalMergedText && recentMergedTexts.includes(canonicalMergedText)) {
    boost += 0.035;
    reasons.push("recent_task_exact_match");
  } else if (
    canonicalPrefix &&
    recentMergedTexts.some((entry) => entry.startsWith(canonicalPrefix + ' '))
  ) {
    boost += 0.02;
    reasons.push("recent_task_prefix_match");
  }

  const boundedBoost = Number(Math.min(FOCUS_CONTEXT_RANKING_MAX_BOOST, boost).toFixed(3));
  return {
    focusRankingApplied: boundedBoost > 0,
    focusRankingBoost: boundedBoost,
    focusRankingReasonCodes: boundedBoost > 0 ? reasons : ["focus_ranking_no_match"],
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

function detectFocusLegalityCommandKind(
  candidate: FocusContextLegalityCandidate
): "open_it" | "go_there" | null {
  const mergedText = normalizeComparableValue(candidate.canonicalMergedText);
  const regionId = normalizeComparableValue(candidate.regionId);
  if (candidate.commandFamily !== "parameterized_open" || !mergedText || !regionId) {
    return null;
  }
  if (regionId === "open" && mergedText === "open it") {
    return "open_it";
  }
  if (regionId === "go to" && mergedText === "go there") {
    return "go_there";
  }
  return null;
}

function normalizeComparableValue(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() ?? null;
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
