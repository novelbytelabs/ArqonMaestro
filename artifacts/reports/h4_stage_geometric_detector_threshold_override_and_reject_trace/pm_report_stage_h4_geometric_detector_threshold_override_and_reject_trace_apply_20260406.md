# PM AI Final Report - H4 geometric detector threshold override + rejection trace

## Stage
- Stage: `H4 geometric detector threshold override and reject trace`
- Date: `2026-04-06`
- Repo: `ArqonMaestro`
- Branch: `feature/h4`
- Baseline at start: `a6ded3e`

## Goal
- Fix detector behavior where `MAESTRO_H3_GEOMETRIC_ACTIVATION_THRESHOLD_OVERRIDE` was ignored.
- Add explicit rejection tracing so live failures explain *why* no geometric region was produced.

## File Updated
- `maestro/client/src/main/stt/sidecars/h3_geometric_runtime.py`

## Implemented Changes
- Added `self.trace_rejections` controlled by env:
  - `MAESTRO_H3_GEOMETRIC_TRACE_REJECTIONS=1`
- Added `_activation_threshold_for(meta)`:
  - now applies `MAESTRO_H3_GEOMETRIC_ACTIVATION_THRESHOLD_OVERRIDE` when valid.
  - falls back to atlas per-command threshold if override missing/invalid.
- Added `_trace_reject(reason, **fields)` logging:
  - emits `[H3_GEOMETRIC_REJECT] { ... }` with structured fields.
- Added reject traces for key drop conditions:
  - detector not ready
  - invalid/empty audio
  - empty signature
  - bootstrap validated-region suppression
  - insufficient frames
  - confidence below activation threshold

## Validation
- `python3 -m py_compile .../h3_geometric_runtime.py`: PASS
- `sidecar_manager.sh restart geometric`: PASS
- `curl http://127.0.0.1:5003/ready`: PASS (`status=ready`)

## Full stdout/stderr artifacts
- Directory: `artifacts/reports/h4_stage_geometric_detector_threshold_override_and_reject_trace/logs/`
- Files:
  - `01_py_compile.stdout.txt`
  - `01_py_compile.stderr.txt`
  - `02_restart_geometric.stdout.txt`
  - `02_restart_geometric.stderr.txt`
  - `03_ready_check.stdout.txt`
  - `03_ready_check.stderr.txt`
  - `04_geometric_sidecar_log_tail.stdout.txt`
  - `04_geometric_sidecar_log_tail.stderr.txt`

## Outcome
- Activation-threshold override now affects geometric detector decisions.
- Reject reasons are now explicit in logs, enabling precise diagnosis when geometric path returns no region.
