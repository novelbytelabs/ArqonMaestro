# Maestro STT Strategy By Lane v0.2

## Purpose

Maestro should not treat speech recognition as one monolithic service.

A Voice Operating System has multiple speech jobs with different success criteria:

* reflex interruption
* deterministic command recognition
* accurate dictation
* spoken conversation
* translation
* structured search/exploration
* degraded-mode survivability

This document defines:

* the lane model Maestro should support
* what each lane optimizes for
* which lanes must remain local
* how lane routing interacts with the hot path
* fallback and failover behavior
* the first benchmarking plan

Without this, Maestro risks optimizing for one speech task and making the others worse.

---

# 1. Core principle

## STT quality is lane-relative, not absolute

The “best” STT engine depends on what Maestro is trying to do.

Examples:

* the best engine for `stop` is the one that is fastest and safest
* the best engine for `enter dictation` is not necessarily the best engine for writing a paragraph
* the best engine for conversation should preserve clear transcript and boundary control
* search/explore quality depends on structured tool intent precision, not transcript prose quality alone

So Maestro should optimize speech recognition by lane, not by one global leaderboard.

---

# 2. Canonical lane model (v0.2)

Maestro uses five canonical interaction lanes and one optional degraded command sub-lane.

## A. `command_lane`

Purpose:

* deterministic operating commands
* reflex-adjacent command recognition
* fast chooser responses
* low-latency repair commands

Optimizes for:

* latency
* canonical command survivability
* low ambiguity
* hot-path compatibility

## B. `dictation_lane`

Purpose:

* free text entry
* code comments, notes, prose
* longer-form speech where literal text matters

Optimizes for:

* textual accuracy
* punctuation quality
* longer utterance handling
* lower false command rate

## C. `conversation_lane`

Purpose:

* spoken back-and-forth with Nexus
* contextual Q&A, planning, and explanation
* natural turn-by-turn voice interaction

v1 architecture lock:

* `speech in -> ASR -> Nexus -> TTS`
* first hearing candidate: `Qwen3-ASR`
* reasoning authority remains with Nexus

Near-term experiment track (not v1 default):

* evaluate speech-native realtime models (for example `Qwen3-Omni`) only after cascaded lane stability is proven

## D. `translation_lane`

Purpose:

* speech-to-text translation and text-to-text translation workflows
* multilingual dictation transfer
* bounded translate-and-confirm loops

Optimizes for:

* translation faithfulness
* language identification confidence
* low ambiguity between "translate" and "execute" intents

## E. `search_explore_lane`

Purpose:

* retrieval and exploration tasks over docs, web, code, and system state
* multi-step evidence gathering without conflating with execution commands

Optimizes for:

* structured exploration intents
* strict tool routing and provenance
* deterministic action boundaries

Canonical verbs:

* search
* find
* open
* filter
* compare
* summarize
* expand
* follow
* inspect

## Optional degraded sub-lane: `degraded_command`

Purpose:

* emergency fallback when the primary command lane is unavailable or over budget

Optimizes for:

* a tiny, reliable control vocabulary
* minimal dependency footprint

This is not a full-feature lane.
It is a survivability sub-lane for command continuity.

---

# 3. The lane-routing rule

Maestro should decide lane from:

* current interaction mode
* security mode
* utterance class when detectable early
* active overlay state
* whether playback/interruption is active
* whether the system is in degraded operation

## Typical routing

* command mode -> `command_lane`
* chooser mode -> `command_lane`
* repair lane -> `command_lane`
* dictation mode -> `dictation_lane`
* conversational turn mode -> `conversation_lane`
* translation workflows -> `translation_lane`
* retrieval/exploration workflows -> `search_explore_lane`

If uncertainty remains, Maestro should prefer a safer lane rather than a more permissive one.

---

# 4. Command lane

This is the most important lane for VOS feel.

## Requirements

* local-first
* hot-path compatible
* fast endpointing
* strong support for canonical command vocabulary
* supports partials and low-latency finalization

## Near-term baseline

The command lane baseline is customization-first:

* modern CTC acoustic front end (`Conformer-CTC` or `Parakeet-CTC` class)
* constrained decoding (`WFST` / Flashlight / equivalent)
* custom lexicon + pronunciation controls
* Maestro grammar/parser enforcement for bounded command behavior

