# Maestro Actuation Policy Engine v0.1

## Purpose

The executor architecture defines:

* possible routes
* trust tiers
* execution modes
* structured results

The capability registry defines:

* what each adapter can do
* how trustworthy it is
* how fast and reliable it tends to be

This document defines the missing decision layer:

the **policy engine** that decides which execution route Maestro is allowed to use, when fallback is legal, when fallback is forbidden, how retries work, and what must be logged for replay, audit, and recovery.

Without this layer, routing remains descriptive.
With it, routing becomes operational and safe.

---

# 1. Core principle

## The best available route is not the same as the first available route

Maestro should not dispatch a command simply because some executor claims it can do it.

The chosen route must satisfy all of these:

* lawful for the command shape
* compatible with the active surface and mode
* allowed by current security policy
* acceptable for the command’s risk level
* semantically faithful enough to preserve user intent
* recoverable enough for the current context

The policy engine is therefore not a convenience feature.
It is the control law that prevents Maestro from turning “I can probably click that” into unsafe runtime behavior.

---

# 2. What the policy engine governs

The actuation policy engine governs:

* executor route selection
* trust-tier ordering
* fallback eligibility
* downgrade handling
* retry eligibility
* confirmation escalation
* rollback and recovery hooks
* audit and replay requirements

It sits after parsing and before final dispatch.

Conceptually:

```text
command/workflow contract
  ↓
capability lookup
  ↓
candidate ranking
  ↓
actuation policy gate
  ↓
approved plan / chooser / confirmation / refusal
```

---

# 3. Inputs to the policy engine

The policy engine should consume at least:

* command contract or workflow contract
* candidate executors from the router
* current surface and focus state
* active mode/state vector
* security mode
* speaker verification state
* user routing preferences
* recent executor reliability state
* current degradation state
* hot-path latency constraints

This lets the policy engine make decisions from structured state, not ad hoc heuristics.

---

# 4. Outputs of the policy engine

The policy engine should produce one of these outcomes:

## A. `approve_route`

The selected route is lawful and ready for planning or dispatch.

## B. `approve_with_confirmation`

The route is lawful, but explicit confirmation is required before execution.

## C. `approve_with_chooser`

Multiple routes remain meaningfully different and user selection is needed.

## D. `downgrade_route`

A preferred route is unavailable, and a lower route is allowed under policy.

## E. `retry_route`

A bounded retry is allowed with a specific strategy.

## F. `block_route`

The route is not allowed in the current context.

## G. `refuse_command`

No candidate route is policy-safe enough to execute.

This keeps policy decisions explicit and inspectable.

---

# 5. Route ordering law

Maestro should prefer routes in this order unless explicit policy, capability, or user preference justifies otherwise:

1. native semantic API
2. app extension or plugin API
3. structured internal service
4. structured command or subprocess route
5. accessibility / structured UI route
6. raw visual actuation route

This is the policy expression of a deeper law:

**semantic truth outranks visual imitation.**

---

# 6. Route scoring dimensions

Routing candidates should be scored by the router, but the policy engine must interpret those scores through policy.

The important dimensions are:

## A. Legality

Can this route realize the command at all?

## B. Semantic fidelity

How closely does the route preserve the intended meaning?

## C. Surface fidelity

Does the route act on the right surface or subsystem?

## D. Visibility cost

Does it require visible focus transfer when a bound route exists?

## E. Undo and rollback strength

Can the route support reversal or recovery appropriately?

## F. Security compatibility

Is the route allowed in the current security posture?

## G. Reliability

Has this route been succeeding recently?

## H. Latency

Is the route fast enough for the current interaction?

## I. User preference

Has the user explicitly preferred this route before?

Policy does not replace scoring.
It decides how much these dimensions matter for a given command and situation.

---

# 7. Trust-tier policy

Trust tier must directly constrain what Maestro is allowed to do.

## Tier 1 — native semantic

Default preferred route for almost every command.

Allowed for:

* low-risk
* medium-risk
* many high-risk actions

Usually acceptable in secure mode if the underlying capability is allowed.

## Tier 2 — structured command / subprocess

Allowed when:

* no Tier 1 route exists
* the command naturally belongs to structured execution
* the route’s side-effect profile is acceptable

Examples:

* shell sidecar
* integrated terminal API
* task runner

