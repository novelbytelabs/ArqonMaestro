export const WORKFLOW_CANDIDATE_POLICY_SCHEMA_VERSION =
  "3j_workflow_candidate_policy_v1";
export const WORKFLOW_CANDIDATE_POLICY_VERSION =
  "3j_preferences_and_trust_policy_v1";

export type WorkflowCandidatePolicyTrustBand =
  | "low"
  | "emerging"
  | "strong"
  | "very_strong";

export interface WorkflowCandidatePolicyInput {
  scoringEligible?: boolean | null;
  workflowClass?: string | null;
  trustScore?: number | null;
  creationRiskBand?: string | null;
  duplicateRiskScore?: number | null;
  familySplitRequired?: boolean | null;
  source?: string | null;
}

export interface WorkflowCandidatePolicyFields {
  workflowCandidatePolicySchemaVersion: string | null;
  workflowCandidatePolicyVersion: string | null;
  workflowCandidatePolicyEligible: boolean | null;
  workflowCandidatePolicyWorkflowClass: string | null;
  workflowCandidatePolicyTrustBand: WorkflowCandidatePolicyTrustBand | null;
  workflowCandidatePolicyTrainingModeActive: boolean | null;
  workflowCandidatePolicyQuietModeEnabled: boolean | null;
  workflowCandidatePolicyInboxOnly: boolean | null;
  workflowCandidatePolicyAutoCreateLowRiskEnabled: boolean | null;
  workflowCandidatePolicyAutoSaveVeryLowRiskEnabled: boolean | null;
  workflowCandidatePolicyClassTrustAllowsAutoCreate: boolean | null;
  workflowCandidatePolicyClassTrustAllowsAutoSave: boolean | null;
  workflowCandidatePolicySource: string | null;
  workflowCandidatePolicyReasonCodes: string[] | null;
}

function clampScore(value: number): number {
  return Number(Math.min(100, Math.max(0, value)).toFixed(2));
}

function deriveTrustBand(score: number): WorkflowCandidatePolicyTrustBand {
  if (score >= 85) return "very_strong";
  if (score >= 60) return "strong";
  if (score >= 35) return "emerging";
  return "low";
}

export function deriveWorkflowCandidatePreferencesPolicy(
  input: WorkflowCandidatePolicyInput
): WorkflowCandidatePolicyFields {
  const scoringEligible = input.scoringEligible ?? null;
  const source = input.source ?? "h3_runtime_evidence";
  if (!scoringEligible) {
    return {
      workflowCandidatePolicySchemaVersion: WORKFLOW_CANDIDATE_POLICY_SCHEMA_VERSION,
      workflowCandidatePolicyVersion: WORKFLOW_CANDIDATE_POLICY_VERSION,
      workflowCandidatePolicyEligible: false,
      workflowCandidatePolicyWorkflowClass: null,
      workflowCandidatePolicyTrustBand: null,
      workflowCandidatePolicyTrainingModeActive: null,
      workflowCandidatePolicyQuietModeEnabled: null,
      workflowCandidatePolicyInboxOnly: null,
      workflowCandidatePolicyAutoCreateLowRiskEnabled: null,
      workflowCandidatePolicyAutoSaveVeryLowRiskEnabled: null,
      workflowCandidatePolicyClassTrustAllowsAutoCreate: null,
      workflowCandidatePolicyClassTrustAllowsAutoSave: null,
      workflowCandidatePolicySource: source,
      workflowCandidatePolicyReasonCodes: ["workflow_candidate_policy_prerequisites_not_met"],
    };
  }

  const workflowClass = input.workflowClass ?? "workflow_candidate_default";
  const trustScore = clampScore(input.trustScore ?? 0);
  const trustBand = deriveTrustBand(trustScore);
  const creationRiskBand = input.creationRiskBand ?? null;
  const duplicateRisk = clampScore(input.duplicateRiskScore ?? 100);
  const familySplitRequired = input.familySplitRequired === true;

  const trainingModeActive = trustBand === "low";
  const quietModeEnabled = trustBand === "very_strong" && !trainingModeActive;
  const inboxOnly = workflowClass === "cross_app" || workflowClass === "shell" || workflowClass === "privileged_review_only";

  const lowRiskAllowed = creationRiskBand === "very_low" || creationRiskBand === "low";
  const autoCreateLowRiskEnabled =
    !inboxOnly &&
    !familySplitRequired &&
    lowRiskAllowed &&
    duplicateRisk <= 25 &&
    (workflowClass === "workflow_candidate_default" || workflowClass === "editor" || workflowClass === "navigation") &&
    (trustBand === "strong" || trustBand === "very_strong");

  const autoSaveVeryLowRiskEnabled =
    autoCreateLowRiskEnabled &&
    creationRiskBand === "very_low" &&
    duplicateRisk <= 10 &&
    trustBand === "very_strong";

  const reasonCodes = [
    `workflow_candidate_policy_class_${workflowClass}`,
    `workflow_candidate_policy_trust_band_${trustBand}`,
    trainingModeActive
      ? "workflow_candidate_policy_training_mode_active"
      : "workflow_candidate_policy_training_mode_inactive",
    quietModeEnabled
      ? "workflow_candidate_policy_quiet_mode_enabled"
      : "workflow_candidate_policy_quiet_mode_disabled",
    inboxOnly
      ? "workflow_candidate_policy_inbox_only"
      : "workflow_candidate_policy_surface_flexible",
    autoCreateLowRiskEnabled
      ? "workflow_candidate_policy_auto_create_low_risk_enabled"
      : "workflow_candidate_policy_auto_create_low_risk_disabled",
    autoSaveVeryLowRiskEnabled
      ? "workflow_candidate_policy_auto_save_very_low_risk_enabled"
      : "workflow_candidate_policy_auto_save_very_low_risk_disabled",
  ];
  if (familySplitRequired) {
    reasonCodes.push("workflow_candidate_policy_family_split_required");
  }

  return {
    workflowCandidatePolicySchemaVersion: WORKFLOW_CANDIDATE_POLICY_SCHEMA_VERSION,
    workflowCandidatePolicyVersion: WORKFLOW_CANDIDATE_POLICY_VERSION,
    workflowCandidatePolicyEligible: true,
    workflowCandidatePolicyWorkflowClass: workflowClass,
    workflowCandidatePolicyTrustBand: trustBand,
    workflowCandidatePolicyTrainingModeActive: trainingModeActive,
    workflowCandidatePolicyQuietModeEnabled: quietModeEnabled,
    workflowCandidatePolicyInboxOnly: inboxOnly,
    workflowCandidatePolicyAutoCreateLowRiskEnabled: autoCreateLowRiskEnabled,
    workflowCandidatePolicyAutoSaveVeryLowRiskEnabled: autoSaveVeryLowRiskEnabled,
    workflowCandidatePolicyClassTrustAllowsAutoCreate: autoCreateLowRiskEnabled,
    workflowCandidatePolicyClassTrustAllowsAutoSave: autoSaveVeryLowRiskEnabled,
    workflowCandidatePolicySource: source,
    workflowCandidatePolicyReasonCodes: reasonCodes,
  };
}
