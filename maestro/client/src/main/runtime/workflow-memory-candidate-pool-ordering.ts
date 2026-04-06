import { deriveWorkflowMemoryContinuityRanking } from "./workflow-memory-continuity-ranking";

export const WORKFLOW_MEMORY_CANDIDATE_POOL_ORDERING_VERSION =
  "3i_candidate_pool_ordering_expansion_v1";

export interface WorkflowMemoryCandidatePoolOrderingInput {
  previousSemanticAddressId?: string | null;
  candidateSemanticAddressIds?: string[] | null;
  candidateScores?: number[] | null;
  transitionCounts?: Record<string, number> | null;
  continuationSuggested?: boolean | null;
  source?: string | null;
}

export interface WorkflowMemoryCandidatePoolOrderingFields {
  workflowMemoryCandidatePoolOrderingVersion: string | null;
  workflowMemoryCandidatePoolOrderingEligible: boolean | null;
  workflowMemoryCandidatePoolOrderingApplied: boolean | null;
  workflowMemoryCandidatePoolCandidateCountBefore: number | null;
  workflowMemoryCandidatePoolCandidateCountAfter: number | null;
  workflowMemoryCandidatePoolSemanticAddressIdsBefore: string[] | null;
  workflowMemoryCandidatePoolSemanticAddressIdsAfter: string[] | null;
  workflowMemoryCandidatePoolScoresBefore: number[] | null;
  workflowMemoryCandidatePoolScoresAfter: number[] | null;
  workflowMemoryCandidatePoolTopCandidateSemanticAddressIdBefore: string | null;
  workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter: string | null;
  workflowMemoryCandidatePoolTopCandidateScoreBefore: number | null;
  workflowMemoryCandidatePoolTopCandidateScoreAfter: number | null;
  workflowMemoryCandidatePoolSource: string | null;
  workflowMemoryCandidatePoolReasonCodes: string[] | null;
}

