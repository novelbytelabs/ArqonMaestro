# Doctrine and Promotion Constitution

## Document identity

**Title:**
Arqon Maestro 3J Doctrine and Promotion Constitution

**Stage:**
`3J`

**Spec role:**
Foundational governing document

**Purpose:**
Define what `3J` is, what it is allowed to do, what it is not allowed to do, how it earns autonomy, and how workflow/macro creation is promoted from observation to draft creation without collapsing into spam, drift, or hidden automation.

---

## 1. Mission

`3J` exists to transform repeated governed user behavior into high-quality, reusable workflow and macro candidates that are:

* useful
* lawful
* inspectable
* minimally disruptive
* increasingly worthy of user trust

`3J` is not merely a suggestion engine.
`3J` is a **workflow-creation judgment system**.

Its job is not to speak often.
Its job is to speak well.

Its highest aim is to become so precise, tasteful, and reliable that users increasingly permit automatic creation of low-risk workflow drafts because the system has demonstrated good judgment repeatedly over time.

---

## 2. Core thesis

The central thesis of `3J` is:

**Workflow and macro creation must be governed by earned judgment, not repetition alone.**

Repeated sequences are evidence, but they are not authority.
Discovery is not promotion.
Promotion is not execution.
Creation is not execution.

`3J` may discover, analyze, score, classify, and promote workflow candidates for creation, but it must never silently collapse those acts into execution authority.

---

## 3. Scope

`3J` governs:

* workflow candidate discovery
* workflow candidate abstraction
* workflow candidate scoring
* workflow candidate risk evaluation
* workflow candidate promotion decisions
* workflow draft creation
* workflow draft persistence policy
* user-facing suggestion and approval policy
* trust accumulation for workflow creation autonomy

`3J` does **not** govern workflow execution.

Execution belongs to a later stage and must remain constitutionally separate.

---

## 4. Constitutional separation

### 4.1 Creation is separate from execution

`3J` concerns the creation, drafting, suggestion, and persistence of workflow/macro artifacts.

It does **not** grant execution authority.

No workflow candidate, draft, saved macro, or reusable workflow created under `3J` may be treated as executable merely because it was discovered, inferred, drafted, suggested, auto-created, or saved.

### 4.2 Promotion is separate from execution

The promotion engine may decide:

* observe only
* hold for more evidence
* suggest
* auto-create draft
* auto-save draft

It may **not** decide execution.

### 4.3 User trust for creation is distinct from trust for execution

The system may earn high trust for creating low-risk drafts long before it earns any trust for execution-related autonomy.

These trust ladders must remain separate.

---

## 5. Stage inputs and lineage

`3J` is downstream from `3I`.

`3I` provides the substrate:

* governed semantic-address sequences
* transition history
* repeat detection
* continuity priors
* candidate-pool ordering priors
* workflow reuse priors
* runtime evidence for observed user patterns

`3J` consumes these substrates and transforms them into workflow creation judgment.

`3J` must remain consistent with prior doctrine:

* live governed truth outranks warm or remembered priors
* memory may shape or accelerate but may not authorize
* no H23/H24 bypass
* no Stage 3A drift
* protobuf/type-directed internals only
* JSON only for human-facing artifacts
* no hidden mocks, shims, placeholders, or fake completion

---

## 6. Primary constitutional principles

### 6.1 Earned autonomy

Autonomy in workflow creation is earned through repeated good judgment.

It is not assumed.
It is not global by default.
It is not granted merely because a pattern repeats often.

### 6.2 High precision over high volume

`3J` must prefer fewer, better suggestions over frequent mediocre ones.

The system should aim for:

* high approval rate
* low regret
* low duplication
* low interruption cost
* strong reuse after approval

### 6.3 Trust is class-specific

Trust must be learned by workflow class, not only globally.

A user may trust auto-created low-risk editor drafts while refusing automatic creation for shell or cross-app workflows.

### 6.4 Risk is first-class

Workflow creation risk is a constitutional control signal, not an afterthought.

No promotion decision may ignore risk.

### 6.5 Silence is a valid action

If the system lacks sufficient evidence, confidence, usefulness, timing fit, or trust, it should remain silent.

Silence is not failure.
Poor suggestions are failure.

### 6.6 No hidden accumulation into authority

Observation, scoring, and draft creation must not silently accumulate into execution authority.

