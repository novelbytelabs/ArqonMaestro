# H4 Authority Transition Constitution

## Document identity

Title:
Arqon Maestro H4 Authority Transition Constitution

Project:
`H4`

Branch:
`feature/h4`

Role:
Foundational governing document for promoting the completed H3/3J substrate into the live authoritative command-lane runtime path in development.

Purpose:
Define what H4 is, what authoritative means, what is being rolled out, how fallback works, how live microphone testing is prioritized, and what constraints govern the transition.

---

## 1. Mission

H4 exists to promote the completed H3/3J substrate into the live authoritative command-lane path of Maestro in development.

H4 is not a UX/UI project.
H4 is not an advisory-shadow exercise.
H4 is the project that makes the new system live, broad, and real.

Its central aim is:

Make the H3/3J command-lane substrate the actual governing runtime authority in development so it can be tested under real microphone conditions as the system itself, not as an observational side path.

---

## 2. Core thesis

The core thesis of H4 is:

The biggest remaining risk is no longer design incompleteness.
The biggest remaining risk is failure to place the completed system into real authority soon enough to discover whether it actually works live.

Therefore H4 rejects keeping the new system advisory-first by default in development.

Instead, H4 adopts this posture:

In development, the H3/3J path becomes the default live authority for command-lane processing, with explicit fallback, explicit logging, and reversible control.

That is the doctrine of H4.

---

## 3. Authoritative baseline

H4 begins from the closed and green H3/3J baseline on:

- repo: `ArqonMaestro`
- source branch baseline: `feature/h3`
- closure commit: `7735a20`

H4 should branch from that state into:

- branch: `feature/h4`

That H3 closure state is the authoritative substrate beneath H4.

---

## 4. What H4 means by authority

For H4, authoritative means:

The new H3/3J path is the default governing path for live command-lane runtime decisions in development.

That includes:

- live mic input entering the new path by default
- command-lane processing resolved through the new path by default
- runtime decision output coming from the new path by default
- old paths demoted to fallback, comparison, or recovery roles rather than primary governing roles

Authority does not mean infallibility.
Authority means primary control.

---

## 5. Scope of H4

H4 governs:

- development-live cutover of the command lane
- authoritative live microphone path integration
- runtime authority transfer from old path to new path
- explicit fallback rules
- observability and diagnostics for authoritative runtime use
- bounded rollout of broader runtime trust in the new path
- integration map for which surfaces are authoritative vs fallback
- live testing under real microphone usage
- hardening based on real runtime failures

H4 does not primarily govern:

- polished end-user UX/UI
- workflow inbox visual design
- workflow library browsing UX
- sharing UX
- organization UI
- end-user onboarding flows

Those belong later, after authority is real.

---

## 6. Foundational doctrine

H4 must preserve the following laws.

### 6.1 The new path must be live
The H3/3J path must stop being treated as a secondary truth and must be routed into the live development runtime.

### 6.2 Authority is primary, fallback is secondary
The new path becomes the default authority.
Fallback exists to preserve reversibility and diagnose failure, not to remain the true system indefinitely.

### 6.3 Fallback may run only under explicit failure
If the authoritative path fails to produce a lawful final decision, fallback may run, but it must be explicit, logged, and reversible.

### 6.4 No silent fallback
Fallback must never occur invisibly.
If fallback runs, the system must know:
- that fallback ran
- why it ran
- where authority failed
- what decision fallback produced

### 6.5 No silent dual-authority ambiguity
At any given runtime decision boundary, the system must have a clearly identified primary authority path.

### 6.6 Live mic testing is first-class
H4 must prioritize real microphone testing over theoretical architecture perfection.

### 6.7 Reversible cutover
Authority transfer must be reversible in development without damaging the architecture.

### 6.8 Real-runtime truth outranks simulated confidence
A system that looks elegant in tests but fails under the live mic must be treated as unproven.

---

## 7. Development posture

H4 explicitly assumes:

- zero external users
- development environment
- high willingness to cut over aggressively
- strong need for live testing now
- strong need for observability and rollback
- low need for productized rollout ceremony

So H4 chooses:

- aggressive development-authoritative rollout
- not enterprise-style gradual rollout theater

This is the right posture for the current phase.

---

