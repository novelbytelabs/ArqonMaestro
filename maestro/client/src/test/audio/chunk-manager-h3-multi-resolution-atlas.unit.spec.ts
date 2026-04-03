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

describe("ChunkManager H3 multi-resolution atlas evidence", () => {
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

  it("emits advisory multi-resolution atlas fields when focus-derived shard hint exists", () => {
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
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
      reason: "multi_resolution_atlas_observational_only",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      event: "voice_semantic_address_lookup_completed",
      multiResolutionAtlasSchemaVersion: "h3_multi_resolution_atlas_plan_v1",
      multiResolutionAtlasPolicyVersion: "3f_multi_resolution_atlas_v1",
      multiResolutionAtlasEligible: true,
      multiResolutionAtlasCoarseRegionId: "browser_surface",
      multiResolutionAtlasFamilyAtlasId: "parameterized_open_family",
      multiResolutionAtlasPrefixBandId: "prefix_open",
      multiResolutionAtlasTailStrategyId: "open_tail_v1",
      multiResolutionAtlasSource: "atlas_shard_hint",
    }));
  });

  it("emits not-eligible multi-resolution atlas fields when no shard hint exists", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_started", {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
      reason: "multi_resolution_atlas_absent",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      multiResolutionAtlasSchemaVersion: "h3_multi_resolution_atlas_plan_v1",
      multiResolutionAtlasPolicyVersion: "3f_multi_resolution_atlas_v1",
      multiResolutionAtlasEligible: false,
      multiResolutionAtlasCoarseRegionId: null,
      multiResolutionAtlasFamilyAtlasId: null,
      multiResolutionAtlasPrefixBandId: null,
      multiResolutionAtlasTailStrategyId: null,
      multiResolutionAtlasSource: "none",
      multiResolutionAtlasReasonCodes: ["multi_resolution_atlas_not_eligible"],
    }));
  });

  it("emits family-atlas routing metadata on lookup-completed evidence when provided", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
      multiResolutionAtlasFamilyRoutingApplied: true,
      multiResolutionAtlasFamilyRoutingBoost: 0.035,
      multiResolutionAtlasFamilyRoutingReasonCodes: ["multi_resolution_family_match"],
      multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId: "parameterized_open_family",
      multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId: "parameterized_open_family",
      reason: "multi_resolution_family_routing_lookup",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      multiResolutionAtlasFamilyRoutingApplied: true,
      multiResolutionAtlasFamilyRoutingBoost: 0.035,
      multiResolutionAtlasFamilyRoutingReasonCodes: ["multi_resolution_family_match"],
      multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId: "parameterized_open_family",
      multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId: "parameterized_open_family",
    }));
  });


  it("emits prefix-band routing metadata on lookup-completed evidence when provided", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      canonicalMergedText: "open github.com",
      multiResolutionAtlasPrefixBandRoutingApplied: true,
      multiResolutionAtlasPrefixBandRoutingBoost: 0.025,
      multiResolutionAtlasPrefixBandRoutingReasonCodes: ["multi_resolution_prefix_band_match"],
      multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId: "prefix_open",
      multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId: "prefix_open",
      reason: "multi_resolution_prefix_band_routing_lookup",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      multiResolutionAtlasPrefixBandRoutingApplied: true,
      multiResolutionAtlasPrefixBandRoutingBoost: 0.025,
      multiResolutionAtlasPrefixBandRoutingReasonCodes: ["multi_resolution_prefix_band_match"],
      multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId: "prefix_open",
      multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId: "prefix_open",
    }));
  });

});
