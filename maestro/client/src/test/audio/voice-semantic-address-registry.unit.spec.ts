import {
  VOICE_SEMANTIC_WARM_DECAY_WINDOW_MS,
  VOICE_SEMANTIC_WARM_HIT_STRONG_THRESHOLD,
  VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD,
  VOICE_SEMANTIC_WARM_NUMERIC_STRONG_THRESHOLD,
  VOICE_SEMANTIC_WARM_NUMERIC_WEAK_THRESHOLD,
  VOICE_SEMANTIC_WARM_OPEN_STRONG_THRESHOLD,
  VOICE_SEMANTIC_WARM_OPEN_STALE_MS,
  VOICE_SEMANTIC_WARM_OPEN_WEAK_THRESHOLD,
  VOICE_SEMANTIC_WARM_POLICY_VERSION,
  VOICE_SEMANTIC_WARM_STALE_MS,
  VoiceSemanticAddressRegistry,
} from "../../main/runtime/voice-semantic-address-registry";
import {
  FOCUS_CONTEXT_LEGALITY_UNLAWFUL_PENALTY,
  buildFocusConditionedCommandContext,
} from "../../main/runtime/focus-conditioned-command-context";
import { derivePolicyShapedAtlasShardHint } from "../../main/runtime/policy-shaped-atlas-shards";
import { deriveMultiResolutionAtlasPlan } from "../../main/runtime/multi-resolution-atlas";