Candidate sequencing in this architecture:

* `Parakeet-CTC` is the first acoustic candidate to test.
* This is candidate order only, not architecture ownership by one model.

## Success criteria

* command utterances finalize quickly
* canonical verbs and objects survive common STT errors
* chooser and repair loops stay responsive
* latency is more important than dictation-perfect prose output
* grammar compatibility is verified against Maestro command language
* out-of-grammar speech is rejected deterministically
* custom vocabulary and custom pronunciation controls are testable
* outputs remain bounded and command-safe after normalization

---

# 5. Dictation lane

Dictation should not be forced through the command lane.

## Requirements

* strong literal text accuracy
* longer context retention
* punctuation and formatting support
* lower eagerness to coerce text into commands

## Important rule

In dictation mode, ambiguous speech should prefer text over command execution unless:

* a reserved dictation-control phrase is strongly matched
* or a reflex/control word must interrupt

## Provider stance

This lane should remain benchmark-driven and provider-flexible for now.

Do not freeze one engine just because it is the command baseline.
Dictation-lane provider choices do not own or redefine command-lane architecture.

---

# 6. Conversation lane

The conversation lane is spoken interaction, not command-lane replacement.

## v1 architecture

* `speech in -> ASR -> Nexus -> TTS`
* transcript-first and audit-first by default
* use the same policy and telemetry envelope shape as other lanes

## Why cascaded first

* preserves transcript auditability
* keeps reasoning boundaries explicit (`Nexus` remains the reasoning authority)
* avoids hidden speech-native interpretation drift in early runtime hardening

## Later experiment track

After v1 stability gates pass, evaluate speech-native realtime models as an additive experiment path.

---

# 7. Translation lane

Translation is a first-class interaction lane rather than a dictation side-effect.

## Requirements

* explicit source and target language handling
* bounded "translate vs execute" disambiguation
* safe handoff to dictation insertion or conversational response paths

## Important boundary

Translation output is text/cognitive output by default.
It must not directly execute operating commands unless explicitly routed into command interpretation.

---

# 8. Search/explore lane

Search/explore should be structured-action-driven, not generic freeform command expansion.

## Runtime shape

`speech in -> ASR/conversation understanding -> structured explore intent -> ArqonMCP/retrieval tools`

## Requirements

* intent normalization into explicit exploration verbs
* tool-first execution with provenance
* policy-aware boundaries between "explore" and "actuate"

## Important boundary

This lane should not start as a separate ASR-model project.
The lane authority is its structured grammar and tool contract.

---

# 9. Degraded command lane

If Maestro loses its main command lane path, it should not become completely voiceless.

The degraded lane should support a very small safe vocabulary:

* stop
* cancel
* mute
* pause
* wake
* sleep
* yes
* no

Possibly also:

* undo
* repeat

This lane should:

* remain local
* stay tiny
* bias toward refusal outside the reduced vocabulary

The goal is survivability, not full operation.

---

# 10. Local-only vs hosted-optional policy

## Must remain local

The following must stay local for v0.2:

* reflex recognition
* command lane
* degraded command lane
* lane selection needed for hot-path control

Why:

* hot-path latency
* interruption safety
* privacy and resilience
* fail-closed behavior under network issues

## Hosted-optional

The following may use hosted or heavier providers if bounded by policy:

* dictation lane enhancement
* post-hoc transcript improvement
* offline transcript cleanup
* translation quality enhancement
* search/explore summarization enrichment

## Important rule

No remote dependency should be required to recognize core operating commands or reflexes.

---

# 11. Interaction with the hot path

The hot-path runtime contract already freezes the runtime shape.

For lane behavior, that implies:

* `command_lane` must fit the hot-path latency budget
* `dictation_lane` may be slower because it is not the universal hot path
* `conversation_lane` v1 should preserve transcript-first observability before speech-native optimization
* `search_explore_lane` must keep tool calls explicit and auditable
* lane switching must not stall command acceptance

If a chosen path cannot meet the hot-path budget, Maestro should:

* degrade
* narrow the command set
* or refuse explicitly

It should not silently wait forever.

---

# 12. Phonetic hardening

Lane strategy must inherit the phonetic laws already established elsewhere.

That means:

* command lexicon should maximize phonetic survivability
* dangerous commands need stronger distinction
* chooser numerals are safe only inside chooser overlay
* alias tables may act as phonetic shields
* dictation grammar must not inherit command-lane assumptions blindly

