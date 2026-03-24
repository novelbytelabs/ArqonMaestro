# Maestro ASR Command-Lane Pivot Impact Assessment

**Date:** 2026-03-23
**Decision Reference:** `VOS-041`
**Summary:** Command lane pivots from Parakeet-TDT/Whisper-baseline assumptions to customization-first CTC + constrained decoding + grammar/parser enforcement. Dictation lane remains Qwen3-ASR.

> 2026-03-24 refinement: `VOS-042` locks lane-split architecture and freezes `Parakeet-CTC` as first acoustic candidate sequencing inside the command-control stack.

## A. Canonical Docs Updated In This Pass

- `docs/vos/maestro-decision-log.md`
- `docs/vos/maestro-project-roadmap.md`
- `docs/vos/maestro-stt-strategy-by-lane.md`
- `docs/vos/ultimate-vos-reference-architecture.md`
- `docs/vos/maestro-voice-component-migration-matrix.md`
- `docs/maestro_minimax_project_manager_handoff.md`
- `docs/vos/maestro-implementation-progress.md`
- `plans/asr-model-migration.md`
- `plans/asr-process-isolated-rollout.md`

## B. Specs/Docs Impacted (Follow-Up Required)

These files still contain historical assumptions and remain in bounded backlog:

- `docs/architecture/ultimate-vos-reference-architecture.md` (duplicate architecture copy; keep synchronized)
- `docs/vos/asr-stage-2b-restart-packet.md`
- `docs/vos/maestro-watchdog-audit-log.md` (historical audit narrative referencing Parakeet command target)
- `docs/operations/asr-modernization-setup.sh` (operational script names and comments)
- `plans/asr-stage1-2abc-hard-close-audit.md` (historical snapshot against previous target)
- `docs/decision-log.md` (updated with supersession note; keep synchronized with VOS decision log)

## C. Reconciled In 2026-03-24 Hardening Pass

- `docs/vos/maestro-decision-log.md` (`VOS-042` added, `VOS-040` supersession wording updated)
- `docs/decision-log.md` (synced ADM mirror for `VOS-042`)
- `docs/vos/maestro-stt-strategy-by-lane.md` (control-first command-lane acceptance and Parakeet-CTC sequencing wording)
- `docs/vos/maestro-project-roadmap.md` (Wave B lane language clarified as control-stack architecture)
- `docs/vos/maestro-implementation-progress.md` (execution wording aligned with `VOS-042`)
- `docs/vos/asr-stage-2b-restart-packet.md` (historical-context notice added)
- `docs/operations/asr-modernization-setup.sh` (deprecation/safety notice; isolated sidecar flow is canonical)

## D. New Non-Negotiable Command-Lane Acceptance Gates

1. Grammar control works under constrained decoding.
2. Custom vocabulary and custom pronunciations are testable and deterministic.
3. Command rejection is bounded and deterministic for out-of-grammar utterances.
4. Command lane is not evaluated solely by generic WER; control-behavior metrics are required.
5. Command fallback path must preserve constrained-decoding control characteristics.

## E. PM/Watchdog Enforcement Update

PM and Watchdog should reject any stage claim that:

- treats command-lane success as generic ASR accuracy alone
- promotes Whisper-family fallback as control-equivalent command fallback
- omits grammar/lexicon/pronunciation/rejection evidence in command-lane reporting
