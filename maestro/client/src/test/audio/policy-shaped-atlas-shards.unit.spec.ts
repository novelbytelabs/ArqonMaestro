import {
  derivePolicyShapedAtlasShardEvidenceFields,
  derivePolicyShapedAtlasShardHint,
  derivePolicyShapedAtlasShardLookupNarrowing,
  derivePolicyShapedAtlasShardRankingAdjustment,
} from "../../main/runtime/policy-shaped-atlas-shards";
import { buildFocusConditionedCommandContext } from "../../main/runtime/focus-conditioned-command-context";

describe("policy-shaped atlas shards", () => {
  it("derives browser navigation shard from eligible browser focus", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 50,
      },
    });

    const hint = derivePolicyShapedAtlasShardHint(envelope);

    expect(hint.atlasShardHintEligible).toBe(true);
    expect(hint.atlasShardHintId).toBe("browser_navigation");
    expect(hint.atlasShardHintSource).toBe("focus_control");
    expect(hint.atlasShardReasonCodes).toContain("browser_control_shard");
  });

  it("falls back to global default shard for eligible unmatched focus", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "notion",
        regionId: "document",
        controlId: "body",
        focusConfidence: 0.91,
        authorityType: "verified",
        snapshotAgeMs: 40,
      },
    });

    const hint = derivePolicyShapedAtlasShardHint(envelope);

    expect(hint.atlasShardHintEligible).toBe(true);
    expect(hint.atlasShardHintId).toBe("global_default");
    expect(hint.atlasShardHintSource).toBe("global_default");
    expect(hint.atlasShardReasonCodes).toContain("atlas_shard_global_default");
  });

  it("marks shard hint ineligible when focus context is ineligible", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.4,
        authorityType: "heuristic",
        snapshotAgeMs: 1000,
      },
      freshnessWindowMs: 100,
      minimumFocusConfidence: 0.8,
    });

    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const evidence = derivePolicyShapedAtlasShardEvidenceFields(hint);

    expect(hint.atlasShardHintEligible).toBe(false);
    expect(hint.atlasShardHintId).toBeNull();
    expect(hint.atlasShardReasonCodes).toContain("focus_context_ineligible");
    expect(evidence.atlasShardHintEligible).toBe(false);
    expect(evidence.atlasShardHintId).toBeNull();
  });

  it("derives bounded browser shard ranking boost for browser-like open targets", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 50,
      },
    });

    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const adjustment = derivePolicyShapedAtlasShardRankingAdjustment(hint, {
      regionId: "open",
      canonicalPrefix: "open",
      canonicalMergedText: "open github.com",
      commandFamily: "parameterized_open",
      parameterType: "open",
    });

    expect(adjustment.atlasShardRankingApplied).toBe(true);
    expect(adjustment.atlasShardRankingBoost).toBeGreaterThan(0);
    expect(adjustment.atlasShardRankingReasonCodes).toContain("atlas_shard_browser_target_match");
    expect(adjustment.atlasShardRankingCandidateKind).toBe("browser_target");
  });

  it("keeps global-default shard advisory with no ranking adjustment", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "notion",
        regionId: "document",
        controlId: "body",
        focusConfidence: 0.91,
        authorityType: "verified",
        snapshotAgeMs: 40,
      },
    });

    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const adjustment = derivePolicyShapedAtlasShardRankingAdjustment(hint, {
      regionId: "open",
      canonicalPrefix: "open",
      canonicalMergedText: "open notes.txt",
      commandFamily: "parameterized_open",
      parameterType: "open",
    });

    expect(adjustment.atlasShardRankingApplied).toBe(false);
    expect(adjustment.atlasShardRankingBoost).toBe(0);
    expect(adjustment.atlasShardRankingReasonCodes).toContain("atlas_shard_global_default_no_adjustment");
  });

  it("derives bounded browser shard narrowing when mixed candidate kinds are present", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 50,
      },
    });
    const hint = derivePolicyShapedAtlasShardHint(envelope);

    const narrowing = derivePolicyShapedAtlasShardLookupNarrowing(hint, [
      {
        regionId: "open",
        canonicalPrefix: "open",
        canonicalMergedText: "open github.com",
        commandFamily: "parameterized_open",
        parameterType: "open",
      },
      {
        regionId: "open",
        canonicalPrefix: "open",
        canonicalMergedText: "open src/main.ts",
        commandFamily: "parameterized_open",
        parameterType: "open",
      },
    ]);

    expect(narrowing.atlasShardNarrowingApplied).toBe(true);
    expect(narrowing.atlasShardNarrowingFallbackUsed).toBe(false);
    expect(narrowing.atlasShardNarrowingCandidateCountBefore).toBe(2);
    expect(narrowing.atlasShardNarrowingCandidateCountAfter).toBe(1);
    expect(narrowing.atlasShardNarrowingAllowedCandidateKinds).toEqual(["browser_target"]);
    expect(narrowing.atlasShardNarrowingReasonCodes).toContain(
      "atlas_shard_narrowing_browser_navigation_candidate_kind_filter"
    );
    expect(narrowing.narrowedCandidates[0].canonicalMergedText).toBe("open github.com");
  });

  it("falls back instead of narrowing away all candidates", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 50,
      },
    });
    const hint = derivePolicyShapedAtlasShardHint(envelope);

    const narrowing = derivePolicyShapedAtlasShardLookupNarrowing(hint, [
      {
        regionId: "open",
        canonicalPrefix: "open",
        canonicalMergedText: "open src/main.ts",
        commandFamily: "parameterized_open",
        parameterType: "open",
      },
    ]);

    expect(narrowing.atlasShardNarrowingApplied).toBe(false);
    expect(narrowing.atlasShardNarrowingFallbackUsed).toBe(false);
    expect(narrowing.atlasShardNarrowingReasonCodes).toContain("atlas_shard_narrowing_not_needed");
  });

  it("uses fallback when shard narrowing finds no matching candidate kind in a larger set", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 50,
      },
    });
    const hint = derivePolicyShapedAtlasShardHint(envelope);

    const narrowing = derivePolicyShapedAtlasShardLookupNarrowing(hint, [
      {
        regionId: "open",
        canonicalPrefix: "open",
        canonicalMergedText: "open src/main.ts",
        commandFamily: "parameterized_open",
        parameterType: "open",
      },
      {
        regionId: "open",
        canonicalPrefix: "open",
        canonicalMergedText: "open lib/app.py",
        commandFamily: "parameterized_open",
        parameterType: "open",
      },
    ]);

    expect(narrowing.atlasShardNarrowingApplied).toBe(false);
    expect(narrowing.atlasShardNarrowingFallbackUsed).toBe(true);
    expect(narrowing.atlasShardNarrowingCandidateCountBefore).toBe(2);
    expect(narrowing.atlasShardNarrowingCandidateCountAfter).toBe(2);
    expect(narrowing.atlasShardNarrowingReasonCodes).toContain("atlas_shard_narrowing_no_match_fallback");
  });
});
