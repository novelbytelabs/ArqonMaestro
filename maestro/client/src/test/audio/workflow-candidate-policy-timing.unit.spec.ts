import { deriveWorkflowCandidatePreferencesPolicy } from "../../main/runtime/workflow-candidate-preferences-policy";
import { deriveWorkflowCandidateTiming } from "../../main/runtime/workflow-candidate-timing";
import { deriveWorkflowCandidateRubrics } from "../../main/runtime/workflow-candidate-rubrics";
import { deriveWorkflowCandidatePromotion } from "../../main/runtime/workflow-candidate-promotion";

describe("workflow candidate timing and policy", () => {
  it("enables low-risk auto-create policy for strong-trust default candidates", () => {
    const policyFields = deriveWorkflowCandidatePreferencesPolicy({
      scoringEligible: true,
      workflowClass: "workflow_candidate_default",
      trustScore: 72,
      creationRiskBand: "low",
      duplicateRiskScore: 12,
      familySplitRequired: false,
    });
    expect(policyFields).toEqual(expect.objectContaining({
      workflowCandidatePolicySchemaVersion: "3j_workflow_candidate_policy_v1",
      workflowCandidatePolicyEligible: true,
      workflowCandidatePolicyTrustBand: "strong",
      workflowCandidatePolicyAutoCreateLowRiskEnabled: true,
      workflowCandidatePolicyInboxOnly: false,
    }));

    const timingFields = deriveWorkflowCandidateTiming({
      rubricEligible: true,
      suggestedSurface: "inline",
      suggestionPressureScore: 16,
      utilityScore: 78,
      noveltyScore: 62,
      trainingModeActive: policyFields.workflowCandidatePolicyTrainingModeActive,
      quietModeEnabled: policyFields.workflowCandidatePolicyQuietModeEnabled,
      inboxOnly: policyFields.workflowCandidatePolicyInboxOnly,
      autoCreateLowRiskEnabled: policyFields.workflowCandidatePolicyAutoCreateLowRiskEnabled,
    });
    expect(timingFields.workflowCandidateTimingChannel).toBe("quiet_auto_draft");

    const rubricFields = deriveWorkflowCandidateRubrics({
      scoringEligible: true,
      confidenceScore: 84,
      utilityScore: 78,
      creationRiskScore: 16,
      suggestionPressureScore: 16,
      trustScore: 72,
      noveltyScore: 62,
      duplicateRiskScore: 12,
      creationRiskBand: "low",
      familySplitRequired: false,
      latentExecutionHazardRisk: 16,
      policyEligible: policyFields.workflowCandidatePolicyEligible,
      policyWorkflowClass: policyFields.workflowCandidatePolicyWorkflowClass,
      policyTrustBand: policyFields.workflowCandidatePolicyTrustBand,
      policyInboxOnly: policyFields.workflowCandidatePolicyInboxOnly,
      policyQuietModeEnabled: policyFields.workflowCandidatePolicyQuietModeEnabled,
      policyTrainingModeActive: policyFields.workflowCandidatePolicyTrainingModeActive,
      timingEligible: timingFields.workflowCandidateTimingEligible,
      timingChannel: timingFields.workflowCandidateTimingChannel,
    });
    expect(rubricFields.workflowCandidateRubricSuggestedSurface).toBe("digest");

    const promotionFields = deriveWorkflowCandidatePromotion({
      rubricEligible: rubricFields.workflowCandidateRubricEligible,
      baselineRubricPassed: rubricFields.workflowCandidateBaselineRubricPassed,
      classRubricPassed: rubricFields.workflowCandidateClassRubricPassed,
      userRubricPassed: rubricFields.workflowCandidateUserRubricPassed,
      timingRubricPassed: rubricFields.workflowCandidateTimingRubricPassed,
      rubricVetoApplied: rubricFields.workflowCandidateRubricVetoApplied,
      suggestedSurface: rubricFields.workflowCandidateRubricSuggestedSurface,
      confidenceScore: 84,
      utilityScore: 78,
      creationRiskScore: 16,
      suggestionPressureScore: 16,
      trustScore: 72,
      noveltyScore: 62,
      duplicateRiskScore: 12,
      creationRiskBand: "low",
      policyEligible: policyFields.workflowCandidatePolicyEligible,
      policyAutoCreateLowRiskEnabled: policyFields.workflowCandidatePolicyAutoCreateLowRiskEnabled,
      policyAutoSaveVeryLowRiskEnabled: policyFields.workflowCandidatePolicyAutoSaveVeryLowRiskEnabled,
      policyInboxOnly: policyFields.workflowCandidatePolicyInboxOnly,
      policyTrustBand: policyFields.workflowCandidatePolicyTrustBand,
      timingEligible: timingFields.workflowCandidateTimingEligible,
      timingChannel: timingFields.workflowCandidateTimingChannel,
    });
    expect(promotionFields).toEqual(expect.objectContaining({
      workflowCandidatePromotionDecision: "auto_create_draft",
      workflowCandidatePromotionAutoCreateEligible: true,
      workflowCandidatePromotionAutoSaveEligible: false,
    }));
  });

  it("forces inbox routing and blocks auto-create for cross-app policy classes", () => {
    const policyFields = deriveWorkflowCandidatePreferencesPolicy({
      scoringEligible: true,
      workflowClass: "cross_app",
      trustScore: 81,
      creationRiskBand: "low",
      duplicateRiskScore: 14,
      familySplitRequired: false,
    });
    expect(policyFields.workflowCandidatePolicyInboxOnly).toBe(true);
    expect(policyFields.workflowCandidatePolicyAutoCreateLowRiskEnabled).toBe(false);

    const timingFields = deriveWorkflowCandidateTiming({
      rubricEligible: true,
      suggestedSurface: "inline",
      suggestionPressureScore: 24,
      utilityScore: 74,
      noveltyScore: 60,
      trainingModeActive: policyFields.workflowCandidatePolicyTrainingModeActive,
      quietModeEnabled: policyFields.workflowCandidatePolicyQuietModeEnabled,
      inboxOnly: policyFields.workflowCandidatePolicyInboxOnly,
      autoCreateLowRiskEnabled: policyFields.workflowCandidatePolicyAutoCreateLowRiskEnabled,
    });
    expect(["inbox", "digest"]).toContain(timingFields.workflowCandidateTimingChannel);
  });
});
