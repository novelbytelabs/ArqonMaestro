# Maestro ASR Command-Lane Pivot Impact Assessment

**Date:** 2026-03-23
**Decision Reference:** `VOS-041`
**Summary:** Command lane pivots from Parakeet-TDT/Whisper-baseline assumptions to customization-first CTC + constrained decoding + grammar/parser enforcement. Dictation lane remains Qwen3-ASR.

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

These files still contain historical assumptions and should be reconciled in the next doc-hardening pass:

- `docs/architecture/ultimate-vos-reference-architecture.md` (duplicate architecture copy; keep synchronized)
- `docs/vos/asr-stage-2b-restart-packet.md`
- `docs/vos/maestro-watchdog-audit-log.md` (historical audit narrative referencing Parakeet command target)
- `docs/operations/asr-modernization-setup.sh` (operational script names and comments)
- `plans/asr-stage1-2abc-hard-close-audit.md` (historical snapshot against previous target)
- `docs/decision-log.md` (updated with supersession note; keep synchronized with VOS decision log)

## C. New Non-Negotiable Command-Lane Acceptance Gates

1. Grammar control works under constrained decoding.
2. Custom vocabulary and custom pronunciations are testable and deterministic.
3. Command rejection is bounded and deterministic for out-of-grammar utterances.
4. Command lane is not evaluated solely by generic WER; control-behavior metrics are required.
5. Command fallback path must preserve constrained-decoding control characteristics.

## D. PM/Watchdog Enforcement Update

PM and Watchdog should reject any stage claim that:

- treats command-lane success as generic ASR accuracy alone
- promotes Whisper-family fallback as control-equivalent command fallback
- omits grammar/lexicon/pronunciation/rejection evidence in command-lane reporting
