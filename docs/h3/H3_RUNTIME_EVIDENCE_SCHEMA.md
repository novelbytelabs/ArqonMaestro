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

Meaning:
- shard hints are derived from validated focus context only
- shard-aware ranking is bounded and advisory only
- shard-aware ranking may reshape warm candidate ordering
- shard-aware ranking may not authorize execution
- shard-aware ranking does not bypass live geometry, live tail normalization, or H23/H24
- shard-aware ranking does not add persistence or distributed cache

Current v1 shard hints:
- `browser_navigation`
- `editor_symbolic`
- `terminal_session`
- `global_default`