describe("VoiceSemanticAddressRegistry", () => {
  it("registers governed v1 command trajectories and returns warm lookup hits", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-1",
      source: "spectral_manifold",
      regionId: "go to line",
      commandClass: "parameterized",
      parameterType: "numeric",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.91,
      frameCount: 99,
    });

    const first = registry.registerFromGovernedExecution({
      chunkId: "chunk-1",
      transcript: "go to line fifty two",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    expect(first).not.toBeNull();
    expect(first?.canonicalMergedText).toBe("go to line 52");
    expect(first?.slotSignature).toBe("goto_line:52");
    expect(first?.successCount).toBe(1);

    const lookup = registry.lookup({
      chunkId: "chunk-2",
      regionId: "go to line",
      parameterType: "numeric",
      transcriptTailHint: "52",
    });
    expect(lookup.lookupCandidateCount).toBeGreaterThan(0);
    expect(lookup.bestCandidateId).toBe(first?.semanticAddressId);
    expect(lookup.bestCanonicalMergedText).toBe("go to line 52");
    expect(lookup.warmHitClass === "strong" || lookup.warmHitClass === "weak").toBe(true);
    expect(lookup.lookupPath).toBe("slot_signature_index");
    expect(lookup.confidencePolicyVersion).toBe(VOICE_SEMANTIC_WARM_POLICY_VERSION);
    expect(lookup.weakThreshold).toBe(VOICE_SEMANTIC_WARM_NUMERIC_WEAK_THRESHOLD);
    expect(lookup.strongThreshold).toBe(VOICE_SEMANTIC_WARM_NUMERIC_STRONG_THRESHOLD);
  });

  it("does not register when governance is not granted", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-3",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.89,
      frameCount: 80,
    });

    const blocked = registry.registerFromGovernedExecution({
      chunkId: "chunk-3",
      transcript: "open wikipedia dot org",
      policyGranted: false,
      h23StepCount: 3,
      h24FinalGranted: false,
    });

    expect(blocked).toBeNull();
    const lookup = registry.lookup({
      chunkId: "chunk-4",
      regionId: "open",
      parameterType: "open",
      transcriptTailHint: "wikipedia.org",
    });
    expect(lookup.warmHitClass).toBe("miss");
    expect(lookup.lookupPath).toBe("candidate_scan");
  });

  it("refreshes existing semantic address on repeat governed success", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-r1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.9,
      frameCount: 77,
    });
    const first = registry.registerFromGovernedExecution({
      chunkId: "chunk-r1",
      transcript: "open wikipedia dot org",
      policyGranted: true,
      h23StepCount: 3,
      h24FinalGranted: true,
    });
    expect(first).not.toBeNull();
    expect(first?.successCount).toBe(1);

    registry.markGeometricContext({
      chunkId: "chunk-r2",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.92,
      frameCount: 79,
    });
    const refreshed = registry.registerFromGovernedExecution({
      chunkId: "chunk-r2",
      transcript: "open wikipedia dot org",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });
    expect(refreshed).not.toBeNull();
    expect(refreshed?.semanticAddressId).toBe(first?.semanticAddressId);
    expect(refreshed?.successCount).toBe(2);
    expect(refreshed?.lastSuccessChunkId).toBe("chunk-r2");
  });

  it("returns warm miss on atlas incompatibility and cleanly continues", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-a1",
      source: "spectral_manifold",
      regionId: "pause",
      commandClass: "reflex",
      parameterType: null,
      atlasVersion: "atlas-v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 16,
    });
    const registered = registry.registerFromGovernedExecution({
      chunkId: "chunk-a1",
      transcript: "pause",
      policyGranted: true,
      h23StepCount: 2,
      h24FinalGranted: true,
    });
    expect(registered).not.toBeNull();

    const mismatch = registry.lookup({
      chunkId: "chunk-a2",
      regionId: "pause",
      parameterType: null,
      atlasVersion: "atlas-v2",
      atlasSchema: "h3_command_atlas_v1",
    });
    expect(mismatch.warmHitClass).toBe("miss");
    expect(mismatch.bestCanonicalMergedText).toBe("pause");
    expect(mismatch.mismatchReason).toBe("warm_miss_atlas_incompatible");
    expect(mismatch.lookupPath).toBe("slot_signature_index");
  });

  it("uses provisional warm thresholds and measures slot-index acceleration", () => {
    const registry = new VoiceSemanticAddressRegistry();
    expect(VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD).toBeGreaterThan(0.7);
    expect(VOICE_SEMANTIC_WARM_HIT_STRONG_THRESHOLD).toBeGreaterThan(
      VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD
    );

    registry.markGeometricContext({
      chunkId: "chunk-t1",
      source: "spectral_manifold",
      regionId: "pause",
      commandClass: "reflex",
      parameterType: null,
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.98,
      frameCount: 20,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-t1",
      transcript: "pause",
      policyGranted: true,
      h23StepCount: 2,
      h24FinalGranted: true,
    });

    registry.markGeometricContext({
      chunkId: "chunk-t2",
      source: "spectral_manifold",
      regionId: "go to line",
      commandClass: "parameterized",
      parameterType: "numeric",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.97,
      frameCount: 90,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-t2",
      transcript: "go to line fifty two",
      policyGranted: true,
      h23StepCount: 5,
      h24FinalGranted: true,
    });

    // Add noise entries to make candidate scans expensive.
    for (let i = 0; i < 200; i += 1) {
      registry.markGeometricContext({
        chunkId: `chunk-noise-${i}`,
        source: "spectral_manifold",
        regionId: "open",
        commandClass: "parameterized",
        parameterType: "open",
        atlasVersion: "v1",
        atlasSchema: "h3_command_atlas_v1",
        confidence: 0.9,
        frameCount: 30,
      });
      registry.registerFromGovernedExecution({
        chunkId: `chunk-noise-${i}`,
        transcript: `open site${i}.example`,
        policyGranted: true,
        h23StepCount: 3,
        h24FinalGranted: true,
      });
    }

    const loops = 1000;
    const measure = (fn: () => void): number => {
      const start = process.hrtime.bigint();
      for (let i = 0; i < loops; i += 1) {
        fn();
      }
      const elapsedNs = process.hrtime.bigint() - start;
      return Number(elapsedNs) / loops;
    };

    const pauseSlotNs = measure(() => {
      registry.lookup({
        chunkId: "bench-pause-slot",
        regionId: "pause",
        parameterType: null,
      });
    });
    const pauseScanNs = measure(() => {
      registry.lookup({
        chunkId: "bench-pause-scan",
        regionId: "pause",
        parameterType: null,
        forceCandidateScan: true,
      });
    });
    const numericSlotNs = measure(() => {
      registry.lookup({
        chunkId: "bench-num-slot",
        regionId: "go to line",
        parameterType: "numeric",
        transcriptTailHint: "fifty two",
      });
    });
    const numericScanNs = measure(() => {
      registry.lookup({
        chunkId: "bench-num-scan",
        regionId: "go to line",
        parameterType: "numeric",
        transcriptTailHint: "fifty two",
        forceCandidateScan: true,
      });
    });

    expect(pauseSlotNs).toBeLessThan(pauseScanNs);
    expect(numericSlotNs).toBeLessThan(numericScanNs);
  });

  it("uses family-specific warm thresholds for numeric vs open command families", () => {
    const registry = new VoiceSemanticAddressRegistry();
    const originalNow = Date.now;
    const baseNow = 1_700_000_200_000;
    Date.now = jest.fn(() => baseNow);
    try {
      registry.markGeometricContext({
        chunkId: "chunk-fn-1",
        source: "spectral_manifold",
        regionId: "go to line",
        commandClass: "parameterized",
        parameterType: "numeric",
        atlasVersion: "v1",
        atlasSchema: "h3_command_atlas_v1",
        confidence: 0.95,
        frameCount: 88,
      });
      const numericRecord = registry.registerFromGovernedExecution({
        chunkId: "chunk-fn-1",
        transcript: "go to line fifty two",
        policyGranted: true,
        h23StepCount: 4,
        h24FinalGranted: true,
      });

      registry.markGeometricContext({
        chunkId: "chunk-fo-1",
        source: "spectral_manifold",
        regionId: "open",
        commandClass: "parameterized",
        parameterType: "open",
        atlasVersion: "v1",
        atlasSchema: "h3_command_atlas_v1",
        confidence: 0.95,
        frameCount: 88,
      });
      const openRecord = registry.registerFromGovernedExecution({
        chunkId: "chunk-fo-1",
        transcript: "open wikipedia dot org",
        policyGranted: true,
        h23StepCount: 4,
        h24FinalGranted: true,
      });

      expect(numericRecord).not.toBeNull();
      expect(openRecord).not.toBeNull();

      const numericBaseline = registry.lookup({
        chunkId: "chunk-fn-2",
        regionId: "go to line",
        parameterType: "numeric",
        transcriptTailHint: "52",
      });
      const openBaseline = registry.lookup({
        chunkId: "chunk-fo-2",
        regionId: "open",
        parameterType: "open",
        transcriptTailHint: "wikipedia.org",
      });

      expect(numericBaseline.weakThreshold).toBe(VOICE_SEMANTIC_WARM_NUMERIC_WEAK_THRESHOLD);
      expect(numericBaseline.strongThreshold).toBe(VOICE_SEMANTIC_WARM_NUMERIC_STRONG_THRESHOLD);
      expect(openBaseline.weakThreshold).toBe(VOICE_SEMANTIC_WARM_OPEN_WEAK_THRESHOLD);
      expect(openBaseline.strongThreshold).toBe(VOICE_SEMANTIC_WARM_OPEN_STRONG_THRESHOLD);
      expect(numericBaseline.warmHitClass).toBe("strong");
      expect(openBaseline.warmHitClass).toBe("strong");

      registry.markWarmConflict(numericRecord!.semanticAddressId);
      registry.markWarmConflict(openRecord!.semanticAddressId);

      const numericConflicted = registry.lookup({
        chunkId: "chunk-fn-3",
        regionId: "go to line",
        parameterType: "numeric",
        transcriptTailHint: "52",
      });
      const openConflicted = registry.lookup({
        chunkId: "chunk-fo-3",
        regionId: "open",
        parameterType: "open",
        transcriptTailHint: "wikipedia.org",
      });

      expect(numericConflicted.recentConflictPenaltyApplied).toBe(true);
      expect(openConflicted.recentConflictPenaltyApplied).toBe(true);
      expect(numericConflicted.bestCandidateScore).not.toBeNull();
      expect(openConflicted.bestCandidateScore).not.toBeNull();
      expect(numericConflicted.warmHitClass).toBe("weak");
      expect(openConflicted.warmHitClass).toBe("miss");
      expect(numericConflicted.bestCandidateScore!).toBeGreaterThan(openConflicted.bestCandidateScore!);
      expect(openConflicted.mismatchReason).toBe("warm_miss_conflict_penalized");
    } finally {
      Date.now = originalNow;
    }
  });

  it("applies earlier stale protection to open warm entries than numeric ones", () => {
    const registry = new VoiceSemanticAddressRegistry();
    const originalNow = Date.now;
    const baseNow = 1_700_000_300_000;
    Date.now = jest.fn(() => baseNow);
    try {
      registry.markGeometricContext({
        chunkId: "chunk-stale-num-1",
        source: "spectral_manifold",
        regionId: "go to line",
        commandClass: "parameterized",
        parameterType: "numeric",
        atlasVersion: "v1",
        atlasSchema: "h3_command_atlas_v1",
        confidence: 0.95,
        frameCount: 88,
      });
      registry.registerFromGovernedExecution({
        chunkId: "chunk-stale-num-1",
        transcript: "go to line fifty two",
        policyGranted: true,
        h23StepCount: 4,
        h24FinalGranted: true,
      });

      registry.markGeometricContext({
        chunkId: "chunk-stale-open-1",
        source: "spectral_manifold",
        regionId: "open",
        commandClass: "parameterized",
        parameterType: "open",
        atlasVersion: "v1",
        atlasSchema: "h3_command_atlas_v1",
        confidence: 0.95,
        frameCount: 88,
      });
      registry.registerFromGovernedExecution({
        chunkId: "chunk-stale-open-1",
        transcript: "open wikipedia dot org",
        policyGranted: true,
        h23StepCount: 4,
        h24FinalGranted: true,
      });

      expect(VOICE_SEMANTIC_WARM_OPEN_STALE_MS).toBeLessThan(VOICE_SEMANTIC_WARM_STALE_MS);
      Date.now = jest.fn(() => baseNow + VOICE_SEMANTIC_WARM_OPEN_STALE_MS + 1);

      const openLookup = registry.lookup({
        chunkId: "chunk-stale-open-2",
        regionId: "open",
        parameterType: "open",
        transcriptTailHint: "wikipedia.org",
      });
      const numericLookup = registry.lookup({
        chunkId: "chunk-stale-num-2",
        regionId: "go to line",
        parameterType: "numeric",
        transcriptTailHint: "52",
      });

      expect(openLookup.warmHitClass).toBe("miss");
      expect(openLookup.staleProtectionApplied).toBe(true);
      expect(openLookup.mismatchReason).toBe("warm_miss_stale_protection");
      expect(numericLookup.staleProtectionApplied).toBe(false);
      expect(numericLookup.warmHitClass).not.toBe("miss");
    } finally {
      Date.now = originalNow;
    }
  });

  it("demotes warm confidence after a recent live-truth override conflict", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-c1",
      source: "spectral_manifold",
      regionId: "go to line",
      commandClass: "parameterized",
      parameterType: "numeric",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 99,
    });

    const record = registry.registerFromGovernedExecution({
      chunkId: "chunk-c1",
      transcript: "go to line fifty two",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    expect(record).not.toBeNull();
    const baseline = registry.lookup({
      chunkId: "chunk-c2",
      regionId: "go to line",
      parameterType: "numeric",
      transcriptTailHint: "52",
    });
    expect(baseline.warmHitClass).toBe("strong");
    expect(baseline.confidencePolicyVersion).toBe(VOICE_SEMANTIC_WARM_POLICY_VERSION);

    registry.markWarmConflict(record!.semanticAddressId);

    const conflicted = registry.lookup({
      chunkId: "chunk-c3",
      regionId: "go to line",
      parameterType: "numeric",
      transcriptTailHint: "52",
    });
    expect(conflicted.recentConflictPenaltyApplied).toBe(true);
    expect(conflicted.staleProtectionApplied).toBe(false);
    expect(conflicted.weakThreshold).toBe(VOICE_SEMANTIC_WARM_NUMERIC_WEAK_THRESHOLD);
    expect(conflicted.strongThreshold).toBe(VOICE_SEMANTIC_WARM_NUMERIC_STRONG_THRESHOLD);
    expect(conflicted.bestCandidateId).toBe(record!.semanticAddressId);
    expect(conflicted.bestCandidateScore).not.toBeNull();
    expect(conflicted.bestCandidateScore!).toBeLessThan(baseline.bestCandidateScore!);
    expect(["weak", "miss"]).toContain(conflicted.warmHitClass);
  });

  it("treats stale warm entries as advisory miss with stale protection", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-s1",
      source: "spectral_manifold",
      regionId: "pause",
      commandClass: "reflex",
      parameterType: null,
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.99,
      frameCount: 20,
    });

    const originalNow = Date.now;
    const baseNow = 1_700_000_000_000;
    Date.now = jest.fn(() => baseNow);
    try {
      registry.registerFromGovernedExecution({
        chunkId: "chunk-s1",
        transcript: "pause",
        policyGranted: true,
        h23StepCount: 2,
        h24FinalGranted: true,
      });
      Date.now = jest.fn(() => baseNow + VOICE_SEMANTIC_WARM_STALE_MS + 1);
      const stale = registry.lookup({
        chunkId: "chunk-s2",
        regionId: "pause",
        parameterType: null,
      });
      expect(stale.warmHitClass).toBe("miss");
      expect(stale.mismatchReason).toBe("warm_miss_stale_protection");
      expect(stale.staleProtectionApplied).toBe(true);
      expect(stale.recentConflictPenaltyApplied).toBe(false);
      expect(stale.confidencePolicyVersion).toBe(VOICE_SEMANTIC_WARM_POLICY_VERSION);
      expect(stale.candidateAgeMs).toBeGreaterThanOrEqual(VOICE_SEMANTIC_WARM_STALE_MS);
    } finally {
      Date.now = originalNow;
    }
  });

  it("applies bounded age decay before stale cutoff", () => {
    const registry = new VoiceSemanticAddressRegistry();
    const originalNow = Date.now;
    const baseNow = 1_700_000_100_000;
    Date.now = jest.fn(() => baseNow);
    try {
      registry.markGeometricContext({
        chunkId: "chunk-d1",
        source: "spectral_manifold",
        regionId: "go to line",
        commandClass: "parameterized",
        parameterType: "numeric",
        atlasVersion: "v1",
        atlasSchema: "h3_command_atlas_v1",
        confidence: 0.95,
        frameCount: 88,
      });
      registry.registerFromGovernedExecution({
        chunkId: "chunk-d1",
        transcript: "go to line fifty two",
        policyGranted: true,
        h23StepCount: 4,
        h24FinalGranted: true,
      });

      const fresh = registry.lookup({
        chunkId: "chunk-d2",
        regionId: "go to line",
        parameterType: "numeric",
        transcriptTailHint: "52",
      });
      Date.now = jest.fn(() => baseNow + VOICE_SEMANTIC_WARM_DECAY_WINDOW_MS);
      const decayed = registry.lookup({
        chunkId: "chunk-d3",
        regionId: "go to line",
        parameterType: "numeric",
        transcriptTailHint: "52",
      });
      expect(fresh.warmHitClass).toBe("strong");
      expect(decayed.bestCandidateScore).not.toBeNull();
      expect(decayed.bestCandidateScore!).toBeLessThan(fresh.bestCandidateScore!);
      expect(decayed.staleProtectionApplied).toBe(false);
      expect(decayed.mismatchReason).toBeNull();
    } finally {
      Date.now = originalNow;
    }
  });


  it("uses focus-conditioned recent task history to reshape open-command candidate ranking", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-open-1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.91,
      frameCount: 60,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-open-1",
      transcript: "open github dot com",
      policyGranted: true,
      h23StepCount: 3,
      h24FinalGranted: true,
    });
    registry.markGeometricContext({
      chunkId: "chunk-open-2",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.91,
      frameCount: 60,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-open-2",
      transcript: "open docs dot python dot org",
      policyGranted: true,
      h23StepCount: 3,
      h24FinalGranted: true,
    });

    const lookup = registry.lookup({
      chunkId: "chunk-open-lookup",
      regionId: "open",
      parameterType: "open",
      forceCandidateScan: true,
      focusContextEnvelope: buildFocusConditionedCommandContext({
        snapshot: {
          appId: "chrome",
          regionId: "address-bar",
          controlId: "omnibox",
          focusConfidence: 0.94,
          authorityType: "verified",
          snapshotAgeMs: 35,
        },
        taskHistoryDelta: [
          { semanticAddressId: "sa-1", mergedText: "open github.com", outcome: "success", ageMs: 50 },
        ],
      }),
    });

    expect(lookup.bestCanonicalMergedText).toBe("open github.com");
    expect(lookup.focusRankingApplied).toBe(true);
    expect(lookup.focusRankingBoost).toBeGreaterThan(0);
    expect(lookup.focusRankingReasonCodes).toEqual(
      expect.arrayContaining(["browser_navigation_focus_context", "recent_task_exact_match"])
    );
  });

  it("keeps focus-conditioned ranking advisory-only when context is ineligible", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-open-3",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.91,
      frameCount: 60,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-open-3",
      transcript: "open github dot com",
      policyGranted: true,
      h23StepCount: 3,
      h24FinalGranted: true,
    });

    const lookup = registry.lookup({
      chunkId: "chunk-open-lookup-2",
      regionId: "open",
      parameterType: "open",
      forceCandidateScan: true,
      focusContextEnvelope: buildFocusConditionedCommandContext({
        snapshot: {
          appId: "chrome",
          regionId: "address-bar",
          focusConfidence: 0.94,
          authorityType: "heuristic",
          snapshotAgeMs: 35,
        },
        taskHistoryDelta: [
          { semanticAddressId: "sa-1", mergedText: "open github.com", outcome: "success", ageMs: 50 },
        ],
      }),
    });

    expect(lookup.focusRankingApplied).toBe(false);
    expect(lookup.focusRankingBoost).toBe(0);
    expect(lookup.focusRankingReasonCodes).toContain("focus_context_ineligible");
  });

  it("applies a deictic legality penalty for open it when focus context is ineligible", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-deictic-open-1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.91,
      frameCount: 60,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-deictic-open-1",
      transcript: "open it",
      policyGranted: true,
      h23StepCount: 3,
      h24FinalGranted: true,
    });

    const lawful = registry.lookup({
      chunkId: "chunk-deictic-open-lookup-lawful",
      regionId: "open",
      parameterType: "open",
      forceCandidateScan: true,
      focusContextEnvelope: buildFocusConditionedCommandContext({
        snapshot: {
          appId: "code",
          regionId: "editor",
          controlId: "text-buffer",
          hasSelection: true,
          selectionTextLength: 5,
          focusConfidence: 0.95,
          authorityType: "verified",
          snapshotAgeMs: 20,
        },
      }),
    });

    const unlawful = registry.lookup({
      chunkId: "chunk-deictic-open-lookup-unlawful",
      regionId: "open",
      parameterType: "open",
      forceCandidateScan: true,
      focusContextEnvelope: buildFocusConditionedCommandContext({
        snapshot: {
          appId: "code",
          regionId: "editor",
          focusConfidence: 0.95,
          authorityType: "heuristic",
          snapshotAgeMs: 20,
        },
      }),
    });

    expect(lawful.bestCanonicalMergedText).toBe("open it");
    expect(lawful.focusLegalityApplied).toBe(true);
    expect(lawful.focusLegalityLawful).toBe(true);
    expect(lawful.focusLegalityPenaltyApplied).toBe(false);
    expect(lawful.focusLegalityPenalty).toBe(0);
    expect(lawful.focusLegalityCommandKind).toBe("open_it");
    expect(lawful.focusLegalityReasonCodes).toContain("deictic_selection_anchor");

    expect(unlawful.bestCanonicalMergedText).toBe("open it");
    expect(unlawful.focusLegalityApplied).toBe(true);
    expect(unlawful.focusLegalityLawful).toBe(false);
    expect(unlawful.focusLegalityPenaltyApplied).toBe(true);
    expect(unlawful.focusLegalityPenalty).toBe(FOCUS_CONTEXT_LEGALITY_UNLAWFUL_PENALTY);
    expect(unlawful.focusLegalityCommandKind).toBe("open_it");
    expect(unlawful.focusLegalityReasonCodes).toContain("focus_context_ineligible");
    expect(unlawful.bestCandidateScore).not.toBeNull();
    expect(lawful.bestCandidateScore).not.toBeNull();
    expect(unlawful.bestCandidateScore!).toBeLessThan(lawful.bestCandidateScore!);
  });

  it("marks go there deictic legality through lookup metadata", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-deictic-go-1",
      source: "spectral_manifold",
      regionId: "go to",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.91,
      frameCount: 60,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-deictic-go-1",
      transcript: "go there",
      policyGranted: true,
      h23StepCount: 3,
      h24FinalGranted: true,
    });

    const lookup = registry.lookup({
      chunkId: "chunk-deictic-go-lookup",
      regionId: "go to",
      parameterType: "open",
      forceCandidateScan: true,
      focusContextEnvelope: buildFocusConditionedCommandContext({
        snapshot: {
          appId: "chrome",
          windowId: "window-1",
          regionId: "tab-strip",
          focusConfidence: 0.96,
          authorityType: "verified",
          snapshotAgeMs: 25,
        },
      }),
    });

    expect(lookup.bestCanonicalMergedText).toBeNull();
    expect(lookup.focusLegalityApplied).toBe(false);
    expect(lookup.focusLegalityLawful).toBeNull();
    expect(lookup.focusLegalityPenaltyApplied).toBe(false);
    expect(lookup.focusLegalityCommandKind).toBeNull();
    expect(lookup.focusLegalityReasonCodes).toContain("focus_legality_not_evaluated");
  });


  it("uses task-history momentum to favor recent semantic-address reuse during lookup", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-momentum-open-1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.91,
      frameCount: 60,
    });
    const record1 = registry.registerFromGovernedExecution({
      chunkId: "chunk-momentum-open-1",
      transcript: "open github.com",
      policyGranted: true,
      h23StepCount: 3,
      h24FinalGranted: true,
    });
    registry.markGeometricContext({
      chunkId: "chunk-momentum-open-2",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.91,
      frameCount: 60,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-momentum-open-2",
      transcript: "open docs dot python dot org",
      policyGranted: true,
      h23StepCount: 3,
      h24FinalGranted: true,
    });

    const lookup = registry.lookup({
      chunkId: "chunk-momentum-open-lookup",
      regionId: "open",
      parameterType: "open",
      forceCandidateScan: true,
      focusContextEnvelope: buildFocusConditionedCommandContext({
        snapshot: {
          appId: "chrome",
          regionId: "address-bar",
          controlId: "omnibox",
          focusConfidence: 0.94,
          authorityType: "verified",
          snapshotAgeMs: 35,
        },
        taskHistoryDelta: [
          {
            semanticAddressId: record1!.semanticAddressId,
            mergedText: "open github.com",
            outcome: "success",
            ageMs: 40,
          },
        ],
      }),
    });

    expect(lookup.bestCanonicalMergedText).toBe("open github.com");
    expect(lookup.focusTaskMomentumApplied).toBe(true);
    expect(lookup.focusTaskMomentumBoost).toBeGreaterThan(0);
    expect(lookup.focusTaskMomentumPenaltyApplied).toBe(false);
    expect(lookup.focusTaskMomentumMatchedSemanticAddressId).toBe(record1!.semanticAddressId);
    expect(lookup.focusTaskMomentumReasonCodes).toContain("recent_semantic_reuse");
  });

  it("applies a bounded task-history momentum penalty when the same action was recently undone", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-momentum-numeric-1",
      source: "spectral_manifold",
      regionId: "go to line",
      commandClass: "parameterized",
      parameterType: "numeric",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.94,
      frameCount: 80,
    });
    const record = registry.registerFromGovernedExecution({
      chunkId: "chunk-momentum-numeric-1",
      transcript: "go to line fifty two",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    const lookup = registry.lookup({
      chunkId: "chunk-momentum-numeric-lookup",
      regionId: "go to line",
      parameterType: "numeric",
      transcriptTailHint: "52",
      focusContextEnvelope: buildFocusConditionedCommandContext({
        snapshot: {
          appId: "code",
          regionId: "editor",
          controlId: "text-buffer",
          focusConfidence: 0.96,
          authorityType: "verified",
          snapshotAgeMs: 20,
        },
        taskHistoryDelta: [
          {
            semanticAddressId: record!.semanticAddressId,
            mergedText: "go to line 52",
            outcome: "undone",
            ageMs: 30,
          },
        ],
      }),
    });

    expect(lookup.bestCanonicalMergedText).toBe("go to line 52");
    expect(lookup.focusTaskMomentumApplied).toBe(true);
    expect(lookup.focusTaskMomentumBoost).toBe(0);
    expect(lookup.focusTaskMomentumPenaltyApplied).toBe(true);
    expect(lookup.focusTaskMomentumPenalty).toBeGreaterThan(0);
    expect(lookup.focusTaskMomentumReasonCodes).toContain("recent_undo_inhibits_reuse");
  });


  it("applies a bounded browser shard ranking boost for browser-like open candidates", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-shard-browser-1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 60,
    });
    const browserRecord = registry.registerFromGovernedExecution({
      chunkId: "chunk-shard-browser-1",
      transcript: "open github.com",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });
    registry.markGeometricContext({
      chunkId: "chunk-shard-browser-2",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 60,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-shard-browser-2",
      transcript: "open src/main.ts",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

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

    const lookup = registry.lookup({
      chunkId: "chunk-shard-browser-lookup",
      regionId: "open",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      focusContextEnvelope: envelope,
      atlasShardHint: derivePolicyShapedAtlasShardHint(envelope),
    });

    expect(lookup.bestCandidateId).toBe(browserRecord!.semanticAddressId);
    expect(lookup.atlasShardRankingApplied).toBe(true);
    expect(lookup.atlasShardRankingBoost).toBeGreaterThan(0);
    expect(lookup.atlasShardRankingReasonCodes).toContain("atlas_shard_browser_target_match");
    expect(lookup.atlasShardRankingCandidateKind).toBe("browser_target");
  });

  it("keeps shard-aware ranking advisory when the shard hint is global default", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-shard-global-1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 60,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-shard-global-1",
      transcript: "open notes.txt",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "notion",
        regionId: "document",
        controlId: "body",
        focusConfidence: 0.9,
        authorityType: "verified",
        snapshotAgeMs: 40,
      },
    });

    const lookup = registry.lookup({
      chunkId: "chunk-shard-global-lookup",
      regionId: "open",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      focusContextEnvelope: envelope,
      atlasShardHint: derivePolicyShapedAtlasShardHint(envelope),
    });

    expect(lookup.atlasShardRankingApplied).toBe(false);
    expect(lookup.atlasShardRankingBoost).toBe(0);
    expect(lookup.atlasShardRankingReasonCodes).toContain("atlas_shard_global_default_no_adjustment");
  });

  it("applies bounded browser shard narrowing during candidate scan before ranking", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-shard-narrow-browser-1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 60,
    });
    const browserRecord = registry.registerFromGovernedExecution({
      chunkId: "chunk-shard-narrow-browser-1",
      transcript: "open github dot com",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });
    registry.markGeometricContext({
      chunkId: "chunk-shard-narrow-browser-2",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 60,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-shard-narrow-browser-2",
      transcript: "open stack overflow",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 30,
      },
    });

    const lookup = registry.lookup({
      chunkId: "chunk-shard-narrow-browser-lookup",
      regionId: "open",
      parameterType: "open",
      forceCandidateScan: true,
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      focusContextEnvelope: envelope,
      atlasShardHint: derivePolicyShapedAtlasShardHint(envelope),
    });

    expect(lookup.bestCandidateId).toBe(browserRecord!.semanticAddressId);
    expect(lookup.atlasShardNarrowingApplied).toBe(true);
    expect(lookup.atlasShardNarrowingFallbackUsed).toBe(false);
    expect(lookup.atlasShardNarrowingCandidateCountBefore).toBe(2);
    expect(lookup.atlasShardNarrowingCandidateCountAfter).toBe(1);
    expect(lookup.atlasShardNarrowingReasonCodes).toContain(
      "atlas_shard_narrowing_browser_navigation_candidate_kind_filter"
    );
    expect(lookup.atlasShardNarrowingAllowedCandidateKinds).toEqual(["browser_target"]);
  });

  it("keeps shard narrowing advisory by falling back when no matching kind exists", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-shard-narrow-fallback-1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 60,
    });
    const firstRecord = registry.registerFromGovernedExecution({
      chunkId: "chunk-shard-narrow-fallback-1",
      transcript: "open stack overflow",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });
    registry.markGeometricContext({
      chunkId: "chunk-shard-narrow-fallback-2",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 60,
    });
    const secondRecord = registry.registerFromGovernedExecution({
      chunkId: "chunk-shard-narrow-fallback-2",
      transcript: "open settings",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    expect(firstRecord).not.toBeNull();
    expect(secondRecord).not.toBeNull();

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 30,
      },
    });

    const lookup = registry.lookup({
      chunkId: "chunk-shard-narrow-fallback-lookup",
      regionId: "open",
      parameterType: "open",
      forceCandidateScan: true,
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      focusContextEnvelope: envelope,
      atlasShardHint: derivePolicyShapedAtlasShardHint(envelope),
    });

    expect(lookup.atlasShardNarrowingApplied).toBe(false);
    expect(lookup.atlasShardNarrowingFallbackUsed).toBe(true);
    expect(lookup.atlasShardNarrowingCandidateCountBefore).toBe(2);
    expect(lookup.atlasShardNarrowingCandidateCountAfter).toBe(2);
    expect(lookup.atlasShardNarrowingReasonCodes).toContain("atlas_shard_narrowing_no_match_fallback");
    expect(lookup.bestCandidateId).not.toBeNull();
  });

  it("applies advisory family-atlas routing boost for matching browser open family", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-family-open-1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.9,
      frameCount: 32,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-family-open-1",
      transcript: "open github.com",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 25,
      },
    });
    const shardHint = derivePolicyShapedAtlasShardHint(envelope);
    const routePlan = deriveMultiResolutionAtlasPlan(shardHint, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
    });

    const lookup = registry.lookup({
      chunkId: "chunk-family-open-lookup",
      regionId: "open",
      parameterType: "open",
      transcriptTailHint: "github.com",
      forceCandidateScan: true,
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      focusContextEnvelope: envelope,
      atlasShardHint: shardHint,
      multiResolutionAtlasPlan: routePlan,
    });

    expect(lookup.multiResolutionAtlasFamilyRoutingApplied).toBe(true);
    expect(lookup.multiResolutionAtlasFamilyRoutingBoost).toBeGreaterThan(0);
    expect(lookup.multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId).toBe(
      "parameterized_open_family"
    );
    expect(lookup.multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId).toBe(
      "parameterized_open_family"
    );
  });

  it("keeps advisory no-boost when multi-resolution family route does not match candidate family", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-family-num-1",
      source: "spectral_manifold",
      regionId: "go to line",
      commandClass: "parameterized",
      parameterType: "numeric",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.9,
      frameCount: 32,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-family-num-1",
      transcript: "go to line fifty two",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 25,
      },
    });
    const shardHint = derivePolicyShapedAtlasShardHint(envelope);
    const routePlan = deriveMultiResolutionAtlasPlan(shardHint, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
    });

    const lookup = registry.lookup({
      chunkId: "chunk-family-num-lookup",
      regionId: "go to line",
      parameterType: "numeric",
      transcriptTailHint: "52",
      forceCandidateScan: true,
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      focusContextEnvelope: envelope,
      atlasShardHint: shardHint,
      multiResolutionAtlasPlan: routePlan,
    });

    expect(lookup.multiResolutionAtlasFamilyRoutingApplied).toBe(false);
    expect(lookup.multiResolutionAtlasFamilyRoutingBoost).toBe(0);
    expect(lookup.multiResolutionAtlasFamilyRoutingReasonCodes).toContain(
      "multi_resolution_family_no_match"
    );
  });


  it("applies advisory prefix-band routing boost when family-atlas candidate pool contains matching open prefix", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-prefix-open-1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.9,
      frameCount: 32,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-prefix-open-1",
      transcript: "open github dot com",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });
    registry.markGeometricContext({
      chunkId: "chunk-prefix-open-2",
      source: "spectral_manifold",
      regionId: "go to",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.9,
      frameCount: 32,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-prefix-open-2",
      transcript: "go to github dot com",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 25,
      },
    });
    const shardHint = derivePolicyShapedAtlasShardHint(envelope);
    const routePlan = deriveMultiResolutionAtlasPlan(shardHint, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
    });

    const lookup = registry.lookup({
      chunkId: "chunk-prefix-open-lookup",
      regionId: "open",
      parameterType: "open",
      transcriptTailHint: "github.com",
      forceCandidateScan: true,
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      focusContextEnvelope: envelope,
      atlasShardHint: shardHint,
      multiResolutionAtlasPlan: routePlan,
    });

    expect(lookup.lookupCandidateCount).toBeGreaterThanOrEqual(2);
    expect(lookup.bestCanonicalMergedText).toBe("open github.com");
    expect(lookup.multiResolutionAtlasPrefixBandRoutingApplied).toBe(true);
    expect(lookup.multiResolutionAtlasPrefixBandRoutingBoost).toBeGreaterThan(0);
    expect(lookup.multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId).toBe("prefix_open");
    expect(lookup.multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId).toBe("prefix_open");
  });

  it("keeps advisory no-boost when prefix band does not match candidate in family-atlas pool", () => {
    const registry = new VoiceSemanticAddressRegistry();
    registry.markGeometricContext({
      chunkId: "chunk-prefix-go-1",
      source: "spectral_manifold",
      regionId: "go to",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.9,
      frameCount: 32,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-prefix-go-1",
      transcript: "go to docs.python.org",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 25,
      },
    });
    const shardHint = derivePolicyShapedAtlasShardHint(envelope);
    const routePlan = deriveMultiResolutionAtlasPlan(shardHint, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open docs.python.org",
    });

    const lookup = registry.lookup({
      chunkId: "chunk-prefix-go-lookup",
      regionId: "open",
      parameterType: "open",
      transcriptTailHint: "docs.python.org",
      forceCandidateScan: true,
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      focusContextEnvelope: envelope,
      atlasShardHint: shardHint,
      multiResolutionAtlasPlan: routePlan,
    });

    expect(lookup.bestCanonicalMergedText).toBe("go to docs.python.org");
    expect(lookup.multiResolutionAtlasPrefixBandRoutingApplied).toBe(false);
    expect(lookup.multiResolutionAtlasPrefixBandRoutingBoost).toBe(0);
    expect(lookup.multiResolutionAtlasPrefixBandRoutingReasonCodes).toContain(
      "multi_resolution_prefix_band_no_match"
    );
  });

  it("uses tail-strategy routing to favor locator-style open candidates when base scores tie", () => {
    const registry = new VoiceSemanticAddressRegistry();

    registry.markGeometricContext({
      chunkId: "chunk-tail-open-1",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 88,
    });
    const locatorRecord = registry.registerFromGovernedExecution({
      chunkId: "chunk-tail-open-1",
      transcript: "open github.com",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    registry.markGeometricContext({
      chunkId: "chunk-tail-open-2",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 88,
    });
    const symbolicRecord = registry.registerFromGovernedExecution({
      chunkId: "chunk-tail-open-2",
      transcript: "open settings",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    expect(locatorRecord).not.toBeNull();
    expect(symbolicRecord).not.toBeNull();

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-tail-1",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.94,
        authorityType: "verified",
        snapshotAgeMs: 20,
      },
    });
    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const plan = deriveMultiResolutionAtlasPlan(hint, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
    });

    const lookup = registry.lookup({
      chunkId: "lookup-tail-open-1",
      regionId: "open",
      parameterType: "open",
      transcriptTailHint: "",
      forceCandidateScan: true,
      multiResolutionAtlasPlan: plan,
    });

    expect(lookup.lookupPath).toBe("candidate_scan");
    expect(lookup.bestCandidateId).toBe(locatorRecord?.semanticAddressId ?? null);
    expect(lookup.multiResolutionAtlasTailStrategyRoutingApplied).toBe(true);
    expect(lookup.multiResolutionAtlasTailStrategyRoutingBoost).toBeGreaterThan(0);
    expect(lookup.multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId).toBe("open_locator_tail_v1");
    expect(lookup.multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId).toBe("open_locator_tail_v1");
  });

  it("keeps tail-strategy routing advisory when no candidate tail strategy matches", () => {
    const registry = new VoiceSemanticAddressRegistry();

    registry.markGeometricContext({
      chunkId: "chunk-tail-open-3",
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 88,
    });
    registry.registerFromGovernedExecution({
      chunkId: "chunk-tail-open-3",
      transcript: "open settings",
      policyGranted: true,
      h23StepCount: 4,
      h24FinalGranted: true,
    });

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-tail-2",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.94,
        authorityType: "verified",
        snapshotAgeMs: 20,
      },
    });
    const hint = derivePolicyShapedAtlasShardHint(envelope);
    const plan = deriveMultiResolutionAtlasPlan(hint, {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
    });

    const lookup = registry.lookup({
      chunkId: "lookup-tail-open-2",
      regionId: "open",
      parameterType: "open",
      transcriptTailHint: "",
      forceCandidateScan: true,
      multiResolutionAtlasPlan: plan,
    });

    expect(lookup.multiResolutionAtlasTailStrategyRoutingApplied).toBe(false);
    expect(lookup.multiResolutionAtlasTailStrategyRoutingBoost).toBe(0);
    expect(lookup.multiResolutionAtlasTailStrategyRoutingReasonCodes).toContain(
      "multi_resolution_tail_strategy_no_match"
    );
    expect(lookup.bestCandidateId).not.toBeNull();
  });

});
