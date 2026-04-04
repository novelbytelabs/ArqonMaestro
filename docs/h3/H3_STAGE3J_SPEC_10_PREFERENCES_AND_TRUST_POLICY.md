# 3J Spec 10 — Preferences and Trust Policy

## Document identity

**Title:**
Arqon Maestro 3J Preferences and Trust Policy

**Stage:**
`3J`

**Spec role:**
User-governance, autonomy, and trust-calibration specification

**Purpose:**
Define how `3J` incorporates:

* user preferences
* class-specific autonomy controls
* early training behavior
* long-term trust accumulation
* policy ceilings on workflow/macro creation
* low-risk auto-approval rules for draft creation

This spec defines how `3J` remains user-governed while still earning increasingly strong autonomy over time.

---

## 1. Mission

`3J` needs a preferences and trust policy because workflow creation must be:

* personalized
* governable
* trust-sensitive
* class-sensitive
* autonomy-bounded

The mission of this system is:

**allow Maestro to earn more freedom in workflow/macro creation over time without ever confusing earned trust with unconstrained autonomy.**

This is the sovereignty system of `3J`.

---

## 2. Core thesis

The system should not behave as though:

* every user wants the same suggestion volume
* every workflow class deserves the same autonomy
* trust is one global number
* auto-creation is either always on or always off

The correct model is:

**trust and autonomy are shaped by user preference, workflow class, and demonstrated system judgment over time.**

That means:

* users may permit low-risk draft auto-creation from the beginning
* users may forbid auto-save for certain classes forever
* trust may rise faster for editor workflows than for shell workflows
* the system may begin with a more interactive learning phase, then calm down later

That is the right design for a capstone system.

---

## 3. Constitutional status

