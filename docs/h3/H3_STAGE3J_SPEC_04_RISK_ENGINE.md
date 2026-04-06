# Risk Engine

## Document identity

**Title:**
Arqon Maestro 3J Risk Engine

**Stage:**
`3J`

**Spec role:**
Core risk-evaluation specification

**Purpose:**
Define the canonical risk engine used by `3J` to evaluate the risk of creating, auto-creating, surfacing, or persisting workflow/macro candidates.

This spec defines **workflow creation risk**, its components, its bands, its explainability requirements, and how it constrains promotion without collapsing into execution policy.

---

## 1. Mission

`3J` needs a risk engine because usefulness is not enough.

A workflow candidate may be:

* real
* repeated
* useful
* novel
* structurally elegant

and still be too risky to:

* auto-create as a draft
* auto-save as a draft
* surface aggressively
* generalize confidently

The purpose of the `3J` risk engine is to answer:

**How risky is it to create this workflow artifact now, at this level of promotion, in this class, for this user, under this evidence?**

That is the right question for `3J`.

Not:

* should it execute
* is it interesting
* is it repeated

But:

* is it safe and sane to **create** this candidate at the proposed level of autonomy

---

## 2. Core thesis

The `3J` risk engine evaluates **creation risk**, not execution authority.

That means it governs risks such as:

* creating the wrong workflow
* overgeneralizing a pattern
* inferring unstable parameters
* saving clutter into the library
* surfacing a confusing or premature suggestion
* auto-creating a draft the user will regret
* learning the wrong pattern too early

`3J` risk is therefore about:

* artifact correctness risk
* abstraction risk
* clutter risk
* trust erosion risk
* future latent hazard risk

This is broader and more appropriate than a narrow “would execution be dangerous?” model.

---

## 3. Constitutional status

