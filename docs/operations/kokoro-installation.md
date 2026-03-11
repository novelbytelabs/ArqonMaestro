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
- `POST /synthesize_stream` -> NDJSON audio chunk stream for low-latency playback

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

## Step 2b: Validated Local Sidecar Bring-Up (2026-03-10)

The following local run path is validated for development testing:

```bash
source /home/irbsurfer/miniconda3/etc/profile.d/conda.sh
conda activate helios-gpu-118
PYTHONPATH=/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/scripts \
python -m uvicorn kokoro_sidecar:app --host 127.0.0.1 --port 7781
```

Observed verification:
- `GET /healthz` -> `{"status":"ok","service":"kokoro-sidecar"}`
- `GET /readyz` -> `{"ready":true}`
- `ARQON_KOKORO_SMOKE_URL=http://127.0.0.1:7781 npx ts-node test-kokoro-smoke.ts` -> PASS
- `npx ts-node test-kokoro-stream-smoke.ts` -> PASS

Note:
- If you see `address already in use` on `127.0.0.1:7781`, a sidecar is already running.
- Check owner with:

```bash
ss -ltnp | rg 7781
```

## Step 3: Configure Maestro

Set the following settings:

```json
{
  "arqon_tts_provider": "kokoro",
  "arqon_tts_kokoro_url": "http://127.0.0.1:7781",
  "arqon_tts_kokoro_voice": "af_heart",
  "arqon_tts_kokoro_timeout_ms": 10000,
  "arqon_tts_kokoro_streaming_enabled": true,
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
npx ts-node test-kokoro-stream-smoke.ts
npx ts-node test-kokoro-failure-smoke.ts
npx ts-node test-kokoro-rollback.ts
```

## Step 5: Rollback Procedure

Immediate rollback:
1. Set `arqon_tts_provider` to `fallback`.
2. Confirm fallback playback works.
3. Keep Kokoro VM running for diagnostics or stop it after incident capture.

## Optional: Persistent Startup (systemd --user)

Use a user service so Kokoro starts automatically after login/reboot.

Service file path:
- `~/.config/systemd/user/kokoro-sidecar.service`

Example unit:

```ini
[Unit]
Description=Kokoro Sidecar (Local Dev)
After=network.target

[Service]
Type=simple
Environment=PYTHONPATH=/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/scripts
ExecStart=/home/irbsurfer/miniconda3/envs/helios-gpu-118/bin/python -m uvicorn kokoro_sidecar:app --host 127.0.0.1 --port 7781
Restart=always
RestartSec=2

[Install]
WantedBy=default.target
```

Enable:

```bash
systemctl --user daemon-reload
systemctl --user enable --now kokoro-sidecar.service
systemctl --user status kokoro-sidecar.service
```

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
