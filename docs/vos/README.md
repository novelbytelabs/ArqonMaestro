# Maestro VOS Documentation Map

## Purpose

This file is the entry point for `/docs/vos`.

Use it to answer three questions quickly:

1. Which documents are canonical?
2. Which planning areas are already covered?
3. Which specifications still need to be written before implementation starts?

## Working rule

Do not collapse the entire VOS design into one giant document.

That would reduce duplication in one way, but it would also make the spec harder to navigate, harder to maintain, and easier to blur at the edges.

The better structure is:

* one canonical roadmap
* one directory map
* one primary document per topic
* supporting detail documents under that topic
* a small number of background synthesis docs kept for context, not as source of truth

## Canonical entry documents

| Document | Role |
| --- | --- |
| [`maestro-master-plan.md`](./maestro-master-plan.md) | Live top-level strategic control document after foundational implementation |
| [`maestro-project-roadmap.md`](./maestro-project-roadmap.md) | Canonical planning status, sequencing, and missing-work tracker |
| [`maestro-implementation-progress.md`](./maestro-implementation-progress.md) | Current implementation snapshot and resume point |
| [`maestro-decision-log.md`](./maestro-decision-log.md) | VOS-local architectural and phase-shaping decision record |
| [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md) | Sticky implementation, verification, and naming traps |
| [`maestro-language-constitution.md`](./maestro-language-constitution.md) | High-level language laws and design identity |
| [`maestro_spoken_command_grammar.md`](./maestro_spoken_command_grammar.md) | Compact summary of the spoken grammar model |
| [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md) | Canonical normalized command object and runtime handoff contract |
| [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md) | Time-critical service, latency, locality, and blocking contract |
| [`maestro-workflow-contract.md`](./maestro-workflow-contract.md) | Canonical multi-step workflow runtime object |
| [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md) | Route approval, fallback, retry, and audit policy layer |
| [`maestro-talon-integration-strategy.md`](./maestro-talon-integration-strategy.md) | Talon’s role, boundaries, and routing posture inside Maestro |
| [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md) | Speaker identity, verification, authorization, and voice security model |
| [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md) | Boundary between Maestro operating control and Nexus assistant continuity |
| [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md) | Lane-specific speech recognition strategy, locality, and benchmarking |
| [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md) | Persona-routed TTS, agent voice identity, and output arbitration |
| [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md) | Shell host boundary, local services split, and Java/Rust ownership |
| [`maestro-executor-architecture.md`](./maestro-executor-architecture.md) | Execution routing and realization model |
| [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md) | Adapter and capability declaration contract |

## Language specification set

These documents together form the current language-spec core.

| Topic | Primary documents |
| --- | --- |
| Constitution and grammar summary | [`maestro-language-constitution.md`](./maestro-language-constitution.md), [`maestro_spoken_command_grammar.md`](./maestro_spoken_command_grammar.md) |
| Syntax and parse shape | [`maestro-syntax-specification.md`](./maestro-syntax-specification.md), [`maestro-interpretation-engine.md`](./maestro-interpretation-engine.md) |
| Verbs, objects, legality | [`maestro-verb-system.md`](./maestro-verb-system.md), [`maestro-object-system.md`](./maestro-object-system.md), [`maestro-verb-object-matrix.md`](./maestro-verb-object-matrix.md) |
| Vocabulary and speech survivability | [`maestro-lexicon.md`](./maestro-lexicon.md), [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md), [`maestro-phonetic-hazard-audit.md`](./maestro-phonetic-hazard-audit.md) |
| Surfaces, focus, and modes | [`maestro-surface-model.md`](./maestro-surface-model.md), [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md) |
| References, ambiguity, repair | [`maestro-reference-system.md`](./maestro-reference-system.md), [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md), [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md), [`maestro-chooser-ux.md`](./maestro-chooser-ux.md) |
| Families, inventory, and personalization | [`maestro-command-families.md`](./maestro-command-families.md), [`maestro-core-command-set.md`](./maestro-core-command-set.md), [`maestro-preference-model.md`](./maestro-preference-model.md) |
| Workflow composition | [`maestro-mcaro-system.md`](./maestro-mcaro-system.md) |

## Runtime and execution specification set

| Topic | Primary documents |
| --- | --- |
| Runtime handoff object | [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md) |
| Hot-path runtime behavior | [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md) |
| Workflow runtime object | [`maestro-workflow-contract.md`](./maestro-workflow-contract.md) |
| Actuation route policy | [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md) |
| Talon integration | [`maestro-talon-integration-strategy.md`](./maestro-talon-integration-strategy.md) |
| Voice identity and security | [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md) |
| Maestro-Nexus boundary | [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md) |
| STT lane strategy | [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md) |
| TTS persona and multi-agent voice | [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md) |
| Shell/runtime decomposition | [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md) |
| Execution routing | [`maestro-executor-architecture.md`](./maestro-executor-architecture.md) |
| Capability declaration | [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md) |

