export const WORKFLOW_CANDIDATE_PROMOTION_SCHEMA_VERSION =
  "3j_workflow_candidate_promotion_v1";
export const WORKFLOW_CANDIDATE_PROMOTION_POLICY_VERSION =
  "3j_bounded_promotion_engine_v1";

export type WorkflowCandidatePromotionDecision =
  | "observe_only"
  | "hold_for_more_evidence"
  | "suggest_in_inbox"
  | "suggest_inline"
  | "auto_create_draft"
  | "auto_save_draft";

export interface WorkflowCandidatePromotionInput {
  rubricEligible?: boolean | null;
  baselineRubricPassed?: boolean | null;
  classRubricPassed?: boolean | null;
  userRubricPassed?: boolean | null;
  timingRubricPassed?: boolean | null;
  rubricVetoApplied?: boolean | null;
  suggestedSurface?: string | null;
  confidenceScore?: number | null;
  utilityScore?: number | null;
  creationRiskScore?: number | null;
  suggestionPressureScore?: number | null;
  trustScore?: number | null;
  noveltyScore?: number | null;
  duplicateRiskScore?: number | null;
  creationRiskBand?: string | null;
  policyEligible?: boolean | null;
  policyAutoCreateLowRiskEnabled?: boolean | null;
  policyAutoSaveVeryLowRiskEnabled?: boolean | null;
  policyInboxOnly?: boolean | null;
  policyTrustBand?: string | null;
  timingEligible?: boolean | null;
  timingChannel?: string | null;
  source?: string | null;
}

export interface WorkflowCandidatePromotionFields {
  workflowCandidatePromotionSchemaVersion: string | null;
  workflowCandidatePromotionPolicyVersion: string | null;
  workflowCandidatePromotionEligible: boolean | null;
  workflowCandidatePromotionDecision: WorkflowCandidatePromotionDecision | null;
  workflowCandidatePromotionAutoCreateEligible: boolean | null;
  workflowCandidatePromotionAutoSaveEligible: boolean | null;
  workflowCandidatePromotionCeiling: WorkflowCandidatePromotionDecision | null;
  workflowCandidatePromotionFloor: WorkflowCandidatePromotionDecision | null;
  workflowCandidatePromotionDecisionConfidence: number | null;
  workflowCandidatePromotionSource: string | null;
  workflowCandidatePromotionReasonCodes: string[] | null;
}

function clampScore(value: number): number {
  return Number(Math.min(100, Math.max(0, value)).toFixed(2));
}

function ceilingForRiskBand(riskBand: string | null | undefined): WorkflowCandidatePromotionDecision {
  switch (riskBand) {
    case "very_low":
      return "auto_create_draft";
    case "low":
      return "suggest_inline";
    case "moderate":
      return "suggest_in_inbox";
    case "high":
      return "hold_for_more_evidence";
    case "very_high":
      return "observe_only";
    default:
      return "hold_for_more_evidence";
  }
}

