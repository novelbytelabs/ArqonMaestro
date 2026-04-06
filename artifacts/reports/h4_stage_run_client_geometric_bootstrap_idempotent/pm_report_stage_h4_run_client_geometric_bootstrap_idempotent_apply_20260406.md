# PM AI Final Report - run_client geometric bootstrap + idempotent sidecar start

## Stage
- Stage: `H4 run_client geometric bootstrap idempotent`
- Date: `2026-04-06`
- Repo: `ArqonMaestro`
- Branch: `feature/h4`
- Baseline at start: `c3fd1b5`

## Goal
- Ensure `maestro/scripts/run_client.sh` brings up geometric sidecar automatically for local endpoint.
- Ensure sidecar start path is idempotent (safe to call repeatedly when already running/ready).

## Files Updated
- `maestro/scripts/run_client.sh`
- `maestro/client/src/main/stt/sidecars/sidecar_manager.sh`

## Implemented Changes
- `run_client.sh`
  - Added `ensure_geometric_sidecar_ready()`.
  - For `streaming_endpoint=local`, script now:
    1. checks `http://127.0.0.1:5003/ready`
    2. if not ready, runs `sidecar_manager.sh start geometric` (idempotent path)
    3. re-checks readiness and fails loudly if still not ready.
  - Added env bypass switch:
    - `MAESTRO_SKIP_GEOMETRIC_SIDECAR_PREFLIGHT=1`
  - Existing Parakeet preflight remains in place.

- `sidecar_manager.sh`
  - Added helpers:
    - `is_port_listening(port)`
    - `get_listening_pid(port)`
  - Updated geometric `start` behavior to be idempotent:
    - If `/ready` already passes, returns success immediately and refreshes PID file.
    - If PID file exists but readiness fails, retries warmup; if still failing, restarts.
    - If port is occupied but readiness fails, exits with explicit error (no silent success).
  - Reused `is_port_listening` in preflight/start checks.

## Validation
- `bash -n maestro/scripts/run_client.sh`: PASS
- `bash -n maestro/client/src/main/stt/sidecars/sidecar_manager.sh`: PASS
- `sidecar_manager.sh start geometric` first call: PASS
- `sidecar_manager.sh start geometric` second call (idempotency check): PASS
- `ss -ltnp | rg ':5003'`: PASS
- `curl -s http://127.0.0.1:5003/ready`: PASS

## Full stdout/stderr artifacts
- Directory: `artifacts/reports/h4_stage_run_client_geometric_bootstrap_idempotent/logs/`
- Files:
  - `01_bash_n_run_client.stdout.txt`
  - `01_bash_n_run_client.stderr.txt`
  - `02_bash_n_sidecar_manager.stdout.txt`
  - `02_bash_n_sidecar_manager.stderr.txt`
  - `03_start_geometric_first.stdout.txt`
  - `03_start_geometric_first.stderr.txt`
  - `04_start_geometric_second.stdout.txt`
  - `04_start_geometric_second.stderr.txt`
  - `05_ss_5003.stdout.txt`
  - `05_ss_5003.stderr.txt`
  - `06_ready_5003.stdout.txt`
  - `06_ready_5003.stderr.txt`

## Outcome
- Running `maestro/scripts/run_client.sh` now includes geometric sidecar readiness bootstrap for local mode.
- Geometric sidecar start path is idempotent and no longer fails just because it is already running/ready.
