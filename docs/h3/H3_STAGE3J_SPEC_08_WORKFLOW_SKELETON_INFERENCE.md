# 3J Spec 8 — Workflow Skeleton Inference

## Document identity

**Title:**
Arqon Maestro 3J Workflow Skeleton Inference

**Stage:**
`3J`

**Spec role:**
Abstraction and structure-inference specification

**Purpose:**
Define how `3J` transforms discovered repeated workflow-like subsequences into reusable workflow candidate skeletons by inferring:

* fixed steps
* variable steps
* optional steps
* parameter slots
* bounded branching
* reusable structural identity

This spec defines the bridge between discovery and candidate-quality abstraction.

## 1. Mission

Discovery finds repeated governed subsequences.
Skeleton inference turns those repeated subsequences into reusable workflow structure.

The mission of skeleton inference is:

**derive the smallest honest reusable workflow structure from repeated governed subsequences without overgeneralizing, overfitting, or collapsing distinct workflows into one artifact.**

This is the stage where `3J` stops merely noticing repetition and starts understanding reusable shape.

## 2. Core thesis

A workflow candidate is not reusable merely because a subsequence repeats.

To become reusable, the system must infer:

* what is fixed
* what varies
* what is optional
* what belongs together
* what should remain unabstracted
* where slots are legitimate
* where abstraction becomes dangerous

So the core thesis is:

**workflow skeleton inference must compress repetition into reusable structure, but only as far as the evidence truly supports.**

This is the layer where restraint matters most.

## 3. Constitutional status

