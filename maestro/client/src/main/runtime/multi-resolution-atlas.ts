import { PolicyShapedAtlasShardHint } from "./policy-shaped-atlas-shards";

export const MULTI_RESOLUTION_ATLAS_PLAN_SCHEMA_VERSION =
  "h3_multi_resolution_atlas_plan_v1" as const;
export const MULTI_RESOLUTION_ATLAS_POLICY_VERSION =
  "3f_multi_resolution_atlas_v1" as const;

export interface MultiResolutionAtlasPlanSeed {
  regionId: string | null;
  commandClass: string | null;
  parameterType: "numeric" | "open" | null;
  canonicalMergedText?: string | null;
}

export interface MultiResolutionAtlasPlan {
  schemaVersion: typeof MULTI_RESOLUTION_ATLAS_PLAN_SCHEMA_VERSION;
  policyVersion: string;
  multiResolutionAtlasEligible: boolean;
  multiResolutionAtlasCoarseRegionId: string | null;
  multiResolutionAtlasFamilyAtlasId: string | null;
  multiResolutionAtlasPrefixBandId: string | null;
  multiResolutionAtlasTailStrategyId: string | null;
  multiResolutionAtlasSource: "atlas_shard_hint" | "global_default" | "none";
  multiResolutionAtlasReasonCodes: string[];
}

export interface MultiResolutionAtlasFamilyRoutingCandidate {
  regionId: string | null;
  commandFamily: string | null;
  parameterType?: "numeric" | "open" | null;
  canonicalPrefix?: string | null;
  canonicalMergedText?: string | null;
}

export interface MultiResolutionAtlasFamilyRoutingAdjustment {
  multiResolutionAtlasFamilyRoutingApplied: boolean;
  multiResolutionAtlasFamilyRoutingBoost: number;
  multiResolutionAtlasFamilyRoutingReasonCodes: string[];
  multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId: string | null;
  multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId: string | null;
}

export interface MultiResolutionAtlasPrefixBandRoutingCandidate {
  regionId: string | null;
  commandFamily: string | null;
  parameterType?: "numeric" | "open" | null;
  canonicalPrefix?: string | null;
  canonicalMergedText?: string | null;
}

export interface MultiResolutionAtlasPrefixBandRoutingAdjustment {
  multiResolutionAtlasPrefixBandRoutingApplied: boolean;
  multiResolutionAtlasPrefixBandRoutingBoost: number;
  multiResolutionAtlasPrefixBandRoutingReasonCodes: string[];
  multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId: string | null;
  multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId: string | null;
}

export const MULTI_RESOLUTION_ATLAS_FAMILY_ROUTING_MAX_BOOST = 0.035;
export const MULTI_RESOLUTION_ATLAS_PREFIX_BAND_ROUTING_MAX_BOOST = 0.025;

export interface MultiResolutionAtlasEvidenceFields {
  multiResolutionAtlasSchemaVersion: string | null;
  multiResolutionAtlasPolicyVersion: string | null;
  multiResolutionAtlasEligible: boolean | null;
  multiResolutionAtlasCoarseRegionId: string | null;
  multiResolutionAtlasFamilyAtlasId: string | null;
  multiResolutionAtlasPrefixBandId: string | null;
  multiResolutionAtlasTailStrategyId: string | null;
  multiResolutionAtlasSource: string | null;
  multiResolutionAtlasReasonCodes: string[] | null;
}

export function deriveMultiResolutionAtlasPlan(
  hint: PolicyShapedAtlasShardHint | null | undefined,
  seed: MultiResolutionAtlasPlanSeed | null | undefined
): MultiResolutionAtlasPlan {
  if (!hint || !hint.atlasShardHintEligible || !hint.atlasShardHintId) {
    return {
      schemaVersion: MULTI_RESOLUTION_ATLAS_PLAN_SCHEMA_VERSION,
      policyVersion: MULTI_RESOLUTION_ATLAS_POLICY_VERSION,
      multiResolutionAtlasEligible: false,
      multiResolutionAtlasCoarseRegionId: null,
      multiResolutionAtlasFamilyAtlasId: null,
      multiResolutionAtlasPrefixBandId: null,
      multiResolutionAtlasTailStrategyId: null,
      multiResolutionAtlasSource: "none",
      multiResolutionAtlasReasonCodes: ["multi_resolution_atlas_not_eligible"],
    };
  }

  const coarseRegionId = coarseRegionForHint(hint.atlasShardHintId);
  const familyAtlasId = familyAtlasIdForSeed(seed);
  const prefixBandId = prefixBandIdForRegion(seed?.regionId ?? null);
  const tailStrategyId = tailStrategyIdForSeed(seed);

  return {
    schemaVersion: MULTI_RESOLUTION_ATLAS_PLAN_SCHEMA_VERSION,
    policyVersion: MULTI_RESOLUTION_ATLAS_POLICY_VERSION,
    multiResolutionAtlasEligible: true,
    multiResolutionAtlasCoarseRegionId: coarseRegionId,
    multiResolutionAtlasFamilyAtlasId: familyAtlasId,
    multiResolutionAtlasPrefixBandId: prefixBandId,
    multiResolutionAtlasTailStrategyId: tailStrategyId,
    multiResolutionAtlasSource:
      hint.atlasShardHintId === "global_default" ? "global_default" : "atlas_shard_hint",
    multiResolutionAtlasReasonCodes: [
      `multi_resolution_atlas_${hint.atlasShardHintId}`,
      familyAtlasId ? `multi_resolution_family_${familyAtlasId}` : "multi_resolution_family_unknown",
      prefixBandId ? `multi_resolution_prefix_${prefixBandId}` : "multi_resolution_prefix_unknown",
      tailStrategyId ? `multi_resolution_tail_${tailStrategyId}` : "multi_resolution_tail_unknown",
    ],
  };
}

