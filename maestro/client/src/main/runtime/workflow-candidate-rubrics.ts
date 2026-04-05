export const WORKFLOW_CANDIDATE_RUBRIC_SCHEMA_VERSION =
  "3j_workflow_candidate_rubrics_v1";
export const WORKFLOW_CANDIDATE_RUBRIC_POLICY_VERSION =
  "3j_bounded_rubric_framework_v1";

export type WorkflowCandidateRubricSuggestedSurface =
  | "silent"
  | "inbox"
  | "inline"
  | "digest";

export interface WorkflowCandidateRubricInput {
  scoringEligible?: boolean | null;
  confidenceScore?: number | null;
  utilityScore?: number | null;
  creationRiskScore?: number | null;
  suggestionPressureScore?: number | null;
  trustScore?: number | null;
  noveltyScore?: number | null;
  duplicateRiskScore?: number | null;
  creationRiskBand?: string | null;
  familySplitRequired?: boolean | null;
  latentExecutionHazardRisk?: number | null;
  source?: string | null;
}

export interface WorkflowCandidateRubricFields {
  workflowCandidateRubricSchemaVersion: string | null;
  workflowCandidateRubricPolicyVersion: string | null;
  workflowCandidateRubricEligible: boolean | null;
  workflowCandidateBaselineRubricPassed: boolean | null;
  workflowCandidateClassRubricPassed: boolean | null;
  workflowCandidateUserRubricPassed: boolean | null;
  workflowCandidateTimingRubricPassed: boolean | null;
  workflowCandidateRubricVetoApplied: boolean | null;
  workflowCandidateRubricWorkflowClass: string | null;
  workflowCandidateRubricSuggestedSurface: WorkflowCandidateRubricSuggestedSurface | null;
  workflowCandidateRubricSource: string | null;
  workflowCandidateRubricReasonCodes: string[] | null;
}

function clampScore(value: number): number {
  return Number(Math.min(100, Math.max(0, value)).toFixed(2));
}

export function deriveWorkflowCandidateRubrics(
  input: WorkflowCandidateRubricInput
): WorkflowCandidateRubricFields {
  const scoringEligible = input.scoringEligible ?? null;
  const source = input.source ?? "h3_runtime_evidence";
  if (!scoringEligible) {
    return {
      workflowCandidateRubricSchemaVersion: WORKFLOW_CANDIDATE_RUBRIC_SCHEMA_VERSION,
      workflowCandidateRubricPolicyVersion: WORKFLOW_CANDIDATE_RUBRIC_POLICY_VERSION,
      workflowCandidateRubricEligible: false,
      workflowCandidateBaselineRubricPassed: null,
      workflowCandidateClassRubricPassed: null,
      workflowCandidateUserRubricPassed: null,
      workflowCandidateTimingRubricPassed: null,
      workflowCandidateRubricVetoApplied: null,
      workflowCandidateRubricWorkflowClass: null,
      workflowCandidateRubricSuggestedSurface: null,
      workflowCandidateRubricSource: source,
      workflowCandidateRubricReasonCodes: ["workflow_candidate_rubric_prerequisites_not_met"],
    };
  }

  const confidence = clampScore(input.confidenceScore ?? 0);
  const utility = clampScore(input.utilityScore ?? 0);
  const creationRisk = clampScore(input.creationRiskScore ?? 100);
  const suggestionPressure = clampScore(input.suggestionPressureScore ?? 100);
  const trust = clampScore(input.trustScore ?? 0);
  const novelty = clampScore(input.noveltyScore ?? 0);
  const duplicateRisk = clampScore(input.duplicateRiskScore ?? 100);
  const familySplitRequired = input.familySplitRequired === true;
  const latentExecutionHazardRisk = clampScore(input.latentExecutionHazardRisk ?? 0);
  const workflowClass = latentExecutionHazardRisk >= 28 ? "cross_app" : "workflow_candidate_default";

  const baselinePassed =
    confidence >= 45 &&
    utility >= 45 &&
    novelty >= 30 &&
    duplicateRisk <= 75 &&
    creationRisk <= 75;

  const classPassed = workflowClass === "cross_app"
    ? creationRisk <= 60 && confidence >= 45
    : creationRisk <= 70;

  const userPassed = trust >= 35;
  const timingPassed = suggestionPressure <= 70;
  const vetoApplied = !baselinePassed || creationRisk >= 81;

  let suggestedSurface: WorkflowCandidateRubricSuggestedSurface = "silent";
  if (!vetoApplied && baselinePassed && classPassed && userPassed) {
    if (
      suggestionPressure <= 26 &&
      utility >= 45 &&
      confidence >= 65 &&
      creationRisk <= 25 &&
      duplicateRisk <= 30
    ) {
      suggestedSurface = "inline";
    } else if (suggestionPressure <= 52) {
      suggestedSurface = "inbox";
    } else if (timingPassed) {
      suggestedSurface = "digest";
    }
  }

  const reasonCodes: string[] = [
    baselinePassed
      ? "workflow_candidate_rubric_baseline_passed"
      : "workflow_candidate_rubric_baseline_failed",
    classPassed
      ? `workflow_candidate_rubric_class_${workflowClass}_passed`
      : `workflow_candidate_rubric_class_${workflowClass}_failed`,
    userPassed
      ? "workflow_candidate_rubric_user_scaffold_passed"
      : "workflow_candidate_rubric_user_scaffold_failed",
    timingPassed
      ? "workflow_candidate_rubric_timing_scaffold_passed"
      : "workflow_candidate_rubric_timing_scaffold_failed",
    `workflow_candidate_rubric_surface_${suggestedSurface}`,
  ];
  if (familySplitRequired) {
    reasonCodes.push("workflow_candidate_rubric_family_split_required");
  }
  if (vetoApplied) {
    reasonCodes.push("workflow_candidate_rubric_veto_applied");
  }

  return {
    workflowCandidateRubricSchemaVersion: WORKFLOW_CANDIDATE_RUBRIC_SCHEMA_VERSION,
    workflowCandidateRubricPolicyVersion: WORKFLOW_CANDIDATE_RUBRIC_POLICY_VERSION,
    workflowCandidateRubricEligible: true,
    workflowCandidateBaselineRubricPassed: baselinePassed,
    workflowCandidateClassRubricPassed: classPassed,
    workflowCandidateUserRubricPassed: userPassed,
    workflowCandidateTimingRubricPassed: timingPassed,
    workflowCandidateRubricVetoApplied: vetoApplied,
    workflowCandidateRubricWorkflowClass: workflowClass,
    workflowCandidateRubricSuggestedSurface: suggestedSurface,
    workflowCandidateRubricSource: source,
    workflowCandidateRubricReasonCodes: reasonCodes,
  };
}
