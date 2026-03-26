# Maestro VOS Documentation Map

## Purpose

This file is the entry point for `docs/vos` and should be used to quickly identify canonical sources.

## Canonical Direction Lock (2026-03-25)

Maestro is a **Voice Operating System** with command-lane primacy.

- command lane is a governed control system
- dictation lane is separate and transcription-oriented
- command semantics are owned by Maestro grammar/lexicon/policy services
- acoustic engines are adapter rails, not command authority

Cross-reference:

- [`../vision/voice-operating-system.md`](../vision/voice-operating-system.md)
- [`../speech/command-lane-architecture-memo.md`](../speech/command-lane-architecture-memo.md)
- [`../vision/ai-customization-wizard.md`](../vision/ai-customization-wizard.md)
- [`../architecture/nexus-maestro-arqonmcp-boundary.md`](../architecture/nexus-maestro-arqonmcp-boundary.md)

Boundary lock:

- Maestro = interaction + actuation surface
- ArqonMCP = workflow/capability orchestration substrate
- Nexus = deliberative intent companion

## Canonical Entry Docs

| Document | Role |
| --- | --- |
| [`maestro-master-plan.md`](./maestro-master-plan.md) | Top-level strategic control document |
| [`maestro-project-roadmap.md`](./maestro-project-roadmap.md) | Planning and sequencing tracker |
| [`maestro-implementation-progress.md`](./maestro-implementation-progress.md) | Current implementation status |
| [`maestro-decision-log.md`](./maestro-decision-log.md) | VOS-local architectural decisions |
| [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md) | Resume-critical implementation traps |

## Command and Runtime Contracts

| Topic | Primary documents |
| --- | --- |
| Language laws and grammar | [`maestro-language-constitution.md`](./maestro-language-constitution.md), [`maestro-spoken-command-grammar.md`](./maestro-spoken-command-grammar.md), [`maestro-syntax-specification.md`](./maestro-syntax-specification.md) |
| Interpretation and routing | [`maestro-interpretation-engine.md`](./maestro-interpretation-engine.md), [`maestro-intent-routing-v0.1.md`](./maestro-intent-routing-v0.1.md) |
| Runtime command handoff | [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md), [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md) |
| Workflow and execution | [`maestro-workflow-contract.md`](./maestro-workflow-contract.md), [`maestro-executor-architecture.md`](./maestro-executor-architecture.md), [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md) |
| STT/TTS strategy | [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md), [`maestro-tts-architecture.md`](./maestro-tts-architecture.md), [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md) |
| Customization and Talon bridge | [`maestro-talon-integration-strategy.md`](./maestro-talon-integration-strategy.md), [`maestro-lexicon.md`](./maestro-lexicon.md), [`maestro-macro-system.md`](./maestro-macro-system.md) |
| Identity and policy boundaries | [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md), [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md), [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md) |

## Background and Historical Context

Use these for context, not as canonical authority when conflicts exist:

- [`maestro-overview.md`](./maestro-overview.md)
- [`maestro-vos-plan.md`](./maestro-vos-plan.md)
- [`asr-stage-2b-restart-packet.md`](./asr-stage-2b-restart-packet.md)
- [`maestro-watchdog-audit-log.md`](./maestro-watchdog-audit-log.md)

## Recommended Reading Order

1. [`maestro-master-plan.md`](./maestro-master-plan.md)
2. [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)
3. [`maestro-implementation-progress.md`](./maestro-implementation-progress.md)
4. [`maestro-decision-log.md`](./maestro-decision-log.md)
5. [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
6. [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)
7. [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
8. [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)
