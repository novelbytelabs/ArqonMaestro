import { VoiceSemanticAddressRegistry } from "../../main/runtime/voice-semantic-address-registry";

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
  });
});
