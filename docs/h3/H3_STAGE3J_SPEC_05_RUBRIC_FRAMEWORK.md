# 3J Spec 5 — Rubric Framework

## Document identity

**Title:**
Arqon Maestro 3J Rubric Framework

**Stage:**
`3J`

**Spec role:**
Core rubric and evaluation framework specification

**Purpose:**
Define how `3J` evaluates workflow/macro candidates through a layered rubric system that combines baseline best-practices, workflow-class logic, user-specific trust/preferences, and timing/context pressure.

This spec defines the framework through which `3J` turns raw scores and evidence into structured evaluative judgment before promotion.

## 1. Mission

`3J` needs a rubric framework because scoring alone is not enough.

Scores tell us important things:

* how real a candidate is
* how useful it is
* how risky it is
* how novel it is
* how much trust has been earned
* how much suggestion pressure exists

But scores do not fully answer:

* is this candidate good enough by general best-practice standards
* should this class of workflow be treated differently
* does this user actually want this type of artifact promoted
* is this the right moment to surface or create it

The rubric framework exists to answer those questions in a lawful, explicit, and situation-shaped way.

## 2. Core thesis

`3J` must not force every workflow candidate through one universal rigid rubric.

Instead, `3J` must use:

* a baseline best-practices rubric
* a workflow-class rubric
* a user-specific rubric
* a timing/context rubric

These rubrics operate together inside one promotion system.

So the correct model is:

**one promotion engine, many rubrics**

Not:

* one universal rubric for everything
* or unstructured intuition with no governing discipline

## 3. Constitutional status

