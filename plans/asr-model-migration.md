# ASR Model Migration Execution Constitution (Parakeet + Qwen3)

**Date:** 2026-03-23
**Status:** PM-approved working constitution for Minimax Stage Execution
**Environment (Frozen):**
- Node 20 only (`source ~/.nvm/nvm.sh && nvm use 20`)
- Python only via `conda run -n helios-gpu-118`
- No new Rust / Protobuf / Protoc installs

---

## 0. Source of Truth and Context Files

Canonical references for this migration:
- `plans/asr-model-migration.md` (this execution constitution)
- `docs/maestro_minimax_project_manager_handoff.md` (PM governance + mode rules)
- `docs/vos/maestro-project-roadmap.md` (phase authority)
- `maestro/client/src/main/stream/chunk-manager.ts` (hot-path routing/lifecycle)
- `maestro/client/src/main/settings.ts` (system key contracts)
- `maestro/client/src/main/events.ts` (settings IPC update path)
- `maestro/client/src/main/app.ts` (`sendAllSettings` state propagation)
- `maestro/client/src/main/stt/tracking.ts` (metric emission target)
- `maestro/client/src/main/stt/whisper-command-fast-provider.ts` (command lane legacy parity)
- `maestro/client/src/main/stt/faster-whisper-dictation-provider.ts` + `faster_whisper_bridge.py` (dictation lane legacy parity)
- `maestro/client/src/main/audio/index.ts` + `stream/microphone.ts` (audio contract)

Governance rule: if this plan conflicts with roadmap sequencing, roadmap wins.

---

## 1. Critical Integration Risks (Reasoning: High)

1. **Command fallback audio-loss risk (must fix):**
   Current command-fast fallback path can finalize endpoint without replaying buffered local audio.
2. **Chunk state lifecycle coupling risk:**
   `chunkUse*` maps/sets are touched in send/finalize/start/cleanup/reset hooks; partial edits create stale/duplicate state.
3. **Settings propagation risk:**
   adding keys in `settings.ts` alone does not expose/update UI or runtime state without `events.ts` + `sendAllSettings` wiring.
4. **Telemetry wiring risk:**
   there is no `runtime/metric-service.ts`; emission must target `stt/tracking.ts`.
5. **Legacy behavior parity risk:**
   command prompt/language bias and dictation compute/language/timeout behavior can silently regress quality if omitted.

---

## 2. Architectural Decisions

- **VOS-035:** Parakeet integration via Python bridge (`parakeet_bridge.py`) only.
- **VOS-036:** Qwen3-ASR dual mode: `local` and `vllm_service` (real HTTP path, no production shim).
- **VOS-037:** Legacy whisper/faster-whisper remain available via manual engine selection.
- **VOS-038:** Parallel routing state maps allowed, but only if all lifecycle touchpoints are updated.

---

## 3. Stage 1 - Python Bridge Contracts

### Objective
Implement real Python bridges with strict audio/JSON contracts and bounded failure behavior.

### Audio Contract (mandatory parity)
- Input WAV must be: mono, PCM16 LE, 16 kHz, 16-bit.
- Preprocessing normalization: `float32 = int16 / 32768.0`, clamp `[-1, 1]`.
- No extra gain normalization in bridge.

### Deliverables
1. `src/main/stt/parakeet_bridge.py`
2. `src/main/stt/qwen3_asr_bridge.py`

### Bridge response schema
- Success: `{"ok": true, "text": "...", "model": "...", "device": "..."}`
- Failure: `{"ok": false, "error": "<stable_code>", "retryable": true|false}`

Stable error codes (required):
- `empty_audio`
- `audio_format_invalid`
- `model_load_failed`
- `inference_failed`
- `timeout`
- `endpoint_503`
- `connection_refused`
- `json_output_invalid`

### Stage 1 DoD
- Bridges run in `helios-gpu-118` against fixture audio.
- Down endpoint path returns structured error (no hang).
- All outputs are strict single-object JSON.

---

## 4. Stage 2 - TypeScript Providers + Adversarial Matrix

### Objective
Implement providers with legacy parity where needed and explicit adversarial behavior.

### Deliverables
1. `src/main/stt/parakeet-command-fast-provider.ts`
2. `src/main/stt/qwen3-asr-dictation-provider.ts`
3. Tests:
   - `src/test/audio/parakeet-command-fast-provider.unit.spec.ts`
   - `src/test/audio/qwen3-asr-dictation-provider.unit.spec.ts`

### Legacy parity requirements
- Command lane: preserve biasing behavior equivalent to whisper command prompt/language assumptions.
- Dictation lane: preserve explicit timeout/device/model/language configurability.

