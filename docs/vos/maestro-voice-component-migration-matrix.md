# Voice Component Migration Matrix

## Purpose

This document is the bridge between:

* the legacy Serenade voice stack
* the modernized Maestro voice-plane target
* the actual implementation sequence in `maestro-project-roadmap.md`

**Governance rule:**

* `maestro-project-roadmap.md` owns official phase truth and sequencing
* this document owns the component-level migration picture for the voice plane
* if they conflict, the roadmap wins
* no document may claim Phase 2A or 2C is truly active if Waves A-D are not complete

It exists to prevent three common failures:

* treating old Serenade assumptions as if they are still valid
* choosing new components without a clear service home or migration order
* attempting Phase 2A or Phase 2C before the voice plane can actually support them

This document is not the canonical roadmap.

**Governance rule:**

* `maestro-project-roadmap.md` owns official phase truth and sequencing
* this document owns the component-level migration picture for the voice plane

## Scope

This document covers the voice-plane component stack only:

* audio capture
* denoise
* VAD / turn-taking
* STT
* transcript / voice ingress adaptation
* speaker diarization
* speaker verification
* wakeword
* TTS
* desktop voice actuation dependencies where relevant

It does not own:

* full workflow/delegation implementation
* full executor policy
* Nexus orchestration
* Phase 4 focus/runtime completion work

## Architectural rule

Maestro's voice plane is modular by contract.

The following must remain separate replaceable services rather than collapse into one monolithic speech engine:

* denoise
* VAD / turn detection
* STT
* speaker identity
* wakeword
* TTS

## Migration status model

Use these status labels consistently:

* **LEGACY** — inherited from Serenade-era assumptions or implementation
* **REUSABLE** — can remain with boundary refactoring
* **REPLACE** — should be retired and replaced
* **ADD** — new capability not meaningfully present before
* **DEFER** — intentionally not required for v0.1 correctness

## Migration matrix

