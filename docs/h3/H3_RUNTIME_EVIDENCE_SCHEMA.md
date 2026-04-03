# H3 Runtime Evidence Schema

Stage 3E2 adds advisory policy-shaped atlas shard telemetry to the existing H3 runtime evidence chain.

Shard hint fields:
- `atlasShardPolicyVersion`
- `atlasShardHintId`
- `atlasShardHintEligible`
- `atlasShardHintSource`
- `atlasShardHintPriority`
- `atlasShardReasonCodes`

Stage 3E2-S2 shard-aware ranking pilot fields:
- `atlasShardRankingApplied`
- `atlasShardRankingBoost`
- `atlasShardRankingReasonCodes`
- `atlasShardRankingCandidateKind`

Stage 3E2-S3 policy-conditioned lookup narrowing pilot fields:
- `atlasShardNarrowingApplied`
- `atlasShardNarrowingFallbackUsed`
- `atlasShardNarrowingCandidateCountBefore`
- `atlasShardNarrowingCandidateCountAfter`
- `atlasShardNarrowingReasonCodes`
- `atlasShardNarrowingAllowedCandidateKinds`

Meaning:
- shard hints are derived from validated focus context only
- shard-aware ranking is bounded and advisory only
- shard-aware lookup narrowing is bounded and advisory only
- shard-aware lookup narrowing may reduce candidate-scan breadth only when a v1 shard-kind match exists
- shard-aware lookup narrowing must fall back instead of eliminating the candidate set
- shard-aware shaping may not authorize execution
- shard-aware shaping does not bypass live geometry, live tail normalization, or H23/H24
- shard-aware shaping does not add persistence or distributed cache

Current v1 shard hints:
- `browser_navigation`
- `editor_symbolic`
- `terminal_session`
- `global_default`


## Stage 3F multi-resolution atlas fields

The H3 runtime evidence event now carries advisory multi-resolution atlas route metadata:

- `multiResolutionAtlasSchemaVersion`
- `multiResolutionAtlasPolicyVersion`
- `multiResolutionAtlasEligible`
- `multiResolutionAtlasCoarseRegionId`
- `multiResolutionAtlasFamilyAtlasId`
- `multiResolutionAtlasPrefixBandId`
- `multiResolutionAtlasTailStrategyId`
- `multiResolutionAtlasSource`
- `multiResolutionAtlasReasonCodes`

These fields are observational in `S1`. They do not authorize execution and do not alter H23/H24 governance.


## Stage 3F-S2 family-atlas routing pilot fields

The H3 runtime evidence event now carries advisory family-atlas routing metadata:

- `multiResolutionAtlasFamilyRoutingApplied`
- `multiResolutionAtlasFamilyRoutingBoost`
- `multiResolutionAtlasFamilyRoutingReasonCodes`
- `multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId`
- `multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId`

These fields remain advisory-only in `S2`. They may shape lookup scoring but may not authorize execution or bypass H23/H24.
