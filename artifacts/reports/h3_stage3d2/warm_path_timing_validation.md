# H3 Stage 3D2 Warm Timing Validation

Status: PASS

Artifact: `artifacts/reports/h3_stage3d2/warm_path_timing.json`

Checks:
- `reflex_improves`: `true`
- `numeric_improves`: `true`
- `warm_miss_non_authorizing`: `true`
- `warm_miss_uses_baseline_path`: `true`

Measured reductions:
- reflex improvement ms: `0.0066557149999999995`
- reflex improvement pct: `85.57449568543444`
- parameterized numeric improvement ms: `0.004605148333333333`
- parameterized numeric improvement pct: `55.44871981398085`

Warm miss proof:
- warmHitClass: `miss`
- lookupPath: `candidate_scan`
- mismatchReason: `None`
