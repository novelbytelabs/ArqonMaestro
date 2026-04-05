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
  const confidence = clampScore(input.confidenceScore ?? 0);
  const utility = clampScore(input.utilityScore ?? 0);
  const creationRisk = clampScore(input.creationRiskScore ?? 100);
  const suggestionPressure = clampScore(input.suggestionPressureScore ?? 100);
  const trust = clampScore(input.trustScore ?? 0);
  const novelty = clampScore(input.noveltyScore ?? 0);
  const duplicateRisk = clampScore(input.duplicateRiskScore ?? 100);
  const ceiling = ceilingForRiskBand(input.creationRiskBand ?? null);
  const floor: WorkflowCandidatePromotionDecision =
    confidence >= 45 || utility >= 45 ? "hold_for_more_evidence" : "observe_only";

  const autoCreateEligible =
    !vetoApplied &&
    baselinePassed &&
    classPassed &&
    userPassed &&
    timingPassed &&
    input.creationRiskBand === "very_low" &&
    trust >= 55 &&
    utility >= 70 &&
    duplicateRisk <= 20 &&
    suggestionPressure <= 26;

  const autoSaveEligible = false;

  let decision: WorkflowCandidatePromotionDecision = "observe_only";
  if (!baselinePassed || vetoApplied) {
    decision = confidence >= 45 || utility >= 45 ? "hold_for_more_evidence" : "observe_only";
  } else if (!classPassed || !userPassed) {
    decision = "hold_for_more_evidence";
  } else if (autoCreateEligible && ceiling === "auto_create_draft") {
    decision = "auto_create_draft";
  } else if (timingPassed && suggestedSurface === "inline" && (ceiling === "suggest_inline" || ceiling === "auto_create_draft")) {
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
      ? "workflow_candidate_promotion_auto_create_scaffold_eligible"
      : "workflow_candidate_promotion_auto_create_scaffold_not_eligible",
    "workflow_candidate_promotion_auto_save_reserved_for_stage3j_s5_policy",
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
