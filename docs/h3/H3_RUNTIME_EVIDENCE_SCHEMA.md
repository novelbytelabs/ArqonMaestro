# H3 Runtime Evidence Schema

Stage 3E2 adds advisory policy-shaped atlas shard hint telemetry to the existing H3 runtime evidence chain.

New advisory-only fields:
- `atlasShardPolicyVersion`
- `atlasShardHintId`
- `atlasShardHintEligible`
- `atlasShardHintSource`
- `atlasShardHintPriority`
- `atlasShardReasonCodes`

Meaning:
- the shard hint is a policy-shaped atlas hint only
- it is derived from validated focus context
- it does not authorize execution
- it does not bypass live geometry, live tail normalization, or H23/H24
- it does not add persistence or distributed cache

Initial v1 shard hints:
- `browser_navigation`
- `editor_symbolic`
- `terminal_session`
- `global_default`
