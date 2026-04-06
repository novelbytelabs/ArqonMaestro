# 3J Spec 3 — Scoring Model

## Document identity

**Title:**
Arqon Maestro 3J Scoring Model

**Stage:**
`3J`

**Spec role:**
Core scoring-system specification

**Purpose:**
Define the canonical score system used by `3J` to evaluate workflow/macro candidates for creation-oriented promotion decisions.

This spec defines the shared scoring surfaces that later risk, rubric, and promotion logic will consume.

---

## 1. Mission

`3J` needs a scoring model because workflow discovery alone is not judgment.

Many repeated patterns are real but not useful.
Many useful patterns are real but not yet stable.
Many stable patterns are useful but poorly timed.
Many low-risk patterns are still clutter.
Many good candidates are not yet worthy of suggestion, and many suggestible candidates are not yet worthy of auto-creation.

The scoring model exists to give `3J` a lawful, inspectable, bounded basis for deciding:

* what is strong
* what is weak
* what is risky
* what is useful
* what is novel
* what is clutter
* what is promotable
* what should remain silent

---

## 2. Core thesis

The scoring model must not collapse all judgment into one opaque score.

`3J` requires multiple bounded scores, each representing a different dimension of candidate quality.

At minimum, the scoring model must preserve distinct surfaces for:

* confidence
* utility
* creation risk
* suggestion pressure
* trust
* novelty
* duplicate risk

These scores exist together because a candidate can be:

* highly confident but low utility
* low risk but high interruption cost
* useful but duplicative
* novel but unstable
* structurally strong but not yet trusted for auto-creation

The scoring system must preserve those differences rather than hide them.

---

## 3. Constitutional role

