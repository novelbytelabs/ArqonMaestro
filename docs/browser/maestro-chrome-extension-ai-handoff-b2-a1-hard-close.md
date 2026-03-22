# Maestro Chrome Extension AI Handoff - Program A1 + Program B2 Hard-Close

Date: 2026-03-22  
Audience: AI agent operating in the `maestro-chrome-extension` workspace

## Purpose

This document is the execution handoff for the extension-side AI to close the remaining cross-surface security work between:

- desktop runtime (`maestro/client`) already updated
- browser extension consumer/parity flows still pending

The goal is to complete extension parity and evidence so Program A1/B2 can be promoted to hard-close (subject to live-operator scenario execution).

## Big picture

Desktop runtime is now provider-outcome aware for passkey bootstrap, with explicit contract wiring:

- desktop IPC:
  - `securityBeginPasskeyProviderChallenge`
  - `securityReportPasskeyProviderOutcome`
- plugin bus:
  - accepts `securityReportPasskeyProviderOutcome`
  - responds with `securityReportPasskeyProviderOutcomeAck`

The extension must consume and emit this contract correctly so bootstrap authority can move from transitional `session_auth` fallback to provider-outcome-first behavior.

## Canonical context to trust

Use these as sources of truth while implementing:

- `docs/security/session-bootstrap-root-trust.md`
- `docs/browser/extension-program-a1-plan.md`
- `docs/vos/maestro-implementation-progress.md`
- `docs/vos/maestro-decision-log.md` (includes VOS-039)
- `docs/vos/maestro-gotcha-registry.md` (includes G-034)

Desktop implementation references (already landed):

- `maestro/client/src/main/runtime/passkey-bootstrap-service.ts`
- `maestro/client/src/main/execute/executor.ts`
- `maestro/client/src/main/app.ts`
- `maestro/client/src/main/events.ts`
- `maestro/client/src/main/ipc/bus-plugin-server.ts`

## What the extension AI must do

## 1) Contract parity updates (required first)

Update extension security contract/types/validators to include provider outcome messaging:

### Request from extension to desktop/plugin bus

Message: `securityReportPasskeyProviderOutcome`

Required payload fields:

- `requestId: string`
- `securityContractVersion: "a1.v1"`
- `provider: string` (non-empty)
- `verified: boolean`
- `method: "passkey" | "totp_recovery"`

Optional payload fields:

- `challengeId?: string`
- `reasonCode?: string`

### Expected ack from desktop/plugin bus

Message: `securityReportPasskeyProviderOutcomeAck`

Expected fields:

- `requestId`
- `securityContractVersion`
- `app`
- `provider`
- `challengeId`
- `verified`
- `method`
- `reasonCode`

### Existing contract rules still apply

- strict `requestId` correlation
- strict `securityContractVersion: "a1.v1"`
- deterministic error code handling:
  - `security_bridge_timeout`
  - `security_bridge_unavailable`
  - `security_bridge_invalid_payload`
  - `security_bridge_version_mismatch`
  - `security_bridge_unauthorized_source`
  - `security_bridge_reset_forbidden`

## 2) Extension state/store parity

Ensure extension state model can represent new passkey provider observability fields from bridge state/snapshot:

- `securityPasskeyProviderChallengeActive`
- `securityPasskeyProviderChallengeId`
- `securityPasskeyLastProviderName`
- `securityPasskeyLastProviderOutcome`
- `securityPasskeyLastProviderReasonCode`
- `securityPasskeyLastProviderOutcomeAt`

Requirements:

- additive/non-breaking
- reconnect-safe and reload-safe
- schema-validated ingestion only

## 3) Wire provider challenge/outcome flow in extension runtime

Implement end-to-end path:

1. extension starts passkey provider challenge (local provider UI/adapter)
2. on completion/failure, extension emits `securityReportPasskeyProviderOutcome`
3. extension waits for ack and records success/failure telemetry
4. extension refreshes snapshot/bridge state and verifies bootstrap transition

Behavior requirements:

- on verify success, bootstrap should reflect provider outcome (not only session fallback)
- on verify failure, bootstrap remains blocked and surfaces reason code
- no silent success when ack missing/mismatched

## 4) Tests to add/expand

Add or extend tests in extension workspace for:

1. contract fixtures:
   - valid provider outcome request
   - missing provider -> invalid payload
   - version mismatch hard-fail
2. request/response correlation:
   - out-of-order ack handling
   - wrong requestId ack rejection
3. lifecycle resilience:
   - reconnect during challenge
   - duplicate outcome send dedupe
4. policy behavior:
   - provider success transitions bootstrap state
   - provider failure keeps bootstrap blocked
5. bridge parity:
   - all passkey provider observability fields present after refresh

## 5) Live adversarial scenarios (operator-run evidence)

Execute and capture artifacts for these minimum scenarios:

1. provider verify success (`method: passkey`) -> bootstrap unlock path
2. provider verify failure with reason code -> remains locked
3. challenge timeout -> deterministic timeout error path
4. bridge unavailable during outcome report -> fail-closed handling
5. reconnect mid-challenge -> no duplicate/ghost outcome
6. outcome ack requestId mismatch -> rejected and retried/failed deterministically
7. `method: totp_recovery` outcome handling path
8. transition comparison: `session_auth` fallback vs provider-verified path

For each scenario produce bundle:

- screenshot
- raw event log export
- request/response payload excerpts (redacted)
- expected vs actual result
- reason code line

## 6) Documentation updates expected from extension AI

After implementation and test pass:

- update extension-side docs/runbook if needed
- append a new execution update in `docs/vos/maestro-implementation-progress.md`
- append decision or gotcha entries only if new behavior/risk emerges

## Non-goals / do not do

- do not loosen contract strictness (`a1.v1`, requestId correlation)
- do not introduce fake/manual bootstrap bypass paths
- do not alter canonical policy law in browser docs without explicit policy decision
- do not claim hard-close without live scenario evidence bundles

## Definition of Done (Hard-Close readiness for extension slice)

This extension handoff is done only when all are true:

1. Provider outcome contract is fully implemented in extension and validated against desktop/plugin bus.
2. Extension state shows new passkey provider observability fields correctly after refresh/reconnect.
3. Contract and integration tests pass (including correlation/version/error-path tests).
4. Adversarial live scenario bundles are complete for all 8 scenarios listed above.
5. No regressions in existing A1 security snapshot/replay/policy-mode flows.
6. `docs/vos/maestro-implementation-progress.md` is updated with:
   - what landed
   - commands run
   - pass/fail evidence
   - residual risks
   - explicit next step
7. If any install/dependency change was needed, it was permissioned first and documented.

## Suggested execution order for the extension AI

1. Contract fixtures/types first
2. Runtime wiring second
3. Tests third
4. Live scenario evidence fourth
5. Continuity docs update last

## Operator note

If the extension AI cannot access desktop runtime repo files, it should still use this document as contract authority and request only the minimal missing payload examples needed for parity checks.
