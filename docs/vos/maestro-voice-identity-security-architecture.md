# Maestro Voice Identity and Speaker Security Architecture v0.1

## Purpose

Maestro is not just a speech recognizer.
It is a Voice Operating System with real execution power.

That means the system must answer five different questions cleanly:

* who is speaking
* whether that speaker matches an enrolled identity
* what that identity is allowed to do
* how security mode changes behavior
* which commands must remain available even under uncertainty

This document defines the architecture for:

* diarization
* speaker verification
* authorization
* enrollment
* secure mode
* shared-room mode
* always-available commands
* identity-gated commands

Without this layer, high-impact voice control will never become trustworthy.

---

# 1. Core principle

## Identity gates authority, not language meaning

Voice identity should not change what commands mean.

It should change:

* whether a command is allowed
* whether confirmation is required
* whether a route is safe enough
* whether Maestro should ask for clarification

So:

* `delete file secrets.toml` always means the same thing
* but whether it can execute depends on:
  * who is speaking
  * how certain the system is
  * which security mode is active

This keeps language constitutional while making authority contextual.

---

# 2. The three distinct identity functions

These functions must not be collapsed into one vague “voice auth” feature.

## A. Diarization

Question:

* how many speakers are present or alternating

Purpose:

* detect speaker changes
* separate contaminated utterances
* increase caution in shared environments

Diarization does **not** prove who the speaker is.

## B. Verification

Question:

* does this speaker match an enrolled identity profile

Purpose:

* establish confidence that the active speaker is a known person

Verification does **not** by itself decide permission.

## C. Authorization

Question:

* what is this verified speaker allowed to do right now

Purpose:

* gate risky commands
* enforce secure/shared-room policy
* constrain route selection and fallback

Authorization is where actual security decisions happen.

---

# 3. The security pipeline

For v0.1, the voice security path should look like:

```text
speech
  ↓
diarization / contamination check
  ↓
speaker verification
  ↓
identity state
  ↓
authorization policy
  ↓
command/workflow route decision
```

This means identity is part of execution gating, not merely post-hoc logging.

---

# 4. Identity states

Maestro should maintain a small explicit speaker state model.

## States

* unknown
* unverified_known_candidate
* verified_primary
* verified_secondary
* verified_delegate
* contaminated

## Meaning

### unknown

No trusted identity match.

### unverified_known_candidate

A likely enrolled speaker is detected, but confidence is below execution threshold.

### verified_primary

The primary sovereign user is verified.

### verified_secondary

An enrolled non-primary person is verified.

### verified_delegate

A delegated non-human authority may act through policy, not through voiceprint.
This state matters when Nexus or another governed agent proposes action on behalf of the user.

### contaminated

Multiple speakers, unclear separation, or noisy conditions make identity confidence unreliable.

---

# 5. Identity roles

Verification answers who the speaker likely is.
Authorization requires role.

Suggested v0.1 roles:

* sovereign_owner
* approved_user
* household_user
* guest
* delegated_agent

## sovereign_owner

Highest human authority.
Can authorize privileged operations subject to policy.

## approved_user

An enrolled trusted human with meaningful but narrower permissions.

## household_user

Recognized speaker with limited low-risk interaction rights.

## guest

Unverified or unknown person.

## delegated_agent

A non-human authority acting through explicit delegation contracts, not through voice biometrics.

This role matters for Nexus, not for raw voiceprint alone.

---

# 6. Enrollment model

Speaker trust should be earned through enrollment, not assumed.

## Enrollment artifacts

Each enrolled identity should have:

* identity_id
* display_name
* role
* enrolled_voice_profile
* allowed_modes
* authority_scope
* verification_threshold
* last_verified_at
* revocation_status

## Enrollment flow

1. explicit user consent
2. voice sample capture across multiple utterances
3. profile creation
4. threshold calibration
5. policy assignment
6. revocation and refresh support

Enrollment is a security act.
It should be inspectable and reversible.

---

# 7. Security modes and identity behavior

Identity policy should integrate directly with Maestro’s existing security modes.

## normal

Behavior:

* low-risk commands may run without strong identity
* medium/high-risk commands may still require confirmation or verification

## secure

Behavior:

* stronger verification required for medium/high-risk commands
* fallback routes become more restricted
* destructive actions demand explicit confirmation or refusal

## shared_room

Behavior:

* treat contamination risk as elevated
* increase explicitness requirements
* reduce automatic medium/high-impact execution
* tighten fallback and auto-correction rules

## restricted

Behavior:

* only a limited command set is allowed
* identity uncertainty should push toward refusal, not guesswork

## privileged_confirm

Behavior:

* temporary elevated posture after verification and confirmation
* expires quickly after the privileged action window closes

---

# 8. Always-available commands

Some commands must remain available even when speaker identity is uncertain.

These should be globally available unless a stronger safety reason forbids them:

* stop
* cancel
* pause
* mute
* wake
* sleep
* no

Possibly also:

* undo, when safe and already scoped to the current user/session

These commands are allowed because they reduce harm rather than create new authority.

---

# 9. Identity-gated commands

Commands should become identity-gated based on risk and effect.

## Low-risk examples

Usually allowed with weak or no verification:

* focus terminal
* scroll down
* next tab
* show sidebar

## Medium-risk examples

Often require confirmation, clearer targets, or stronger verification:

* run build
* open logs
* switch workspace
* send draft to review queue

## High-risk examples

Require strong verification and/or stronger policy:

* delete file
* rename critical artifact
* execute arbitrary shell command
* approve system-wide change

## Privileged examples

Require sovereign authority or explicit delegation:

* modify secure policy
* elevate permissions
* perform admin/system mutation
* ratify high-impact governance changes

---

# 10. Confirmation policy by identity confidence

Identity should affect confirmation thresholds.

## Verified primary

Allowed behavior:

* low-risk commands may execute silently
* medium-risk commands may use standard confirmation policy
* high-risk commands may still require confirmation

## Verified secondary

Allowed behavior:

* narrower authority scope
* more confirmation for medium/high-risk actions
* privileged actions usually blocked

## Unverified or contaminated

Allowed behavior:

* low-risk commands may still be allowed
* medium-risk commands often require confirmation or refusal
* high-risk and privileged actions should usually be blocked

Identity confidence should tighten policy.
It should never loosen it silently.

---

# 11. Shared-room and contamination policy

Shared-room mode exists because voice is not a private channel by default.

When contamination is detected:

* suspend high-impact execution
* reduce fallback autonomy
* prefer chooser or refusal over silent execution
* require stronger identity evidence for medium/high-risk actions

This should apply even if one enrolled speaker is likely present.

The problem is not only “who might this be.”
It is also “who else might be influencing the utterance.”

---

# 12. Identity in the hot path

Voice security must integrate with the hot path without breaking responsiveness.

For v0.1:

* identity checks needed for immediate gating should use local or cached state
* reflex commands must stay fast even when verification is unavailable
* identity uncertainty should produce:
  * confirmation
  * chooser
  * refusal
  * or route restriction

It should not produce hot-path stalls.

If speaker verification is unavailable:

* allow low-risk commands conservatively
* block or gate sensitive commands
* record degraded security state

---

# 13. Delegated non-human authority

Maestro must distinguish:

* a human speaking directly
* an agent proposing or requesting action on the user’s behalf

This matters especially for Nexus.

Rules:

* delegated agents do not satisfy human voice verification
* delegated authority must come from explicit policy grants
* delegation should be scoped, inspectable, and revocable
* Maestro should treat delegated authority separately from speaker identity

This is how the system remains coherent when the assistant learns to act for the user without pretending to be the user.

---

# 14. Audit model

Every sensitive execution should record:

* speaker_state
* identity_id if verified
* role
* security_mode
* contamination_state
* verification_confidence
* confirmation_applied
* route_selected
* command/workflow_id

This is necessary for:

* replay
* security review
* user trust
* delegation audit

---

# 15. What voice identity must not do

Voice identity must not:

* redefine canonical language meaning
* silently grant privileged authority because a voice sounds familiar
* allow preference learning to bypass security policy
* replace command legality checks
* become a hard dependency for low-risk reflex safety commands

Identity is a security layer, not a substitute for the rest of the architecture.

---

# 16. Example policy outcomes

## Example 1: `focus terminal`

Speaker:

* unknown

Policy:

* likely allowed in normal mode
* may still be allowed in shared-room mode

## Example 2: `run cargo build`

Speaker:

* unknown

Policy:

* maybe allowed in normal mode
* more likely gated in secure/shared-room mode depending route and scope

## Example 3: `delete file secrets.toml`

Speaker:

* unverified

Policy:

* blocked or strongly confirmation-gated

## Example 4: `undo`

Speaker:

* unknown

Policy:

* generally allowed because it reduces harm

---

# 17. Laws to freeze

## Law 1

Diarization, verification, and authorization are distinct functions and must remain distinct.

## Law 2

Identity affects authority and confirmation, not canonical command meaning.

## Law 3

Commands that reduce harm remain broadly available even under identity uncertainty.

## Law 4

High-risk and privileged commands require stronger identity assurance than low-risk navigation commands.

## Law 5

Shared-room and contamination states must make Maestro more conservative, not more permissive.

## Law 6

Delegated non-human authority must be represented explicitly and may not masquerade as human speaker verification.

## Law 7

Identity checks needed for hot-path gating must stay local or locally cached.

## Law 8

Voice identity is a first-class VOS security capability, not an optional add-on.

---

# 18. What this unlocks

Once this architecture is frozen, Maestro can support:

* speaker-aware execution policy
* shared-room-safe operation
* secure-mode voice control
* explicit delegated authority models
* trustworthy audit of who could do what, when, and why

That is how voice control becomes acceptable for real operating authority instead of remaining a novelty feature.
