import { deriveWorkflowMemoryObservation } from "../../main/runtime/workflow-memory-observation";
import { deriveWorkflowMemoryContinuityRanking } from "../../main/runtime/workflow-memory-continuity-ranking";
import { deriveWorkflowMemoryContinuityOrdering } from "../../main/runtime/workflow-memory-continuity-ordering";
import { deriveWorkflowMemoryCandidatePoolOrdering } from "../../main/runtime/workflow-memory-candidate-pool-ordering";
import { deriveWorkflowMemoryReuseSubstrate } from "../../main/runtime/workflow-memory-reuse-substrate";

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


describe("workflow memory continuity ordering", () => {
  it("applies an adjusted score when continuity ranking already applied", () => {
    const fields = deriveWorkflowMemoryContinuityOrdering({
      baseScore: 0.67,
      previousSemanticAddressId: "open_file",
      candidateSemanticAddressId: "go_to_line",
      matchedTransitionKey: "open_file->go_to_line",
      transitionCount: 2,
      rankingApplied: true,
      rankingBoost: 0.12,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowMemoryOrderingVersion: "3i_continuity_assisted_candidate_ordering_v1",
        workflowMemoryOrderingEligible: true,
        workflowMemoryOrderingApplied: true,
        workflowMemoryOrderingBaseScore: 0.67,
        workflowMemoryOrderingAdjustedScore: 0.79,
        workflowMemoryOrderingBoost: 0.12,
        workflowMemoryOrderingMatchedTransitionKey: "open_file->go_to_line",
        workflowMemoryOrderingTransitionCount: 2,
      })
    );
  });

  it("stays non-applied when no continuity ranking prior was applied", () => {
    const fields = deriveWorkflowMemoryContinuityOrdering({
      baseScore: 0.67,
      previousSemanticAddressId: "open_file",
      candidateSemanticAddressId: "go_to_line",
      matchedTransitionKey: "open_file->go_to_line",
      transitionCount: 0,
      rankingApplied: false,
      rankingBoost: 0,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowMemoryOrderingEligible: false,
        workflowMemoryOrderingApplied: false,
        workflowMemoryOrderingBaseScore: 0.67,
        workflowMemoryOrderingAdjustedScore: 0.67,
        workflowMemoryOrderingBoost: 0,
      })
    );
  });
});


describe("workflow memory candidate-pool ordering", () => {
  it("reorders a multi-candidate pool when a previously seen governed transition favors a later candidate", () => {
    const fields = deriveWorkflowMemoryCandidatePoolOrdering({
      previousSemanticAddressId: "open_file",
      candidateSemanticAddressIds: ["new_tab", "go_to_line"],
      candidateScores: [0.72, 0.68],
      transitionCounts: { "open_file->go_to_line": 2 },
      continuationSuggested: null,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowMemoryCandidatePoolOrderingVersion: "3i_candidate_pool_ordering_expansion_v1",
        workflowMemoryCandidatePoolOrderingEligible: true,
        workflowMemoryCandidatePoolOrderingApplied: true,
        workflowMemoryCandidatePoolCandidateCountBefore: 2,
        workflowMemoryCandidatePoolCandidateCountAfter: 2,
        workflowMemoryCandidatePoolSemanticAddressIdsBefore: ["new_tab", "go_to_line"],
        workflowMemoryCandidatePoolSemanticAddressIdsAfter: ["go_to_line", "new_tab"],
        workflowMemoryCandidatePoolScoresBefore: [0.72, 0.68],
        workflowMemoryCandidatePoolScoresAfter: [0.8, 0.72],
        workflowMemoryCandidatePoolTopCandidateSemanticAddressIdBefore: "new_tab",
        workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter: "go_to_line",
        workflowMemoryCandidatePoolTopCandidateScoreBefore: 0.72,
        workflowMemoryCandidatePoolTopCandidateScoreAfter: 0.8,
      })
    );
  });

  it("stays non-applied when the candidate pool is missing multi-candidate support", () => {
    const fields = deriveWorkflowMemoryCandidatePoolOrdering({
      previousSemanticAddressId: "open_file",
      candidateSemanticAddressIds: ["go_to_line"],
      candidateScores: [0.68],
      transitionCounts: { "open_file->go_to_line": 2 },
      continuationSuggested: null,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowMemoryCandidatePoolOrderingEligible: false,
        workflowMemoryCandidatePoolOrderingApplied: false,
        workflowMemoryCandidatePoolCandidateCountBefore: 1,
        workflowMemoryCandidatePoolCandidateCountAfter: 1,
        workflowMemoryCandidatePoolSemanticAddressIdsBefore: ["go_to_line"],
        workflowMemoryCandidatePoolSemanticAddressIdsAfter: ["go_to_line"],
        workflowMemoryCandidatePoolScoresBefore: [0.68],
        workflowMemoryCandidatePoolScoresAfter: [0.68],
        workflowMemoryCandidatePoolTopCandidateSemanticAddressIdBefore: "go_to_line",
        workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter: "go_to_line",
        workflowMemoryCandidatePoolTopCandidateScoreBefore: 0.68,
        workflowMemoryCandidatePoolTopCandidateScoreAfter: 0.68,
      })
    );
  });
});


describe("workflow memory reuse substrate", () => {
  it("suggests a next semantic address when a governed sequence repeats", () => {
    const fields = deriveWorkflowMemoryReuseSubstrate({
      governedHistory: [
        "open_file",
        "go_to_line",
        "edit_symbol",
        "open_file",
        "go_to_line",
      ],
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowMemoryReuseVersion: "3i_workflow_reuse_substrate_v1",
        workflowMemoryReuseEligible: true,
        workflowMemoryReuseApplied: true,
        workflowMemoryReusePatternLength: 2,
        workflowMemoryReuseMatchedSequenceSemanticAddressIds: ["open_file", "go_to_line"],
        workflowMemoryReuseMatchedSequenceKey: "open_file->go_to_line",
        workflowMemoryReuseSeenBefore: true,
        workflowMemoryReuseOccurrenceCount: 1,
        workflowMemoryReuseSuggestedNextSemanticAddressId: "edit_symbol",
        workflowMemoryReuseSuggestedNextCount: 1,
      })
    );
  });

  it("stays non-applied when no repeated governed sequence with a next step exists", () => {
    const fields = deriveWorkflowMemoryReuseSubstrate({
      governedHistory: ["open_file", "go_to_line"],
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowMemoryReuseVersion: "3i_workflow_reuse_substrate_v1",
        workflowMemoryReuseEligible: true,
        workflowMemoryReuseApplied: false,
        workflowMemoryReusePatternLength: null,
        workflowMemoryReuseSuggestedNextSemanticAddressId: null,
        workflowMemoryReuseSuggestedNextCount: 0,
      })
    );
  });
});
