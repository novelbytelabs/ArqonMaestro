export const WORKFLOW_CANDIDATE_DISCOVERY_SCHEMA_VERSION =
  "3j_workflow_candidate_discovery_v1";
export const WORKFLOW_CANDIDATE_DISCOVERY_POLICY_VERSION =
  "3j_governed_subsequence_discovery_v1";

const MAX_GOVERNED_HISTORY = 12;
const MAX_SUBSEQUENCE_LENGTH = 4;
const MIN_DISCOVERY_SEQUENCE_LENGTH = 2;
const MIN_DISCOVERY_OCCURRENCE_COUNT = 2;
const MIN_DISCOVERY_DISTINCT_RUN_COUNT = 2;

export interface WorkflowCandidateDiscoveryState {
  governedHistory: string[];
  patternCounts: Record<string, number>;
  patternDistinctRunCounts: Record<string, number>;
  patternLastOccurrenceEndIndex: Record<string, number>;
  emergedPatternKeys: Record<string, boolean>;
}

export interface WorkflowCandidateDiscoveryInput {
  semanticAddressId?: string | null;
  finalGranted?: boolean | null;
  source?: string | null;
  previousState?: WorkflowCandidateDiscoveryState | null;
}

export interface WorkflowCandidateDiscoveryFields {
  workflowCandidateDiscoverySchemaVersion: string | null;
  workflowCandidateDiscoveryPolicyVersion: string | null;
  workflowCandidateDiscoveryEligible: boolean | null;
  workflowCandidateDiscoverySequenceSemanticAddressIds: string[] | null;
  workflowCandidateDiscoveryPatternKey: string | null;
  workflowCandidateDiscoveryOccurrenceCount: number | null;
  workflowCandidateDiscoveryDistinctRunCount: number | null;
  workflowCandidateDiscoverySequenceLength: number | null;
  workflowCandidateDiscoveryStartBoundaryConfidence: number | null;
  workflowCandidateDiscoveryEndBoundaryConfidence: number | null;
  workflowCandidateDiscoveryRepeatedSubsequenceDetected: boolean | null;
  workflowCandidateDiscoveryCandidateEmergenceThresholdMet: boolean | null;
  workflowCandidateDiscoveryRediscoveryMerged: boolean | null;
  workflowCandidateDiscoveryGovernedStateUpdated: boolean | null;
  workflowCandidateDiscoverySource: string | null;
  workflowCandidateDiscoveryReasonCodes: string[] | null;
  nextState?: WorkflowCandidateDiscoveryState;
}

export function deriveEmptyWorkflowCandidateDiscoveryState(): WorkflowCandidateDiscoveryState {
  return {
    governedHistory: [],
    patternCounts: {},
    patternDistinctRunCounts: {},
    patternLastOccurrenceEndIndex: {},
    emergedPatternKeys: {},
  };
}