export function deriveWorkflowCandidatePromotion(
  input: WorkflowCandidatePromotionInput
): WorkflowCandidatePromotionFields {
  const rubricEligible = input.rubricEligible ?? null;
  const source = input.source ?? "h3_runtime_evidence";
  if (!rubricEligible) {
    return {
      workflowCandidatePromotionSchemaVersion: WORKFLOW_CANDIDATE_PROMOTION_SCHEMA_VERSION,
      workflowCandidatePromotionPolicyVersion: WORKFLOW_CANDIDATE_PROMOTION_POLICY_VERSION,
      workflowCandidatePromotionEligible: false,
      workflowCandidatePromotionDecision: null,
      workflowCandidatePromotionAutoCreateEligible: null,
      workflowCandidatePromotionAutoSaveEligible: null,
      workflowCandidatePromotionCeiling: null,
      workflowCandidatePromotionFloor: null,
      workflowCandidatePromotionDecisionConfidence: null,
      workflowCandidatePromotionSource: source,
      workflowCandidatePromotionReasonCodes: ["workflow_candidate_promotion_prerequisites_not_met"],
    };
  }

  const baselinePassed = input.baselineRubricPassed === true;
  const classPassed = input.classRubricPassed === true;
  const userPassed = input.userRubricPassed === true;
  const timingPassed = input.timingRubricPassed === true;
  const vetoApplied = input.rubricVetoApplied === true;
  const suggestedSurface = input.suggestedSurface ?? "silent";
  const policyEligible = input.policyEligible === true;
  const policyAutoCreateLowRiskEnabled = input.policyAutoCreateLowRiskEnabled === true;
  const policyAutoSaveVeryLowRiskEnabled = input.policyAutoSaveVeryLowRiskEnabled === true;
  const policyInboxOnly = input.policyInboxOnly === true;
  const policyTrustBand = input.policyTrustBand ?? null;
  const timingEligible = input.timingEligible === true;
  const timingChannel = input.timingChannel ?? null;
  const confidence = clampScore(input.confidenceScore ?? 0);
  const utility = clampScore(input.utilityScore ?? 0);
  const creationRisk = clampScore(input.creationRiskScore ?? 100);
  const suggestionPressure = clampScore(input.suggestionPressureScore ?? 100);
  const trust = clampScore(input.trustScore ?? 0);
  const novelty = clampScore(input.noveltyScore ?? 0);
  const duplicateRisk = clampScore(input.duplicateRiskScore ?? 100);
  let ceiling = ceilingForRiskBand(input.creationRiskBand ?? null);
  if (policyEligible && policyAutoSaveVeryLowRiskEnabled && input.creationRiskBand === "very_low") {
    ceiling = "auto_save_draft";
  } else if (policyEligible && policyAutoCreateLowRiskEnabled && (input.creationRiskBand === "very_low" || input.creationRiskBand === "low")) {
    ceiling = "auto_create_draft";
  } else if (policyInboxOnly && ceiling === "suggest_inline") {
    ceiling = "suggest_in_inbox";
  }
  const floor: WorkflowCandidatePromotionDecision =
    confidence >= 45 || utility >= 45 ? "hold_for_more_evidence" : "observe_only";

  const autoCreateEligible =
    !vetoApplied &&
    baselinePassed &&
    classPassed &&
    userPassed &&
    timingPassed &&
    policyEligible &&
    policyAutoCreateLowRiskEnabled &&
    (input.creationRiskBand === "very_low" || input.creationRiskBand === "low") &&
    (policyTrustBand === "strong" || policyTrustBand === "very_strong") &&
    trust >= 60 &&
    utility >= 68 &&
    duplicateRisk <= 18 &&
    suggestionPressure <= 22;

  const autoSaveEligible =
    autoCreateEligible &&
    policyAutoSaveVeryLowRiskEnabled &&
    input.creationRiskBand === "very_low" &&
    policyTrustBand === "very_strong" &&
    duplicateRisk <= 8 &&
    suggestionPressure <= 16;

  let decision: WorkflowCandidatePromotionDecision = "observe_only";
  if (!baselinePassed || vetoApplied) {
    decision = confidence >= 45 || utility >= 45 ? "hold_for_more_evidence" : "observe_only";
  } else if (!classPassed || !userPassed) {
    decision = "hold_for_more_evidence";
  } else if (autoSaveEligible && ceiling === "auto_save_draft") {
    decision = "auto_save_draft";
  } else if (autoCreateEligible && (ceiling === "auto_create_draft" || ceiling === "auto_save_draft")) {
    decision = "auto_create_draft";
  } else if (timingEligible && timingChannel === "quiet_auto_draft" && autoCreateEligible) {
    decision = "auto_create_draft";
  } else if (timingPassed && suggestedSurface === "inline" && (ceiling === "suggest_inline" || ceiling === "auto_create_draft" || ceiling === "auto_save_draft")) {
    decision = "suggest_inline";
  } else if (timingPassed && (suggestedSurface === "inbox" || suggestedSurface === "digest") && ceiling !== "observe_only") {
    decision = "suggest_in_inbox";
  } else {
    decision = floor;
  }

  const decisionConfidence = clampScore(
    0.35 * confidence + 0.25 * utility + 0.2 * trust + 0.1 * novelty + 0.1 * (100 - creationRisk)
  );

  const reasonCodes: string[] = [
    `workflow_candidate_promotion_decision_${decision}`,
    `workflow_candidate_promotion_ceiling_${ceiling}`,
    `workflow_candidate_promotion_floor_${floor}`,
    autoCreateEligible
      ? "workflow_candidate_promotion_auto_create_policy_eligible"
      : "workflow_candidate_promotion_auto_create_policy_not_eligible",
    autoSaveEligible
      ? "workflow_candidate_promotion_auto_save_policy_eligible"
      : "workflow_candidate_promotion_auto_save_policy_not_eligible",
  ];
  if (vetoApplied) {
    reasonCodes.push("workflow_candidate_promotion_rubric_veto_applied");
  }
  if (suggestedSurface) {
    reasonCodes.push(`workflow_candidate_promotion_surface_${suggestedSurface}`);
  }

  return {
    workflowCandidatePromotionSchemaVersion: WORKFLOW_CANDIDATE_PROMOTION_SCHEMA_VERSION,
    workflowCandidatePromotionPolicyVersion: WORKFLOW_CANDIDATE_PROMOTION_POLICY_VERSION,
    workflowCandidatePromotionEligible: true,
    workflowCandidatePromotionDecision: decision,
    workflowCandidatePromotionAutoCreateEligible: autoCreateEligible,
    workflowCandidatePromotionAutoSaveEligible: autoSaveEligible,
    workflowCandidatePromotionCeiling: ceiling,
    workflowCandidatePromotionFloor: floor,
    workflowCandidatePromotionDecisionConfidence: decisionConfidence,
    workflowCandidatePromotionSource: source,
    workflowCandidatePromotionReasonCodes: reasonCodes,
  };
}
