# Gate 6 Plan: Kokoro TTS Operational Hard-Close

## Goal

Promote Kokoro TTS from roadmap item to production-ready, evidence-backed runtime capability with explicit rollback.

## Scope

- Install and configure Kokoro runtime dependencies on target environment(s).
- Add explicit runtime selection between:
  - `kokoro` (primary)
  - `fallback` (existing `aplay` speech path)
- Validate non-blocking playback, replay safety, and failure semantics.
- Prove rollback in under one minute with command artifacts.

## Non-Goals

- Reopening Gates 1–5.
- Replacing the Arqon Bus transport model.

## Entry Criteria

1. Gates 1–5 remain green on current `main`.
2. Bus-only transport migration has no `17373` runtime dependency.
3. Port reference is published in `docs/operations/port-reference.md`.

## Required Implementation

1. Runtime Configuration
- Add settings:
  - `arqon_tts_provider` (`kokoro` | `fallback`, default `fallback`)
  - `arqon_tts_kokoro_model_path`
  - `arqon_tts_kokoro_voice`
  - `arqon_tts_kokoro_timeout_ms`
- Emit telemetry:
  - `stt.tts.provider_selected`
  - `stt.tts.kokoro.success`
  - `stt.tts.kokoro.failure`
  - `stt.tts.fallback.used`
  - `stt.tts.latency_ms`

2. Playback Execution Contract
- `kokoro` path must remain non-blocking.
- On Kokoro failure:
  - if fallback enabled, execute fallback and emit explicit fallback telemetry.
  - if fallback disabled, fail closed with clear error signal.
- Replay dedupe behavior from Gate 3 must remain intact.

3. Rollback Control
- Single-switch rollback:
  - `arqon_tts_provider=fallback`
- No process restarts required for rollback if runtime allows dynamic reload; if restart required, document exact restart command.

## Required Validation Commands

1. Build and baseline regressions
- `cd maestro/client && npm run build:main`
- `cd maestro/client && ARQON_SOAK_PORT=9103 npx ts-node test-soak.ts`
- `cd maestro/client && npx ts-node test-replay-smoke.ts`
- `cd maestro/client && npx ts-node test-integrity-smoke.ts`

2. Kokoro targeted smoke
- `cd maestro/client && npx ts-node test-kokoro-smoke.ts`
- Must prove:
  - provider selection = `kokoro`
  - successful synthesized playback
  - latency captured

3. Failure and fallback smoke
- `cd maestro/client && npx ts-node test-kokoro-failure-smoke.ts`
- Must prove:
  - deterministic Kokoro failure handling
  - fallback behavior if enabled
  - explicit fail-closed if fallback disabled

4. Rollback smoke
- `cd maestro/client && npx ts-node test-kokoro-rollback.ts`
- Must prove:
  - switch to fallback works
  - speech path still functions
  - no duplicate execution/replay regressions

## Hard-Fail Conditions

1. Any placeholder/stub in Kokoro execution path.
2. Any blocking call that stalls main event loop.
3. Missing explicit failure telemetry on Kokoro errors.
4. Rollback path not proven by command artifact.
5. Docs claim Kokoro-ready without install/config/test evidence.

## Evidence Pack Requirements

Update:
- `docs/operations/phase-e-evidence.md` (or new Gate 6 evidence pack)
- `docs/operations/walkthrough.md`
- `docs/decision-log.md` (new ADM for provider policy and rollback contract)

Each artifact block must include:
- `command`
- `timestamp`
- `exit_code`
- `key_output`

## Exit Criteria (Hard-Close)

1. All required commands exit `0`.
2. Kokoro success path proven with runtime output.
3. Kokoro failure semantics proven with fallback/fail-closed behavior.
4. Rollback switch proven by targeted smoke.
5. Residual risks documented with owners and follow-up date.
