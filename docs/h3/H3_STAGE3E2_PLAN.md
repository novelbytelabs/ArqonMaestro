# H3 Stage 3E2 — Policy-Shaped Atlas Shards

Status:
- S1 implemented
- S2 implemented
- S3 implemented
- S4 next

Objective:
Use validated focus context to derive bounded, advisory atlas-shard hints so lookup and ranking can become context-partitioned without changing execution authority.

Doctrine:
- shard hints are advisory only
- shard-aware ranking is advisory only
- shard-aware lookup narrowing is advisory only
- shard hints, ranking, and narrowing may not authorize execution
- live geometric truth remains primary
- live tail normalization remains primary
- H23/H24 remain the only authority gate
- no persistence or distributed cache
- no Turbo/Tight/Ultra
- v1 shard families only

Slices:
- S1 — shard-hint contract + evidence propagation
- S2 — bounded shard-aware ranking pilot
- S3 — policy-conditioned lookup narrowing pilot
- S4 — closure and validation

Stage 3E2-S1 delivered:
- `policy-shaped-atlas-shards.ts`
- advisory derivation of shard hints from focus context
- evidence propagation through H3 runtime evidence
- no lookup or execution-path authority broadening

Stage 3E2-S2 delivered:
- bounded shard-aware ranking adjustment helper
- shard-aware ranking applied during warm candidate scoring only
- shard-aware ranking metadata propagated through lookup, warm, and merged evidence
- no lookup narrowing yet
- no execution authority broadening

Stage 3E2-S3 delivered:
- bounded shard-aware lookup narrowing helper
- narrowing applied during candidate-scan lookup only for eligible non-global shard hints
- narrowing reduces the candidate scan set only when a matching v1 candidate kind exists
- narrowing falls back instead of eliminating the candidate set
- narrowing metadata propagates through lookup, warm, and merged evidence
- no execution authority broadening

Current v1 shard hints:
- `browser_navigation`
- `editor_symbolic`
- `terminal_session`
- `global_default`

Next:
- Stage 3E2-S4 — closure and validation for policy-shaped atlas shards