export function deriveMultiResolutionAtlasEvidenceFields(
  hint: PolicyShapedAtlasShardHint | null | undefined,
  seed: MultiResolutionAtlasPlanSeed | null | undefined
): MultiResolutionAtlasEvidenceFields {
  const plan = deriveMultiResolutionAtlasPlan(hint, seed);
  return {
    multiResolutionAtlasSchemaVersion: plan.schemaVersion,
    multiResolutionAtlasPolicyVersion: plan.policyVersion,
    multiResolutionAtlasEligible: plan.multiResolutionAtlasEligible,
    multiResolutionAtlasCoarseRegionId: plan.multiResolutionAtlasCoarseRegionId,
    multiResolutionAtlasFamilyAtlasId: plan.multiResolutionAtlasFamilyAtlasId,
    multiResolutionAtlasPrefixBandId: plan.multiResolutionAtlasPrefixBandId,
    multiResolutionAtlasTailStrategyId: plan.multiResolutionAtlasTailStrategyId,
    multiResolutionAtlasSource: plan.multiResolutionAtlasSource,
    multiResolutionAtlasReasonCodes: plan.multiResolutionAtlasReasonCodes,
  };
}

function coarseRegionForHint(hintId: string | null | undefined): string | null {
  if (hintId === "browser_navigation") {
    return "browser_surface";
  }
  if (hintId === "editor_symbolic") {
    return "editor_surface";
  }
  if (hintId === "terminal_session") {
    return "terminal_surface";
  }
  if (hintId === "global_default") {
    return "global_surface";
  }
  return null;
}

function familyAtlasIdForSeed(seed: MultiResolutionAtlasPlanSeed | null | undefined): string | null {
  if (!seed) {
    return null;
  }
  if (seed.parameterType === "numeric") {
    return "parameterized_numeric_family";
  }
  if (seed.parameterType === "open") {
    return "parameterized_open_family";
  }
  if ((seed.commandClass ?? "").toLowerCase() === "reflex") {
    return "reflex_family";
  }
  if (seed.regionId) {
    return "closed_structure_family";
  }
  return null;
}

