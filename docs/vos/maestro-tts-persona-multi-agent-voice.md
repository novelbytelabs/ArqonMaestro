# Maestro TTS Persona and Multi-Agent Voice Design v0.1

## Purpose

Voice output is not just “play audio.”

For a Voice Operating System, output speech must answer:

* who is speaking
* what kind of message this is
* whether the message may interrupt
* how warnings differ from ordinary assistant speech
* how multiple agents avoid becoming a chaotic chorus

This document defines:

* the TTS persona model
* default voice versus agent voices
* warning and sentinel voice behavior
* arbitration rules for multiple speakers
* user preferences and voice packs

Without this, Maestro may gain many agents and many capabilities, but still sound like one mushy, untrustworthy stream.

---

# 1. Core principle

## The system should route by persona, not by raw voice ID

Provider-specific voices are implementation details.

The durable design asset is the **persona layer**:

* default_system
* architect_agent
* research_agent
* memory_agent
* warning_sentinel

That way:

* providers can change
* fallback voices can exist
* agent identity can remain stable across sessions

The user should learn **who** is speaking, not memorize vendor voice IDs.

---

# 2. Voice architecture layers

The output stack should separate four concepts.

## A. Provider

Examples:

* Kokoro
* Piper
* future providers

## B. Voice

A concrete provider-specific voice asset.

Example:

* provider voice ID

## C. Voice profile

A governed profile that adds:

* style
* fallback
* allowed usage classes
* latency expectations

## D. Persona

A semantic identity mapped to a voice profile.

This is the level the VOS should route on.

---

# 3. TTS broker rule

The architecture already points toward a TTS broker, and this document assumes that model.

The TTS broker should own:

* provider selection
* persona resolution
* interruption-safe playback
* fallback policy
* priority arbitration
* voice routing rules

This means the operating system should not call provider voices directly from arbitrary subsystems.

---

# 4. The first persona set

For v0.1, Maestro should freeze a small persona set.

## A. `default_system`

Purpose:

* ordinary acknowledgments
* neutral explanations
* low-stress operating feedback

## B. `assistant_continuity`

Purpose:

* Nexus-style guidance
* long-horizon assistance
* contextual suggestions

## C. `architect_agent`

Purpose:

* architectural guidance
* system-design review
* strategic planning output

## D. `research_agent`

Purpose:

* exploratory findings
* comparative analysis
* information synthesis

## E. `warning_sentinel`

Purpose:

* policy warnings
* risky action alerts
* urgent integrity notices

This persona should feel distinct enough that the user immediately recognizes caution.

---

# 5. Default voice vs agent voices

The system should support two simultaneous ideas:

## A. One user-default voice

This is the common voice for:

* basic acknowledgments
* routine system responses
* ordinary operating dialogue

## B. Named agent voices

Named agents may speak with distinct personas when:

* agent identity matters
* the user benefits from attribution
* the interaction is not overloaded

Important rule:

Agent voices are not a toy flourish.
They are a recognition and trust mechanism.

---

# 6. Warning and sentinel voice behavior

Warnings should not sound like ordinary assistant banter.

The warning/sentinel persona should be:

* distinctive
* concise
* high-salience
* sparing

Use cases:

* blocked privileged action
* secure-mode warning
* destructive confirmation
* route downgrade warning
* integrity alarm

Do not use the warning persona for normal informational chatter.

---

# 7. Multi-agent arbitration

When multiple agents want to speak, the system needs an arbitration law.

## Priority classes

### P1: reflex / stop / safety

Always highest.
May interrupt anything.

### P2: warning / sentinel / critical policy

May interrupt ordinary speech.

### P3: user-addressed direct response

The active answer to what the user just asked.

### P4: assistant continuity / guidance

Helpful but not urgent.

### P5: background or passive informational speech

Lowest priority.

The broker should route by priority before persona.

---

# 8. Interruption rules

The TTS system must support interruption-safe voice behavior.

## Allowed interruptions

* reflex stop
* urgent safety warning
* explicit user override

## Usually disallowed interruptions

* one assistant persona cutting off another for noncritical reasons
* low-value notifications interrupting active response

## Barge-in rule

User speech should be able to interrupt TTS promptly.

This is a Voice OS, not an IVR.

---

# 9. Speech styles by message class

Not every message needs the same style.

## Acknowledgment style

Examples:

* done
* focused terminal
* build started

Properties:

* brief
* often interruptible
* sometimes suppressible

