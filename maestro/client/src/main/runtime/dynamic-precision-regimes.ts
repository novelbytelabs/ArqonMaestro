export const DYNAMIC_PRECISION_SCHEMA_VERSION = "h3_dynamic_precision_regime_observation_v1" as const;
export const DYNAMIC_PRECISION_POLICY_VERSION = "3h_dynamic_precision_regimes_v1" as const;

export type DynamicPrecisionFamily = "reflex" | "bounded" | "numeric" | "open";
export type DynamicPrecisionRegime = "turbo" | "tight" | "ultra";
export type DynamicPrecisionStressBand = "nominal" | "elevated" | "critical";
export type DynamicPrecisionAmbiguityBand = "low" | "medium" | "high";

export interface DynamicPrecisionObservationSeed {
  regionId: string | null;
  commandClass: string | null;
  parameterType: "numeric" | "open" | null;
  ambiguityBand: DynamicPrecisionAmbiguityBand | null;
  repairWindowOpen: boolean | null;
  stressBand: DynamicPrecisionStressBand | null;
  source?: string | null;
}

export interface DynamicPrecisionObservationFields {
  dynamicPrecisionSchemaVersion: string | null;
  dynamicPrecisionPolicyVersion: string | null;
  dynamicPrecisionEligible: boolean | null;
  dynamicPrecisionObservedFamily: DynamicPrecisionFamily | null;
  dynamicPrecisionBaselineRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionSuggestedRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionEscalationEligible: boolean | null;
  dynamicPrecisionObservedAmbiguityBand: DynamicPrecisionAmbiguityBand | null;
  dynamicPrecisionObservedRepairWindowOpen: boolean | null;
  dynamicPrecisionObservedStressBand: DynamicPrecisionStressBand | null;
  dynamicPrecisionSource: string | null;
  dynamicPrecisionReasonCodes: string[] | null;
}

export function deriveDynamicPrecisionRegimeObservation(
  seed: DynamicPrecisionObservationSeed | null | undefined
): DynamicPrecisionObservationFields {
  const family = deriveFamily(seed);
  const ambiguityBand = seed?.ambiguityBand ?? null;
  const repairWindowOpen = seed?.repairWindowOpen ?? null;
  const stressBand = seed?.stressBand ?? null;
  const source = seed?.source ?? null;

  if (!family) {
    return {
      dynamicPrecisionSchemaVersion: DYNAMIC_PRECISION_SCHEMA_VERSION,
      dynamicPrecisionPolicyVersion: DYNAMIC_PRECISION_POLICY_VERSION,
      dynamicPrecisionEligible: false,
      dynamicPrecisionObservedFamily: null,
      dynamicPrecisionBaselineRegime: null,
      dynamicPrecisionSuggestedRegime: null,
      dynamicPrecisionEscalationEligible: false,
      dynamicPrecisionObservedAmbiguityBand: ambiguityBand,
      dynamicPrecisionObservedRepairWindowOpen: repairWindowOpen,
      dynamicPrecisionObservedStressBand: stressBand,
      dynamicPrecisionSource: source,
      dynamicPrecisionReasonCodes: ["dynamic_precision_not_eligible"],
    };
  }

  const baselineRegime = deriveBaselineRegime(family);
  const escalationEligible =
    ambiguityBand === "high" || repairWindowOpen === true || stressBand === "critical";
  const suggestedRegime = deriveSuggestedRegime(family, baselineRegime, {
    ambiguityBand,
    repairWindowOpen,
    stressBand,
  });
  const reasonCodes: string[] = [
    `dynamic_precision_family_${family}`,
    `dynamic_precision_baseline_${baselineRegime}`,
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
  if (escalationEligible) {
    reasonCodes.push(`dynamic_precision_suggest_${suggestedRegime}`);
  }

  return {
    dynamicPrecisionSchemaVersion: DYNAMIC_PRECISION_SCHEMA_VERSION,
    dynamicPrecisionPolicyVersion: DYNAMIC_PRECISION_POLICY_VERSION,
    dynamicPrecisionEligible: true,
    dynamicPrecisionObservedFamily: family,
    dynamicPrecisionBaselineRegime: baselineRegime,
    dynamicPrecisionSuggestedRegime: suggestedRegime,
    dynamicPrecisionEscalationEligible: escalationEligible,
    dynamicPrecisionObservedAmbiguityBand: ambiguityBand,
    dynamicPrecisionObservedRepairWindowOpen: repairWindowOpen,
    dynamicPrecisionObservedStressBand: stressBand,
    dynamicPrecisionSource: source,
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

function deriveSuggestedRegime(
  family: DynamicPrecisionFamily,
  baselineRegime: DynamicPrecisionRegime,
  context: {
    ambiguityBand: DynamicPrecisionAmbiguityBand | null;
    repairWindowOpen: boolean | null;
    stressBand: DynamicPrecisionStressBand | null;
  }
): DynamicPrecisionRegime {
  if (family === "open") {
    return "ultra";
  }
  if (context.stressBand === "critical") {
    return family === "bounded" || family === "reflex" ? "tight" : baselineRegime;
  }
  if (context.ambiguityBand === "high" || context.repairWindowOpen === true) {
    return family === "bounded" || family === "reflex" ? "tight" : baselineRegime;
  }
  return baselineRegime;
}
