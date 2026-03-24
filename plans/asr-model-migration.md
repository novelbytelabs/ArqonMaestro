# ASR Model Migration Execution Constitution (Command Control Pivot + Qwen3)

**Date:** 2026-03-23
**Status:** PM-approved working constitution for Minimax Stage Execution
**Environment (Frozen):**
- Node 20 only (`source ~/.nvm/nvm.sh && nvm use 20`)
- Python only via `conda run -n helios-gpu-118`
- No new Rust / Protobuf / Protoc installs
- **[GOVERNANCE RULE]**: No runtime install scripts may be executed in frozen stages unless PM explicitly declares UNFREEZE.

---

## Direction Update (2026-03-23) - Command Lane Pivot

This constitution is superseded for command-lane architecture details by VOS-041.

Updated command-lane target:
- customization-first command STT
- modern CTC acoustic model (`Conformer-CTC` / `Parakeet-CTC` class)
- constrained decoding (`WFST` / Flashlight / equivalent)
- custom lexicon, pronunciation, and command vocabulary controls
- Maestro grammar/parser enforcement with deterministic command rejection

Unchanged lane separation:
- dictation lane remains `Qwen3-ASR` accuracy-first

Important scope correction:
- `Parakeet-TDT` is not the command-lane end-state architecture.
- Whisper-family may remain optional general ASR fallback, but is not the preferred command-control fallback.


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

- **VOS-035 (superseded by VOS-041 for command lane):** Pure Parakeet-TDT command-lane target is no longer authoritative.
- **VOS-036:** Qwen3-ASR dual mode: `local` and `vllm_service` (real HTTP path, no production shim).
- **VOS-037:** Legacy engines may remain available as optional general fallbacks, but command-control fallback must preserve constrained decoding behavior.
- **VOS-038:** Parallel routing state maps allowed, but only if all lifecycle touchpoints are updated.

---

## 3. Stage 1 - Python Bridge Contracts

**Risk:** Medium | **Difficulty:** Medium
**Objective**: Create the pure Python inference bridges that the TS providers will wrap. No placeholder logic.

#### Native Runtime Strategy (The Holy Grail)
- **Parakeet (Command):** Dedicated runtime via `nemo_toolkit['asr']` in a standalone `.venv-parakeet`.
- **Qwen3-ASR (Dictation):** Dedicated runtime via `vllm[audio]` in a standalone `.venv-qwenasr`.

#### Tasks:
1. Create `src/main/stt/parakeet_bridge.py`.
   - Arguments: `--audio <wav_file>`, `--model-path <path>`, `--device <cpu|cuda>`
   - Implementation: Use `nemo.collections.asr` to load and transcribe. No generic wrappers.
2. Create `src/main/stt/qwen3_asr_bridge.py`.
   - Arguments: `--audio <wav_file>`, `--model-path <path>`, `--mode <local|vllm_service>`, `--endpoint <vllm_url>`
   - Implementation (`vllm_service`): Real `urllib.request` targeting OpenAI-compatible `/v1/audio/transcriptions`.

### Audio Contract (mandatory parity)
- Input WAV must be: mono, PCM16 LE, 16 kHz, 16-bit.
- Preprocessing normalization: `float32 = int16 / 32768.0`, clamp `[-1, 1]`.
- No extra gain normalization in bridge.

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

## 4. Stage 2 - Process-Isolated ASR Rollout

**Risk:** High | **Difficulty:** High
**Objective**: Replace in-env provider integration with a process-isolated sidecar architecture to resolve protobuf/dependency conflicts.

### Stage 2A: Service Contracts + Bridge Routing
- Define `Provider` interface adjustments to target isolated sidecar ports instead of local `exec()` Python calls.
- Implement `ParakeetCommandFastProvider` targeting Parakeet sidecar proxy.
- Implement `Qwen3AsrDictationProvider` targeting Qwen3 sidecar proxy.
- **Performance constraints (Hot-path):**
  - No hot-path temp files (in-memory PCM16 payloads end-to-end).
  - Persistent connections (UDS preferred or long-lived localhost, no per-chunk reconnects).
  - Early partials support (Command lane must support low-latency partial transcripts).
  - Latency Guardrails: explicit p50/p95 metric tracking for end-to-first-text and end-to-final.
- Unit testing with strict JSON mocking.

### Stage 2B: Installer/Bootstrap for Sidecar Runtimes
- Create installation and orchestration scripts for the sidecars outside of `helios-gpu-118`.
- Define lifecycle management (start, stop, port binding, zombie process reaping).
- **Architecture constraint:** Sidecar must be persistent (models preloaded). No per-request model loading.
- Ensure models download to isolated storage paths.

### Stage 2C: Health Checks, Retry/Fallback UX, Watchdog Policy Gates
- Implement heartbeat and health-check pooling for sidecars.
- Failure Matrix (mandatory): 
  - Subprocess crash -> structured failure -> fallback path.
  - vLLM 503 -> `endpoint_503` recovery, replay buffered audio, finalize. 
- UI recovery: Keep chunk routing intact, do not auto-stop listening.

### Stage 2D: Regression + Hard-Close Evidence
- End-to-end regression matrix (Command success/failure, Dictation success/failure, Legacy tests).
- Generate execution evidence summary.
- Produce `asr_migration_hard_close_pack.zip`.

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
- Command fallback replay integrity is complete in Stage 2 execution and must remain regression-tested in Stage 2D/2E.
- Failure matrix includes 503 dictation recovery behavior.
- Metrics target `stt/tracking.ts` naming conventions.
- PM supplies stage constitution + specs + source-of-truth file list in each kickoff.


## 9. Stage Count Clarification

- Active ASR migration execution is Stage 1 + Stage 2A/2B/2C/2D/2E.
- There is no required Stage 3 in this constitution for hard-close readiness.
- Any Stage 3 optimization track is optional and must be separately authorized after Stage 2E hard-close.
