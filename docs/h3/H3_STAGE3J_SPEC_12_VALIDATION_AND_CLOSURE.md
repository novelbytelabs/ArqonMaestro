# 3J Spec 12 — Validation and Closure

## Document identity

**Title:**
Arqon Maestro 3J Validation and Closure

**Stage:**
`3J`

**Spec role:**
Validation, success-criteria, and closure specification

**Purpose:**
Define how `3J` is validated, what counts as success, what metrics matter, what failure modes must be guarded against, and what must be true before Stage `3J` can be declared complete and closed.

This spec is the final discipline layer that prevents `3J` from being declared “done” merely because it functions.
It defines when `3J` is truly worthy of closure.

---

## 1. Mission

`3J` must not be validated only by:

* code compiling
* tests passing
* APIs existing
* workflow drafts being created

Those are necessary, but not sufficient.

The mission of `3J` validation is:

**prove that workflow discovery, abstraction, scoring, risk, rubric, promotion, trust, and draft creation work together as a coherent, useful, calm, and trustworthy creation system.**

This is the proof layer of the capstone.

---

## 2. Core thesis

A workflow-creation system can be technically correct and still fail in practice.

For `3J`, the real validation target is not just:

* “does it work?”

It is:

* “does it exercise good judgment?”
* “does it avoid clutter?”
* “does it earn trust?”
* “does it surface well?”
* “does it create artifacts worth keeping?”
* “does it remain within doctrine?”

So the core thesis is:

**3J closes only when it demonstrates quality of judgment, not merely functionality of mechanism.**

---

## 3. Constitutional status

