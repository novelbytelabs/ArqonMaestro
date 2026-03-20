# Maestro VOS Master Roadmap

## Purpose

This is now the canonical planning document for `/docs/vos`.

Its job is to keep the planning set coherent by answering:

* what is already specified
* what is only partially specified
* what is still missing
* what should be written next
* what order the remaining planning work should happen in

## Planning rule

Do not merge every VOS idea into one mega-document.

The right control structure is:

* one roadmap
* one documentation map
* one primary spec per major topic
* supporting detail docs under those topics

That preserves detail without losing navigability.

## Current state by workstream

| Workstream | Status | Existing coverage | What is still missing |
| --- | --- | --- | --- |
| 1. Spoken command grammar and language design | Strong | Constitution, grammar, syntax, verbs, objects, surfaces, modes, references, ambiguity, chooser, preferences, macros, phonetics, command set | Mostly a governance problem now: keep the docs organized and avoid competing sources of truth |
| 2. Hot-path runtime contract | Strong | [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md), [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md), [`maestro-executor-architecture.md`](./maestro-executor-architecture.md), [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md) | Keep aligned with executor and STT strategy docs as those evolve |
| 3. Talon integration strategy | Strong | [`maestro-talon-integration-strategy.md`](./maestro-talon-integration-strategy.md), [`maestro-executor-architecture.md`](./maestro-executor-architecture.md), [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md) | Keep aligned with actuation policy and future adapter implementation details |
| 4. Actuation policy engine | Strong | [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md), [`maestro-executor-architecture.md`](./maestro-executor-architecture.md), [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md) | Keep aligned with trust/security policy and future route telemetry |
| 5. Voice identity and speaker security architecture | Strong | [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md), [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md), [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md), [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md) | Keep aligned with real verification/enrollment implementation and policy enforcement |
| 6. Maestro ↔ Nexus protocol boundary | Strong | [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md), [`maestro-executor-architecture.md`](./maestro-executor-architecture.md), [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md) | Keep aligned with Arqon Bus/MCP wire contracts and delegation implementation |
| 7. STT strategy by lane | Strong | [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md), [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md), [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md), [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md) | Keep aligned with real provider benchmarks and lane telemetry |
| 8. TTS persona and multi-agent voice design | Strong | [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md), [`maestro-preference-model.md`](./maestro-preference-model.md), [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md) | Keep aligned with broker implementation and provider/runtime constraints |
| 9. Shell and runtime decomposition | Strong | [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md), [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md), [`maestro-executor-architecture.md`](./maestro-executor-architecture.md) | Keep aligned with shell contract extraction and Java/Rust boundary work |
| 10. Implementation roadmap | Strong | This roadmap now includes explicit prototype, integration, hardening, benchmarking, deferral, and readiness sections | Keep phase scope, evidence, and residual risks current as implementation proceeds |

## What is already in good shape

The language-planning cluster is no longer the main gap.

It is already strongly covered by:

* [`maestro-language-constitution.md`](./maestro-language-constitution.md)
* [`maestro_spoken_command_grammar.md`](./maestro_spoken_command_grammar.md)
* [`maestro-syntax-specification.md`](./maestro-syntax-specification.md)
* [`maestro-surface-model.md`](./maestro-surface-model.md)
* [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
* [`maestro-interpretation-engine.md`](./maestro-interpretation-engine.md)
* [`maestro-core-command-set.md`](./maestro-core-command-set.md)
* [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)
* [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
* [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)
* [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md)
* [`maestro-talon-integration-strategy.md`](./maestro-talon-integration-strategy.md)
* [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
* [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md)
* [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
* [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md)
* [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md)
* [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)

The immediate problem is no longer lack of ideas.

The immediate problem is that the ideas need a cleaner control plane.

## Continuity artifacts

The following files now exist to make resume quality much higher across future sessions:

* [`maestro-implementation-progress.md`](./maestro-implementation-progress.md) owns the live execution snapshot
* [`maestro-decision-log.md`](./maestro-decision-log.md) owns VOS-local phase-shaping decisions
* [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md) owns sticky traps and verification caveats

## Recommended documentation structure

Use these document roles going forward:

* `README.md` owns directory navigation.
* `maestro-project-roadmap.md` owns status, sequencing, and missing work.
* `maestro-implementation-progress.md` owns the current resume point.
* `maestro-decision-log.md` owns VOS-local decisions that future sessions must not rediscover.
* `maestro-gotcha-registry.md` owns implementation and verification traps.
* Topic docs own definitions within their scope.
* `maestro-overview.md` and `maestro-vos-plan.md` remain background synthesis docs and should not be treated as canonical specs.

## Next documents to create

The planning set defined by this roadmap is complete enough to begin implementation.

No additional major planning document is required before coding starts.

New docs should now be created only if implementation uncovers:

* a missing wire contract
* a missing verification pack
* a benchmark report worth freezing separately
* a decision that would otherwise stay trapped in code or chat history

## Recommended execution order

This is the order I recommend from here.

### Phase 0: Control the documentation set

* Freeze [`README.md`](./README.md) as the directory entrypoint.
* Use this roadmap as the planning source of truth.
* Treat [`maestro-overview.md`](./maestro-overview.md) and [`maestro-vos-plan.md`](./maestro-vos-plan.md) as background only.

### Phase 1: Complete the remaining planning set

Status:

* completed

Artifacts completed:

1. [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
2. [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md)
3. [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)
4. [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md)
5. [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md)

### Phase 2: Build the implementation sequence

Status:

* completed in roadmap form

The remaining work is now implementation against the sequence below.

## Build sequence principles

Before the actual phases, freeze these execution rules:

* Build the deterministic operating path before broad assistant behavior.
* Preserve the shell contract while extracting runtime out of the shell.
* Prefer one excellent route per command family before building fallback breadth.
* Ship measurable latency, reliability, and safety evidence with each phase.
* Keep authority, delegation, and security behind explicit gates.
* Do not force Tauri, hosted STT, or broad visual fallback before the contracts prove they are needed.

## Phase 1 prototype goals

Phase 1 should prove that Maestro can behave like a real local Voice OS on the hot path, even with a narrow command set.

### Phase 1A: Runtime spine

Deliver:

1. Extract or formalize the shell contract boundary so renderer UI is not coupled to raw Electron IPC.
2. Stand up the minimum local runtime services for audio ingress, utterance boundary, reflex detection, command-fast STT, transcript normalization, interpretation, contract emission, route policy lookup, routing, and dispatch.
3. Create a minimal command execution trace that records parse outcome, route choice, executor handoff, and first feedback.

Current status:

* **COMPLETE - HARD CLOSED** (2026-03-17)
* renderer shell contract extraction completed
* first main-process runtime-spine extraction completed

Exit evidence:

* a spoken reflex command can interrupt reliably
* a spoken operating command can reach lawful dispatch locally
* the hot path does not depend on remote reasoning or cloud services

### Phase 1B: Core operating path

Deliver:

1. Implement the canonical normalized command object and hot-path runtime contract end to end.
2. Support a narrow but real command slice across reflex, focus, navigation, and terminal/editor execution.
3. Preserve visible focus semantics and explicit confirmation behavior where required.
4. Emit chooser, clarification, refusal, and block outcomes through one consistent runtime path.

Recommended first command slice:

* `stop`
* `cancel`
* `undo`
* `focus terminal`
* `focus editor`
* `return focus`
* `run cargo build`
* `next error`
* `open definition`
* `search files <query>`

Current status:

* **COMPLETE - HARD CLOSED** (2026-03-17)
* All focus commands implemented and verified
* Focus Project complete through FP-6B, extending into Phase 4 (FP-7 through FP-10)

Exit evidence:

* the first command slice works across at least one trustworthy executor route each
* hot-path latency is measured, not guessed
* repair and cancellation work during live operation

### Phase 1C: First execution routes

Deliver:

1. Implement one high-confidence route per core command family before adding lower-trust fallbacks.
2. Bring up the native or subprocess route for terminal/process commands.
3. Bring up the editor semantic route for at least one editor surface where available.
4. Bring up the Talon-backed focus and visible desktop control route where native control is not available.

Current status:

* **COMPLETE - HARD CLOSED** (2026-03-17)
* Route choice follows the actuation policy engine
* Blocked or downgraded routes are visible and auditable

Exit evidence:

* route choice follows the actuation policy engine
* blocked or downgraded routes are visible and auditable
* the system can explain why a route was chosen or refused

## Phase 2 integration goals

Phase 2 should connect the deterministic operating path to the broader trust, assistant, and voice subsystems without weakening the hot path.

> **Status: IN PROGRESS** (2026-03-19)

> **Execution Order: Voice Plane Modernization must complete before Phase 2A or Phase 2C can begin. Phase 2B can run in parallel or after 2A/2C.**

### Voice Plane Modernization Prerequisites

Before Phase 2A or Phase 2C can begin, the voice plane must be modernized to provide stable contracts for identity and TTS. This is a voice-plane-first execution order—Phase 2A and 2C depend on these waves being complete.

Current modernization status (2026-03-19):

* Wave A: **COMPLETE - HARD CLOSED**
* Wave B: **COMPLETE - HARD CLOSED**
* Wave C: **COMPLETE - HARD CLOSED** (C1 diarization + C2 WeSpeaker CPU verification lanes landed and accepted)
* Wave D: **IN PROGRESS** (bounded TTS broker integration landing: Kokoro primary, Piper fallback, interruption-safe playback, persona routing)

#### Wave A: Audio Front-End Modernization (Prerequisite)

- **Denoise**: ONNX denoiser integration on the 16 kHz-native speech path (primary candidate: DTLN-class ONNX denoiser)
- **VAD / turn detection**: Silero VAD with optional fast first-pass gating
- **Stable audio contract** for maestro-audio
- **Turn layer**: interruption / barge-in plumbing aligned with Patch 3 turn-event model

Status:

* **COMPLETE - HARD CLOSED** (Wave A complete)

Wave A denoise direction note:

- WebRTC APM is not the default production direction for this wave
- RNNoise is not the default production direction for this wave
- ONNX Runtime path is the primary denoiser integration strategy for Patch 4
- DTLN-class ONNX denoiser is the current primary candidate
- WebRTC APM and RNNoise remain benchmark / alternate candidates only and must earn promotion through measured results

#### Wave B: STT Lane Modernization (Prerequisite)

- **command-fast** → whisper.cpp
- **dictation-accurate** → faster-whisper

Status:

* **COMPLETE - HARD CLOSED** (Wave B complete)

#### Wave C: Speaker Identity Stack (Prerequisite for Phase 2A)

- **Speaker diarization**: pyannote.audio
- **Speaker verification**: WeSpeaker

Status:

* **COMPLETE - HARD CLOSED** (C1 diarization + C2 CPU-first WeSpeaker verification accepted)

#### Wave D: TTS Broker Modernization (Prerequisite for Phase 2C)

- **Kokoro** primary
- **Piper** fallback
- **Interruption-safe** playback
- **Persona routing**

Status:

* **IN PROGRESS** (Wave D1 bounded broker slice in implementation)

### Phase 2A: Identity and safety gating

> **Depends on: Wave C (Speaker Identity Stack) must be complete before Phase 2A can begin**

Deliver:

1. Implement enrollment, verification state, and authorization policy hooks for voice identity.
2. Enforce secure mode, shared-room mode, confirmation policy, and always-available reflex rules.
3. Thread identity state into route approval and execution outcomes.

**Current status: COMPLETE - ACCEPTED** (identity/safety gating integrated and accepted)

The services now include real bridge-backed voice identity lanes, but Phase 2A policy integration remains incomplete:

| Component | File | Status | Gap |
|-----------|------|--------|-----|
| Speaker Enrollment | [`speaker-enrollment-service.ts`](../../maestro/client/src/main/runtime/speaker-enrollment-service.ts) | STUB | In-memory only - needs persistence |
| Speaker Verification | [`speaker-verification-service.ts`](../../maestro/client/src/main/runtime/speaker-verification-service.ts) | PARTIAL | C1/C2 bridge lanes implemented; not yet fully threaded into authorization/route gating outcomes |
| Voice Identity | [`speaker-verification-service.ts`](../../maestro/client/src/main/runtime/speaker-verification-service.ts) | PARTIAL | Diarization + verification lanes available, but full session/policy orchestration is incomplete |
| Authorization | [`authorization-service.ts`](../../maestro/client/src/main/runtime/authorization-service.ts) | REAL | Decision logic works correctly |
| Security Mode | [`security-mode-service.ts`](../../maestro/client/src/main/runtime/security-mode-service.ts) | REAL | State machine is functional |
| Identity Gateway | [`identity-gateway-service.ts`](../../maestro/client/src/main/runtime/identity-gateway-service.ts) | REAL | API surface works, uses stubbed services |

**To complete Phase 2A:**

1. Add file-based or database persistence to speaker enrollment
2. Thread diarization + verification outputs through authorization and route-approval decisions end to end
3. Finalize identity state handling across security mode / shared-room policy boundaries
4. Add unit tests for authorization decisions
5. Add integration tests for identity flow

Exit evidence:

* risky commands fail closed when identity is insufficient
* shared-room and secure-mode behavior can be demonstrated with policy traces

### Phase 2B: Workflow and delegation

Deliver:

1. Compile lawful multi-step workflow contracts into governed execution plans.
2. Implement the first Maestro-Nexus message boundary for proposals, outcomes, and scoped delegation grants.
3. Keep Maestro as the execution authority while allowing Nexus to propose and learn.

**Current status: PARTIAL - Bounded integration landed**

| Component | File | Status | Gap |
|-----------|------|--------|-----|
| Workflow Contracts | [`workflow-contract-service.ts`](../../maestro/client/src/main/runtime/workflow-contract-service.ts) | PARTIAL | Now carries origin/delegation/authority context; still needs persistence and richer workflow lifecycle state |
| Workflow Execution | [`workflow-nexus-integration.ts`](../../maestro/client/src/main/runtime/workflow-nexus-integration.ts) | PARTIAL | Proposal-to-workflow and step-context execution path landed; broader command-pipeline integration still pending |
| Nexus Protocol | [`nexus-protocol-boundary-service.ts`](../../maestro/client/src/main/runtime/nexus-protocol-boundary-service.ts) | PARTIAL | Structured proposal gating + delegation checks implemented; Arqon Bus wire integration still pending |
| Delegation Grants | [`nexus-protocol-boundary-service.ts`](../../maestro/client/src/main/runtime/nexus-protocol-boundary-service.ts) | PARTIAL | Grant validation works in-memory; persistence and governance tooling still pending |

**To complete Phase 2B:**

1. Expand workflow execution from bounded integration to full command pipeline coverage (executor/dispatcher paths)
2. Add Arqon Bus IPC for Nexus communication
3. Add persistence for delegation grants
4. Add unit tests for workflow state machine
5. Add integration tests for Nexus message boundary

Exit evidence:

* a delegated routine can be proposed by Nexus and still be gated by Maestro policy
* workflow pause, cancel, and confirmation semantics remain intact

### Phase 2C: Output and feedback system

> **Depends on: Wave D (TTS Broker Modernization) must be complete before Phase 2C can begin**

Deliver:

1. Stand up the TTS broker with persona routing, interruption rules, and local fallback behavior.
2. Connect warning and sentinel speech to policy and security events.
3. Keep acknowledgments short and keep cognitive speech separate from operating confirmations.

**Current status: PARTIAL - Wave D1 bounded broker integration landing**

| Component | File | Status | Gap |
|-----------|------|--------|-----|
| TTS Broker | [`tts-broker.ts`](../../maestro/client/src/main/stt/tts-broker.ts) | PARTIAL | Primary/fallback routing and interruption control landed; richer policy/event integration still pending |
| Kokoro Provider | [`tts-providers.ts`](../../maestro/client/src/main/stt/tts-providers.ts) | PARTIAL | Primary provider path active with persona voice override; broader production hardening still pending |
| Piper Fallback | [`tts-providers.ts`](../../maestro/client/src/main/stt/tts-providers.ts) | PARTIAL | Piper-named fallback path active; full standalone Piper synthesis contract still pending |
| Voice Output Integration | [`voice-output.ts`](../../maestro/client/src/main/stt/voice-output.ts) | PARTIAL | Broker wired into speech output path; additional output-class wiring to more runtime events still pending |

Exit evidence:

* reflex barge-in cleanly interrupts speech output
* warning-class output uses the proper voice and priority class

## Phase 3 hardening goals

Phase 3 should make the system trustworthy under failure, variance, and growth.

### Phase 3A: Benchmarking and tuning

Deliver:

1. Run the STT benchmark corpora across command-fast, dictation-accurate, and secure-speaker-aware lanes.
2. Measure hot-path latency by stage rather than only end-to-end.
3. Measure route reliability, chooser frequency, confirmation frequency, and rollback success.

**Current status: PARTIAL - bounded benchmark instrumentation landed**

| Component | File | Status | Gap |
|-----------|------|--------|-----|
| Phase 3A Benchmark Service | [`phase3a-benchmark-service.ts`](../../maestro/client/src/main/runtime/phase3a-benchmark-service.ts) | PARTIAL | Stage/lane/reliability metrics now captured in-memory; corpus runner and persisted reports still pending |
| Benchmark Harness Accessors | [`phase3a-benchmark-harness.ts`](../../maestro/client/src/main/runtime/phase3a-benchmark-harness.ts) | PARTIAL | Snapshot/reset helpers landed; no standalone benchmark CLI/report export yet |
| STT Lane Instrumentation | [`chunk-manager.ts`](../../maestro/client/src/main/stream/chunk-manager.ts), [`speaker-verification-service.ts`](../../maestro/client/src/main/runtime/speaker-verification-service.ts) | PARTIAL | command_fast / dictation_accurate / secure_speaker_aware measurements now captured; benchmark corpora execution automation still pending |
| Hot-path / route instrumentation | [`runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) | PARTIAL | dispatch stage timings and route-policy reliability signals now captured; rollback-quality metrics still pending |

Exit evidence:

* provider and route choices are backed by evidence
* degraded-mode behavior is characterized instead of hypothetical

### Phase 3B: Fallback and replay hardening

Deliver:

1. Implement replay-safe audit artifacts for route choice, confirmation, downgrade, and refusal.
2. Harden retry, downgrade, cancel, and recovery semantics across workflows and long-running execution.
3. Verify that high-risk commands never silently fall to unacceptable routes.

Exit evidence:

* audit traces are usable for debugging and policy review
* destructive-path regressions are caught by tests and replay fixtures

### Phase 3C: Host and runtime migration leverage

Deliver:

1. Extract the hot-path services far enough from Electron that shell replacement is a host swap, not a rewrite.
2. Prototype Tauri only behind explicit parity gates.
3. Extract the first Rust-owned runtime components where the decomposition doc says they belong first.

Exit evidence:

* Electron remains a compatibility shell, not the runtime brainstem
* Tauri is evaluated by evidence, not aspiration

## Phase 4: VOS Runtime Completion

*Phase 4 completes the Focus Program by extending focus into referential binding, modal handling, restore semantics, cross-surface operation, and full runtime integration.*

Phase 4 should complete the VOS runtime by adding referential, modal, cross-surface, and language integration capabilities.

> **Status: PROPOSED** (2026-03-18)

### Phase 4A: Referential Runtime (FP-7A / FP-7B)

Deliver:

1. Bounded support for referential pronouns: "this", "that", "it", "here"
2. Referent confidence scoring to evaluate referential certainty
3. Disambiguation behavior for resolving ambiguous references
4. Safe abort when referential certainty is below threshold

Status: **IN PROGRESS** (2026-03-19)

Supporting documentation: [`maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md)

**Exit evidence:**

* commands using "this", "that", "it", "here" succeed only when referent confidence is above threshold
* ambiguous referents trigger disambiguation or safe abort
* referent telemetry can explain why a referent was accepted or rejected

### Phase 4B: Modal Runtime and Restore (FP-8A / FP-8B)

Deliver:

1. Modal detection for identifying modal dialogs, popups, and overlays
2. Modal interaction rules for handling commands within modals
3. Restore prior focus when modal closes
4. Track focus history across modal boundaries

Status: **IN PROGRESS** (2026-03-19)

Supporting documentation: [`maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)

**Exit evidence:**

* modal detection accuracy is demonstrated on at least one editor, browser, and system dialog
* commands route correctly into active modal scope
* prior focus is restored correctly after modal close

### Phase 4C: Cross-Surface Expansion (FP-9)

Deliver:

1. Unify IDE, browser, terminal, and system surface abstractions
2. Cross-surface focus tracking for commands that span surfaces
3. Cross-surface referential resolution
4. Surface-specific routing with unified fallback

Status: **IN PROGRESS** (2026-03-19)

Supporting documentation: [`maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)

**Exit evidence:**

* at least one workflow spanning IDE + terminal + browser is executed without breaking focus law
* cross-surface focus tracking remains explicit and auditable
* cross-surface referential commands resolve or abort lawfully

### Phase 4D: Language/System Integration (FP-10)

Deliver:

1. Unify focus, routing, grammar, precision, and recovery systems
2. Establish mature VOS runtime behavior across all surfaces
3. Complete the language-to-action pipeline
4. Unify grammar, routing, focus, precision, and recovery through one integrated runtime path with lawful system behavior and unified control plane

Status: **Proposed**

Supporting documentation: [`maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md)

**Exit evidence:**

* grammar, routing, focus, precision, and recovery operate through one integrated runtime path
* the system can explain end-to-end why a spoken command was accepted, blocked, clarified, or restored
* at least one multi-surface voice workflow works under the unified runtime model

## Benchmark plan

The benchmark plan should become a standing implementation artifact, not a one-time exercise.

### Hot-path latency benchmarks

Measure:

* utterance end to first parse result
* utterance end to route approval
* utterance end to first visible feedback
* utterance end to executor handoff
* reflex interrupt latency during playback and during execution

### STT benchmarks

Measure:

* command-fast accuracy on reflex and core command corpora
* phonetic hazard survival rate
* dictation quality on longer-form text
* secure-speaker-aware degradation under noise and multi-speaker conditions

### Route and executor benchmarks

Measure:

* success rate by route tier
* rollback quality
* chooser frequency
* confirmation frequency
* mean retries per command family

### Voice output benchmarks

Measure:

* acknowledgment start latency
* warning output latency
* barge-in interruption responsiveness
* provider failover behavior

### Shell and startup benchmarks

Measure:

* cold launch click-to-interactive
* warm launch click-to-interactive
* shell crash recovery behavior
* service reconnect behavior

### Phase 4 benchmarks

Measure:

* referent resolution accuracy
* disambiguation frequency
* safe abort frequency for referential commands
* modal detection precision/recall
* focus restore success rate
* cross-surface routing success rate
* cross-surface referential resolution success rate

## Deferral list

These are the right things to defer until the earlier phases create leverage.

* openWakeWord — marked as optional / later, not a prerequisite for v0.1. Serenade itself exposed explicit listening control. Wakeword is useful later but should not gate v0.1 correctness.
* full Tauri migration
* broad multi-app semantic integrations beyond the first editor and terminal surfaces
* proxy-authority delegation beyond tightly scoped routines
* hosted-first dictation as a default path
* broad visual automation as a normal route instead of an exceptional fallback
* rich voice pack marketplace or heavy persona expansion
* large-scale preference mining beyond explicit signals and narrow safe telemetry

## Implementation readiness checklist

Implementation is ready to begin when the team can answer yes to the following:

* the canonical planning docs are frozen enough for v0.1 work
* the first command slice is named and intentionally small
* the first executor routes are chosen by command family
* shell versus runtime ownership is explicit
* latency and reliability metrics are named before coding begins
* secure mode and shared-room behavior are defined before risky commands ship
* Maestro-Nexus authority starts at advisory or tightly scoped delegation, not broad autonomy
* fallback rules are defined before fallback routes are enabled
* every phase has exit evidence, residual risk notes, and rollback expectations

## What to build first

If effort needs to be narrowed aggressively, build in this order:

1. Shell contract extraction and minimal hot-path local runtime services
2. Reflex plus command-fast STT plus normalized command emission
3. Policy-gated routing for a narrow core command slice
4. One strong executor route per command family
5. Identity gating for risky commands
6. TTS broker for acknowledgment, warning, and interruption-safe output
7. Nexus proposal boundary and scoped delegation

## Resume rule

When a new session begins, rehydrate context in this order:

1. [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)
2. [`maestro-implementation-progress.md`](./maestro-implementation-progress.md)
3. [`maestro-decision-log.md`](./maestro-decision-log.md)
4. [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md)

That should be enough to resume the current VOS thread without reconstructing the full planning history from scratch.

## Definition of planning completeness

Planning is complete enough to begin implementation when:

* every roadmap workstream has exactly one primary spec
* no critical behavior depends on background synthesis docs
* executor routing, security, STT, and protocol boundaries are frozen at v0.1
* the first implementation phases can be derived directly from the docs without inventing missing policy on the fly

That threshold has now been met for a v0.1 implementation start.

## The core recommendation

The right move is not to force everything into one document.

The right move is to keep the detailed spec set, add one strong index, and make this roadmap the single place that tracks completeness, gaps, and order of work.
