import { deriveWorkflowDraftArtifacts } from "../../main/runtime/workflow-draft-artifacts";

describe("workflow draft artifacts", () => {
  it("creates a bounded draft artifact preview for an auto-create-eligible low-risk candidate", () => {
    const fields = deriveWorkflowDraftArtifacts({
      promotionEligible: true,
      promotionDecision: "auto_create_draft",
      promotionAutoCreateEligible: true,
      promotionAutoSaveEligible: false,
      workflowClass: "workflow_candidate_default",
      patternKey: "open_file::go_to_line",
      canonicalStepSemanticAddressIds: ["open_file", "go_to_line"],
      confidenceScore: 84,
      utilityScore: 79,
      creationRiskBand: "low",
      timingChannel: "quiet_auto_draft",
      policyTrustBand: "strong",
      familySplitRequired: false,
    });

    expect(fields).toEqual(expect.objectContaining({
      workflowDraftArtifactSchemaVersion: "3j_workflow_draft_artifacts_v1",
      workflowDraftArtifactEligible: true,
      workflowDraftArtifactAutoCreated: true,
      workflowDraftArtifactAutoSaved: false,
      workflowDraftArtifactApprovalRequired: false,
      workflowDraftArtifactDraftIdPreview: "draft::open_file::go_to_line",
      workflowLibraryApiEligible: true,
      workflowLibraryApiCandidateState: "auto_created_draft_candidate",
      workflowLibraryApiExecutionPolicyRequired: true,
      workflowLibraryApiExecutableByDefault: false,
    }));
  });

  it("keeps draft artifact surfaces ineligible when promotion is not yet active", () => {
    const fields = deriveWorkflowDraftArtifacts({
      promotionEligible: false,
      promotionDecision: "hold_for_more_evidence",
      workflowClass: "cross_app",
      patternKey: "cross_app::variant",
      canonicalStepSemanticAddressIds: ["open_file", "open_browser"],
    });

    expect(fields.workflowDraftArtifactEligible).toBe(false);
    expect(fields.workflowLibraryApiEligible).toBe(false);
    expect(fields.workflowDraftArtifactReasonCodes).toContain(
      "workflow_draft_artifact_prerequisites_not_met"
    );
  });
});
