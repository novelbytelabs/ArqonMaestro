# H3_ARTIFICIAL_SURFACES_REGISTER

Status:
Active control document

Purpose:
This document records every known artificial, incomplete, provisional, or test-only surface in H3 / Arqon Maestro so that no fake behavior, silent shim, or hidden placeholder can drift into the product unnoticed.

Constitutional rule:
No artificial surface may silently impersonate a finished production capability.
Every such surface must be classified, justified, bounded, and given an exit condition.

Control categories:

1. Test-only mock
Used only inside tests to isolate dependencies or prevent cross-suite contamination.
Must never affect runtime behavior.

2. Observational placeholder
A real production evidence field or structure that is intentionally not yet connected to live actuation, persistence, or enforcement.
Allowed only when clearly documented.

3. Temporary shim
A compatibility bridge required because adjacent stages were implemented at different times.
Must have a removal target.

4. Forbidden fake
Anything that makes the system appear more complete than it truly is, including fake authority, fake healing, fake antibody enforcement, fake persistence, or fake regime switching.
Forbidden.

Acceptance rules:

- Every new stage bundle must include an “Artificial / Incomplete Surfaces Register” section.
- No new artificial surface may be added without:
  - classification
  - reason
  - operational boundary
  - planned removal or maturation path
- Test mocks must remain test-local.
- Internal communication remains protobuf / type-directed.
- JSON is for human-facing artifacts only.

## Current authoritative baseline

Repository:
ArqonMaestro

Current active branch line:
feature/h3

Known real validated baseline through 3G-S5:
- 3D3 closed
- 3E1 closed
- 3E2 closed
- 3F closed
- 3G-S1 present
- 3G-S1.5 validated
- 3G-S2 validated and stabilized
- 3G-S3 validated and stabilized
- 3G-S4 validated and stabilized
- 3G-S5 validated and stabilized

## Register entries

### A-001
Name:
Counterfactual candidate-population evidence

Classification:
Observational placeholder

Scope:
3G-S1.5 onward

Description:
The system emits bounded counterfactual candidate-population shape and selection metadata, but this is not yet a live execution-ranking or promotion system.

Why it exists:
3G needed RSI/Lazarus observability hardening before later bounded ranking and repair stages.

Operational boundary:
- advisory only
- no authority change
- no promotion / execution control
- no persistence

Exit condition:
Matures during later 3G / 3J work when Selection Function logic becomes a true governed ranking component.

### A-002
Name:
Counterexample capture metadata

Classification:
Observational placeholder

Scope:
3G-S1.5 onward

Description:
Recognition failure/rejection evidence carries counterexample-format and related metadata, but no persisted counterexample store is active.

Why it exists:
3G-S5 needed a bounded pilot shape before live capture / antibody infrastructure.

Operational boundary:
- evidence only
- no persistence
- no registry write
- no live gating

Exit condition:
Matures when counterexample persistence and governed antibody workflow are intentionally introduced.

### A-003
Name:
Antibody pilot metadata

Classification:
Observational placeholder

Scope:
3G-S5 onward

Description:
The runtime can emit antibody-related pilot fields such as mint suggestion, quarantine suggestion, and validation gate hint.

Why it exists:
To define the real future interface without pretending that antibody enforcement already exists.

Operational boundary:
- advisory only
- no minted durable antibodies
- no active antibody gate
- no quarantine state machine actuation

Exit condition:
Removed as a placeholder once true antibody lifecycle and validation enforcement are implemented.

### A-004
Name:
3G repair-window / repair-signal escalation suggestions

Classification:
Observational placeholder

Scope:
3G-S3 onward

Description:
Repair signal pilot can suggest hold-for-repair or continue-observing style behavior, but it does not actuate repair.

Why it exists:
To make repair intelligence measurable before allowing it to shape stronger behavior.

Operational boundary:
- no repair actuation
- no governance bypass
- no command override

Exit condition:
Matures in later 3G stages when bounded guardrail logic is intentionally promoted.

### A-005
Name:
Counterfactual ranking / guardrail pilot

Classification:
Observational placeholder

Scope:
3G-S4 onward

Description:
3G-S4 computes advisory counterfactual ranking / guardrail outputs from ambiguity, repair signal, and stress band.

Why it exists:
To evolve from pure observation toward guarded intelligence without changing authority.

Operational boundary:
- advisory only
- no execution authority
- no policy bypass

Exit condition:
Matures when later governed ranking or guardrail enforcement is explicitly approved.

### A-006
Name:
Test-local mocking in chunk-manager 3G counterfactual suite

Classification:
Test-only mock

Scope:
Test files only

Description:
The counterfactual chunk-manager suite required isolated mocking and cleanup to prevent cross-suite contamination during integrated Jest runs.

Why it exists:
The real integrated suite exposed contamination from test harness behavior, not runtime logic.

Operational boundary:
- test files only
- isolated module loading only
- no runtime dependency on mocks

Exit condition:
Can be removed only if the test harness is refactored to avoid module-level mocking entirely while preserving suite isolation.

### A-007
Name:
Temporary type-shape compatibility fixes in chunk-manager

Classification:
Temporary shim

Scope:
Runtime typing only

Description:
Several recent stages required tiny null vs undefined shape alignments because the evolving event and lookup contracts differed from earlier call-site assumptions.

Why it exists:
To preserve correctness while stage surfaces evolved incrementally.

Operational boundary:
- no behavior change
- typing / contract alignment only

Exit condition:
Review and normalize once the 3G / 3H evidence and runtime contracts stabilize.

## Explicitly forbidden / not present

The following are not allowed and are not knowingly present in the current baseline:

- fake execution authority from warm/focus/shard/task-history/counterfactual signals
- fake H23/H24 bypass
- fake Stage 3A activation drift
- fake persistence / distributed cache
- fake Turbo / Tight / Ultra behavior
- fake antibody enforcement
- fake self-healing / quarantine behavior
- JSON-only internal control channels

## Review cadence

This document must be updated:
- at every new H3 bundle that introduces a placeholder, shim, or test-only mock
- at every stage closure
- before any production-readiness claim

## Required stage-bundle disclosure template

Every future bundle should include a section like this:

Artificial / Incomplete Surfaces Register

- Test-only mocks introduced:
- Observational placeholders introduced:
- Temporary shims introduced:
- Forbidden fake present: yes/no
- Removal / maturation target:
