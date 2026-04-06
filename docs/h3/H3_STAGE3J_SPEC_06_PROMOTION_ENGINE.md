# 3J Spec 6 — Promotion Engine

## Document identity

**Title:**
Arqon Maestro 3J Promotion Engine

**Stage:**
`3J`

**Spec role:**
Core promotion-decision specification

**Purpose:**
Define the canonical promotion engine that transforms a workflow candidate from scored, risk-evaluated, rubric-evaluated evidence into a bounded creation decision.

This spec defines:

* the promotion states
* promotion eligibility rules
* downgrade logic
* auto-create and auto-save conditions
* suppression and hold behavior
* how trust, risk, rubrics, and timing combine
* what `3J` may promote and what it may never do

This is the decision core of `3J`.

---

## 1. Mission

The `3J` promotion engine exists to answer one question:

**Given this workflow candidate, what is the highest lawful creation action the system is allowed to take right now?**

That is the correct question.

Not:

* is this interesting
* is this repeated
* is this powerful
* can we do something clever with it

But:

* what is the highest bounded, justified, explainable, user-compatible promotion state this candidate is allowed to reach now

That is how `3J` becomes worthy of trust.

---

## 2. Core thesis

A workflow candidate must never jump directly from discovery to autonomy.

Instead, every candidate must pass through a bounded promotion engine that combines:

* candidate structure
* scores
* risk
* rubric results
* trust
* user policy
* timing/context

The promotion engine is not a classifier that says “good” or “bad.”

It is a lawful ladder that decides among bounded creation states.

So the central thesis is:

**Promotion is a constrained escalation ladder, not a binary approval switch.**

---

## 3. Constitutional status

