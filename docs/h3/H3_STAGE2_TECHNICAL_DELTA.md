# H3 Stage 2 Technical Delta

## Core Additions
- `maestro/client/src/main/runtime/h3-geometric-command-governor.ts`
- `maestro/client/src/main/stream/geometric-routing-service.ts`
- `maestro/client/src/main/runtime/h3-runtime-evidence.ts`
- `maestro/client/src/main/runtime/h3-proof-replay.ts`

## Integration Changes
- `maestro/client/src/main/stream/chunk-manager.ts`
  - geometric event intake
  - route activation evidence
  - parameterized tail capture/decode/merge path evidence
  - runtime dedupe/cleanup hardening
- `maestro/client/src/main/stt/parakeet-command-fast-provider.ts`
  - geometric_event reception/evidence emission
  - duplicate-event suppression in sidecar stream callbacks
- `maestro/client/src/main/stt/sidecars/parakeet_sidecar.py`
  - geometric_event emission from spectral/manifold detector
  - sidecar evidence emission
- `maestro/client/src/main/runtime/h23-live-trace-recorder.ts`
  - `h23_trace_written` evidence event
- `maestro/client/src/main/runtime/h24-policy-proof-recorder.ts`
  - `h24_proof_written` evidence event (instrumentation only)

## What Did Not Change
- No Stage 3 feature expansion.
- No intended change to core policy decision logic behavior.
