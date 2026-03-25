# VOS Documentation Sorting

> **Date:** 2026-03-25

This file classifies `docs/vos/` documents into canonical implementation specs, planning/governance docs, and historical context.

## Direction Lock

Use this alignment when categorizing or updating docs:

- Maestro is a Voice Operating System
- command lane is the primary governed control lane
- dictation lane is a separate transcription lane
- command semantics remain Maestro-owned, engine-adapter driven

Cross-reference:

- [`../speech/command-lane-architecture-memo.md`](../speech/command-lane-architecture-memo.md)
- [`../vision/voice-operating-system.md`](../vision/voice-operating-system.md)

---

## Core Specs (Implementation Contracts)

- [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)
- [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
- [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)
- [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md)
- [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)
- [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)
- [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md)
- [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
- [`maestro-tts-architecture.md`](./maestro-tts-architecture.md)
- [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md)
- [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
- [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md)
- [`maestro-talon-integration-strategy.md`](./maestro-talon-integration-strategy.md)

## Language/Command Specs (Core)

- [`maestro-language-constitution.md`](./maestro-language-constitution.md)
- [`maestro-spoken-command-grammar.md`](./maestro-spoken-command-grammar.md)
- [`maestro-syntax-specification.md`](./maestro-syntax-specification.md)
- [`maestro-interpretation-engine.md`](./maestro-interpretation-engine.md)
- [`maestro-lexicon.md`](./maestro-lexicon.md)
- [`maestro-verb-system.md`](./maestro-verb-system.md)
- [`maestro-object-system.md`](./maestro-object-system.md)
- [`maestro-verb-object-matrix.md`](./maestro-verb-object-matrix.md)
- [`maestro-command-families.md`](./maestro-command-families.md)
- [`maestro-core-command-set.md`](./maestro-core-command-set.md)
- [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md)
- [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md)
- [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md)
- [`maestro-phonetic-hazard-audit.md`](./maestro-phonetic-hazard-audit.md)

## Planning and Governance Docs

- [`maestro-master-plan.md`](./maestro-master-plan.md)
- [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)
- [`maestro-implementation-progress.md`](./maestro-implementation-progress.md)
- [`maestro-decision-log.md`](./maestro-decision-log.md)
- [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md)
- [`maestro-voice-component-migration-matrix.md`](./maestro-voice-component-migration-matrix.md)
- [`maestro-focus-gap-analysis.md`](./maestro-focus-gap-analysis.md)

## Historical/Reference Context

- [`maestro-overview.md`](./maestro-overview.md)
- [`maestro-vos-plan.md`](./maestro-vos-plan.md)
- [`asr-stage-2b-restart-packet.md`](./asr-stage-2b-restart-packet.md)
- [`maestro-watchdog-audit-log.md`](./maestro-watchdog-audit-log.md)
- [`ultimate-vos-reference-architecture.md`](./ultimate-vos-reference-architecture.md)

## Focus Subdirectory

The `focus/` subdirectory contains focus-specific planning and implementation artifacts.

---

*Last Updated: 2026-03-25*
