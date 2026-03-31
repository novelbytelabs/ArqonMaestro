# LIVE_HANDOFF_README

## Goal
Small runnable handoff slice for wiring a **live partial trace + H2.3 adjudication harness** on command lane with Parakeet.

## Required runtime environment
- Linux workstation (PulseAudio source configured)
- Conda env: `helios-gpu-118`
- Node: `18.x`
- Python available in sidecar env (`nemo`, `torch`)

## Current live entry command
From repo root:

```bash
cd maestro
./scripts/run_client.sh
```

Parakeet sidecar lifecycle:

```bash
cd maestro/client/src/main/stt/sidecars
./sidecar_manager.sh start parakeet
./sidecar_manager.sh warmup parakeet
```

## Where partials are emitted
- Command-lane stream partial callback:
  - `maestro/client/src/main/stt/parakeet-command-fast-provider.ts`
  - `createStream(..., onPartial)` and websocket `message` handler
- Envelope contracts for partial/final:
  - `maestro/client/src/main/stt/envelopes.ts`
- Stream orchestration:
  - `maestro/client/src/main/stream/chunk-manager.ts`
  - `maestro/client/src/main/stream/stream.ts`

## Where to hook H2.3 policy
Recommended insertion points:
- Before command execution dispatch in:
  - `maestro/client/src/main/execute/executor.ts`
- Runtime command normalization/dispatch boundary:
  - `maestro/client/src/main/runtime/runtime-command-dispatcher.ts`
  - `maestro/client/src/main/runtime/runtime-command-emitter.ts`

## File currently deciding execution authority
- `maestro/client/src/main/execute/executor.ts`
  - authorization checks, policy mode, risk, trust-state gating
- Supporting authority/policy services:
  - `maestro/client/src/main/runtime/authorization-service.ts`
  - `maestro/client/src/main/runtime/security-session-policy-service.ts`
  - `maestro/client/src/main/runtime/focus-authority-service.ts`

## File currently emitting evidence
- `maestro/client/src/main/runtime/execution-trace.ts`
- `maestro/client/src/main/execute/executor.ts` (authorization/evidence logging integration)
- `maestro/client/src/main/runtime/nexus-protocol-boundary-service.ts` (boundary/evidence serialization hooks)