### 6.7 User sovereignty

The user retains final sovereignty over:

* approval policies
* auto-create policies
* storage and organization preferences
* workflow library behavior
* sharing preferences
* class-specific autonomy settings

### 6.8 Explainability

Every promoted workflow candidate must be explainable in structured terms:

* why it was found
* why it was considered useful
* why it was low/moderate/high risk
* why it was suggested or auto-created

---

## 7. What 3J is allowed to do

`3J` may:

* observe repeated governed sequences
* detect recurring workflow-like patterns
* infer workflow candidate skeletons
* infer fixed vs variable positions
* infer candidate slots and bounded abstractions
* score confidence, utility, novelty, duplication risk, suggestion pressure, and creation risk
* promote workflow candidates into draft artifacts
* suppress, defer, or surface workflow candidates
* auto-create low-risk draft workflows when explicitly allowed by policy and trust
* auto-save draft artifacts when explicitly allowed by policy and trust
* build API surfaces for later UX/UI
* generate inbox/digest-ready artifacts for future `3K` surfaces

---

## 8. What 3J is not allowed to do

`3J` must not:

* execute workflows automatically
* silently convert creation into execution
* silently chain actions because a workflow was inferred
* silently expand authority because a workflow appears safe
* create runnable automations without the constitutional rules that govern promotion
* ignore user class-specific autonomy preferences
* spam suggestions simply because patterns are detectable
* repeatedly suggest near-duplicates after dismissals without meaningful improvement
* treat repetition alone as sufficient for promotion
* fabricate workflow stability, usefulness, or abstraction quality
* create hidden workflow artifacts that the system later depends on but the user cannot inspect

---

## 9. Promotion ladder

`3J` must use a bounded promotion ladder.

Allowed promotion states:

1. **observe_only**
2. **hold_for_more_evidence**
3. **suggest_in_inbox**
4. **suggest_inline**
5. **auto_create_draft**
6. **auto_save_draft**

These are creation states only.

There is no execution state in `3J`.

### 9.1 observe_only

The candidate is tracked but not surfaced.

### 9.2 hold_for_more_evidence

The candidate looks promising but is not yet strong enough to surface or create.

### 9.3 suggest_in_inbox

The candidate is surfaced in a non-interruptive review surface.

### 9.4 suggest_inline

The candidate is surfaced immediately because timing and usefulness justify a lighter interruption.

### 9.5 auto_create_draft

The system creates a draft artifact without requiring immediate user action, but it remains non-executable and reviewable.

### 9.6 auto_save_draft

The system persists a draft artifact automatically under user-approved policy and sufficient trust for that workflow class.

---

## 10. Promotion law

A workflow candidate may be promoted only through a bounded decision engine combining:

* baseline best-practices rubric
* class-specific rubric
* user-specific trust and preferences
* context/timing pressure
* candidate scoring
* creation risk

No single universal rubric governs all workflow candidates.
No workflow candidate may be promoted by repetition count alone.

---

## 11. Trust model

`3J` must model trust at multiple levels:

### 11.1 Global trust

Overall system trust for workflow creation suggestions.

### 11.2 Class trust

Trust by workflow class, such as:

* editor
* browser
* navigation
* shell
* cross-app
* privileged/destructive
* parameter-heavy

### 11.3 Candidate-family trust

Trust for recurring workflow families or similar abstractions.

### 11.4 Policy trust

User-chosen settings that explicitly enable or disable auto-creation behavior for certain risk bands or classes.

Trust is earned through evidence such as:

* acceptance rate
* later reuse rate
* low regret
* edit acceptance
* low duplication
* low dismissal rate
* stable helpfulness over time

---

## 12. Risk doctrine

`3J` uses **workflow creation risk**, not execution risk alone.

The constitutional question is:

**How risky is it to create, draft, save, or auto-create this workflow candidate?**

Risk must consider at minimum:

* structural stability
* parameter volatility
* boundary clarity
* abstraction risk
* latent future execution hazard
* duplication/clutter risk
* user-misalignment risk

Risk must influence promotion level.

Low-risk candidates may be eligible for auto-created or auto-saved drafts when user policy allows.
High-risk candidates may be observed or suggested, but should rarely be auto-created.

---

## 13. Suggestion doctrine

`3J` should aim to be:

* powerful
* accurate
* calm
* non-repetitive
* well-timed
* worthy of trust