export function deriveWorkflowMemoryCandidatePoolOrdering(
  input: WorkflowMemoryCandidatePoolOrderingInput
): WorkflowMemoryCandidatePoolOrderingFields {
  const previousSemanticAddressId = input.previousSemanticAddressId ?? null;
  const candidateSemanticAddressIds = Array.isArray(input.candidateSemanticAddressIds)
    ? input.candidateSemanticAddressIds.filter(
        (value): value is string => typeof value === "string" && value.length > 0
      )
    : [];
  const rawCandidateScores = Array.isArray(input.candidateScores)
    ? input.candidateScores
    : [];
  const alignedCandidateScores = candidateSemanticAddressIds.map((_, index) => {
    const score = rawCandidateScores[index];
    return typeof score === "number" && Number.isFinite(score) ? score : 0;
  });

  const candidateCountBefore = candidateSemanticAddressIds.length;
  const hasAlignedPool =
    candidateCountBefore > 0 && candidateCountBefore === alignedCandidateScores.length;
  const hasMultiCandidatePool = hasAlignedPool && candidateCountBefore >= 2;

  const beforeIds = hasAlignedPool ? candidateSemanticAddressIds.slice() : null;
  const beforeScores = hasAlignedPool ? alignedCandidateScores.slice() : null;
  const topCandidateSemanticAddressIdBefore =
    hasAlignedPool && candidateSemanticAddressIds.length > 0
      ? candidateSemanticAddressIds[0]
      : null;
  const topCandidateScoreBefore =
    hasAlignedPool && alignedCandidateScores.length > 0
      ? alignedCandidateScores[0]
      : null;

  const transitionCounts = input.transitionCounts ?? {};
  const candidateRows = hasAlignedPool
    ? candidateSemanticAddressIds.map((candidateSemanticAddressId, index) => {
        const transitionKey =
          previousSemanticAddressId &&
          candidateSemanticAddressId &&
          previousSemanticAddressId !== candidateSemanticAddressId
            ? `${previousSemanticAddressId}->${candidateSemanticAddressId}`
            : null;
        const transitionCount = transitionKey ? (transitionCounts[transitionKey] ?? 0) : 0;
        const continuationSuggested =
          input.continuationSuggested ?? (transitionKey ? transitionCount > 0 : false);
        const rankingFields = deriveWorkflowMemoryContinuityRanking({
          previousSemanticAddressId,
          candidateSemanticAddressId,
          transitionCounts,
          continuationSuggested,
          source: input.source ?? "h3_runtime_evidence",
        });
        const boost = rankingFields.workflowMemoryRankingApplied
          ? (rankingFields.workflowMemoryRankingBoost ?? 0)
          : 0;
        const adjustedScore = Math.min(1, Math.max(0, alignedCandidateScores[index] + boost));
        return {
          candidateSemanticAddressId,
          baseScore: alignedCandidateScores[index],
          adjustedScore,
          boost,
        };
      })
    : [];

  const applied = hasMultiCandidatePool && candidateRows.some((row) => row.boost > 0);
  const reorderedRows = applied
    ? candidateRows
        .map((row, originalIndex) => ({ ...row, originalIndex }))
        .sort((a, b) => {
          if (b.adjustedScore !== a.adjustedScore) {
            return b.adjustedScore - a.adjustedScore;
          }
          return a.originalIndex - b.originalIndex;
        })
    : candidateRows.map((row, originalIndex) => ({ ...row, originalIndex }));

  const afterIds = hasAlignedPool
    ? reorderedRows.map((row) => row.candidateSemanticAddressId)
    : null;
  const afterScores = hasAlignedPool
    ? reorderedRows.map((row) =>
        Number((applied ? row.adjustedScore : row.baseScore).toFixed(2))
      )
    : null;
  const topCandidateSemanticAddressIdAfter =
    afterIds && afterIds.length > 0 ? afterIds[0] : null;
  const topCandidateScoreAfter =
    afterScores && afterScores.length > 0 ? afterScores[0] : null;

  const reasonCodes = [
    "workflow_memory_candidate_pool_ordering_evaluated",
    ...(hasAlignedPool
      ? ["workflow_memory_candidate_pool_present"]
      : ["workflow_memory_candidate_pool_absent"]),
    ...(hasMultiCandidatePool
      ? ["workflow_memory_candidate_pool_multi_candidate"]
      : ["workflow_memory_candidate_pool_singleton_or_invalid"]),
    ...(previousSemanticAddressId
      ? ["workflow_memory_candidate_pool_previous_semantic_address_present"]
      : ["workflow_memory_candidate_pool_no_previous_semantic_address"]),
    ...(applied
      ? ["workflow_memory_candidate_pool_ordering_applied"]
      : ["workflow_memory_candidate_pool_ordering_not_applied"]),
  ];

  return {
    workflowMemoryCandidatePoolOrderingVersion:
      WORKFLOW_MEMORY_CANDIDATE_POOL_ORDERING_VERSION,
    workflowMemoryCandidatePoolOrderingEligible:
      Boolean(previousSemanticAddressId && hasMultiCandidatePool),
    workflowMemoryCandidatePoolOrderingApplied: applied,
    workflowMemoryCandidatePoolCandidateCountBefore:
      hasAlignedPool ? candidateCountBefore : null,
    workflowMemoryCandidatePoolCandidateCountAfter:
      hasAlignedPool ? reorderedRows.length : null,
    workflowMemoryCandidatePoolSemanticAddressIdsBefore: beforeIds,
    workflowMemoryCandidatePoolSemanticAddressIdsAfter: afterIds,
    workflowMemoryCandidatePoolScoresBefore: beforeScores,
    workflowMemoryCandidatePoolScoresAfter: afterScores,
    workflowMemoryCandidatePoolTopCandidateSemanticAddressIdBefore:
      topCandidateSemanticAddressIdBefore,
    workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter:
      topCandidateSemanticAddressIdAfter,
    workflowMemoryCandidatePoolTopCandidateScoreBefore:
      topCandidateScoreBefore,
    workflowMemoryCandidatePoolTopCandidateScoreAfter:
      topCandidateScoreAfter,
    workflowMemoryCandidatePoolSource: input.source ?? "h3_runtime_evidence",
    workflowMemoryCandidatePoolReasonCodes: reasonCodes,
  };
}
