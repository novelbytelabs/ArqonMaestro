# Arqon Maestro Multi-Lane TTS Architecture Specification

Version:
0.1 Draft

Status:
Foundational architecture spec

Purpose:
Define the speech synthesis architecture for Arqon Maestro as a multi-lane, role-specialized TTS system that balances quality, latency, resilience, and premium conversational capability.

## 1. Problem Statement

Arqon Maestro does not have a single speech use case.

It must speak in at least four distinct operational regimes:

1. Normal system speech
2. Agent and fallback speech
3. Real-time conversational AI speech
4. Premium conversational AI speech

A single TTS engine cannot optimally satisfy all four regimes at once without sacrificing one or more of the following:

* latency
* quality
* expressive range
* operational resilience
* hardware efficiency

Therefore Maestro adopts a multi-lane TTS architecture.

## 2. Core Decision

Maestro SHALL operate four TTS lanes, each with a narrow and explicit role.

System speech stack:

* Kokoro as the primary default voice lane
* Piper as the resilient backup and agent voice lane

Conversational speech stack:

* Qwen3-TTS 0.6B as the primary real-time conversational lane
* Qwen3-TTS 1.7B as the premium conversational lane

This is not redundancy.
This is specialization.

## 3. Design Principles

### 3.1 Lane specialization over model universalism

Each model exists to do one job well.
No lane should be treated as a universal engine.

### 3.2 Deterministic routing over ad hoc selection

Lane selection MUST be policy-driven, observable, and reproducible.

### 3.3 Fail operationally, not cosmetically

Speech output MUST continue under degraded conditions, even if voice quality drops.

### 3.4 Premium quality is optional, continuity is mandatory

The system may drop from premium to standard quality.
It may not silently fail to speak.

### 3.5 Conversational and non-conversational speech are different classes

System prompts, notifications, confirmations, and agent status speech are not the same class as live conversational AI output and SHALL NOT be routed the same way.

## 4. Architectural Overview

Maestro SHALL define two top-level speech families.

### 4.1 System Speech Family

Used for:

* UI confirmations
* alerts
* workflow narration
* command acknowledgements
* operator prompts
* short agent utterances
* system fallback behavior

Goals:

* low latency
* stability
* low hardware cost
* consistent intelligibility
* graceful degradation

Models:

* Kokoro
* Piper

### 4.2 Conversational Speech Family

Used for:

* LLM dialogue
* interactive assistant responses
* rich spoken exchanges
* emotionally expressive or premium spoken output
* long-form conversational responses

Goals:

* naturalness
* expressive control
* real-time conversational cadence
* multilingual or style-aware capability
* premium voice quality where resources allow

Models:

* Qwen3-TTS 0.6B
* Qwen3-TTS 1.7B

## 5. Lane Definitions

## 5.1 Kokoro Lane

Role:
Primary default voice lane for normal Maestro operation.

Purpose:
Provide the default spoken user experience for day-to-day Maestro speech.

Characteristics:

* good quality
* lightweight
* low overhead
* suitable for primary voices
* preferred for non-conversational normal operation

Allowed use:

* confirmations
* prompts
* system narration
* short assistant responses when conversational stack is unavailable
* general user-facing speech outside premium mode

Disallowed as primary use:

* premium emotional conversation when Qwen lanes are available
* hard-failsafe duty when Piper is healthy

## 5.2 Piper Lane

Role:
Backup lane and agent/failsafe lane.

Purpose:
Guarantee speech continuity under degraded conditions and support lower-priority or agent-class voices.

Characteristics:

* fast
* dependable
* lightweight
* operationally conservative
* suitable for fallback and utility speech

Allowed use:

* backup when Kokoro fails
* agent voices
* fast utility speech
* degraded mode
* low-priority background narration
* emergency continuity mode

Disallowed as default use:

* premium user-facing conversation
* primary premium voice role unless explicitly forced by policy

## 5.3 Qwen3-TTS 0.6B Lane

Role:
Primary conversational AI lane.

