export const H4_AUTHORITY_ENTRY_SCHEMA_VERSION = "h4_authority_entry_v1";
export const H4_AUTHORITY_ENTRY_POLICY_VERSION =
  "h4_live_mic_entry_integration_v1";

export type H4AuthorityEntryDefaultPath =
  | "h3j_authority"
  | "legacy_fallback"
  | "dictation_passthrough";

export interface H4AuthorityEntryInput {
  liveMicActive?: boolean | null;
  streamConnected?: boolean | null;
  dictateMode?: boolean | null;
  forceLegacyCommandLane?: boolean | null;
  h3AuthorityEnabled?: boolean | null;
  defaultPath?: H4AuthorityEntryDefaultPath | null;
  fallbackInvoked?: boolean | null;
  fallbackReason?: string | null;
  source?: string | null;
}

export interface H4AuthorityEntryFields {
  h4AuthorityEntrySchemaVersion: string | null;
  h4AuthorityEntryPolicyVersion: string | null;
  h4AuthorityEntryEligible: boolean | null;
  h4AuthorityEntryLiveMicActive: boolean | null;
  h4AuthorityEntryCommandLane: boolean | null;
  h4AuthorityEntryDictationMode: boolean | null;
  h4AuthorityEntryDefaultPath: H4AuthorityEntryDefaultPath | null;
  h4AuthorityEntryAuthoritative: boolean | null;
  h4AuthorityEntryFallbackAllowed: boolean | null;
  h4AuthorityEntryFallbackInvoked: boolean | null;
  h4AuthorityEntryFallbackReason: string | null;
  h4AuthorityEntryStreamConnected: boolean | null;
  h4AuthorityEntrySource: string | null;
  h4AuthorityEntryReasonCodes: string[] | null;
}

function deriveDefaultPath(input: {
  dictateMode: boolean;
  forceLegacyCommandLane: boolean;
  h3AuthorityEnabled: boolean;
}): H4AuthorityEntryDefaultPath {
  if (input.dictateMode) {
    return "dictation_passthrough";
  }
  if (input.forceLegacyCommandLane || !input.h3AuthorityEnabled) {
    return "legacy_fallback";
  }
  return "h3j_authority";
}

export function deriveH4AuthorityEntryObservation(
  input: H4AuthorityEntryInput
): H4AuthorityEntryFields {
  const liveMicActive = input.liveMicActive ?? null;
  const streamConnected = input.streamConnected ?? null;
  const dictateMode = input.dictateMode ?? false;
  const forceLegacyCommandLane = input.forceLegacyCommandLane ?? false;
  const h3AuthorityEnabled = input.h3AuthorityEnabled ?? false;
  const defaultPath =
    input.defaultPath ??
    deriveDefaultPath({
      dictateMode,
      forceLegacyCommandLane,
      h3AuthorityEnabled,
    });
  const commandLane = !dictateMode;
  const eligible = Boolean(liveMicActive && streamConnected);
  const fallbackInvoked = input.fallbackInvoked === true;
  const fallbackReason = input.fallbackReason ?? null;
  const source = input.source ?? "microphone";
  const reasonCodes: string[] = [];

  if (!liveMicActive) {
    reasonCodes.push("live_mic_inactive");
  }
  if (!streamConnected) {
    reasonCodes.push("stream_disconnected");
  }
  if (dictateMode) {
    reasonCodes.push("dictation_passthrough_lane");
  } else if (defaultPath === "h3j_authority") {
    reasonCodes.push("h3j_default_authority_path");
  } else {
    reasonCodes.push("legacy_default_path");
  }
  if (fallbackInvoked) {
    reasonCodes.push("fallback_invoked_explicitly");
  }
  if (fallbackReason) {
    reasonCodes.push("fallback_reason_recorded");
  }

  return {
    h4AuthorityEntrySchemaVersion: H4_AUTHORITY_ENTRY_SCHEMA_VERSION,
    h4AuthorityEntryPolicyVersion: H4_AUTHORITY_ENTRY_POLICY_VERSION,
    h4AuthorityEntryEligible: eligible,
    h4AuthorityEntryLiveMicActive: liveMicActive,
    h4AuthorityEntryCommandLane: commandLane,
    h4AuthorityEntryDictationMode: dictateMode,
    h4AuthorityEntryDefaultPath: defaultPath,
    h4AuthorityEntryAuthoritative: eligible && defaultPath === "h3j_authority",
    h4AuthorityEntryFallbackAllowed: commandLane,
    h4AuthorityEntryFallbackInvoked: fallbackInvoked,
    h4AuthorityEntryFallbackReason: fallbackReason,
    h4AuthorityEntryStreamConnected: streamConnected,
    h4AuthorityEntrySource: source,
    h4AuthorityEntryReasonCodes: reasonCodes,
  };
}
