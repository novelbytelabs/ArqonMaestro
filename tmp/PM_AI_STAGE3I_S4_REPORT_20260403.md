# Stage 3I-S4 Integration Report (ArqonMaestro)

## Baseline
- Repo: `ArqonMaestro`
- Branch: `feature/h3`
- Baseline commit: `d060e66`
- Applied bundle: `tmp/h3_stage3i_s4_bundle_20260403.zip`

## Pre-Gate SHA Verification
All 7 requested bundle hashes matched exactly before Gate 1.

## Exact Issue 1
Command:
`cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client && npx tsc --noEmit`

Full stdout:
`src/main/runtime/h3-runtime-evidence.ts(290,3): error TS2740: Type '{ ... }' is missing the following properties from type 'H3RuntimeEvidenceEvent': workflowMemoryCandidatePoolOrderingVersion, workflowMemoryCandidatePoolOrderingEligible, workflowMemoryCandidatePoolOrderingApplied, workflowMemoryCandidatePoolCandidateCountBefore, and 11 more.`

Full stderr:
`(empty)`

Fix:
- File: `maestro/client/src/main/runtime/h3-runtime-evidence.ts`
- Added missing `workflowMemoryCandidatePoolOrdering*` defaults in `buildDefaultEvent(...)` using existing `?? null` pattern.

## Exact Issue 2
Command:
`cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client && npx jest --config jest.config.js --runInBand ...`

Primary failing surface:
- `src/test/audio/workflow-memory-observation.unit.spec.ts`
- singleton candidate-pool expected pass-through score `[0.68]`, runtime produced `[0.8]`.

Root cause:
- Candidate-pool helper computed per-candidate adjusted scores even when pool ordering was non-applied (singleton), then emitted adjusted list instead of pass-through base list.

Fix:
- File: `maestro/client/src/main/runtime/workflow-memory-candidate-pool-ordering.ts`
- Changed `workflowMemoryCandidatePoolScoresAfter` to use base scores when ordering is non-applied.

## Exact Issue 3
Command:
`cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client && npx jest --config jest.config.js --runInBand ...`

Observed:
- Intermittent cross-suite `ChunkManager` failures in integrated run (`open-tail`, `numeric-tail`, `focus-context`, etc.) while suites passed in isolation.

Fixes (microscopic, no scope broadening):
1. File: `maestro/client/src/test/audio/chunk-manager-h3-workflow-memory.unit.spec.ts`
   - Added `beforeEach` with `jest.clearAllMocks()` and `jest.unmock("../../main/stt/cfh")`.
   - Switched `afterEach` to `jest.unmock(...)` (instead of `dontMock`) and retained restore/clear.
2. File: `maestro/client/src/main/stream/chunk-manager.ts`
   - Kept continuation override handling explicit and consistent.

## Final Edited Files
- `maestro/client/src/main/runtime/workflow-memory-candidate-pool-ordering.ts`
- `maestro/client/src/main/runtime/h3-runtime-evidence.ts`
- `maestro/client/src/main/stream/chunk-manager.ts`
- `maestro/client/src/test/audio/workflow-memory-observation.unit.spec.ts`
- `maestro/client/src/test/audio/chunk-manager-h3-workflow-memory.unit.spec.ts`
- `docs/h3/H3_RUNTIME_EVIDENCE_SCHEMA.md`
- `docs/h3/H3_STAGE3I_PLAN.md`

## Final Gate Results
1. `cd maestro/client && npx tsc --noEmit` -> PASS
2. full `jest --runInBand` integration set -> PASS (`15/15` suites, `120/120` tests)
3. `cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py` -> PASS

## Final Commit
- Commit: `1d6a2ee`
- Branch: `feature/h3`
- Push: `origin/feature/h3` updated from `d060e66` to `1d6a2ee`

## Artifacts
- Applied bundle path: `tmp/h3_stage3i_s4_applied_bundle_20260403.zip`
- PM report path: `tmp/PM_AI_STAGE3I_S4_REPORT_20260403.md`

## Doctrine Check
- Advisory-only continuity pool ordering preserved.
- No authority change.
- No H23/H24 bypass.
- No Stage 3A drift.
- No persistence/distributed cache.
- No macro execution.
- Protobuf/type-directed internals / JSON human-facing preserved.
