import { buildFocusConditionedCommandContext } from "../../main/runtime/focus-conditioned-command-context";
import { derivePolicyShapedAtlasShardHint } from "../../main/runtime/policy-shaped-atlas-shards";
import {
  deriveMultiResolutionAtlasPlan,
  deriveMultiResolutionAtlasEvidenceFields,
  deriveMultiResolutionAtlasFamilyRoutingAdjustment,
  deriveMultiResolutionAtlasPrefixBandRoutingAdjustment,
  MULTI_RESOLUTION_ATLAS_POLICY_VERSION,
  MULTI_RESOLUTION_ATLAS_FAMILY_ROUTING_MAX_BOOST,
  MULTI_RESOLUTION_ATLAS_PREFIX_BAND_ROUTING_MAX_BOOST,
} from "../../main/runtime/multi-resolution-atlas";

describe("multi-resolution atlas", () => {
  it("derives browser/open route plan from an eligible browser shard hint", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-1",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.94,
        authorityType: "verified",
        snapshotAgeMs: 50,
      },
    });

    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const plan = deriveMultiResolutionAtlasPlan(hint, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
    });

    expect(plan.policyVersion).toBe(MULTI_RESOLUTION_ATLAS_POLICY_VERSION);
    expect(plan.multiResolutionAtlasEligible).toBe(true);
    expect(plan.multiResolutionAtlasCoarseRegionId).toBe("browser_surface");
    expect(plan.multiResolutionAtlasFamilyAtlasId).toBe("parameterized_open_family");
    expect(plan.multiResolutionAtlasPrefixBandId).toBe("prefix_open");
    expect(plan.multiResolutionAtlasTailStrategyId).toBe("open_tail_v1");
  });

  it("derives editor/numeric route plan from an eligible editor shard hint", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "code",
        windowId: "window-1",
        regionId: "editor",
        controlId: "editor",
        focusConfidence: 0.96,
        authorityType: "verified",
        snapshotAgeMs: 40,
      },
    });

    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const fields = deriveMultiResolutionAtlasEvidenceFields(hint, {
      regionId: "go to line",
      commandClass: "parameterized",
      parameterType: "numeric",
      canonicalMergedText: "go to line 52",
    });

    expect(fields.multiResolutionAtlasEligible).toBe(true);
    expect(fields.multiResolutionAtlasCoarseRegionId).toBe("editor_surface");
    expect(fields.multiResolutionAtlasFamilyAtlasId).toBe("parameterized_numeric_family");
    expect(fields.multiResolutionAtlasPrefixBandId).toBe("prefix_go_to_line");
    expect(fields.multiResolutionAtlasTailStrategyId).toBe("numeric_tail_v1");
  });

  it("returns not-eligible route fields when shard hint is absent", () => {
    const fields = deriveMultiResolutionAtlasEvidenceFields(null, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
    });

    expect(fields.multiResolutionAtlasEligible).toBe(false);
    expect(fields.multiResolutionAtlasCoarseRegionId).toBeNull();
    expect(fields.multiResolutionAtlasReasonCodes).toEqual(["multi_resolution_atlas_not_eligible"]);
  });

  it("applies bounded family-atlas routing boost for matching open family route", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-1",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.94,
        authorityType: "verified",
        snapshotAgeMs: 50,
      },
    });
    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const plan = deriveMultiResolutionAtlasPlan(hint, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
    });
    const routing = deriveMultiResolutionAtlasFamilyRoutingAdjustment(plan, {
      regionId: "open",
      commandFamily: "parameterized_open",
      parameterType: "open",
      canonicalPrefix: "open",
      canonicalMergedText: "open github.com",
    });
    expect(routing.multiResolutionAtlasFamilyRoutingApplied).toBe(true);
    expect(routing.multiResolutionAtlasFamilyRoutingBoost).toBe(
      MULTI_RESOLUTION_ATLAS_FAMILY_ROUTING_MAX_BOOST
    );
    expect(routing.multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId).toBe(
      "parameterized_open_family"
    );
  });

  it("falls back to advisory no-boost when candidate family does not match route family", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "code",
        windowId: "window-1",
        regionId: "editor",
        controlId: "editor",
        focusConfidence: 0.96,
        authorityType: "verified",
        snapshotAgeMs: 40,
      },
    });
    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const plan = deriveMultiResolutionAtlasPlan(hint, {
      regionId: "go to line",
      commandClass: "parameterized",
      parameterType: "numeric",
      canonicalMergedText: "go to line 52",
    });
    const routing = deriveMultiResolutionAtlasFamilyRoutingAdjustment(plan, {
      regionId: "open",
      commandFamily: "parameterized_open",
      parameterType: "open",
      canonicalPrefix: "open",
      canonicalMergedText: "open github.com",
    });
    expect(routing.multiResolutionAtlasFamilyRoutingApplied).toBe(false);
    expect(routing.multiResolutionAtlasFamilyRoutingBoost).toBe(0);
    expect(routing.multiResolutionAtlasFamilyRoutingReasonCodes).toContain(
      "multi_resolution_family_no_match"
    );
  });

  it("applies bounded prefix-band routing boost for matching open prefix band", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-1",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.94,
        authorityType: "verified",
        snapshotAgeMs: 50,
      },
    });
    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const plan = deriveMultiResolutionAtlasPlan(hint, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
    });
    const routing = deriveMultiResolutionAtlasPrefixBandRoutingAdjustment(plan, {
      regionId: "open",
      commandFamily: "parameterized_open",
      parameterType: "open",
      canonicalPrefix: "open",
      canonicalMergedText: "open github.com",
    });
    expect(routing.multiResolutionAtlasPrefixBandRoutingApplied).toBe(true);
    expect(routing.multiResolutionAtlasPrefixBandRoutingBoost).toBe(
      MULTI_RESOLUTION_ATLAS_PREFIX_BAND_ROUTING_MAX_BOOST
    );
    expect(routing.multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId).toBe("prefix_open");
    expect(routing.multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId).toBe("prefix_open");
  });

  it("keeps advisory no-boost when candidate prefix band does not match route prefix band", () => {
    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-1",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.94,
        authorityType: "verified",
        snapshotAgeMs: 50,
      },
    });
    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const plan = deriveMultiResolutionAtlasPlan(hint, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
    });
    const routing = deriveMultiResolutionAtlasPrefixBandRoutingAdjustment(plan, {
      regionId: "go to",
      commandFamily: "parameterized_open",
      parameterType: "open",
      canonicalPrefix: "go to",
      canonicalMergedText: "go to github.com",
    });
    expect(routing.multiResolutionAtlasPrefixBandRoutingApplied).toBe(false);
    expect(routing.multiResolutionAtlasPrefixBandRoutingBoost).toBe(0);
    expect(routing.multiResolutionAtlasPrefixBandRoutingReasonCodes).toContain(
      "multi_resolution_prefix_band_no_match"
    );
  });
});