| Voice function                        | Legacy Serenade reality                                  | Target decision                                                                | Migration action        | Target runtime home                  | Priority | Blockers / notes                                                                                | Why this decision                                                                               |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------- | ------------------------------------ | -------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Audio capture                         | Native recorder addon and existing local microphone path | Preserve the concept, modernize the contract boundary                          | **REUSABLE**            | `maestro-audio`                      | P0       | Needs stable API boundary, timestamps, device handling, gain normalization review               | The shape is already right; the boundary is what needs modernization                            |
| Noise reduction / enhancement         | No clearly first-class dedicated denoise contract        | `RNNoise`                                                                      | **ADD**                 | `maestro-audio`                      | P0       | Must be benchmarked for hot-path latency impact                                                 | Real-time denoise is now a first-class requirement, especially before speaker and STT hardening |
| VAD / turn gating                     | Two-stage VAD pattern using WebRTC VAD + Silero VAD      | Preserve two-stage idea, center on `Silero VAD`, optional fast first-pass gate | **REUSABLE + UPGRADE**  | `maestro-turn`                       | P0       | Must align with barge-in, cancel, and dictation pause semantics                                 | Serenade already had the right pattern idea; Maestro needs a stronger contract around it        |
| Command-fast STT                      | Older Kaldi/OpenFST-style local speech engine            | `whisper.cpp`                                                                  | **REPLACE**             | `maestro-stt-fast`                   | P0       | Must prove low-latency command performance on local hardware                                    | Best fit for local deterministic command lane                                                   |
| Dictation-accurate STT                | Same older speech engine family                          | `faster-whisper`                                                               | **REPLACE**             | `maestro-stt-accurate`               | P0       | Must prove dictation quality and lane-switch correctness                                        | Better fit for heavier accurate lane than forcing one engine to do both jobs                    |
| Partials / transcript envelope        | Existing Serenade protocol flow and transcript handling  | Preserve concept, enrich ingress metadata                                      | **REUSABLE + REFACTOR** | `maestro-voice-adapter`              | P0       | Needs explicit metadata contract for mode, timestamps, route hints, interruption, speaker state | Maestro requires structured ingress, not naked transcript text                                  |
| Speaker diarization                   | No clear first-class public component in legacy baseline | `pyannote.audio`                                                               | **ADD**                 | `maestro-speaker-diarization`        | P1       | Should be isolated from hot reflex lane; secure/shared-room integration required                | Best dedicated fit for diarization contract                                                     |
| Speaker verification / authentication | No clear first-class public component in legacy baseline | `WeSpeaker` (provisional default - requires bake-off against SpeechBrain ECAPA-TDNN and NVIDIA NeMo before lock-in) | **ADD**                 | `maestro-speaker-verification`       | P1       | Requires enrollment lifecycle, persistence, confidence thresholds, policy hooks; **provisional default - requires benchmark bake-off before treating as final**                 | Needed for real Phase 2A completion                                                             |
| Wakeword                              | Explicit listening / manual activation posture           | `openWakeWord` later if needed                                                 | **DEFER**               | `maestro-wake`                       | P3       | Not required for v0.1; should not block core correctness                                        | Wakeword is useful, but not foundational for safe VOS execution                                 |
| Desktop automation dependency         | `serenade-driver` and native automation concepts         | Preserve concept behind stronger contracts                                     | **REUSABLE + REFACTOR** | `maestro-executor` and adapter layer | P0       | Must stay governed by policy and routing evidence; **retained downstream dependency, not core voice-plane modernization**                                             | One of Serenade's strongest retained assets                                                     |
| TTS primary                           | No modern Kokoro-era baseline in Serenade                | `Kokoro`                                                                       | **ADD**                 | `maestro-tts-broker`                 | P1       | Must prove interruption-safe playback and persona routing                                       | Strong modern local-first default                                                               |
| TTS fallback                          | No direct equivalent in legacy baseline                  | `Piper`                                                                        | **ADD**                 | `maestro-tts-broker`                 | P1       | Must support fallback policy and availability checks; **NOTE**: Old `rhasspy/piper` repo was archived Oct 2025, development moved to **OHF-Voice/piper1-gpl** - update docs to reflect current active repo and license                                          | Practical local fallback when primary path is unavailable                                       |

## Migration waves

The voice plane should be modernized in four explicit waves.

These waves are prerequisites for later roadmap phases.

### Wave A — Audio Front-End Modernization

Goal:

Establish a stable and modern audio front end for Maestro before replacing STT or identity layers.

Includes:

* audio capture boundary cleanup
* RNNoise integration
* turn-detection/VAD contract hardening
* measurable barge-in and interrupt behavior

Current implementation note (2026-03-18):

* Patch 3 now runs `SileroVadProvider` in **shadow mode** alongside the primary `DefaultVadProvider`
* live chunk transitions still follow the primary provider (no silent cutover)
* turn-layer events now include `speech_start`, `speech_end`, `barge_in_candidate`, and `interrupt_candidate`
* shadow comparison telemetry is emitted per frame for agreement/disagreement analysis

Roadmap relationship:

* prerequisite for Wave B
* prerequisite for reliable Phase 2A and 2C later

### Wave B — STT Lane Modernization

Goal:

Replace legacy speech recognition assumptions with explicit modern STT lanes.

Includes:

* `maestro-stt-fast` using `whisper.cpp`
* `maestro-stt-accurate` using `faster-whisper`
* lane-selection policy
* transcript normalization alignment

**Planning note:** The system must preserve room for the later **secure speaker-aware lane** described in the STT strategy doc, even if v0.1 implementation starts with command-fast and dictation-accurate only.

Roadmap relationship:

* prerequisite for Phase 2A
* prerequisite for strong benchmark work in Phase 3A

### Wave C — Speaker Identity Stack

Goal:

