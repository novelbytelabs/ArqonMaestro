export interface H4ParameterizedCommandResolutionFields {
  h4ParameterizedResolutionSchemaVersion: string;
  h4ParameterizedResolutionPolicyVersion: string;
  h4ParameterizedResolutionEligible: boolean;
  h4ParameterizedResolutionPrefixRegionId: string | null;
  h4ParameterizedResolutionCanonicalPrefix: string | null;
  h4ParameterizedResolutionPrefixSource: "rail_delta_region" | null;
  h4ParameterizedResolutionParameterType: "numeric" | "open" | null;
  h4ParameterizedResolutionResolvedParameter: string | null;
  h4ParameterizedResolutionParameterSource: "parakeet_tail_only" | null;
  h4ParameterizedResolutionCanonicalCommandText: string | null;
  h4ParameterizedResolutionParameterOnly: boolean;
  h4ParameterizedResolutionReasonCodes: string[];
}

const H4_PARAMETERIZED_RESOLUTION_SCHEMA_VERSION = "h4_parameter_resolution_v1";
const H4_PARAMETERIZED_RESOLUTION_POLICY_VERSION = "h4_parameter_only_tail_resolution_v1";

const CANONICAL_PREFIX_BY_REGION_ID: Record<string, string> = {
  "go to line": "go to line",
  "go to": "go to",
  open: "open",
};

export function deriveH4ParameterizedCommandResolution(inputs: {
  prefixRegionId: string | null;
  parameterType: "numeric" | "open" | null;
  numericNormalized?: string | null;
  openNormalized?: string | null;
}): H4ParameterizedCommandResolutionFields {
  const canonicalPrefix = inputs.prefixRegionId
    ? CANONICAL_PREFIX_BY_REGION_ID[inputs.prefixRegionId] ?? null
    : null;

  const resolvedParameter =
    inputs.parameterType === "numeric"
      ? inputs.numericNormalized ?? null
      : inputs.parameterType === "open"
        ? inputs.openNormalized ?? null
        : null;

  const reasonCodes: string[] = [];

  if (!inputs.prefixRegionId) {
    reasonCodes.push("missing_prefix_region");
  }
  if (!canonicalPrefix) {
    reasonCodes.push("unsupported_prefix_region_for_parameter_only_resolution");
  }
  if (!inputs.parameterType) {
    reasonCodes.push("missing_parameter_type");
  }
  if (!resolvedParameter) {
    reasonCodes.push("missing_resolved_parameter");
  }

  const eligible = canonicalPrefix != null && inputs.parameterType != null && resolvedParameter != null;

  if (!eligible) {
    return {
      h4ParameterizedResolutionSchemaVersion: H4_PARAMETERIZED_RESOLUTION_SCHEMA_VERSION,
      h4ParameterizedResolutionPolicyVersion: H4_PARAMETERIZED_RESOLUTION_POLICY_VERSION,
      h4ParameterizedResolutionEligible: false,
      h4ParameterizedResolutionPrefixRegionId: inputs.prefixRegionId ?? null,
      h4ParameterizedResolutionCanonicalPrefix: canonicalPrefix,
      h4ParameterizedResolutionPrefixSource: canonicalPrefix ? "rail_delta_region" : null,
      h4ParameterizedResolutionParameterType: inputs.parameterType ?? null,
      h4ParameterizedResolutionResolvedParameter: resolvedParameter,
      h4ParameterizedResolutionParameterSource: resolvedParameter ? "parakeet_tail_only" : null,
      h4ParameterizedResolutionCanonicalCommandText: null,
      h4ParameterizedResolutionParameterOnly: false,
      h4ParameterizedResolutionReasonCodes: reasonCodes,
    };
  }

  reasonCodes.push("rail_prefix_plus_parameter_only_tail_resolution");

  return {
    h4ParameterizedResolutionSchemaVersion: H4_PARAMETERIZED_RESOLUTION_SCHEMA_VERSION,
    h4ParameterizedResolutionPolicyVersion: H4_PARAMETERIZED_RESOLUTION_POLICY_VERSION,
    h4ParameterizedResolutionEligible: true,
    h4ParameterizedResolutionPrefixRegionId: inputs.prefixRegionId,
    h4ParameterizedResolutionCanonicalPrefix: canonicalPrefix,
    h4ParameterizedResolutionPrefixSource: "rail_delta_region",
    h4ParameterizedResolutionParameterType: inputs.parameterType,
    h4ParameterizedResolutionResolvedParameter: resolvedParameter,
    h4ParameterizedResolutionParameterSource: "parakeet_tail_only",
    h4ParameterizedResolutionCanonicalCommandText: `${canonicalPrefix} ${resolvedParameter}`.trim(),
    h4ParameterizedResolutionParameterOnly: true,
    h4ParameterizedResolutionReasonCodes: reasonCodes,
  };
}
