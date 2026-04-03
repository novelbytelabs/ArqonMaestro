import {
  DEFAULT_FOCUS_CONTEXT_FRESHNESS_WINDOW_MS,
  DEFAULT_FOCUS_CONTEXT_MAX_FOCUS_DELTA,
  DEFAULT_FOCUS_CONTEXT_MAX_TASK_HISTORY,
  buildFocusConditionedCommandContext,
  FOCUS_CONTEXT_LEGALITY_UNLAWFUL_PENALTY,
  deriveFocusContextAdvisoryHints,
  deriveFocusContextEvidenceFields,
  deriveFocusContextLegalityAssessment,
  deriveFocusContextRankingAdjustment,
  deriveFocusContextTaskMomentumAssessment,
} from "../../main/runtime/focus-conditioned-command-context";

describe("FocusConditionedCommandContext", () => {
  it("builds a fresh verified advisory envelope and trims bounded history", () => {
    const envelope = buildFocusConditionedCommandContext({
      nowMs: 1_000_000,
      snapshot: {
        appId: "code",
        windowId: "window-1",
        regionId: "editor",
        controlId: "text-buffer",
        caretOffset: 42,
        hasSelection: true,
        selectionTextLength: 6,
        focusConfidence: 0.94,
        authorityType: "verified",
        snapshotAgeMs: 150,
      },
      focusDelta: Array.from({ length: DEFAULT_FOCUS_CONTEXT_MAX_FOCUS_DELTA + 4 }, (_, index) => ({
        kind: "caret_move" as const,
        fromId: `from-${index}`,
        toId: `to-${index}`,
        ageMs: index * 10,
      })),
      taskHistoryDelta: Array.from({ length: DEFAULT_FOCUS_CONTEXT_MAX_TASK_HISTORY + 3 }, (_, index) => ({
        semanticAddressId: `sa-${index}`,
        mergedText: `open item ${index}`,
        outcome: "success" as const,
        ageMs: index * 25,
      })),
    });

    expect(envelope.contextEligible).toBe(true);
    expect(envelope.snapshotFresh).toBe(true);
    expect(envelope.ineligibilityReasons).toEqual([]);
    expect(envelope.focusDelta).toHaveLength(DEFAULT_FOCUS_CONTEXT_MAX_FOCUS_DELTA);
    expect(envelope.taskHistoryDelta).toHaveLength(DEFAULT_FOCUS_CONTEXT_MAX_TASK_HISTORY);
    expect(envelope.summary.deicticResolutionEligible).toBe(true);

    const hints = deriveFocusContextAdvisoryHints(envelope);
    expect(hints.rankingEligible).toBe(true);
    expect(hints.legalityEligible).toBe(true);
    expect(hints.deicticResolutionEligible).toBe(true);
  });

  it("marks stale snapshots ineligible without granting any advisory hints", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "tab-strip",
        focusConfidence: 0.91,
        authorityType: "verified",
        snapshotAgeMs: DEFAULT_FOCUS_CONTEXT_FRESHNESS_WINDOW_MS + 1,
      },
    });

    expect(envelope.contextEligible).toBe(false);
    expect(envelope.snapshotFresh).toBe(false);
    expect(envelope.ineligibilityReasons).toContain("focus_snapshot_stale");

    const hints = deriveFocusContextAdvisoryHints(envelope);
    expect(hints.rankingEligible).toBe(false);
    expect(hints.legalityEligible).toBe(false);
    expect(hints.deicticResolutionEligible).toBe(false);
  });

  it("requires verified authority even when focus confidence is high", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "terminal",
        regionId: "prompt",
        focusConfidence: 0.99,
        authorityType: "heuristic",
        snapshotAgeMs: 40,
      },
    });

    expect(envelope.contextEligible).toBe(false);
    expect(envelope.ineligibilityReasons).toContain("focus_authority_not_verified");
    expect(envelope.summary.deicticResolutionEligible).toBe(false);
  });

  it("remains observational when snapshot is missing", () => {
    const envelope = buildFocusConditionedCommandContext({
      focusDelta: [{ kind: "app_switch", fromId: "chrome", toId: "code", ageMs: 12 }],
      taskHistoryDelta: [{ semanticAddressId: "sa-1", mergedText: "open docs", outcome: "success", ageMs: 30 }],
    });

    expect(envelope.contextEligible).toBe(false);
    expect(envelope.ineligibilityReasons).toContain("focus_snapshot_missing");

    const hints = deriveFocusContextAdvisoryHints(envelope);
    expect(hints.rankingEligible).toBe(false);
    expect(hints.legalityEligible).toBe(false);
    expect(hints.deicticResolutionEligible).toBe(false);
  });

  it("derives bounded evidence fields from an eligible envelope", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "code",
        windowId: "window-1",
        regionId: "editor",
        subregionId: "primary",
        controlId: "text-buffer",
        caretOffset: 42,
        hasSelection: true,
        selectionTextLength: 6,
        focusConfidence: 0.94,
        authorityType: "verified",
        snapshotAgeMs: 150,
      },
      focusDelta: [{ kind: "selection_change", fromId: "old", toId: "new", ageMs: 12 }],
      taskHistoryDelta: [
        { semanticAddressId: "sa-1", mergedText: "rename symbol", outcome: "success", ageMs: 30 },
      ],
    });

    const fields = deriveFocusContextEvidenceFields(envelope);
    expect(fields).toEqual(
      expect.objectContaining({
        focusContextSchemaVersion: "h3_focus_command_context_v1",
        focusContextEligible: true,
        focusSnapshotFresh: true,
        focusAuthorityType: "verified",
        focusAppId: "code",
        focusWindowId: "window-1",
        focusRegionId: "editor",
        focusSubregionId: "primary",
        focusControlId: "text-buffer",
        focusHasSelection: true,
        focusSelectionTextLength: 6,
        focusCaretOffset: 42,
        focusSnapshotAgeMs: 150,
        focusConfidence: 0.94,
        focusRecentDeltaCount: 1,
        focusRecentTaskHistoryCount: 1,
        focusDeicticResolutionEligible: true,
        focusRankingEligible: true,
        focusLegalityEligible: true,
        focusReasonCodes: [],
      })
    );
  });


  it("derives a bounded ranking boost for recent exact open-target history", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.93,
        authorityType: "verified",
        snapshotAgeMs: 40,
      },
      taskHistoryDelta: [
        { semanticAddressId: "sa-1", mergedText: "open github.com", outcome: "success", ageMs: 80 },
      ],
    });

    const adjustment = deriveFocusContextRankingAdjustment(envelope, {
      regionId: "open",
      canonicalPrefix: "open",
      canonicalMergedText: "open github.com",
      commandFamily: "parameterized_open",
    });

    expect(adjustment.focusRankingApplied).toBe(true);
    expect(adjustment.focusRankingBoost).toBeGreaterThan(0);
    expect(adjustment.focusRankingReasonCodes).toEqual(
      expect.arrayContaining(["browser_navigation_focus_context", "recent_task_exact_match"])
    );
  });

  it("does not derive a ranking boost when focus context is ineligible", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        focusConfidence: 0.9,
        authorityType: "heuristic",
        snapshotAgeMs: 40,
      },
      taskHistoryDelta: [
        { semanticAddressId: "sa-1", mergedText: "open github.com", outcome: "success", ageMs: 80 },
      ],
    });

    const adjustment = deriveFocusContextRankingAdjustment(envelope, {
      regionId: "open",
      canonicalPrefix: "open",
      canonicalMergedText: "open github.com",
      commandFamily: "parameterized_open",
    });

    expect(adjustment.focusRankingApplied).toBe(false);
    expect(adjustment.focusRankingBoost).toBe(0);
    expect(adjustment.focusRankingReasonCodes).toContain("focus_context_ineligible");
  });

  it("derives lawful deictic legality for open it when focus provides a selection anchor", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "code",
        regionId: "editor",
        controlId: "text-buffer",
        hasSelection: true,
        selectionTextLength: 8,
        focusConfidence: 0.96,
        authorityType: "verified",
        snapshotAgeMs: 25,
      },
    });

    const legality = deriveFocusContextLegalityAssessment(envelope, {
      regionId: "open",
      canonicalPrefix: "open",
      canonicalMergedText: "open it",
      commandFamily: "parameterized_open",
    });

    expect(legality.focusLegalityApplied).toBe(true);
    expect(legality.focusLegalityLawful).toBe(true);
    expect(legality.focusLegalityPenaltyApplied).toBe(false);
    expect(legality.focusLegalityPenalty).toBe(0);
    expect(legality.focusLegalityCommandKind).toBe("open_it");
    expect(legality.focusLegalityReasonCodes).toContain("deictic_selection_anchor");
  });

  it("derives an unlawful deictic legality penalty when go there lacks eligible focus context", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        focusConfidence: 0.94,
        authorityType: "heuristic",
        snapshotAgeMs: 20,
      },
    });

    const legality = deriveFocusContextLegalityAssessment(envelope, {
      regionId: "go to",
      canonicalPrefix: "go to",
      canonicalMergedText: "go there",
      commandFamily: "parameterized_open",
    });

    expect(legality.focusLegalityApplied).toBe(true);
    expect(legality.focusLegalityLawful).toBe(false);
    expect(legality.focusLegalityPenaltyApplied).toBe(true);
    expect(legality.focusLegalityPenalty).toBe(FOCUS_CONTEXT_LEGALITY_UNLAWFUL_PENALTY);
    expect(legality.focusLegalityCommandKind).toBe("go_there");
    expect(legality.focusLegalityReasonCodes).toContain("focus_context_ineligible");
  });

  it("returns null evidence fields when no envelope is present", () => {
    const fields = deriveFocusContextEvidenceFields(null);
    expect(fields.focusContextSchemaVersion).toBeNull();
    expect(fields.focusRankingEligible).toBeNull();
    expect(fields.focusLegalityApplied).toBeNull();
    expect(fields.focusLegalityCommandKind).toBeNull();
    expect(fields.focusReasonCodes).toBeNull();
  });

  it("derives bounded workflow momentum for recent semantic-address reuse", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "code",
        regionId: "editor",
        controlId: "text-buffer",
        focusConfidence: 0.96,
        authorityType: "verified",
        snapshotAgeMs: 30,
      },
      taskHistoryDelta: [
        {
          semanticAddressId: "sa-open-github",
          mergedText: "open github.com",
          outcome: "success",
          ageMs: 120,
        },
      ],
    });

    const assessment = deriveFocusContextTaskMomentumAssessment(envelope, {
      semanticAddressId: "sa-open-github",
      regionId: "open",
      canonicalPrefix: "open",
      canonicalMergedText: "open github.com",
      commandFamily: "parameterized_open",
    });

    expect(assessment.focusTaskMomentumApplied).toBe(true);
    expect(assessment.focusTaskMomentumBoost).toBeGreaterThan(0);
    expect(assessment.focusTaskMomentumPenaltyApplied).toBe(false);
    expect(assessment.focusTaskMomentumMatchedSemanticAddressId).toBe("sa-open-github");
    expect(assessment.focusTaskMomentumReasonCodes).toContain("recent_semantic_reuse");
  });

  it("derives an advisory penalty when recent task history shows the same action was undone", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "code",
        regionId: "editor",
        controlId: "text-buffer",
        focusConfidence: 0.96,
        authorityType: "verified",
        snapshotAgeMs: 30,
      },
      taskHistoryDelta: [
        {
          semanticAddressId: "sa-go-line-52",
          mergedText: "go to line 52",
          outcome: "undone",
          ageMs: 90,
        },
      ],
    });

    const assessment = deriveFocusContextTaskMomentumAssessment(envelope, {
      semanticAddressId: "sa-go-line-52",
      regionId: "go to line",
      canonicalPrefix: "go to line",
      canonicalMergedText: "go to line 52",
      commandFamily: "parameterized_numeric",
    });

    expect(assessment.focusTaskMomentumApplied).toBe(true);
    expect(assessment.focusTaskMomentumBoost).toBe(0);
    expect(assessment.focusTaskMomentumPenaltyApplied).toBe(true);
    expect(assessment.focusTaskMomentumPenalty).toBeGreaterThan(0);
    expect(assessment.focusTaskMomentumReasonCodes).toContain("recent_undo_inhibits_reuse");
  });

});
