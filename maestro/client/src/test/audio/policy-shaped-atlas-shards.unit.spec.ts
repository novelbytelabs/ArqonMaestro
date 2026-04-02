import {
  derivePolicyShapedAtlasShardEvidenceFields,
  derivePolicyShapedAtlasShardHint,
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
});
