# Maestro STT Strategy By Lane v0.1

## Purpose

Maestro should not treat speech recognition as one monolithic service.

A Voice Operating System has multiple speech jobs with different success criteria:

* reflex interruption
* deterministic command recognition
* accurate dictation
* speaker-aware secure operation
* degraded-mode survivability

This document defines:

* the STT lanes Maestro should support
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
* the best engine for secure execution may need stronger speaker-aware metadata even if it is not the fastest

So Maestro should optimize speech recognition by lane, not by one global leaderboard.

---

# 2. Lane model

For v0.1, Maestro should support at least three explicit STT lanes and one optional degraded sub-lane.

## A. `command_fast`

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

## B. `dictation_accurate`

Purpose:

* free text entry
* code comments, notes, prose
* longer-form speech where literal text matters

Optimizes for:

* textual accuracy
* punctuation quality
* longer utterance handling
* lower false command rate

## C. `secure_speaker_aware`

Purpose:

* medium/high-impact commands in secure or shared-room modes
* cases where speaker-aware metadata is materially important

Optimizes for:

* identity-aware signal quality
* lower false-positive command acceptance
* conservative gating behavior

## D. `degraded_command`

Purpose:

* emergency or fallback command path when primary command STT is unavailable or over budget

Optimizes for:

* a small, reliable control vocabulary
* minimal dependency footprint

This is not a full-feature lane.
It is a survivability lane.

---

# 3. The lane-routing rule

Maestro should decide STT lane from:

* current interaction mode
* security mode
* utterance class when detectable early
* active overlay state
* whether playback/interruption is active
* whether the system is in degraded operation

## Typical routing

* command mode -> `command_fast`
* chooser mode -> `command_fast`
* repair lane -> `command_fast`
* dictation mode -> `dictation_accurate`
* secure/shared-room + sensitive action path -> `secure_speaker_aware`

If uncertainty remains, Maestro should prefer a safer lane rather than a more permissive one.

---

# 4. Command-fast lane

This is the most important lane for VOS feel.

## Requirements

* local-first
* hot-path compatible
* fast endpointing
* strong support for canonical command vocabulary
* supports partials and low-latency finalization

## Near-term baseline

The command-fast baseline is now explicitly **customization-first**:

* modern CTC acoustic front end (`Conformer-CTC` or `Parakeet-CTC` class)
* constrained decoding (`WFST` / Flashlight / equivalent)
* custom lexicon + pronunciation controls
* Maestro grammar/parser enforcement for bounded command behavior

This aligns with Maestro's control-plane requirements:

* deterministic command rejection
* grammar-aware command interpretation
* command vocabulary control without forcing dictation-oriented decoding behavior

## Success criteria

* command utterances finalize quickly
* canonical verbs and objects survive common STT errors
* chooser and repair loops stay responsive
* latency is more important than dictation-perfect prose output

---

# 5. Dictation-accurate lane

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

Do not freeze one engine just because it is the command-fast baseline.

---

# 6. Secure speaker-aware lane

This lane exists because security-sensitive voice control has different constraints than ordinary command recognition.

## Requirements

* integrates with speaker verification state
* is conservative under contamination
* supports stronger confidence thresholds
* produces metadata useful for identity gating

## Important boundary

This lane does not replace authorization.

It improves the speech-side evidence used by authorization and policy.

## Use cases

* secure mode with medium/high-risk actions
* shared-room mode when the command would otherwise be allowed
* elevated confirmation flows

---

# 7. Degraded command lane

If Maestro loses its main command STT path, it should not become completely voiceless.

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

# 8. Local-only vs hosted-optional policy

## Must remain local

The following must stay local for v0.1:

* reflex recognition
* command-fast lane
* degraded command lane
* lane selection needed for hot-path control

Why:

* hot-path latency
* interruption safety
* privacy and resilience
* fail-closed behavior under network issues

## Hosted-optional

The following may use hosted or heavier providers if bounded by policy:

* dictation-accurate enhancement
* post-hoc transcript improvement
* offline transcript cleanup

## Important rule

No remote dependency should be required to recognize core operating commands or reflexes.

---

# 9. Interaction with the hot path

The hot-path runtime contract already freezes the runtime shape.

