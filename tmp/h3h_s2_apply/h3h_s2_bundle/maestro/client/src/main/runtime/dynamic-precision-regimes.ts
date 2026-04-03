export const DYNAMIC_PRECISION_REGIME_SCHEMA_VERSION = "h3_dynamic_precision_regimes_v1" as const;
export const DYNAMIC_PRECISION_REGIME_POLICY_VERSION = "3h_dynamic_precision_regimes_v1" as const;
export const DYNAMIC_PRECISION_ESCALATION_PILOT_VERSION = "3h_bounded_escalation_trigger_v1" as const;

export type DynamicPrecisionRegimeId = "turbo" | "tight" | "ultra";
export type DynamicPrecisionStressBand = "low" | "medium" | "high";

export interface DynamicPrecisionSeed {
  parameterType: "numeric" | "open" | null;
  commandClass: string | null;
  ambiguityPilotApplied?: boolean | null;
  ambiguityEscalationKind?: "hold_for_tail" | "request_disambiguation" | "none" | null;
  ambiguityScoreGap?: number | null;
  repairSignalPilotApplied?: boolean | null;
  repairWindowOpen?: boolean | null;
  repairEscalationKind?: "hold_for_repair" | "continue_observing" | "none" | null;
  rankingPilotApplied?: boolean | null;
  rankingGuardrailSuggested?: boolean | null;
  rankingGuardrailKind?: "hold_for_repair" | "request_disambiguation" | "continue_observing" | null;
}

export interface DynamicPrecisionRegimeEvidenceFields {
  dynamicPrecisionRegimeSchemaVersion: string | null;
  dynamicPrecisionRegimePolicyVersion: string | null;
  dynamicPrecisionCurrentRegimeId: DynamicPrecisionRegimeId | null;
  dynamicPrecisionCurrentRegimeSource: string | null;
  dynamicPrecisionCurrentRegimeReasonCodes: string[] | null;
  dynamicPrecisionEscalationPilotVersion: string | null;
  dynamicPrecisionEscalationPilotApplied: boolean | null;
  dynamicPrecisionEscalationSuggested: boolean | null;
  dynamicPrecisionProposedRegimeId: DynamicPrecisionRegimeId | null;
  dynamicPrecisionEscalationSource: string | null;
  dynamicPrecisionEscalationReasonCodes: string[] | null;
  dynamicPrecisionStressBand: DynamicPrecisionStressBand | null;
  dynamicPrecisionFamilyPolicyId: string | null;
  dynamicPrecisionHysteresisState: string | null;
  dynamicPrecisionTransitionAllowed: boolean | null;
}

function classifyCurrentRegime(seed: DynamicPrecisionSeed): { regime: DynamicPrecisionRegimeId; reasons: string[]; familyPolicyId: string; source: string } {
  if (seed.parameterType === "open") {
    return {
      regime: "tight",
      reasons: ["open_tail_family_detected"],
      familyPolicyId: "open_tail_precision_v1",
      source: "family_policy",
    };
  }
  if (seed.parameterType === "numeric") {
    return {
      regime: "tight",
      reasons: ["numeric_family_detected"],
      familyPolicyId: "numeric_precision_v1",
      source: "family_policy",
    };
  }
  return {
    regime: "turbo",
    reasons: ["structured_default_fast_path"],
    familyPolicyId: "structured_precision_v1",
    source: "structured_default",
  };
}

function deriveStressBand(seed: DynamicPrecisionSeed): DynamicPrecisionStressBand {
  if (seed.repairWindowOpen || seed.repairEscalationKind === "hold_for_repair" || seed.rankingGuardrailKind === "hold_for_repair") {
    return "high";
  }
  if (seed.ambiguityEscalationKind === "request_disambiguation" || seed.rankingGuardrailKind === "request_disambiguation") {
    return "medium";
  }
  return "low";
}

export function deriveDynamicPrecisionRegimeEvidenceFields(seed: DynamicPrecisionSeed): DynamicPrecisionRegimeEvidenceFields {
  const current = classifyCurrentRegime(seed);
  const stressBand = deriveStressBand(seed);
  const reasonCodes: string[] = [];
  let proposedRegime: DynamicPrecisionRegimeId | null = null;
  let escalationSource: string | null = null;

  if (current.regime === "turbo" && (seed.ambiguityEscalationKind === "request_disambiguation" || seed.repairWindowOpen || seed.rankingGuardrailSuggested)) {
    proposedRegime = "tight";
    reasonCodes.push("turbo_escalation_triggered");
    escalationSource = seed.repairWindowOpen ? "3g_repair_signal" : seed.rankingGuardrailSuggested ? "3g_guardrail" : "3g_ambiguity";
  } else if (current.regime === "tight" && (seed.repairWindowOpen || (seed.ambiguityEscalationKind === "request_disambiguation" && stressBand !== "low"))) {
    proposedRegime = "ultra";
    reasonCodes.push("tight_escalation_triggered");
    escalationSource = seed.repairWindowOpen ? "3g_repair_signal" : "3g_ambiguity";
  } else {
    reasonCodes.push("no_escalation_required");
  }

  if (seed.rankingGuardrailSuggested) {
    reasonCodes.push("ranking_guardrail_signal_present");
  }
  if (seed.repairWindowOpen) {
    reasonCodes.push("repair_window_open");
  }
  if (seed.ambiguityPilotApplied) {
    reasonCodes.push("ambiguity_signal_observed");
  }

  return {
    dynamicPrecisionRegimeSchemaVersion: DYNAMIC_PRECISION_REGIME_SCHEMA_VERSION,
    dynamicPrecisionRegimePolicyVersion: DYNAMIC_PRECISION_REGIME_POLICY_VERSION,
    dynamicPrecisionCurrentRegimeId: current.regime,
    dynamicPrecisionCurrentRegimeSource: current.source,
    dynamicPrecisionCurrentRegimeReasonCodes: current.reasons,
    dynamicPrecisionEscalationPilotVersion: DYNAMIC_PRECISION_ESCALATION_PILOT_VERSION,
    dynamicPrecisionEscalationPilotApplied: true,
    dynamicPrecisionEscalationSuggested: proposedRegime !== null,
    dynamicPrecisionProposedRegimeId: proposedRegime,
    dynamicPrecisionEscalationSource: escalationSource,
    dynamicPrecisionEscalationReasonCodes: reasonCodes,
    dynamicPrecisionStressBand: stressBand,
    dynamicPrecisionFamilyPolicyId: current.familyPolicyId,
    dynamicPrecisionHysteresisState: "not_evaluated",
    dynamicPrecisionTransitionAllowed: false,
  };
}
