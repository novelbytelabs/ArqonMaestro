# Stage 3I-S6 Apply Report (ArqonMaestro)

## Baseline
- Repo: `ArqonMaestro`
- Branch: `feature/h3`
- Baseline commit: `5207140`
- Applied bundle: `tmp/h3_stage3i_s6_bundle_20260404.zip`

## Applied Files (docs-only)
1. `docs/h3/H3_RUNTIME_EVIDENCE_SCHEMA.md`
2. `docs/h3/H3_STAGE3I_PLAN.md`
3. `docs/h3/H3_STAGE3I_STATUS_REPORT.md`
4. `docs/h3/H3_STAGE3I_VALIDATION_GATES_GUIDE.md`

## SHA256 Verification (exact)
- `9ac1fe89766be4781a0baf1518054afdd18e06eff7d883ef4ef0439dec076c87  docs/h3/H3_RUNTIME_EVIDENCE_SCHEMA.md`
- `fa4fb676646a7ce37454d82378edf05f1959d7b74440c701cd5d37272c030471  docs/h3/H3_STAGE3I_PLAN.md`
- `9ca289bb0f90b86745e2c04c637124f425584737d9a42c121a2e45ad96aba51d  docs/h3/H3_STAGE3I_STATUS_REPORT.md`
- `f3d0ea61d6d217f6825f62ede2ad49a1156062919422671d94c9468ac28b5fa1  docs/h3/H3_STAGE3I_VALIDATION_GATES_GUIDE.md`

## Gate Results

### Gate 1
- Command: `cd maestro/client && npx tsc --noEmit`
- Exit: `0`
- Stdout: *(none)*
- Stderr: *(none)*

### Gate 2
- Command: `cd maestro/client && npx jest --config jest.config.js --runInBand src/test/audio/workflow-memory-observation.unit.spec.ts src/test/audio/chunk-manager-h3-workflow-memory.unit.spec.ts src/test/audio/dynamic-precision-regimes.unit.spec.ts src/test/audio/chunk-manager-h3-dynamic-precision.unit.spec.ts src/test/audio/counterfactual-repair-intelligence.unit.spec.ts src/test/audio/chunk-manager-h3-counterfactual-repair.unit.spec.ts src/test/audio/multi-resolution-atlas.unit.spec.ts src/test/audio/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts src/test/audio/policy-shaped-atlas-shards.unit.spec.ts src/test/audio/chunk-manager-h3-atlas-shard.unit.spec.ts src/test/audio/focus-conditioned-command-context.unit.spec.ts src/test/audio/chunk-manager-h3-focus-context.unit.spec.ts src/test/audio/voice-semantic-address-registry.unit.spec.ts src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts`
- Exit: `0`
- Stdout summary: `Test Suites: 15 passed, 15 total; Tests: 124 passed, 124 total`
- Stderr: *(none)*

### Gate 3
- Command: `cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py`
- Exit: `0`
- Stdout summary: JSON report with `status: pass` and all checks true (`reflex_improves`, `numeric_improves`, `warm_miss_non_authorizing`, `warm_miss_uses_baseline_path`)
- Stderr: *(none)*

## Microscopic Fixes
- None required.

## Deliverables
- Applied docs zip: `tmp/h3_stage3i_s6_applied_bundle_20260404.zip`
- Applied docs zip sha256: `8fff69e65aea8c874343ab72ac0f66b573ed6003d1815719f040c5fb2f06dae8`
