# Arqon Maestro Session Bootstrap and Root Trust

## Purpose

This document is the canonical source of truth for:
- session bootstrap and startup trust
- factor hierarchy and factor-strength rules
- human profile security governance
- multi-user room architecture and live isolation
- trust window lifecycles and step-up boundaries
- recovery boundaries and security mutations

## Authority Rule

This file is authoritative for startup, bootstrap, multi-user trust, and factor ordering. 

Scoped docs must defer to this file for overlapping behavior:
- `docs/browser/security-policy-matrix.md` (runtime mode/risk decisions)
- `docs/browser/security-policy-decisions.md` (decision provenance)
- `docs/browser/voice-enrollment.md` (enrollment UX and maintenance)
- `docs/browser/policy.md` (operator-facing summary)

## Foundational Model

Maestro operates as a passkey-first, vendor-neutral Voice Operating System. It uses layered trust:
- **root trust:** `passkey/WebAuthn` (or hardware-backed FIDO2)
- **continuity unlock:** local device-bound `PIN` (refreshing stale trust windows)
- **live actuation trust:** per-command `voice` (speaker attribution)
- **recovery fallback:** `TOTP` (recovery-only, heavily audited)
- **agent identity:** cryptographic workload identity only (never voice persona)

## Core Laws

1. **Root Trust Law:** No executable trust is granted until passkey bootstrap succeeds.
2. **Factor Strength Law:** Weaker factors never satisfy stronger requirements. Voice + PIN cannot bypass a Passkey requirement.
3. **Live Speaker Law:** Executable commands require current-request voice evidence matching the authenticated profile, unless explicitly reflex exempt.
4. **Unknown Speaker Law:** Unknown speaker executable commands are hard-blocked.
5. **No Borrowed Trust Law:** One participant’s passkey authentication, PIN freshness, or active state NEVER grants another participant executable authority. Trust is strictly personal and evaluated per-speaker.
6. **Fail-Closed Law:** Uncertain, degraded, or contaminated trust state blocks execution.
7. **Provider Neutrality Law:** Policy must not bind to a single vendor provider. Maestro standardizes on platform-native WebAuthn APIs.
8. **Authentication Chooses Profile:** Profile selection never implies authentication. Passkey assertion dictates the active profile.
9. **Agent Boundary Law:** Agents do not possess Voice or Passkey factors. They authenticate via cryptographic workload identity only.

## Profile Security Governance

### Profile Security State Model
Each human profile stores policy and factor state, not vendor preference:
- `profileId`, `displayName`, `status`, `policyTier`
- `voiceEnrolled`, `passkeyEnrolled`, `pinConfigured`, `recoveryEnabled`
- `inactivityTimeoutSec`
- `trustWindowValidUntil`
- `lastAuthAt`, `lastStepUpAt`

### Profile Security Operations
Allowed profile-level capabilities:
- enroll/register passkey
- rotate/reset passkey (requires fresh passkey, or explicit recovery path)
- set/reset local PIN
- enable/disable recovery path (policy-gated)
- adjust inactivity timeout / step-up strictness by policy tier

### Forbidden Profile Preferences
Profiles must not allow or store:
- passkey provider preference (e.g., "Use Apple" vs "Use Google")
- preferred browser authenticator
- OS authentication provider preference

### Security Mutation Rules
The following are high-risk security mutations and require **fresh passkey only** in normal mode:
- passkey reset/replace/remove
- factor enrollment/reset changes
- disabling voice auth
- profile security ownership changes
- recovery policy changes
- security tier changes

**No PIN-only reset path is allowed.**

## UI Authority Boundaries

- **`Profiles` tab:** Deep administrative surface. Factor lifecycle management and profile security controls. Humans and Agents are strictly separated visually.
- **`Participants Popup`:** Floating, fast-access live room surface. Used for viewing who is in the shared room, joining the room via passkey, or quickly unlocking a stale profile.
- **`Security` tab:** Runtime observability only (status/readiness/freshness/reason codes).
- **`Wizard` tab:** Onboarding/orchestration only, not long-term factor administration.

### Sensitive Action Gate UX
Before sensitive actions, UI must show explicit factor requirement:
- *"Requires fresh passkey"*
- *"Recovery flow required"*

Policy violations must show explicit block reason codes (e.g., preventing PIN-only reset attempts).

### Profile Mutation Audit UX
After profile security mutations, the UI must generate an audit receipt line with:
- timestamp
- profile id/display name
- factor path used
- decision/outcome
- reason code

## Startup and Session Flows

### First-Time User Flow
1. Launch in locked shell
2. Create/select human profile
3. Register passkey
4. Set local PIN
5. Complete voice enrollment
6. Confirm readiness (`passkey`, `PIN`, `voice`, `recovery`)
7. Enter active runtime

### Returning Single-User Flow
1. Launch
2. Passkey-first bootstrap
3. Profile mapped automatically via assertion
4. Active runtime

### Multi-User Room Flow (Shared Machine)
1. Launch locked Maestro session
2. Session Sponsor authenticates via Passkey to boot the room
3. Participants Popup unlocks
4. Additional participants select their profile from the Popup and authenticate via their own Passkeys
5. Live commands are attributed to specific speakers via diarization and evaluated against their personal Trust Windows

### Recovery Flow
1. `TOTP` allowed only in explicitly invoked recovery mode
2. Recovery does not become normal-mode root trust
3. Passkey-first policy resumes immediately after passkey restoration

## Risk Gate Baseline & Trust Windows

To prevent PIN-spam during live collaboration, Maestro uses **Trust Windows** (Active -> Stale -> Locked). The router evaluates the command risk against the specific speaker's current window.

- **Reflex Controls** (`stop`, `cancel`, `pause`): Explicitly exempt. Immediate execution.
- **Low Risk** (Navigational): Requires speaker to be `Joined` in the room + Live Voice. Executes even if window is Stale.
- **Operational Risk** (Tool usage, workflow): Requires speaker to have an `Active` trust window + Live Voice. If Stale, command is suspended pending a quick PIN unlock, then resumes.
- **Guarded Risk** (Commits, external comms): Requires `Active` window + Live Voice. If Stale, prompts PIN. *(Can be configured by policy to always prompt PIN)*.
- **High Risk Irreversible** (Destructive actions): Requires `Joined` + Live Voice + **Fresh Passkey Challenge**. PIN is never sufficient.
- **Security Mutations**: Requires **Fresh Passkey Only**. Voice verification is bypassed.

## Factor Freshness Invalidation

A participant's Trust Window degrades from Active to Stale (or Locked) upon:
- Speaker change or unknown speaker detection
- Reaching the inactivity timeout limit
- Contamination or provider degraded state
- Pause -> listening transition
- Session lock or profile switch
- Bridge desynchronization / OS environment shift
- Context/surface jump where trust parity is uncertain

## Multi-Human Room Isolation

Even within a single Maestro Room, human runtime trust state remains strictly logically isolated:
- Separate continuity and factor freshness state per human.
- Commands are evaluated strictly against the speaking human's policy tier and trust window.
- No cross-profile factor carry-over.
- If true private workspace separation is required, the participant's workflow runs in an isolated Electron partition (e.g., `persist:human:<profile-id>`), but room-level voice interaction remains unified.