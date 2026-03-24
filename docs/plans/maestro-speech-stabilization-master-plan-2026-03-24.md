# Maestro Speech Stabilization Master Plan (2026-03-24)

## Purpose

This plan defines how Maestro reaches a stable, testable speech baseline after the command-lane architecture correction (`VOS-041` + `VOS-042`).

The objective is to stabilize first, then remove obsolete software, then integrate the required stack deliberately, without mutating frozen environment lanes.

## Direction Lock (Non-Negotiable)

- Maestro speech is lane-split by design.
- Command lane is a control system, not a generic transcription path.
- Dictation lane is a separate text-entry system.
- Command-lane architecture is full-stack:
  - CTC acoustic model
  - constrained decoder (`WFST` / Flashlight / equivalent)
  - lexicon and pronunciation control
  - Maestro grammar/parser enforcement
  - deterministic bounded rejection
- `Parakeet-CTC` is the first command-lane acoustic candidate inside this stack.
- `Qwen3-ASR` remains a dictation-lane candidate subject to local performance/usability validation.

## Environment and Safety Policy

- Frozen env rule: do not install ASR-native dependencies into `helios-gpu-118`.
- ASR-native dependencies must live in isolated sidecar env only (`helios-asr-isolated`).
- Any command/script that targets `helios-gpu-118` for ASR-native installs is an automatic fail.
- Sidecars must be resident and warmed up; no per-request model startup in hot path.

## Phase Plan

## Phase 0 - Freeze, Inventory, and Rollback Baseline

Deliverables:
- Baseline snapshot of git commit, key configs, and sidecar/env state.
- Dependency inventory matrix: keep, replace, deprecate, remove.
- Recovery and rollback instructions verified once end-to-end.

Exit criteria:
- Team can return to known-good baseline in one documented rollback path.
- Inventory owners and removal prerequisites are assigned.

## Phase 1 - Runtime Stability Baseline (No Architecture Swap Yet)

Deliverables:
- Sidecar lifecycle determinism: preflight, start, warmup, health, stop, restart.
- Truthful lane telemetry: explicit lane labels, failure reason classes, fallback signals.
- Stable local runbook for command/dictation lane bring-up and diagnostics.

Exit criteria:
- Sidecar status/health checks are green in isolated env.
- No wrong-env mutation risk remains in active scripts/docs.
- Runtime observability can distinguish lane and failure class without ambiguity.

## Phase 2 - Contract Seams for Command-Control Stack

Deliverables:
- Command-lane runtime contract at integration seam:
  - input envelope
  - constrained decoder output contract
  - reject semantics contract
  - normalization boundaries
- Adapter interfaces for:
  - acoustic provider
  - constrained decoder
  - lexicon/pronunciation service
  - grammar/parser gate

Exit criteria:
- Command-lane path can reject out-of-grammar inputs deterministically by contract.
- Contract tests exist for acceptance and rejection classes.

## Phase 3 - Parakeet-CTC Candidate Integration (Command Lane)

Deliverables:
- `Parakeet-CTC` wired as first acoustic candidate into command-lane contract.
- Constrained decoder path integrated (no placeholder success paths).
- Lexicon/pronunciation control integrated and testable.

Exit criteria:
- Command-lane acceptance gates pass:
  - grammar compatibility
  - deterministic rejection
  - lexicon/pronunciation control behavior
  - bounded output behavior
  - command latency targets

## Phase 4 - Qwen3-ASR Dictation Validation and Hardening

Deliverables:
- Local workstation benchmark and usability evidence for dictation lane.
- Dictation-only tuning, failure handling, and fallback policy.
- Explicit separation proof that dictation decisions do not alter command-lane contracts.

Exit criteria:
- Dictation lane meets usability and latency thresholds on target workstation.
- Dictation and command lanes remain contract-isolated.

## Phase 5 - Controlled Decommission and Cleanup

Deliverables:
- Remove deprecated software paths/scripts/configs no longer needed.
- Remove dead fallback assumptions that conflict with `VOS-042`.
- Final doc reconciliation and migration matrix closure.

Exit criteria:
- Decommission matrix items resolved with owner signoff.
- No active runtime path depends on superseded command-lane foundations.

## Acceptance Gates by Lane

## Command lane (control-first)

Required gates:
- grammar compatibility against command corpus
- deterministic out-of-grammar rejection
- custom vocabulary control behavior
- custom pronunciation control behavior
- bounded output contract and safe normalization
- low-latency command usability under realistic workflow load

Non-sufficient metrics:
- generic WER alone
- generic benchmark rank alone

## Dictation lane (text-first)

Required gates:
- long-form dictation usability
- punctuation and formatting quality
- error-rate and correction burden
- latency and stability on target workstation

Constraint:
- dictation-lane model quality does not define command-lane architecture.

## Cross-Cutting Engineering Chores (Must Track Explicitly)

- stale script and env guardrails
- telemetry completeness and dashboard parity
- integration test reliability
- docs/decision-log sync on every phase closeout
- unresolved backlog triage (`must-do for stability` vs `defer`)

## Risks and Watchdog Red Conditions

Immediate RED if:
- ASR-native install/mutation targets `helios-gpu-118`
- command-lane success claims rely on generic ASR metrics only
- constrained decoder path is placeholder/shimmed
- evidence omits rejection and grammar-control behavior
- lane isolation is violated by integration shortcuts

## Evidence Pack Requirements Per Phase

Every phase closeout report must include:
- commit hash
- files changed
- commands run
- raw outputs
- pass/fail against explicit gate checklist
- unresolved risk list with owners
- rollback statement

## Decision and Documentation Sync

Required sync targets:
- `docs/vos/maestro-decision-log.md`
- `docs/decision-log.md`
- `docs/vos/maestro-stt-strategy-by-lane.md`
- `docs/vos/maestro-project-roadmap.md`
- `docs/vos/maestro-implementation-progress.md`
- `docs/vos/maestro-asr-command-lane-pivot-impact.md`

Rule:
- no phase hard-close is valid if code direction and decision/docs direction diverge.

## Immediate Next Slice (Execution Start)

Start with Phase 0 + Phase 1 stabilization tasks:
- verify isolated env baseline and sidecar bring-up determinism
- finalize truthful lane telemetry and health diagnostics
- produce first stability evidence packet before any command-lane deep integration

This creates the stable footing required for Phase 2 and beyond.
