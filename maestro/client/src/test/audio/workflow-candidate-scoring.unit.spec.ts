import { deriveWorkflowCandidateScoring } from "../../main/runtime/workflow-candidate-scoring";

describe("workflow candidate scoring", () => {
  it("scores an exact emerged family as high-confidence and very-low-risk", () => {
    const fields = deriveWorkflowCandidateScoring({
      discoveryEligible: true,
      discoveryOccurrenceCount: 2,
      discoveryDistinctRunCount: 2,
      discoverySequenceLength: 2,
      discoveryStartBoundaryConfidence: 0.74,
      discoveryEndBoundaryConfidence: 0.78,
      discoveryRepeatedSubsequenceDetected: true,
      discoveryRediscoveryMerged: false,
      skeletonEligible: true,
      skeletonCanonicalStepSemanticAddressIds: ["open_file", "go_to_line"],
      skeletonFixedStepIndices: [0, 1],
      skeletonVariableStepIndices: [],
      skeletonOptionalStepIndices: [],
      skeletonInferredSlotCount: 0,
      skeletonGeneralizationConfidence: 0.86,
      skeletonAbstractionEligible: true,
      skeletonFamilyVariantCount: 1,
      skeletonFamilySplitRequired: false,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowCandidateScoringSchemaVersion: "3j_workflow_candidate_scoring_v1",
        workflowCandidateScoringPolicyVersion: "3j_bounded_scoring_risk_v1",
        workflowCandidateScoringEligible: true,
        workflowCandidateScoreVersion: "3j_score_family_v1",
        workflowCandidateCreationRiskBand: "very_low",
      })
    );
    expect(fields.workflowCandidateConfidenceScore).toBeGreaterThanOrEqual(70);
    expect(fields.workflowCandidateCreationRiskScore).toBeLessThanOrEqual(20);
    expect(fields.workflowCandidateDuplicateRiskScore).toBeLessThanOrEqual(20);
    expect(fields.workflowCandidateScoringReasonCodes).toContain(
      "workflow_candidate_scoring_exact_family_shape"
    );
    expect(fields.workflowCandidateRiskReasonCodes).toContain(
      "workflow_candidate_risk_band_very_low"
    );
  });

  it("elevates risk and lowers abstraction confidence when family split is required", () => {
    const fields = deriveWorkflowCandidateScoring({
      discoveryEligible: true,
      discoveryOccurrenceCount: 2,
      discoveryDistinctRunCount: 2,
      discoverySequenceLength: 4,
      discoveryStartBoundaryConfidence: 0.74,
      discoveryEndBoundaryConfidence: 0.78,
      discoveryRepeatedSubsequenceDetected: true,
      discoveryRediscoveryMerged: false,
      skeletonEligible: true,
      skeletonCanonicalStepSemanticAddressIds: ["open_file", "focus_editor", "go_to_line", "run_tests"],
      skeletonFixedStepIndices: [0, 3],
      skeletonVariableStepIndices: [],
      skeletonOptionalStepIndices: [],
      skeletonInferredSlotCount: 0,
      skeletonGeneralizationConfidence: 0.46,
      skeletonAbstractionEligible: false,
      skeletonFamilyVariantCount: 2,
      skeletonFamilySplitRequired: true,
    });

    expect(fields.workflowCandidateCreationRiskBand).toBe("moderate");
    expect(fields.workflowCandidateCreationRiskScore).toBeGreaterThanOrEqual(41);
    expect(fields.workflowCandidateAbstractionRiskComponent).toBeGreaterThanOrEqual(50);
    expect(fields.workflowCandidateScoringReasonCodes).toContain(
      "workflow_candidate_scoring_family_split_required"
    );
    expect(fields.workflowCandidateRiskReasonCodes).toContain(
      "workflow_candidate_risk_family_split_required"
    );
  });

  it("stays ineligible when discovery or skeleton prerequisites are missing", () => {
    const fields = deriveWorkflowCandidateScoring({
      discoveryEligible: false,
      skeletonEligible: false,
      skeletonCanonicalStepSemanticAddressIds: null,
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowCandidateScoringEligible: false,
        workflowCandidateConfidenceScore: null,
        workflowCandidateCreationRiskScore: null,
        workflowCandidateCreationRiskBand: null,
      })
    );
  });
});
