# Kokoro Installation (Firecracker-Only)

This runbook installs Kokoro as a sidecar service in a Firecracker microVM.

## Policy

- Production Kokoro path is Firecracker-only.
- Do not rely on host-native Kokoro binary for production.
- Host-native fallback (`aplay`) remains the rollback/degraded path.

## Prerequisites

- Linux host with KVM available:
  - `ls -l /dev/kvm`
- Firecracker + tooling installed on host
- A 24.04-compatible guest rootfs workflow
- Arqon Maestro repo checked out

## Architecture

1. Host runs Maestro.
2. Firecracker VM runs Kokoro service.
3. Host talks to sidecar via local endpoint (for example `127.0.0.1:7781`).
4. Maestro `kokoro` provider calls sidecar API (`/healthz`, `/readyz`, `/synthesize`).

## Step 1: Prepare Firecracker Guest Image

Build or provision a Ubuntu 24.04 rootfs for Firecracker and include:
- Python runtime or Kokoro runtime dependencies
- ONNX Runtime dependencies compatible with guest glibc
- Kokoro service app (HTTP API)

Expected service contract in guest:
- `GET /healthz` -> process healthy
- `GET /readyz` -> model loaded and ready
- `POST /synthesize` -> returns audio payload or file path

## Step 2: Start Long-Lived Kokoro MicroVM

Use your Firecracker launch flow to start a persistent Kokoro VM.

Minimum behavior:
- boot once at service start
- stay warm across synthesis requests
- restart only on health failure or deploy

Verify:
```bash
curl -sS http://127.0.0.1:7781/healthz
curl -sS http://127.0.0.1:7781/readyz
```

## Step 3: Configure Maestro

Set the following settings:

```json
{
  "arqon_tts_provider": "kokoro",
  "arqon_tts_kokoro_url": "http://127.0.0.1:7781",
  "arqon_tts_kokoro_voice": "af_heart",
  "arqon_tts_kokoro_timeout_ms": 10000,
  "arqon_tts_kokoro_fallback_enabled": true
}
```

Notes:
- `arqon_tts_provider=fallback` is the rollback switch.
- Keep fallback enabled during rollout stages.

## Step 4: Validate Gate 6 Path

Run:
```bash
cd maestro/client
npm run build:main
ARQON_SOAK_PORT=9103 npx ts-node test-soak.ts
npx ts-node test-replay-smoke.ts
npx ts-node test-integrity-smoke.ts
npx ts-node test-kokoro-smoke.ts
npx ts-node test-kokoro-failure-smoke.ts
npx ts-node test-kokoro-rollback.ts
```

## Step 5: Rollback Procedure

Immediate rollback:
1. Set `arqon_tts_provider` to `fallback`.
2. Confirm fallback playback works.
3. Keep Kokoro VM running for diagnostics or stop it after incident capture.

## Troubleshooting

### `/readyz` never healthy
- Model load failed in guest or wrong model path.
- Inspect guest logs and ONNX runtime initialization errors.

### Synthesis timeout
- Increase `arqon_tts_kokoro_timeout_ms`.
- Check VM CPU/memory assignment and sidecar queue depth.

### Fallback not used on failure
- Verify `arqon_tts_kokoro_fallback_enabled=true`.
- Verify telemetry emits `stt.tts.fallback.used`.

## Evidence Requirements

Gate 6 cannot be hard-closed unless evidence proves:
- Firecracker sidecar is the active Kokoro runtime
- Kokoro success path works
- failure -> fallback/fail-closed semantics work
- rollback switch works