This spec is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`
* `H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`
* `H3_STAGE3J_SPEC_03_SCORING_MODEL.md`
* `H3_STAGE3J_SPEC_04_RISK_ENGINE.md`
* `H3_STAGE3J_SPEC_05_RUBRIC_FRAMEWORK.md`
* `H3_STAGE3J_SPEC_06_PROMOTION_ENGINE.md`
* `H3_STAGE3J_SPEC_07_WORKFLOW_DISCOVERY.md`

Skeleton inference does not:

* execute workflows
* approve workflows
* imply authority
* bypass later risk or promotion logic

It creates structure, not permission.

## 4. Design requirements

The skeleton inference system must be:

* conservative
* explainable
* reusable
* bounded
* slot-aware
* branch-aware
* optionality-aware
* class-aware later
* resistant to overgeneralization
* compatible with later editing, review, storage, and sharing

It must avoid:

* inferring slots from noise
* collapsing distinct workflows into one skeleton
* flattening meaningful optionality into false certainty
* hiding instability behind abstraction
* generating “clever” but unusable structures
* pretending branch complexity is cleaner than it is

## 5. Inference philosophy

The inference layer should behave like a disciplined structural editor.

It should prefer:

* honest fixed structure over premature flexibility
* explicit unknowns over fake certainty
* bounded slots over vague placeholders
* limited optionality over branch soup
* candidate families over false forced unification

In other words:

**infer only what is earned.**

That is the right law for the capstone layer.

## 6. Inputs to skeleton inference

Skeleton inference consumes discovery outputs and governed evidence surfaces such as:

* repeated subsequence candidates
* ordered semantic-address ids
* transition keys
* occurrence counts
* distinct run counts
* boundary confidence
* repeat variation profiles
* optionality hints
* continuity priors
* reuse priors
* step-local parameter evidence
* candidate-family similarity hints

The primary inputs should still be the repeated governed subsequences discovered in `3J-S1`/discovery logic.

## 7. Output of skeleton inference

The output is a reusable workflow candidate skeleton that includes at minimum:

* ordered steps
* fixed step indices
* variable step indices
* optional step indices
* inferred slot definitions
* branch/variation notes
* generalization confidence
* abstraction reason codes
* abstraction risk signals

This output populates the abstraction block of the workflow candidate model.

## 8. The skeleton concept

A workflow skeleton is the minimal reusable structural identity of a discovered workflow pattern.

It is not:

* the raw observed sequence
* the final executable workflow
* a UI card
* a natural-language summary

It is the internal reusable form that says:

* these steps are stable
* these positions vary
* these values should be treated as parameters
* these steps may be optional
* this structure is what repeats

That is the artifact later stages score, risk-evaluate, promote, present, and persist.

## 9. Required inference targets

Skeleton inference must attempt to infer at least:

1. fixed steps
2. variable steps
3. optional steps
4. parameter slots
5. branch hints
6. canonical ordered skeleton
7. reusable pattern identity

These are the minimum viable products of honest abstraction.

## 10. Fixed step inference

### Purpose

Identify which steps appear consistently enough to be treated as stable structural anchors of the workflow.

### A step should tend to become fixed when:

* it appears in nearly all supporting runs
* it stays in the same relative order
* it carries the same semantic role across observations
* it is not merely adjacent noise

### Fixed step inference should preserve:

* step index
* semantic address id
* semantic label
* occurrence support
* position stability
* confidence that this step is genuinely structural

### Important law

A fixed step is not just a frequent step.
It is a structurally persistent step in the candidate’s reusable identity.

## 11. Variable step inference

### Purpose

Identify which positions vary across supporting runs in ways that suggest reusable flexibility rather than structural collapse.

### A variable step may arise when:

* the step role is stable but the value differs
* the step identity remains within a coherent family
* the workflow still preserves recognizable shape
* the varying content is a candidate parameter rather than evidence of a different workflow

### Variable inference should preserve:

* the step’s role
* the varying field/value
* the family/type of variation
* the confidence that the variation is legitimate rather than destabilizing

### Important law

Not all variability should become a variable step.
Some variability is actually evidence that the pattern should not yet be abstracted.

## 12. Optional step inference

### Purpose

Identify steps that occur in some supporting runs but are still structurally compatible with the same workflow identity.

### A step may be optional when:

* the core skeleton still makes sense with or without it
* its presence is bounded and explainable
* it does not fundamentally redefine the workflow
* it is neither noise nor evidence of a different workflow family

### Optional inference should preserve:

* step index or relative insertion point
* occurrence percentage
* contextual reason for optionality when inferable
* confidence that the step is genuinely optional

### Important law

Optionality must be earned.
The system must not call something “optional” just because it cannot decide what it is.

## 13. Parameter slot inference

### Purpose

Infer reusable parameter slots from repeated variation that retains semantic role.

This is one of the most important functions of skeleton inference.

### A slot should be inferred only when:

* variation occurs in a stable position or role
* the varying values belong to a coherent type
* the workflow still preserves identity across those values
* the values look reusable as parameters rather than random noise

### Example slot types

* file path
* project name
* URL
* domain
* search query
* task name
* surface identifier
* target name

### Slot inference must preserve:

* slot id
* slot name
* slot type
* source step index
* slot required/optional status
* slot inference confidence
* observed value count
* normalization kind
* reason codes

### Important law

Slots should not be inferred merely because values differ.
Difference is necessary but not sufficient.

## 14. Fixed vs variable separation

This is the heart of inference.

The system must separate:

* what makes the workflow itself what it is
  from:
* what merely changes from run to run

That distinction is the difference between:

* reusable structure
  and:
* brittle overfitting or false generalization

This separation should be conservative and explainable.

If the system is not sufficiently confident, it should keep more structure fixed and mark abstraction confidence lower rather than overgeneralizing.

## 15. Canonical ordered skeleton

After fixed/variable/optional inference, the system must construct a canonical ordered skeleton.

This canonical skeleton should represent:

* the reusable ordered backbone
* where optionality may appear
* where variable slots belong
* what the stable semantic flow is

This skeleton becomes the primary internal representation of the candidate’s reusable shape.

It should be stable enough to:

* deduplicate
* compare
* edit later
* persist later
* present later

## 16. Bounded branching inference

Some workflows will show branch-like behavior.

Skeleton inference must support bounded branch hints, but should remain conservative.

### Allowed branch inference posture

* note branch-like divergence
* preserve that branching exists
* possibly classify candidate as branching or mixed
* increase abstraction caution when branching is unresolved

### Not allowed at this stage

* invent large formal workflow graphs too early
* aggressively unify many branches into one generalized skeleton
* pretend branch ambiguity is solved when it is not

### Important law

Unresolved branching should usually increase abstraction risk, not get silently normalized away.

## 17. Variation families

When repeated sequences vary, the inference engine should attempt to determine whether the variation belongs to one of these broad categories:

* parameter variation
* optional step variation
* bounded tail variation
* bounded prefix variation
* branch-family variation
* true workflow-family divergence

This categorization matters because not all variation should be solved the same way.

For example:

* parameter variation may support slot inference
* workflow-family divergence may require splitting candidate families

## 18. Workflow-family splitting

The inference engine must be allowed to conclude:

**these observations should not become one workflow skeleton.**

That means the system may split a discovery family into multiple candidate families when evidence suggests:

* different structural intent
* incompatible parameter patterns
* incompatible branch behaviors
* different stable cores
* different reusable meanings

This is crucial.
It is far better to split too carefully than to build one giant false workflow.

## 19. Generalization confidence

### Field

`workflowCandidateGeneralizationConfidence`

### Purpose

Measure how confident the system is that the inferred skeleton is a valid reusable abstraction rather than a fragile compression.

Generalization confidence should be influenced by:

* structural consistency
* slot stability
* optionality clarity
* boundary clarity
* distinct run support
* branch containment
* semantic cohesion

Generalization confidence is one of the core bridges between discovery and risk.

## 20. Abstraction risk at inference time

Skeleton inference must emit early abstraction risk signals even before full risk aggregation.

Key contributors include:

* unclear fixed/variable separation
* weak slot typing
* unresolved branching
* family collision
* poor boundary clarity
* too much tolerated variation
* semantic incoherence of the inferred skeleton

This is how the inference layer tells later systems:

* “this skeleton is promising”
  or
* “this skeleton exists, but treat it cautiously”

## 21. Skeleton explainability

The inferred skeleton must remain explainable.

The system must be able to say:

* why these steps are fixed
* why these steps are optional
* why this slot exists
* why the candidate is parameterized
* why the sequence is treated as one workflow instead of two
* why the abstraction confidence is high or low

If the system cannot explain those things, the skeleton is probably too aggressive.

## 22. Inference reason codes

Skeleton inference should emit structured reason codes such as:

* `inference_fixed_step_strong`
* `inference_optional_step_bounded`
* `inference_slot_type_stable`
* `inference_slot_type_unclear`
* `inference_generalization_confident`
* `inference_generalization_cautious`
* `inference_branching_unresolved`
* `inference_family_split_required`
* `inference_boundary_uncertainty_penalty`
* `inference_parameter_variation_reusable`

These codes are essential for later review, scoring, risk, and user explanation.

## 23. Relationship to candidate model

Skeleton inference populates the candidate’s abstraction and structural fields, including:

* `workflowCandidateOrderedSteps`
* `workflowCandidateFixedStepIndices`
* `workflowCandidateVariableStepIndices`
* `workflowCandidateOptionalStepIndices`
* `workflowCandidateInferredSlots`
* `workflowCandidateGeneralizationConfidence`
* `workflowCandidateAbstractionEligible`
* `workflowCandidateAbstractionReasonCodes`

So this spec is directly upstream of the candidate model’s abstraction block.

## 24. Relationship to scoring

Skeleton inference directly influences:

* confidence
* utility
* creation risk
* novelty
* duplicate risk

Examples:

* a strong clean skeleton raises confidence
* a useful parameterized skeleton may raise utility
* unresolved abstraction problems raise creation risk
* good canonicalization reduces duplicate risk

That is why skeleton inference is not a cosmetic stage. It materially shapes the whole engine.

## 25. Relationship to risk

Skeleton inference is one of the main producers of abstraction risk inputs.

Especially:

* structural stability risk
* parameter volatility risk
* boundary clarity risk
* abstraction risk component
* clutter risk via family collision/duplication risk

If inference is sloppy, the risk engine becomes blind.

## 26. Relationship to promotion

The promotion engine should never have to guess whether a candidate is reusable.

Skeleton inference is what makes a candidate promotable as a workflow-shaped object at all.

Poor inference should push candidates toward:

* `observe_only`
* `hold_for_more_evidence`
* or suggestion-only states

Strong inference may help unlock:

* stronger suggestions
* draft creation
* later persistent draft behavior

## 27. Relationship to future editing and UI

The inferred skeleton should be clean enough that future UI/API surfaces can support:

* viewing steps
* editing titles
* inspecting slots
* refining optionality
* organizing workflows
* sharing later
* custom storage methods

This is why the skeleton must be explicit and structured now.
The UI can only be excellent later if the underlying model is excellent now.

## 28. Inference outputs by maturity

The engine should allow different maturity levels of inferred skeletons.

Examples:

* `weak_trace`
* `emerging_skeleton`
* `stable_skeleton`
* `parameterized_skeleton`
* `branching_skeleton`
* `split_required`

This lets the system represent partially mature abstractions honestly rather than pretending every discovered candidate is fully reusable.

## 29. Non-goals of this spec

This spec does not fully define:

* scoring formulas
* risk aggregation formulas
* promotion thresholds
* UI rendering
* persistence semantics
* execution semantics

It defines how repeated subsequences become reusable workflow skeletons.

## 30. Failure modes this spec is designed to prevent

This spec exists to prevent:

* fake slot inference
* overgeneralized workflows
* unresolved branch collapse
* duplicate family pollution
* fixed/variable confusion
* “optional” as a euphemism for uncertainty
* weak reusable structure dressed up as a macro
* bad future UX caused by weak structural modeling

## 31. Why this spec is holy-grail critical

This is one of the most important specs in all of `3J`.

Because this is where the system proves whether it can do something deeper than pattern matching.

A holy-grail workflow system does not just say:

* “I saw this happen a lot.”

It says:

* “I understand the reusable shape of what you keep doing.”

That is a much higher bar.

And the only way to reach it is with disciplined skeleton inference:

* fixed where it should be fixed
* variable where it should be variable
* honest about uncertainty
* careful with abstraction
* ready for future UI, storage, organization, and sharing

That is capstone-level infrastructure.

## 32. Summary

The `3J` skeleton inference system transforms repeated governed subsequences into reusable workflow candidate structure.

It must infer:

* fixed steps
* variable steps
* optional steps
* parameter slots
* bounded branching hints
* canonical ordered skeletons
* generalization confidence
* abstraction reason codes

It must remain conservative, explainable, and resistant to overgeneralization.

It is the bridge between:

* repeated behavior
  and
* reusable workflow intelligence.
