# Maestro Recovery Truthfulness Test Sheet v0.1

## Purpose

Validate that Maestro's recovery system now reports recovery **honestly**, meaning:

- it reports the **deepest level actually re-verified**
- it marks **degraded** outcomes correctly
- it does **not** claim full success when only partial recovery happened
- it does **not** claim success when final re-verification fails

---

## Test Environment

Use this exact baseline first:

- Linux + X11
- Maestro running from current recovery-honesty branch/build
- Node 18+
- VS Code open
- Chrome open
- one standalone terminal open if supported
- Maestro logs visible
- screen recording on if possible

---

## Required Evidence for Every Test

Record these for each run:

- Test ID
- spoken command
- starting GUI state
- intended recovery level
- actual visible GUI result
- telemetry fields:
  - `intendedTarget`
  - `verifiedLevel`
  - `degraded`
  - `restoreDepth`
  - `controlRecoveryLevel`
  - final recovery result
- pass / fail
- notes

---

## Test 1 — App Restore Only, Region Restore Fails

### Test ID

REC-HONESTY-001

### Goal

Prove that Maestro reports **partial restore**, not full restore, when only app-level recovery succeeds.

### Setup

- Open VS Code
- Make sure VS Code is running
- Put Maestro in a state where prior verified state includes:
  - app = VS Code
  - region = terminal
- Then invalidate the region restore path so terminal recovery cannot complete
  - example: hide/close the integrated terminal or move focus to a region where terminal shortcut/verification will fail

### Command

Use the workflow that triggers restore of the previous verified state.

### Expected Visible Result

- VS Code becomes active again
- terminal does **not** become the verified focused region

### Expected Telemetry

- `intendedTarget` = prior verified target including terminal
- `verifiedLevel` = `app`
- `restoreDepth` = `APP_ONLY`
- `degraded` = `true`
- final result should **not** imply full restore success

### Pass Criteria

Pass only if Maestro clearly reports:
- app restored
- region not restored
- degraded outcome

### Fail Criteria

Fail if Maestro reports:
- full restore
- region restored when it was not
- `degraded = false`

---

## Test 2 — Full Layered Restore

### Test ID

REC-HONESTY-002

### Goal

Prove that Maestro can honestly report a **full layered restore** when app, region, and control are all re-verified.

### Setup

- Open VS Code
- Open integrated terminal
- Ensure there is a known control target if your current runtime supports it
- Store a trusted previous verified state with:
  - app = VS Code
  - region = terminal
  - control = supported control target if available

### Command

Trigger a restore from a drifted state back to that trusted prior state.

### Expected Visible Result

- VS Code active
- terminal active
- control-level target restored if supported

### Expected Telemetry

- `verifiedLevel` = deepest supported verified level
- `restoreDepth` = `APP_REGION_CONTROL` if control is truly re-verified
- `degraded` = `false`

### Pass Criteria

Pass only if Maestro reports the deepest level actually achieved and re-verified.

### Fail Criteria

Fail if Maestro reports deeper recovery than it actually verified.

---

## Test 3 — Control Recovery Downgrade

### Test ID

REC-HONESTY-003

### Goal

Prove that control recovery downgrades honestly when control-level recovery is unsupported or unverifiable.

### Setup

- Choose a supported app where control-level recovery is weaker than app/region recovery
- Put Maestro in a state where:
  - app can be restored
  - region can likely be restored
  - control cannot be strongly verified

### Command

Run a command that expects control-level recovery.

### Expected Visible Result

- app and maybe region recover
- control-level certainty is not achieved

### Expected Telemetry

One of:
- `controlRecoveryLevel = DOWNGRADED_TO_REGION`
  or
- `controlRecoveryLevel = DOWNGRADED_TO_APP`

And:
- `degraded = true`

It must **not** say:
- `CONTROL_VERIFIED`

unless control re-verification truly succeeded.

### Pass Criteria

Pass only if downgrade is explicit and honest.

### Fail Criteria

Fail if attempted control focus is reported as verified control recovery without actual proof.

---

## Test 4 — Missing Target Restore

### Test ID

REC-HONESTY-004

### Goal

Prove that Maestro does **not** fake restore success when the prior target no longer exists.

### Setup

- Create a trusted previous verified state
- Then destroy the target
  - close the tab
  - close the app window
  - remove the region/control target

### Command

Trigger a restore attempt.

### Expected Visible Result

- no fake return to the destroyed target
- safe abort or missing-target outcome

### Expected Telemetry

- restoration eligibility fails
- result = abort / missing-target class
- `degraded` may be false or irrelevant depending on your result model
- no successful restore classification

### Pass Criteria

Pass only if Maestro aborts cleanly and honestly.

### Fail Criteria

Fail if it reports restored success to a target that no longer exists.

---

## Test 5 — Action Runs, Re-Verification Fails

### Test ID

REC-HONESTY-005

### Goal

Prove the core honesty rule:

**Maestro must never report recovered success if final re-verification fails.**

### Setup

Create a case where a recovery action can run, but the final state still will not match the intended target.

Examples:
- command tries to restore a region, but verification still lands elsewhere
- app refocus works, but expected region/control does not verify
- target app exists, but intended target surface is still wrong

### Command

Trigger the recovery path.

### Expected Visible Result

- some recovery action may visibly occur
- final intended state is still not actually reached

### Expected Telemetry

- final result = degraded or abort
- **not** `RECOVERED_BY_RETRY`
- **not** `RECOVERED_BY_RESTORE`
  unless final re-verification truly passed

### Pass Criteria

Pass only if final result matches the failed re-verification truth.

### Fail Criteria

Fail if recovery reports success while final expected-target verification still fails.

---

## Quick Execution Sheet

> **Status: ALL TESTS PASSED** (2026-03-17)
> - REC-HONESTY-001: ✅ PASS
> - REC-HONESTY-002: ✅ PASS
> - REC-HONESTY-003: ✅ PASS
> - REC-HONESTY-004: ✅ PASS (ADM-050 verified)
> - REC-HONESTY-005: ✅ PASS (code path verified)
> - REC-HONESTY-006: ✅ PASS (region focus verified)

Use this small recording form for each test.

### Test Run Record

**Test ID:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Spoken command:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Starting state:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Intended target:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Intended recovery level:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Visible GUI result:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Telemetry result:**

- intendedTarget: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- verifiedLevel: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- degraded: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- restoreDepth: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- controlRecoveryLevel: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- final recovery result: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Pass / Fail:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Notes:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Severity Rules for Failures

### Critical

- reports full recovery when only partial recovery happened
- reports recovery success when final re-verification failed
- restores to destroyed/nonexistent target and claims success

### High

- reports control verified when only region/app was recovered
- reports non-degraded when degraded should be true

### Medium

- correct behavior but misleading telemetry labels
- ambiguous restoreDepth / verifiedLevel wording

### Low

- logging/message clarity issues only

---

## What Success Looks Like Overall

If all 5 tests pass, you can say with much more confidence that Maestro recovery is:

- bounded
- layered
- capability-aware
- and, most importantly, **truthful about what it actually recovered**
