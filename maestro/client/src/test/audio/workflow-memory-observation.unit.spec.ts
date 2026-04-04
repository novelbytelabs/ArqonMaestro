import { deriveWorkflowMemoryObservation } from "../../main/runtime/workflow-memory-observation";
import { deriveWorkflowMemoryContinuityRanking } from "../../main/runtime/workflow-memory-continuity-ranking";

describe("workflow memory observation", () => {
  it("records first governed semantic address without continuity suggestion", () => {
    const fields = deriveWorkflowMemoryObservation({
      semanticAddressId: "open_file",
      finalGranted: true,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowMemorySchemaVersion: "3i_workflow_memory_observation_v1",
        workflowMemoryPolicyVersion: "3i_session_workflow_memory_v1",
        workflowMemoryEligible: true,
        workflowMemoryCurrentSemanticAddressId: "open_file",
        workflowMemoryPreviousSemanticAddressId: null,
        workflowMemoryTransitionObserved: false,
        workflowMemoryTransitionKey: null,
        workflowMemorySequenceLength: 1,
        workflowMemoryRepeatDetected: false,
        workflowMemoryRepeatCount: 0,
        workflowMemoryContinuationSuggested: false,
        workflowMemoryGovernedStateUpdated: true,
      })
    );
  });

  it("suggests continuity when a previously seen transition repeats", () => {
    const first = deriveWorkflowMemoryObservation({
      semanticAddressId: "open_file",
      finalGranted: true,
    });
    const second = deriveWorkflowMemoryObservation({
      semanticAddressId: "go_to_line",
      finalGranted: true,
      previousState: first.nextState,
    });
    const third = deriveWorkflowMemoryObservation({
      semanticAddressId: "open_file",
      finalGranted: true,
      previousState: second.nextState,
    });
    const fourth = deriveWorkflowMemoryObservation({
      semanticAddressId: "go_to_line",
      finalGranted: true,
      previousState: third.nextState,
    });

    expect(fourth).toEqual(
      expect.objectContaining({
        workflowMemoryCurrentSemanticAddressId: "go_to_line",
        workflowMemoryPreviousSemanticAddressId: "open_file",
        workflowMemoryTransitionObserved: true,
        workflowMemoryTransitionKey: "open_file->go_to_line",
        workflowMemoryTransitionSeenBefore: true,
        workflowMemoryTransitionCount: 2,
        workflowMemorySequenceLength: 4,
        workflowMemoryContinuationSuggested: true,
        workflowMemoryGovernedStateUpdated: true,
      })
    );
  });

  it("does not update governed state when the current semantic address was not granted", () => {
    const first = deriveWorkflowMemoryObservation({
      semanticAddressId: "open_file",
      finalGranted: true,
    });
    const second = deriveWorkflowMemoryObservation({
      semanticAddressId: "go_to_line",
      finalGranted: false,
      previousState: first.nextState,
    });

    expect(second).toEqual(
      expect.objectContaining({
        workflowMemoryPreviousSemanticAddressId: "open_file",
        workflowMemoryTransitionObserved: true,
        workflowMemoryTransitionCount: 0,
        workflowMemorySequenceLength: 1,
        workflowMemoryGovernedStateUpdated: false,
      })
    );
    expect(second.nextState.lastGovernedSemanticAddressId).toBe("open_file");
  });
});


describe("workflow memory continuity ranking", () => {
  it("applies a bounded boost for a previously seen governed transition", () => {
    const fields = deriveWorkflowMemoryContinuityRanking({
      previousSemanticAddressId: "open_file",
      candidateSemanticAddressId: "go_to_line",
      transitionCounts: { "open_file->go_to_line": 2 },
      continuationSuggested: true,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowMemoryRankingVersion: "3i_bounded_continuity_ranking_v1",
        workflowMemoryRankingEligible: true,
        workflowMemoryRankingApplied: true,
        workflowMemoryRankingBoost: 0.12,
        workflowMemoryRankingMatchedTransitionKey: "open_file->go_to_line",
        workflowMemoryRankingTransitionCount: 2,
        workflowMemoryRankingSeenBefore: true,
      })
    );
  });

  it("stays non-applied when the transition has not been seen before", () => {
    const fields = deriveWorkflowMemoryContinuityRanking({
      previousSemanticAddressId: "open_file",
      candidateSemanticAddressId: "go_to_line",
      transitionCounts: {},
      continuationSuggested: false,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowMemoryRankingEligible: false,
        workflowMemoryRankingApplied: false,
        workflowMemoryRankingBoost: 0,
        workflowMemoryRankingMatchedTransitionKey: "open_file->go_to_line",
        workflowMemoryRankingTransitionCount: 0,
        workflowMemoryRankingSeenBefore: false,
      })
    );
  });
});
