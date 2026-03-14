# Maestro Hot-Path Runtime Contract v0.1

## Purpose

The Runtime Command Contract defines the **single-command object** that the parser emits.

This document defines something different:

the **time-critical runtime path** that must carry speech from live utterance to lawful dispatch fast enough for Maestro to feel like an operating system instead of a delayed assistant.

This contract exists to freeze:

* which services sit on the hot path
* what those services must guarantee
* which stages must stay local
* what may block and what must never block
* what latency budget each stage gets
* how the system degrades when a fast-path dependency is unavailable

Without this, Maestro may have a good language and a good executor architecture, but still feel slow, mushy, or unsafe in moment-to-moment use.

---

# 1. Core principle

## The hot path must stay fast, local, and interruptible

The hot path is the runtime path for speech that must feel immediate:

* reflex commands
* focus commands
* core operating commands
* chooser replies
* repair commands

The hot path is **not** where Maestro should wait for:

* remote reasoning
* slow model arbitration
* cloud-only enrichment
* nonessential logging
* speculative personalization work

If something is time-critical for control, it belongs on the hot path.
If it is not time-critical for control, it should stay off it.

---

# 2. What the hot path covers

For v0.1, the hot path begins when Maestro has a live utterance or stable reflex token and ends when one of these outcomes is produced:

* lawful dispatch of a command contract
* lawful dispatch of a workflow contract
* chooser / slot / confirmation handoff
* cognitive-lane handoff
* explicit refusal / block

Conceptually:

```text
audio / live utterance
  ↓
utterance boundary + reflex detection
  ↓
command-fast STT
  ↓
normalization + interpretation
  ↓
command or workflow contract emission
  ↓
policy gate + routing + planning
  ↓
dispatch
  ↓
first feedback / visible actuation / controlled handoff
```

This document covers everything in that path.

It does not cover:

* long-running executor work after dispatch
* full cognitive-agent reasoning
* background telemetry pipelines
* offline learning jobs
* noncritical preference mining

---

# 3. The required hot-path services

Maestro should treat the following as the minimum hot-path runtime services.

## 1. Audio session and utterance boundary service

Responsibilities:

* maintain active listening state
* detect utterance start and utterance end
* feed audio frames to the command-fast STT path
* keep reflex interruption available while busy

This service must be continuously available while Maestro is armed or listening.

## 2. Reflex detector

Responsibilities:

* detect globally reserved reflex words
* interrupt playback or current execution when lawful
* bypass slower interpretation paths for sacred commands like `stop`, `cancel`, and `undo`

This is the brainstem of the runtime.

## 3. Command-fast STT service

Responsibilities:

* decode command-lane speech quickly
* produce token stream or final transcript for deterministic interpretation
* expose confidence and uncertainty signals

This is not the same thing as the best possible dictation engine.

## 4. Transcript normalizer

Responsibilities:

* normalize obvious STT variations
* standardize numerals, protected words, and common alias forms
* preserve enough original transcript information for repair and audit

## 5. Interpretation engine

Responsibilities:

* classify lane
* generate candidate parses
* canonicalize commands
* apply legality filtering
* bind against current context
* emit decision outcome

## 6. Contract emitter

Responsibilities:

* emit a command contract for single-step operations
* emit a workflow contract for lawful multi-step chains
* attach confidence, confirmation, and context metadata

## 7. Policy snapshot service

Responsibilities:

* expose current security mode
* expose shared-room / secure-room rules
* expose speaker verification state
* expose confirmation requirements and relevant policy flags

This service must be queryable with local state and cached policy data.

## 8. Capability snapshot service

Responsibilities:

* expose available adapters and executors
* expose degraded or unavailable routes
* expose current latency/reliability snapshot

The hot path must not wait for a remote registry refresh.

## 9. Router and planner

Responsibilities:

* rank lawful execution candidates
* choose or prepare the route
* compile dispatchable plans
* keep visible focus semantics consistent

## 10. Dispatch bridge

Responsibilities:

* hand accepted plans to the selected executor
* register execution IDs
* return immediate dispatch status

## 11. Interrupt and cancel service

Responsibilities:

* let reflex commands preempt lower-priority work
* pause or cancel workflows when allowed
* keep cancellation semantics reliable even during long-running execution

## 12. Immediate feedback service

Responsibilities:

* emit silent success
* emit short acknowledgment
* show chooser / slot / confirmation UI
* report explicit block or refusal

The user must get a rapid signal that Maestro understood, blocked, or needs something.

---

# 4. Hot-path outputs

The hot path should terminate in one of a small number of structured outcomes.

## A. `dispatch_command`

A lawful command contract was accepted and dispatched.

## B. `dispatch_workflow`

A lawful workflow contract was accepted and dispatched.

## C. `needs_chooser`

The hot path could not safely choose among lawful candidates.

## D. `needs_slot`

A required field is missing and structured completion is needed.

## E. `needs_confirmation`

The command is lawful, but confirmation is required before dispatch.

## F. `handoff_cognitive`

The utterance belongs to the cognitive lane rather than the deterministic operating lane.

## G. `blocked`

The utterance parsed, but policy or safety rules forbade execution.

## H. `ignored_or_rejected`

No lawful hot-path action was produced.

These outcomes are what let the hot path stay deterministic instead of vague.

---

# 5. Latency budgets

These are v0.1 target budgets, not final hard guarantees.

They should be treated as engineering targets that shape design decisions.

## A. Reflex path

From stable reflex recognition to interrupt attempt:

* target p50: under 50 ms
* target p95: under 90 ms

This path must be the fastest in the system.

## B. Command-fast STT path

From utterance end to usable transcript for command interpretation:

* target p50: under 120 ms
* target p95: under 220 ms

This aligns with the command-fast lane rather than dictation-perfect accuracy.

## C. Interpretation path

From transcript availability to command/workflow contract decision:

* target p50: under 20 ms
* target p95: under 40 ms

This includes:

* normalization
* lane classification
* parsing
* canonicalization
* legality filtering
* context binding

## D. Policy + routing + planning path

From contract emission to dispatch-ready plan:

* target p50: under 25 ms
* target p95: under 50 ms

This assumes local policy state and cached capability state.

## E. End-to-end hot-path target

From utterance end to one of:

* dispatch accepted
* chooser shown
* confirmation prompt shown
* explicit block shown

Targets:

* reflex or chooser reply p95: under 150 ms
* focus / simple operating command p95: under 300 ms
* general deterministic command p95: under 400 ms

## F. Visible feedback target

From dispatch acceptance to first visible or audible acknowledgment:

* target p95: under 120 ms

The executor may take longer to finish.
The user should not have to wait that long to know Maestro understood.

---

# 6. Locality rules

## Must remain local

The following should remain local for v0.1 hot-path correctness:

* utterance boundary detection
* reflex detection
* command-fast STT
* transcript normalization
* interpretation and legality filtering
* command/workflow contract emission
* policy checks needed for immediate gating
* current focus and mode state
* capability snapshot reads
* route selection and planning
* cancellation / interruption control

These are the parts that determine whether Maestro feels immediate and trustworthy.

## Local-first with cached state

These may rely on local caches or on-device models, but may not require a fresh remote round-trip to decide a hot-path outcome:

* speaker verification status
* adapter health snapshot
* route latency snapshot
* preference state used for ranking

If the cache is stale, the runtime should degrade conservatively rather than block the whole hot path.

## Hosted-optional and off hot path

These may be remote or deferred:

* cognitive reasoning
* rich dictation enhancement
* post-hoc transcript correction
* cloud logging or analytics
* background learning
* deep explanation generation

If a feature cannot run without a remote service, it should generally not be a required part of hot-path command acceptance.

---

# 7. Blocking rules

## Must never block the hot path

The following must not block command acceptance, block/refusal, or chooser/confirmation handoff:

* remote LLM calls
* remote registry refresh
* remote telemetry upload
* asynchronous preference writes
* nonessential audit persistence
* background summarization or explanation work

These may happen later, but not before the hot path completes its immediate outcome.

## May block only after explicit handoff

These may block only after the system has already produced a clear user-visible state transition:

* chooser interaction
* confirmation waiting
* slot completion
* long-running executor completion
* cognitive-lane reasoning

At that point Maestro is no longer in the command-acceptance fast path.

## May block within bounded local deadlines

These may take time, but only within strict local budgets:

* command-fast STT
* interpretation
* policy lookup
* routing and planning

If these exceed budget, the runtime should degrade or refuse instead of silently hanging.

---

# 8. Degradation policy

If a hot-path dependency is unavailable or over budget, Maestro should degrade in a controlled way.

## If command-fast STT is degraded

Allowed behavior:

* fall back to a slower local command model if still within acceptable budget
* restrict to reflex-only mode if command latency becomes unacceptable
* announce degraded mode if needed

Forbidden behavior:

* silently routing every operating command through a slow cloud path

## If capability snapshot is stale

Allowed behavior:

* use the last known healthy local snapshot
* restrict routing to high-confidence local routes
* refuse commands that need uncertain capability knowledge

## If speaker verification is unavailable

Allowed behavior:

* permit low-risk commands
* gate or refuse sensitive commands
* require confirmation or explicit address where policy demands it

## If the route planner cannot produce a safe route

Allowed behavior:

* chooser if lawful ambiguity exists
* refusal if no safe route exists
* cognitive handoff only if the utterance belongs there

---

# 9. Relation to other runtime documents

The boundaries between the runtime docs should be:

## Runtime Command Contract

Defines the object for one accepted command.

## Workflow Contract

Defines the object for one accepted multi-step workflow.

## Hot-Path Runtime Contract

Defines the time-critical services, budgets, locality rules, and immediate outcomes that govern how Maestro reaches those objects and dispatches them.

## Executor Architecture

Defines how accepted command/workflow objects become execution plans and real system action.

These documents complement each other.
They should not collapse into one giant runtime spec.

---

# 10. Design implications

This contract implies several important architectural decisions.

## 1. Hot-path state must be memory-resident

Mode, focus, policy, and capability snapshots must be available without slow storage reads.

## 2. Interrupt handling is a first-class service

Reflex handling is not a side feature.
It is part of the hot path itself.

## 3. The command lane and cognitive lane must diverge early

Deterministic operating commands should not wait behind cognitive classification work that is not required for them.

## 4. Fast-path outputs should be few and explicit

Dispatch, chooser, confirmation, block, and cognitive handoff are enough for v0.1.

## 5. Degradation must fail conservative

When the hot path is uncertain, Maestro should narrow capability, not improvise.

---

# 11. Laws to freeze

## Law 1

The hot path exists to preserve operating immediacy, not to maximize richness.

## Law 2

Reflex handling is the highest-priority runtime path and must remain continuously interruptible.

## Law 3

No remote dependency may be required to produce a lawful hot-path outcome for core operating commands.

## Law 4

Policy decisions needed for immediate gating must be available locally or through local cached state.

## Law 5

The hot path must terminate quickly in dispatch, chooser, confirmation, block, or handoff.

## Law 6

If the system exceeds hot-path latency budgets, it should degrade or refuse explicitly rather than stall invisibly.

## Law 7

Hosted intelligence may enrich Maestro, but it may not sit in front of the core command loop.

## Law 8

The Runtime Command Contract, Workflow Contract, and Hot-Path Runtime Contract are distinct runtime specifications and should remain distinct.

---

# 12. What this unlocks

Once this contract is frozen, Maestro can implement:

* a truly fast command loop
* reliable reflex interruption
* local-first policy gating
* deterministic degradation behavior
* measurable runtime latency goals
* a clearer separation between operating control and cognitive assistance

That is the difference between a good architecture diagram and a system that actually feels like a Voice Operating System.