For STT specifically, that implies:

* `command_fast` must fit the hot-path latency budget
* `secure_speaker_aware` must use local or cached identity state for gating
* `dictation_accurate` may be slower because it is not the universal hot path
* lane switching must not stall command acceptance

If a chosen STT path cannot meet the hot-path budget, Maestro should:

* degrade
* narrow the command set
* or refuse explicitly

It should not silently wait forever.

---

# 10. Phonetic hardening

STT strategy must inherit the phonetic laws already established elsewhere.

That means:

* command lexicon should maximize phonetic survivability
* dangerous commands need stronger distinction
* chooser numerals are safe only inside chooser overlay
* alias tables may act as phonetic shields
* dictation grammar must not inherit command-lane assumptions blindly

The STT lane strategy and phonetic strategy are separate documents, but they must align tightly.

---

# 11. Error recovery policy by lane

Each lane should recover differently.

## Command-fast

Preferred recovery:

* deterministic phonetic correction
* chooser
* refusal

Avoid:

* freeform conversational clarification

## Dictation-accurate

Preferred recovery:

* preserve text
* limited dictation-control interpretation
* offer correction tools after the fact

## Secure speaker-aware

Preferred recovery:

* confirmation
* stronger refusal
* higher threshold for auto-correction

Why:

When security matters, recovery should become more conservative.

---

# 12. Benchmark dimensions

The benchmarking plan should compare providers and configurations across at least these dimensions:

* p50 latency
* p95 latency
* command exact-match rate
* dangerous-command false-positive rate
* dictation word error rate
* phonetic hazard resilience
* chooser-trigger rate
* repair success rate
* speaker-aware metadata quality where applicable

No provider should be judged on a single metric only.

---

# 13. Benchmark corpora

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

## E. Secure speaker corpus

Examples:

* enrolled speaker samples
* contamination/noise cases
* shared-room simulations

This avoids optimizing only for one kind of speech.

---

# 14. Provider selection stance

For v0.1, the right stance is:

* freeze `command_fast` around the strongest local low-latency path
* keep `dictation_accurate` benchmark-selectable
* treat `secure_speaker_aware` as a policy-driven lane with stronger metadata needs
* keep all lane boundaries behind provider contracts

That means Maestro stays modular even while choosing concrete near-term defaults.

---

# 15. Fallback and failover behavior

## If `command_fast` fails

Allowed:

* fallback to degraded command lane
* temporary reflex-only mode
* explicit degraded-state notification

Forbidden:

* silently routing command control through a slow remote dictation path

## If `dictation_accurate` fails

Allowed:

* pause dictation
* offer fallback provider if policy permits
* preserve raw audio/transcript chunk for retry if allowed

## If `secure_speaker_aware` fails

Allowed:

* gate sensitive commands
* downgrade to confirmation-required flows
* block privileged actions

Identity-sensitive failure should increase caution, not lower it.

---

# 16. Suggested runtime metadata

Every STT result handed into interpretation should include:

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

This keeps the interpreter and policy layers grounded in actual speech conditions.

---

# 17. Laws to freeze

## Law 1

Maestro uses multiple STT lanes because different speech tasks have different correctness criteria.

## Law 2

Core operating command recognition must remain local-first and hot-path compatible.

## Law 3

Dictation accuracy should not be purchased by weakening deterministic command safety.

## Law 4

Speaker-aware secure operation strengthens policy evidence but does not replace authorization.

## Law 5

If the primary command STT path degrades, Maestro should narrow capability explicitly rather than silently improvise.

## Law 6

Phonetic survivability is part of STT strategy, not a separate afterthought.

## Law 7

Providers sit behind lane contracts; no single engine owns Maestro’s future permanently.

## Law 8

STT evaluation must be lane-specific and benchmarked against real VOS tasks, not generic transcription scores alone.

---

# 18. What this unlocks

Once this strategy is frozen, Maestro can implement:

* a fast command path
* a distinct dictation path
* stronger secure-mode speech handling
* explicit degraded operation behavior
* benchmark-driven provider selection without architectural drift

That is how speech recognition becomes a governed subsystem of the VOS instead of a blob hidden behind one API call.
