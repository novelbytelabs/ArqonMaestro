# Browser Voice Security Policy Matrix (v2)

This document is the executable policy matrix for browser voice control.

It is deterministic, auditable, and safety-first.

Startup/bootstrap root-trust authority is defined in:

- [Session Bootstrap and Root Trust](../security/session-bootstrap-root-trust.md)

This matrix remains authoritative for runtime mode/risk/trust decisions after bootstrap.

## Core State Model

The runtime treats each interaction as one of three stages:

- `heard`: transcript appears, no command activation yet
- `activated`: command candidate matched/highlighted
- `executed`: command actually dispatched and completed

Security transitions are driven by `activated` and `executed`, not `heard` alone.

## Global Rules

1. No state downgrade on `heard`-only events.
2. `activated` is security-relevant even if not executed.
3. Every executable non-reflex command requires per-command authentication.
4. Degraded/contaminated provider behavior is fail-closed (`reflex` only).
5. Unknown speaker recognized commands are blocked immediately.
6. Profiles are managed in UI, but runtime authority is inferred per interaction from live voice evidence.
7. Operator mode authority is app/window scoped (extension/app surface), not desktop-global.
8. Desktop runtime must synchronize to the focused app's effective operator mode before authorization.

## Trust States

- `verified`
- `unknown`
- `contaminated`
- `provider_degraded`

## Mode Definitions

- `LOCKED`: reflex-only
- `OBSERVE`: no actuation
- `ASSIST`: guarded operation mode
- `PILOT`: full operation mode for verified speakers only

## Decision Matrix

Legend:

- Decision: `allow`, `block`, `reflex_only`

### LOCKED Mode

| Trust State | Low | Medium | High |
| --- | --- | --- | --- |
| verified | block (except reflex) | block (except reflex) | block (except reflex) |
| unknown | block (except reflex) | block (except reflex) | block (except reflex) |
| contaminated | reflex_only | reflex_only | reflex_only |
| provider_degraded | reflex_only | reflex_only | reflex_only |

### OBSERVE Mode

| Trust State | Low | Medium | High |
| --- | --- | --- | --- |
| verified | block | block | block |
| unknown | block | block | block |
| contaminated | reflex_only | reflex_only | reflex_only |
| provider_degraded | reflex_only | reflex_only | reflex_only |

### ASSIST Mode

| Trust State | Low | Medium | High |
| --- | --- | --- | --- |
| verified | allow | allow | allow |
| unknown | block | block | block |
| contaminated | reflex_only | reflex_only | reflex_only |
| provider_degraded | reflex_only | reflex_only | reflex_only |

Notes:

- Verified means current-request identity evidence passed.
- Unknown speaker never executes commands in Assist.

### PILOT Mode

| Trust State | Low | Medium | High |
| --- | --- | --- | --- |
| verified | allow | allow | allow |
| unknown | block | block | block |
| contaminated | reflex_only | reflex_only | reflex_only |
| provider_degraded | reflex_only | reflex_only | reflex_only |

Notes:

- Unknown speaker activation is blocked by default.
- No degrade-then-eval default path for unknown speaker commands.

## Activation Rules

1. `heard` only:
   - no downgrade
   - no authorization transition
2. `activated`:
   - command is treated as security-relevant
   - authorization requires current-request identity evidence

## Pause/Listen Boundary Policy

On `Paused -> Listening`:

- clear inherited assumptions
- require fresh voice verification evidence before next executable command

## Mode Authority And Synchronization

- Mode changes originate from the app/window control surface (for browser: extension popup/sidepanel).
- Desktop does not independently choose browser mode for active browser interactions.
- Desktop runtime applies the focused app's mode (`pilot`, `assist`, `observe`, `locked`) at authorization time.
- If focused app mode cannot be resolved, runtime falls back to fail-safe behavior (`assist`/block-oriented posture) until mode state is restored.

## Command Panel Mode Indicator

Main desktop command-results panel provides a compact mode signal:

- `PILOT`: primary/bright panel tint
- `ASSIST`: warning tint
- `OBSERVE` / `LOCKED`: muted/gray tint

Each panel also renders a small mode label (`PILOT`, `ASSIST`, `OBSERVE`, `LOCKED`) above the active command rows.

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