Purpose:
Provide the default conversational voice for real-time LLM interaction.

Characteristics:

* conversationally stronger than system lanes
* better expressive behavior
* better fit for live dialogue
* lower cost than the premium lane
* intended balance point between speed and quality

Allowed use:

* live assistant conversation
* interactive responses
* dynamic dialogue
* default conversational mode
* expressive but low-latency speech

Disallowed as primary use:

* static system notifications where Kokoro is sufficient
* premium-only output when 1.7B is available and policy demands premium quality

## 5.4 Qwen3-TTS 1.7B Lane

Role:
Premium conversational lane.

Purpose:
Provide the highest-quality conversational speech available within the Maestro stack.

Characteristics:

* premium voice quality
* best conversational naturalness in the chosen family
* highest cost among the four lanes
* should be invoked selectively, not casually

Allowed use:

* premium voice mode
* high-importance spoken responses
* long-form conversational output
* user-selected premium mode
* demonstrations and showcase experiences

Disallowed as default use:

* utility prompts
* frequent short confirmations
* low-priority status speech
* degraded mode operation

## 6. Routing Policy

Lane selection SHALL be decided by policy, not by model whim.

The routing decision MUST consider at least five inputs:

1. Utterance class
2. Latency budget
3. Hardware availability
4. Degradation state
5. Voice policy or persona policy

## 6.1 Utterance Classes

Maestro SHALL classify every speech request into one of the following:

* System prompt
* Command acknowledgement
* Alert or warning
* Agent utterance
* Conversational response
* Premium conversational response
* Emergency fallback speech

## 6.2 Default Mapping

System prompt:
Kokoro

Command acknowledgement:
Kokoro

Alert or warning:
Kokoro, with Piper as immediate fallback

Agent utterance:
Piper by default, Kokoro optional by persona policy

Conversational response:
Qwen3-TTS 0.6B

Premium conversational response:
Qwen3-TTS 1.7B

Emergency fallback speech:
Piper

## 6.3 Routing Priority

For system speech:
Kokoro -> Piper

For conversational speech:
Qwen3-TTS 0.6B -> Qwen3-TTS 1.7B only when premium is requested or justified by policy

For premium conversational speech:
Qwen3-TTS 1.7B -> Qwen3-TTS 0.6B -> Kokoro -> Piper

This fallback chain preserves continuity while degrading gracefully.

## 7. Degradation and Fallback Policy

Maestro SHALL support explicit speech degradation modes.

### 7.1 Normal Mode

All lanes healthy.
Default policy applies.

### 7.2 Degraded Mode

One or more preferred lanes unavailable or too slow.
System MUST reroute without operator intervention.

Examples:

* Kokoro unavailable -> Piper
* Qwen 1.7B overloaded -> Qwen 0.6B
* Qwen 0.6B unavailable -> Kokoro for minimal continuity

### 7.3 Critical Mode

Conversational stack unavailable or hardware constrained.
System SHALL prioritize intelligibility and continuity over expressiveness.

Default critical-mode voice:
Piper

## 8. Voice Persona Policy

Maestro SHALL separate voice persona from engine identity.

A persona is a logical voice identity.
A lane is a synthesis engine.

This means:

* the same persona may have multiple lane-specific realizations
* the system should preserve voice role semantics across degradation
* voice identity should degrade gracefully rather than collapse arbitrarily

Example:
Primary assistant persona:

* Kokoro realization for normal mode
* Qwen 0.6B realization for conversation mode
* Qwen 1.7B realization for premium mode
* Piper realization for failover mode

This preserves continuity of identity across lane changes.

## 9. Runtime Loading Policy

Logical inclusion of all four models does not require all four to be hot-active at all times.

Maestro SHOULD separate:

* installed lane set
* currently loaded lane set
* currently active lane

### 9.1 Recommended Runtime Policy

Always available:

* Kokoro
* Piper

Conditionally loaded:

* Qwen3-TTS 0.6B when conversational mode is active
* Qwen3-TTS 1.7B only on premium request, premium session, or pre-approved hardware state

