# VOS Documentation Sorting

> **Date:** 2026-03-17

This document categorizes the documentation in `docs/vos/` into **Core** and **Planning** categories.

---

## CORE Documents (Technical Specifications)

These define the actual implementation, architecture, and contracts:

| Document | Purpose |
|----------|---------|
| [`maestro-executor-architecture.md`](./maestro-executor-architecture.md) | Executor architecture |
| [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md) | Runtime command contract |
| [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md) | Hot path runtime contract |
| [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md) | Actuation policy engine |
| [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md) | Capability registry adapter |
| [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md) | Shell/runtime decomposition |
| [`maestro-talon-integration-strategy.md`](./maestro-talon-integration-strategy.md) | Talon integration strategy |
| [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md) | Voice identity security |
| [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md) | Nexus protocol boundary |
| [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md) | STT strategy by lane |
| [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md) | TTS persona & voice |
| [`maestro-workflow-contract.md`](./maestro-workflow-contract.md) | Workflow contract |
| [`maestro-workflow-contract-service.md`](./maestro-workflow-contract-service.md) | Workflow contract service |
| [`maestro-authorization-service.md`](./maestro-authorization-service.md) | Authorization service |
| [`maestro-identity-gateway-service.md`](./maestro-identity-gateway-service.md) | Identity gateway service |
| [`maestro-core-command-set.md`](./maestro-core-command-set.md) | Core command set |

### Language & Grammar (Core)

| Document | Purpose |
|----------|---------|
| [`maestro_spoken_command_grammar.md`](./maestro_spoken_command_grammar.md) | Spoken command grammar |
| [`maestro-language-constitution.md`](./maestro-language-constitution.md) | Language constitution |
| [`maestro-syntax-specification.md`](./maestro-syntax-specification.md) | Syntax specification |
| [`maestro-lexicon.md`](./maestro-lexicon.md) | Lexicon |
| [`maestro-verb-system.md`](./maestro-verb-system.md) | Verb system |
| [`maestro-object-system.md`](./maestro-object-system.md) | Object system |
| [`maestro-surface-model.md`](./maestro-surface-model.md) | Surface model |
| [`maestro-reference-system.md`](./maestro-reference-system.md) | Reference system |
| [`maestro-verb-object-matrix.md`](./maestro-verb-object-matrix.md) | Verb-object matrix |
| [`maestro-command-families.md`](./maestro-command-families.md) | Command families |

### Supporting Technical (Core)

| Document | Purpose |
|----------|---------|
| [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md) | Ambiguity policy |
| [`maestro-chooser-ux.md`](./maestro-chooser-ux.md) | Chooser UX |
| [`maestro-interpretation-engine.md`](./maestro-interpretation-engine.md) | Interpretation engine |
| [`maestro-intent-routing-v0.1.md`](./maestro-intent-routing-v0.1.md) | Intent routing v0.1 |
| [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md) | Modes state machine |
| [`maestro-preference-model.md`](./maestro-preference-model.md) | Preference model |
| [`maestro-macro-system.md`](./maestro-macro-system.md) | Macro system |
| [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md) | Error recovery |
| [`maestro-phonetic-hazard-audit.md`](./maestro-phonetic-hazard-audit.md) | Phonetic hazard audit |
| [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md) | Phonetic robustness |

---

## PLANNING Documents

These track progress, governance, and future plans:

| Document | Purpose |
|----------|---------|
| [`maestro-master-plan.md`](./maestro-master-plan.md) | **Master strategic plan** - live control document |
| [`maestro-project-roadmap.md`](./maestro-project-roadmap.md) | **High-level roadmap** - historical execution tracking |
| [`maestro-implementation-progress.md`](./maestro-implementation-progress.md) | Live execution snapshot, current status |
| [`maestro-focus-gap-analysis.md`](./maestro-focus-gap-analysis.md) | Focus gap analysis |
| [`maestro-voice-component-migration-matrix.md`](./maestro-voice-component-migration-matrix.md) | Component migration matrix |
| [`maestro-decision-log.md`](./maestro-decision-log.md) | VOS-local architectural decisions |
| [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md) | Sticky traps and verification caveats |

### Background/Reference (Planning)

| Document | Purpose |
|----------|---------|
| [`ultimate-vos-reference-architecture.md`](./ultimate-vos-reference-architecture.md) | Reference architecture |
| [`maestro-overview.md`](./maestro-overview.md) | Background synthesis |
| [`maestro-vos-plan.md`](./maestro-vos-plan.md) | Background VOS plan |
| [`maestro-focus-architecture-current.md`](./maestro-focus-architecture-current.md) | Current Focus arch reference |
| [`maestro-focus-architecture-proposed.md`](./maestro-focus-architecture-proposed.md) | Proposed Focus arch reference |
| [`maestro-phase-1b-hard-close-handoff.md`](./maestro-phase-1b-hard-close-handoff.md) | Phase 1B handoff summary |
| [`maestro-phase-1c-hard-close-handoff.md`](./maestro-phase-1c-hard-close-handoff.md) | Phase 1C handoff summary |

---

## FOCUS Subdirectory

The `focus/` subdirectory contains Focus-specific documentation:

| Document | Purpose |
|----------|---------|
| [`focus/focus-project-charter.md`](./focus/focus-project-charter.md) | Focus governance & acceptance criteria |
| [`focus/focus-plan.md`](./focus/focus-plan.md) | Focus execution plan |
| [`focus/focus-technote.md`](./focus/focus-technote.md) | Core focus implementation files |
| [`focus/focus-recovery-technical-documentation.md`](./focus/focus-recovery-technical-documentation.md) | Recovery architecture |
| [`focus/maestro-focus-recovery-plan.md`](./focus/maestro-focus-recovery-plan.md) | Recovery implementation |
| [`focus/maestro-focus-recovery-v0.1.md`](./focus/maestro-focus-recovery-v0.1.md) | Recovery v0.1 spec |
| [`focus/maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md) | Phase 4A: Referential Intent |
| [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md) | Phase 4B: Modal Awareness |
| [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md) | Phase 4C: Surface Expansion |
| [`focus/maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md) | Phase 4D: Language Integration |
| [`focus/maestro-focus-precision-v0.1.md`](./focus/maestro-focus-precision-v0.1.md) | Precision focus spec |
| [`focus/maestro-focus-test-plan.md`](./focus/maestro-focus-test-plan.md) | Focus testing plan |
| [`focus/recovery-truthfulness-test-sheet.md`](./focus/recovery-truthfulness-test-sheet.md) | Test evidence |
| [`focus/focus-project-validation-note-fp1-fp2.md`](./focus/focus-project-validation-note-fp1-fp2.md) | Validation evidence |
| [`focus/maestro-focus-phase-handoff.md`](./focus/maestro-focus-phase-handoff.md) | Focus handoff summary |

---

## Directory Structure Summary

```
docs/vos/
├── CORE (Technical Specifications)
│   ├── Architecture & Contracts
│   ├── Language & Grammar
│   └── Supporting Technical
├── PLANNING
│   ├── Governance & Tracking
│   └── Background/Reference
├── README.md
└── focus/
    └── Focus-specific docs
```

---

*Last Updated: 2026-03-17*