### 13.1 Suggestions are not the goal

The goal is not volume.
The goal is correct, useful promotion.

### 13.2 High-value valid candidates should not be hidden merely to keep volume low

Suppression must be intelligent, not blindly strict.

### 13.3 Suggestion frequency should adapt over time

Early training periods may involve more frequent approvals and more candidate review.
Later behavior should calm down as trust and learned preferences mature.

### 13.4 Sleep-mode discovery is a first-class path

`3J` may do heavier discovery, clustering, abstraction, and draft preparation during sleep-mode or quiet review periods, then surface elite candidates later in lower-friction ways.

---

## 14. Auto-creation doctrine

### 14.1 Default constitutional posture

Automatic workflow discovery is allowed.
Automatic draft creation may be allowed.
Automatic runnable execution is not part of `3J`.

### 14.2 Low-risk auto-approval

Users may explicitly allow low-risk draft workflows/macros to be auto-created from the beginning.

This is constitutionally valid because:

* creation remains separate from execution
* drafts remain inspectable
* policies remain user-governed
* the system is still bounded by risk, trust, and rubric logic

### 14.3 Auto-created drafts must remain reviewable

The system must not create uninspectable draft artifacts.

### 14.4 Auto-save is narrower than auto-create

Auto-save should require stronger evidence or explicit policy because it affects long-term library quality and clutter.

---

## 15. Artifact model requirements

Every created or promoted workflow artifact must preserve:

* provenance
* observed evidence basis
* pattern key
* class
* promotion state
* trust/risk rationale
* draft status
* reviewability
* policy provenance
* reason codes

No created artifact may be treated as unexplained magic.

---

## 16. UX doctrine for future stages

Although `3J` does not build full UI/UX, it must prepare for it cleanly.

Future surfaces such as:

* workflow inbox
* workflow library
* digest surfaces
* settings and autonomy controls
* organization tools
* sharing tools
* edit/update workflows
* custom storage methods

must be anticipated through clean API-ready artifact structure.

`3J` prepares the substrate.
`3K` or later may build the major interactive UI/UX.

---

## 17. Non-goals

`3J` is not trying to:

* solve workflow execution
* replace explicit user invocation
* silently run macro chains
* maximize suggestion count
* surface everything discoverable
* infer perfect workflows from one or two accidents
* build the final UI now
* create a hidden automation layer the user cannot govern

---

## 18. Measures of success

`3J` is successful when it produces:

* high approval rate on surfaced candidates
* low duplicate rate
* low user regret after approval
* low useless-suggestion rate
* low interruption burden
* strong later reuse of approved workflows
* increasing user-granted creation autonomy over time
* clear explainability for promoted candidates
* a clean library/draft ecosystem rather than clutter

The deepest success signal is:

**users increasingly trust the system to auto-create low-risk drafts because its judgment has proven worthy.**

---

## 19. Failure modes this constitution is designed to prevent

This constitution exists to prevent:

* spammy workflow suggestions
* duplicate macro clutter
* brittle abstractions
* hidden workflow creation
* silent expansion into execution authority
* trust collapse from bad recommendations
* one-size-fits-all rubric stupidity
* global autonomy where class-specific autonomy is required
* unsafe or confusing draft persistence behavior
* drift between doctrine and implementation

---

## 20. Required downstream specs

This constitution governs the following downstream specs:

1. Workflow Candidate Model
2. Scoring Model
3. Risk Engine Spec
4. Rubric Framework
5. Promotion Engine Spec
6. Workflow Discovery Spec
7. Workflow Skeleton Inference Spec
8. Suggestion Pressure and Timing Spec
9. Preferences / Trust Policy Spec
10. Draft / Library API Spec
11. Validation / Closure Spec

Any later `3J` spec that conflicts with this constitution must be revised.

---

## 21. Constitutional summary

`3J` is the workflow-creation judgment layer of Maestro.

It discovers patterns.
It abstracts them.
It scores them.
It evaluates risk.
It applies situation-shaped rubrics.
It promotes only when worthy.
It may earn the right to auto-create drafts.
It may never silently collapse creation into execution.

Its goal is not to suggest often.
Its goal is to become so accurate, so useful, and so disciplined that users increasingly trust it with the creation of reusable workflow artifacts.

---

This is ready as the governing document for the rest of `3J`.
