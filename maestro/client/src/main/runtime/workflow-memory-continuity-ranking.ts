export const WORKFLOW_MEMORY_RANKING_VERSION = "3i_bounded_continuity_ranking_v1";

export interface WorkflowMemoryContinuityRankingInput {
  previousSemanticAddressId?: string | null;
  candidateSemanticAddressId?: string | null;
  transitionCounts?: Record<string, number> | null;
  continuationSuggested?: boolean | null;
  source?: string | null;
}

export interface WorkflowMemoryContinuityRankingFields {
  workflowMemoryRankingVersion: string | null;
  workflowMemoryRankingEligible: boolean | null;
  workflowMemoryRankingApplied: boolean | null;
  workflowMemoryRankingBoost: number | null;
  workflowMemoryRankingPreviousSemanticAddressId: string | null;
  workflowMemoryRankingCandidateSemanticAddressId: string | null;
  workflowMemoryRankingMatchedTransitionKey: string | null;
  workflowMemoryRankingTransitionCount: number | null;
  workflowMemoryRankingSeenBefore: boolean | null;
  workflowMemoryRankingSource: string | null;
  workflowMemoryRankingReasonCodes: string[] | null;
}

const WORKFLOW_MEMORY_RANKING_MAX_BOOST = 0.18;
const WORKFLOW_MEMORY_RANKING_STEP = 0.06;

export function deriveWorkflowMemoryContinuityRanking(
  input: WorkflowMemoryContinuityRankingInput
): WorkflowMemoryContinuityRankingFields {
  const previous = input.previousSemanticAddressId ?? null;
  const candidate = input.candidateSemanticAddressId ?? null;
  const continuationSuggested = input.continuationSuggested === true;
  const transitionKey = previous && candidate && previous !== candidate
    ? `${previous}->${candidate}`
    : null;
  const transitionCount = transitionKey
    ? (input.transitionCounts?.[transitionKey] ?? 0)
    : 0;
  const seenBefore = transitionKey ? transitionCount > 0 : false;
  const eligible = Boolean(previous && candidate && transitionKey && continuationSuggested);
  const applied = eligible && seenBefore;
  const boost = applied
    ? Math.min(transitionCount * WORKFLOW_MEMORY_RANKING_STEP, WORKFLOW_MEMORY_RANKING_MAX_BOOST)
    : 0;

  const reasonCodes = [
    'workflow_memory_ranking_evaluated',
    ...(eligible ? ['workflow_memory_ranking_eligible'] : ['workflow_memory_ranking_not_eligible']),
    ...(transitionKey ? ['workflow_memory_ranking_transition_key_present'] : ['workflow_memory_ranking_no_transition_key']),
    ...(continuationSuggested
      ? ['workflow_memory_ranking_continuation_suggested']
      : ['workflow_memory_ranking_no_continuation_suggestion']),
    ...(seenBefore
      ? ['workflow_memory_ranking_seen_before']
      : ['workflow_memory_ranking_not_seen_before']),
    ...(applied
      ? ['workflow_memory_ranking_applied']
      : ['workflow_memory_ranking_not_applied']),
  ];

  return {
    workflowMemoryRankingVersion: WORKFLOW_MEMORY_RANKING_VERSION,
    workflowMemoryRankingEligible: eligible,
    workflowMemoryRankingApplied: applied,
    workflowMemoryRankingBoost: boost,
    workflowMemoryRankingPreviousSemanticAddressId: previous,
    workflowMemoryRankingCandidateSemanticAddressId: candidate,
    workflowMemoryRankingMatchedTransitionKey: transitionKey,
    workflowMemoryRankingTransitionCount: transitionKey ? transitionCount : null,
    workflowMemoryRankingSeenBefore: transitionKey ? seenBefore : false,
    workflowMemoryRankingSource: input.source ?? 'h3_runtime_evidence',
    workflowMemoryRankingReasonCodes: reasonCodes,
  };
}