Make speaker identity real enough to support secure mode, shared-room mode, and policy-gated risky actions.

Includes:

* diarization
* speaker verification
* enrollment contract
* speaker-state propagation into authorization flow

Roadmap relationship:

* hard prerequisite for Phase 2A

### Wave D — TTS Broker Modernization

Goal:

Replace ad hoc output assumptions with a real brokered output path.

Includes:

* Kokoro primary path
* Piper fallback path (**NOTE**: use OHF-Voice/piper1-gpl, not archived rhasspy/piper)
* interruption-safe stop
* persona routing
* output-class handling for acknowledgment vs warning vs cognitive speech

Roadmap relationship:

* hard prerequisite for Phase 2C

## Exit evidence by wave

### Wave A exit evidence

* RNNoise is integrated and can be toggled or configured through a stable local contract
* turn boundaries are measurable under the selected VAD strategy
* barge-in and cancel behavior can be demonstrated reliably
* `maestro-audio` and `maestro-turn` boundaries are documented and testable

### Wave B exit evidence

* `whisper.cpp` command-fast lane is wired and exercised through the runtime
* `faster-whisper` dictation-accurate lane is wired and exercised through the runtime
* lane selection logic is explicit, measurable, and benchmarkable
* transcript normalization remains compatible with the hot-path command contract

### Wave C exit evidence

* diarization returns real speaker segments from live or replayed audio
* speaker verification supports enrollment and comparison against enrolled profiles
* secure/shared-room policies can consume actual speaker state
* Phase 2A no longer depends on stubbed speaker assumptions

### Wave D exit evidence

* Kokoro primary voice works through the broker contract
* Piper fallback works through the broker contract
* interruption-safe stop works during live playback
* persona routing resolves correctly and predictably
* Phase 2C no longer depends on placeholder output assumptions

## Revised execution order

This is the actual execution sequence implied by the roadmap.

1. Wave A — Audio Front-End Modernization
2. Wave B — STT Lane Modernization
3. Wave C — Speaker Identity Stack
4. Wave D — TTS Broker Modernization
5. Phase 2A — Identity and safety gating
6. Phase 2C — Output and feedback system
7. Phase 2B — Workflow and delegation
8. Phase 3 — Hardening
9. Phase 4 — VOS Runtime Completion

## Key planning consequences

The following rules now apply:

* Phase 2A must not begin until Wave C is complete
* Phase 2C must not begin until Wave D is complete
* Phase 2B may proceed in parallel if it does not assume unfinished voice-plane contracts
* wakeword work must not delay v0.1 implementation
* old Serenade voice assumptions must not be treated as production-ready without explicit review

## Open implementation questions

These questions should be answered during migration, not ignored:

* Should RNNoise live in-process with `maestro-audio`, or behind a sidecar/service boundary?
* Should the fast first-pass gate remain WebRTC-based, or be retired if Silero alone is sufficient?
* What exact lane-selection policy decides command-fast vs dictation-accurate?
* What confidence thresholds are required before speaker verification state can affect authorization?
* How should persona routing and fallback behave when Kokoro is unavailable?
* What part of the old recorder path is reusable without carrying old architectural debt forward?

## References

Primary references:

* `maestro-project-roadmap.md`
* `maestro-stt-strategy-by-lane.md`
* `maestro-tts-persona-multi-agent-voice.md`
* `maestro-voice-identity-security-architecture.md`
* `maestro-hot-path-runtime-contract.md`
* `ultimate-vos-reference-architecture.md`

Supporting references:

* legacy Serenade voice-path files
* current Maestro runtime files under `client/src/main/runtime/`
* decision-log entries affecting voice-plane sequencing

## Summary

This document exists to keep Maestro honest during revival.

The goal is not to cosmetically modernize Serenade.

The goal is to preserve what was structurally strong in Serenade while replacing outdated voice components with a modern, local-first, contract-driven voice plane suitable for a real VOS.
