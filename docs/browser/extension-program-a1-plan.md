# Browser Extension Program A1 Closure Plan

## Purpose

This plan closes the remaining Program A1 gap:

- desktop runtime bridge is implemented and evidence-backed
- browser extension consumer wiring and adversarial live validation are still pending

This document is the execution plan for the extension side.

## Current reality

Desktop/runtime is already exposing the security bridge contract:

- Security snapshot request/response
  - `securityRequestSnapshot` -> `securitySnapshot`
- Replay snapshot request/response
  - `securityRequestReplaySnapshot` -> `securityReplaySnapshot`
- Replay summary request/response
  - `securityRequestReplaySummary` -> `securityReplaySummary`
- Replay reset
  - `securityResetReplaySnapshot`
- Live additive bridge fields are already present in renderer state:
  - `securityPolicyMode`
  - `securityRequiresReauthNext`
  - `securityRequiredFactors`
  - `securitySatisfiedFactors`
  - `securityMissingFactor`
  - `securityStepUpType`
  - `securityFactorDecision`
  - `securityLastFactorReasonCode`
  - `securityLastReasonCode`
  - `securityLastLifecyclePhase`
  - `securityLastInteractionId`
  - `securityReplayGeneratedAt`
  - `securityReplayTotalRecords`
  - `securityReplaySessionEventCount`
  - `securityReplayLastSequence`

## Governing documents

- [Security Policy Matrix](./security-policy-matrix.md)
- [Security Policy Decisions](./security-policy-decisions.md)
- [Policy](./policy.md)
- [Automation Modes](./automation-modes.md)
- [Voice Enrollment](./voice-enrollment.md)
- [Maestro Master Plan](../vos/maestro-master-plan.md)
- [Implementation Progress](../vos/maestro-implementation-progress.md)
- [Decision Log](../vos/maestro-decision-log.md)
- [Gotcha Registry](../vos/maestro-gotcha-registry.md)

## Desktop contract references (must be consumed by extension)

- `maestro/client/src/main/events.ts`
- `maestro/client/src/main/execute/executor.ts`
- `maestro/client/src/main/app.ts`
- `maestro/client/src/main/runtime/security-session-policy-service.ts`
- `maestro/client/src/main/runtime/authorization-service.ts`
- `maestro/client/src/main/runtime/phase3b-replay-audit-service.ts`
- `maestro/client/src/renderer/pages/settings/security.tsx`
- `maestro/client/src/renderer/state/reducer.ts`

## Scope boundary

In scope:

- extension wiring to consume security/session/replay channels
- extension lifecycle mapping to `heard` / `activated` / `executed`
- extension-side policy UX behaviors that reflect desktop policy decisions
- adversarial and regression evidence in live browser operation

Out of scope:

- changing canonical policy rules in matrix/decisions docs
- replacing desktop runtime policy logic
- adding new runtime dependencies or external installs

## Implementation phases

## Phase E0 - Contract preflight (must complete before E1)

Deliver:

1. Freeze channel contract version for this rollout (`securityContractVersion: "a1.v1"`).
2. Add request correlation id requirement for all request/response channels (`requestId`).
3. Add app-scoped mode sync channel:
   - `securitySetPolicyMode` (`plugin.chrome` -> desktop bridge)
   - payload includes `{ requestId, securityContractVersion, mode }`
4. Define timeout/retry behavior:
   - snapshot/summary/snapshot-replay request timeout: 1500 ms
   - retries: 2
   - backoff: 250 ms then 750 ms
5. Define source validation rules on desktop bridge:
   - only service extension plugin channel/source (`plugin.chrome`)
6. Define production lock rule:
   - `securityResetReplaySnapshot` must be disabled outside dev/test mode
7. Freeze error code set for extension and desktop bridge:
   - `security_bridge_timeout`
   - `security_bridge_unavailable`
   - `security_bridge_invalid_payload`
   - `security_bridge_version_mismatch`
   - `security_bridge_unauthorized_source`
   - `security_bridge_reset_forbidden`
8. Freeze lifecycle monotonicity guard:
   - reject or out-rank lifecycle events where `interactionId` goes backward
   - allow reset only on explicit reconnect bootstrap
9. Freeze fail-closed scope:
   - only executable medium/high commands fail closed on bridge unavailability
   - reflex emergency commands are never blocked by bridge-unavailable policy
10. Freeze bridge unavailable threshold:
   - bridge is considered unavailable only after retries are exhausted
   - not on first timeout
