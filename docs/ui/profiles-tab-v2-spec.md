# Profiles Tab v2 Specification

## Purpose

The Profiles tab is the long-lived identity control plane for Maestro.

It manages:

* human identities
* agent identities
* lifecycle state
* security readiness
* policy tier
* factor enrollment state
* recent trust/audit summary

It does not own live room control. Live room participation belongs in the Participants Popup.

---

# Core Design Laws

## Law 1: Separate the Three Truths

Every human profile must express these as separate things:

### 1. Lifecycle State

* active
* suspended
* revoked

### 2. Security Readiness

* passkey ready
* voice ready
* PIN ready
* recovery ready

### 3. Live Room/Runtime State

* not in room
* joined_not_yet_active
* active
* stale
* locked
* expired

These must never be collapsed into one "Active" badge.

## Law 2: Humans and Agents Are Different Identity Species

Humans and agents must not share the same visual card model.

## Law 3: Profiles Own Long-Lived Identity State

Profiles may manage enrollment, factors, policy tier, and lifecycle. They do not replace the Participants Popup for live join/unlock/logout operations.

## Law 4: No Vague Security Actions

Buttons like `Re-enroll` are too vague. All actions must be precise:

* Re-enroll Voice
* Register Passkey
* Rotate Passkey
* Set PIN
* Reset PIN
* Enable Recovery
* Reauthenticate

## Law 5: No Weaker-Factor Bypass

The UI must never imply that:

* voice + PIN can replace fresh passkey
* recovery can act like normal auth
* profile selection implies authentication

---

# Top-Level Page Structure

## Header Summary Bar

At the top of the Profiles tab, show:

* Humans loaded
* Agents loaded
* Room mode: single-user / multi-user
* Current room sponsor or selected human
* Active participants count
* Setup-needed count
* Any global warning:

  * provider degraded
  * contamination fail-closed
  * auth bridge unavailable
  * recovery mode active

Example:

* Humans: 4
* Agents: 6
* Room Mode: Multi-user
* Sponsor: Mike
* Active Participants: 3
* Setup Needed: 1

---

# Main Layout

## Tabs or Segmented Control

Use two explicit top-level sections:

* Humans
* Agents

Do not use one mixed list.

---

# Humans View

## Per-Human Card Layout

Each human card should have these sections:

### A. Identity Block

* Display name
* Human profile ID
* Role
* Optional avatar/icon
* Policy tier

Example:

* Mike Young
* profile_mn0sz2nv_jqnx5y
* Role: sovereign_owner
* Policy Tier: Admin

### B. Lifecycle Block

Single badge:

* Active
* Suspended
* Revoked

### C. Security Readiness Block

Show as four compact status rows or chips:

* Passkey: Ready / Missing / Degraded
* Voice: Ready / Missing / Needs Retry / Degraded
* PIN: Ready / Missing / Locked Out
* Recovery: Enabled / Disabled / Recovery-Only

Each item should support reason text.

Examples:

* Passkey: Ready
* Voice: Needs Retry — quality threshold not met
* PIN: Missing
* Recovery: Disabled

### D. Room/Runtime Block

Only visible if relevant to current room mode or if the human is present in room context.

States:

* Not in Room
* Joined, Not Yet Active
* Active
* Stale
* Locked
* Expired

This must be visually distinct from lifecycle.

### E. Trust Freshness Block

Show:

* Last root auth
* Last voice verification
* Last PIN unlock
* Current trust window status

Example:

* Last root auth: 12m ago
* Last voice verify: live
* Last PIN unlock: 4m ago
* Trust window: Active

### F. Audit Summary Block

Compact summary only:

* Last passkey rotation
* Last voice re-enrollment
* Last PIN reset
* Last recovery event
* Last blocked high-risk action

This is not the full audit log, just the summary surface.

---

# Human Actions

## Normal Actions

These are safe day-to-day identity actions.

* View Details
* Rename
* Switch Context

## Security Actions

These open security workflows or controlled panels.

* Manage Security
* Re-enroll Voice
* Reauthenticate
* Open Enrollment Wizard
* Add to Room Roster

## Dangerous Actions

These must be separated visually in a danger zone.

* Suspend
* Revoke
* Delete

Do not place Delete in the same inline button strip as ordinary actions.

---

# Manage Security Drawer

Every human card should have a strong primary security control: Manage Security.

This opens a drawer or modal with deep controls.

## Sections Inside Manage Security

### 1. Root Trust

* Register Passkey
* Rotate Passkey
* Reset Passkey
* View passkey readiness
* View last passkey use

### 2. Continuity

* Set PIN
* Change PIN
* Reset PIN
* View PIN lockout state
* View last PIN unlock

### 3. Voice Identity

* Enroll Voice
* Re-enroll Voice
* Retry Voice Capture
* View last enrollment quality result

### 4. Recovery

* Enable Recovery
* Disable Recovery
* View recovery status
* Enter Recovery Flow

### 5. Policy Tier

* View policy tier
* View inactivity timeout
* View step-up strictness
* Adjust if permitted by role/policy

### 6. Security Event Summary

* last security mutation
* factor used
* reason code
* timestamp

## Security Mutation Law

Any high-risk mutation in this drawer must trigger the right gate:

