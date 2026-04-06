export const WORKFLOW_MEMORY_REUSE_VERSION = "3i_workflow_reuse_substrate_v1";

export interface WorkflowMemoryReuseSubstrateInput {
  governedHistory?: string[] | null;
  currentSemanticAddressId?: string | null;
  finalGranted?: boolean | null;
  maxPatternLength?: number | null;
  source?: string | null;
}

export interface WorkflowMemoryReuseSubstrateFields {
  workflowMemoryReuseVersion: string | null;
  workflowMemoryReuseEligible: boolean | null;
  workflowMemoryReuseApplied: boolean | null;
  workflowMemoryReusePatternLength: number | null;
  workflowMemoryReuseMatchedSequenceSemanticAddressIds: string[] | null;
  workflowMemoryReuseMatchedSequenceKey: string | null;
  workflowMemoryReuseSeenBefore: boolean | null;
  workflowMemoryReuseOccurrenceCount: number | null;
  workflowMemoryReuseSuggestedNextSemanticAddressId: string | null;
  workflowMemoryReuseSuggestedNextCount: number | null;
  workflowMemoryReuseSource: string | null;
  workflowMemoryReuseReasonCodes: string[] | null;
}

export function deriveWorkflowMemoryReuseSubstrate(
  input: WorkflowMemoryReuseSubstrateInput
): WorkflowMemoryReuseSubstrateFields {
  const priorHistory = Array.isArray(input.governedHistory)
    ? input.governedHistory.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  const currentSemanticAddressId = input.currentSemanticAddressId ?? null;
  const finalGranted = input.finalGranted ?? null;
  const effectiveHistory =
    finalGranted && currentSemanticAddressId
      ? [...priorHistory, currentSemanticAddressId]
      : priorHistory.slice();
  const maxPatternLength = Math.max(2, Math.min(3, input.maxPatternLength ?? 3));

  const reasonCodes = ["workflow_memory_reuse_evaluated"];
  if (effectiveHistory.length < 2) {
    return {
      workflowMemoryReuseVersion: WORKFLOW_MEMORY_REUSE_VERSION,
      workflowMemoryReuseEligible: false,
      workflowMemoryReuseApplied: false,
      workflowMemoryReusePatternLength: null,
      workflowMemoryReuseMatchedSequenceSemanticAddressIds: null,
      workflowMemoryReuseMatchedSequenceKey: null,
      workflowMemoryReuseSeenBefore: false,
      workflowMemoryReuseOccurrenceCount: 0,
      workflowMemoryReuseSuggestedNextSemanticAddressId: null,
      workflowMemoryReuseSuggestedNextCount: 0,
      workflowMemoryReuseSource: input.source ?? "h3_runtime_evidence",
      workflowMemoryReuseReasonCodes: [...reasonCodes, "workflow_memory_reuse_insufficient_history"],
    };
  }

  for (let patternLength = maxPatternLength; patternLength >= 2; patternLength -= 1) {
    if (effectiveHistory.length < patternLength) {
      continue;
    }
    const pattern = effectiveHistory.slice(effectiveHistory.length - patternLength);
    const nextCounts: Record<string, number> = {};
    let occurrenceCount = 0;

    for (let start = 0; start <= effectiveHistory.length - patternLength - 1; start += 1) {
      const window = effectiveHistory.slice(start, start + patternLength);
      if (window.join("\u0000") !== pattern.join("\u0000")) {
        continue;
      }
      const nextSemanticAddressId = effectiveHistory[start + patternLength];
      if (!nextSemanticAddressId) {
        continue;
      }
      occurrenceCount += 1;
      nextCounts[nextSemanticAddressId] = (nextCounts[nextSemanticAddressId] ?? 0) + 1;
    }

    if (occurrenceCount <= 0) {
      continue;
    }

    const suggestedNextSemanticAddressId = Object.entries(nextCounts).sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0]);
    })[0]?.[0] ?? null;
    const suggestedNextCount = suggestedNextSemanticAddressId
      ? nextCounts[suggestedNextSemanticAddressId] ?? 0
      : 0;

    return {
      workflowMemoryReuseVersion: WORKFLOW_MEMORY_REUSE_VERSION,
      workflowMemoryReuseEligible: true,
      workflowMemoryReuseApplied: Boolean(suggestedNextSemanticAddressId),
      workflowMemoryReusePatternLength: patternLength,
      workflowMemoryReuseMatchedSequenceSemanticAddressIds: pattern,
      workflowMemoryReuseMatchedSequenceKey: pattern.join("->"),
      workflowMemoryReuseSeenBefore: true,
      workflowMemoryReuseOccurrenceCount: occurrenceCount,
      workflowMemoryReuseSuggestedNextSemanticAddressId: suggestedNextSemanticAddressId,
      workflowMemoryReuseSuggestedNextCount: suggestedNextCount,
      workflowMemoryReuseSource: input.source ?? "h3_runtime_evidence",
      workflowMemoryReuseReasonCodes: [
        ...reasonCodes,
        "workflow_memory_reuse_pattern_matched",
        `workflow_memory_reuse_pattern_length_${patternLength}`,
        ...(suggestedNextSemanticAddressId
          ? ["workflow_memory_reuse_next_suggestion_present"]
          : ["workflow_memory_reuse_next_suggestion_absent"]),
      ],
    };
  }

  return {
    workflowMemoryReuseVersion: WORKFLOW_MEMORY_REUSE_VERSION,
    workflowMemoryReuseEligible: true,
    workflowMemoryReuseApplied: false,
    workflowMemoryReusePatternLength: null,
    workflowMemoryReuseMatchedSequenceSemanticAddressIds: null,
    workflowMemoryReuseMatchedSequenceKey: null,
    workflowMemoryReuseSeenBefore: false,
    workflowMemoryReuseOccurrenceCount: 0,
    workflowMemoryReuseSuggestedNextSemanticAddressId: null,
    workflowMemoryReuseSuggestedNextCount: 0,
    workflowMemoryReuseSource: input.source ?? "h3_runtime_evidence",
    workflowMemoryReuseReasonCodes: [...reasonCodes, "workflow_memory_reuse_no_repeat_pattern"],
  };
}
