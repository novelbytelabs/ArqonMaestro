# ASR Stage 1 + Stage 2A/2B/2C Hard-Close Audit

**Date:** 2026-03-23
**Auditor:** Codex (takeover pass)
**Scope:** `plans/asr-model-migration.md` + `plans/asr-process-isolated-rollout.md`

## Verdict
- **Status:** CONDITIONALLY READY FOR 2D/2E
- **Meaning:** Critical runtime correctness gaps in Stage 1/2A/2B/2C were fixed in code; final hard-close requires evidence packaging in Stage 2D and watchdog GREEN.

## What Was Fixed in This Pass
1. Command-lane fallback replay bug fixed in `chunk-manager.ts`.
- Parakeet failure now attempts whisper fallback, then replays buffered PCM to endpoint.
- Whisper failure now replays buffered PCM before endpoint finalize.

2. Dictation-lane replay integrity fixed in `chunk-manager.ts`.
- Faster-whisper finalize now preserves buffered audio on failure so endpoint replay can work.
- Qwen3 failure path keeps buffered audio for deterministic fallback chain.

3. Parakeet stream lifecycle hardened.
- Missing stream during audio route no longer black-holes audio lane selection.
- Stream cancellation added to final cleanup and reset paths.

4. Parakeet WebSocket provider race fixed in `parakeet-command-fast-provider.ts`.
- Added settled-state guard so normal socket close after final does not emit false failure.
- Timeout/error/close now resolve/reject exactly once.

5. Placeholder/shim language removed from production path in `sidecars/parakeet_sidecar.py`.
- Replaced speculative streaming comments/branching with deterministic partial cadence.
- Added strict sample-rate validation (`16000`) and model-loaded guard.

6. Bridge/sidecar syntax and shell checks passed.
- `qwen3_asr_bridge.py` and `parakeet_sidecar.py` compile under `helios-gpu-118`.
- `sidecar_manager.sh` bash syntax valid.

## High-Confidence Risks Still Open (to close in 2D/2E)
1. Missing chunk-manager integration tests.
- Provider tests are strong, but chunk-manager routing/fallback graph has no dedicated tests yet.

2. ASR suite contains pre-existing env-coupled test failures.
- `whisper-command-fast-provider.unit.spec.ts` and `faster-whisper-dictation-provider.unit.spec.ts` fail due binary spawn assumptions (`/tmp/whisper-cli`, `/tmp/python`) despite mock deps.
- These failures are not introduced by this pass but block a clean all-green evidence bundle.

3. Stage 2C reliability pool integration remains partial.
- `sidecar-health.ts` exists but no direct runtime integration path was proven in this pass.

## Evidence Run Snapshot
- PASS: `npx jest src/test/audio/parakeet-command-fast-provider.unit.spec.ts src/test/audio/qwen3-asr-dictation-provider.unit.spec.ts --runInBand`
- PASS: `conda run -n helios-gpu-118 python -m py_compile .../qwen3_asr_bridge.py .../parakeet_sidecar.py`
- FAIL (pre-existing fixture issues):
  - `src/test/audio/whisper-command-fast-provider.unit.spec.ts`
  - `src/test/audio/faster-whisper-dictation-provider.unit.spec.ts`

## Stage Control Clarification
- The active process-isolated ASR plan defines Stage 2A → 2D.
- Any “Stage 3 Advanced Pipeline Optimization” expansion is **not part of the active hard-close constitution** and must not be treated as required before 2D/2E completion.

## PM Instructions for Immediate Next Step
Start Stage **2D + 2E combined closure sprint** with strict scope:
1. Add chunk-manager fallback integration tests (Parakeet failover chain, Qwen3 503 chain, replay assertions).
2. Fix the two env-coupled legacy provider tests so CI evidence is deterministic.
3. Produce watchdog-auditable hard-close pack with manifest and raw outputs.
4. Do not introduce new architecture scope.