* fresh passkey if required
* never PIN-only if passkey is required
* never recovery unless explicit recovery policy allows it

---

# Human Readiness UX

## Readiness Summary Language

Do not only show colored dots. Show what remains.

### Ready Case

* This profile is operationally ready.

### Not Ready Case

* This profile is not operationally ready.
* Missing:

  * PIN setup
  * voice capture retry

### Joined But Not Active Case

* Root trust succeeded.
* This participant is joined but not yet active.
* Remaining requirements:

  * complete voice setup
  * resolve degraded provider state

---

# Agents View

Agents must not look like humans.

## Per-Agent Card Layout

### A. Identity Block

* Agent name
* Agent ID
* Agent class/role

### B. Workload Identity Block

* Credential health
* Last credential rotation
* Identity status: healthy / degraded / expired

### C. Authorization Block

* Scope summary
* Current permission tier

### D. Voice Persona Block

* Assigned voice persona
* Persona status

### E. Runtime State Block

* enabled
* suspended
* degraded
* disconnected

## Agent Actions

* View Identity
* Rotate Credentials
* View Authorization Scope
* Suspend
* Revoke
* View Audit

No passkey controls here. No human-style voice enrollment here.

---

# Empty States

## No Humans

Show:

* No human profiles yet
* Add Person

## No Agents

Show:

* No agents configured yet
* Create Agent Identity

## Human Setup Incomplete

Show top-level alert:

* 2 human profiles need setup completion

---

# Add Person Flow

UI label: Add Person

Internal meaning: launches Human Enrollment Wizard

It must not create a naked profile and leave the user confused.

## Wizard Stages

* Name / select profile
* Passkey
* Guided voice capture
* Typed PIN
* Optional recovery
* Complete

If passkey succeeds but readiness is incomplete:

* profile may land in joined_not_yet_active or setup_incomplete depending on context

---

# Participants Popup Relationship

The Profiles tab must not become the live room dashboard.

## Profiles Tab Owns

* long-lived identity
* lifecycle
* factor enrollment state
* policy
* deep security mutations

## Participants Popup Owns

* join room
* unlock me
* leave room
* live trust window
* presence
* current participant roster

Profiles may show room state, but should not replace the popup.

---

# Startup Chooser Reuse Model

The identity model on this page must be reusable for:

* startup profile chooser
* multi-user room join flow
* participant roster seeding

Every human profile should expose lightweight chooser-safe fields:

* display name
* lifecycle state
* readiness summary
* policy tier
* optional avatar/icon
* last used

---

# Status Vocabulary

Use these exact labels consistently.

## Lifecycle

* Active
* Suspended
* Revoked

## Readiness

* Ready
* Missing
* Degraded
* Needs Retry
* Locked Out

## Room/Runtime

* Not in Room
* Joined, Not Yet Active
* Active
* Stale
* Locked
* Expired

## Freshness

* Live
* Fresh
* Stale
* Expired

---

# Suggested Component Contract

## HumanProfileCard

Fields:

* id
* displayName
* role
* policyTier
* lifecycleState
* passkeyState
* voiceState
* pinState
* recoveryState
* roomState
* lastRootAuthAt
* lastVoiceVerifyAt
* lastPinUnlockAt
* trustWindowState
* lastSecurityEvent
* lastBlockedAction
* setupIncompleteReasons[]

Actions:

* onViewDetails
* onRename
* onManageSecurity
* onReEnrollVoice
* onAddToRoomRoster
* onSuspend
* onRevoke
* onDelete

## AgentProfileCard

Fields:

* id
* displayName
* role
* workloadIdentityState
* credentialHealth
* authorizationScopeSummary
* voicePersona
* runtimeState
* lastCredentialRotationAt
* lastSecurityEvent

Actions:

* onViewIdentity
* onRotateCredentials
* onViewAuthorization
* onSuspend
* onRevoke
* onViewAudit

---

# Suggested Visual Hierarchy

## Human Card Order

1. Name + role + tier
2. Lifecycle badge
3. Security readiness row
4. Room/runtime state row
5. Trust freshness row
6. Audit summary row
7. Action strip
8. Danger zone

## Agent Card Order

1. Name + role
2. Identity health
3. Authorization scope
4. Voice persona
5. Runtime state
6. Action strip
7. Danger zone

---

# Critical Gotchas

## Gotcha 1

Do not let Active mean lifecycle active and room active at the same time.

## Gotcha 2

Do not let Re-enroll remain vague.

## Gotcha 3

Do not let a created profile appear operationally ready if passkey/voice/PIN are missing.

## Gotcha 4

Do not mix human and agent identity controls.

## Gotcha 5

Do not let recovery controls sit in casual inline action rows.

## Gotcha 6

Do not make the Profiles tab the live room command center.

## Gotcha 7

Do not show provider/vendor preference anywhere in profile settings.

---

# Implementation Priority

## Phase 1

* Human/Agent split
* state separation
* readiness block
* room state block
* Manage Security drawer
* precise action labels

## Phase 2

* trust freshness block
* audit summary
* policy tier visibility
* danger zone separation
* startup chooser reuse alignment

## Phase 3

* richer audit drilldowns
* inline reason-code expansion
* advanced role/policy editing if needed