## Guidance style

Examples:

* plan proposal
* next-step recommendation

Properties:

* calmer
* slightly longer
* often associated with assistant-continuity or agent persona

## Warning style

Examples:

* destructive action warning
* secure-mode refusal

Properties:

* short
* high-salience
* lower tolerance for suppression

---

# 10. User preferences

Users should be able to control the voice layer without changing system semantics.

Allowed preference targets:

* default system voice
* agent voice mappings
* warning voice
* verbosity level
* whether some categories collapse into one voice
* voice-pack enablement
* fallback preference

Forbidden preference effects:

* weakening warning requirements
* muting critical safety notices by accident
* changing the meaning of persona categories

Preferences may style output.
They may not erase safety classes.

---

# 11. Voice pack model

The system should support voice packs as curated collections of:

* voice profiles
* persona mappings
* fallback mappings
* style metadata

This allows:

* local customization
* stable persona identity
* provider portability

Voice packs should map personas to profiles, not couple the entire OS to one provider.

---

# 12. Fallback policy

TTS providers will fail sometimes.

The broker should follow explicit fallback rules:

* resolve persona to preferred profile
* if unavailable, use persona-specific fallback profile
* if that fails and fallback is allowed, use system fallback provider
* if fallback is disallowed, fail closed and log

This aligns with the existing TTS decision log and prevents silent nonsense.

---

# 13. Locality and provider posture

The architecture already points to:

* Kokoro as the primary provider
* Piper as a local fallback

The design rule should remain:

* providers are replaceable
* the broker contract is durable
* voice identity should survive provider change

That means Maestro should never hard-code product identity to a single engine.

---

# 14. Agent identity and voice identity

Agent identity includes voice identity.

This matters because:

* multiple agents may participate in one session
* the user should recognize who is speaking quickly
* trust and attribution improve when identity is obvious

But the system should still avoid theatrical excess.

The goal is clarity, not novelty.

---

# 15. Minimal v0.1 broker API

Conceptually, the TTS broker should support operations like:

* `speak(message, persona, priority, interruptible)`
* `stop()`
* `pause()`
* `resume()`
* `resolve_persona(persona)`
* `set_default_voice(profile_id)`
* `set_agent_voice(agent_id, profile_id)`

This is enough to support a real multi-agent voice runtime without overdesign.

---

# 16. Voice profile registry

The broker should maintain a voice profile registry with fields such as:

* profile_id
* provider_id
* provider_voice_id
* persona_tags
* fallback_profile_id
* latency_class
* quality_class
* local_available
* warning_allowed

This registry is the right place for portability and governance.

---

# 17. Example routing rules

## Example 1: normal acknowledgment

Event:

* focus terminal succeeded

Route:

* `default_system`

## Example 2: Nexus-style plan suggestion

Event:

* assistant continuity proposes workspace prep

Route:

* `assistant_continuity`

## Example 3: destructive action warning

Event:

* delete file requires confirmation

Route:

* `warning_sentinel`

## Example 4: two agents want to speak

Event:

* research result arrives while warning is active

Route:

* warning speaks first
* research is deferred or summarized later

---

# 18. What the voice layer must not do

The voice layer must not:

* hide which subsystem is speaking when attribution matters
* let low-priority voices interrupt high-priority safety messages
* bind the system permanently to one provider
* make warning messages sound indistinguishable from casual assistant output
* turn every agent into an overdramatic theater cast

Voice identity should improve clarity, not create noise.

---

# 19. Laws to freeze

## Law 1

The system routes speech output by persona, not by raw provider voice ID.

## Law 2

The TTS broker is the authority for provider selection, persona resolution, interruption, and fallback.

## Law 3

Warning and sentinel speech must remain distinguishable from ordinary assistant output.

## Law 4

User speech and reflex interruption outrank ongoing TTS playback.

## Law 5

Agent voices are identity and trust tools, not cosmetic garnish only.

## Law 6

Voice preferences may style output but may not erase safety-critical message classes.

## Law 7

No single TTS provider may become a hard architecture lock-in.

## Law 8

Multi-agent voice behavior must optimize for attribution, priority, and interruption safety rather than maximal chatter.

---

# 20. What this unlocks

Once this design is frozen, Maestro can support:

* a stable default voice
* distinct agent identities
* warning/sentinel salience
* interruption-safe TTS
* provider fallback without identity collapse

That is how voice output becomes part of the operating system rather than just an accessory.
