# H4 Gates and Fallbacks

## Purpose

Define the rules, gates, fallback triggers, and rollback posture for the H4 authority transition.

---

## 1. Core fallback law

If the authoritative path fails to produce a lawful final decision, fallback may run, but it must be explicit, logged, and reversible.

This is the central runtime rule of H4.

---

## 2. Fallback trigger conditions

Fallback may run only when at least one of the following is true:

- the authoritative path does not produce a lawful final decision
- the authoritative path returns an explicit non-decision / ineligible state at the decision boundary
- the authoritative path encounters a bounded runtime failure that prevents lawful decision completion

Fallback must not run merely because it is convenient.

---

## 3. Fallback logging requirements

Every fallback invocation must log:

- authoritative path engaged
- authoritative path failure reason
- fallback invoked
- fallback output selected
- whether the result was returned from authority or fallback

No silent fallback is allowed.

---

## 4. Reversibility rule

Fallback must remain reversible.

Meaning:
- fallback does not permanently redefine the architecture
- fallback remains a bounded runtime recovery mechanism
- the system can return to authority-first behavior after repair

---

## 5. H4 gate families

### Gate family A — repo correctness
- `cd maestro/client && npx tsc --noEmit`
- targeted `jest --runInBand` suites for the active H4 slice plus affected standing H3/3J suites
- `cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py`

### Gate family B — authority observability
The active slice must preserve visibility of:
- path chosen
- authority success/failure
- fallback used/not used
- final decision origin

### Gate family C — live-runtime proof
For live-authority slices, the slice must produce real microphone or live-runtime proof artifacts.

---

## 6. Kill-switch posture

H4 should preserve a development rollback posture that allows:

- temporarily disabling authority-first routing if a severe defect is found
- returning to fallback-first only as an explicit and logged development action

The kill switch must not become a silent permanent crutch.

---

## 7. Slice discipline

Every H4 slice must obey:

- one bounded slice only
- stop on first failure
- microscopic repairs only
- repaired green baseline becomes authoritative
- no scope broadening because a failure was found

---

## 8. Closure rule

H4 may only close when:

- the authority path is primary in development
- fallback remains explicit, logged, and reversible
- live microphone proof exists
- the real baseline is green

---

## 9. H4-S1 completion statement

H4-S1 is complete when the fallback rules and gate rules are explicit enough that H4-S2 can wire live mic entry into the new authoritative path without ambiguity.
