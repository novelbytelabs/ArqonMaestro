export const DYNAMIC_PRECISION_SCHEMA_VERSION = "h3_dynamic_precision_regime_observation_v1" as const;
export const DYNAMIC_PRECISION_POLICY_VERSION = "3h_dynamic_precision_regimes_v1" as const;
export const DYNAMIC_PRECISION_ESCALATION_PILOT_VERSION = "3h_bounded_escalation_trigger_v1" as const;
export const DYNAMIC_PRECISION_FAMILY_SWITCHING_VERSION = "3h_family_aware_regime_switching_v1" as const;
export const DYNAMIC_PRECISION_HYSTERESIS_VERSION = "3h_hysteresis_deescalation_v1" as const;

export type DynamicPrecisionFamily = "reflex" | "bounded" | "numeric" | "open";
export type DynamicPrecisionRegime = "turbo" | "tight" | "ultra";
export type DynamicPrecisionStressBand = "nominal" | "elevated" | "critical";
export type DynamicPrecisionAmbiguityBand = "low" | "medium" | "high";
export type DynamicPrecisionHysteresisState =
  | "steady"
  | "escalation_armed"
  | "cooldown_active"
  | "deescalation_armed";
export type DynamicPrecisionTransitionDecision =
  | "steady"
  | "escalate_applied"
  | "deescalation_deferred"
  | "deescalation_cooldown_active"
  | "deescalate_applied"
  | "blocked_by_family_policy";

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
  currentRegime?: DynamicPrecisionRegime | null;
  stabilityTickCount?: number | null;
  cooldownTicksRemaining?: number | null;
}

export interface DynamicPrecisionObservationFields {
  dynamicPrecisionSchemaVersion: string | null;
  dynamicPrecisionPolicyVersion: string | null;
  dynamicPrecisionEscalationPilotVersion: string | null;
  dynamicPrecisionFamilySwitchingVersion: string | null;
  dynamicPrecisionHysteresisVersion: string | null;
  dynamicPrecisionEligible: boolean | null;
  dynamicPrecisionObservedFamily: DynamicPrecisionFamily | null;
  dynamicPrecisionBaselineRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionSuggestedRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionCurrentRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionProposedRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionEscalationEligible: boolean | null;
  dynamicPrecisionEscalationSuggested: boolean | null;
  dynamicPrecisionDeescalationEligible: boolean | null;
  dynamicPrecisionDeescalationSuggested: boolean | null;
  dynamicPrecisionObservedAmbiguityBand: DynamicPrecisionAmbiguityBand | null;
  dynamicPrecisionObservedRepairWindowOpen: boolean | null;
  dynamicPrecisionObservedStressBand: DynamicPrecisionStressBand | null;
  dynamicPrecisionObservedGuardrailSuggested: boolean | null;
  dynamicPrecisionObservedGuardrailKind: string | null;
  dynamicPrecisionSource: string | null;
  dynamicPrecisionFamilyPolicyId: string | null;
  dynamicPrecisionHysteresisState: DynamicPrecisionHysteresisState | null;
  dynamicPrecisionStabilityTickCount: number | null;
  dynamicPrecisionCooldownTicksRemaining: number | null;
  dynamicPrecisionTransitionAllowed: boolean | null;
  dynamicPrecisionTransitionDecision: DynamicPrecisionTransitionDecision | null;
  dynamicPrecisionActiveRegime: DynamicPrecisionRegime | null;
  dynamicPrecisionSwitchApplied: boolean | null;
  dynamicPrecisionStrategyProfileId: string | null;
  dynamicPrecisionReasonCodes: string[] | null;
}

interface DynamicPrecisionTransitionOutcome {
  allowed: boolean;
  applied: boolean;
  decision: DynamicPrecisionTransitionDecision;
  activeRegime: DynamicPrecisionRegime;
  hysteresisState: DynamicPrecisionHysteresisState;
  stabilityTickCount: number;
  cooldownTicksRemaining: number;
  deescalationEligible: boolean;
  deescalationSuggested: boolean;
}

