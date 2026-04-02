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
    expect(lookup.lookupPath).toBe("none");
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
    expect(lookup.focusLegalityPenaltyApplied).toBe(false);
    expect(lookup.focusLegalityCommandKind).toBeNull();
    expect(lookup.focusLegalityReasonCodes).toContain("focus_legality_not_evaluated");
  });

});