11. Freeze compatibility hard-fail rule:
   - missing `securityContractVersion` in any response is a hard failure (no silent fallback)

Exit evidence:

- one contract table committed in this file
- fixtures committed for request/response payloads
- no implementation starts before this preflight is frozen

## Phase E1 - Contract binding and state model

Deliver:

1. Add extension-side security store with the exact desktop contract fields.
2. Implement snapshot bootstrap on extension init:
   - request `securityRequestSnapshot`
   - request `securityRequestReplaySummary`
3. Subscribe to live desktop bridge updates and keep state synchronized.
4. Add reconnect/resubscribe path for extension background/page reload.
5. Add payload schema validation for all incoming/outgoing bridge messages.
6. Enforce correlation-id matching in responders/handlers.

Exit evidence:

- extension always reconstructs valid security state after reload
- no stale-field drift between desktop settings state and extension state
- invalid payloads are rejected with deterministic error codes

## Phase E2 - Command lifecycle parity (`heard` / `activated` / `executed`)

Deliver:

1. Normalize extension command event pipeline into three explicit states:
   - `heard`: transcript shown only
   - `activated`: command candidate matched/highlighted
   - `executed`: command dispatched and completed
2. Ensure extension UI badges/status map exactly to these semantics.
3. Ensure extension does not treat `heard` as authorization-relevant.
4. Add lifecycle dedupe logic so reconnect/reload does not duplicate transitions.

Exit evidence:

- heard-only events never trigger downgrade/reauth prompts
- activated events always trigger session policy transition handling
- executed events always produce final command outcome markers
- no duplicate lifecycle transitions after worker/tab reconnect loops

## Phase E3 - Policy enforcement parity in extension UX

Deliver:

1. Respect `securityPolicyMode`, `securityRequiresReauthNext`, and per-command auth decision fields/reason codes.
   - including factor contract fields (`required/satisfied/missing/stepUp/factorDecision`)
2. Enforce mode-aware behavior in extension command paths:
   - unknown/degraded/contaminated handling
   - fail-closed UI behavior for restricted/reflex-only states
3. Surface clear user-facing reason and reason code when commands are blocked/confirmed.
4. Handle pause -> listening boundary by requiring fresh auth context on next executable medium/high interaction.
5. Define desktop-unreachable behavior:
   - high/medium executable actions fail closed
   - low-risk actions follow matrix constraints and explicit degraded banner

Exit evidence:

- extension action outcomes match desktop policy decisions for the same interaction conditions
- reason codes are visible and traceable in extension diagnostics
- desktop disconnect path stays policy-safe and deterministic

## Phase E4 - Replay/audit observability in extension diagnostics

Deliver:

1. Add extension diagnostics panel section for replay summary:
   - total records
   - security session event count
   - last sequence
   - generated timestamp
2. Add explicit controls:
   - refresh replay summary/snapshot
   - reset replay snapshot (dev/test only)
3. Ensure listener cleanup on mount/unmount to prevent duplicated events.
4. Keep replay diagnostics free of PII in exports/screenshots.

Exit evidence:

- replay counters and snapshot views are stable across tab reloads
- no duplicated event handlers after repeated mount/unmount cycles
- reset action is blocked in production mode

## Phase E5 - Adversarial and regression live harness

Deliver:

Run and record repeatable adversarial scenarios in live browser sessions:

1. heard-only ambient noise scenario (no activation)
2. unknown speaker recognized command in Pilot mode (hard block behavior)
3. verified speaker command execution in Pilot mode
4. unknown speaker recognized command hard block in Pilot/Assist
5. contamination/degraded provider fail-closed scenario
6. pause -> listening transition forcing reauth context
7. rapid context jumps across browser surfaces/modal transitions
8. repeated unknown activation bursts (rate guard behavior)

Exit evidence:

- each scenario has pass/fail outcome, logs, reason codes, and expected policy result
- no regressions against baseline command functionality
- scenario report includes replay summary snapshots before/after each scenario

## Contract table (frozen for E0)