This spec is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`
* `H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`
* `H3_STAGE3J_SPEC_03_SCORING_MODEL.md`
* `H3_STAGE3J_SPEC_04_RISK_ENGINE.md`
* `H3_STAGE3J_SPEC_05_RUBRIC_FRAMEWORK.md`
* `H3_STAGE3J_SPEC_06_PROMOTION_ENGINE.md`
* `H3_STAGE3J_SPEC_09_SUGGESTION_PRESSURE_AND_TIMING.md`

This policy governs **creation behavior**, not execution behavior.

It may decide:

* whether low-risk drafts may be auto-created
* whether some classes are inbox-only
* whether training mode is active
* how trust changes promotion ceilings

It may not:

* authorize execution
* collapse creation into execution
* override doctrine or risk ceilings

---

## 4. Design requirements

The preferences and trust policy must be:

* user-governed
* class-aware
* auditable
* explainable
* gradual
* bounded
* compatible with low-risk auto-approval
* compatible with aggressive early training and calmer later behavior
* separable from execution governance

It must avoid:

* one global trust number controlling everything
* irreversible autonomy growth
* user preference ambiguity
* hidden preference state
* trust inflation from weak evidence
* ignoring explicit user ceilings

---

## 5. Core policy philosophy

The correct `3J` philosophy is:

**the system may earn autonomy for creation, but the user remains sovereign over the policy envelope within which that autonomy grows.**

That means:

* the system may learn
* the system may improve
* the system may calm its suggestion volume over time
* the system may earn the right to auto-create low-risk drafts
* the system may even earn narrow auto-save behavior where allowed

But all of that happens:

* within user-defined policy boundaries
* within class-specific autonomy rules
* within bounded creation-risk doctrine

---

## 6. Separation of trust domains

Trust must not be modeled as one monolithic scalar.

The system must distinguish at least:

1. global creation trust
2. workflow-class trust
3. candidate-family trust
4. policy trust envelope

### 6.1 Global creation trust

Overall trust in Maestro’s workflow/macro creation judgment.

This affects broad behavior, but must not dominate class-specific logic.

### 6.2 Workflow-class trust

Trust for classes such as:

* editor
* browser
* navigation
* shell
* cross_app
* privileged_review_only
* parameter_heavy

This is the most important trust axis.

### 6.3 Candidate-family trust

Trust for similar workflow families or repeated structural types.

Example:

* the user may often accept “open project -> focus editor -> run tests” style workflows
* but reject shell-heavy or cross-app workflows

### 6.4 Policy trust envelope

Explicit user-chosen autonomy allowances.

This is not learned trust.
It is the user’s declared willingness to permit autonomy under certain bounded conditions.

---

## 7. User preference categories

The system should expose policy surfaces for at least these categories.

### 7.1 Suggestion intensity

Examples:

* `quiet`
* `balanced`
* `training`
* `aggressive_discovery`

### 7.2 Inline suggestion policy

Examples:

* `never`
* `elite_only`
* `balanced`
* `training_mode_more_often`

### 7.3 Inbox/digest preference

Examples:

* inbox-first
* digest-first
* balanced

### 7.4 Auto-create low-risk drafts

Examples:

* `disabled`
* `enabled_for_selected_classes`
* `enabled_for_all_low_risk_classes`

### 7.5 Auto-save draft policy

Examples:

* `disabled`
* `enabled_for_selected_classes`
* `enabled_for_very_low_risk_only`

### 7.6 Class-specific autonomy preferences

Examples:

* editor: allow auto-create low-risk drafts
* browser: suggest only
* shell: never auto-create
* cross_app: inbox only

### 7.7 Suppression preferences

Examples:

* never suggest again for pattern family
* reduce suggestions in this class
* keep discovering but do not surface

These preferences should eventually back the UI/API surfaces later, but the policy model must exist now.

---

## 8. Training mode policy

Training mode is a first-class policy state.

### Purpose

Allow a more interactive learning period early in the system’s relationship with the user.

### Expected behavior in training mode

* lower suggestion surfacing thresholds
* more review opportunities
* faster feedback loops
* stronger acceptance/dismissal learning
* reduced silence for medium-quality candidates
* more opportunity to calibrate class-specific trust

### Important law

Training mode must still obey:

* risk ceilings
* class ceilings
* creation doctrine
* user policy prohibitions

Training mode is not permission to become sloppy.
It is permission to learn faster within bounds.

---

## 9. Mature mode policy

Mature mode is the calmer long-run mode once the system has learned enough.

### Expected behavior

* stronger suppression of weak/middling suggestions
* calmer inbox/digest behavior
* more confidence in low-risk auto-create where earned
* less need for frequent explicit approval
* stronger deduplication and clutter avoidance

This matches your intended learning-curve philosophy:
more interactive early, less noisy later.

---

## 10. Low-risk auto-approval policy

This is one of the most important parts of `3J`.

### Core law

Users may explicitly allow low-risk workflow/macro drafts to be auto-created from the beginning.

This is constitutionally valid because:

* creation remains separate from execution
* drafts remain inspectable
* the behavior is bounded by risk
* the behavior is bounded by class
* the behavior is bounded by user preference

### Important distinction

Low-risk auto-approval in `3J` means:

* auto-create draft
* and maybe later auto-save draft if allowed

It does **not** mean:

* auto-execute workflow
* auto-chain actions
* silent authority escalation

---

## 11. Auto-create policy matrix

The policy model should support class-specific auto-create rules.

### Example conceptual matrix

| Workflow class |     Very low risk |          Low risk | Moderate risk |    High risk |
| -------------- | ----------------: | ----------------: | ------------: | -----------: |
| Editor         | maybe auto-create | maybe auto-create |       suggest | hold/suggest |
| Browser        | maybe auto-create |           suggest |  suggest/hold |         hold |
| Navigation     | maybe auto-create | maybe auto-create |       suggest |         hold |
| Cross-app      |           suggest |           suggest |          hold |         hold |
| Shell          |      suggest only |      suggest only |          hold |         hold |
| Privileged     |  hold/review only |  hold/review only |          hold |         hold |

The exact values should be user-adjustable and class-aware, but this illustrates the model.

---

## 12. Auto-save policy matrix

Auto-save should be stricter than auto-create.

### Core law

Auto-save draft behavior should usually require:

* stronger trust
* lower clutter risk
* stronger novelty
* explicit policy allowance

This is because persistent draft clutter harms the entire system.

So the default posture should be:

* easier to auto-create draft
* harder to auto-save draft

That is the correct asymmetry.

---

## 13. Trust accumulation

Trust should increase through evidence of good judgment.

Trust should be influenced by things such as:

* approval rate by class
* later reuse rate of accepted drafts
* low regret after creation
* low dismissal of surfaced candidates
* low duplicate creation
* edits that preserve the candidate’s core logic
* strong utility after approval

### Important law

Trust should accumulate through demonstrated helpfulness, not merely through system age or activity volume.

Repeated weak suggestions should not create trust.
Good judgment should.

---

## 14. Trust decay and correction

Trust must also be able to fall.

Trust should decrease when the system shows repeated poor judgment, such as:

* repeated low-value suggestions
* duplicate creation
* wrong class assumptions
* repeated dismissals in a class
* strong negative edits that indicate poor abstraction
* user explicitly lowering trust or autonomy settings

A trustworthy system must be able to self-correct, not only self-expand.

---

## 15. Class-specific trust growth

Trust growth should be class-specific.

### Example

The system may quickly earn:

* editor workflow trust
* navigation workflow trust

while earning much slower trust for:

* cross-app workflows
* shell workflows
* privileged workflows

This is essential because the consequences of poor creation are not equal across classes.

The trust system must reflect that.

---

## 16. Candidate-family trust

Beyond workflow class, the system should also recognize candidate-family trust.

A user may accept many workflows of one structural family, such as:

* project opening and test-running flows
* browser lookup and research flows
* file-navigation + edit loops

That should strengthen trust for similar future candidates in that family, even if broader class trust is only moderate.

This allows `3J` to become more precise and personalized.

---

## 17. User preference ceilings

User preferences may set hard ceilings on promotion behavior.

Examples:

* no inline suggestions
* no auto-create for shell workflows
* no auto-save at all
* inbox-only for cross-app workflows
* quiet mode during focus sessions

These are true policy ceilings and must be respected even if trust, utility, and novelty are high.

User sovereignty outranks system eagerness.

---

## 18. User preference floors

Some user preferences may also act like encouragement floors.

Examples:

* training mode active
* aggressive discovery enabled
* allow low-risk auto-create for editor/navigation
* allow more inline exposure during onboarding

These floors do not bypass risk ceilings, but they can keep the system from being too timid.

---

## 19. Preference inheritance and overrides

The policy system should support:

* global defaults
* class-specific overrides
* candidate-family exceptions
* temporary mode overrides

### Example

Global:

* inbox-first, balanced suggestions

Class override:

* editor low-risk auto-create enabled

Temporary mode:

* training mode active for 7 days

That is the right shape for a fine-grained system.

---

## 20. Explainability of trust and policy

The system must be able to explain why a promotion level was allowed or blocked.

Examples:

* `user_policy_allows_low_risk_auto_create_for_editor`
* `class_trust_not_high_enough_for_auto_save`
* `user_prefers_inbox_only_for_cross_app`
* `training_mode_feedback_window_active`
* `shell_class_auto_create_disabled_by_policy`

This is essential if users are going to trust a system that earns increasing autonomy.

---

## 21. Policy interaction with risk

Risk and preference must interact carefully.

### Constitutional law

User preference may shape the allowed behavior within a risk band, but must not nullify genuinely high risk.

So:

* user can allow low-risk auto-create
* user can allow very-low-risk auto-save in selected classes
* user cannot meaningfully make a very-high-risk candidate safe by preference alone

This keeps the system lawful.

---

## 22. Policy interaction with timing

Preferences also shape surfacing timing.

Examples:

* quiet users may prefer inbox or digest
* training users may tolerate more review prompts
* aggressive discovery mode may lower suggestion suppression thresholds
* sleep-mode digest users may prefer most discoveries deferred

So preference and timing must be linked, not isolated.

---

## 23. Policy interaction with suggestion pressure

The same candidate may face different suggestion pressure depending on the user’s chosen mode.

Example:

* in training mode, a moderate-quality candidate might be okay to surface in inbox
* in quiet mode, the same candidate might be held

This is why suggestion pressure is not purely objective.
It is partly policy-shaped.

---

## 24. Initial onboarding policy posture

At the beginning, the system should assume a more interactive calibration posture unless the user explicitly chooses otherwise.

Recommended onboarding posture:

* more explicit reviews
* more inbox suggestions
* optional training mode
* optional low-risk auto-create enablement
* stricter auto-save default unless explicitly enabled

This gives the system a chance to learn the user while preserving trust.

---

## 25. Long-run policy posture

Over time, as trust and preferences stabilize, the system should trend toward:

* less unnecessary surfacing
* better deduplication
* more confidence in low-risk draft creation where allowed
* more personalized class behavior
* calmer inbox volume
* stronger suggestion quality

This is the maturation arc of `3J`.

---

## 26. Required candidate fields influenced by this policy

The candidate model and surrounding systems should preserve at least:

* `workflowCandidateTrustScore`
* `workflowCandidateUserRubricPassed`
* `workflowCandidateAutoCreateEligible`
* `workflowCandidateAutoSaveEligible`
* `workflowCandidatePromotionDecision`
* `workflowCandidatePromotionReasonCodes`
* class trust surfaces
* policy source surfaces
* review outcomes that feed trust adjustment

This is necessary for auditable behavior.

---

## 27. Non-goals of this spec

This spec does not fully define:

* UI layout for settings
* draft/library persistence schema
* execution permissions
* workflow invocation policy
* scoring formulas
* risk formulas

It defines how user preference and trust shape **creation promotion**.

---

## 28. Failure modes this spec is designed to prevent

This spec exists to prevent:

* global trust overreach
* class-insensitive autonomy
* user preference violations
* irreversible autonomy escalation
* noisy onboarding
* stagnant non-learning behavior
* silent drift from interactive training to excessive automation
* trust being treated as a magic override instead of a bounded earned allowance

---

## 29. Why this spec is holy-grail critical

This spec matters because `3J` is not just about discovering good workflows.
It is about becoming worthy of user trust.

That means the system must:

* learn differently for different users
* earn autonomy gradually
* stay under fine-grained user control
* distinguish low-risk editor creation from high-caution shell creation
* behave differently in training mode vs mature mode

Without this spec, `3J` becomes either:

* too rigid to feel intelligent
  or
* too autonomous to feel trustworthy

This spec is what makes the capstone personal, governable, and increasingly worthy.

---

## 30. Summary

The `3J` preferences and trust policy defines how workflow/macro creation behavior is shaped by:

* user preferences
* workflow-class autonomy rules
* training vs mature mode
* global trust
* class trust
* candidate-family trust
* low-risk auto-create policies
* stricter auto-save policies

This system governs how `3J` earns autonomy without ever escaping user sovereignty or risk doctrine.

It is the policy layer that turns `3J` from a generic workflow suggester into a user-aligned, trust-calibrated workflow creation system.
