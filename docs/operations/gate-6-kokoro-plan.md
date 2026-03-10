# Gate 6 Plan: Kokoro TTS Operational Hard-Close (Firecracker-Only)

## Status

`IN PROGRESS` (not hard-closed)

## Context

Gates 1–5 are hard-closed. Gate 6 operationalizes Kokoro TTS under a strict runtime boundary policy:
- Firecracker microVM is the only supported Kokoro production runtime.
- No host-native Kokoro binary path for production.

Related context:
- `docs/voice_plane_implementation_plan.md`
- `docs/operations/phase-e-evidence.md`
- `docs/operations/walkthrough.md`
- `docs/operations/port-reference.md`
- `docs/operations/kokoro-installation.md`

## Goal

Deliver production-ready Kokoro TTS through a long-lived Firecracker sidecar with:
- deterministic provider behavior
- explicit fallback/fail-closed semantics
- replay-safe and non-blocking audio path
- command-level rollback proof

## Scope

- Build and run Kokoro service inside Firecracker microVM (Ubuntu 24.04 guest).
- Connect Maestro host to sidecar via local loopback proxy endpoint.
- Keep fallback provider available for rollback and degraded operation.

## Non-Goals

- Reopening Gates 1–5.
- Supporting host-native Kokoro binary as production path.
- Replacing Arqon Bus/control-plane architecture.

## Critical Files

Core runtime:
- `maestro/client/src/main/stt/voice-output.ts`
- `maestro/client/src/main/stt/tts-providers.ts`
- `maestro/client/src/main/settings.ts`
- `maestro/client/src/main/stt/tracking.ts`

Integration/config:
- `maestro/client/src/main/windows/settings.ts`
- `maestro/client/src/renderer/pages/settings.tsx`

Gate 6 tests:
- `maestro/client/test-kokoro-smoke.ts`
- `maestro/client/test-kokoro-failure-smoke.ts`
- `maestro/client/test-kokoro-rollback.ts`

Ops docs:
- `docs/operations/kokoro-installation.md`
- `docs/operations/phase-e-evidence.md`
- `docs/operations/walkthrough.md`
- `docs/decision-log.md`

## Entry Criteria

1. Gates 1–5 test pack remains green on `main`.
2. No active runtime dependency on `17373`.
3. Firecracker host prerequisites available on target environment.

## Implementation Requirements

### 1. Firecracker Sidecar Contract (Mandatory)

- Kokoro service runs in a long-lived Firecracker VM, not per request.
- Host reaches sidecar through local endpoint (for example `127.0.0.1:7781`).
- Service exposes:
  - `GET /healthz`
  - `GET /readyz`
  - `POST /synthesize` (text + voice + format)

### 2. Runtime Settings Contract

Required settings:
- `arqon_tts_provider` (`kokoro` | `fallback`)
- `arqon_tts_kokoro_url`
- `arqon_tts_kokoro_voice`
- `arqon_tts_kokoro_timeout_ms`
- `arqon_tts_kokoro_fallback_enabled`

### 3. Playback and Failure Contract

- Keep non-blocking behavior in playback path.
- Preserve replay dedupe from Gate 3.
- If Kokoro sidecar fails:
  - fallback enabled: fallback path executes + telemetry
  - fallback disabled: fail closed + explicit signal

### 4. Telemetry Contract

Emit:
- `stt.tts.provider_selected`
- `stt.tts.kokoro.success`
- `stt.tts.kokoro.failure`
- `stt.tts.fallback.used`
- `stt.tts.latency_ms`
- `stt.tts.fail_closed`

### 5. Rollback Contract

Single-switch rollback:
- `arqon_tts_provider=fallback`

## Validation Commands

Baseline:
- `cd maestro/client && npm run build:main`
- `cd maestro/client && ARQON_SOAK_PORT=9103 npx ts-node test-soak.ts`
- `cd maestro/client && npx ts-node test-replay-smoke.ts`
- `cd maestro/client && npx ts-node test-integrity-smoke.ts`

Gate 6:
- `cd maestro/client && npx ts-node test-kokoro-smoke.ts`
- `cd maestro/client && npx ts-node test-kokoro-failure-smoke.ts`
- `cd maestro/client && npx ts-node test-kokoro-rollback.ts`

## Hard-Fail Conditions

1. Any claim of Gate 6 hard-close while Kokoro sidecar is not running in Firecracker.
2. Placeholder/stub path presented as production Kokoro execution.
3. Blocking playback path or replay dedupe regression.
4. Missing fallback/fail-closed telemetry on Kokoro failures.
5. Rollback not proven by command artifact.

## Evidence and Governance

Update on completion:
- `docs/operations/phase-e-evidence.md`
- `docs/operations/walkthrough.md`
- `docs/decision-log.md` (Gate 6 decision entries)

Mandatory artifact template:
- `command`
- `timestamp`
- `exit_code`
- `key_output`

## Exit Criteria (Hard-Close)

1. Firecracker Kokoro sidecar path proven by command evidence.
2. Gate 6 validation commands all exit `0`.
3. Fallback/fail-closed and rollback paths proven.
4. Residual risks are explicitly documented and owned.
