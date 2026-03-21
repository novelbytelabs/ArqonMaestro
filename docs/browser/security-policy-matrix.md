# Browser Voice Security Policy Matrix (v1)

This document is the executable policy matrix for browser voice control.

It is designed to be deterministic, auditable, and safety-first.

## Core State Model

The runtime treats each interaction as one of three stages:

- `heard`: transcript appears, no command activation yet
- `activated`: command candidate matched/highlighted
- `executed`: command actually dispatched and completed

Security transitions are driven by `activated` and `executed`, not `heard` alone.

## Global Rules

1. No state downgrade on `heard`-only events.
2. `activated` is security-relevant even if not executed.
3. `Paused -> Listening` always clears grace and requires re-authentication context.
4. Degraded/contaminated provider behavior is fail-closed (`reflex` only).
5. Medium-risk grace period is `5s`, Assist mode only.
6. Profiles are managed in UI, but runtime authority is inferred per interaction from live voice evidence.

## Trust States

- `verified`
- `unknown`
- `contaminated`
- `provider_degraded`

## Mode Definitions

- `LOCKED`: reflex-only
- `OBSERVE`: no actuation
- `ASSIST`: guarded operation mode
- `PILOT`: full operation mode for verified speakers, with automatic downgrade logic

## Decision Matrix

Legend:

- Decision: `allow`, `block`, `degrade_then_eval`, `reflex_only`
- Re-auth: `required`, `not_required`
- Grace: `none`, `5s_assist_only`

### LOCKED Mode

| Trust State | Low | Medium | High |
| --- | --- | --- | --- |
| verified | block (except reflex) | block (except reflex) | block (except reflex) |
| unknown | block (except reflex) | block (except reflex) | block (except reflex) |
| contaminated | reflex_only | reflex_only | reflex_only |
| provider_degraded | reflex_only | reflex_only | reflex_only |

Notes:

- LOCKED ignores grace.
- Only reflex commands (`stop`, `cancel`, `pause`) are executable.

### OBSERVE Mode

| Trust State | Low | Medium | High |
| --- | --- | --- | --- |
| verified | block | block | block |
| unknown | block | block | block |
| contaminated | reflex_only | reflex_only | reflex_only |
| provider_degraded | reflex_only | reflex_only | reflex_only |

Notes:

- OBSERVE supports visibility only (`heard`, diagnostic surfaces, previews).

### ASSIST Mode

| Trust State | Low | Medium | High |
| --- | --- | --- | --- |
| verified | allow (re-auth required at interaction boundary) | allow with 5s grace when valid; otherwise re-auth required | re-auth required every command |
| unknown | block until verification | block until verification | block until verification |
| contaminated | reflex_only | reflex_only | reflex_only |
| provider_degraded | reflex_only | reflex_only | reflex_only |

Notes:

- Unknown speaker does not execute commands in Assist.
- Medium grace is invalidated by events listed in [Grace Invalidation Events](#grace-invalidation-events).

### PILOT Mode

| Trust State | Low | Medium | High |
| --- | --- | --- | --- |
| verified | allow | re-auth required every command | re-auth required every command |
| unknown | degrade_then_eval under Assist rules | degrade_then_eval under Assist rules | degrade_then_eval under Assist rules |
| contaminated | reflex_only | reflex_only | reflex_only |
| provider_degraded | reflex_only | reflex_only | reflex_only |

Notes:

- In Pilot, unknown activation causes automatic downgrade to Assist before evaluation.
- Restoration to previous verified-speaker mode occurs automatically after successful verification event.

## Activation and Downgrade Rules

1. `heard` only:
   - no downgrade
   - no grace invalidation
2. `activated` with `unknown/contaminated/provider_degraded` in Pilot:
   - downgrade to Assist
   - evaluate command under Assist matrix
3. `activated` in any mode:
   - mark `requires_reauth_next=true`
   - invalidate grace token where applicable

## Grace Invalidation Events

Any one of these invalidates Assist medium-risk grace:

- command activation event
- speaker trust state change
- contamination detected
- provider readiness degraded
- context/surface jump
- `Paused -> Listening` transition
- explicit timeout (`5s`)

## Pause/Listen Boundary Policy

On `Paused -> Listening`:

- clear grace token
- clear inherited auth context
- require fresh voice verification evidence before next executable medium/high command

## Unknown Activation Rate Guard

To reduce ambient/noisy activation abuse:

- `3 unknown activations / 10s`: force `Assist -> LOCKED` for `30s`
- `5 unknown activations / 60s`: remain LOCKED until successful verified-speaker restoration

## Title + Trust Display Policy

- Idle/paused title: `Arqon Maestro`
- Active interaction display: `<SpeakerLabel> <TrustIndicator>`
- `Arqon Maestro` text may be suppressed during active display events

Where:

- verified speaker => profile display name
- unknown => `Unknown`

## Auditability Requirements

Every decision path must emit a machine-readable reason code and context fields:

- timestamp
- mode
- risk level
- trust state
- profile id (if any)
- command text
- heard/activated/executed booleans
- decision
- reason code
- session id
- interaction id

Reason code taxonomy is defined in `browser/security-policy-decisions.md`.
