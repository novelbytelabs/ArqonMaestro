import { deriveWorkflowCandidateRubrics } from "../../main/runtime/workflow-candidate-rubrics";
import { deriveWorkflowCandidatePromotion } from "../../main/runtime/workflow-candidate-promotion";

describe("workflow candidate rubrics and promotion", () => {
  it("passes bounded rubrics and promotes an exact low-risk candidate to inline suggestion", () => {
    const rubricFields = deriveWorkflowCandidateRubrics({
      scoringEligible: true,
      confidenceScore: 84,
      utilityScore: 76,
      creationRiskScore: 18,
      suggestionPressureScore: 18,
      trustScore: 44,
      noveltyScore: 70,
      duplicateRiskScore: 12,
      creationRiskBand: "very_low",
      familySplitRequired: false,
      latentExecutionHazardRisk: 18,
    });

    expect(rubricFields).toEqual(
      expect.objectContaining({
        workflowCandidateRubricSchemaVersion: "3j_workflow_candidate_rubrics_v1",
        workflowCandidateRubricPolicyVersion: "3j_bounded_rubric_framework_v1",
        workflowCandidateRubricEligible: true,
        workflowCandidateBaselineRubricPassed: true,
        workflowCandidateClassRubricPassed: true,
        workflowCandidateUserRubricPassed: true,
        workflowCandidateTimingRubricPassed: true,
        workflowCandidateRubricVetoApplied: false,
        workflowCandidateRubricSuggestedSurface: "inline",
      })
    );

    const promotionFields = deriveWorkflowCandidatePromotion({
      rubricEligible: rubricFields.workflowCandidateRubricEligible,
      baselineRubricPassed: rubricFields.workflowCandidateBaselineRubricPassed,
      classRubricPassed: rubricFields.workflowCandidateClassRubricPassed,
      userRubricPassed: rubricFields.workflowCandidateUserRubricPassed,
      timingRubricPassed: rubricFields.workflowCandidateTimingRubricPassed,
      rubricVetoApplied: rubricFields.workflowCandidateRubricVetoApplied,
      suggestedSurface: rubricFields.workflowCandidateRubricSuggestedSurface,
      confidenceScore: 84,
      utilityScore: 76,
      creationRiskScore: 18,
      suggestionPressureScore: 18,
      trustScore: 44,
      noveltyScore: 70,
      duplicateRiskScore: 12,
      creationRiskBand: "low",
    });

    expect(promotionFields).toEqual(
      expect.objectContaining({
        workflowCandidatePromotionSchemaVersion: "3j_workflow_candidate_promotion_v1",
        workflowCandidatePromotionPolicyVersion: "3j_bounded_promotion_engine_v1",
        workflowCandidatePromotionEligible: true,
        workflowCandidatePromotionDecision: "suggest_inline",
        workflowCandidatePromotionAutoCreateEligible: false,
      })
    );
  });

  it("holds split-required candidates instead of allowing higher promotion", () => {
    const rubricFields = deriveWorkflowCandidateRubrics({
      scoringEligible: true,
      confidenceScore: 61,
      utilityScore: 72,
      creationRiskScore: 54,
      suggestionPressureScore: 42,
      trustScore: 51,
      noveltyScore: 58,
      duplicateRiskScore: 22,
      creationRiskBand: "moderate",
      familySplitRequired: true,
      latentExecutionHazardRisk: 22,
    });

    expect(rubricFields.workflowCandidateClassRubricPassed).toBe(true);
    expect(rubricFields.workflowCandidateRubricReasonCodes).toContain(
      "workflow_candidate_rubric_family_split_required"
    );

    const promotionFields = deriveWorkflowCandidatePromotion({
      rubricEligible: rubricFields.workflowCandidateRubricEligible,
      baselineRubricPassed: rubricFields.workflowCandidateBaselineRubricPassed,
      classRubricPassed: rubricFields.workflowCandidateClassRubricPassed,
      userRubricPassed: rubricFields.workflowCandidateUserRubricPassed,
      timingRubricPassed: rubricFields.workflowCandidateTimingRubricPassed,
      rubricVetoApplied: rubricFields.workflowCandidateRubricVetoApplied,
      suggestedSurface: rubricFields.workflowCandidateRubricSuggestedSurface,
      confidenceScore: 61,
      utilityScore: 72,
      creationRiskScore: 54,
      suggestionPressureScore: 42,
      trustScore: 51,
      noveltyScore: 58,
      duplicateRiskScore: 22,
      creationRiskBand: "moderate",
    });

    expect(promotionFields.workflowCandidatePromotionDecision).toBe("suggest_in_inbox");
    expect(promotionFields.workflowCandidatePromotionCeiling).toBe("suggest_in_inbox");
  });

  it("stays ineligible when scoring prerequisites are missing", () => {
    const rubricFields = deriveWorkflowCandidateRubrics({
      scoringEligible: false,
    });
    expect(rubricFields).toEqual(
      expect.objectContaining({
        workflowCandidateRubricEligible: false,
        workflowCandidateBaselineRubricPassed: null,
      })
    );

    const promotionFields = deriveWorkflowCandidatePromotion({
      rubricEligible: false,
    });
    expect(promotionFields).toEqual(
      expect.objectContaining({
        workflowCandidatePromotionEligible: false,
        workflowCandidatePromotionDecision: null,
      })
    );
  });
});