## Tier 3 — accessibility / structured UI fallback

Allowed when:

* the semantic route is unavailable
* the surface is visible or addressable enough
* the command is not too risky for structured fallback

Often valid for:

* focus
* click
* show
* hide
* open visible UI object

## Tier 4 — raw visual actuation

Use only when:

* no higher-trust route exists
* the command is allowed for raw actuation
* policy explicitly permits downgrade
* the route can still preserve enough target clarity

Tier 4 is not “normal automation.”
It is controlled fallback.

---

# 8. Fallback laws

## Fallback may be allowed when

* the command is low or moderate risk
* the target remains clear after downgrade
* the user-visible semantics do not materially change
* the fallback route stays within allowed trust tier for the current mode
* the downgrade does not violate secure/shared-room policy

## Fallback must be blocked when

* the downgrade changes the meaning of the command
* the route cannot reliably identify the target
* the action is destructive, privileged, or externally irreversible
* secure mode forbids the lower trust tier
* speaker verification is missing for the downgraded route

## Fallback should trigger chooser or confirmation when

* the downgrade is legal but meaningfully changes visibility or risk
* the user might care which route is used
* two routes are both lawful but have different consequences

Example:

`run cargo build in terminal`

If integrated terminal bound execution is unavailable, degrading to:

* shell sidecar may be acceptable
* external visible terminal focus transfer may require chooser or confirmation

because the user-visible semantics have changed.

---

# 9. Command classes and fallback policy

## A. Reflex commands

Fallback policy:

* do not route through slow or ambiguous fallback
* either execute through trusted local path or fail clearly

Reason:

Reflex commands are sacred and time-critical.

## B. Focus and visibility commands

Fallback policy:

* accessibility fallback often acceptable
* raw visual fallback acceptable only for low-risk visible targets
* fallback must preserve visible focus truth

## C. Semantic editor commands

Examples:

* rename symbol
* open definition
* next error

Fallback policy:

* prefer Tier 1 semantic routes
* structured search fallback may be allowed in limited cases
* raw visual fallback usually forbidden for meaning-sensitive actions

## D. Terminal and process commands

Examples:

* run cargo build
* run tests
* stop process

Fallback policy:

* Tier 2 structured routes often acceptable
* visible focus transfer may be allowed
* keystroke-only raw fallback should be tightly constrained

## E. Browser/UI interaction commands

Examples:

* click first result
* focus search field
* open first result

Fallback policy:

* DOM/API preferred
* accessibility fallback often acceptable
* raw visual fallback allowed only when the target is stable and low risk

## F. Filesystem and destructive commands

Examples:

* delete file
* rename file
* move file

Fallback policy:

* prefer semantic or native filesystem routes only
* raw visual fallback generally forbidden
* secure/shared-room policy should be stricter here

---

# 10. Secure mode policy

In secure mode, Maestro should become more conservative automatically.

Rules:

* prefer Tier 1 routes whenever possible
* allow Tier 2 only when explicitly policy-safe
* restrict Tier 3 to low-risk actions
* block most Tier 4 actions by default
* require stronger speaker verification for destructive or privileged routes
* require more confirmation for downgrade paths

Secure mode should never silently accept “close enough” actuation on risky operations.

---

# 11. Shared-room policy

In shared-room mode, Maestro should reduce silent autonomy.

Rules:

* increase explicitness requirements
* suppress risky auto-corrections
* reduce fallback to ambiguous visible-target routes
* require confirmation more often for medium/high-impact actions
* prefer refusal over low-confidence visual actuation

Shared-room mode is not only about speaker identity.
It is also about environmental ambiguity.

---

# 12. Retry policy

Retries should be bounded, typed, and policy-aware.

## Allowed retry classes

### A. Same-route retry

Allowed when:

* failure appears transient
* target binding is still valid
* the route is not destructive in a way that risks duplication

Example:

temporary adapter timeout while focusing a pane

### B. Retry with chooser

Allowed when:

* failure indicates multiple plausible targets
* route downgrade changed target clarity
* the user can resolve quickly

### C. Retry with slot prompt

Allowed when:

* a required field is missing
* the action is still lawful once completed

### D. Retry on downgraded route

Allowed only when:

* downgrade is explicitly policy-legal
* risk remains acceptable
* the semantics remain faithful enough

## Forbidden retries

