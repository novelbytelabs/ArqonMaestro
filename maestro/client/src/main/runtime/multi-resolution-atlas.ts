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
