export const WORKFLOW_MEMORY_ORDERING_VERSION = "3i_continuity_assisted_candidate_ordering_v1";

export interface WorkflowMemoryContinuityOrderingInput {
  baseScore?: number | null;
  previousSemanticAddressId?: string | null;
  candidateSemanticAddressId?: string | null;
  matchedTransitionKey?: string | null;
  transitionCount?: number | null;
  rankingApplied?: boolean | null;
  rankingBoost?: number | null;
  source?: string | null;
}

export interface WorkflowMemoryContinuityOrderingFields {
  workflowMemoryOrderingVersion: string | null;
  workflowMemoryOrderingEligible: boolean | null;
  workflowMemoryOrderingApplied: boolean | null;
  workflowMemoryOrderingBaseScore: number | null;
  workflowMemoryOrderingAdjustedScore: number | null;
  workflowMemoryOrderingBoost: number | null;
  workflowMemoryOrderingPreviousSemanticAddressId: string | null;
  workflowMemoryOrderingCandidateSemanticAddressId: string | null;
  workflowMemoryOrderingMatchedTransitionKey: string | null;
  workflowMemoryOrderingTransitionCount: number | null;
  workflowMemoryOrderingSource: string | null;
  workflowMemoryOrderingReasonCodes: string[] | null;
}

export function deriveWorkflowMemoryContinuityOrdering(
  input: WorkflowMemoryContinuityOrderingInput
): WorkflowMemoryContinuityOrderingFields {
  const baseScore = typeof input.baseScore === "number" ? input.baseScore : null;
  const rankingApplied = input.rankingApplied === true;
  const rankingBoost = typeof input.rankingBoost === "number" ? input.rankingBoost : 0;
  const eligible = baseScore !== null && rankingApplied;
  const applied = eligible;
  const adjustedScore = applied ? baseScore + rankingBoost : baseScore;

  const reasonCodes = [
    "workflow_memory_ordering_evaluated",
    ...(baseScore !== null
      ? ["workflow_memory_ordering_base_score_present"]
      : ["workflow_memory_ordering_no_base_score"]),
    ...(rankingApplied
      ? ["workflow_memory_ordering_ranking_applied"]
      : ["workflow_memory_ordering_ranking_not_applied"]),
    ...(applied
      ? ["workflow_memory_ordering_applied"]
      : ["workflow_memory_ordering_not_applied"]),
  ];

  return {
    workflowMemoryOrderingVersion: WORKFLOW_MEMORY_ORDERING_VERSION,
    workflowMemoryOrderingEligible: eligible,
    workflowMemoryOrderingApplied: applied,
    workflowMemoryOrderingBaseScore: baseScore,
    workflowMemoryOrderingAdjustedScore: adjustedScore,
    workflowMemoryOrderingBoost: applied ? rankingBoost : 0,
    workflowMemoryOrderingPreviousSemanticAddressId: input.previousSemanticAddressId ?? null,
    workflowMemoryOrderingCandidateSemanticAddressId: input.candidateSemanticAddressId ?? null,
    workflowMemoryOrderingMatchedTransitionKey: input.matchedTransitionKey ?? null,
    workflowMemoryOrderingTransitionCount: input.transitionCount ?? null,
    workflowMemoryOrderingSource: input.source ?? "h3_runtime_evidence",
    workflowMemoryOrderingReasonCodes: reasonCodes,
  };
}