function prefixBandIdForRegion(regionId: string | null): string | null {
  if (!regionId) {
    return null;
  }
  return `prefix_${regionId.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

function tailStrategyIdForSeed(seed: MultiResolutionAtlasPlanSeed | null | undefined): string | null {
  if (!seed) {
    return null;
  }
  if (seed.parameterType === "numeric") {
    return "numeric_tail_v1";
  }
  if (seed.parameterType === "open") {
    return "open_tail_v1";
  }
  return "no_tail";
}

export function deriveMultiResolutionAtlasCandidateFamilyAtlasId(
  candidate: MultiResolutionAtlasFamilyRoutingCandidate | null | undefined
): string | null {
  if (!candidate) {
    return null;
  }
  const family = (candidate.commandFamily ?? "").toLowerCase();
  if (family === "parameterized_numeric") {
    return "parameterized_numeric_family";
  }
  if (family === "parameterized_open") {
    return "parameterized_open_family";
  }
  if (family === "reflex") {
    return "reflex_family";
  }
  if (family === "closed_structure") {
    return "closed_structure_family";
  }
  if (candidate.parameterType === "numeric") {
    return "parameterized_numeric_family";
  }
  if (candidate.parameterType === "open") {
    return "parameterized_open_family";
  }
  return null;
}

export function deriveMultiResolutionAtlasCandidatePrefixBandId(
  candidate: MultiResolutionAtlasPrefixBandRoutingCandidate | null | undefined
): string | null {
  const prefix = candidate?.canonicalPrefix?.trim() || candidate?.regionId?.trim() || "";
  if (!prefix) {
    return null;
  }
  return `prefix_${prefix.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

export function deriveMultiResolutionAtlasFamilyRoutingAdjustment(
  plan: MultiResolutionAtlasPlan | null | undefined,
  candidate: MultiResolutionAtlasFamilyRoutingCandidate | null | undefined
): MultiResolutionAtlasFamilyRoutingAdjustment {
  if (!plan || !plan.multiResolutionAtlasEligible || !plan.multiResolutionAtlasFamilyAtlasId) {
    return {
      multiResolutionAtlasFamilyRoutingApplied: false,
      multiResolutionAtlasFamilyRoutingBoost: 0,
      multiResolutionAtlasFamilyRoutingReasonCodes: ["multi_resolution_family_routing_not_eligible"],
      multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId: null,
      multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId: deriveMultiResolutionAtlasCandidateFamilyAtlasId(candidate),
    };
  }

  const candidateFamilyAtlasId = deriveMultiResolutionAtlasCandidateFamilyAtlasId(candidate);
  if (!candidateFamilyAtlasId) {
    return {
      multiResolutionAtlasFamilyRoutingApplied: false,
      multiResolutionAtlasFamilyRoutingBoost: 0,
      multiResolutionAtlasFamilyRoutingReasonCodes: ["multi_resolution_family_candidate_unknown"],
      multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId: plan.multiResolutionAtlasFamilyAtlasId,
      multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId: null,
    };
  }

  if (candidateFamilyAtlasId !== plan.multiResolutionAtlasFamilyAtlasId) {
    return {
      multiResolutionAtlasFamilyRoutingApplied: false,
      multiResolutionAtlasFamilyRoutingBoost: 0,
      multiResolutionAtlasFamilyRoutingReasonCodes: [
        "multi_resolution_family_no_match",
        `multi_resolution_family_expected_${plan.multiResolutionAtlasFamilyAtlasId}`,
        `multi_resolution_family_candidate_${candidateFamilyAtlasId}`,
      ],
      multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId: plan.multiResolutionAtlasFamilyAtlasId,
      multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId: candidateFamilyAtlasId,
    };
  }

  return {
    multiResolutionAtlasFamilyRoutingApplied: true,
    multiResolutionAtlasFamilyRoutingBoost: MULTI_RESOLUTION_ATLAS_FAMILY_ROUTING_MAX_BOOST,
    multiResolutionAtlasFamilyRoutingReasonCodes: [
      "multi_resolution_family_match",
      `multi_resolution_family_${candidateFamilyAtlasId}`,
    ],
    multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId: plan.multiResolutionAtlasFamilyAtlasId,
    multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId: candidateFamilyAtlasId,
  };
}

export function deriveMultiResolutionAtlasPrefixBandRoutingAdjustment(
  plan: MultiResolutionAtlasPlan | null | undefined,
  candidate: MultiResolutionAtlasPrefixBandRoutingCandidate | null | undefined
): MultiResolutionAtlasPrefixBandRoutingAdjustment {
  if (!plan || !plan.multiResolutionAtlasEligible || !plan.multiResolutionAtlasPrefixBandId) {
    return {
      multiResolutionAtlasPrefixBandRoutingApplied: false,
      multiResolutionAtlasPrefixBandRoutingBoost: 0,
      multiResolutionAtlasPrefixBandRoutingReasonCodes: ["multi_resolution_prefix_band_routing_not_eligible"],
      multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId: null,
      multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId: deriveMultiResolutionAtlasCandidatePrefixBandId(candidate),
    };
  }

  const candidatePrefixBandId = deriveMultiResolutionAtlasCandidatePrefixBandId(candidate);
  if (!candidatePrefixBandId) {
    return {
      multiResolutionAtlasPrefixBandRoutingApplied: false,
      multiResolutionAtlasPrefixBandRoutingBoost: 0,
      multiResolutionAtlasPrefixBandRoutingReasonCodes: ["multi_resolution_prefix_band_candidate_unknown"],
      multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId: plan.multiResolutionAtlasPrefixBandId,
      multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId: null,
    };
  }

  if (candidatePrefixBandId !== plan.multiResolutionAtlasPrefixBandId) {
    return {
      multiResolutionAtlasPrefixBandRoutingApplied: false,
      multiResolutionAtlasPrefixBandRoutingBoost: 0,
      multiResolutionAtlasPrefixBandRoutingReasonCodes: [
        "multi_resolution_prefix_band_no_match",
        `multi_resolution_prefix_band_expected_${plan.multiResolutionAtlasPrefixBandId}`,
        `multi_resolution_prefix_band_candidate_${candidatePrefixBandId}`,
      ],
      multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId: plan.multiResolutionAtlasPrefixBandId,
      multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId: candidatePrefixBandId,
    };
  }

  return {
    multiResolutionAtlasPrefixBandRoutingApplied: true,
    multiResolutionAtlasPrefixBandRoutingBoost: MULTI_RESOLUTION_ATLAS_PREFIX_BAND_ROUTING_MAX_BOOST,
    multiResolutionAtlasPrefixBandRoutingReasonCodes: [
      "multi_resolution_prefix_band_match",
      `multi_resolution_prefix_band_${candidatePrefixBandId}`,
    ],
    multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId: plan.multiResolutionAtlasPrefixBandId,
    multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId: candidatePrefixBandId,
  };
}