## Background synthesis documents

These are useful, but they should not compete with the canonical specs above.

| Document | Status |
| --- | --- |
| [`maestro-overview.md`](./maestro-overview.md) | Background synthesis and design narrative |
| [`maestro-vos-plan.md`](./maestro-vos-plan.md) | Gap analysis and earlier planning snapshot |

## Continuity documents

These are the first files to read when resuming active implementation work.

| Document | Role |
| --- | --- |
| [`maestro-master-plan.md`](./maestro-master-plan.md) | Live strategic control document and post-foundation execution programs |
| [`maestro-project-roadmap.md`](./maestro-project-roadmap.md) | Historical foundational implementation sequence and continuity reference |
| [`maestro-implementation-progress.md`](./maestro-implementation-progress.md) | Live status and next-step snapshot |
| [`maestro-decision-log.md`](./maestro-decision-log.md) | VOS-local decisions worth preserving |
| [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md) | Resume-critical traps and caveats |

## Current coverage assessment

| Workstream | Status | Notes |
| --- | --- | --- |
| Spoken command grammar and language design | Strong | Broadly specified, but spread across many topic docs |
| Hot-path runtime contract | Strong | Dedicated contract now exists alongside runtime object and executor docs |
| Talon integration strategy | Strong | Dedicated strategy now exists and aligns Talon under Maestro-owned routing and policy |
| Actuation policy engine | Strong | Dedicated policy document now covers route approval, fallback, retry, and audit behavior |
| Voice identity and speaker security | Strong | Dedicated architecture now exists and ties identity to hot-path and policy gating |
| Maestro ↔ Nexus protocol boundary | Strong | Dedicated sibling-AGO boundary now exists with structured proposal and delegation model |
| STT strategy by lane | Strong | Dedicated lane strategy now exists and aligns with hot-path and phonetic/runtime constraints |
| TTS persona and multi-agent voice design | Strong | Dedicated persona, broker, warning voice, and arbitration model now exists |
| Shell and runtime decomposition | Strong | Dedicated shell/runtime boundary and Java/Rust ownership model now exists |
| Implementation roadmap | Strong | The roadmap now includes explicit prototype, integration, hardening, benchmark, deferral, and readiness sections |

## Recommended reading order

1. [`maestro-master-plan.md`](./maestro-master-plan.md)
2. [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)
3. [`maestro-implementation-progress.md`](./maestro-implementation-progress.md)
4. [`maestro-decision-log.md`](./maestro-decision-log.md)
5. [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md)
6. [`maestro-language-constitution.md`](./maestro-language-constitution.md)
7. [`maestro_spoken_command_grammar.md`](./maestro_spoken_command_grammar.md)
8. [`maestro-syntax-specification.md`](./maestro-syntax-specification.md)
9. [`maestro-surface-model.md`](./maestro-surface-model.md)
10. [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
11. [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)
12. [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)
13. [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)

Then read the topic-specific docs only for the area you are actively refining.

## Missing documents to create next

There are no remaining major planning-spec gaps in the current `/docs/vos` roadmap set.

The next work is implementation, benchmark evidence, and phase-close verification artifacts.

## Runtime Service Implementation Docs (FP-2A/2B)

These documents cover the implemented runtime services for Phase 2A and 2B.

| Document | Status | Description |
| --- | --- | --- |
| [`maestro-identity-gateway-service.md`](./maestro-identity-gateway-service.md) | ✅ IMPLEMENTED | Unified API for identity operations |
| [`maestro-authorization-service.md`](./maestro-authorization-service.md) | ⚠️ STUBBED | Command authorization (real logic, stubbed data) |
| [`maestro-workflow-contract-service.md`](./maestro-workflow-contract-service.md) | ⚠️ STUBBED | Multi-step workflow execution (not integrated) |

See [`maestro-project-roadmap.md`](./maestro-project-roadmap.md) for detailed gap analysis.

## Detail worth keeping in mind

The filename [`maestro-mcaro-system.md`](./maestro-mcaro-system.md) appears to contain a typo and is currently serving as the macro-system spec.

I would leave the filename alone until you are ready to do a focused documentation cleanup pass, because renaming it now could create unnecessary churn in open tabs, links, or future references.
