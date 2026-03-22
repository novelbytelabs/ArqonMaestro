# Session Bootstrap and Root Trust

## Purpose

This document is the canonical source of truth for:

- session bootstrap and startup trust
- factor hierarchy and factor-strength rules
- human profile security governance
- shared-machine profile selection and isolation
- step-up and recovery boundaries
- phased hardening slices for Program B

## Authority Rule

This file is authoritative for startup/bootstrap and factor ordering.

Scoped docs must defer to this file for overlapping behavior:

- `docs/browser/security-policy-matrix.md` (runtime mode/risk decisions)
- `docs/browser/security-policy-decisions.md` (decision provenance)
- `docs/browser/voice-enrollment.md` (enrollment UX and maintenance)
- `docs/browser/policy.md` (operator-facing summary)

## Foundational Model

Maestro is passkey-first and vendor-neutral:

- root trust: `passkey/WebAuthn` (or hardware-backed FIDO2)
- continuity unlock: local device-bound `PIN`
- live actuation trust: per-command `voice`
- recovery fallback: `TOTP` (recovery-only)
- agent identity: cryptographic workload identity only (never voice persona)

## Core Laws

1. Root trust law: no executable trust until passkey bootstrap succeeds.
2. Factor strength law: weaker factors never satisfy stronger requirements.
3. Live speaker law: executable commands require current-request voice evidence unless reflex exempt.
4. Unknown speaker law: unknown speaker executable commands are hard-blocked.
5. Fail-closed law: uncertain/degraded trust state blocks execution (except reflex where policy allows).
6. Provider neutrality law: policy must not bind to a single vendor provider.
7. Authentication chooses profile: profile selection never implies authentication.

## Profile Security Governance

### Profile Security State Model

Each human profile stores policy/factor state, not vendor preference:

- `profileId`, `displayName`, `status`
- `voiceEnrolled`
- `passkeyEnrolled`
- `pinConfigured`
- `recoveryEnabled`
- `policyTier`
- `inactivityTimeoutSec`
- `lastAuthAt`, `lastStepUpAt`
- `localPartitionId`

### Profile Security Operations

Allowed profile-level capabilities:

- enroll/register passkey
- rotate/reset passkey (fresh passkey, or explicit recovery path)
- set/reset local PIN
- enable/disable recovery path (policy-gated)
- adjust inactivity timeout/step-up strictness by policy tier

### Forbidden Profile Preferences

Profiles must not allow:

- passkey provider preference
- preferred browser authenticator
- OS authentication provider preference

### Security Mutation Rules

The following are high-risk security mutations and require fresh passkey in normal mode:

- passkey reset/replace/remove
- factor enrollment/reset changes
- disabling voice auth
- profile security ownership changes
- recovery policy changes
- security tier changes

No PIN-only reset path is allowed.

## UI Authority Boundaries

- `Profiles` tab: factor lifecycle management and profile security controls.
- `Security` tab: runtime observability only (status/readiness/freshness/reason codes).
- `Wizard` tab: onboarding/orchestration only, not long-term factor administration.

## Sensitive Action Gate UX

Before sensitive actions, UI must show explicit factor requirement:

- "Requires fresh passkey"
- "Recovery flow required"

Policy violations must show explicit block reason code (including PIN-only reset attempts).

## Profile Mutation Audit UX

After profile security mutations, UI shows an audit receipt line with:

- timestamp
- profile id/display name
- factor path used
- decision/outcome
- reason code

## Startup and Session Flows

### First-time user

1. Launch in locked shell
2. Create/select human profile
3. Register passkey
4. Set local PIN
5. Complete voice enrollment
6. Confirm readiness (`passkey`, `PIN`, `voice`, `recovery`)
7. Enter active runtime

### Returning user

1. Launch
2. Passkey bootstrap
3. Profile mapping
4. Active runtime

### Shared machine

1. Launch locked profile chooser
2. Select profile
3. Passkey authentication for selected profile
4. Activate isolated profile partition
5. Runtime voice verification per command

### Inactivity unlock

- required factors: `voice + PIN`
- continuity unlock never satisfies passkey-only actions

### Recovery

- `TOTP` allowed only in explicitly invoked recovery mode
- recovery does not become normal-mode root trust
- passkey-first policy resumes after passkey restoration

## Risk Gate Baseline

- cold launch / crash restart: `passkey`
- medium-risk command: `voice + PIN`
- high-risk irreversible: `voice + fresh passkey`
- security mutations: `fresh passkey only`
- reflex controls (`stop`, `cancel`, `pause`): explicitly exempt by policy

## Factor Freshness Invalidation

Invalidate relevant freshness on:

- speaker change or unknown speaker
- contamination or provider degraded state
- pause -> listening transition
- mode downgrade
- profile switch
- session lock/timeout
- bridge desynchronization/interruption
- context/surface jump where trust parity is uncertain

## Multi-Human Isolation

Shared systems require profile-isolated runtime state:

- separate Electron partitions per human (for example `persist:human:<profile-id>`)
- separated browser/session/continuity state
- no cross-profile factor carry-over

## Program B Phased Hardening Slices

- `B0`: docs + contract freeze
- `B1`: unified factor orchestrator
- `B2`: passkey bootstrap integration
- `B3`: PIN continuity unlock
- `B4`: per-command voice hardening
- `B5`: constrained TOTP recovery
- `B6`: UI/telemetry parity + adversarial closeout

Each slice must have entry criteria, exit criteria, and evidence artifacts.

## Definition of Done

Program B canonical spec finalization is done when all are true:

1. This canonical file exists and is referenced by matrix, decisions, enrollment, policy, and master plan.
2. No conflicting startup/factor-order statements remain in browser docs.
3. Profile governance is complete: allowed capabilities, forbidden provider preferences, mutation gate rules, and audit UX are explicitly documented.
4. Policy integrity is explicit: unknown-speaker hard block, per-command voice requirement, recovery-only TOTP, and weaker-factor substitution prohibition.
5. Phased readiness is explicit: B0-B6 slices include entry/exit criteria and evidence expectations.