Retries should be blocked when:

* the first attempt may already have performed an irreversible action
* duplicate execution would be dangerous
* the route is in a degraded or untrusted state
* the target may have changed after failure

---

# 13. Replay and audit policy

Every routed execution should emit a structured policy trace.

Minimum fields:

* command_id or workflow_id
* chosen_route
* alternative_routes_considered
* route_scores
* trust_tier
* execution_mode
* downgrade_applied
* confirmation_policy_applied
* speaker_verification_state
* security_mode
* shared_room_mode
* final_policy_outcome
* retry_strategy_if_any
* elapsed_ms_to_decision

This supports:

* debugging
* replay analysis
* user trust
* postmortem investigation
* future route tuning

---

# 14. Policy traceability commands

The policy engine should make later commands possible such as:

* why did you choose that route
* why did you use Talon
* what safer route was unavailable
* why was this blocked
* what would happen in secure mode

That means policy decisions must be explainable from stored trace data, not recomputed from vague memory.

---

# 15. Route downgrade examples

## Example 1: `click first result`

Possible routes:

1. browser DOM click
2. accessibility click
3. raw visual click

Policy:

* choose DOM if available
* allow accessibility fallback if DOM unavailable
* allow raw visual only if the result list is visible, stable, and low risk

## Example 2: `rename symbol token map to token index`

Possible routes:

1. LSP rename
2. editor command palette search
3. visual typing fallback

Policy:

* choose LSP route
* maybe allow editor command route if structured and verified
* block visual typing fallback because semantic fidelity collapses

## Example 3: `focus terminal`

Possible routes:

1. IDE subsurface focus
2. OS window focus
3. accessibility focus
4. Talon focus/click fallback

Policy:

* allow multiple fallbacks because this is usually low risk
* but preserve visible focus truth

## Example 4: `delete file secrets.toml`

Possible routes:

1. filesystem API
2. editor file explorer action
3. visual context-menu deletion

Policy:

* allow filesystem API with confirmation/policy gates
* maybe allow structured editor action
* block raw visual deletion by default

---

# 16. Workflow policy

Policy applies to workflows at two levels:

## Step level

Each step route must be legal on its own.

## Workflow level

The overall workflow may still be blocked even if every step is individually legal.

Examples:

* too many fallback steps in one workflow
* mixed secure and insecure routes
* privileged route hidden inside low-risk macro
* downgrade changes visible semantics of a named workflow

The policy engine should therefore support:

* step-level route approval
* workflow-level aggregate approval

---

# 17. Policy object shape

The actuation policy engine should produce a structured policy decision object.

Suggested fields:

* policy_decision_id
* command_id or workflow_id
* candidate_routes
* approved_route
* blocked_routes
* downgrade_applied
* trust_tier_effective
* confirmation_required
* chooser_required
* retry_strategy
* rollback_requirements
* audit_requirements
* explanation_summary

This makes policy an inspectable artifact, not just a boolean gate.

---

# 18. What the policy engine must not do

The policy engine must not:

* redefine language meaning
* invent new targets
* convert unsafe ambiguity into silent execution
* silently weaken secure mode
* hide meaningful route downgrades from the user when they matter
* substitute raw visual actuation for semantic action just because it is possible

Policy constrains realization.
It does not rewrite intent.

---

# 19. Laws to freeze

## Law 1

The chosen route must be both executable and policy-acceptable.

## Law 2

Semantic and higher-trust routes outrank lower-trust fallbacks by default.

## Law 3

Fallback is a governed downgrade, not an automatic convenience.

## Law 4

Secure mode and shared-room mode directly constrain allowed actuation routes.

## Law 5

Retries must be bounded, typed, and safe against duplication or semantic drift.

## Law 6

Destructive, privileged, or externally irreversible actions require stricter route policy than low-risk UI navigation.

## Law 7

Policy decisions must produce structured trace data for explanation, replay, and audit.

## Law 8

The actuation policy engine constrains execution routing without mutating language semantics.

---

# 20. What this unlocks

Once this document is frozen, Maestro can implement:

* a real route approval layer
* lawful fallback behavior
* explicit downgrade handling
* bounded retry rules
* explainable routing decisions
* safer composition of semantic, subprocess, accessibility, and visual actuators

This is the piece that turns “many possible executors” into “one controlled actuation system.”
