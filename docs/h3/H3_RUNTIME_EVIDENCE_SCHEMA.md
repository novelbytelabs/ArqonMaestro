# H3 Runtime Evidence Schema

## Stage 3E2 advisory shard fields

- `atlasShardPolicyVersion`
- `atlasShardHintId`
- `atlasShardHintEligible`
- `atlasShardHintSource`
- `atlasShardHintPriority`
- `atlasShardReasonCodes`
- `atlasShardRankingApplied`
- `atlasShardRankingBoost`
- `atlasShardRankingReasonCodes`
- `atlasShardRankingCandidateKind`
- `atlasShardNarrowingApplied`
- `atlasShardNarrowingFallbackUsed`
- `atlasShardNarrowingCandidateCountBefore`
- `atlasShardNarrowingCandidateCountAfter`
- `atlasShardNarrowingReasonCodes`
- `atlasShardNarrowingAllowedCandidateKinds`

These fields remain bounded and advisory-only. They may shape lookup behavior but may not authorize execution or bypass H23/H24.

## Stage 3F multi-resolution atlas fields

Observational route contract:
- `multiResolutionAtlasSchemaVersion`
- `multiResolutionAtlasPolicyVersion`
- `multiResolutionAtlasEligible`
- `multiResolutionAtlasCoarseRegionId`
- `multiResolutionAtlasFamilyAtlasId`
- `multiResolutionAtlasPrefixBandId`
- `multiResolutionAtlasTailStrategyId`
- `multiResolutionAtlasSource`
- `multiResolutionAtlasReasonCodes`

Stage 3F-S2 family-atlas routing pilot:
- `multiResolutionAtlasFamilyRoutingApplied`
- `multiResolutionAtlasFamilyRoutingBoost`
- `multiResolutionAtlasFamilyRoutingReasonCodes`
- `multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId`
- `multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId`

Stage 3F-S3 prefix-band routing pilot:
- `multiResolutionAtlasPrefixBandRoutingApplied`
- `multiResolutionAtlasPrefixBandRoutingBoost`
- `multiResolutionAtlasPrefixBandRoutingReasonCodes`
- `multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId`
- `multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId`

Stage 3F-S4 tail-strategy routing pilot:
- `multiResolutionAtlasTailStrategyRoutingApplied`
- `multiResolutionAtlasTailStrategyRoutingBoost`
- `multiResolutionAtlasTailStrategyRoutingReasonCodes`
- `multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId`
- `multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId`

Meaning:
- multi-resolution atlas fields are derived from existing geometric and shard context only
- family-atlas routing, prefix-band routing, and tail-strategy routing are capped advisory boosts only
- family-atlas candidate pooling in candidate-scan lookup is bounded, fallback-safe, and may not authorize execution
- live geometry, live tail normalization, and H23/H24 remain authoritative
- no persistence or distributed cache is introduced


## Stage 3G — Counterfactual + Repair Intelligence

Advisory observational fields added in `3g_counterfactual_repair_v1`:
- `counterfactualRepairSchemaVersion`
- `counterfactualRepairPolicyVersion`
- `counterfactualRepairEligible`
- `counterfactualRepairPrimarySemanticAddressId`
- `counterfactualRepairNearestAlternativeSemanticAddressId`
- `counterfactualRepairNearestAlternativeCanonicalMergedText`
- `counterfactualRepairAmbiguityBand`
- `counterfactualRepairRepairEligible`
- `counterfactualRepairRepairSignal`
- `counterfactualRepairSource`
- `counterfactualRepairReasonCodes`

Stage 3G-S1 remains observational/advisory only. It does not alter lookup authority, governance, or execution rights.
