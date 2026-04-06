# H3_VALIDATION_GATES_GUIDE

Date:
April 3, 2026

Scope:
Stage 3H closure / validation discipline

Purpose:
Freeze the required real-repo validation pattern that was used to close Stage 3H.

## Required validation order

Always run in this order:

1. TypeScript gate
2. Integrated Jest gate
3. Timing validator

Stop on first failure.
Do not claim green unless all three pass on the real repo baseline.

## Gate 1

Command:
    cd maestro/client && npx tsc --noEmit

Expectation:
- pass with empty stderr

## Gate 2

Command:
    cd maestro/client && npx jest --config jest.config.js --runInBand        src/test/audio/dynamic-precision-regimes.unit.spec.ts        src/test/audio/chunk-manager-h3-dynamic-precision.unit.spec.ts        src/test/audio/counterfactual-repair-intelligence.unit.spec.ts        src/test/audio/chunk-manager-h3-counterfactual-repair.unit.spec.ts        src/test/audio/multi-resolution-atlas.unit.spec.ts        src/test/audio/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts        src/test/audio/policy-shaped-atlas-shards.unit.spec.ts        src/test/audio/chunk-manager-h3-atlas-shard.unit.spec.ts        src/test/audio/focus-conditioned-command-context.unit.spec.ts        src/test/audio/chunk-manager-h3-focus-context.unit.spec.ts        src/test/audio/voice-semantic-address-registry.unit.spec.ts        src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts        src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts

Expectation at Stage 3H closure:
- 13 passed, 13 total suites
- 103 passed, 103 total tests
- runInBand contamination must remain absent

## Gate 3

Command:
    cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py

Expectation:
- status: pass
- warm-miss non-authorizing path checks remain true
- baseline timing path checks remain true

## Regression expectations frozen at Stage 3H closure

Any future slice touching Dynamic Precision must preserve:
- no authority change
- no H23/H24 bypass
- no Stage 3A drift
- no persistence / distributed cache
- no silent test contamination under the full runInBand gate

## Failure handling discipline

If any gate fails:
- stop immediately
- report exact command
- report full stdout
- report full stderr
- identify the smallest real defect surface
- cut a minimal repair only
- do not broaden scope during repair