This avoids wasting memory while preserving architectural breadth.

## 10. Hardware Policy

Hardware availability SHALL influence lane selection but SHALL NOT alter the logical architecture.

In other words:
the architecture remains four-lane even when a specific deployment cannot hot-run every lane simultaneously.

### 10.1 Low-resource deployments

Prefer:

* Kokoro
* Piper
* Qwen 0.6B only when needed

### 10.2 Premium-capable deployments

Enable:

* all four lanes
* 1.7B premium activation
* more aggressive conversational escalation

## 11. QoS Policy

Every speech request SHALL declare or inherit a quality-of-service profile.

Minimum QoS fields:

* latency priority
* quality priority
* continuity priority
* expressiveness priority
* persona class

### 11.1 Example QoS tiers

Utility:
low latency, low cost, high continuity

Standard:
balanced latency and quality

Conversational:
high naturalness, medium latency budget

Premium: highest quality, lower urgency tolerated

Emergency:
continuity first, everything else second

## 12. Observability Requirements

Maestro SHALL log speech routing decisions.

Every utterance SHOULD capture:

* utterance class
* selected lane
* fallback count
* generation latency
* playback start latency
* playback duration
* model failure reason if rerouted
* degradation mode at time of routing

This is essential because multi-lane architecture only remains elegant if it is inspectable.

## 13. Safety and Operational Constraints

The speech layer SHALL NOT:

* silently switch personas without policy
* loop between lanes repeatedly
* stall waiting indefinitely for a premium lane
* promote premium synthesis when continuity requires fallback
* degrade without recording that degradation in telemetry

The speech layer SHALL:

* fail fast
* reroute deterministically
* preserve intelligibility
* preserve persona semantics where possible

## 14. Non-Goals

This spec does not yet define:

* final voice catalog
* exact phoneme pipeline details
* exact streaming chunk size policy
* exact sentence segmentation rules
* exact GPU scheduler behavior
* crossfading between lane changes
* speaker verification coupling
* TTS content safety filtering policy

Those belong in subordinate specs.

## 15. Acceptance Criteria

The multi-lane TTS architecture is considered implemented when the following are true:

1. Maestro can classify each utterance into a speech class.
2. Maestro can route system speech to Kokoro by default.
3. Maestro can reroute system speech to Piper automatically on failure.
4. Maestro can route conversational speech to Qwen3-TTS 0.6B by default.
5. Maestro can escalate selected conversational requests to Qwen3-TTS 1.7B.
6. Maestro can degrade premium conversation from 1.7B to 0.6B automatically.
7. Maestro can preserve speech continuity even if the conversational family is unavailable.
8. Routing decisions are logged and explainable.
9. Persona identity remains coherent across lane switches.
10. No speech request blocks indefinitely waiting for a better lane.

## 16. Strategic Rationale

This architecture is justified because Maestro is not merely a voice assistant.
It is a voice operating system.

A voice operating system must support:

* ordinary system speech
* resilient fallback speech
* live AI conversation
* premium AI conversation

The four-lane design is therefore not excess.
It is the minimum architecture that allows Maestro to be:

* high quality
* low latency
* resilient
* premium-capable

## 17. Final Position

Arqon Maestro SHALL adopt a four-lane TTS architecture:

System layer:

* Kokoro primary
* Piper fallback

Conversational layer:

* Qwen3-TTS 0.6B primary
* Qwen3-TTS 1.7B premium

This architecture SHALL be treated as canonical unless superseded by a future spec revision.

## 18. Recommended Next Documents

The best follow-on docs after this are:

1. Maestro TTS Routing Policy
2. Maestro Voice Persona Specification
3. Maestro TTS Runtime and Loading Policy
4. Maestro Conversational Speech QoS Spec
5. Maestro Speech Failure and Degradation Handling Spec

This is already strong enough to serve as the canonical parent spec. The next move should be splitting it into a roadmap-compatible doc set with this as the root and the others as subordinate operational specs.
