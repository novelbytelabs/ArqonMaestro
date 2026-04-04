export const DYNAMIC_PRECISION_SCHEMA_VERSION = "h3_dynamic_precision_regime_observation_v1" as const;
export const DYNAMIC_PRECISION_POLICY_VERSION = "3h_dynamic_precision_regimes_v1" as const;
export const DYNAMIC_PRECISION_ESCALATION_PILOT_VERSION = "3h_bounded_escalation_trigger_v1" as const;

export type DynamicPrecisionFamily = "reflex" | "bounded" | "numeric" | "open";
export type DynamicPrecisionRegime = "turbo" | "tight" | "ultra";
export type DynamicPrecisionStressBand = "nominal" | "elevated" | "critical";
export type DynamicPrecisionAmbiguityBand = "low" | "medium" | "high";
export type DynamicPrecisionHysteresisState = "steady" | "escalation_armed";

export interface DynamicPrecisionObservationSeed {
  regionId: string | null;
  commandClass: string | null;
  parameterType: "numeric" | "open" | null;
  ambiguityBand: DynamicPrecisionAmbiguityBand | null;
  repairWindowOpen: boolean | null;
  stressBand: DynamicPrecisionStressBand | null;
  guardrailSuggested?: boolean | null;
  guardrailKind?: string | null;
  source?: string | null;
}

export interface DynamicPrecisionObservationFields {
  dynamicPrecisionSchemaVersion: string | null;
  dynamicPrecisionPolicyVersion: string | null;
  dynamicPrecisionEscalationPilotVersion: string | null;
  dynamicPrecisionEligible: boolean | null;
  dynamicPrecisionObservedFamily: DynamicPrecisionFamily | null;
  dynamicPrecisionBaselineRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionSuggestedRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionCurrentRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionProposedRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionEscalationEligible: boolean | null;
  dynamicPrecisionEscalationSuggested: boolean | null;
  dynamicPrecisionObservedAmbiguityBand: DynamicPrecisionAmbiguityBand | null;
  dynamicPrecisionObservedRepairWindowOpen: boolean | null;
  dynamicPrecisionObservedStressBand: DynamicPrecisionStressBand | null;
  dynamicPrecisionObservedGuardrailSuggested: boolean | null;
  dynamicPrecisionObservedGuardrailKind: string | null;
  dynamicPrecisionSource: string | null;
  dynamicPrecisionFamilyPolicyId: string | null;
  dynamicPrecisionHysteresisState: DynamicPrecisionHysteresisState | null;
  dynamicPrecisionTransitionAllowed: boolean | null;
  dynamicPrecisionReasonCodes: string[] | null;
}

