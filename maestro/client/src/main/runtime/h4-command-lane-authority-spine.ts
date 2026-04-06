export const H4_AUTHORITY_SPINE_SCHEMA_VERSION = "h4_authority_spine_v1";
export const H4_AUTHORITY_SPINE_POLICY_VERSION =
  "h4_command_lane_authority_spine_cutover_v1";

export type H4AuthoritySpineDecisionStage =
  | "entry"
  | "inflight"
  | "final_decision"
  | "fallback";

export interface H4AuthoritySpineInput {
  liveMicActive?: boolean | null;
  commandLane?: boolean | null;
  dictateMode?: boolean | null;
  defaultPath?: string | null;
  authoritative?: boolean | null;
  streamConnected?: boolean | null;
  semanticResultPresent?: boolean | null;
  finalGranted?: boolean | null;
  fallbackInvoked?: boolean | null;
  fallbackReason?: string | null;
  sourceEventName?: string | null;
  source?: string | null;
}

export interface H4AuthoritySpineFields {
  h4AuthoritySpineSchemaVersion: string | null;
  h4AuthoritySpinePolicyVersion: string | null;
  h4AuthoritySpineEligible: boolean | null;
  h4AuthoritySpineLiveMicActive: boolean | null;
  h4AuthoritySpineCommandLane: boolean | null;
  h4AuthoritySpineDefaultPath: string | null;
  h4AuthoritySpineAuthoritative: boolean | null;
  h4AuthoritySpineCutoverActive: boolean | null;
  h4AuthoritySpineDecisionStage: H4AuthoritySpineDecisionStage | null;
  h4AuthoritySpineSemanticResultPresent: boolean | null;
  h4AuthoritySpineLawfulFinalDecision: boolean | null;
  h4AuthoritySpineFallbackAllowed: boolean | null;
  h4AuthoritySpineFallbackInvoked: boolean | null;
  h4AuthoritySpineFallbackReason: string | null;
  h4AuthoritySpineSource: string | null;
  h4AuthoritySpineReasonCodes: string[] | null;
}

export function deriveH4AuthoritySpineObservation(
  input: H4AuthoritySpineInput
): H4AuthoritySpineFields {
  const liveMicActive = input.liveMicActive ?? null;
  const commandLane = input.commandLane ?? null;
  const dictateMode = input.dictateMode ?? null;
  const defaultPath = input.defaultPath ?? null;
  const authoritative = input.authoritative ?? null;
  const streamConnected = input.streamConnected ?? null;
  const semanticResultPresent = input.semanticResultPresent === true;
  const finalGranted = input.finalGranted ?? null;
  const fallbackInvoked = input.fallbackInvoked === true;
  const fallbackReason = input.fallbackReason ?? null;
  const sourceEventName = input.sourceEventName ?? null;
  const source = input.source ?? "microphone";
  const eligible = Boolean(liveMicActive && streamConnected && commandLane && dictateMode !== true);
  const lawfulFinalDecision = fallbackInvoked || semanticResultPresent || finalGranted === true;
  const decisionStage: H4AuthoritySpineDecisionStage = fallbackInvoked
    ? "fallback"
    : lawfulFinalDecision
      ? "final_decision"
      : sourceEventName === "h4_live_mic_authority_entry"
        ? "entry"
        : "inflight";
  const reasonCodes: string[] = [];
  if (!eligible) reasonCodes.push("authority_spine_ineligible");
  if (eligible && authoritative) reasonCodes.push("h3j_command_lane_primary_authority");
  if (semanticResultPresent) reasonCodes.push("semantic_result_present");
  if (finalGranted === true) reasonCodes.push("lawful_granted_decision_present");
  if (fallbackInvoked) reasonCodes.push("explicit_fallback_invoked");
  if (fallbackReason) reasonCodes.push("fallback_reason_recorded");
  return {
    h4AuthoritySpineSchemaVersion: H4_AUTHORITY_SPINE_SCHEMA_VERSION,
    h4AuthoritySpinePolicyVersion: H4_AUTHORITY_SPINE_POLICY_VERSION,
    h4AuthoritySpineEligible: eligible,
    h4AuthoritySpineLiveMicActive: liveMicActive,
    h4AuthoritySpineCommandLane: commandLane,
    h4AuthoritySpineDefaultPath: defaultPath,
    h4AuthoritySpineAuthoritative: authoritative,
    h4AuthoritySpineCutoverActive: eligible && authoritative === true,
    h4AuthoritySpineDecisionStage: decisionStage,
    h4AuthoritySpineSemanticResultPresent: semanticResultPresent,
    h4AuthoritySpineLawfulFinalDecision: lawfulFinalDecision,
    h4AuthoritySpineFallbackAllowed: eligible,
    h4AuthoritySpineFallbackInvoked: fallbackInvoked,
    h4AuthoritySpineFallbackReason: fallbackReason,
    h4AuthoritySpineSource: source,
    h4AuthoritySpineReasonCodes: reasonCodes,
  };
}
