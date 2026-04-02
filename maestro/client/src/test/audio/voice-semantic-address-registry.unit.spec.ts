import {
  VOICE_SEMANTIC_WARM_HIT_STRONG_THRESHOLD,
  VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD,
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
    expect(lookup.warmHitClass === "strong" || lookup.warmHitClass === "weak").toBe(true);
    expect(lookup.lookupPath).toBe("slot_signature_index");
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
});
