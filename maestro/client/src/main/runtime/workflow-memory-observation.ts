export const WORKFLOW_MEMORY_SCHEMA_VERSION = "3i_workflow_memory_observation_v1";
export const WORKFLOW_MEMORY_POLICY_VERSION = "3i_session_workflow_memory_v1";

export interface WorkflowMemoryObservationState {
  lastGovernedSemanticAddressId: string | null;
  sequenceLength: number;
  consecutiveRepeatCount: number;
  transitionCounts: Record<string, number>;
}

export interface WorkflowMemoryObservationInput {
  semanticAddressId: string | null;
  finalGranted?: boolean | null;
  source?: string | null;
  previousState?: WorkflowMemoryObservationState | null;
}

export interface WorkflowMemoryObservationFields {
  workflowMemorySchemaVersion: string | null;
  workflowMemoryPolicyVersion: string | null;
  workflowMemoryEligible: boolean | null;
  workflowMemoryCurrentSemanticAddressId: string | null;
  workflowMemoryPreviousSemanticAddressId: string | null;
  workflowMemoryTransitionObserved: boolean | null;
  workflowMemoryTransitionKey: string | null;
  workflowMemoryTransitionSeenBefore: boolean | null;
  workflowMemoryTransitionCount: number | null;
  workflowMemorySequenceLength: number | null;
  workflowMemoryRepeatDetected: boolean | null;
  workflowMemoryRepeatCount: number | null;
  workflowMemoryContinuationSuggested: boolean | null;
  workflowMemoryGovernedStateUpdated: boolean | null;
  workflowMemorySource: string | null;
  workflowMemoryReasonCodes: string[] | null;
  nextState: WorkflowMemoryObservationState;
}

const DEFAULT_STATE: WorkflowMemoryObservationState = {
  lastGovernedSemanticAddressId: null,
  sequenceLength: 0,
  consecutiveRepeatCount: 0,
  transitionCounts: {},
};

export function deriveWorkflowMemoryObservation(
  input: WorkflowMemoryObservationInput
): WorkflowMemoryObservationFields {
  const state: WorkflowMemoryObservationState = input.previousState
    ? {
        lastGovernedSemanticAddressId: input.previousState.lastGovernedSemanticAddressId ?? null,
        sequenceLength: input.previousState.sequenceLength ?? 0,
        consecutiveRepeatCount: input.previousState.consecutiveRepeatCount ?? 0,
        transitionCounts: { ...(input.previousState.transitionCounts ?? {}) },
      }
    : { ...DEFAULT_STATE, transitionCounts: {} };

  const current = input.semanticAddressId ?? null;
  const previous = state.lastGovernedSemanticAddressId;

  if (!current) {
    return {
      workflowMemorySchemaVersion: WORKFLOW_MEMORY_SCHEMA_VERSION,
      workflowMemoryPolicyVersion: WORKFLOW_MEMORY_POLICY_VERSION,
      workflowMemoryEligible: false,
      workflowMemoryCurrentSemanticAddressId: null,
      workflowMemoryPreviousSemanticAddressId: previous,
      workflowMemoryTransitionObserved: false,
      workflowMemoryTransitionKey: null,
      workflowMemoryTransitionSeenBefore: false,
      workflowMemoryTransitionCount: null,
      workflowMemorySequenceLength: state.sequenceLength,
      workflowMemoryRepeatDetected: false,
      workflowMemoryRepeatCount: state.consecutiveRepeatCount,
      workflowMemoryContinuationSuggested: false,
      workflowMemoryGovernedStateUpdated: false,
      workflowMemorySource: input.source ?? "h3_runtime_evidence",
      workflowMemoryReasonCodes: ["workflow_memory_ineligible_no_semantic_address"],
      nextState: state,
    };
  }

  const repeatDetected = previous !== null && previous === current;
  const transitionObserved = previous !== null && previous !== current;
  const transitionKey = transitionObserved ? `${previous}->${current}` : null;
  const priorTransitionCount = transitionKey ? (state.transitionCounts[transitionKey] ?? 0) : 0;
  const transitionSeenBefore = transitionKey ? priorTransitionCount > 0 : false;
  const finalGranted = input.finalGranted === true;

  let nextState: WorkflowMemoryObservationState = {
    lastGovernedSemanticAddressId: state.lastGovernedSemanticAddressId,
    sequenceLength: state.sequenceLength,
    consecutiveRepeatCount: state.consecutiveRepeatCount,
    transitionCounts: { ...state.transitionCounts },
  };

  if (finalGranted) {
    nextState.sequenceLength += 1;
    if (repeatDetected) {
      nextState.consecutiveRepeatCount += 1;
    } else {
      nextState.consecutiveRepeatCount = 0;
    }
    if (transitionKey) {
      nextState.transitionCounts[transitionKey] = priorTransitionCount + 1;
    }
    nextState.lastGovernedSemanticAddressId = current;
  }

  const effectiveTransitionCount = transitionKey
    ? (finalGranted ? nextState.transitionCounts[transitionKey] : priorTransitionCount)
    : null;
  const effectiveRepeatCount = finalGranted
    ? nextState.consecutiveRepeatCount
    : (repeatDetected ? state.consecutiveRepeatCount + 1 : 0);
  const continuationSuggested = repeatDetected || transitionSeenBefore;

  const reasonCodes = [
    "workflow_memory_semantic_address_observed",
    ...(transitionObserved ? ["workflow_memory_transition_observed"] : []),
    ...(repeatDetected ? ["workflow_memory_repeat_detected"] : []),
    ...(transitionSeenBefore ? ["workflow_memory_seen_before"] : []),
    ...(continuationSuggested ? ["workflow_memory_continuation_suggested"] : []),
    ...(finalGranted ? ["workflow_memory_governed_state_updated"] : ["workflow_memory_governed_state_not_updated"]),
  ];

  return {
    workflowMemorySchemaVersion: WORKFLOW_MEMORY_SCHEMA_VERSION,
    workflowMemoryPolicyVersion: WORKFLOW_MEMORY_POLICY_VERSION,
    workflowMemoryEligible: true,
    workflowMemoryCurrentSemanticAddressId: current,
    workflowMemoryPreviousSemanticAddressId: previous,
    workflowMemoryTransitionObserved: transitionObserved,
    workflowMemoryTransitionKey: transitionKey,
    workflowMemoryTransitionSeenBefore: transitionSeenBefore,
    workflowMemoryTransitionCount: effectiveTransitionCount,
    workflowMemorySequenceLength: finalGranted ? nextState.sequenceLength : state.sequenceLength,
    workflowMemoryRepeatDetected: repeatDetected,
    workflowMemoryRepeatCount: effectiveRepeatCount,
    workflowMemoryContinuationSuggested: continuationSuggested,
    workflowMemoryGovernedStateUpdated: finalGranted,
    workflowMemorySource: input.source ?? "h3_runtime_evidence",
    workflowMemoryReasonCodes: reasonCodes,
    nextState,
  };
}
