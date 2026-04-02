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
import { buildFocusConditionedCommandContext } from "../../main/runtime/focus-conditioned-command-context";
import * as runtimeEvidence from "../../main/runtime/h3-runtime-evidence";

describe("ChunkManager H3 atlas shard evidence", () => {
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
      atlasVersion: "v1",
    });
    return { ChunkManager, manager };
  }

  it("carries advisory atlas shard hint metadata into runtime evidence", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-1",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.93,
        authorityType: "verified",
        snapshotAgeMs: 120,
      },
    });

    ChunkManager.prototype.setFocusConditionedCommandContextForChunk.call(manager, "chunk-1", envelope);
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_started", {
      governanceRequired: true,
      reason: "atlas_shard_hint_observational_only",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      event: "voice_semantic_address_lookup_started",
      chunkId: "chunk-1",
      atlasShardPolicyVersion: "3e2_policy_shaped_atlas_shards_v1",
      atlasShardHintId: "browser_navigation",
      atlasShardHintEligible: true,
      atlasShardHintSource: "focus_control",
      atlasShardReasonCodes: ["browser_control_shard"],
    }));
  });

  it("emits null shard fields when no focus context envelope is attached", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_started", {
      governanceRequired: true,
      reason: "atlas_shard_hint_absent",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      atlasShardPolicyVersion: null,
      atlasShardHintId: null,
      atlasShardHintEligible: null,
      atlasShardHintSource: null,
      atlasShardHintPriority: null,
      atlasShardReasonCodes: null,
    }));
  });
});
