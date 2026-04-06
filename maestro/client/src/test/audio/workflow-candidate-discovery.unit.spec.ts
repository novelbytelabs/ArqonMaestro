import {
  deriveEmptyWorkflowCandidateDiscoveryState,
  deriveWorkflowCandidateDiscovery,
} from "../../main/runtime/workflow-candidate-discovery";

describe("workflow candidate discovery", () => {
  it("emerges a repeated governed subsequence after the second distinct repetition", () => {
    const first = deriveWorkflowCandidateDiscovery({ semanticAddressId: "open_file", finalGranted: true, previousState: deriveEmptyWorkflowCandidateDiscoveryState() });
    const second = deriveWorkflowCandidateDiscovery({ semanticAddressId: "go_to_line", finalGranted: true, previousState: first.nextState });
    const third = deriveWorkflowCandidateDiscovery({ semanticAddressId: "open_file", finalGranted: true, previousState: second.nextState });
    const fourth = deriveWorkflowCandidateDiscovery({ semanticAddressId: "go_to_line", finalGranted: true, previousState: third.nextState });

    expect(fourth).toEqual(expect.objectContaining({
      workflowCandidateDiscoverySchemaVersion: "3j_workflow_candidate_discovery_v1",
      workflowCandidateDiscoveryPolicyVersion: "3j_governed_subsequence_discovery_v1",
      workflowCandidateDiscoveryEligible: true,
      workflowCandidateDiscoverySequenceSemanticAddressIds: ["open_file", "go_to_line"],
      workflowCandidateDiscoveryPatternKey: "open_file::go_to_line",
      workflowCandidateDiscoveryOccurrenceCount: 2,
      workflowCandidateDiscoveryDistinctRunCount: 2,
      workflowCandidateDiscoverySequenceLength: 2,
      workflowCandidateDiscoveryRepeatedSubsequenceDetected: true,
      workflowCandidateDiscoveryCandidateEmergenceThresholdMet: true,
      workflowCandidateDiscoveryRediscoveryMerged: false,
      workflowCandidateDiscoveryGovernedStateUpdated: true,
      workflowCandidateDiscoverySource: "h3_runtime_evidence",
    }));
    expect(fourth.workflowCandidateDiscoveryStartBoundaryConfidence).toBeGreaterThanOrEqual(0.7);
    expect(fourth.workflowCandidateDiscoveryEndBoundaryConfidence).toBeGreaterThanOrEqual(0.74);
  });

  it("marks rediscovery merge when an already emerged pattern is seen again", () => {
    let state = deriveEmptyWorkflowCandidateDiscoveryState();
    let latest: any = null;
    for (const semanticAddressId of ["open_file", "go_to_line", "open_file", "go_to_line", "open_file", "go_to_line"]) {
      latest = deriveWorkflowCandidateDiscovery({ semanticAddressId, finalGranted: true, previousState: state });
      state = latest.nextState!;
    }

    expect(latest).toEqual(expect.objectContaining({
      workflowCandidateDiscoveryPatternKey: "open_file::go_to_line",
      workflowCandidateDiscoveryOccurrenceCount: 3,
      workflowCandidateDiscoveryDistinctRunCount: 3,
      workflowCandidateDiscoveryCandidateEmergenceThresholdMet: true,
      workflowCandidateDiscoveryRediscoveryMerged: true,
    }));
  });

  it("does not advance discovery state on an ungranted semantic observation", () => {
    const first = deriveWorkflowCandidateDiscovery({ semanticAddressId: "open_file", finalGranted: true, previousState: deriveEmptyWorkflowCandidateDiscoveryState() });
    const second = deriveWorkflowCandidateDiscovery({ semanticAddressId: "go_to_line", finalGranted: false, previousState: first.nextState });

    expect(second).toEqual(expect.objectContaining({
      workflowCandidateDiscoveryEligible: false,
      workflowCandidateDiscoverySequenceSemanticAddressIds: null,
      workflowCandidateDiscoveryPatternKey: null,
      workflowCandidateDiscoveryCandidateEmergenceThresholdMet: false,
      workflowCandidateDiscoveryGovernedStateUpdated: false,
    }));
    expect(second.nextState).toEqual(first.nextState);
  });
});
