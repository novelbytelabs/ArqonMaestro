export const WORKFLOW_DRAFT_ARTIFACT_SCHEMA_VERSION =
  "3j_workflow_draft_artifacts_v1";
export const WORKFLOW_DRAFT_ARTIFACT_VERSION =
  "3j_draft_and_library_api_v1";

export interface WorkflowDraftArtifactInput {
  promotionEligible?: boolean | null;
  promotionDecision?: string | null;
  promotionAutoCreateEligible?: boolean | null;
  promotionAutoSaveEligible?: boolean | null;
  workflowClass?: string | null;
  patternKey?: string | null;
  canonicalStepSemanticAddressIds?: string[] | null;
  confidenceScore?: number | null;
  utilityScore?: number | null;
  creationRiskBand?: string | null;
  timingChannel?: string | null;
  policyTrustBand?: string | null;
  familySplitRequired?: boolean | null;
  source?: string | null;
}

export interface WorkflowDraftArtifactFields {
  workflowDraftArtifactSchemaVersion: string | null;
  workflowDraftArtifactVersion: string | null;
  workflowDraftArtifactEligible: boolean | null;
  workflowDraftArtifactDraftIdPreview: string | null;
  workflowDraftArtifactTitle: string | null;
  workflowDraftArtifactSummary: string | null;
  workflowDraftArtifactReviewState: string | null;
  workflowDraftArtifactAutoCreated: boolean | null;
  workflowDraftArtifactAutoSaved: boolean | null;
  workflowDraftArtifactApprovalRequired: boolean | null;
  workflowDraftArtifactLibraryEligible: boolean | null;
  workflowDraftArtifactShareTemplateEligible: boolean | null;
  workflowDraftArtifactContainsUserSpecificBindings: boolean | null;
  workflowDraftArtifactLifecycleState: string | null;
  workflowDraftArtifactSource: string | null;
  workflowDraftArtifactReasonCodes: string[] | null;
  workflowLibraryApiSchemaVersion: string | null;
  workflowLibraryApiVersion: string | null;
  workflowLibraryApiEligible: boolean | null;
  workflowLibraryApiCandidateState: string | null;
  workflowLibraryApiPersistentDraftEligible: boolean | null;
  workflowLibraryApiApprovedWorkflowPlaceholderId: string | null;
  workflowLibraryApiExecutionPolicyRequired: boolean | null;
  workflowLibraryApiExecutableByDefault: boolean | null;
  workflowLibraryApiSource: string | null;
  workflowLibraryApiReasonCodes: string[] | null;
}

function normalizeToken(value: string): string {
  return value.replace(/[_-]+/g, " ").trim();
}

function buildTitle(steps: string[]): string {
  if (steps.length === 0) {
    return "Workflow Draft";
  }
  const first = normalizeToken(steps[0]);
  const last = normalizeToken(steps[steps.length - 1]);
  if (steps.length === 1 || first === last) {
    return `Workflow Draft: ${first}`;
  }
  return `Workflow Draft: ${first} → ${last}`;
}

function buildSummary(steps: string[], timingChannel: string | null): string {
  const sequence = steps.slice(0, 3).map(normalizeToken).join(" → ");
  const route = timingChannel ? ` via ${normalizeToken(timingChannel)}` : "";
  if (sequence.length === 0) {
    return `Bounded workflow draft candidate${route}`;
  }
  return `Bounded workflow draft candidate${route}: ${sequence}`;
}

function inferContainsUserSpecificBindings(
  workflowClass: string | null,
  steps: string[]
): boolean {
  if (workflowClass === "cross_app") {
    return true;
  }
  return steps.some((step) => /file|path|project|url|domain|line/i.test(step));
}

function buildPreviewId(patternKey: string | null): string | null {
  if (!patternKey) {
    return null;
  }
  return `draft::${patternKey}`;
}