const DYNAMIC_PRECISION_DEESCALATION_STABILITY_THRESHOLD = 2;
const DYNAMIC_PRECISION_DEESCALATION_COOLDOWN_TICKS = 2;

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
      dynamicPrecisionFamilySwitchingVersion: DYNAMIC_PRECISION_FAMILY_SWITCHING_VERSION,
      dynamicPrecisionHysteresisVersion: DYNAMIC_PRECISION_HYSTERESIS_VERSION,
      dynamicPrecisionEligible: false,
      dynamicPrecisionObservedFamily: null,
      dynamicPrecisionBaselineRegime: null,
      dynamicPrecisionSuggestedRegime: null,
      dynamicPrecisionCurrentRegime: null,
      dynamicPrecisionProposedRegime: null,
      dynamicPrecisionEscalationEligible: false,
      dynamicPrecisionEscalationSuggested: false,
      dynamicPrecisionDeescalationEligible: false,
      dynamicPrecisionDeescalationSuggested: false,
      dynamicPrecisionObservedAmbiguityBand: ambiguityBand,
      dynamicPrecisionObservedRepairWindowOpen: repairWindowOpen,
      dynamicPrecisionObservedStressBand: stressBand,
      dynamicPrecisionObservedGuardrailSuggested: guardrailSuggested,
      dynamicPrecisionObservedGuardrailKind: guardrailKind,
      dynamicPrecisionSource: source,
      dynamicPrecisionFamilyPolicyId: null,
      dynamicPrecisionHysteresisState: null,
      dynamicPrecisionStabilityTickCount: null,
      dynamicPrecisionCooldownTicksRemaining: null,
      dynamicPrecisionTransitionAllowed: false,
      dynamicPrecisionTransitionDecision: null,
      dynamicPrecisionActiveRegime: null,
      dynamicPrecisionSwitchApplied: false,
      dynamicPrecisionStrategyProfileId: null,
      dynamicPrecisionReasonCodes: ["dynamic_precision_not_eligible"],
    };
  }

  const baselineRegime = deriveBaselineRegime(family);
  const escalationEligible =
    ambiguityBand === "high" ||
    repairWindowOpen === true ||
    stressBand === "critical" ||
    guardrailSuggested === true;
  const currentRegime = isDynamicPrecisionRegime(seed?.currentRegime) ? seed!.currentRegime! : baselineRegime;
  const proposedRegime = deriveProposedRegime(family, baselineRegime, {
    ambiguityBand,
    repairWindowOpen,
    stressBand,
    guardrailSuggested,
  });
  const escalationSuggested = compareRegimes(proposedRegime, currentRegime) > 0;
  const familyPolicyId = deriveFamilyPolicyId(family);
  const strategyProfileId = deriveStrategyProfileId(family);
  const transition = deriveTransitionOutcome({
    family,
    baselineRegime,
    currentRegime,
    proposedRegime,
    ambiguityBand,
    repairWindowOpen,
    stressBand,
    guardrailSuggested,
    priorStabilityTickCount: normalizeTickCount(seed?.stabilityTickCount),
    priorCooldownTicksRemaining: normalizeTickCount(seed?.cooldownTicksRemaining),
  });
  const reasonCodes: string[] = [
    `dynamic_precision_family_${family}`,
    `dynamic_precision_baseline_${baselineRegime}`,
    `dynamic_precision_current_${currentRegime}`,
    `dynamic_precision_proposed_${proposedRegime}`,
    `dynamic_precision_active_${transition.activeRegime}`,
    `dynamic_precision_family_policy_${familyPolicyId}`,
    `dynamic_precision_strategy_profile_${strategyProfileId}`,
    `dynamic_precision_transition_${transition.decision}`,
    `dynamic_precision_hysteresis_${transition.hysteresisState}`,
    `dynamic_precision_stability_ticks_${transition.stabilityTickCount}`,
    `dynamic_precision_cooldown_ticks_${transition.cooldownTicksRemaining}`,
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
  if (transition.deescalationEligible) {
    reasonCodes.push("dynamic_precision_deescalation_eligible");
  } else {
    reasonCodes.push("dynamic_precision_deescalation_not_eligible");
  }
  if (transition.deescalationSuggested) {
    reasonCodes.push("dynamic_precision_deescalation_suggested");
  } else {
    reasonCodes.push("dynamic_precision_deescalation_not_suggested");
  }

  return {
    dynamicPrecisionSchemaVersion: DYNAMIC_PRECISION_SCHEMA_VERSION,
    dynamicPrecisionPolicyVersion: DYNAMIC_PRECISION_POLICY_VERSION,
    dynamicPrecisionEscalationPilotVersion: DYNAMIC_PRECISION_ESCALATION_PILOT_VERSION,
    dynamicPrecisionFamilySwitchingVersion: DYNAMIC_PRECISION_FAMILY_SWITCHING_VERSION,
    dynamicPrecisionHysteresisVersion: DYNAMIC_PRECISION_HYSTERESIS_VERSION,
    dynamicPrecisionEligible: true,
    dynamicPrecisionObservedFamily: family,
    dynamicPrecisionBaselineRegime: baselineRegime,
    dynamicPrecisionSuggestedRegime: proposedRegime,
    dynamicPrecisionCurrentRegime: currentRegime,
    dynamicPrecisionProposedRegime: proposedRegime,
    dynamicPrecisionEscalationEligible: escalationEligible,
    dynamicPrecisionEscalationSuggested: escalationSuggested,
    dynamicPrecisionDeescalationEligible: transition.deescalationEligible,
    dynamicPrecisionDeescalationSuggested: transition.deescalationSuggested,
    dynamicPrecisionObservedAmbiguityBand: ambiguityBand,
    dynamicPrecisionObservedRepairWindowOpen: repairWindowOpen,
    dynamicPrecisionObservedStressBand: stressBand,
    dynamicPrecisionObservedGuardrailSuggested: guardrailSuggested,
    dynamicPrecisionObservedGuardrailKind: guardrailKind,
    dynamicPrecisionSource: source,
    dynamicPrecisionFamilyPolicyId: familyPolicyId,
    dynamicPrecisionHysteresisState: transition.hysteresisState,
    dynamicPrecisionStabilityTickCount: transition.stabilityTickCount,
    dynamicPrecisionCooldownTicksRemaining: transition.cooldownTicksRemaining,
    dynamicPrecisionTransitionAllowed: transition.allowed,
    dynamicPrecisionTransitionDecision: transition.decision,
    dynamicPrecisionActiveRegime: transition.activeRegime,
    dynamicPrecisionSwitchApplied: transition.applied,
    dynamicPrecisionStrategyProfileId: strategyProfileId,
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

function deriveTransitionOutcome(input: {
  family: DynamicPrecisionFamily;
  baselineRegime: DynamicPrecisionRegime;
  currentRegime: DynamicPrecisionRegime;
  proposedRegime: DynamicPrecisionRegime;
  ambiguityBand: DynamicPrecisionAmbiguityBand | null;
  repairWindowOpen: boolean | null;
  stressBand: DynamicPrecisionStressBand | null;
  guardrailSuggested: boolean | null;
  priorStabilityTickCount: number;
  priorCooldownTicksRemaining: number;
}): DynamicPrecisionTransitionOutcome {
  const steadyObservation =
    input.ambiguityBand === "low" &&
    input.repairWindowOpen === false &&
    input.stressBand === "nominal" &&
    input.guardrailSuggested !== true;

  const stabilityTickCount = steadyObservation ? input.priorStabilityTickCount + 1 : 0;
  const aboveBaseline = compareRegimes(input.currentRegime, input.baselineRegime) > 0;
  const cooldownTicksRemaining =
    steadyObservation && aboveBaseline && input.priorCooldownTicksRemaining > 0
      ? input.priorCooldownTicksRemaining - 1
      : input.priorCooldownTicksRemaining;

  if (input.proposedRegime === input.currentRegime) {
    const deescalationEligible = aboveBaseline;
    const deescalationSuggested = false;
    const hysteresisState =
      aboveBaseline && cooldownTicksRemaining > 0
        ? "cooldown_active"
        : deescalationEligible && steadyObservation && stabilityTickCount >= DYNAMIC_PRECISION_DEESCALATION_STABILITY_THRESHOLD
          ? "deescalation_armed"
          : "steady";
    return {
      allowed: false,
      applied: false,
      decision: "steady",
      activeRegime: input.currentRegime,
      hysteresisState,
      stabilityTickCount,
      cooldownTicksRemaining,
      deescalationEligible,
      deescalationSuggested,
    };
  }

  if (compareRegimes(input.proposedRegime, input.currentRegime) < 0) {
    const deescalationEligible = aboveBaseline;
    if (!deescalationEligible) {
      return {
        allowed: false,
        applied: false,
        decision: "deescalation_deferred",
        activeRegime: input.currentRegime,
        hysteresisState: "steady",
        stabilityTickCount,
        cooldownTicksRemaining,
        deescalationEligible,
        deescalationSuggested: false,
      };
    }

    if (cooldownTicksRemaining > 0) {
      return {
        allowed: false,
        applied: false,
        decision: "deescalation_cooldown_active",
        activeRegime: input.currentRegime,
        hysteresisState: "cooldown_active",
        stabilityTickCount,
        cooldownTicksRemaining,
        deescalationEligible,
        deescalationSuggested: false,
      };
    }

    const deescalationSuggested =
      steadyObservation && stabilityTickCount >= DYNAMIC_PRECISION_DEESCALATION_STABILITY_THRESHOLD;
    if (deescalationSuggested) {
      return {
        allowed: true,
        applied: true,
        decision: "deescalate_applied",
        activeRegime: input.proposedRegime,
        hysteresisState: "deescalation_armed",
        stabilityTickCount,
        cooldownTicksRemaining: 0,
        deescalationEligible,
        deescalationSuggested,
      };
    }

    return {
      allowed: false,
      applied: false,
      decision: "deescalation_deferred",
      activeRegime: input.currentRegime,
      hysteresisState: "steady",
      stabilityTickCount,
      cooldownTicksRemaining,
      deescalationEligible,
      deescalationSuggested,
    };
  }

  const allowed = isEscalationAllowedByFamily(input.family, input.currentRegime, input.proposedRegime);
  return {
    allowed,
    applied: allowed,
    decision: allowed ? "escalate_applied" : "blocked_by_family_policy",
    activeRegime: allowed ? input.proposedRegime : input.currentRegime,
    hysteresisState: allowed ? "escalation_armed" : "steady",
    stabilityTickCount: 0,
    cooldownTicksRemaining: allowed ? DYNAMIC_PRECISION_DEESCALATION_COOLDOWN_TICKS : cooldownTicksRemaining,
    deescalationEligible: aboveBaseline,
    deescalationSuggested: false,
  };
}

function isEscalationAllowedByFamily(
  family: DynamicPrecisionFamily,
  currentRegime: DynamicPrecisionRegime,
  proposedRegime: DynamicPrecisionRegime
): boolean {
  switch (family) {
    case "reflex":
    case "bounded":
      return currentRegime === "turbo" && proposedRegime === "tight";
    case "numeric":
      return (currentRegime === "turbo" && proposedRegime === "tight") ||
        (currentRegime === "tight" && proposedRegime === "ultra");
    case "open":
    default:
      return false;
  }
}

function compareRegimes(left: DynamicPrecisionRegime, right: DynamicPrecisionRegime): number {
  return regimeRank(left) - regimeRank(right);
}

function regimeRank(regime: DynamicPrecisionRegime): number {
  switch (regime) {
    case "turbo":
      return 0;
    case "tight":
      return 1;
    case "ultra":
    default:
      return 2;
  }
}

function deriveStrategyProfileId(family: DynamicPrecisionFamily): string {
  switch (family) {
    case "reflex":
    case "bounded":
      return "3h_strategy_profile_structured_v1";
    case "numeric":
      return "3h_strategy_profile_numeric_adaptive_v1";
    case "open":
    default:
      return "3h_strategy_profile_open_tail_high_budget_v1";
  }
}

function isDynamicPrecisionRegime(value: unknown): value is DynamicPrecisionRegime {
  return value === "turbo" || value === "tight" || value === "ultra";
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

function normalizeTickCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}
