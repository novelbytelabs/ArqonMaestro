# H2.4 Implementation Notes

This bundle adds an **additive H2.4 proof layer** on top of the current H2.3 runtime.

## Goal

H2.4 is designed to answer, with artifacts:
- when each command class becomes eligible to execute
- whether an H2/H23 policy decision was present at execution time
- whether execution timing matched the recommended class gate
- whether execution happened under real policy control or observe-only fallback

## What is included

### Modified
- `h23-live-trace-recorder.ts`
  - richer `H23DecisionSummary`
  - `getTraceSnapshot(chunkId)`
  - `getRelativeNowMs(chunkId)`

- `executor.ts`
  - `H24_ENABLED` additive integration
  - records H2.4 proof at:
    - lookup
    - block
    - dispatch_start
    - dispatch_complete

### New
- `h24-policy-proof-recorder.ts`
  - writes `artifacts/reports/h24_policy_proofs/{chunkId}.json`
  - classifies command into:
    - reflex
    - closed_structure
    - parameterized_numeric
    - parameterized_open
    - unknown
  - computes recommended gate:
    - reflex_early
    - structural_stability
    - endpoint_closure
  - records whether policy decision was present and granted at execution

- `h24-trace-replay.ts`
  - lightweight replay/summary helper for H24 artifacts and H23 recorder artifacts

## Runtime flags

- `H24_ENABLED=true`
  - enable proof artifact generation

- `H24_OBSERVE_ONLY=true`
  - documentation-level companion flag; current implementation does not change runtime behavior when false
  - H24 currently records proof and does not add new blocks

## Notes

This bundle is intentionally **proof-first**, not behavior-first.
It does **not** change H2.3 gating behavior.
It adds the measurement layer needed to prove whether the policy layer is actually controlling execution timing by class.