export function deriveWorkflowDraftArtifacts(
  input: WorkflowDraftArtifactInput
): WorkflowDraftArtifactFields {
  const promotionEligible = input.promotionEligible ?? null;
  const promotionDecision = input.promotionDecision ?? null;
  const source = input.source ?? "h3_runtime_evidence";
  const steps = (input.canonicalStepSemanticAddressIds ?? []).filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );

  if (!promotionEligible ||
      promotionDecision == null ||
      promotionDecision === "observe_only" ||
      promotionDecision === "hold_for_more_evidence") {
    return {
      workflowDraftArtifactSchemaVersion: WORKFLOW_DRAFT_ARTIFACT_SCHEMA_VERSION,
      workflowDraftArtifactVersion: WORKFLOW_DRAFT_ARTIFACT_VERSION,
      workflowDraftArtifactEligible: false,
      workflowDraftArtifactDraftIdPreview: null,
      workflowDraftArtifactTitle: null,
      workflowDraftArtifactSummary: null,
      workflowDraftArtifactReviewState: null,
      workflowDraftArtifactAutoCreated: null,
      workflowDraftArtifactAutoSaved: null,
      workflowDraftArtifactApprovalRequired: null,
      workflowDraftArtifactLibraryEligible: null,
      workflowDraftArtifactShareTemplateEligible: null,
      workflowDraftArtifactContainsUserSpecificBindings: null,
      workflowDraftArtifactLifecycleState: null,
      workflowDraftArtifactSource: source,
      workflowDraftArtifactReasonCodes: ["workflow_draft_artifact_prerequisites_not_met"],
      workflowLibraryApiSchemaVersion: WORKFLOW_DRAFT_ARTIFACT_SCHEMA_VERSION,
      workflowLibraryApiVersion: WORKFLOW_DRAFT_ARTIFACT_VERSION,
      workflowLibraryApiEligible: false,
      workflowLibraryApiCandidateState: null,
      workflowLibraryApiPersistentDraftEligible: null,
      workflowLibraryApiApprovedWorkflowPlaceholderId: null,
      workflowLibraryApiExecutionPolicyRequired: null,
      workflowLibraryApiExecutableByDefault: null,
      workflowLibraryApiSource: source,
      workflowLibraryApiReasonCodes: ["workflow_library_api_prerequisites_not_met"],
    };
  }

  const autoCreated =
    promotionDecision === "auto_create_draft" || promotionDecision === "auto_save_draft";
  const autoSaved = promotionDecision === "auto_save_draft";
  const approvalRequired = !autoCreated;
  const containsBindings = inferContainsUserSpecificBindings(
    input.workflowClass ?? null,
    steps
  );
  const shareTemplateEligible = !containsBindings && !(input.familySplitRequired ?? false);
  const draftIdPreview = buildPreviewId(input.patternKey ?? null);
  const title = buildTitle(steps);
  const summary = buildSummary(steps, input.timingChannel ?? null);
  const libraryEligible =
    promotionDecision === "suggest_in_inbox" ||
    promotionDecision === "suggest_inline" ||
    promotionDecision === "auto_create_draft" ||
    promotionDecision === "auto_save_draft";

  let candidateState = "draft_candidate";
  if (promotionDecision === "auto_create_draft") {
    candidateState = "auto_created_draft_candidate";
  } else if (promotionDecision === "auto_save_draft") {
    candidateState = "persistent_draft_candidate";
  } else if (
    promotionDecision === "suggest_inline" ||
    promotionDecision === "suggest_in_inbox"
  ) {
    candidateState = "review_candidate";
  }

  const reasonCodes = [
    "workflow_draft_artifact_preview_ready",
    `workflow_draft_artifact_decision_${promotionDecision}`,
  ];
  if (autoCreated) {
    reasonCodes.push("workflow_draft_artifact_auto_created_shape");
  }
  if (containsBindings) {
    reasonCodes.push("workflow_draft_artifact_user_specific_bindings_detected");
  }
  if (shareTemplateEligible) {
    reasonCodes.push("workflow_draft_artifact_share_template_eligible");
  }

  const libraryReasonCodes = [
    "workflow_library_api_placeholder_ready",
    `workflow_library_api_state_${candidateState}`,
    `workflow_library_api_trust_${input.policyTrustBand ?? "unknown"}`,
  ];

  return {
    workflowDraftArtifactSchemaVersion: WORKFLOW_DRAFT_ARTIFACT_SCHEMA_VERSION,
    workflowDraftArtifactVersion: WORKFLOW_DRAFT_ARTIFACT_VERSION,
    workflowDraftArtifactEligible: true,
    workflowDraftArtifactDraftIdPreview: draftIdPreview,
    workflowDraftArtifactTitle: title,
    workflowDraftArtifactSummary: summary,
    workflowDraftArtifactReviewState: autoCreated ? "queued_for_review" : "suggested",
    workflowDraftArtifactAutoCreated: autoCreated,
    workflowDraftArtifactAutoSaved: autoSaved,
    workflowDraftArtifactApprovalRequired: approvalRequired,
    workflowDraftArtifactLibraryEligible: libraryEligible,
    workflowDraftArtifactShareTemplateEligible: shareTemplateEligible,
    workflowDraftArtifactContainsUserSpecificBindings: containsBindings,
    workflowDraftArtifactLifecycleState: autoSaved ? "persisted" : "created",
    workflowDraftArtifactSource: source,
    workflowDraftArtifactReasonCodes: reasonCodes,
    workflowLibraryApiSchemaVersion: WORKFLOW_DRAFT_ARTIFACT_SCHEMA_VERSION,
    workflowLibraryApiVersion: WORKFLOW_DRAFT_ARTIFACT_VERSION,
    workflowLibraryApiEligible: libraryEligible,
    workflowLibraryApiCandidateState: candidateState,
    workflowLibraryApiPersistentDraftEligible:
      (input.promotionAutoSaveEligible ?? false) && libraryEligible,
    workflowLibraryApiApprovedWorkflowPlaceholderId:
      libraryEligible && draftIdPreview ? draftIdPreview.replace("draft::", "approved::") : null,
    workflowLibraryApiExecutionPolicyRequired: libraryEligible ? true : null,
    workflowLibraryApiExecutableByDefault: libraryEligible ? false : null,
    workflowLibraryApiSource: source,
    workflowLibraryApiReasonCodes: libraryReasonCodes,
  };
}
