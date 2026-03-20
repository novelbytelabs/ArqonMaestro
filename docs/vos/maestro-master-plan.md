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

## 3. Accepted Foundational Baseline

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

## 4. Canonical Spec Map

The following documents are the canonical design authorities for Maestro’s major subsystems.

### Language and command system

* [`maestro-language-constitution.md`](./maestro-language-constitution.md)
* [`maestro-spoken-command-grammar.md`](./maestro-spoken-command-grammar.md)
* [`maestro-syntax-specification.md`](./maestro-syntax-specification.md)
* [`maestro-core-command-set.md`](./maestro-core-command-set.md)
* [`maestro-verb-system.md`](./maestro-verb-system.md)
* [`maestro-object-system.md`](./maestro-object-system.md)
* [`maestro-macro-system.md`](./maestro-macro-system.md)

### Interpretation, reference, and bounded language integration

* [`maestro-interpretation-engine.md`](./maestro-interpretation-engine.md)
* [`maestro-reference-system.md`](./maestro-reference-system.md)
* [`maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md)
* [`maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
* [`maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
* [`maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md)

### Modes, surfaces, and operating context

* [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
* [`maestro-surface-model.md`](./maestro-surface-model.md)
* [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)
* [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)

### Execution, workflow, and policy

* [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)
* [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)
* [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md)

### Identity, security, and delegation

* [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
* [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md)

### Voice input and output strategy

* [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
* [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md)

### Runtime decomposition and system architecture

* [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md)
* [`ultimate-vos-reference-architecture.md`](./ultimate-vos-reference-architecture.md)

## 5. Current System Capabilities

Maestro now has accepted foundational capability in the following areas:

### Voice ingress and hot path

* hot-path audio ingress and interruption behavior
* bounded turn detection and interruption-safe control flow
* command-fast and dictation-accurate STT lane separation
* local deterministic routing into the runtime

### Identity, safety, and policy

* speaker diarization and verification foundation lanes
* bounded identity and safety gating
* contamination-aware and degraded-evidence-aware authorization behavior
* interaction-mode-aware policy decisions

### Workflow and authority boundaries

* bounded workflow execution scaffolding
* explicit Maestro ↔ Nexus proposal and delegation boundary
* policy-aware workflow and execution control
* bounded replay/audit evidence capture for lawful decisions

### Output and response behavior

* brokered TTS output
* Kokoro primary / Piper fallback
* interruption-safe playback
* bounded persona routing

### Runtime hardening and control-plane foundations

* benchmark instrumentation for lane, stage, and reliability signals
* replay/audit evidence capture for reconstruction of bounded execution decisions
* shell/runtime decomposition hardening

### Language/runtime foundations

* bounded referential intent foundations
* bounded modal awareness foundations
* bounded surface-expansion foundations
* bounded language/system integration foundations

## 6. Remaining Gaps / Shortcomings

The accepted foundations are real, but several important gaps remain before Maestro can be treated as fully hardened or production-like.

### Live platform wiring gaps

* deeper platform-bridge/live-signal coverage for modal, surface, focus, and referential context
* fuller host signal ingestion for lawful cross-surface and modal-aware behavior
* stronger active-surface and active-binding fidelity

### Durability and governance gaps

* identity/enrollment persistence and lifecycle hardening
* delegation grant persistence and governance hardening
* durable replay/audit persistence, retention, and governance model
* stronger recovery/reconnect state handling

### Execution and workflow completion gaps

* broader workflow execution coverage
* richer cross-surface workflow completion
* Wave D completion beyond D1
* stronger output/runtime/provider hardening under contention and failure

### Evidence and operational discipline gaps

* benchmark operationalization (corpora runs, standing reports, regression loop)
* reconnect and recovery hardening
* degraded-mode characterization beyond foundational bounded slices

### Advanced interaction completion gaps

* disambiguation and restore follow-on work beyond bounded foundations
* richer referential, modal, and cross-surface completion behavior

## 7. Strategic Programs

### Program A - Platform Bridge and Live Signal Wiring

Objective:

* wire bounded language/runtime foundations to stable live platform signals
* improve modal, surface, focus, and referential input quality without redesigning semantics

Primary governing specs:

* [`maestro-surface-model.md`](./maestro-surface-model.md)
* [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
* [`maestro-reference-system.md`](./maestro-reference-system.md)
* [`maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
* [`maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
* [`maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md)

Deliverables:

* live modal signal ingestion
* live surface/focus signal ingestion
* higher-fidelity referential anchors
* lawful routing based on real host/platform signals

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

Deliverables:

* Wave D completion beyond D1
* stronger failure and contention handling
* reconnect/retry/recovery hardening
* safer degraded behavior under real operational load

### Program C - Operational Benchmarking and Regression Discipline

Objective:

* turn benchmark instrumentation into standing operational evidence
* enforce lane, stage, and reliability regression discipline

Primary governing specs:

* [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
* [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
* [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)

Deliverables:

* corpus runners
* standing reports
* regression thresholds
* degraded-mode benchmark suites
* route/reliability benchmark discipline

### Program D - Persistence, Recovery, and Governance

Objective:

* add bounded durable state where required for identity, delegation, audit, and recovery
* preserve lawful reconstruction and policy governance

Primary governing specs:

* [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
* [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md)
* [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)
* [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)

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

* [`maestro-reference-system.md`](./maestro-reference-system.md)
* [`maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md)
* [`maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
* [`maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
* [`maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md)

Deliverables:

* disambiguation follow-on work
* restore behavior completion
* richer cross-surface interaction completion
* higher-fidelity lawful interaction under ambiguity

## 8. Execution Order

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

## 9. Program Execution Rules

Each strategic program should be executed through bounded implementation slices.

Rules:

* each slice must name its governing specs
* each slice must define explicit out-of-scope boundaries
* each slice must preserve accepted behavior unless a narrow change is required
* each slice must carry verification evidence
* accepted slices should be anchored to commit hashes
* strategic programs are not implemented as one giant task; they are completed through bounded accepted slices

## 10. Benchmark Doctrine

These remain standing project artifacts:

* hot-path latency
* STT lane accuracy and degradation
* route and executor reliability
* voice output latency and failover
* shell and startup responsiveness
* referential, modal, and surface success/failure rates

Doctrine:

* benchmarks must support routing, policy, and governance decisions
* lane-relative and stage-relative evidence is preferred over single aggregate numbers

## 11. Governance and Control Rules

* keep one canonical master plan (`maestro-master-plan.md`)
* keep `maestro-project-roadmap.md` as historical foundational sequence and continuity reference
* avoid competing source-of-truth planning docs
* record phase-shaping decisions in `maestro-decision-log.md`
* keep resume-critical traps in `maestro-gotcha-registry.md`
* keep live implementation snapshot in `maestro-implementation-progress.md`

## 12. Resume Protocol

When resuming work:

1. `maestro-master-plan.md`
2. `maestro-implementation-progress.md`
3. `maestro-decision-log.md`
4. `maestro-gotcha-registry.md`
5. `maestro-project-roadmap.md`

Resume rule:

* use the Master Plan for current strategic direction
* use the implementation progress file for the current execution state
* use the decision log and gotcha registry to avoid rediscovering settled choices and traps
* use the historical roadmap to understand the foundational sequence and accepted baseline

## 13. Deferred Work

Deferred items remain:

* openWakeWord as optional later work
* full Tauri migration
* broad multi-app semantic integrations beyond first surfaces
* proxy-authority delegation beyond tightly scoped routines
* hosted-first dictation default path
* broad visual automation as normal route
* rich voice-pack marketplace or heavy persona expansion
* large-scale preference mining beyond explicit safe signals

## 14. Definition of Readiness for Production-Like Operation

Maestro is ready for production-like operation when:

* accepted foundations are live-wired and hardened, not only bounded
* policy, identity, workflow, route, and audit decisions are reconstructable with durable evidence
* benchmark doctrine is operationalized with regression thresholds
* degraded and reconnect behavior is characterized and tested
* safety and authority boundaries remain explicit under failure and multi-speaker conditions
* Maestro/Nexus ownership boundaries remain enforceable in runtime behavior

## 15. Immediate Next Step

The next active work should begin with Program A - Platform Bridge and Live Signal Wiring.

Reason:

* accepted language/runtime foundations now exist
* the highest remaining leverage is improving live signal quality and host/runtime binding fidelity
* stronger platform signals will improve modal awareness, surface awareness, referential grounding, and lawful routing without requiring semantic redesign

Immediate priority areas:

* active surface and focus signal fidelity
* modal/overlay signal fidelity
* referential anchor population from live host state
* lawful binding of runtime decisions to real host/platform context