function cloneState(previousState?: WorkflowCandidateDiscoveryState | null): WorkflowCandidateDiscoveryState {
  const safe = previousState ?? deriveEmptyWorkflowCandidateDiscoveryState();
  return {
    governedHistory: Array.isArray(safe.governedHistory) ? safe.governedHistory.slice() : [],
    patternCounts: { ...(safe.patternCounts ?? {}) },
    patternDistinctRunCounts: { ...(safe.patternDistinctRunCounts ?? {}) },
    patternLastOccurrenceEndIndex: { ...(safe.patternLastOccurrenceEndIndex ?? {}) },
    emergedPatternKeys: { ...(safe.emergedPatternKeys ?? {}) },
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function canonicalPatternKey(sequenceSemanticAddressIds: string[]): string {
  return sequenceSemanticAddressIds.join("::");
}

export function deriveWorkflowCandidateDiscovery(
  input: WorkflowCandidateDiscoveryInput
): WorkflowCandidateDiscoveryFields {
  const semanticAddressId = input.semanticAddressId ?? null;
  const finalGranted = input.finalGranted ?? null;
  const source = input.source ?? "h3_runtime_evidence";
  const nextState = cloneState(input.previousState ?? null);

  if (!semanticAddressId || !finalGranted) {
    return {
      workflowCandidateDiscoverySchemaVersion: WORKFLOW_CANDIDATE_DISCOVERY_SCHEMA_VERSION,
      workflowCandidateDiscoveryPolicyVersion: WORKFLOW_CANDIDATE_DISCOVERY_POLICY_VERSION,
      workflowCandidateDiscoveryEligible: false,
      workflowCandidateDiscoverySequenceSemanticAddressIds: null,
      workflowCandidateDiscoveryPatternKey: null,
      workflowCandidateDiscoveryOccurrenceCount: null,
      workflowCandidateDiscoveryDistinctRunCount: null,
      workflowCandidateDiscoverySequenceLength: null,
      workflowCandidateDiscoveryStartBoundaryConfidence: null,
      workflowCandidateDiscoveryEndBoundaryConfidence: null,
      workflowCandidateDiscoveryRepeatedSubsequenceDetected: false,
      workflowCandidateDiscoveryCandidateEmergenceThresholdMet: false,
      workflowCandidateDiscoveryRediscoveryMerged: false,
      workflowCandidateDiscoveryGovernedStateUpdated: false,
      workflowCandidateDiscoverySource: source,
      workflowCandidateDiscoveryReasonCodes: ["workflow_candidate_discovery_not_governed"],
      nextState,
    };
  }

  nextState.governedHistory.push(semanticAddressId);
  if (nextState.governedHistory.length > MAX_GOVERNED_HISTORY) {
    nextState.governedHistory = nextState.governedHistory.slice(-MAX_GOVERNED_HISTORY);
  }

  if (nextState.governedHistory.length < MIN_DISCOVERY_SEQUENCE_LENGTH) {
    return {
      workflowCandidateDiscoverySchemaVersion: WORKFLOW_CANDIDATE_DISCOVERY_SCHEMA_VERSION,
      workflowCandidateDiscoveryPolicyVersion: WORKFLOW_CANDIDATE_DISCOVERY_POLICY_VERSION,
      workflowCandidateDiscoveryEligible: false,
      workflowCandidateDiscoverySequenceSemanticAddressIds: null,
      workflowCandidateDiscoveryPatternKey: null,
      workflowCandidateDiscoveryOccurrenceCount: null,
      workflowCandidateDiscoveryDistinctRunCount: null,
      workflowCandidateDiscoverySequenceLength: null,
      workflowCandidateDiscoveryStartBoundaryConfidence: null,
      workflowCandidateDiscoveryEndBoundaryConfidence: null,
      workflowCandidateDiscoveryRepeatedSubsequenceDetected: false,
      workflowCandidateDiscoveryCandidateEmergenceThresholdMet: false,
      workflowCandidateDiscoveryRediscoveryMerged: false,
      workflowCandidateDiscoveryGovernedStateUpdated: true,
      workflowCandidateDiscoverySource: source,
      workflowCandidateDiscoveryReasonCodes: ["workflow_candidate_discovery_history_too_short"],
      nextState,
    };
  }

  const maxLength = Math.min(MAX_SUBSEQUENCE_LENGTH, nextState.governedHistory.length);
  const endIndex = nextState.governedHistory.length - 1;
  const evaluated: Array<{
    sequenceSemanticAddressIds: string[];
    patternKey: string;
    occurrenceCount: number;
    distinctRunCount: number;
    sequenceLength: number;
    repeated: boolean;
    thresholdMet: boolean;
  }> = [];

  for (let sequenceLength = MIN_DISCOVERY_SEQUENCE_LENGTH; sequenceLength <= maxLength; sequenceLength += 1) {
    const sequenceSemanticAddressIds = nextState.governedHistory.slice(-sequenceLength);
    const patternKey = canonicalPatternKey(sequenceSemanticAddressIds);
    const occurrenceCount = (nextState.patternCounts[patternKey] ?? 0) + 1;
    nextState.patternCounts[patternKey] = occurrenceCount;
    const lastOccurrenceEndIndex = nextState.patternLastOccurrenceEndIndex[patternKey];
    const distinctRunCount =
      lastOccurrenceEndIndex === undefined || endIndex - lastOccurrenceEndIndex >= sequenceLength
        ? (nextState.patternDistinctRunCounts[patternKey] ?? 0) + 1
        : (nextState.patternDistinctRunCounts[patternKey] ?? 0);
    nextState.patternDistinctRunCounts[patternKey] = distinctRunCount;
    nextState.patternLastOccurrenceEndIndex[patternKey] = endIndex;
    const repeated = occurrenceCount >= MIN_DISCOVERY_OCCURRENCE_COUNT;
    const thresholdMet =
      repeated &&
      distinctRunCount >= MIN_DISCOVERY_DISTINCT_RUN_COUNT &&
      sequenceLength >= MIN_DISCOVERY_SEQUENCE_LENGTH;
    evaluated.push({ sequenceSemanticAddressIds, patternKey, occurrenceCount, distinctRunCount, sequenceLength, repeated, thresholdMet });
  }

  evaluated.sort((a, b) => {
    if (Number(b.thresholdMet) !== Number(a.thresholdMet)) return Number(b.thresholdMet) - Number(a.thresholdMet);
    if (Number(b.repeated) !== Number(a.repeated)) return Number(b.repeated) - Number(a.repeated);
    if (b.sequenceLength !== a.sequenceLength) return b.sequenceLength - a.sequenceLength;
    return b.occurrenceCount - a.occurrenceCount;
  });

  const selected = evaluated[0];
  const rediscoveryMerged = selected.thresholdMet && Boolean(nextState.emergedPatternKeys[selected.patternKey]);
  if (selected.thresholdMet) {
    nextState.emergedPatternKeys[selected.patternKey] = true;
  }

  const startBoundaryConfidence = clamp01(
    selected.thresholdMet
      ? 0.62 + 0.08 * Math.min(selected.distinctRunCount - 1, 3) + 0.04 * Math.min(selected.sequenceLength - 2, 2)
      : 0.38 + 0.05 * Math.min(selected.sequenceLength - 2, 2)
  );
  const endBoundaryConfidence = clamp01(
    selected.thresholdMet
      ? 0.66 + 0.08 * Math.min(selected.distinctRunCount - 1, 3) + 0.04 * Math.min(selected.sequenceLength - 2, 2)
      : 0.42 + 0.05 * Math.min(selected.sequenceLength - 2, 2)
  );

  return {
    workflowCandidateDiscoverySchemaVersion: WORKFLOW_CANDIDATE_DISCOVERY_SCHEMA_VERSION,
    workflowCandidateDiscoveryPolicyVersion: WORKFLOW_CANDIDATE_DISCOVERY_POLICY_VERSION,
    workflowCandidateDiscoveryEligible: true,
    workflowCandidateDiscoverySequenceSemanticAddressIds: selected.sequenceSemanticAddressIds,
    workflowCandidateDiscoveryPatternKey: selected.patternKey,
    workflowCandidateDiscoveryOccurrenceCount: selected.occurrenceCount,
    workflowCandidateDiscoveryDistinctRunCount: selected.distinctRunCount,
    workflowCandidateDiscoverySequenceLength: selected.sequenceLength,
    workflowCandidateDiscoveryStartBoundaryConfidence: Number(startBoundaryConfidence.toFixed(2)),
    workflowCandidateDiscoveryEndBoundaryConfidence: Number(endBoundaryConfidence.toFixed(2)),
    workflowCandidateDiscoveryRepeatedSubsequenceDetected: selected.repeated,
    workflowCandidateDiscoveryCandidateEmergenceThresholdMet: selected.thresholdMet,
    workflowCandidateDiscoveryRediscoveryMerged: rediscoveryMerged,
    workflowCandidateDiscoveryGovernedStateUpdated: true,
    workflowCandidateDiscoverySource: source,
    workflowCandidateDiscoveryReasonCodes: [
      "workflow_candidate_discovery_governed_evaluated",
      `workflow_candidate_discovery_sequence_length_${selected.sequenceLength}`,
      ...(selected.repeated ? ["workflow_candidate_discovery_repeated_subsequence_detected"] : ["workflow_candidate_discovery_repeated_subsequence_not_yet_detected"]),
      ...(selected.thresholdMet ? ["workflow_candidate_discovery_candidate_emergence_threshold_met"] : ["workflow_candidate_discovery_candidate_emergence_threshold_not_met"]),
      ...(rediscoveryMerged ? ["workflow_candidate_discovery_rediscovery_merged"] : ["workflow_candidate_discovery_new_or_prethreshold_pattern"]),
    ],
    nextState,
  };
}
