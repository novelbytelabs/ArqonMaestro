
jest.mock("../../main/stt/cfh", () => ({
  SIG_BYTES: 128,
  SIG_U64S: 16,
  SplitMix64: class {
    nextU64() {
      return BigInt(0);
    }
    nextF32Signed() {
      return 0;
    }
  },
  normalizeCanonical: () => [],
  normalizeQuery: (q: string) => q,
  generateSignatureBytes: () => new Uint8Array(128),
  sigBytesToU64x16: () => new Array(16).fill(BigInt(0)),
  cfhScoreU64x16: () => 0,
  bucketFromSig: () => 0,
}));

import { h23Recorder } from "../../main/runtime/h23-live-trace-recorder";
import * as runtimeEvidence from "../../main/runtime/h3-runtime-evidence";

describe("ChunkManager H3 counterfactual repair evidence", () => {
  const originalGetTraceSnapshot = h23Recorder.getTraceSnapshot.bind(h23Recorder);
  const originalGetLatestDecision = h23Recorder.getLatestDecision.bind(h23Recorder);

  afterEach(() => {
    h23Recorder.getTraceSnapshot = originalGetTraceSnapshot;
    h23Recorder.getLatestDecision = originalGetLatestDecision;
    jest.restoreAllMocks();
  });

  function makeBareManager(): any {
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    const manager = Object.create(ChunkManager.prototype) as any;
    manager.chunkH3LatestGeometricEvent = new Map<string, any>();
    manager.chunkH3Route = new Map<string, any>();
    manager.chunkH3TailCaptureStartMs = new Map<string, number>();
    manager.chunkH3FocusContextEnvelope = new Map<string, any>();
    manager.chunkH3AtlasShardHint = new Map<string, any>();
    manager.relativeChunkNowMs = () => 111;
    manager.chunkH3Route.set("chunk-1", "geometric_prefix_asr_tail");
    manager.chunkH3LatestGeometricEvent.set("chunk-1", {
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
    });
    return { ChunkManager, manager };
  }

  it("emits advisory counterfactual repair fields when semantic lookup result is present", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      semanticAddressId: "open_github",
      canonicalMergedText: "open github.com",
      transcriptText: "open gi- github.com",
      reason: "counterfactual_repair_observational_only",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      counterfactualRepairSchemaVersion: "h3_counterfactual_repair_v1",
      counterfactualRepairPolicyVersion: "3g_counterfactual_repair_v1",
      counterfactualRepairEligible: true,
      counterfactualRepairPrimarySemanticAddressId: "open_github",
      counterfactualRepairNearestAlternativeCanonicalMergedText: "go to github.com",
      counterfactualRepairAmbiguityBand: "high",
      counterfactualRepairRepairSignal: "self_correction_hint",
      counterfactualRepairSource: "heuristic_shadow",
    }));
  });

  it("emits not-eligible counterfactual repair fields when no semantic result exists", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_started", {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      reason: "counterfactual_absent",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      counterfactualRepairSchemaVersion: "h3_counterfactual_repair_v1",
      counterfactualRepairPolicyVersion: "3g_counterfactual_repair_v1",
      counterfactualRepairEligible: false,
      counterfactualRepairPrimarySemanticAddressId: null,
      counterfactualRepairNearestAlternativeSemanticAddressId: null,
      counterfactualRepairSource: "none",
      counterfactualRepairReasonCodes: ["counterfactual_not_eligible"],
    }));
  });
});
