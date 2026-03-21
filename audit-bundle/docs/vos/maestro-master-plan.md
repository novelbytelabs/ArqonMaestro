# Maestro Master Plan

## 1. Purpose

This is the top-level strategic control document for Maestro after foundational implementation.

It supersedes `maestro-project-roadmap.md` as the live planning control plane.

`maestro-project-roadmap.md` remains the historical foundational implementation sequence and continuity artifact.

### Planning control rule

The Master Plan is not a replacement for the spec set.

It is the control plane over the spec set.

Its job is to:

* define current system reality
* define the next strategic programs
* point to the canonical specs that govern each subsystem
* separate accepted foundations from remaining hardening and deferred work

The Master Plan should not duplicate detailed topic definitions that already belong in the canonical spec documents.

## 2. System Identity

Maestro is a Voice Operating System.

Core laws:

* identity gates authority, not language meaning
* hot-path behavior stays local, fast, interruptible, and inspectable
* Maestro interprets, gates, routes, and executes
* Nexus proposes, remembers, and guides
* runtime decisions must be deterministic, policy-aware, and auditable
* the language remains sovereign; adapters and executors only declare realization power
* workflows are first-class runtime objects, not just command lists
* shell concerns and runtime concerns must remain explicitly separated
* voice output is brokered by persona and policy, not raw provider voice IDs
* STT quality is lane-relative, not absolute
* ambiguity must resolve deterministically; Maestro does not guess when multiple plausible interpretations remain
* recovery from speech/runtime error is a first-class operating concern, not a fallback afterthought
* personalization may bias lawful interpretation, but it may not redefine canonical meaning
* phonetic survivability is part of the safety model, not just a benchmark concern
* Maestro is treated as a Network Automaton instantiated as a Computational Fabric; topology, local rules, and distributed state are computational constituents, not passive metadata

## 3. Ecosystem Position and Runtime Role

Maestro is the Voice Operating System substrate within the Arqon ecosystem.

It should be treated as:

* the spoken operating substrate
* the voice-native ingress plane into governed execution
* the owner of the hot voice-operating path
* the owner of interruption-safe command handling
* the owner of spoken operating grammar and deterministic execution handoff

Maestro is not the whole assistant layer.

The clean ecosystem relationship is:

* `Maestro = the Voice Operating System`
* `Nexus = the intelligent personal assistant`
* `ArqonMCP = the centralized command fabric and governance core`

Architectural rules:

* Nexus must not swallow Maestro
* Maestro must not try to absorb the whole assistant role
* ArqonMCP should be treated as the command fabric, routing authority, and policy/governance boundary
* shell concerns and runtime concerns must remain explicitly separated
* shell migration must not rewrite runtime contracts
* internal Arqon contracts should trend protobuf-first even when edge compatibility requires JSON-RPC

Primary governing specs:

* [`ultimate-vos-reference-architecture.md`](./ultimate-vos-reference-architecture.md)
* [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md)
* [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md)
* [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
* [`../architecture/maestro-computational-fabric.md`](../architecture/maestro-computational-fabric.md)
* [`../architecture/maestro-actuation-and-control-stack.md`](../architecture/maestro-actuation-and-control-stack.md)

## 4. Accepted Foundational Baseline

Accepted bounded slices and anchors:

* Wave A: complete
* Wave B: complete
* Wave C: complete
* Phase 2A: accepted
* Phase 2B: accepted
* Wave D1 / Phase 2C: accepted
* Phase 3A: accepted (`85d263b25dceb505b5845ee2aabd0d8eeecdd442`)
* Phase 3B: accepted (`47cc12fb330d1502a1ef5aeb30777fa4c94f49e1`)
* Phase 3C: accepted (`606435d419108fff561dc79ba51aaf52b00399a7`)
* Phase 4A: accepted (`8ce17fe`)
* Phase 4B: accepted (`7b4c8b6`)
* Phase 4C: accepted (`b61b74d`)
* Phase 4D: accepted (`d616749be8a7fe5a5f3ad34314af7f974ecad2b2`)

These accepted slices establish the foundational bounded build sequence.

They do **not** mean the system is fully hardened, fully live-wired, or fully productionized.

## 5. Canonical Spec Map

The following documents are the canonical design authorities for Maestro’s major subsystems.

### Ecosystem and reference architecture

* [`ultimate-vos-reference-architecture.md`](./ultimate-vos-reference-architecture.md)

### Cross-directory architecture authorities

* [`../architecture/ultimate-vos-reference-architecture.md`](../architecture/ultimate-vos-reference-architecture.md)
* [`../architecture/maestro-computational-fabric.md`](../architecture/maestro-computational-fabric.md)
* [`../architecture/maestro-actuation-and-control-stack.md`](../architecture/maestro-actuation-and-control-stack.md)
* [`../architecture/request-lifecycle.md`](../architecture/request-lifecycle.md)
* [`../architecture/codebase-layout.md`](../architecture/codebase-layout.md)

### Ecosystem overview docs (cross-directory)

* [`../overview/ecosystem.md`](../overview/ecosystem.md)
* [`../overview/arqon-ecosystem-technotes.md`](../overview/arqon-ecosystem-technotes.md)

### Parsing docs (cross-directory)

* [`../parsing/grammars.md`](../parsing/grammars.md)

### Operations docs (cross-directory, supporting governance/evidence/runbook layer)

* [`../operations/configuration.md`](../operations/configuration.md)
* [`../operations/troubleshooting-map.md`](../operations/troubleshooting-map.md)
* [`../operations/port-reference.md`](../operations/port-reference.md)
* [`../operations/walkthrough.md`](../operations/walkthrough.md)
* [`../operations/arqon-bus-migration-flags.md`](../operations/arqon-bus-migration-flags.md)
* [`../operations/arqon-bus-migration-runbook.md`](../operations/arqon-bus-migration-runbook.md)
* [`../operations/external-infrastructure-ownership.md`](../operations/external-infrastructure-ownership.md)
* [`../operations/frozen-requirements-registry.md`](../operations/frozen-requirements-registry.md)
* [`../operations/rebrand-program.md`](../operations/rebrand-program.md)
* [`../operations/historical-provenance-audit.md`](../operations/historical-provenance-audit.md)
* [`../operations/rollback_proof.md`](../operations/rollback_proof.md)
* [`../operations/decision_log.md`](../operations/decision_log.md)
* [`../operations/gotcha-registry.md`](../operations/gotcha-registry.md)
* [`../operations/phase-closeout-template.md`](../operations/phase-closeout-template.md)
* [`../operations/phase-1-closeout.md`](../operations/phase-1-closeout.md)
* [`../operations/phase-2-closeout.md`](../operations/phase-2-closeout.md)
* [`../operations/phase-3-closeout.md`](../operations/phase-3-closeout.md)
* [`../operations/phase-4-closeout.md`](../operations/phase-4-closeout.md)
* [`../operations/phase-4-evidence.md`](../operations/phase-4-evidence.md)
* [`../operations/phase-5-closeout.md`](../operations/phase-5-closeout.md)
* [`../operations/phase-5-evidence.md`](../operations/phase-5-evidence.md)
* [`../operations/phase-6-closeout.md`](../operations/phase-6-closeout.md)
* [`../operations/phase-6-evidence.md`](../operations/phase-6-evidence.md)
* [`../operations/phase-7-closeout.md`](../operations/phase-7-closeout.md)
* [`../operations/phase-7-evidence.md`](../operations/phase-7-evidence.md)
* [`../operations/phase-e-closeout.md`](../operations/phase-e-closeout.md)
* [`../operations/phase-e-evidence.md`](../operations/phase-e-evidence.md)
* [`../operations/wave-a-closeout.md`](../operations/wave-a-closeout.md)
* [`../operations/wave-a-evidence.md`](../operations/wave-a-evidence.md)
* [`../operations/wave-b-compatibility-matrix.md`](../operations/wave-b-compatibility-matrix.md)
* [`../operations/wave-b-evidence.md`](../operations/wave-b-evidence.md)
* [`../operations/wave-c-plan.md`](../operations/wave-c-plan.md)
* [`../operations/wave-c-closeout.md`](../operations/wave-c-closeout.md)
* [`../operations/wave-c-evidence.md`](../operations/wave-c-evidence.md)
* [`../operations/wave-d-closeout.md`](../operations/wave-d-closeout.md)
* [`../operations/wave-d-evidence.md`](../operations/wave-d-evidence.md)
* [`../operations/wave-d-ownership-inventory.md`](../operations/wave-d-ownership-inventory.md)
* [`../operations/wave-d-readiness-checklist.md`](../operations/wave-d-readiness-checklist.md)
* [`../operations/wave-e-closeout.md`](../operations/wave-e-closeout.md)
* [`../operations/wave-e-evidence.md`](../operations/wave-e-evidence.md)
* [`../operations/wave-e-inventory.md`](../operations/wave-e-inventory.md)
* [`../operations/wave-e-scope.md`](../operations/wave-e-scope.md)
* [`../operations/gate-6-kokoro-plan.md`](../operations/gate-6-kokoro-plan.md)
* [`../operations/gate-6b-arqonhpo-homeostasis-plan.md`](../operations/gate-6b-arqonhpo-homeostasis-plan.md)
* [`../operations/kokoro-installation.md`](../operations/kokoro-installation.md)

### Guides docs (cross-directory, operator and user enablement)

* [`../guides/getting-started.md`](../guides/getting-started.md)
* [`../guides/building.md`](../guides/building.md)
* [`../guides/how-commands-work.md`](../guides/how-commands-work.md)
* [`../guides/common-commands.md`](../guides/common-commands.md)
* [`../guides/command-modes.md`](../guides/command-modes.md)
* [`../guides/navigation-and-selection.md`](../guides/navigation-and-selection.md)
* [`../guides/editing-and-refactoring.md`](../guides/editing-and-refactoring.md)
* [`../guides/adding-and-inserting-code.md`](../guides/adding-and-inserting-code.md)
* [`../guides/dictation-and-raw-text.md`](../guides/dictation-and-raw-text.md)
* [`../guides/alternatives-and-corrections.md`](../guides/alternatives-and-corrections.md)
* [`../guides/application-control.md`](../guides/application-control.md)
* [`../guides/browser-and-system-control.md`](../guides/browser-and-system-control.md)
* [`../guides/editor-integrations.md`](../guides/editor-integrations.md)
* [`../guides/revision-box-and-text-input.md`](../guides/revision-box-and-text-input.md)
* [`../guides/in-app-tutorials.md`](../guides/in-app-tutorials.md)

### Development docs (cross-directory, implementation mechanics)

* [`../development/protocol-overview.md`](../development/protocol-overview.md)
* [`../development/protocol-messages.md`](../development/protocol-messages.md)
* [`../development/api-reference.md`](../development/api-reference.md)
* [`../development/plugin-lifecycle.md`](../development/plugin-lifecycle.md)
* [`../development/extending-maestro.md`](../development/extending-maestro.md)
* [`../development/custom-commands.md`](../development/custom-commands.md)
* [`../development/snippets.md`](../development/snippets.md)
* [`../development/codex-ui-ux-workflow.md`](../development/codex-ui-ux-workflow.md)

### Model docs (cross-directory, training/data architecture)

* [`../models/model-architecture.md`](../models/model-architecture.md)
* [`../models/training-models.md`](../models/training-models.md)
* [`../models/generating-data.md`](../models/generating-data.md)

### Reference docs (cross-directory, command expression utilities)

* [`../reference/selectors.md`](../reference/selectors.md)
* [`../reference/formatting-and-symbols.md`](../reference/formatting-and-symbols.md)

### Language and command system

* [`maestro-language-constitution.md`](./maestro-language-constitution.md)
* [`maestro_spoken_command_grammar.md`](./maestro-spoken-command-grammar.md)
* [`maestro-syntax-specification.md`](./maestro-syntax-specification.md)
* [`maestro-command-families.md`](./maestro-command-families.md)
* [`maestro-lexicon.md`](./maestro-lexicon.md)
* [`maestro-verb-object-matrix.md`](./maestro-verb-object-matrix.md)
* [`maestro-core-command-set.md`](./maestro-core-command-set.md)

### Interpretation, reference, and bounded language integration

* [`maestro-interpretation-engine.md`](./maestro-interpretation-engine.md)
* [`maestro-reference-system.md`](./maestro-reference-system.md)
* [`focus/maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md)
* [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
* [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
* [`focus/maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md)

### Modes, surfaces, and operating context

* [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
* [`maestro-surface-model.md`](./maestro-surface-model.md)
* [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)
* [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)

### Routing, ambiguity, recovery, and runtime control

* [`maestro-intent-routing-v0.1.md`](./maestro-intent-routing-v0.1.md)
* [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md)
* [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md)
* [`maestro-focus-architecture-proposed.md`](./maestro-focus-architecture-proposed.md)
* [`maestro-focus-gap-analysis.md`](./maestro-focus-gap-analysis.md)
* [`maestro-focus-precision-v0.1.md`](./focus/maestro-focus-precision-v0.1.md)
* [`maestro-focus-recovery-v0.1.md`](./focus/maestro-focus-recovery-v0.1.md)

### Phonetic safety and speech survivability

* [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md)
* [`maestro-phonetic-hazard-audit.md`](./maestro-phonetic-hazard-audit.md)

### Preference and personalization

* [`maestro-preference-model.md`](./maestro-preference-model.md)

### Execution, workflow, routing, and capability declaration

* [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)
* [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)
* [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md)
* [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)
* [`maestro-talon-integration-strategy.md`](./maestro-talon-integration-strategy.md)

### Authorization and identity runtime services

* [`maestro-authorization-service.md`](./maestro-authorization-service.md)
* [`maestro-identity-gateway-service.md`](./maestro-identity-gateway-service.md)
* [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)

### Workflow runtime services

* [`maestro-workflow-contract-service.md`](./maestro-workflow-contract-service.md)
* [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md)

### Voice input and output strategy

* [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
* [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md)
* [`maestro-voice-component-migration-matrix.md`](./maestro-voice-component-migration-matrix.md)

### Runtime decomposition and system architecture

* [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md)

### Focus plane program, validation, and evidence docs

* [`focus-plan.md`](./focus/focus-plan.md)
* [`focus-project-charter.md`](./focus/focus-project-charter.md)
* [`focus-project-validation-note-fp1-fp2.md`](./focus/focus-project-validation-note-fp1-fp2.md)
* [`maestro-focus-test-plan.md`](./focus/maestro-focus-test-plan.md)
* [`focus-recovery-technical-documentation.md`](./focus/focus-recovery-technical-documentation.md)
* [`recovery-truthfulness-test-sheet.md`](./focus/recovery-truthfulness-test-sheet.md)
* [`focus/focus-plan.md`](./focus/focus-plan.md)
* [`focus/focus-project-charter.md`](./focus/focus-project-charter.md)
* [`focus/focus-project-validation-note-fp1-fp2.md`](./focus/focus-project-validation-note-fp1-fp2.md)
* [`focus/focus-recovery-technical-documentation.md`](./focus/focus-recovery-technical-documentation.md)
* [`focus/focus-technote.md`](./focus/focus-technote.md)
* [`focus/maestro-focus-phase-handoff.md`](./focus/maestro-focus-phase-handoff.md)
* [`focus/maestro-focus-precision-v0.1.md`](./focus/maestro-focus-precision-v0.1.md)
* [`focus/maestro-focus-recovery-plan.md`](./focus/maestro-focus-recovery-plan.md)
* [`focus/maestro-focus-recovery-v0.1.md`](./focus/maestro-focus-recovery-v0.1.md)
* [`focus/maestro-focus-test-plan.md`](./focus/maestro-focus-test-plan.md)
* [`focus/maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md)
* [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
* [`focus/maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md)
* [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
* [`focus/recovery-truthfulness-test-sheet.md`](./focus/recovery-truthfulness-test-sheet.md)

### Continuity and control artifacts

* [`maestro-implementation-progress.md`](./maestro-implementation-progress.md)
* [`maestro-decision-log.md`](./maestro-decision-log.md)
* [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md)
* [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)

### Historical / background synthesis (non-canonical)

* [`maestro-overview.md`](./maestro-overview.md)
* [`maestro-vos-plan.md`](./maestro-vos-plan.md)
* [`maestro-focus-architecture-current.md`](./maestro-focus-architecture-current.md)
* [`maestro-phase-1b-hard-close-handoff.md`](./maestro-phase-1b-hard-close-handoff.md)
* [`maestro-phase-1c-hard-close-handoff.md`](./maestro-phase-1c-hard-close-handoff.md)
* [`maestro-focus-phase-handoff.md`](./focus/maestro-focus-phase-handoff.md)
* [`focus-technote.md`](./focus/focus-technote.md)

## 6. Current System Capabilities

Maestro now has accepted foundational capability in the following areas.

### Voice ingress and hot path

* hot-path audio ingress and interruption behavior
* bounded turn detection and interruption-safe control flow
* command-fast and dictation-accurate STT lane separation
* local deterministic routing into the runtime
* bounded intent-routing foundations are implemented and accepted
* the voice migration sequence is explicitly documented and partially landed through accepted bounded slices
* lane-relative STT behavior is aligned to the speech survivability model, though not yet fully operationalized against standing corpora

Primary governing specs:

* [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
* [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
* [`maestro-intent-routing-v0.1.md`](./maestro-intent-routing-v0.1.md)
* [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md)
* [`maestro-voice-component-migration-matrix.md`](./maestro-voice-component-migration-matrix.md)

### Identity, safety, and policy

* speaker diarization and verification foundation lanes
* bounded identity and safety gating
* contamination-aware and degraded-evidence-aware authorization behavior
* interaction-mode-aware policy decisions
* authorization and identity-gateway service boundaries now exist as explicit runtime control surfaces

Primary governing specs:

* [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
* [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md)
* [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
* [`maestro-authorization-service.md`](./maestro-authorization-service.md)
* [`maestro-identity-gateway-service.md`](./maestro-identity-gateway-service.md)

### Workflow and authority boundaries

* bounded workflow execution scaffolding
* explicit Maestro ↔ Nexus proposal and delegation boundary
* policy-aware workflow and execution control
* bounded replay/audit evidence capture for lawful decisions
* workflow contract service boundaries now exist as explicit runtime scaffolding for lawful workflow execution

Primary governing specs:

* [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)
* [`maestro-workflow-contract-service.md`](./maestro-workflow-contract-service.md)
* [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)
* [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md)

### Output and response behavior

* brokered TTS output
* Kokoro primary / Piper fallback
* interruption-safe playback
* bounded persona routing

Primary governing specs:

* [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md)
* [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
* [`maestro-voice-component-migration-matrix.md`](./maestro-voice-component-migration-matrix.md)

### Runtime hardening and control-plane foundations

* benchmark instrumentation for lane, stage, and reliability signals
* replay/audit evidence capture for reconstruction of bounded execution decisions
* shell/runtime decomposition hardening
* runtime-side dispatch seams
* capability-registry and adapter-contract foundations now exist for evidence-based route realization
* runtime command contracts and routing/control seams are explicitly specified
* focus/runtime control has accepted bounded slices, with remaining gaps now clearly isolated

Primary governing specs:

* [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md)
* [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)
* [`ultimate-vos-reference-architecture.md`](./ultimate-vos-reference-architecture.md)
* [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)

### Computational fabric and lifecycle architecture foundations

* control is modeled as distributed local-state evolution across runtime, context, and governance nodes
* request handling is treated as a bounded lifecycle with explicit handoff boundaries
* service ownership boundaries are treated as runtime correctness constraints, not only repository organization

Primary governing specs:

* [`../architecture/maestro-computational-fabric.md`](../architecture/maestro-computational-fabric.md)
* [`../architecture/request-lifecycle.md`](../architecture/request-lifecycle.md)
* [`../architecture/codebase-layout.md`](../architecture/codebase-layout.md)
* [`../architecture/maestro-actuation-and-control-stack.md`](../architecture/maestro-actuation-and-control-stack.md)

### Focus and operating-context foundations

* accepted focus-plane foundations now exist across verification, precision, recovery, referential intent, modal awareness, surface expansion, and language/system integration
* Maestro can now model bounded operating context across focus, modal state, surface, and referential anchors in a deterministic and inspectable way
* focus/runtime law is stronger than current live host signal wiring, which remains a hardening gap

Primary governing specs:

* [`maestro-focus-architecture-proposed.md`](./maestro-focus-architecture-proposed.md)
* [`maestro-focus-precision-v0.1.md`](./focus/maestro-focus-precision-v0.1.md)
* [`maestro-focus-recovery-v0.1.md`](./focus/maestro-focus-recovery-v0.1.md)
* [`focus/maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md)
* [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
* [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
* [`focus/maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md)

### Language/runtime foundations

* bounded referential intent foundations
* bounded modal awareness foundations
* bounded surface-expansion foundations
* bounded language/system integration foundations
* bounded ambiguity handling foundations exist through safe abort and deterministic non-guessing behavior
* bounded recovery-oriented language/runtime foundations exist, but full recovery completion is still a hardening concern

Primary governing specs:

* [`maestro-command-families.md`](./maestro-command-families.md)
* [`maestro-lexicon.md`](./maestro-lexicon.md)
* [`maestro-verb-object-matrix.md`](./maestro-verb-object-matrix.md)
* [`maestro-interpretation-engine.md`](./maestro-interpretation-engine.md)
* [`maestro-reference-system.md`](./maestro-reference-system.md)
* [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md)
* [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md)
* [`maestro-preference-model.md`](./maestro-preference-model.md)

## 7. Remaining Gaps / Shortcomings

The accepted foundations are real, but several important gaps remain before Maestro can be treated as fully hardened or production-like.

### Live platform wiring gaps

* deeper platform-bridge/live-signal coverage for modal, surface, focus, and referential context
* fuller host signal ingestion for lawful cross-surface and modal-aware behavior
* stronger active-surface and active-binding fidelity
* richer capability-registry population from real adapters and live environment status
* focus architecture completion remains limited by real host/platform signal fidelity
* current bounded modal, surface, and referential layers still depend on stronger live focus and active-context inputs
* focus architecture completion remains uneven across current accepted focus/runtime slices and real host/platform signal wiring
* current focus/runtime laws are stronger than current live platform integration fidelity

Primary governing specs:

* [`maestro-surface-model.md`](./maestro-surface-model.md)
* [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
* [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
* [`maestro-reference-system.md`](./maestro-reference-system.md)
* [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)
* [`maestro-focus-architecture-proposed.md`](./maestro-focus-architecture-proposed.md)
* [`maestro-focus-gap-analysis.md`](./maestro-focus-gap-analysis.md)

### Durability and governance gaps

* identity/enrollment persistence and lifecycle hardening
* delegation grant persistence and governance hardening
* durable replay/audit persistence, retention, and governance model
* stronger recovery/reconnect state handling
* authorization and identity gateway service hardening still need stronger durable operational backing

Primary governing specs:

* [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
* [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md)
* [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)
* [`maestro-authorization-service.md`](./maestro-authorization-service.md)
* [`maestro-identity-gateway-service.md`](./maestro-identity-gateway-service.md)

### Execution and workflow completion gaps

* broader workflow execution coverage
* richer cross-surface workflow completion
* Wave D completion beyond D1
* stronger output/runtime/provider hardening under contention and failure
* fuller capability-based lawful routing against live adapter declarations
* workflow contract service is real but not yet fully operationalized across all execution paths
* capability registry / adapter declarations exist as contract foundations but still need broader live realization coverage
* Talon-backed route realization remains strategy-defined but not yet fully exploited as a governed provider layer
* full restore behavior across modal and cross-surface transitions remains incomplete
* lawful cross-surface workflows exist as bounded foundations but not yet as fully operationalized end-state behavior
* fuller recovery handling across STT error, ambiguity, object binding failure, and execution failure

Primary governing specs:

* [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)
* [`maestro-workflow-contract-service.md`](./maestro-workflow-contract-service.md)
* [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)
* [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)
* [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md)
* [`maestro-talon-integration-strategy.md`](./maestro-talon-integration-strategy.md)
* [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md)
* [`maestro-focus-recovery-v0.1.md`](./focus/maestro-focus-recovery-v0.1.md)

### Evidence and operational discipline gaps

* benchmark operationalization (corpora runs, standing reports, regression loop)
* reconnect and recovery hardening
* degraded-mode characterization beyond foundational bounded slices
* computational-fabric regime observability remains incomplete (coherent, degraded, over-rigid, under-constrained)
* provider/route evidence tied more directly to capability and trust declarations
* phonetic hazard benchmarking and command survivability evaluation must become part of the standing evidence loop
* ambiguity, chooser, and safe-abort behavior need operational measurement, not only bounded implementation

Primary governing specs:

* [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
* [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
* [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)
* [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md)
* [`maestro-phonetic-hazard-audit.md`](./maestro-phonetic-hazard-audit.md)
* [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md)
* [`../architecture/maestro-computational-fabric.md`](../architecture/maestro-computational-fabric.md)

### Personalization and preference gaps

* preference behavior remains only partially operationalized
* lawful personalization, alias enablement, scope defaults, and executor preference need stronger implementation discipline
* personalization must remain reversible, inspectable, and subordinate to canonical meaning

Primary governing specs:

* [`maestro-preference-model.md`](./maestro-preference-model.md)
* [`maestro-lexicon.md`](./maestro-lexicon.md)
* [`maestro-verb-object-matrix.md`](./maestro-verb-object-matrix.md)

### Advanced interaction completion gaps

* disambiguation and restore follow-on work beyond bounded foundations
* richer referential, modal, and cross-surface completion behavior
* fuller alignment between language family, lexicon, and runtime interpretation under more complex operating conditions
* disambiguation follow-on work beyond deterministic safe abort
* lawful preference application beyond bounded foundations
* focus restore completion remains pending beyond bounded modal-awareness foundations
* cross-surface referential completion remains pending beyond bounded surface-expansion foundations
* language/system integration is accepted as a bounded foundation but not yet a fully mature end-state operating control plane
* focus architecture completion still requires closing the remaining proposed-vs-operational gap

Primary governing specs:

* [`maestro-command-families.md`](./maestro-command-families.md)
* [`maestro-lexicon.md`](./maestro-lexicon.md)
* [`maestro-verb-object-matrix.md`](./maestro-verb-object-matrix.md)
* [`maestro-reference-system.md`](./maestro-reference-system.md)
* [`focus/maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md)
* [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
* [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
* [`focus/maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md)
* [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md)
* [`maestro-preference-model.md`](./maestro-preference-model.md)
* [`maestro-focus-architecture-proposed.md`](./maestro-focus-architecture-proposed.md)
* [`maestro-focus-gap-analysis.md`](./maestro-focus-gap-analysis.md)

## 8. Strategic Programs

### Program A - Platform Bridge and Live Signal Wiring

Objective:

* wire bounded language/runtime foundations to stable live platform signals
* improve modal, surface, focus, and referential input quality without redesigning semantics

Primary governing specs:

* [`maestro-surface-model.md`](./maestro-surface-model.md)
* [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
* [`maestro-reference-system.md`](./maestro-reference-system.md)
* [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
* [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
* [`focus/maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md)
* [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)
* [`maestro-intent-routing-v0.1.md`](./maestro-intent-routing-v0.1.md)
* [`maestro-focus-architecture-proposed.md`](./maestro-focus-architecture-proposed.md)
* [`maestro-focus-gap-analysis.md`](./maestro-focus-gap-analysis.md)
* [`maestro-focus-precision-v0.1.md`](./focus/maestro-focus-precision-v0.1.md)
* [`maestro-focus-recovery-v0.1.md`](./focus/maestro-focus-recovery-v0.1.md)
* [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)
* [`../architecture/request-lifecycle.md`](../architecture/request-lifecycle.md)
* [`../architecture/codebase-layout.md`](../architecture/codebase-layout.md)

Deliverables:

* live modal signal ingestion
* live surface/focus signal ingestion
* higher-fidelity referential anchors
* lawful routing based on real host/platform signals
* capability-registry-backed surface and environment binding fidelity
* focus/runtime signal fidelity aligned with the proposed focus architecture
* live platform population of surface, focus, and modal context
* live focus and focus-stack signal ingestion
* stronger restore-state inputs
* higher-fidelity modal and surface context population
* higher-fidelity referential anchor population from live host state

Status:

* next active program

### Program B - Production Hardening

Objective:

* harden runtime, output, and provider behavior beyond bounded slices
* reduce fragility in degraded and failure conditions

Primary governing specs:

* [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
* [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)
* [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md)
* [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md)
* [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
* [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md)
* [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md)
* [`maestro-phonetic-hazard-audit.md`](./maestro-phonetic-hazard-audit.md)
* [`maestro-authorization-service.md`](./maestro-authorization-service.md)
* [`maestro-identity-gateway-service.md`](./maestro-identity-gateway-service.md)
* [`maestro-workflow-contract-service.md`](./maestro-workflow-contract-service.md)
* [`maestro-voice-component-migration-matrix.md`](./maestro-voice-component-migration-matrix.md)
* [`../architecture/maestro-actuation-and-control-stack.md`](../architecture/maestro-actuation-and-control-stack.md)

Deliverables:

* Wave D completion beyond D1
* stronger failure and contention handling
* reconnect/retry/recovery hardening
* safer degraded behavior under real operational load
* stronger recovery behavior across STT, ambiguity, object binding, and execution failure layers
* phonetic survivability hardening for command forms under realistic noise and recognition variance
* service-level hardening for authorization, identity gateway, and workflow contract control surfaces
* remaining Wave D voice-plane hardening beyond the bounded broker slice

### Program C - Operational Benchmarking and Regression Discipline

Objective:

* turn benchmark instrumentation into standing operational evidence
* enforce lane, stage, and reliability regression discipline

Primary governing specs:

* [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
* [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
* [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)
* [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)
* [`maestro-voice-component-migration-matrix.md`](./maestro-voice-component-migration-matrix.md)
* [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)
* [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md)
* [`maestro-phonetic-hazard-audit.md`](./maestro-phonetic-hazard-audit.md)
* [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md)
* [`../architecture/maestro-computational-fabric.md`](../architecture/maestro-computational-fabric.md)

Deliverables:

* corpus runners
* standing reports
* regression thresholds
* degraded-mode benchmark suites
* route/reliability benchmark discipline
* capability-aware route and provider evidence
* phonetic hazard measurement and survivability reporting
* ambiguity, disambiguation, and safe-abort frequency reporting
* recovery quality measurement across the defined failure layers

### Program D - Persistence, Recovery, and Governance

Objective:

* add bounded durable state where required for identity, delegation, audit, and recovery
* preserve lawful reconstruction and policy governance

Primary governing specs:

* [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
* [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md)
* [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)
* [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)
* [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)
* [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md)
* [`maestro-authorization-service.md`](./maestro-authorization-service.md)
* [`maestro-identity-gateway-service.md`](./maestro-identity-gateway-service.md)
* [`maestro-workflow-contract-service.md`](./maestro-workflow-contract-service.md)

Deliverables:

* speaker enrollment persistence
* delegation persistence/revocation
* durable replay/audit strategy
* stronger recovery semantics
* policy-governed reconstructability

### Program E - Advanced Interaction Completion

Objective:

* complete higher-order disambiguation, restore, and cross-surface behaviors
* keep deterministic, inspectable language-to-action flow

Primary governing specs:

* [`maestro-command-families.md`](./maestro-command-families.md)
* [`maestro-lexicon.md`](./maestro-lexicon.md)
* [`maestro-verb-object-matrix.md`](./maestro-verb-object-matrix.md)
* [`maestro-reference-system.md`](./maestro-reference-system.md)
* [`focus/maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md)
* [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
* [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
* [`focus/maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md)
* [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md)
* [`maestro-preference-model.md`](./maestro-preference-model.md)
* [`maestro-focus-architecture-proposed.md`](./maestro-focus-architecture-proposed.md)
* [`maestro-focus-gap-analysis.md`](./maestro-focus-gap-analysis.md)
* [`maestro-focus-recovery-v0.1.md`](./focus/maestro-focus-recovery-v0.1.md)

Deliverables:

* disambiguation follow-on work
* restore behavior completion
* richer cross-surface interaction completion
* higher-fidelity lawful interaction under ambiguity
* lawful disambiguation follow-on work
* preference-aware but canonical-safe interaction compression
* reversible personalization aligned with command legality and policy
* richer modal-aware and cross-surface recovery
* higher-order lawful interaction completion across focus, referential, modal, and surface layers

## 9. Execution Order

Recommended order:

1. Program A - Platform Bridge and Live Signal Wiring
2. Program B - Production Hardening
3. Program C - Operational Benchmarking and Regression Discipline
4. Program D - Persistence, Recovery, and Governance
5. Program E - Advanced Interaction Completion

Rationale:

* improve live signal quality first
* harden behavior second
* formalize evidence discipline third
* add durable governance state fourth
* complete advanced interaction behavior last

## 10. Program Execution Rules

Each strategic program should be executed through bounded implementation slices.

Rules:

* each slice must name its governing specs
* each slice must define explicit out-of-scope boundaries
* each slice must preserve accepted behavior unless a narrow change is required
* each slice must carry verification evidence
* accepted slices should be anchored to commit hashes
* strategic programs are not implemented as one giant task; they are completed through bounded accepted slices

## 11. Focus Program Role

The Focus Program is the main bounded implementation thread that produced Maestro’s accepted focus, referential, modal, surface, and language/system foundations.

It should be understood as:

* the primary operating-context implementation program within Maestro
* the implementation thread that connects focus law, recovery, precision, referential intent, modal awareness, surface expansion, and bounded language/system integration
* a major continuity and validation source for post-foundation hardening work

Role of Focus documents:

* proposed focus architecture and bounded focus specs remain important subsystem authorities
* focus validation and test documents remain evidence and continuity artifacts
* historical focus notes remain useful background, but should not compete with live canonical specs

## 12. Benchmark Doctrine

These remain standing project artifacts:

* hot-path latency
* STT lane accuracy and degradation
* route and executor reliability
* voice output latency and failover
* shell and startup responsiveness
* referential, modal, and surface success/failure rates

Doctrine:

* benchmarks must support routing, policy, governance, and capability decisions
* lane-relative and stage-relative evidence is preferred over single aggregate numbers
* benchmark outputs should eventually align with the trust, latency, reliability, and observability metadata described in the capability registry contract
* benchmarking is a standing operational discipline, not a one-time phase artifact
* phonetic survivability, ambiguity behavior, recovery quality, and preference-induced routing behavior are benchmark-governed concerns, not informal UX impressions
* benchmark categories are measurement operators over fabric-level behavior (`Ω`), not only component microbenchmarks
* operational evidence should explicitly track regime drift (coherent, degraded, over-rigid, under-constrained)

The benchmark program should explicitly cover:

* speech survivability under phonetic hazard
* ambiguity frequency and chooser behavior
* safe-abort frequency for unresolved or weak interpretations
* recovery quality across STT, parsing, object binding, and execution failure layers
* the effect of lawful personalization on routing precision without semantic drift

## 13. Governance and Control Rules

* keep one canonical master plan (`maestro-master-plan.md`)
* keep `maestro-project-roadmap.md` as historical foundational sequence and continuity reference
* avoid competing source-of-truth planning docs
* record phase-shaping decisions in `maestro-decision-log.md`
* keep resume-critical traps in `maestro-gotcha-registry.md`
* keep live implementation snapshot in `maestro-implementation-progress.md`
* keep detailed subsystem definitions in their canonical spec docs rather than duplicating them in the Master Plan
* ambiguity, preference, routing, recovery, and phonetic safety must remain governed by their canonical specs and may not be redefined ad hoc in implementation slices
* the Ultimate VOS Reference Architecture governs Maestro’s ecosystem position and target-state runtime role, but subsystem behavior remains governed by the canonical subsystem specs
* focus-plane documents remain canonical where they define bounded runtime law, but validation, handoff, and technical-note artifacts should be treated as evidence or continuity documents rather than competing control planes

## 14. Document Roles

The Maestro document set is intentionally layered.

### Canonical subsystem specs

These define system behavior and architecture within a bounded topic.
They are the primary design authorities.

Examples:

* `maestro-actuation-policy-engine.md`
* `maestro-workflow-contract.md`
* `maestro-shell-runtime-decomposition.md`
* `maestro-capability-registry-adapter-contract.md`

### Service/interface specs

These describe runtime control surfaces and implementation-facing boundaries.

Examples:

* `maestro-authorization-service.md`
* `maestro-identity-gateway-service.md`
* `maestro-workflow-contract-service.md`

### Strategic control documents

These govern current planning, execution order, and continuity.

Examples:

* `maestro-master-plan.md`
* `maestro-project-roadmap.md`
* `maestro-implementation-progress.md`
* `maestro-decision-log.md`
* `maestro-gotcha-registry.md`

### Focus plane law and bounded runtime specs

These define the operating-context law of the focus plane and its accepted bounded runtime slices.

Examples:

* `maestro-focus-architecture-proposed.md`
* `maestro-focus-precision-v0.1.md`
* `maestro-focus-recovery-v0.1.md`
* `focus/maestro-referential-intent-v0.1.md`
* `focus/maestro-modal-awareness-v0.1.md`
* `focus/maestro-surface-expansion-v0.1.md`
* `focus/maestro-language-system-integration-v0.1.md`

### Validation and evidence docs

These provide proof, test framing, or bounded validation artifacts for implementation work.

Examples:

* `maestro-focus-test-plan.md`
* `focus-project-validation-note-fp1-fp2.md`
* `focus-recovery-technical-documentation.md`
* `recovery-truthfulness-test-sheet.md`

### Background and historical synthesis docs

These remain useful for context, but should not be treated as the live canonical source of truth.

Examples:

* `maestro-overview.md`
* `maestro-vos-plan.md`
* `maestro-focus-architecture-current.md`
* hard-close handoff docs
* technical notes and historical focus phase handoffs

### Cross-domain supporting docs

These live outside `/docs/vos` and should be treated as supporting authorities for operations, enablement, and implementation mechanics.

Examples:

* `../overview/*` for ecosystem framing
* `../operations/*` for closeout/evidence/runbook/governance operations artifacts
* `../parsing/grammars.md` for parser grammar structure reference
* `../guides/*` for operator/user behavior guidance
* `../development/*` for protocol and extension mechanics
* `../models/*` for model/training/data architecture
* `../reference/*` for selectors and formatting symbol reference

## 15. Resume Protocol

When resuming work:

1. `maestro-master-plan.md`
2. `maestro-implementation-progress.md`
3. `maestro-decision-log.md`
4. `maestro-gotcha-registry.md`
5. `maestro-project-roadmap.md`
6. the canonical subsystem specs for the next active program
7. the relevant focus-plane validation and evidence docs when working on focus-derived runtime behavior

Resume rule:

* use the Master Plan for strategic direction
* use the implementation progress file for the current execution state
* use the decision log and gotcha registry to avoid rediscovering settled choices and traps
* use the historical roadmap for the foundational sequence
* use subsystem specs to govern the actual implementation slice

## 16. Deferred Work

Deferred items remain:

* openWakeWord as optional later work
* full Tauri migration
* broad multi-app semantic integrations beyond first surfaces
* proxy-authority delegation beyond tightly scoped routines
* hosted-first dictation default path
* broad visual automation as normal route
* rich voice-pack marketplace or heavy persona expansion
* large-scale preference mining beyond explicit safe signals

## 17. Definition of Readiness for Production-Like Operation

Maestro is ready for production-like operation when:

* accepted foundations are live-wired and hardened, not only bounded
* policy, identity, workflow, route, and audit decisions are reconstructable with durable evidence
* benchmark doctrine is operationalized with regression thresholds
* degraded and reconnect behavior is characterized and tested
* safety and authority boundaries remain explicit under failure and multi-speaker conditions
* Maestro/Nexus ownership boundaries remain enforceable in runtime behavior
* adapter and executor claims are explicit enough that routing decisions can be justified through live capability evidence rather than implicit assumptions
* ambiguity behavior is lawful, measurable, and non-guessing under real operating conditions
* recovery quality is demonstrated across STT, parsing, object binding, and execution failure layers
* phonetic survivability is characterized for core command families and high-risk commands
* personalization remains reversible, inspectable, and subordinate to canonical command meaning

## 18. Immediate Next Step

The next active work should begin with Program A - Platform Bridge and Live Signal Wiring.

Reason:

* accepted language/runtime foundations now exist
* the highest remaining leverage is improving live signal quality and host/runtime binding fidelity
* stronger platform signals will improve modal awareness, surface awareness, referential grounding, and lawful routing without requiring semantic redesign

Immediate priority areas:

* active surface and focus signal fidelity
* modal and overlay signal fidelity
* referential anchor population from live host state
* lawful binding of runtime decisions to real host/platform context
* capability-registry-backed surface and environment truth
* restore-state fidelity and focus-stack fidelity for later advanced interaction completion