This spec is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`
* `H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`
* `H3_STAGE3J_SPEC_03_SCORING_MODEL.md`
* `H3_STAGE3J_SPEC_04_RISK_ENGINE.md`
* `H3_STAGE3J_SPEC_05_RUBRIC_FRAMEWORK.md`

This engine governs **creation promotion** only.

It must preserve the constitutional separation between:

* discovery
* promotion
* persistence
* execution

The promotion engine may never decide execution.

---

## 4. Design requirements

The promotion engine must be:

* bounded
* explicit
* explainable
* downgrade-capable
* class-aware
* user-aware
* timing-aware
* trust-aware
* risk-bounded
* stable enough to be audited later through docs, API surfaces, and UI

The promotion engine must avoid:

* binary oversimplification
* repetition-only promotion
* silent autonomy escalation
* weak-candidate auto-creation
* timing-blind suggestions
* score-only promotion without rubric governance
* hidden suppression logic
* silent conversion of creation into execution

---

## 5. Promotion philosophy

The promotion engine should behave like a lawful ladder of earned autonomy.

That means:

* early candidates are observed
* stronger candidates are held or suggested
* trusted, low-risk candidates may become drafts
* only bounded draft persistence may happen automatically
* nothing in `3J` becomes executable through promotion alone

The system should prefer being:

* selectively bold
* frequently silent
* explainably cautious
* class-aware
* user-compatible

The system should not try to prove intelligence by acting often.
It should prove intelligence by promoting correctly.

---

## 6. Canonical promotion states

The engine must use these bounded promotion states:

1. `observe_only`
2. `hold_for_more_evidence`
3. `suggest_in_inbox`
4. `suggest_inline`
5. `auto_create_draft`
6. `auto_save_draft`

These are the only allowed creation-promotion outcomes in `3J`.

There is no execution state in this ladder.

---

## 7. Promotion state definitions

### 7.1 `observe_only`

The system keeps the candidate internally but does not surface it and does not create a draft.

Use when:

* evidence is weak
* utility is weak
* novelty is low
* duplicate risk is high
* promotion is premature

### 7.2 `hold_for_more_evidence`

The candidate looks promising, but the system intentionally waits.

Use when:

* the candidate may become good soon
* confidence is rising
* abstraction is not yet strong enough
* risk is still too high for stronger promotion
* timing is not yet right
* more repetitions would likely sharpen the result

### 7.3 `suggest_in_inbox`

The candidate is strong enough to surface, but not in an interruptive channel.

Use when:

* candidate quality is good
* inline interruption is not justified
* user prefers lower-friction review
* timing pressure is moderate/high
* the candidate is valid but not urgent

### 7.4 `suggest_inline`

The candidate is strong enough and timely enough to deserve an inline surface.

Use when:

* candidate quality is high
* timing pressure is low
* the user or mode permits inline surfacing
* the suggestion is likely to feel obviously correct and helpful

### 7.5 `auto_create_draft`

The system may automatically create a draft artifact.

Use when:

* candidate is strong
* creation risk is sufficiently low
* trust is sufficient
* user policy allows this class/risk band
* the system has earned the right to create a draft without asking first

This does **not** imply execution.

### 7.6 `auto_save_draft`

The system may automatically persist a draft artifact into durable draft/library-adjacent storage.

Use when:

* candidate is very strong
* creation risk is very low or appropriately low for class/policy
* trust is stronger than required for auto-create
* user policy explicitly permits this
* clutter risk is low
* the system is unlikely to create regret or library pollution

This still does **not** imply execution.

---

## 8. Promotion engine inputs

The promotion engine must consider at least these inputs:

### Candidate structure

* structural model
* abstraction model
* classification
* lifecycle state

### Scores

* confidence
* utility
* creation risk
* suggestion pressure
* trust
* novelty
* duplicate risk

### Risk decomposition

* structural stability risk
* parameter volatility risk
* boundary clarity risk
* abstraction risk
* latent execution hazard risk
* clutter risk
* user misalignment risk

### Rubric results

* baseline rubric result
* class rubric result
* user rubric result
* timing/context rubric result
* veto flags
* rubric reason codes

### User policy and trust

* class-specific autonomy settings
* auto-create low-risk preferences
* inbox-only preferences
* training mode settings
* prior approvals/dismissals

### Contextual state

* recent suggestion history
* queue pressure
* current mode
* digest/sleep-mode eligibility

---

## 9. Core promotion law

The engine must always answer:

**What is the highest lawful promotion state currently justified?**

That means the engine should conceptually:

1. identify the maximum possible candidate promotion state
2. apply hard constraints
3. apply rubric vetoes and downgrades
4. apply risk-band ceilings
5. apply user policy ceilings
6. apply timing/context rerouting
7. emit the final bounded promotion state

This is better than “pick a state directly,” because it creates a disciplined escalation model.

---

## 10. Promotion eligibility prerequisites

Before a candidate may be promoted above `observe_only`, the following must be true:

* candidate identity/provenance is valid
* candidate is derived from governed evidence
* all core scores are present
* creation risk is computed
* rubric evaluation is computed
* candidate is not invalidated or superseded
* explanation surfaces are available
* duplicate assessment has been performed

If these are not satisfied, the engine must not escalate beyond `observe_only`.

---

## 11. Promotion ceilings

The engine must obey promotion ceilings from multiple sources.

### 11.1 Risk ceiling

Risk band limits the highest permissible promotion state.

Example pattern:

* `very_high` risk → may never exceed `observe_only` or `hold_for_more_evidence`
* `high` risk → likely ceiling at `suggest_in_inbox`
* `moderate` risk → maybe suggest, rarely auto-create
* `low` risk → stronger promotion possible
* `very_low` risk → strongest creation promotion possible, subject to policy and trust

### 11.2 Class ceiling

Some workflow classes may cap promotion regardless of overall strength.

Example:

* privileged/shell-like classes may disallow auto-create unless exceptionally constrained and user-authorized
* cross-app workflows may cap at suggestion until trust rises

### 11.3 User policy ceiling

User preferences may lower or raise the maximum allowed promotion state.

Example:

* inbox-only mode caps at `suggest_in_inbox`
* auto-create low-risk enabled allows `auto_create_draft`
* never auto-save for class caps promotion below `auto_save_draft`

### 11.4 Timing ceiling

The timing/context rubric may reroute or suppress stronger promotion.

Example:

* candidate eligible for inline suggestion may be capped to inbox
* candidate eligible for auto-create may be deferred due to pressure state or digest preference

---

## 12. Promotion floors

The engine should also recognize promotion floors in some situations.

Example:

* a very strong, high-utility, low-risk, high-trust candidate should not be artificially buried in `observe_only`
* if the system is in active training mode, some candidates should not be held too long when feedback would be valuable

Promotion floors should be weaker than ceilings, but they matter for avoiding excessive timidity.

---

## 13. Promotion decision pipeline

The engine should conceptually follow this sequence:

### Step 1 — candidate validity

Check that the candidate is structurally and constitutionally eligible for promotion evaluation.

### Step 2 — baseline viability

Use baseline rubric and confidence/utility/novelty/duplicate surfaces to determine whether the candidate is:

* too weak to matter
* worth holding
* worth surfacing
* worth creation consideration

### Step 3 — class-specific shaping

Apply workflow-class-specific ceilings, stricter standards, or auto-create allowances.

### Step 4 — user/trust shaping

Apply user preferences, trust profile, and approval history.

### Step 5 — timing/context shaping

Determine whether the valid candidate should surface now, later, or quietly.

### Step 6 — final bounded state

Choose the highest lawful promotion state remaining after all constraints.

### Step 7 — explanation emission

Attach promotion reason codes and rationale surfaces.

---

## 14. Promotion state compatibility by risk band

These are not absolute laws, but strong default expectations.

### Very low risk

Potentially compatible with:

* `suggest_in_inbox`
* `suggest_inline`
* `auto_create_draft`
* `auto_save_draft`

Subject to:

* trust
* policy
* clutter control
* timing

### Low risk

Potentially compatible with:

* `suggest_in_inbox`
* `suggest_inline`
* `auto_create_draft`

Sometimes compatible with:

* `auto_save_draft`, but usually only with stronger trust and explicit policy

### Moderate risk

Usually compatible with:

* `hold_for_more_evidence`
* `suggest_in_inbox`
* sometimes `suggest_inline`

Usually not compatible with:

* `auto_save_draft`

`auto_create_draft` only in narrow, well-justified class/policy conditions

### High risk

Usually compatible with:

* `observe_only`
* `hold_for_more_evidence`
* sometimes `suggest_in_inbox`

Usually not compatible with:

* `suggest_inline`
* `auto_create_draft`
* `auto_save_draft`

### Very high risk

Usually compatible only with:

* `observe_only`
* sometimes `hold_for_more_evidence`

---

## 15. Promotion state compatibility by trust band

Trust is not sovereign, but it is meaningful.

### Low trust

Likely ceilings:

* `observe_only`
* `hold_for_more_evidence`
* `suggest_in_inbox`

### Emerging trust

Likely ceilings:

* `suggest_in_inbox`
* `suggest_inline`

### Strong trust

May allow:

* `auto_create_draft` for low-risk candidates

### Very strong trust

May allow:

* `auto_save_draft` for very-low-risk, low-clutter, policy-allowed candidates

Important law:
Trust may unlock higher states only when risk, rubric, and policy permit it.

---

## 16. Inline vs inbox routing

The engine must explicitly distinguish **surface type** from general validity.

A candidate can be:

* valid enough to suggest
* not appropriate for inline interruption

So the engine must be able to downgrade:

* `suggest_inline` → `suggest_in_inbox`

without treating that as failure.

Inline suggestion should typically require:

* strong utility
* low suggestion pressure
* high candidate clarity
* low duplication/clutter concern
* good timing fit

Inbox suggestion should be the more default suggestion state.

---

## 17. Auto-create draft rules

A candidate may be promoted to `auto_create_draft` only if all of the following are true:

* baseline rubric passes strongly enough
* class rubric permits draft auto-creation
* user rubric permits auto-creation for the class/risk level
* timing/context rubric does not veto creation
* creation risk is in an acceptable band
* trust is sufficient
* duplicate/clutter risk is acceptably low
* candidate explanation surfaces are strong enough to support later review

### Important law

Auto-create is allowed only for **drafts**, not execution.

Drafts must remain:

* reviewable
* inspectable
* governable
* non-executable by default

---

## 18. Auto-save draft rules

A candidate may be promoted to `auto_save_draft` only if all of the following are true:

* all `auto_create_draft` conditions are satisfied
* user policy explicitly allows auto-save behavior for this class/risk level
* trust is stronger than the threshold for auto-create
* clutter risk is very low
* novelty is sufficient
* the system is unlikely to create library pollution
* the workflow class is appropriate for durable persistence at this autonomy level

### Important law

Auto-save is narrower than auto-create.

Because it affects long-term library quality, the engine should be stricter here.

---

## 19. Hold-for-more-evidence rules

The engine should choose `hold_for_more_evidence` when:

* the candidate is promising but not ready
* evidence is rising
* abstraction is not yet stable enough
* the user is not the issue, but the evidence still needs maturation
* timing suggests waiting could improve the artifact materially

This state is important.
Without it, the engine becomes too binary and too noisy.

---

## 20. Observe-only rules

The engine should keep a candidate in `observe_only` when:

* candidate quality is weak
* utility is weak
* novelty is weak
* duplicate risk is high
* risk is high enough that stronger promotion would be inappropriate
* the candidate has not yet earned meaningful promotion consideration

`observe_only` must not be treated as failure.
It is a legitimate state of disciplined silence.

---

## 21. Downgrade logic

The engine must support graceful downgrade.

Examples:

* a candidate initially appears eligible for `auto_create_draft`

  * class rubric downgrades it to `suggest_in_inbox`

* a candidate initially appears eligible for `suggest_inline`

  * timing rubric downgrades it to `suggest_in_inbox`

* a candidate initially appears eligible for `suggest_in_inbox`

  * duplicate/clutter logic downgrades it to `hold_for_more_evidence`

Downgrade logic is essential because it lets `3J` be precise rather than reckless.

---

## 22. Suppression and cooldown behavior

The engine must support suppression behavior when appropriate.

A candidate may be temporarily suppressed if:

* a similar candidate was recently shown
* the user dismissed related items
* queue pressure is too high
* timing/context makes surfacing unusually costly
* the candidate is valid but currently not worth attention

Suppression should usually reroute to:

* `hold_for_more_evidence`
* or deferred inbox/digest consideration

Suppression must not silently delete valid candidates unless lifecycle rules require archival or invalidation.

---

## 23. Promotion reason codes

Every promotion decision must emit structured reason codes.

### Examples

For `observe_only`

* `promotion_confidence_too_low`
* `promotion_duplicate_risk_high`
* `promotion_utility_below_floor`

For `hold_for_more_evidence`

* `promotion_promising_but_early`
* `promotion_abstraction_not_stable_enough`
* `promotion_boundary_confidence_rising`

For `suggest_in_inbox`

* `promotion_valid_but_non_interruptive_surface_preferred`
* `promotion_timing_pressure_blocks_inline`

For `suggest_inline`

* `promotion_high_value_low_pressure_candidate`
* `promotion_inline_timing_approved`

For `auto_create_draft`

* `promotion_low_risk_auto_create_policy_enabled`
* `promotion_class_trust_sufficient`
* `promotion_draft_creation_earned`

For `auto_save_draft`

* `promotion_auto_save_policy_enabled`
* `promotion_very_low_clutter_risk`
* `promotion_high_trust_low_risk_persistence_allowed`

The engine must always be able to say why the chosen state won.

---

## 24. Stored promotion surfaces

The candidate model should preserve at least:

* `workflowCandidatePromotionDecision`
* `workflowCandidatePromotionEligible`
* `workflowCandidatePromotionDecisionVersion`
* `workflowCandidatePromotionReasonCodes`
* `workflowCandidatePromotionConfidence`
* `workflowCandidateAutoCreateEligible`
* `workflowCandidateAutoSaveEligible`

Recommended later expansions:

* `workflowCandidatePromotionCeiling`
* `workflowCandidatePromotionFloor`
* `workflowCandidatePromotionDowngradedFrom`
* `workflowCandidatePromotionRerouteTarget`

---

## 25. Promotion examples

### Example A — strong low-risk editor candidate

* confidence: high
* utility: high
* creation risk: very low
* suggestion pressure: low
* trust: strong
* user policy: auto-create low-risk editor drafts enabled

Likely result:

* `auto_create_draft`

### Example B — strong but moderately risky cross-app candidate

* confidence: high
* utility: high
* creation risk: moderate
* trust: emerging
* class rubric: cautious
* timing: neutral

Likely result:

* `suggest_in_inbox`

### Example C — very useful but poorly timed candidate

* confidence: high
* utility: high
* risk: low
* trust: strong
* timing pressure: high

Likely result:

* `suggest_in_inbox`
  not `suggest_inline`

### Example D — low-risk but duplicative candidate

* confidence: high
* utility: moderate
* novelty: low
* duplicate risk: high

Likely result:

* `observe_only`
  or `hold_for_more_evidence`

### Example E — very strong, very low-risk, highly trusted candidate with persistence policy enabled

Likely result:

* `auto_save_draft`

These examples show why promotion needs a real engine, not a score threshold shortcut.

---

## 26. Promotion engine non-goals

This engine does **not** define:

* workflow execution
* replay
* actuation
* runtime permission to run a saved workflow
* UI rendering details
* exact discovery algorithms

Those belong elsewhere.

This engine defines how `3J` chooses a creation state.

---

## 27. Failure modes this engine is designed to prevent

This engine exists to prevent:

* noisy overpromotion
* repetition-only auto-creation
* user-preference violations
* timing-blind suggestions
* risky candidates being promoted too far
* cluttered draft libraries
* silent autonomy escalation
* confusion between creation and execution
* timid suppression of genuinely excellent low-risk candidates

---

## 28. Why this spec is holy-grail critical

If `3J` is the capstone, then the promotion engine is the place where everything becomes real.

This is where:

* memory becomes judgment
* scoring becomes discipline
* trust becomes bounded autonomy
* risk becomes restraint
* utility becomes usefulness
* silence becomes intentional
* auto-creation becomes earned rather than reckless

If this engine is weak, `3J` becomes noisy, brittle, or annoying.

If this engine is strong, `3J` starts to feel like the kind of system users will eventually trust with low-risk workflow creation by default.

That is the holy-grail behavior you are aiming for.

---

## 29. Summary

The `3J` promotion engine determines the highest lawful creation state a workflow candidate may reach.

Its bounded states are:

* `observe_only`
* `hold_for_more_evidence`
* `suggest_in_inbox`
* `suggest_inline`
* `auto_create_draft`
* `auto_save_draft`

It combines:

* scores
* risk
* rubrics
* trust
* user policy
* timing/context

It supports:

* ceilings
* floors
* downgrades
* reroutes
* suppression
* explanation

It never decides execution.

This is the decision core that turns `3J` from workflow pattern mining into a governed workflow-creation judgment system.
