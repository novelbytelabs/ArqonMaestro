export const WORKFLOW_CANDIDATE_TIMING_SCHEMA_VERSION =
  "3j_workflow_candidate_timing_v1";
export const WORKFLOW_CANDIDATE_TIMING_POLICY_VERSION =
  "3j_suggestion_pressure_timing_v1";

export type WorkflowCandidateTimingChannel =
  | "silent"
  | "inbox"
  | "inline"
  | "digest"
  | "quiet_auto_draft";

export interface WorkflowCandidateTimingInput {
  rubricEligible?: boolean | null;
  suggestedSurface?: string | null;
  suggestionPressureScore?: number | null;
  utilityScore?: number | null;
  noveltyScore?: number | null;
  trainingModeActive?: boolean | null;
  quietModeEnabled?: boolean | null;
  inboxOnly?: boolean | null;
  autoCreateLowRiskEnabled?: boolean | null;
  cooldownActive?: boolean | null;
  source?: string | null;
}

export interface WorkflowCandidateTimingFields {
  workflowCandidateTimingSchemaVersion: string | null;
  workflowCandidateTimingPolicyVersion: string | null;
  workflowCandidateTimingEligible: boolean | null;
  workflowCandidateTimingChannel: WorkflowCandidateTimingChannel | null;
  workflowCandidateTimingQueuePressureClass: string | null;
  workflowCandidateTimingCooldownActive: boolean | null;
  workflowCandidateTimingHoldSuppressed: boolean | null;
  workflowCandidateTimingDigestPreferred: boolean | null;
  workflowCandidateTimingTrainingModeActive: boolean | null;
  workflowCandidateTimingQuietModeEnabled: boolean | null;
  workflowCandidateTimingSource: string | null;
  workflowCandidateTimingReasonCodes: string[] | null;
}

function clampScore(value: number): number {
  return Number(Math.min(100, Math.max(0, value)).toFixed(2));
}

function queuePressureClass(score: number): string {
  if (score <= 25) return "low";
  if (score <= 55) return "moderate";
  return "high";
}

export function deriveWorkflowCandidateTiming(
  input: WorkflowCandidateTimingInput
): WorkflowCandidateTimingFields {
  const rubricEligible = input.rubricEligible ?? null;
  const source = input.source ?? "h3_runtime_evidence";
  if (!rubricEligible) {
    return {
      workflowCandidateTimingSchemaVersion: WORKFLOW_CANDIDATE_TIMING_SCHEMA_VERSION,
      workflowCandidateTimingPolicyVersion: WORKFLOW_CANDIDATE_TIMING_POLICY_VERSION,
      workflowCandidateTimingEligible: false,
      workflowCandidateTimingChannel: null,
      workflowCandidateTimingQueuePressureClass: null,
      workflowCandidateTimingCooldownActive: null,
      workflowCandidateTimingHoldSuppressed: null,
      workflowCandidateTimingDigestPreferred: null,
      workflowCandidateTimingTrainingModeActive: null,
      workflowCandidateTimingQuietModeEnabled: null,
      workflowCandidateTimingSource: source,
      workflowCandidateTimingReasonCodes: ["workflow_candidate_timing_prerequisites_not_met"],
    };
  }

  const suggestionPressure = clampScore(input.suggestionPressureScore ?? 100);
  const utility = clampScore(input.utilityScore ?? 0);
  const novelty = clampScore(input.noveltyScore ?? 0);
  const trainingModeActive = input.trainingModeActive === true;
  const quietModeEnabled = input.quietModeEnabled === true;
  const inboxOnly = input.inboxOnly === true;
  const autoCreateLowRiskEnabled = input.autoCreateLowRiskEnabled === true;
  const cooldownActive = input.cooldownActive === true;
  const suggestedSurface = input.suggestedSurface ?? "silent";

  const pressureClass = queuePressureClass(suggestionPressure);
  const digestPreferred = quietModeEnabled || pressureClass === "high";
  const holdSuppressed = cooldownActive || suggestionPressure >= 86;

  let channel: WorkflowCandidateTimingChannel = "silent";
  if (holdSuppressed) {
    channel = "silent";
  } else if (inboxOnly) {
    channel = digestPreferred ? "digest" : "inbox";
  } else if (autoCreateLowRiskEnabled && suggestionPressure <= 24 && utility >= 68) {
    channel = quietModeEnabled ? "digest" : "quiet_auto_draft";
  } else if (suggestedSurface === "inline" && suggestionPressure <= (trainingModeActive ? 42 : 26) && novelty >= 45) {
    channel = "inline";
  } else if (suggestedSurface === "digest" || digestPreferred) {
    channel = "digest";
  } else if (suggestedSurface === "inbox" || utility >= 50) {
    channel = "inbox";
  }

  return {
    workflowCandidateTimingSchemaVersion: WORKFLOW_CANDIDATE_TIMING_SCHEMA_VERSION,
    workflowCandidateTimingPolicyVersion: WORKFLOW_CANDIDATE_TIMING_POLICY_VERSION,
    workflowCandidateTimingEligible: true,
    workflowCandidateTimingChannel: channel,
    workflowCandidateTimingQueuePressureClass: pressureClass,
    workflowCandidateTimingCooldownActive: cooldownActive,
    workflowCandidateTimingHoldSuppressed: holdSuppressed,
    workflowCandidateTimingDigestPreferred: digestPreferred,
    workflowCandidateTimingTrainingModeActive: trainingModeActive,
    workflowCandidateTimingQuietModeEnabled: quietModeEnabled,
    workflowCandidateTimingSource: source,
    workflowCandidateTimingReasonCodes: [
      `workflow_candidate_timing_channel_${channel}`,
      `workflow_candidate_timing_queue_${pressureClass}`,
      cooldownActive
        ? "workflow_candidate_timing_cooldown_active"
        : "workflow_candidate_timing_cooldown_inactive",
      trainingModeActive
        ? "workflow_candidate_timing_training_mode_active"
        : "workflow_candidate_timing_training_mode_inactive",
      quietModeEnabled
        ? "workflow_candidate_timing_quiet_mode_enabled"
        : "workflow_candidate_timing_quiet_mode_disabled",
    ],
  };
}