This spec is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`
* `H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`
* `H3_STAGE3J_SPEC_03_SCORING_MODEL.md`

This risk engine constrains promotion.
It does not grant execution authority.
It does not define execution policy.
It does not collapse creation into execution.

---

## 4. Design requirements

The `3J` risk engine must be:

* bounded
* decomposed
* explainable
* class-aware
* user-aware
* policy-aware
* conservative where ambiguity is high
* adjustable by class and trust, but not bypassable by convenience

The risk engine must avoid:

* one opaque risk number with no rationale
* repetition-alone optimism
* hidden autonomy escalation
* overgeneralization from sparse data
* clutter-producing draft creation
* class-blind promotion

---

## 5. Core risk doctrine

The governing law is:

**No workflow candidate may be promoted beyond its justified creation-risk band.**

That means:

* low-risk candidates may be eligible for stronger creation promotion
* moderate-risk candidates may be suggestible but not auto-creatable
* high-risk candidates may need to remain held or merely observed
* very-high-risk candidates should not be promoted

Risk does not act alone.
But it must act as a real constraint.

---

## 6. Canonical risk score

### Field

`workflowCandidateCreationRiskScore`

### Scale

Bounded `0–100`

### Direction

Higher = more risky

### Meaning

Measures the overall risk of creating or auto-creating the workflow candidate in its present inferred form.

---

## 7. Canonical risk bands

The system should normalize overall creation risk into five bands:

* `very_low`
* `low`
* `moderate`
* `high`
* `very_high`

### Suggested thresholds

* `0–20` → `very_low`
* `21–40` → `low`
* `41–60` → `moderate`
* `61–80` → `high`
* `81–100` → `very_high`

These bands should be stable across the stage.

---

## 8. Risk decomposition

The overall creation risk score must be decomposed into required component risks.

These are the core required components:

1. `workflowCandidateStructuralStabilityRisk`
2. `workflowCandidateParameterVolatilityRisk`
3. `workflowCandidateBoundaryClarityRisk`
4. `workflowCandidateAbstractionRiskComponent`
5. `workflowCandidateLatentExecutionHazardRisk`
6. `workflowCandidateClutterRisk`
7. `workflowCandidateUserMisalignmentRisk`

This decomposition is mandatory.
`3J` must not hide risk inside one black-box number.

---

## 9. Structural stability risk

### Field

`workflowCandidateStructuralStabilityRisk`

### Question answered

How risky is it to create this candidate given how stable or unstable the observed workflow structure is?

### High structural stability risk means

* step order varies too much
* different observed runs do not agree enough
* branching is too chaotic
* optionality is not yet clearly inferable
* the workflow shape may still be noise or accidental overlap

### Major contributors

* weak order stability
* inconsistent step count
* unstable subsequence matching
* branch proliferation
* poor repeat coherence
* inconsistent entry/exit shape

### Interpretation

A workflow with weak structural stability should not be aggressively promoted, even if it repeats often.

---

## 10. Parameter volatility risk

### Field

`workflowCandidateParameterVolatilityRisk`

### Question answered

How risky is it to create this candidate given how unstable or poorly understood its variable parameters are?

### High parameter volatility risk means

* inferred slots vary too wildly
* slot boundaries are unclear
* normalization is weak
* slot values do not cluster into a coherent reusable pattern
* the candidate may be overfitting noise

### Major contributors

* too many inferred variable positions
* low slot inference confidence
* slot value diversity with no stable normalization
* unclear slot type
* unstable parameter order or role
* inconsistent slot presence across runs

### Interpretation

Parameter-heavy workflows should usually require lower volatility risk than fixed short workflows before auto-creation is allowed.

---

## 11. Boundary clarity risk

### Field

`workflowCandidateBoundaryClarityRisk`

### Question answered

How risky is it to create this candidate if we are not yet sure where the workflow actually begins and ends?

### High boundary clarity risk means

* the system may have merged two separate tasks
* the workflow start is fuzzy
* the workflow end is fuzzy
* neighboring noise is contaminating the candidate
* the sequence may be only a fragment of a larger or smaller actual workflow

### Major contributors

* low start boundary confidence
* low end boundary confidence
* sequence over-absorption
* weak separation from adjacent activity
* inconsistent start/end markers across runs

### Interpretation

Boundary ambiguity is one of the fastest ways to create terrible workflow drafts.
So this risk must be taken seriously.

---

## 12. Abstraction risk component

### Field

`workflowCandidateAbstractionRiskComponent`

### Question answered

How risky is the generalization itself?

### High abstraction risk means

* the system is inferring too much from too little
* it is forcing variable slots where things should remain fixed
* it is collapsing distinct workflows into one pattern
* it is abstracting a family that does not yet justify abstraction

### Major contributors

* low generalization confidence
* weak fixed-vs-variable separation
* over-broad slot inference
* collapsed multi-pattern behavior
* ambiguous reusable title/intent
* poor semantic cohesion after abstraction

### Interpretation

This is one of the most important risk components in all of `3J`.

Because the worst `3J` failures are often not “bad discovery” failures — they are **bad abstraction** failures.

---

## 13. Latent execution hazard risk

### Field

`workflowCandidateLatentExecutionHazardRisk`

### Question answered

Even though `3J` is not executing workflows, how risky is this candidate in terms of what it would become if later promoted into a reusable executable artifact?

### High latent hazard means

* the workflow touches privileged or destructive surfaces
* it spans many domains or contexts
* it is difficult to reason about later
* it would likely require strong future governance
* the future runnable shape would be powerful or confusing

### Major contributors

* privileged step classes
* shell/admin-like surfaces
* cross-app mutation patterns
* destructive or nontrivial state-change implications
* low reversibility
* poor explainability of consequences

### Interpretation

This component does **not** make `3J` an execution stage.
It simply prevents the system from being careless about creating artifacts whose future runnable shape would be unusually sensitive.

---

## 14. Clutter risk

### Field

`workflowCandidateClutterRisk`

### Question answered

How risky is it that creating or saving this candidate will pollute the draft/library ecosystem?

### High clutter risk means

* this is a duplicate or near-duplicate
* it is too similar to an existing saved draft
* it adds little incremental value
* it would increase user-facing noise or library complexity

### Major contributors

* exact pattern duplication
* semantic near-duplication
* overlap with existing drafts/workflows
* overlap with pending candidate queue
* weak distinction from previously dismissed items
* low novelty paired with low utility improvement

### Interpretation

A low-risk workflow in every other sense can still be a bad creation if it creates clutter.

---

## 15. User misalignment risk

### Field

`workflowCandidateUserMisalignmentRisk`

### Question answered

How risky is it that this candidate is poorly aligned with the user’s demonstrated preferences, approval behavior, and class-specific trust settings?

### High user-misalignment risk means

* the user tends to reject this workflow class
* the user dislikes this kind of automation suggestion
* the user’s settings do not support this promotion level
* the system has weak evidence that this candidate matches the user’s taste

### Major contributors

* prior dismissals for similar candidates
* class-specific low trust
* policy settings disallowing automatic promotion
* edit/reject patterns indicating mismatch
* repeated ignore behavior for similar items
* low affinity between this candidate class and user history

### Interpretation

A globally good candidate can still be wrong for this user right now.

---

## 16. Overall risk aggregation model

The overall creation risk score should be derived from the component risks, not invented separately.

Conceptually:

* component risks are calculated first
* weighted aggregation produces `workflowCandidateCreationRiskScore`
* the final band is derived from that score

### Important rule

The aggregation model should support both:

* weighted averaging
* component veto behavior

Because some risks should not always be diluted by other strengths.

---

## 17. Veto-capable risks

Some component risks should be allowed to act as hard brakes or near-hard brakes.

These usually include:

* `boundary clarity risk`
* `abstraction risk component`
* `latent execution hazard risk` for sensitive classes
* `user misalignment risk` when policy explicitly forbids the class/promotion level

### Example

A candidate may have:

* high confidence
* high utility
* high novelty

but if:

* boundary clarity risk is very high

then it should not be auto-created.

That is a valid veto.

---

## 18. Class-aware weighting

Risk weighting must not be identical for every workflow class.

Different workflow classes require different emphasis.

### Example tendencies

#### Editor / navigation workflows

May tolerate:

* slightly more parameter volatility
* somewhat lower latent execution hazard emphasis

#### Browser workflows

Need stronger attention to:

* target normalization
* duplication
* abstraction scope

#### Shell / privileged workflows

Need much stronger emphasis on:

* latent execution hazard
* abstraction risk
* parameter volatility
* user misalignment risk

#### Cross-app workflows

Need much stronger emphasis on:

* boundary clarity
* structural stability
* clutter risk
* latent hazard

So the risk engine must support class-specific weighting profiles.

---

## 19. Promotion-level sensitivity

Risk is not absolute in meaning.
The same candidate may be acceptable for one promotion level but not another.

### Example

A candidate with moderate creation risk may be:

* acceptable for `suggest_in_inbox`
* unacceptable for `auto_create_draft`

So the engine must support the question:

**Risk for what level of creation promotion?**

This means downstream promotion logic should evaluate:

* risk band
* intended promotion level
* user policy
* trust level

together.

---

## 20. Risk and trust relationship

Trust may influence promotion, but trust must not erase real risk.

### Constitutional law

Trust may relax promotion conservatism within bounded class-specific policy, but it may not nullify high structural, abstraction, or latent hazard risk.

So:

* trust can help low-risk candidates become auto-creatable
* trust cannot magically make a structurally unstable candidate safe

This prevents “earned trust” from becoming reckless autonomy.

---

## 21. Risk and user policy relationship

User policy can explicitly allow low-risk auto-creation or auto-save behavior.

But policy must still be bounded by actual risk.

### Example valid rule

* user enables auto-create for low-risk editor drafts

### Example invalid rule

* user preference bypasses very-high-risk abstraction ambiguity

Policy is powerful, but not constitutional override.

---

## 22. Risk reason codes

Every component risk and the overall risk score must carry structured reason codes.

### Examples

For structural stability risk:

* `order_instability_detected`
* `branching_unresolved`
* `sequence_variance_high`

For parameter volatility risk:

* `slot_type_unclear`
* `slot_value_spread_high`
* `slot_presence_inconsistent`

For boundary clarity risk:

* `start_boundary_weak`
* `end_boundary_weak`
* `adjacent_noise_overlap`

For abstraction risk:

* `fixed_variable_split_weak`
* `generalization_overreach`
* `pattern_family_collision`

For latent hazard:

* `privileged_surface_present`
* `cross_app_state_change_pattern`
* `low_reversibility_shape`

For clutter risk:

* `near_duplicate_existing_draft`
* `pending_candidate_overlap`
* `low_incremental_value`

For user misalignment:

* `user_rejects_class_often`
* `auto_create_disabled_for_class`
* `recent_similar_dismissal`

Risk without reason codes is not acceptable.

---

## 23. Risk freshness and recomputation

Risk is not static.

It may change when:

* more evidence appears
* step structure stabilizes
* boundaries become clearer
* slot inference improves
* duplicates appear or disappear
* user trust/policy changes
* the same class performs better or worse over time

Therefore, risk surfaces must be recomputable and versioned.

At minimum, the candidate should preserve:

* risk engine version
* last risk computation time
* risk reason codes

---

## 24. Recommended default aggregation pattern

The exact formula may evolve later, but the engine should conceptually behave like this:

### Step 1

Compute all seven component risks independently.

### Step 2

Apply class-aware weighting profile.

### Step 3

Check veto-capable components.

### Step 4

Compute bounded aggregate creation risk score.

### Step 5

Assign risk band.

### Step 6

Attach reason codes and component breakdown to the candidate.

This is the stable conceptual pipeline.

---

## 25. Example risk profiles

### Example A — low-risk editor sequence

* structural stability risk: `14`
* parameter volatility risk: `18`
* boundary clarity risk: `11`
* abstraction risk: `16`
* latent hazard risk: `9`
* clutter risk: `13`
* user misalignment risk: `8`

Overall creation risk:

* `15`
* band: `very_low`

Likely promotion compatibility:

* eligible for strong suggestion
* possibly eligible for auto-create draft if trust/policy allow

### Example B — useful but abstraction-unstable pattern

* structural stability risk: `24`
* parameter volatility risk: `49`
* boundary clarity risk: `35`
* abstraction risk: `68`
* latent hazard risk: `27`
* clutter risk: `14`
* user misalignment risk: `18`

Overall creation risk:

* `52`
* band: `moderate`

Likely promotion compatibility:

* maybe suggest
* do not auto-create yet

### Example C — dangerous to create as an artifact

* structural stability risk: `36`
* parameter volatility risk: `55`
* boundary clarity risk: `61`
* abstraction risk: `72`
* latent hazard risk: `81`
* clutter risk: `29`
* user misalignment risk: `43`

Overall creation risk:

* `71`
* band: `high`

Likely promotion compatibility:

* hold or observe
* likely not suggest aggressively
* definitely not auto-create

These examples show why the decomposition matters.

---

## 26. Risk engine non-goals

This risk engine does **not** fully define:

* execution governance
* runtime command safety gating
* permission to run a workflow
* user-facing UX policy
* suggestion timing policy
* promotion thresholds

Those belong to later specs.

This spec defines the risk substrate that later specs will consume.

---

## 27. Failure modes this risk engine is designed to prevent

This engine exists to prevent:

* auto-created junk workflows
* premature abstraction
* workflow library clutter
* repeated poor suggestions
* risk-blind promotion
* trust overreach
* class-insensitive autonomy
* user-preference violations
* artifacts that look neat but are actually structurally unsound

---

## 28. Why this spec is holy-grail critical

If `3J` is going to feel worthy of auto-approval, then users must feel:

* the system is cautious where it should be cautious
* the system is bold where it has earned boldness
* the system understands the difference between low-risk helpful creation and premature noisy creation

That requires a real risk engine.

Without this spec, `3J` becomes:

* repetition-driven
* clutter-prone
* overconfident
* annoying
* eventually untrusted

With it, `3J` can earn the right to become more autonomous.

---

## 29. Summary

The `3J` risk engine evaluates **workflow creation risk** through a decomposed, explainable, class-aware model.

It must compute:

* `workflowCandidateStructuralStabilityRisk`
* `workflowCandidateParameterVolatilityRisk`
* `workflowCandidateBoundaryClarityRisk`
* `workflowCandidateAbstractionRiskComponent`
* `workflowCandidateLatentExecutionHazardRisk`
* `workflowCandidateClutterRisk`
* `workflowCandidateUserMisalignmentRisk`

These roll into:

* `workflowCandidateCreationRiskScore`
* `workflowCandidateCreationRiskBand`

Risk constrains promotion.
Risk does not grant execution authority.
Risk must be explainable, recomputable, and class-aware.

This is the caution system that keeps `3J` worthy of trust.