export function deriveDynamicPrecisionRegimeObservation(
  seed: DynamicPrecisionObservationSeed | null | undefined
): DynamicPrecisionObservationFields {
  const family = deriveFamily(seed);
  const ambiguityBand = seed?.ambiguityBand ?? null;
  const repairWindowOpen = seed?.repairWindowOpen ?? null;
  const stressBand = seed?.stressBand ?? null;
  const guardrailSuggested = seed?.guardrailSuggested ?? null;
  const guardrailKind = seed?.guardrailKind ?? null;
  const source = seed?.source ?? null;

  if (!family) {
    return {
      dynamicPrecisionSchemaVersion: DYNAMIC_PRECISION_SCHEMA_VERSION,
      dynamicPrecisionPolicyVersion: DYNAMIC_PRECISION_POLICY_VERSION,
      dynamicPrecisionEscalationPilotVersion: DYNAMIC_PRECISION_ESCALATION_PILOT_VERSION,
      dynamicPrecisionEligible: false,
      dynamicPrecisionObservedFamily: null,
      dynamicPrecisionBaselineRegime: null,
      dynamicPrecisionSuggestedRegime: null,
      dynamicPrecisionCurrentRegime: null,
      dynamicPrecisionProposedRegime: null,
      dynamicPrecisionEscalationEligible: false,
      dynamicPrecisionEscalationSuggested: false,
      dynamicPrecisionObservedAmbiguityBand: ambiguityBand,
      dynamicPrecisionObservedRepairWindowOpen: repairWindowOpen,
      dynamicPrecisionObservedStressBand: stressBand,
      dynamicPrecisionObservedGuardrailSuggested: guardrailSuggested,
      dynamicPrecisionObservedGuardrailKind: guardrailKind,
      dynamicPrecisionSource: source,
      dynamicPrecisionFamilyPolicyId: null,
      dynamicPrecisionHysteresisState: null,
      dynamicPrecisionTransitionAllowed: false,
      dynamicPrecisionReasonCodes: ["dynamic_precision_not_eligible"],
    };
  }

  const baselineRegime = deriveBaselineRegime(family);
  const escalationEligible =
    ambiguityBand === "high" ||
    repairWindowOpen === true ||
    stressBand === "critical" ||
    guardrailSuggested === true;
  const currentRegime = baselineRegime;
  const proposedRegime = deriveProposedRegime(family, baselineRegime, {
    ambiguityBand,
    repairWindowOpen,
    stressBand,
    guardrailSuggested,
  });
  const escalationSuggested = proposedRegime !== currentRegime;
  const familyPolicyId = deriveFamilyPolicyId(family);
  const hysteresisState = escalationSuggested ? "escalation_armed" : "steady";
  const reasonCodes: string[] = [
    `dynamic_precision_family_${family}`,
    `dynamic_precision_baseline_${baselineRegime}`,
    `dynamic_precision_current_${currentRegime}`,
    `dynamic_precision_proposed_${proposedRegime}`,
    `dynamic_precision_family_policy_${familyPolicyId}`,
  ];

  if (ambiguityBand) {
    reasonCodes.push(`dynamic_precision_ambiguity_${ambiguityBand}`);
  }
  if (repairWindowOpen) {
    reasonCodes.push("dynamic_precision_repair_window_open");
  }
  if (stressBand) {
    reasonCodes.push(`dynamic_precision_stress_${stressBand}`);
  }
  if (guardrailSuggested) {
    reasonCodes.push("dynamic_precision_guardrail_suggested");
    if (guardrailKind) {
      reasonCodes.push(`dynamic_precision_guardrail_kind_${normalizeReasonToken(guardrailKind)}`);
    }
  }
  if (escalationSuggested) {
    reasonCodes.push("dynamic_precision_escalation_suggested");
  } else {
    reasonCodes.push("dynamic_precision_escalation_not_suggested");
  }

  return {
    dynamicPrecisionSchemaVersion: DYNAMIC_PRECISION_SCHEMA_VERSION,
    dynamicPrecisionPolicyVersion: DYNAMIC_PRECISION_POLICY_VERSION,
    dynamicPrecisionEscalationPilotVersion: DYNAMIC_PRECISION_ESCALATION_PILOT_VERSION,
    dynamicPrecisionEligible: true,
    dynamicPrecisionObservedFamily: family,
    dynamicPrecisionBaselineRegime: baselineRegime,
    dynamicPrecisionSuggestedRegime: proposedRegime,
    dynamicPrecisionCurrentRegime: currentRegime,
    dynamicPrecisionProposedRegime: proposedRegime,
    dynamicPrecisionEscalationEligible: escalationEligible,
    dynamicPrecisionEscalationSuggested: escalationSuggested,
    dynamicPrecisionObservedAmbiguityBand: ambiguityBand,
    dynamicPrecisionObservedRepairWindowOpen: repairWindowOpen,
    dynamicPrecisionObservedStressBand: stressBand,
    dynamicPrecisionObservedGuardrailSuggested: guardrailSuggested,
    dynamicPrecisionObservedGuardrailKind: guardrailKind,
    dynamicPrecisionSource: source,
    dynamicPrecisionFamilyPolicyId: familyPolicyId,
    dynamicPrecisionHysteresisState: hysteresisState,
    dynamicPrecisionTransitionAllowed: false,
    dynamicPrecisionReasonCodes: reasonCodes,
  };
}

function deriveFamily(
  seed: DynamicPrecisionObservationSeed | null | undefined
): DynamicPrecisionFamily | null {
  if (!seed) {
    return null;
  }
  if (seed.parameterType === "numeric") {
    return "numeric";
  }
  if (seed.parameterType === "open") {
    return "open";
  }
  const commandClass = seed.commandClass?.toLowerCase() ?? "";
  const regionId = seed.regionId?.toLowerCase() ?? "";
  if (commandClass.includes("reflex") || regionId.includes("reflex")) {
    return "reflex";
  }
  if (commandClass.length > 0 || regionId.length > 0) {
    return "bounded";
  }
  return null;
}

function deriveBaselineRegime(family: DynamicPrecisionFamily): DynamicPrecisionRegime {
  switch (family) {
    case "numeric":
      return "tight";
    case "open":
      return "ultra";
    case "reflex":
    case "bounded":
    default:
      return "turbo";
  }
}

function deriveProposedRegime(
  family: DynamicPrecisionFamily,
  baselineRegime: DynamicPrecisionRegime,
  context: {
    ambiguityBand: DynamicPrecisionAmbiguityBand | null;
    repairWindowOpen: boolean | null;
    stressBand: DynamicPrecisionStressBand | null;
    guardrailSuggested: boolean | null;
  }
): DynamicPrecisionRegime {
  const escalationPressure =
    context.ambiguityBand === "high" ||
    context.repairWindowOpen === true ||
    context.stressBand === "critical" ||
    context.guardrailSuggested === true;

  if (family === "open") {
    return "ultra";
  }
  if (!escalationPressure) {
    return baselineRegime;
  }
  if (family === "numeric") {
    return "ultra";
  }
  return "tight";
}

function deriveFamilyPolicyId(family: DynamicPrecisionFamily): string {
  switch (family) {
    case "reflex":
    case "bounded":
      return "3h_family_policy_structured_v1";
    case "numeric":
      return "3h_family_policy_numeric_v1";
    case "open":
    default:
      return "3h_family_policy_open_tail_v1";
  }
}

function normalizeReasonToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
}