The lane strategy and phonetic strategy are separate documents, but they must align tightly.

---

# 13. Error recovery policy by lane

Each lane should recover differently.

## Command lane

Preferred recovery:

* deterministic phonetic correction
* chooser
* refusal

Avoid:

* freeform conversational clarification

## Dictation lane

Preferred recovery:

* preserve text
* limited dictation-control interpretation
* offer correction tools after the fact

## Conversation lane

Preferred recovery:

* explicit clarification turns
* preserve transcript and intent trace
* bounded handoff to command lane only after explicit confirmation

---

# 14. Benchmark dimensions

The benchmarking plan should compare providers and configurations across at least these dimensions:

* p50 latency
* p95 latency
* command exact-match rate
* dangerous-command false-positive rate
* dictation word error rate
* conversation turn-completion latency
* translation adequacy/fluency scores
* search/explore tool-call precision and provenance completeness
* phonetic hazard resilience
* chooser-trigger rate
* repair success rate

No provider should be judged on a single metric only.

---

# 15. Benchmark corpora

Maestro should benchmark with separate corpora per lane.

## A. Reflex corpus

Examples:

* stop
* cancel
* undo
* mute

## B. Core command corpus

Examples:

* focus terminal
* run cargo build
* open definition
* next error

## C. Phonetic hazard corpus

Use the command hazard table and known risky aliases.

## D. Dictation corpus

Examples:

* prose
* notes
* code comments
* mixed punctuation

## E. Conversation corpus

Examples:

* spoken Q&A turns
* explanation and follow-up turns
* command-vs-conversation ambiguity cases

## F. Translation corpus

Examples:

* short imperative sentences across language pairs
* mixed technical vocabulary
* code-adjacent phrases requiring literal preservation

## G. Search/explore corpus

Examples:

* query + filter + compare sequences
* open/summarize/follow chains
* ambiguous "search vs execute" edge cases

This avoids optimizing only for one kind of speech.

---

# 16. Provider selection stance

For v0.2, the right stance is:

* freeze `command_lane` around the strongest local low-latency path
* keep `dictation_lane` benchmark-selectable
* lock `conversation_lane` v1 to cascaded `ASR -> Nexus -> TTS`
* treat `translation_lane` as explicit multilingual text pipeline
* treat `search_explore_lane` as structured-intent + tool-contract lane
* keep all lane boundaries behind provider contracts

That means Maestro stays modular even while choosing concrete near-term defaults.

---

# 17. Fallback and failover behavior

## If `command_lane` fails

Allowed:

* fallback to degraded command lane
* temporary reflex-only mode
* explicit degraded-state notification

Forbidden:

* silently routing command control through a slow remote dictation path

## If `dictation_lane` fails

Allowed:

* pause dictation
* offer fallback provider if policy permits
* preserve raw audio/transcript chunk for retry if allowed

## If `conversation_lane` fails

Allowed:

* fall back to text-first interaction with explicit transcript display
* continue using command/dictation lanes independently
* disable speech-native experiment tracks

## If `search_explore_lane` fails

Allowed:

* return explicit tool-error trace
* keep command lane available
* narrow to basic `search` and `open` intents while degraded

---

# 18. Suggested runtime metadata

Every speech result handed into interpretation should include:

* transcript
* partials if available
* lane
* acoustic confidence
* token uncertainty if available
* speaker metadata when available
* endpointing metadata
* provider_id
* elapsed_ms
* degraded_state flag

This keeps interpretation and policy layers grounded in actual speech conditions.

---

# 19. Laws to freeze

## Law 1

Maestro uses multiple interaction lanes because different speech tasks have different correctness criteria.

## Law 2

Core operating command recognition must remain local-first and hot-path compatible.

## Law 3

Dictation accuracy should not be purchased by weakening deterministic command safety.

## Law 4

Search/explore is grammar-and-tool driven, not freeform command overreach.

## Law 5

Conversation lane v1 is cascaded (`ASR -> Nexus -> TTS`) to preserve transcript auditability and boundary control.

## Law 6

If the primary command path degrades, Maestro should narrow capability explicitly rather than silently improvise.

## Law 7

Phonetic survivability is part of lane strategy, not a separate afterthought.