This spec is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`
* `H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`
* `H3_STAGE3J_SPEC_03_SCORING_MODEL.md`
* `H3_STAGE3J_SPEC_04_RISK_ENGINE.md`

This framework constrains promotion readiness.
It does not itself decide execution.
It does not collapse creation into execution.
It does not override doctrine.

## 4. Design requirements

The rubric framework must be:

* layered
* explainable
* situation-aware
* class-aware
* user-aware
* context-aware
* compatible with bounded promotion levels
* compatible with class-specific autonomy
* able to veto or downgrade promotion when justified
* stable enough to prevent drift across implementation and UX layers

The rubric framework must avoid:

* one-size-fits-all stupidity
* threshold soup with no structure
* hidden veto logic
* user-blind promotion
* timing-blind suggestion behavior
* score-only promotion with no qualitative governance

## 5. Rubric philosophy

Rubrics are not substitutes for scores.
Rubrics are evaluative overlays that interpret scores, evidence, policy, and context.

Scores answer:

* how much
* how strong
* how risky
* how novel

Rubrics answer:

* is this good enough by this standard
* does this class justify different handling
* does user preference alter the acceptable path
* is this the right moment and surface for promotion

So the rubric layer is where `3J` stops being merely analytical and becomes judgmental in the positive sense.

## 6. Required rubric layers

`3J` must evaluate workflow candidates through four required rubric layers:

1. baseline best-practices rubric
2. workflow-class rubric
3. user-specific rubric
4. timing/context rubric

These four layers are mandatory for promotion beyond `observe_only`.

## 7. Baseline best-practices rubric

### Field surface

* `workflowCandidateBaselineRubricPassed`
* `workflowCandidateBaselineRubricReasonCodes`

### Purpose

Apply the general standards that most workflow candidates should satisfy regardless of class.

### Questions answered

* is this pattern real enough
* is it structured enough
* is it useful enough
* is it nontrivial enough
* is it non-duplicative enough
* is its creation risk acceptable for further consideration

### Baseline rubric domains

#### Candidate reality

Checks whether the pattern is supported by enough real governed evidence.

Typical concerns:

* weak repeat support
* low confidence
* insufficient distinct runs
* weak evidence window support

#### Structural quality

Checks whether the candidate has coherent structure.

Typical concerns:

* poor order stability
* unresolved branching
* weak start/end boundaries
* sequence shape inconsistency

#### Abstraction quality

Checks whether the abstraction is reasonable.

Typical concerns:

* overgeneralization
* poor slot inference
* unclear fixed vs variable positions
* weak generalization confidence

#### Utility quality

Checks whether the candidate is worth attention.

Typical concerns:

* low friction reduction
* low estimated time saved
* weak recurrence value
* triviality

#### Clutter quality

Checks whether promoting the candidate would create unnecessary clutter.

Typical concerns:

* duplicate risk
* near-duplicate overlap
* weak novelty
* overlap with already pending items

#### Creation safety floor

Checks whether creation risk is below a baseline acceptable threshold for further promotion consideration.

Typical concerns:

* high abstraction risk
* high boundary ambiguity
* high latent hazard
* weak user alignment

### Baseline rubric outcome

The baseline rubric should determine whether the candidate is even eligible for higher-layer consideration.

If the baseline rubric fails badly, the candidate should usually remain:

* `observe_only`
* or `hold_for_more_evidence`

## 8. Workflow-class rubric

### Field surface

* `workflowCandidateClassRubricPassed`
* `workflowCandidateClassRubricReasonCodes`

### Purpose

Apply class-specific expectations that differ by workflow type.

### Core law

Different workflow classes deserve different evaluative standards.

A browser workflow is not judged the same way as:

* a shell workflow
* a cross-app workflow
* a navigation workflow
* a parameter-heavy editor workflow

### Typical workflow classes

Examples:

* `editor`
* `browser`
* `navigation`
* `shell`
* `cross_app`
* `mixed_surface`
* `parameter_heavy`
* `privileged_review_only`

### What class rubrics may vary

#### Required confidence floor

Some classes require more evidence before promotion.

#### Parameter quality requirements

Some classes tolerate variability less than others.

#### Risk tolerance

Some classes can never be auto-created except at very low risk.

#### Boundary strictness

Cross-app workflows may require tighter boundary clarity.

#### Utility threshold

Some trivial navigation sequences may need stronger utility proof to be worth surfacing.

#### Auto-create eligibility

Some classes may support early low-risk draft auto-creation.
Others may require suggestion-only behavior much longer.

### Example class tendencies

#### Editor / navigation

Can often tolerate:

* slightly looser parameter volatility
* lower interruption penalty for useful repeated patterns
* earlier low-risk draft auto-creation

#### Browser

Needs stronger checks around:

* target normalization
* domain/path clarity
* near-duplicate detection
* utility beyond ordinary browsing noise

#### Shell / privileged

Needs much stricter checks around:

* abstraction risk
* latent hazard
* parameter volatility
* class trust
* user opt-in

#### Cross-app

Needs stronger checks around:

* structural stability
* boundary clarity
* clutter risk
* utility threshold
* future complexity

### Class rubric outcome

The class rubric may:

* permit stronger promotion
* hold the candidate to suggestion-only
* veto auto-create eligibility
* downgrade surface type

## 9. User-specific rubric

### Field surface

* `workflowCandidateUserRubricPassed`
* `workflowCandidateUserRubricReasonCodes`

### Purpose

Evaluate the candidate through the user’s demonstrated preferences, class-specific trust, prior approval behavior, and explicit settings.

### Core law

A candidate can be generally excellent and still be wrong for this user.

### User-specific inputs

#### Preference settings

Examples:

* auto-create low-risk drafts enabled/disabled
* inbox-only mode
* aggressive discovery mode
* never auto-create for certain classes
* suggestion intensity mode

#### Trust history

Examples:

* prior approvals by class
* prior dismissals by class
* later reuse after acceptance
* regret/edit patterns
* repeat ignore patterns

#### Taste alignment

Examples:

* user tends to like high-leverage cross-app workflows
* user tends to reject trivial navigation workflows
* user prefers quiet digests over inline prompts

### User rubric responsibilities

The user rubric must answer:

* is this candidate aligned with user preference
* is this promotion level acceptable for this class and trust state
* is the user likely to value this artifact
* should this candidate be suppressed, suggested, or auto-created

### User rubric outcome

The user rubric may:

* allow auto-create at low risk
* restrict the candidate to inbox suggestion
* suppress inline surfacing
* veto promotion for disallowed classes

## 10. Timing/context rubric

### Field surface

* `workflowCandidateTimingRubricPassed`
* `workflowCandidateTimingRubricReasonCodes`

### Purpose

Evaluate whether this is the right moment and surface for candidate promotion.

### Core law

Even a great candidate can be wrong to surface now.

### Timing/context considerations

#### Interruption cost

Would surfacing now disrupt focused work?

#### Suggestion queue load

Are too many pending candidates already waiting?

#### Recency overlap

Was something similar shown recently?

#### Training vs quiet mode

Is the system in an early high-feedback training phase or a calmer mature phase?

#### Sleep-mode or digest readiness

Would this be better surfaced later in a low-friction review moment?

#### User workload state

Should this remain silent because timing pressure is high?

### Timing rubric is not suppression by default

The timing rubric should not hide valid, high-value candidates blindly.
Its job is to decide:

* now
* later
* inbox
* digest
* silent hold

### Timing rubric outcome

The timing rubric may:

* allow inline suggestion
* redirect to inbox suggestion
* redirect to digest
* suppress for cooldown period
* hold for later resurfacing

## 11. Rubric interaction model

The four rubrics must operate together, but not as a flat vote.

The intended sequence is:

1. baseline rubric
2. class rubric
3. user rubric
4. timing/context rubric

### Why this order

* baseline asks whether the candidate is fundamentally sound
* class asks whether this type deserves different standards
* user asks whether this person wants this kind of autonomy or surfacing
* timing asks whether now is the right moment and channel

This ordering preserves coherence.

## 12. Rubric outcomes

Each rubric should be able to produce more than simple pass/fail internally, even if the candidate stores simplified boolean pass surfaces.

Conceptually, rubric outcomes may include:

* pass
* pass_with_caution
* soft_fail
* hard_fail
* veto
* reroute_surface

The candidate artifact may preserve:

* pass booleans
* veto flags
* reason codes
* suggested rerouting behavior

## 13. Veto behavior

Some rubric decisions should be allowed to veto stronger promotion paths.

### Example veto-capable cases

* baseline detects severe abstraction weakness
* class rubric prohibits auto-create for this class at current risk
* user rubric detects disallowed class/autonomy preference
* timing rubric blocks inline surfacing due to high interruption pressure

### Important law

A veto should not necessarily destroy the candidate.
It may simply downgrade the promotion path.

Example:

* veto `auto_create_draft`
* but still allow `suggest_in_inbox`

This makes the system precise rather than brittle.

## 14. Rubric downgrade behavior

Rubrics should support downgrading promotion without suppressing the candidate entirely.

Examples:

* from `auto_create_draft` to `suggest_in_inbox`
* from `suggest_inline` to `suggest_in_inbox`
* from `suggest_in_inbox` to `hold_for_more_evidence`

Downgrade behavior is crucial because many candidates are valid but not valid for their highest initially considered promotion level.

## 15. Rubric reason codes

Every rubric must emit structured reason codes.

### Baseline examples

* `baseline_repeat_support_weak`
* `baseline_utility_below_floor`
* `baseline_duplicate_risk_high`
* `baseline_abstraction_quality_strong`

### Class examples

* `class_shell_requires_higher_confidence`
* `class_cross_app_boundary_floor_not_met`
* `class_editor_low_risk_auto_create_allowed`

### User examples

* `user_auto_create_low_risk_enabled`
* `user_prefers_inbox_only`
* `user_rejects_this_class_frequently`

### Timing examples

* `timing_recent_similar_suggestion`
* `timing_queue_pressure_high`
* `timing_digest_preferred`
* `timing_inline_allowed`

Rubric decisions without reason codes are not acceptable.

## 16. Rubric relation to scores

Rubrics consume scores, but do not merely mirror them.

For example:

* baseline rubric may inspect:

  * confidence
  * utility
  * novelty
  * duplicate risk
  * creation risk

* class rubric may inspect:

  * risk decomposition
  * parameterization class
  * latent hazard
  * confidence floor by class

* user rubric may inspect:

  * trust score
  * class trust
  * prior approvals
  * preference settings

* timing rubric may inspect:

  * suggestion pressure
  * recency overlap
  * queue load
  * mode state

So rubrics are score-aware, but they are not reducible to scores.

## 17. Best-practices baseline vs situation-shaped adaptation

This spec must preserve both truths:

### Truth 1

There should be a best-practices rubric that works for most situations.

### Truth 2

There must not be a single universal rubric that every workflow candidate is forced through blindly.

The solution is:

* a strong baseline best-practices rubric
* plus situation-shaped overlays

That is the correct integrated architecture.

## 18. Promotion compatibility matrix

The rubric system should conceptually determine which promotion states remain valid after evaluation.

Possible outputs after rubric evaluation include:

* only `observe_only`
* `hold_for_more_evidence`
* `suggest_in_inbox`
* `suggest_inline`
* `auto_create_draft`
* `auto_save_draft`

A candidate need not be either “good” or “bad.”
It may be:

* good enough for suggestion
* not yet good enough for auto-create
* good enough for inbox
* not good enough for inline

This is exactly why the rubric framework matters.

## 19. Rubric recomputation

Rubric evaluations must be recomputable when meaningful state changes.

Examples:

* more evidence raises baseline pass confidence
* class-specific trust grows
* the user changes autonomy preferences
* suggestion pressure falls later
* duplicates appear and clutter risk increases
* a new better abstraction lowers abstraction risk

Rubric evaluation is not a one-time verdict.
It is an evolving governed interpretation.

## 20. Required stored candidate surfaces

The workflow candidate should preserve at least:

* `workflowCandidateBaselineRubricPassed`
* `workflowCandidateClassRubricPassed`
* `workflowCandidateUserRubricPassed`
* `workflowCandidateTimingRubricPassed`
* `workflowCandidateRubricVetoApplied`
* `workflowCandidateRubricReasonCodes`

Recommended expansions later may include:

* rubric sub-results
* reroute targets
* downgrade reasons
* rubric profile id/version

## 21. Example rubric profiles

### Example A — low-risk editor workflow

* baseline: pass
* class: pass
* user: pass
* timing: pass
* veto: false

Likely compatible promotion:

* `suggest_inline`
* or `auto_create_draft` if policy/trust allow

### Example B — cross-app useful but poorly timed workflow

* baseline: pass
* class: pass_with_caution
* user: pass
* timing: soft_fail
* veto: true for inline only

Likely compatible promotion:

* `suggest_in_inbox`
* not `suggest_inline`

### Example C — shell workflow with abstraction ambiguity

* baseline: soft_fail
* class: hard_fail for auto-create
* user: pass
* timing: neutral
* veto: true for auto-create and auto-save

Likely compatible promotion:

* maybe `suggest_in_inbox`
* or `hold_for_more_evidence`

These examples show why rubrics must be layered.

## 22. Non-goals of this spec

This spec does not fully define:

* score formulas
* risk formulas
* promotion thresholds
* workflow discovery algorithms
* UX designs
* execution policy

Those belong to other specs.

This spec defines the evaluative rubric framework that sits between scoring and promotion.

## 23. Failure modes this framework is designed to prevent

This framework exists to prevent:

* one-size-fits-all workflow judgment
* spammy valid-but-poorly-timed suggestions
* class-blind autonomy
* user-preference violations
* auto-create behavior driven by scores alone
* structurally valid but user-misaligned drafts
* timing-insensitive surfacing
* weak abstraction being promoted because utility is high

## 24. Why this spec is holy-grail critical

If `3J` is meant to be the capstone, this is where it begins to feel like genuine judgment rather than just pattern mining.

A holy-grail system does not merely detect.
It evaluates with taste.

Taste here means:

* best-practice discipline
* class awareness
* user awareness
* timing awareness
* willingness to stay silent
* willingness to be bold only when warranted

That is exactly what the rubric framework gives you.

## 25. Summary

The `3J` rubric framework defines how workflow candidates are evaluated through four required layers:

* baseline best-practices rubric
* workflow-class rubric
* user-specific rubric
* timing/context rubric

These rubrics consume scores and evidence, apply situation-shaped standards, and constrain which promotion states remain valid.

This framework preserves the right balance:

* one promotion engine
* many rubrics
* strong baseline discipline
* no universal rigid rubric
* no fuzzy intuition without law

It is the qualitative judgment layer that lets `3J` become precise, calm, and worthy of trust.
