# Maestro ASR Command-Lane Pivot Resume Plan (2026-03-23)

## Purpose
This is the restart plan for tomorrow's execution.
It captures the architecture pivot, what work is salvageable, what must change, and how PM/Minimax/Watchdog should execute with minimal ambiguity.

## Decision Summary (Authoritative)
- Command lane is no longer Parakeet-TDT/Whisper-baseline.
- Command lane is now customization-first:
  - modern CTC acoustic front end (`Conformer-CTC` / `Parakeet-CTC` class)
  - constrained decoding (`WFST` / Flashlight / equivalent)
  - custom lexicon/pronunciation + command vocabulary
  - Maestro grammar/parser with deterministic rejection
- Dictation lane remains `Qwen3-ASR` (accuracy-first).

Primary decision reference:
- `docs/vos/maestro-decision-log.md` (`VOS-041`)

## Current State Snapshot
- Stage 1 + Stage 2A/2B/2C hardening work produced reusable infrastructure:
  - process isolation model
  - sidecar lifecycle scripts
  - routing/fallback scaffolding
  - PM/Watchdog governance loop
- Prior command-lane Parakeet-TDT target is superseded by decision.
- Core docs/specs were updated to reflect the pivot.

## What We Keep (Salvage)
1. Dictation lane (`Qwen3-ASR`) and associated runtime path.
2. Sidecar process-isolation pattern (`helios-asr-isolated`, lifecycle management).
3. Settings/routing/telemetry scaffolding in main process.
4. PM/Minimax/Watchdog discipline and evidence gates.

## What Changes
1. Command-lane backend target and acceptance criteria.
2. Command fallback philosophy:
- Whisper-family is optional general ASR fallback, not control-equivalent fallback.
- Control-oriented fallback must preserve constrained decoding behavior.
3. Test matrix must include grammar/lexicon/pronunciation/rejection behavior, not just transcription outcomes.

## Source-of-Truth Documents (Must Read First)
1. `docs/vos/maestro-decision-log.md` (VOS-040 superseded for command lane; VOS-041 accepted)
2. `docs/vos/maestro-project-roadmap.md`
3. `docs/vos/maestro-stt-strategy-by-lane.md`
4. `docs/vos/ultimate-vos-reference-architecture.md`
5. `docs/vos/maestro-voice-component-migration-matrix.md`
6. `docs/maestro_minimax_project_manager_handoff.md`
7. `plans/asr-model-migration.md` (contains supersession note)
8. `plans/asr-process-isolated-rollout.md` (current stage packet model)
9. `docs/vos/maestro-asr-command-lane-pivot-impact.md` (impact + follow-up checklist)
10. `plans/asr-stage1-2abc-hard-close-audit.md` (historical technical snapshot)

## Critical Scripts and Runtime Artifacts
- `maestro/client/src/main/stt/sidecars/sidecar_manager.sh`
- `maestro/client/src/main/stt/sidecars/setup_isolated_env.sh`
- `maestro/client/src/main/stt/sidecars/download_models.sh`
- `maestro/client/src/main/stt/sidecars/parakeet_sidecar.py`
- `maestro/client/src/main/stt/sidecars/qwen3_sidecar.py`
- `maestro/client/src/main/stt/sidecar-health.ts`
- `maestro/client/src/main/stream/chunk-manager.ts`
- `maestro/client/src/main/stt/tracking.ts`

## Execution Plan (Tomorrow)

### R0 - Governance and Scope Lock (PM)
- Declare stage scope: **Command-Lane Pivot Implementation Slice 1**.
- Explicitly mark out-of-scope:
  - unrelated architecture upgrades
  - Stage 3 optimization tracks
  - core env mutation
- MODE policy:
  - `MODE: IMPLEMENT` for coding
  - `MODE: REPORT — FREEZE STATE` for evidence only

### R1 - Command Lane Contract Spec (Minimax)
Deliverables:
- explicit command-lane contract doc (inputs, outputs, error codes, confidence/rejection semantics)
- grammar/lexicon/pronunciation control interfaces
- constrained decoder contract (WFST/Flashlight class)

DoD:
- PM approves contract before backend implementation continues.

### R2 - Backend Adapter Skeleton (Minimax)
Deliverables:
- command-sidecar adapter interface matching new contract
- placeholder-free constrained-decoding invocation path (real integration seams, no shims)
- integration into existing sidecar process boundary

DoD:
- no fake success path
- deterministic structured failures
- no core env mutation

### R3 - Runtime Routing Integration (Minimax)
Deliverables:
- `chunk-manager` command lane route switches to new command provider abstraction
- fallback chain updated to preserve control-oriented behavior
- dictation lane remains Qwen3 and functionally isolated

DoD:
- route clarity and fallback determinism documented + tested.

### R4 - Verification + Hard-Close Packet (Minimax + Watchdog + PM)
Required evidence:
- commit hash, changed files, commands run, raw output
- honest technical debt audit
- command-lane behavior tests:
  - in-grammar accept
  - out-of-grammar deterministic reject
  - custom vocabulary behavior
  - custom pronunciation behavior
  - fallback behavior preserving control guarantees
- watchdog verdict GREEN
- PM hard-close statement

## PM/Watchdog Policy Additions (Command Pivot Specific)
Watchdog should return RED if:
1. command-lane claims rely only on generic ASR metrics (no control behavior evidence)
2. placeholder/shim constrained-decoding path is used
3. command fallback is treated as control-equivalent without constrained behavior proof
4. REPORT evidence omits grammar/rejection tests

## Gotchas (Relevant)
1. Frozen environment policy remains active.
- Do not install/upgrade core env packages during stage execution.
- Use isolated runtime boundary for sidecars.

2. Historical doc drift risk.
- Several historical logs/audit docs contain pre-pivot assumptions; treat decision log + roadmap + strategy docs as authoritative.

3. "Looks complete" trap.
- Command lane can appear to work via transcription while still failing control guarantees.
- Require deterministic rejection and grammar-control evidence.

4. Test deception risk.
- Avoid tests that only validate happy-path transcript text.
- Include adversarial out-of-grammar and pronunciation edge cases.

5. Scope creep risk.
- Keep this slice focused on command-lane architecture pivot and integration seam.

## First Packet Template (PM -> Minimax)
- Stage: Command-Lane Pivot Slice 1 (R1-R2)
- MODE: IMPLEMENT
- Required outputs:
  - contract doc patch
  - adapter skeleton code patch
  - tests for structured failures and contract validation
  - technical debt audit
- REPORT format:
  - commit hash
  - files changed
  - commands run
  - raw test outputs
  - unresolved risks

## Success Condition To Resume Broader ASR Program
This pivot slice is complete when:
- command-lane contract is approved and implemented at integration seam,
- dictation lane remains stable on Qwen3,
- watchdog returns GREEN,
- PM issues hard-close.

At that point, proceed to next slice (full constrained decoder + grammar performance and reliability hardening).