This spec is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`
* `H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`
* `H3_STAGE3J_SPEC_03_SCORING_MODEL.md`
* `H3_STAGE3J_SPEC_04_RISK_ENGINE.md`
* `H3_STAGE3J_SPEC_05_RUBRIC_FRAMEWORK.md`
* `H3_STAGE3J_SPEC_06_PROMOTION_ENGINE.md`
* `H3_STAGE3J_SPEC_07_WORKFLOW_DISCOVERY.md`
* `H3_STAGE3J_SPEC_08_WORKFLOW_SKELETON_INFERENCE.md`
* `H3_STAGE3J_SPEC_09_SUGGESTION_PRESSURE_AND_TIMING.md`
* `H3_STAGE3J_SPEC_10_PREFERENCES_AND_TRUST_POLICY.md`
* `H3_STAGE3J_SPEC_11_DRAFT_AND_LIBRARY_API.md`

Validation must prove that the whole `3J` stack obeys these documents together.

---

## 4. Design requirements

The validation system must be:

* doctrine-aware
* metric-aware
* quality-aware
* artifact-aware
* user-trust-aware
* clutter-aware
* interruption-aware
* calmness-aware
* able to detect regression in judgment, not just runtime behavior

It must avoid:

* “all tests pass so we’re done”
* validating only happy-path artifact creation
* ignoring duplicate/clutter outcomes
* ignoring user-facing timing quality
* ignoring explainability quality
* ignoring promotion/risk/trust miscalibration

---

## 5. Validation layers

`3J` validation must occur across multiple layers:

1. doctrinal validation
2. structural validation
3. artifact validation
4. scoring/risk/rubric validation
5. promotion validation
6. timing/surfacing validation
7. trust/policy validation
8. quality outcome validation
9. closure audit validation

Each layer matters.

---

## 6. Doctrinal validation

The system must prove that `3J` obeys its constitution.

At minimum, validation must confirm:

* creation remains separate from execution
* no workflow artifact silently implies execution authority
* promotion never collapses into execution
* no hidden auto-run behavior exists
* no H23/H24 bypass occurs through workflow creation paths
* no Stage 3A drift is introduced
* no persistence/distributed cache is introduced unless explicitly opened in-stage
* protobuf/type-directed internals are preserved where required
* JSON remains human-facing only

If these are violated, `3J` is not closable regardless of feature completeness.

---

## 7. Structural validation

The system must validate that candidates and drafts have the required structure.

At minimum:

* candidate identity fields are present
* provenance is preserved
* discovery evidence is preserved
* skeleton structure is explicit
* slot inference fields are explicit
* scoring surfaces are present
* risk surfaces are present
* rubric surfaces are present
* promotion surfaces are present
* draft artifacts preserve provenance and explanation

This is the artifact-integrity layer.

---

## 8. Discovery validation

The system must validate that discovery is not junk-heavy.

At minimum it should verify:

* repeated governed subsequences are discovered correctly
* trivial one-off sequences are not overpromoted into candidate formation
* duplicate rediscovery merges or reinforces rather than spams
* boundary-sensitive repeated subsequences are handled honestly
* near-repeat tolerance remains bounded
* distinct-run evidence contributes meaningfully

This is where `3J` proves it is discovering workflows rather than noise.

---

## 9. Skeleton inference validation

The system must validate that abstraction is honest.

At minimum it should verify:

* fixed steps are inferred correctly
* variable steps are not invented from weak evidence
* optional steps are not just uncertainty mislabeled
* slot inference is bounded and explainable
* unstable branches increase caution instead of being silently flattened
* family splits occur when patterns should not be unified

This is one of the most important validation areas in all of `3J`.

---

## 10. Scoring validation

The scoring system must be validated for:

* completeness
* stability
* boundedness
* directionality correctness
* internal consistency

At minimum validation should verify:

* all seven core scores are present when promotion above `observe_only` occurs
* score directions are correct
* score bands behave as intended
* scores move sensibly when evidence improves or worsens
* score changes do not behave erratically without evidence changes
* score reason codes remain meaningful

---

## 11. Risk validation

The risk engine must be validated for:

* component completeness
* risk band correctness
* veto behavior
* class-aware caution
* explainability

At minimum validation should verify:

* all required risk components exist
* risk ceilings actually constrain promotion
* high-risk candidates are not auto-created
* low-risk candidates are eligible for stronger promotion only when policy/trust allow
* abstraction ambiguity correctly increases risk
* duplicate/clutter conditions raise risk appropriately

This is where `3J` proves it can be trusted with low-risk auto-creation without becoming reckless.

---

## 12. Rubric validation

The rubric framework must be validated for:

* correct layer application
* class sensitivity
* user sensitivity
* timing sensitivity
* veto and downgrade correctness

At minimum validation should verify:

* baseline rubric catches weak candidates
* class rubric changes behavior appropriately by workflow class
* user rubric respects preference ceilings
* timing rubric reroutes rather than blindly suppresses or over-surfaces
* rubric reason codes remain interpretable
* veto-capable situations actually behave like vetoes

---

## 13. Promotion engine validation

The promotion engine must be validated for:

* correct state outputs
* correct ceilings and floors
* correct downgrade behavior
* correct auto-create eligibility
* correct auto-save eligibility
* correct channel routing

At minimum validation should verify:

* `observe_only` works as a real state
* `hold_for_more_evidence` is used meaningfully
* valid candidates can route to inbox instead of inline
* inline is not overused
* auto-create requires the right risk/trust/policy conditions
* auto-save is stricter than auto-create
* no candidate is promoted beyond its lawful ceiling

---

## 14. Suggestion pressure and timing validation

The timing system must be validated for:

* interruption discipline
* queue-pressure behavior
* recency suppression
* digest/inbox routing quality
* training vs mature mode behavior

At minimum validation should verify:

* repeated near-duplicate suggestions are suppressed correctly
* inbox/digest routing occurs when inline would be badly timed
* training mode surfaces more but still within doctrine
* mature mode reduces noise
* strong candidates are not buried merely because of crude suppression
* surfacing channels are distinguishable and meaningful

---

## 15. Preferences and trust validation

The preferences and trust policy must be validated for:

* class-specific autonomy
* user sovereignty
* trust accumulation correctness
* trust decay correctness
* onboarding/training behavior
* low-risk auto-create policy behavior

At minimum validation should verify:

* user ceilings are respected
* class trust and global trust are distinct
* low-risk auto-create works only when policy allows
* disallowed classes remain disallowed
* trust improves with good outcomes
* trust falls with repeated bad outcomes
* mature behavior actually calms down over time

---

## 16. Draft and library API validation

The API/artifact layer must be validated for:

* artifact completeness
* provenance preservation
* editability
* reviewability
* organization readiness
* sharing readiness

At minimum validation should verify:

* drafts preserve candidate provenance
* drafts preserve explanation surfaces
* lifecycle transitions are explicit
* organization fields are present
* sharing-preparation fields are present
* no draft appears as an unexplained object with unclear origin

---

## 17. Quality outcome metrics

These are the most important real-world success measures.

### 17.1 Approval rate

How often surfaced candidates are accepted.

This matters, but not alone.

### 17.2 Reuse rate

How often accepted or auto-created drafts are later reused or retained.

This is one of the strongest indicators of actual value.

### 17.3 Regret rate

How often accepted or auto-created drafts are later dismissed, heavily rewritten, or effectively abandoned.

Lower is better.

### 17.4 Duplicate rate

How often candidates or drafts are judged duplicative or near-duplicative.

Lower is better.

### 17.5 Suggestion usefulness rate

How often surfaced suggestions are judged helpful relative to total surfaced suggestions.

Higher is better.

### 17.6 Interruption burden

How often inline surfaces feel mistimed or intrusive.

Lower is better.

### 17.7 Auto-created draft keep-rate

For drafts auto-created under allowed policy:
how often they remain valuable rather than being dismissed or ignored.

This is a very important `3J` metric.

---

## 18. High-value validation principle

The most important KPI family is not raw suggestion count.

It is something like:

**high approval and reuse with low suggestion volume and low regret**

That is the capstone signal.

A system can inflate approval by suggesting trivial things.
A system can reduce regret by saying almost nothing.
Neither is enough.

The sweet spot is:

* strong value
* low clutter
* low interruption
* high later usefulness

---

## 19. Candidate-quality validation scenarios

Validation must include scenarios such as:

* repeated clean workflow
* repeated workflow with bounded parameter variation
* repeated workflow with optional steps
* repeated workflow with unresolved branching
* duplicate rediscovery
* trivial repeated pattern
* cross-app pattern with moderate utility
* shell-like pattern with higher caution requirements
* pattern strong enough for inbox but not inline
* low-risk pattern eligible for auto-create under policy
* low-risk pattern not eligible due to user/class ceilings

These scenario families are required to prove `3J` is actually judging well.

---

## 20. Negative validation scenarios

`3J` must also be validated against failure cases.

Examples:

* false workflow discovery from one-off bursts
* overgeneralized slot inference
* duplicate candidate spam
* silent escalation to auto-create for moderate/high-risk patterns
* inline surfacing during high-pressure timing states
* class-insensitive trust overreach
* auto-save draft creation when clutter risk is high
* resurfacing dismissed patterns too soon
* missing provenance in drafts
* weak candidates promoted because utility alone is high

These are essential because the capstone must prove it avoids bad judgment, not just perform good-path behavior.

---

## 21. Explainability validation

`3J` must be validated for explainability.

At minimum, for promoted candidates and drafts, the system must be able to explain:

* why it was detected
* why it was considered useful
* why it was low/moderate/high risk
* why it was surfaced or held
* why it was eligible or not eligible for auto-create
* which policy/trust conditions mattered
* which class-specific factors mattered

A capstone system that cannot explain itself will not earn trust.

---

## 22. API and artifact audit validation

Before closure, artifact audit validation should confirm:

* candidate objects are structurally consistent
* draft objects are structurally consistent
* persistent-draft surfaces are explicit
* lifecycle states are valid
* provenance chains remain intact
* suppression/archive states are explicit
* no hidden workflow artifacts exist that are not inspectable/governable

This is part of the closure audit.

---

## 23. Mode-specific validation

Validation should distinguish at least:

* training mode behavior
* mature mode behavior
* quiet mode behavior
* sleep-mode discovery/digest behavior

Each mode should show:

* appropriate volume
* appropriate surfacing behavior
* appropriate use of inbox/digest/hold
* appropriate respect for user policy and risk

---

## 24. Closure prerequisites

Stage `3J` may be considered for closure only when all of the following are true:

### Doctrinal prerequisites

* doctrine preserved
* creation/execution separation preserved
* no forbidden bypasses or drifts introduced

### Structural prerequisites

* candidate model implemented coherently
* drafts/library API implemented coherently
* scoring/risk/rubric/promotion surfaces are explicit and working

### Behavioral prerequisites

* discovery behaves meaningfully
* skeleton inference behaves meaningfully
* promotion ladder behaves correctly
* suggestion timing behaves calmly
* trust/policy behaves correctly
* low-risk auto-create behaves lawfully where allowed

### Quality prerequisites

* suggestion quality is strong enough
* clutter/duplicate behavior is controlled
* explainability is present
* no major regression patterns remain unresolved

### Validation prerequisites

* required code/test gates green
* required artifact audits green
* required scenario validations green
* required docs aligned with implementation

Only then is `3J` closable.

---

## 25. Closure artifacts

Before closing `3J`, the stage should produce closure artifacts analogous in spirit to previous stage closures.

Recommended closure artifacts:

* `H3_STAGE3J_STATUS_REPORT.md`
* `H3_STAGE3J_VALIDATION_GATES_GUIDE.md`
* final updated `H3_RUNTIME_EVIDENCE_SCHEMA.md`
* final updated `H3_STAGE3J_PLAN.md`
* any stage-specific validation report or findings summary needed for auditability

These should freeze:

* doctrine
* validation results
* open non-goals
* known bounded incomplete surfaces
* the real validated baseline

---

## 26. Closure truth standard

`3J` should not be declared complete because it “basically works.”

It should be declared complete only when the real validated baseline shows:

* cohesive workflow discovery
* disciplined abstraction
* explainable scoring/risk/rubric/promotion behavior
* calm timing and surfacing behavior
* trustworthy low-risk draft creation policy behavior
* draft/library API readiness for future UI/UX
* no doctrine drift

That is the closure truth standard.

---

## 27. Non-goals of this spec

This spec does not itself define:

* code-level test files
* exact per-function assertions
* UI design
* execution-stage validation
* future workflow replay correctness

It defines how the stage as a whole is judged and closed.

---

## 28. Failure modes this spec is designed to prevent

This spec exists to prevent:

* declaring `3J` done because APIs exist
* declaring `3J` done because a few demos worked
* ignoring duplicate clutter
* ignoring interruption burden
* ignoring explanation quality
* ignoring trust miscalibration
* ignoring candidate-to-draft artifact integrity
* closing the capstone without proving judgment quality

---

## 29. Why this spec is holy-grail critical

This is the spec that protects the whole capstone from being self-congratulatory too early.

You are not trying to build a system that merely:

* suggests workflows
* creates draft objects
* passes unit tests

You are trying to build:

* a lawful workflow-creation judgment engine
* a system that earns trust
* a system that becomes worthy of auto-approval
* a system that feels like the holy grail of command-lane workflow intelligence

That only counts if closure is strict.

This spec is what makes that strictness real.

---

## 30. Summary

The `3J` Validation and Closure spec defines what must be true before Stage `3J` can be considered truly complete.

It requires validation across:

* doctrine
* discovery
* inference
* scoring
* risk
* rubrics
* promotion
* timing
* trust/policy
* draft/library artifacts
* quality outcomes

It defines the closure truth standard:

**3J closes only when it demonstrates coherent, explainable, calm, risk-bounded workflow creation judgment on a real validated baseline.**