## 8. Command-lane priority

H4 begins with the command lane.

Not the whole product at once.

The first authoritative rollout target is:

- live microphone input
- command-lane routing
- H3/3J runtime processing
- decision output
- fallback logging if needed

This is the core loop that must become real first.

---

## 9. Live microphone doctrine

H4 treats real microphone testing as the decisive proving ground.

The first proof target of H4 is:

Can Maestro now run the new command-lane authority path live from microphone input as the actual governing development runtime?

This question takes precedence over:
- UI polish
- future user workflows
- long-term preference tuning
- cosmetic integration work

Until live microphone authority is real, the rest remains secondary.

---

## 10. Authority transfer doctrine

Authority transfer in H4 should proceed through staged development cutover.

The intended pattern is:

- new path becomes default authority
- old path remains bounded fallback
- authority boundaries are explicit
- failures are logged
- repairs are microscopic
- live runtime proves or disproves correctness

H4 rejects keeping the new path permanently advisory while continuing to design around it.

---

## 11. Fallback doctrine

Fallback is allowed, but only under strict rules.

### 11.1 Fallback trigger
Fallback may run only when the authoritative path fails to produce a lawful final decision.

### 11.2 Fallback must be explicit
The system must explicitly record:
- authority attempted
- authority failed
- fallback invoked
- fallback output selected

### 11.3 Fallback must be logged
Every fallback invocation must be traceable.

### 11.4 Fallback must be reversible
Fallback is not permanent surrender of authority.
It is a bounded recovery mechanism.

### 11.5 Fallback must not silently define the true system
If fallback becomes frequent, that is evidence the authoritative path still needs work.
It is not license to pretend rollout succeeded.

---

## 12. Observability doctrine

H4 requires heavy runtime truth surfaces.

At minimum, H4 should ensure explicit visibility for:

- mic intake received
- command-lane classification
- authority path engaged
- discovery state
- skeleton state
- scoring/risk state
- rubric/promotion state
- final authoritative runtime decision
- fallback invocation, if any
- fallback reason
- final chosen runtime outcome

These do not need polished UI now.
They need to exist.

---

## 13. H4 success criteria

H4 is successful when the following become true in development:

- live mic input flows into the new path by default
- the new path governs command-lane runtime decisions by default
- the old path is demoted to bounded fallback
- fallback is explicit, logged, and reversible
- real microphone testing produces meaningful evidence
- real failures are repaired through microscopic fixes
- the system begins behaving as one live authoritative whole rather than a split conceptual stack

---

## 14. H4 failure modes

H4 exists to prevent these failures:

- keeping the new system advisory too long
- never truly testing it live
- building UX on top of non-authoritative runtime foundations
- silent fallback that obscures truth
- dual-authority confusion
- broad cutover with no observability
- theoretical confidence replacing live runtime proof
- letting old paths remain the de facto real system indefinitely

---

## 15. Relationship to 3K and later UX/UI work

H4 precedes major UX/UI work.

The correct order is:

- H4 makes the system authoritative
- 3K or later makes the authoritative system beautiful, navigable, and user-facing

UX/UI should be built around the real governing system, not around a substrate that still has not taken command of the runtime.

---

## 16. Recommended H4 rollout shape

H4 should proceed in bounded slices such as:

- `H4-S1` Authority constitution + integration map
- `H4-S2` Live mic entry integration
- `H4-S3` Command-lane authority spine cutover
- `H4-S4` Broader runtime authority expansion
- `H4-S5` Live-use hardening and fallback discipline
- `H4-S6` Closure / validation / freeze

---

## 17. Non-goals

H4 is not trying to do all of the following immediately:

- final workflow UX
- polished settings surfaces
- sharing UI
- library browsing UI
- end-user trust onboarding
- public rollout safety theater
- execution-stage completion beyond what is needed for authoritative live command-lane testing

H4 is primarily about runtime authority transfer.

---

## 18. Constitutional summary

H4 exists to correct the failure to make the new system live-authoritative early enough.

Its role is to promote the completed H3/3J substrate into the default command-lane authority in development, especially under live microphone input.

Its governing law is:

If the authoritative path fails to produce a lawful final decision, fallback may run, but it must be explicit, logged, and reversible.
