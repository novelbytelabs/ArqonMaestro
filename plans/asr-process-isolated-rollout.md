# ASR Process-Isolated Rollout Constitution (PM Handoff)

**Date:** 2026-03-23
**Status:** Active replacement plan for Stage 2 execution

## 0) Scope Decision

Current Stage 2 assumptions (single shared runtime) are superseded for execution.

Reason:
- `protobuf==4.25.8` is a hard constraint for core environment governance.
- Native ASR stack (`nemo-toolkit` + `vllm[audio]`) forces `protobuf 5.x` in shared env.
- Shared env strategy is unstable under this constraint.

Decision:
- Use **process isolation** for modern ASR runtime(s).
- Keep Maestro core env pinned and stable.

## 1) Source of Truth

- `plans/asr-model-migration.md`
- `plans/asr-process-isolated-rollout.md` (this document)
- `docs/maestro_minimax_project_manager_handoff.md`
- `docs/vos/maestro-project-roadmap.md`
- `docs/vos/maestro-implementation-progress.md`
- `docs/vos/maestro-watchdog-audit-log.md`

Core code paths:
- `maestro/client/src/main/stream/chunk-manager.ts`
- `maestro/client/src/main/stt/tracking.ts`
- `maestro/client/src/main/settings.ts`
- `maestro/client/src/main/events.ts`
- `maestro/client/src/main/app.ts`

## 2) Architecture Target

Maestro main process remains on pinned core env.
ASR runs as sidecar service(s), accessed via strict bridge contract:
- command lane: Parakeet sidecar
- dictation lane: Qwen3 via vLLM-compatible service

Bridge contract:
- request: audio payload + lane + model/mode metadata
- response success: strict JSON with transcript + latency metadata
- response failure: strict JSON with stable error code + retryability

## 3) Stage Breakdown (Replacement Stage 2)

### Stage 2A - Service Contract + Routing Cut

Deliverables:
- finalize sidecar request/response schema
- implement bridge client wrappers in main process
- route command/dictation local providers to service endpoints
- preserve legacy fallback paths

DoD:
- local sidecar mock/stub service passes integration routing tests
- `chunk-manager` lifecycle hooks remain clean (no state leaks)
- telemetry keys emitted through `stt/tracking.ts`

### Stage 2B - Bootstrap / Install / Runtime Management

Deliverables:
- sidecar bootstrap script(s) and runtime preflight checks
- explicit non-frozen install boundary (outside core pinned env)
- startup/health probing and actionable error messages

DoD:
- user can install/start sidecar runtime with deterministic steps
- Maestro detects service availability before route selection

### Stage 2C - Recovery UX + Reliability Policy

Deliverables:
- timeout/retry/replay policies for service failures
- 503 behavior handling for long dictation chunk finalize
- visible non-blocking UI status for degraded/recovering ASR

DoD:
- fallback behavior deterministic and tested
- listening session remains stable during sidecar failures

### Stage 2D - Regression + Hard-Close Evidence

Deliverables:
- evidence script covering build + ASR unit/integration + regression matrix
- REPORT bundle artifacts and watchdog-auditable manifest

DoD:
- watchdog GREEN
- PM hard-close approval

## 4) Non-Negotiable Constraints

- No environment mutation in core pinned env during implementation stages.
- No hidden install scripts running in background.
- No self-awarded acceptance by Minimax.
- Mandatory technical debt audit before each REPORT.
- PM-only hard-close.

## 5) Watchdog Gate Policy (for this rollout)

Watchdog must return RED if any of the following happen:
- in-stage mutation of core pinned env package stack
- claim/evidence mismatch
- placeholders/shims in production path
- missing failure-matrix tests for sidecar outage/503 handling
- REPORT without freeze-state evidence

## 6) First Execution Packet to Start Now

Start with **Stage 2A only**.

Required from Minimax in MODE: REPORT:
- commit hash
- files changed
- commands run
- raw test/build outputs
- technical debt audit output
- unresolved risks

Success criterion to hand to PM:
- watchdog GREEN on Stage 2A packet
- no env mutation violations