| Channel | Direction | Request payload | Response payload | Required fields | Error codes |
| --- | --- | --- | --- | --- | --- |
| `securityRequestSnapshot` | ext -> desktop | `{ requestId, securityContractVersion }` | `securitySnapshot` `{ requestId, securityContractVersion, ...snapshot }` | `requestId`, `securityContractVersion` | `security_bridge_timeout`, `security_bridge_unavailable`, `security_bridge_invalid_payload`, `security_bridge_version_mismatch`, `security_bridge_unauthorized_source` |
| `securityRequestReplaySummary` | ext -> desktop | `{ requestId, securityContractVersion }` | `securityReplaySummary` `{ requestId, securityContractVersion, generatedAt, totalRecords, recordsByCategory, lastSequence }` | `requestId`, `securityContractVersion` | same as above |
| `securityRequestReplaySnapshot` | ext -> desktop | `{ requestId, securityContractVersion }` | `securityReplaySnapshot` `{ requestId, securityContractVersion, generatedAt, totalRecords, recordsByCategory, records }` | `requestId`, `securityContractVersion` | same as above |
| `securityResetReplaySnapshot` | ext -> desktop | `{ requestId, securityContractVersion }` | `securityReplaySummary` (post-reset refresh) | `requestId`, `securityContractVersion` | `security_bridge_reset_forbidden`, plus common codes |
| `securitySetPolicyMode` | ext -> desktop | `{ requestId, securityContractVersion, mode }` | `securitySetPolicyModeAck` `{ requestId, securityContractVersion, mode, app }` | `requestId`, `securityContractVersion`, `mode` | `security_bridge_invalid_payload`, `security_bridge_unauthorized_source`, `security_bridge_version_mismatch` |

## Test strategy

Minimum required:

- unit tests for extension security store transitions
- integration tests for IPC message handling and reconnect/resubscribe
- end-to-end browser tests for lifecycle and gating paths
- regression suite for critical command families
- adversarial suite for unknown/contaminated/degraded/context-jump conditions
- contract tests for schema version, correlation id, and error code mapping

Evidence commands (adapt to extension toolchain):

- type-check command
- extension unit tests
- extension integration tests
- extension e2e tests
- adversarial scenario runner/tests
- contract fixture verification tests

All evidence must be attached to implementation progress updates.

## Definition of Done (Program A1 extension closure)

Program A1 extension work is done only when all are true:

1. Extension consumes desktop security bridge contract end-to-end with reconnect safety.
2. Extension lifecycle states are explicitly and correctly separated:
   - heard
   - activated
   - executed
3. Extension enforces policy parity for:
   - mode
   - reauth-next
   - per-command authentication baseline
   - fail-closed degraded/contaminated behavior
4. Replay summary/snapshot diagnostics are available and stable in extension tooling.
5. Adversarial live harness scenarios pass with captured evidence artifacts.
6. Decision log, gotcha registry, and implementation progress are updated with:
   - what changed
   - why
   - risks
   - evidence
7. No placeholder/stub behavior remains in extension policy handling paths.
8. Contract version + requestId correlation are enforced and tested.
9. `securityResetReplaySnapshot` is verifiably disabled in production mode.
10. Extension state converges to desktop state within 2 seconds after reconnect.
11. Lifecycle monotonicity is enforced unless explicit reconnect bootstrap reset occurs.
12. Fail-closed bridge-unavailable behavior applies only to executable medium/high commands; reflex emergency commands remain allowed.
13. App-scoped mode updates (`securitySetPolicyMode`) converge to desktop focused-app policy state and are reflected in bridge snapshot.

## Required documentation updates during execution

Update after each accepted slice:

- `docs/vos/maestro-implementation-progress.md`
- `docs/vos/maestro-decision-log.md`
- `docs/vos/maestro-gotcha-registry.md`

If policy changes, update and reconcile:

- `docs/browser/security-policy-matrix.md`
- `docs/browser/security-policy-decisions.md`

## Execution order recommendation

1. E0 Contract preflight
2. E1 Contract binding
3. E2 Lifecycle parity
4. E3 Policy parity
5. E4 Replay diagnostics
6. E5 Adversarial and regression closure

This preserves deterministic behavior first, then observability, then hard proof.

## Hard phase gates (binary)

- E0 pass gate: contract table + fixtures + error taxonomy frozen.
- E1 pass gate: bootstrap/reconnect contract sync + schema validation + correlation id passing.
- E2 pass gate: lifecycle separation and dedupe verified by tests.
- E3 pass gate: policy parity tests pass across mode/risk/trust transitions.
- E4 pass gate: replay controls stable, no listener leaks, reset blocked in production.
- E5 pass gate: all 8 adversarial scenarios pass with evidence artifacts archived.

## E5 artifact bundle requirement

For each adversarial scenario, archive one bundle containing:

1. screenshot
2. raw event log
3. reason-code line
4. expected vs actual verdict