This scoring model is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`
* `H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`

This model does not itself decide promotion.
It provides the scoring substrates used by later rubric and promotion logic.

Scores may shape promotion.
Scores may never silently imply execution authority.

---

## 4. Design requirements

The scoring model must be:

* multi-dimensional
* explainable
* bounded
* stable
* composable
* auditable
* class-aware
* user-aware
* timing-aware
* usable for future tuning without breaking doctrine

The scoring model must avoid:

* black-box promotion
* one-number oversimplification
* hidden risk masking
* uninspectable autonomy escalation
* brittle thresholding detached from workflow class or user preference

---

## 5. Scoring philosophy

`3J` scoring should reflect this principle:

**A workflow candidate is promoted by balanced evidence, not by repetition count alone.**

That means the score system must combine several realities:

* Is the candidate real?
* Is it reusable?
* Is it worth surfacing?
* Is it low enough risk for the intended promotion level?
* Is the timing appropriate?
* Has the user or workflow class earned enough trust?
* Is it meaningfully new?
* Is it likely to create clutter?

Those are not the same question.
So they must not share one undifferentiated score.

---

## 6. Core score set

The canonical `3J` score family is:

* `workflowCandidateConfidenceScore`
* `workflowCandidateUtilityScore`
* `workflowCandidateCreationRiskScore`
* `workflowCandidateSuggestionPressureScore`
* `workflowCandidateTrustScore`
* `workflowCandidateNoveltyScore`
* `workflowCandidateDuplicateRiskScore`

These are the required shared scores across the stage.

---

## 7. Score scale

All primary scores should be normalized to a bounded `0–100` scale.

### Standard interpretation

For positive-direction scores:

* `0` = absent / unusable / no evidence
* `100` = maximal strong signal

Positive-direction scores include:

* confidence
* utility
* trust
* novelty

For caution-direction scores:

* `0` = no meaningful concern
* `100` = maximal concern

Caution-direction scores include:

* creation risk
* suggestion pressure
* duplicate risk

This keeps interpretation stable across the system.

---

## 8. Confidence score

### Field

`workflowCandidateConfidenceScore`

### Purpose

Measures how strongly the system believes the candidate is a real, stable, reusable workflow pattern rather than incidental repetition.

### Confidence answers

* Is this pattern actually real?
* Is the sequence coherent enough?
* Is the abstraction supported strongly enough?
* Is the evidence deep enough to treat this as a candidate rather than noise?

### Major contributing factors

* repeat count
* distinct run count
* order stability
* step stability
* start/end boundary confidence
* parameter regularity
* abstraction support
* consistency across sessions or windows, when available
* low contradiction within observations

### Confidence is not

* usefulness
* timing
* trust
* risk
* permission to promote

A candidate can be highly confident and still unworthy of suggestion.

### Suggested bands

* `0–20`: weak signal
* `21–40`: emerging pattern
* `41–60`: plausible candidate
* `61–80`: strong candidate
* `81–100`: very strong candidate

---

## 9. Utility score

### Field

`workflowCandidateUtilityScore`

### Purpose

Measures how worthwhile the workflow candidate is to create, surface, or preserve from a user-value perspective.

### Utility answers

* Would this save time?
* Would this reduce friction?
* Is it likely to recur?
* Is it meaningful enough to justify attention or library space?

### Major contributing factors

* estimated time saved
* repetition frequency
* recurrence likelihood
* friction reduction
* number of manual steps reduced
* cross-surface coordination value
* user-history alignment with accepted helpful patterns
* whether this solves a recurring burden rather than a trivial one-off

### Utility is not

* confidence
* risk
* duplication
* permission to auto-create

A candidate can be very real but not useful enough to matter.

### Suggested bands

* `0–20`: trivial / weak value
* `21–40`: limited value
* `41–60`: moderate value
* `61–80`: strong value
* `81–100`: very strong value

---

## 10. Creation risk score

### Field

`workflowCandidateCreationRiskScore`

### Purpose

Measures how risky it would be to create, auto-create, or auto-save this workflow candidate.

This is a **creation** risk score, not an execution risk score alone.

### Creation risk answers

* How risky is it to create the wrong artifact?
* How risky is this abstraction?
* How risky is it to turn this into a reusable object too early?
* How likely is this to produce clutter, confusion, or unstable drafts?

### Major contributing factors

* structural instability
* parameter volatility
* boundary ambiguity
* abstraction risk
* latent future execution hazard
* clutter risk
* user misalignment

This score is decomposed in the Risk Engine spec later, but it must already exist here as a shared core score.

### Suggested bands

* `0–20`: very low risk
* `21–40`: low risk
* `41–60`: moderate risk
* `61–80`: high risk
* `81–100`: very high risk

---

## 11. Suggestion pressure score

### Field

`workflowCandidateSuggestionPressureScore`

### Purpose

Measures the cost or undesirability of surfacing this candidate to the user right now.

### Suggestion pressure answers

* Even if this is valid, is this a bad moment to surface it?
* Even if useful, would surfacing it now create unnecessary interruption or clutter?
* Is this something that should be held for digest/inbox rather than shown inline?

### Major contributing factors

* interruption cost
* current user context
* current suggestion queue load
* recent similar suggestions shown
* training mode vs quiet mode
* urgency
* surface appropriateness
* candidate novelty freshness
* whether the user recently dismissed related items

### Important rule

Suggestion pressure is not “badness.”
A candidate may be excellent and still have high suggestion pressure in the present moment.

### Suggested bands

* `0–20`: low pressure, easy to surface
* `21–40`: manageable pressure
* `41–60`: moderate pressure, likely inbox not inline
* `61–80`: high pressure, likely hold
* `81–100`: very high pressure, suppress for now

---

## 12. Trust score

### Field

`workflowCandidateTrustScore`

### Purpose

Measures how much autonomy the system has earned for promoting this candidate within this workflow class and user context.

### Trust answers

* Has the system earned the right to auto-create low-risk drafts of this class?
* Does the user historically accept this kind of candidate?
* Has this workflow family proven aligned with user preferences?

### Trust is shaped by

* global system trust
* workflow class trust
* candidate-family trust
* user settings
* prior approvals
* prior dismissals
* later reuse after approval
* low regret patterns
* edit acceptance patterns

### Important rule

Trust is not just global.
It must be shaped by:

* user
* workflow class
* candidate family
* explicit settings

### Suggested bands

* `0–20`: no meaningful trust
* `21–40`: low trust
* `41–60`: developing trust
* `61–80`: strong trust
* `81–100`: very strong trust

---

## 13. Novelty score

### Field

`workflowCandidateNoveltyScore`

### Purpose

Measures whether this candidate contributes something genuinely new or newly improved rather than repeating known or already-surfaced patterns.

### Novelty answers

* Is this candidate meaningfully new?
* Is it a material improvement over something already known?
* Is it a rediscovery with better abstraction or evidence?

### Major contributing factors

* absence of exact duplicates
* absence of near-duplicates
* semantic distance from existing drafts
* improved evidence over prior suppressed candidates
* improved abstraction quality
* improved parameter inference
* changed context or workflow class relevance

### Important rule

Novelty is not automatically good enough to promote.
Some novel candidates are still weak or useless.

### Suggested bands

* `0–20`: highly redundant
* `21–40`: low novelty
* `41–60`: moderate novelty
* `61–80`: strong novelty
* `81–100`: very high novelty

---

## 14. Duplicate risk score

### Field

`workflowCandidateDuplicateRiskScore`

### Purpose

Measures the likelihood that promoting this candidate would create workflow clutter because it is duplicative, near-duplicative, or overly similar to existing or pending artifacts.

### Duplicate risk answers

* Would this pollute the library?
* Is this candidate too close to something already suggested, drafted, or saved?
* Is this just a weaker variant of an existing artifact?

### Major contributing factors

* exact pattern key matches
* near-duplicate semantic similarity
* overlap with pending candidates
* overlap with existing drafts
* overlap with saved workflows
* overlap with recent dismissals
* weak distinguishing value

### Suggested bands

* `0–20`: very low duplicate risk
* `21–40`: low duplicate risk
* `41–60`: moderate duplicate risk
* `61–80`: high duplicate risk
* `81–100`: very high duplicate risk

---

## 15. Score directionality summary

To avoid ambiguity, `3J` must treat score directionality explicitly:

### Higher is better

* confidence
* utility
* trust
* novelty

### Higher is worse / more cautionary

* creation risk
* suggestion pressure
* duplicate risk

This directionality must remain stable across code, artifacts, docs, and future UI/API surfaces.

---

## 16. Score composition model

Each core score should be composed from lower-level feature signals rather than invented ad hoc.

The system should conceptually follow:

### Raw features

Observed facts and derived metrics from evidence and candidate structure.

### Intermediate components

More stable grouped interpretations, such as:

* sequence stability
* slot quality
* boundary clarity
* recurrence strength
* timing cost
* novelty distance

### Core score

The final normalized `0–100` score attached to the candidate.

This composition model prevents fragile direct-threshold spaghetti.

---

## 17. Required score properties

Every core score must satisfy these properties:

### 17.1 Bounded

Must remain within `0–100`.

### 17.2 Explainable

Must be reconstructible from components and reason codes.

### 17.3 Stable

Small evidence changes should not create wild score swings unless the underlying situation changed materially.

### 17.4 Comparable

Scores should support consistent relative comparison across candidates in the same class and policy context.

### 17.5 Policy-compatible

Scores must be usable by rubric and promotion logic without hidden reinterpretation.

---

## 18. Reason codes

Every core score must be accompanied by structured reason codes or component reason summaries.

### Examples

For confidence:

* `repeat_count_strong`
* `boundary_clarity_high`
* `order_stability_high`
* `slot_inference_weak`

For utility:

* `time_saved_high`
* `manual_steps_reduced`
* `recurrence_likely`

For risk:

* `abstraction_overreach`
* `boundary_ambiguity`
* `duplicate_near_match`

For suggestion pressure:

* `recent_similar_suggestion`
* `quiet_mode_active`
* `queue_pressure_high`

The score itself is not enough.
The system must know and preserve why it has that score.

---

## 19. Score bands and downstream meaning

The promotion engine should later consume scores using bands, not brittle exact-number absolutism.

### Example interpretation

A candidate with:

* high confidence
* high utility
* low creation risk
* low suggestion pressure
* strong trust
* strong novelty
* low duplicate risk

is a strong candidate for:

* `suggest_in_inbox`
* `suggest_inline`
* possibly `auto_create_draft`

A candidate with:

* high confidence
* low utility
* low novelty
* high duplicate risk

is likely:

* `observe_only`
* or `hold_for_more_evidence`

This shows why the score set must remain multi-dimensional.

---

## 20. Score interaction laws

The scoring model must obey these interaction laws:

### 20.1 Confidence does not dominate everything

A highly real pattern is not automatically promotable.

### 20.2 Utility does not erase risk

A very useful candidate still may be too risky to auto-create.

### 20.3 Trust does not erase poor evidence

High trust cannot rescue a weak or unstable candidate.

### 20.4 Novelty does not equal usefulness

Newness is valuable, but not enough by itself.

### 20.5 Low risk does not equal high value

A harmless candidate may still be worthless clutter.

### 20.6 Low suggestion pressure does not mean “suggest now”

A candidate still needs enough confidence, utility, novelty, and policy fit.

---

## 21. Minimum score availability rules

Before a workflow candidate can be promoted beyond `observe_only`, it must have valid values for all seven core scores.

That means:

* no partial hidden promotion
* no “we’ll figure out risk later”
* no “confidence is enough”
* no “utility alone is enough”

The full score surface is mandatory for promotion.

---

## 22. Score freshness

Scores are not permanent truths.

They may change as:

* more evidence appears
* the abstraction improves
* duplicates are created elsewhere
* the user accepts or dismisses similar items
* training mode ends
* trust rises or falls
* timing changes

So each scored candidate should implicitly be treated as time-sensitive.

Later implementation should preserve:

* score version
* last score update timestamp
* scoring model version

---

## 23. Score recomputation doctrine

`3J` must be able to recompute scores when relevant state changes.

Examples:

* repeated evidence increases confidence
* better slot inference lowers creation risk
* a near-duplicate appearing raises duplicate risk
* user dismissals raise suggestion pressure or user-misalignment risk
* class-specific trust increases auto-create eligibility

This means scoring is not a one-shot event.
It is a governed evolving evaluation surface.

---

## 24. Score usage boundaries

Scores may be used to:

* prioritize candidates
* suppress weak candidates
* drive rubric evaluation
* support promotion decisions
* support explainability
* support user-facing summaries
* support future digest/inbox organization

Scores must not be used to:

* bypass doctrine
* imply execution authority
* secretly auto-promote without explicit promotion logic
* hide risk behind convenience

---

## 25. Candidate score profile examples

### Example A — strong low-risk draft candidate

* confidence: `84`
* utility: `78`
* creation risk: `18`
* suggestion pressure: `24`
* trust: `71`
* novelty: `66`
* duplicate risk: `15`

Likely promotion outcome:

* `suggest_in_inbox`
* or `auto_create_draft` if user policy allows low-risk auto-creation

### Example B — real but not worth it

* confidence: `89`
* utility: `22`
* creation risk: `12`
* suggestion pressure: `28`
* trust: `63`
* novelty: `19`
* duplicate risk: `72`

Likely outcome:

* `observe_only`
* or `hold_for_more_evidence`

### Example C — useful but too risky

* confidence: `74`
* utility: `81`
* creation risk: `67`
* suggestion pressure: `31`
* trust: `59`
* novelty: `73`
* duplicate risk: `18`

Likely outcome:

* `suggest_in_inbox`
* not `auto_create_draft`

These examples show why one-number scoring would be a mistake.

---

## 26. Future extensibility

Additional scores may be added later if truly necessary, but the stage must resist score bloat.

Any new score must justify:

* why it is not already captured by the current set
* why it cannot live as a component instead of a new primary score
* how it changes promotion behavior meaningfully

The seven core scores should remain the stable constitutional baseline unless there is a clear reason to expand them.

---

## 27. Non-goals of this spec

This spec does not fully define:

* the internal formulas for each score
* the decomposed risk engine math
* the rubric arbitration mechanism
* the final promotion thresholds
* the workflow discovery algorithm
* the UI presentation strategy

Those belong to later specs.

This spec defines the canonical scoring surfaces and their meaning.

---

## 28. Why this spec is holy-grail critical

`3J` will only feel worthy of trust if its promotion behavior feels:

* intelligent
* calm
* accurate
* situation-aware
* non-repetitive
* user-aligned

That cannot be achieved with vague hand-wavy scoring.

The holy-grail quality bar requires a scoring model that captures:

* reality
* usefulness
* caution
* trust
* timing
* novelty
* clutter risk

This spec is the numerical nervous system of that judgment.

---

## 29. Summary

The `3J` scoring model uses seven bounded, explainable, non-redundant core scores:

* `workflowCandidateConfidenceScore`
* `workflowCandidateUtilityScore`
* `workflowCandidateCreationRiskScore`
* `workflowCandidateSuggestionPressureScore`
* `workflowCandidateTrustScore`
* `workflowCandidateNoveltyScore`
* `workflowCandidateDuplicateRiskScore`

These scores are:

* required for promotion
* directionally stable
* bounded `0–100`
* explainable by reason codes
* recomputable as evidence evolves
* inputs to later rubric and promotion logic

They do not execute workflows.
They do not replace doctrine.
They provide the lawful scoring substrate that lets `3J` behave like judgment rather than noise.