### Failure Matrix (mandatory)
- Invalid python path -> provider unavailable error -> fallback path -> listening remains active.
- Exit code 1 / malformed JSON -> mapped structured failure -> fallback path.
- 0-byte audio -> no bridge spawn; short-circuit.
- Timeout -> failure metric + fallback.
- **vLLM 503 during 30s dictation finalize** -> `endpoint_503`, replay buffered audio to endpoint, finalize once.

### UI Recovery for 503
- Do not auto-stop listening.
- Keep chunk/session flow intact.
- Optional transient status if recovery exceeds 1500ms.

### Stage 2 DoD
- Jest target passes for parakeet/qwen3 provider tests.
- All matrix scenarios have explicit assertions.

---

## 5. Stage 3 - Settings + Chunk Routing

### Objective
Integrate new engines without breaking existing whisper/faster-whisper lanes.

### System keys (use Arqon-prefixed naming)
- `arqon_asr_command_fast_engine`: `parakeet | whisper`
- `arqon_asr_dictation_engine`: `qwen3_asr | faster_whisper`
- `arqon_asr_parakeet_python_path`
- `arqon_asr_parakeet_model_path`
- `arqon_asr_parakeet_device`
- `arqon_asr_qwen3_python_path`
- `arqon_asr_qwen3_model_path`
- `arqon_asr_qwen3_mode`: `local | vllm_service`
- `arqon_asr_qwen3_vllm_endpoint`
- `arqon_asr_qwen3_timeout_ms`

### Required settings plumbing
If user/manual control is expected, wire both:
- `events.ts` `setSettings` handlers
- `app.ts` `sendAllSettings` state exposure

### Required lifecycle hook coverage in `chunk-manager.ts`
Any new map strategy must update all of:
1. map/set declarations
2. `send()` audio suppression branch
3. `send()` endpoint finalize branch
4. finalize handlers
5. `onCommandsResponse(final)` cleanup
6. `onChunkStart()` setup
7. `resetListeningBuffers()` teardown

### Mandatory fallback correction
Command lane local failure must replay buffered audio before endpoint finalize, matching dictation fallback semantics.

### Telemetry hierarchy (tracking.ts)
- `stt.command_fast.parakeet.success`
- `stt.command_fast.parakeet.failure`
- `stt.command_fast.parakeet.timeout`
- `stt.dictation.qwen3_asr.success`
- `stt.dictation.qwen3_asr.failure`
- `stt.dictation.qwen3_asr.endpoint_503`

Payload fields:
- `chunk_id`, `latency_ms`, `transcript_chars`, `model`, `device`, `mode`, `reason`, `fallback`

### Stage 3 DoD
- Engine selection works deterministically per chunk.
- Legacy engine routing unchanged when selected.
- No chunk state leaks across stop/start/reset.

---

## 6. Stage 4 - Regression, Evidence, Hard-Close

### Objective
Produce hard-close proof pack in frozen environment.

### Required test matrix
1. command/parakeet success
2. command/parakeet forced failure -> endpoint fallback with replay
3. dictation/qwen3 local success
4. dictation/qwen3 vLLM 503 -> endpoint fallback with replay
5. legacy whisper command path intact
6. legacy faster-whisper dictation path intact
7. stop/start listening resets state safely

### Evidence script
Create `generate_asr_migration_evidence.sh` that:
- enforces Node 20
- runs targeted lint/test commands
- emits machine-readable pass/fail summary

### Required artifacts
- `TEST_RESULTS.txt`
- `REGRESSION_NOTES.txt`
- `PRODUCTION_PATH.txt`
- `IMPLEMENTATION_NOTES.txt`
- `MANIFEST.txt` (commit hash + freeze-state declaration)

---

## 7. Minimax Execution Protocol for This Plan

For each stage:
1. `MODE: IMPLEMENT`
2. Implement stage scope only
3. Run **honest technical debt audit**
4. Perform one bounded cleanup pass
5. `MODE: REPORT — FREEZE STATE` with commit-before-claim evidence
6. PM audits and either hard-closes or issues next scoped stage

Constraints:
- No shims/placeholders in production path.
- No destructive test weakening without explicit PM approval.
- Model cannot self-award acceptance.

---

## 8. Stage Readiness Gate (Go/No-Go)

This migration is ready for Minimax **only if** all are true:
- Command fallback replay fix is in scope from Stage 3 start.
- Failure matrix includes 503 dictation recovery behavior.
- Metrics target `stt/tracking.ts` naming conventions.
- PM supplies stage constitution + specs + source-of-truth file list in each kickoff.
