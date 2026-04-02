import {
  VOICE_SEMANTIC_WARM_DECAY_WINDOW_MS,
  VOICE_SEMANTIC_WARM_HIT_STRONG_THRESHOLD,
  VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD,
  VOICE_SEMANTIC_WARM_POLICY_VERSION,
  VOICE_SEMANTIC_WARM_STALE_MS,
  VoiceSemanticAddressRegistry,
} from "../../main/runtime/voice-semantic-address-registry";

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
    expect(lookup.weakThreshold).toBe(VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD);
    expect(lookup.strongThreshold).toBe(VOICE_SEMANTIC_WARM_HIT_STRONG_THRESHOLD);
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
    expect(conflicted.weakThreshold).toBe(VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD);
    expect(conflicted.strongThreshold).toBe(VOICE_SEMANTIC_WARM_HIT_STRONG_THRESHOLD);
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

});
