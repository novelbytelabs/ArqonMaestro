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

describe("ChunkManager H3 focus context evidence", () => {
  const originalGetTraceSnapshot = h23Recorder.getTraceSnapshot.bind(h23Recorder);
  const originalGetLatestDecision = h23Recorder.getLatestDecision.bind(h23Recorder);

  afterEach(() => {
    h23Recorder.getTraceSnapshot = originalGetTraceSnapshot;
    h23Recorder.getLatestDecision = originalGetLatestDecision;
    jest.restoreAllMocks();
  });

  function makeBareManager(): any {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    const manager = Object.create(ChunkManager.prototype) as any;
    manager.chunkH3LatestGeometricEvent = new Map<string, any>();
    manager.chunkH3Route = new Map<string, any>();
    manager.chunkH3TailCaptureStartMs = new Map<string, number>();
    manager.chunkH3FocusContextEnvelope = new Map<string, any>();
    manager.relativeChunkNowMs = () => 111;
    manager.chunkH3Route.set("chunk-1", "geometric_prefix_asr_tail");
    manager.chunkH3LatestGeometricEvent.set("chunk-1", {
      source: "spectral_manifold",
      regionId: "go to",
      commandClass: "parameterized",
      atlasVersion: "v1",
    });
    return { ChunkManager, manager };
  }

  it("carries advisory-only focus metadata into runtime evidence", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-1",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.91,
        authorityType: "verified",
        snapshotAgeMs: 120,
      },
      focusDelta: [{ kind: "region_transition", fromId: "tab-strip", toId: "address-bar", ageMs: 40 }],
      taskHistoryDelta: [
        { semanticAddressId: "sa-1", mergedText: "focus chrome", outcome: "success", ageMs: 80 },
      ],
    });

    ChunkManager.prototype.setFocusConditionedCommandContextForChunk.call(manager, "chunk-1", envelope);
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      governanceRequired: true,
      reason: "semantic_lookup_started_advisory_only",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "voice_semantic_address_lookup_completed",
        chunkId: "chunk-1",
        governanceRequired: true,
        focusContextSchemaVersion: "h3_focus_command_context_v1",
        focusContextEligible: true,
        focusSnapshotFresh: true,
        focusAuthorityType: "verified",
        focusAppId: "chrome",
        focusRegionId: "address-bar",
        focusControlId: "omnibox",
        focusRecentDeltaCount: 1,
        focusRecentTaskHistoryCount: 1,
        focusRankingEligible: true,
        focusLegalityEligible: true,
        focusDeicticResolutionEligible: true,
        focusReasonCodes: [],
      })
    );
  });

  it("emits null focus metadata when no envelope is attached to the chunk", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "route_activation", {
      governanceRequired: true,
      reason: "route_selected",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "route_activation",
        chunkId: "chunk-1",
        focusContextSchemaVersion: null,
        focusContextEligible: null,
        focusRankingEligible: null,
        focusLegalityEligible: null,
        focusReasonCodes: null,
      })
    );
  });
});
