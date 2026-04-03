
export const COUNTERFACTUAL_REPAIR_SCHEMA_VERSION = "h3_counterfactual_repair_v1" as const;
export const COUNTERFACTUAL_REPAIR_POLICY_VERSION = "3g_counterfactual_repair_v1" as const;

export interface CounterfactualRepairSeed {
  semanticAddressId: string | null;
  canonicalMergedText: string | null;
  regionId: string | null;
  commandClass: string | null;
  parameterType: "numeric" | "open" | null;
  transcriptText?: string | null;
}

export interface CounterfactualRepairEvidenceFields {
  counterfactualRepairSchemaVersion: string | null;
  counterfactualRepairPolicyVersion: string | null;
  counterfactualRepairEligible: boolean | null;
  counterfactualRepairPrimarySemanticAddressId: string | null;
  counterfactualRepairNearestAlternativeSemanticAddressId: string | null;
  counterfactualRepairNearestAlternativeCanonicalMergedText: string | null;
  counterfactualRepairAmbiguityBand: "low" | "medium" | "high" | null;
  counterfactualRepairRepairEligible: boolean | null;
  counterfactualRepairRepairSignal: string | null;
  counterfactualRepairSource: string | null;
  counterfactualRepairReasonCodes: string[] | null;
}

export function deriveCounterfactualRepairEvidenceFields(
  seed: CounterfactualRepairSeed | null | undefined
): CounterfactualRepairEvidenceFields {
  if (!seed || !seed.semanticAddressId || !seed.canonicalMergedText) {
    return {
      counterfactualRepairSchemaVersion: COUNTERFACTUAL_REPAIR_SCHEMA_VERSION,
      counterfactualRepairPolicyVersion: COUNTERFACTUAL_REPAIR_POLICY_VERSION,
      counterfactualRepairEligible: false,
      counterfactualRepairPrimarySemanticAddressId: null,
      counterfactualRepairNearestAlternativeSemanticAddressId: null,
      counterfactualRepairNearestAlternativeCanonicalMergedText: null,
      counterfactualRepairAmbiguityBand: null,
      counterfactualRepairRepairEligible: false,
      counterfactualRepairRepairSignal: null,
      counterfactualRepairSource: "none",
      counterfactualRepairReasonCodes: ["counterfactual_not_eligible"],
    };
  }

  const normalized = seed.canonicalMergedText.trim().toLowerCase();
  const alternative = deriveNearestAlternative(seed.semanticAddressId, normalized);
  const repairSignal = deriveRepairSignal(seed.transcriptText ?? null, normalized);
  const ambiguityBand = deriveAmbiguityBand(normalized, alternative != null);
  const repairEligible = repairSignal !== null || ambiguityBand === "high";

  return {
    counterfactualRepairSchemaVersion: COUNTERFACTUAL_REPAIR_SCHEMA_VERSION,
    counterfactualRepairPolicyVersion: COUNTERFACTUAL_REPAIR_POLICY_VERSION,
    counterfactualRepairEligible: true,
    counterfactualRepairPrimarySemanticAddressId: seed.semanticAddressId,
    counterfactualRepairNearestAlternativeSemanticAddressId: alternative?.semanticAddressId ?? null,
    counterfactualRepairNearestAlternativeCanonicalMergedText: alternative?.canonicalMergedText ?? null,
    counterfactualRepairAmbiguityBand: ambiguityBand,
    counterfactualRepairRepairEligible: repairEligible,
    counterfactualRepairRepairSignal: repairSignal,
    counterfactualRepairSource: "heuristic_shadow",
    counterfactualRepairReasonCodes: [
      `counterfactual_primary_${normalizeReasonToken(seed.semanticAddressId)}`,
      alternative ? `counterfactual_alt_${normalizeReasonToken(alternative.semanticAddressId)}` : "counterfactual_alt_none",
      `counterfactual_ambiguity_${ambiguityBand}`,
      repairSignal ? `counterfactual_repair_${repairSignal}` : "counterfactual_repair_none",
    ],
  };
}

function deriveNearestAlternative(semanticAddressId: string, canonicalMergedText: string): { semanticAddressId: string; canonicalMergedText: string } | null {
  if (canonicalMergedText.startsWith("open ")) {
    const tail = canonicalMergedText.slice(5).trim();
    return {
      semanticAddressId: `${semanticAddressId}_counterfactual_go_to`,
      canonicalMergedText: tail ? `go to ${tail}` : "go to target",
    };
  }
  if (canonicalMergedText.startsWith("go to ")) {
    const tail = canonicalMergedText.slice(6).trim();
    return {
      semanticAddressId: `${semanticAddressId}_counterfactual_open`,
      canonicalMergedText: tail ? `open ${tail}` : "open target",
    };
  }
  if (canonicalMergedText.startsWith("focus ")) {
    const tail = canonicalMergedText.slice(6).trim();
    return {
      semanticAddressId: `${semanticAddressId}_counterfactual_open`,
      canonicalMergedText: tail ? `open ${tail}` : "open target",
    };
  }
  return null;
}

function deriveRepairSignal(transcriptText: string | null, canonicalMergedText: string): string | null {
  if (!transcriptText) {
    return null;
  }
  const normalizedTranscript = transcriptText.toLowerCase();
  if (/(?:^|\s)\w{1,6}[-—]\s*\w+/.test(normalizedTranscript)) {
    return "self_correction_hint";
  }
  if (normalizedTranscript.includes(" no ") || normalizedTranscript.includes(" actually ")) {
    return "spoken_reversal_hint";
  }
  if (normalizedTranscript.trim() && normalizedTranscript.trim() !== canonicalMergedText) {
    return "transcript_merge_divergence";
  }
  return null;
}

function deriveAmbiguityBand(canonicalMergedText: string, hasAlternative: boolean): "low" | "medium" | "high" {
  if (!hasAlternative) {
    return "low";
  }
  if (canonicalMergedText.startsWith("open ") || canonicalMergedText.startsWith("go to ")) {
    return "high";
  }
  return "medium";
}

function normalizeReasonToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
