# ASR Stage 2B Restart Packet (PM + Minimax + Watchdog)

Date: 2026-03-23
Status: Ready to execute

> Historical context notice (2026-03-24): This packet is a Stage 2B execution artifact from the pre-`VOS-042` lock period. Use `docs/vos/maestro-decision-log.md` (`VOS-041`, `VOS-042`) and `docs/vos/maestro-stt-strategy-by-lane.md` as authoritative for current command-lane architecture. References here to Whisper-family degraded fallback are historical operational guidance, not command-lane foundation doctrine.

## Why this restart is required
- Stage 2B was blocked by Watchdog RED due to core env mutation risk.
- Sidecar launch path previously referenced frozen env `helios-gpu-118`.
- Frozen env is now restored to `protobuf==4.25.8` and ASR-native packages are removed.

## Verified technical state
- `maestro/client/src/main/stt/sidecars/sidecar_manager.sh` now defaults to isolated env via `ASR_SIDECAR_ENV` (default `helios-asr-isolated`).
- Sidecar manager no longer hardcodes `helios-gpu-118` for Parakeet/Qwen3 launch.
- Sidecar manager now includes model-path fallback resolution:
  - primary: `~/models/arqon/asr/...`
  - fallback: `~/models/...`
- Frozen env package state:
  - `protobuf==4.25.8`
  - no `nemo-toolkit`
  - no `vllm`
  - no `qwen-asr`

## Execution constitution links
- `plans/asr-model-migration.md`
- `plans/asr-process-isolated-rollout.md`
- `docs/maestro_minimax_project_manager_handoff.md`
- `docs/vos/maestro-watchdog-audit-log.md`
- `docs/vos/maestro-implementation-progress.md`

## Performance priorities for Stage 2B/2C
- Keep sidecars hot (persistent processes; no per-request process spawn).
- Warm model load at startup and expose readiness endpoint before route cut.
- Use local loopback HTTP with short payload copies and strict timeouts.
- Add startup preflight that fails fast instead of runtime thrash.
- Preserve legacy fallback path for tail-latency spikes or sidecar outage.

## PM -> Minimax instruction block (copy/paste)

```text
MODE: IMPLEMENT
STAGE: 2B (Bootstrap / Install / Runtime Management)

Hard constraints:
1) Do NOT mutate frozen env `helios-gpu-118`.
2) All native ASR deps (nemo/vllm/qwen-asr/protobuf5) must live only in isolated env `helios-asr-isolated`.
3) No shims/placeholders in production path.
4) No self-awarded acceptance.

Performance constraints (must preserve low latency):
1) No per-request interpreter/model startup; sidecars must stay resident.
2) Add readiness/warmup so first user utterance is not a cold-start penalty.
3) Keep fallback to whisper.cpp/faster-whisper routes for degraded mode.

Start from current code and complete these deliverables:
A) Finalize sidecar runtime bootstrap scripts to create/use `helios-asr-isolated`.
B) Add deterministic preflight checks (CUDA visibility, python import checks, model path checks, endpoint bind checks).
C) Ensure `sidecar_manager.sh` + any related launch scripts always target isolated env and provide actionable error output.
D) Produce installer docs for users with explicit separation:
   - core Maestro runtime in `helios-gpu-118`
   - ASR sidecar runtime in `helios-asr-isolated`
E) Add verification command set and evidence outputs for Watchdog.

Required evidence in REPORT:
- commit hash
- exact files changed
- commands run
- raw command outputs
- technical debt audit (honest, blocking + non-blocking)
- explicit statement: frozen env unchanged

Watchdog gates:
- RED if any command references `conda run -n helios-gpu-118` for sidecar runtime
- RED if install scripts write ASR deps into frozen env
- RED on claim/evidence mismatch
```

## PM -> Watchdog instruction block (copy/paste)

```text
Audit scope: Stage 2B only.

Return RED if:
1) Any sidecar launch/install path mutates or depends on `helios-gpu-118` for ASR-native runtime.
2) Minimax evidence omits raw outputs for install/preflight/health checks.
3) Technical debt audit is missing or non-specific.
4) Placeholder/shim architecture appears in sidecar path.

Return GREEN only if:
- isolated env strategy is implemented and evidenced
- frozen env remains protobuf 4.25.8 and ASR-native packages absent
- sidecar startup + health checks are deterministic and documented
```
