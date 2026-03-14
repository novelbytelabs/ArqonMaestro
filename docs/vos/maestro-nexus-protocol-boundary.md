# Maestro-Nexus Protocol Boundary v0.1

## Purpose

Maestro and Nexus are not the same system.

Maestro is the Voice Operating System.
Nexus is the intelligent personal assistant and human-representative continuity layer.

This document defines:

* the ownership boundary between them
* what messages should pass across that boundary
* who owns context, memory, and execution
* how delegated authority should work
* how proposals become lawful execution

Without this boundary, one of two bad outcomes happens:

* Nexus swallows Maestro and the hot operating path becomes mushy
* Maestro tries to absorb the whole assistant role and loses architectural clarity

This document is how we keep them as healthy siblings.

---

# 1. Core principle

## Nexus proposes, remembers, and guides. Maestro interprets, gates, and executes.

That is the cleanest working law.

Maestro owns:

* wake
* speech capture
* lane classification
* spoken operating grammar
* command and workflow contracts
* focus semantics
* chooser and confirmation
* low-latency actuation routing

Nexus owns:

* assistant continuity
* long-horizon planning
* personal context
* delegated decision logic
* preference learning across time
* product and system stewardship on behalf of the human
* meta-review and “check the checkers” functions

This is the sibling-AGO boundary.

---

# 2. The relationship model

The strongest model is:

* Maestro = spoken operating embodiment
* Nexus = personal assistant and continuity intelligence
* both are sibling AGOs
* both ride Arqon Bus
* both may consume and emit capabilities through a shared execution fabric

Maestro can exist without Nexus.
Nexus can use Maestro for voice interaction without owning Maestro’s deterministic authority.

---

# 3. Boundary responsibilities

## Maestro owns

* the hot voice-operating path
* deterministic command interpretation
* command legality
* workflow legality
* actuation policy gating
* real-time focus and surface control
* execution routing
* immediate recovery, chooser, and confirmation
* execution trace and operating audit

## Nexus owns

* long-horizon intent modeling
* personal memory continuity
* preference synthesis over time
* proactive suggestions
* scheduling, reminders, and assistant continuity
* delegation training and confidence modeling
* product and project-level stewardship on behalf of the user
* translation between human goals, science outputs, and code execution agendas

## Shared but bounded

* preference signals
* execution outcomes
* session summaries
* memory references
* authority grants

Shared does not mean unowned.
Each artifact still needs a home.

---

# 4. Authority model

The Nexus philosophy implies a staged delegation arc.

## Phase A: Advisory

Nexus may:

* suggest plans
* suggest preferences
* recommend actions
* ask Maestro to prepare or explain

Nexus may not:

* silently approve operating actions on the user’s behalf

## Phase B: Scoped autonomy

Nexus may:

* auto-approve routine actions within explicitly granted scopes
* supply default decisions for known low-risk patterns

But only when:

* authority scope is explicit
* confidence is high enough
* Maestro policy still approves the route

## Phase C: Proxy authority

Nexus may act as delegated sovereign within tightly bounded domains.

But:

* the human retains the kill switch
* Maestro still enforces actuation policy
* privileged and novel actions may still require direct human involvement

Nexus delegation does not erase Maestro policy.

---

# 5. Protocol design rule

The Maestro-Nexus boundary should carry **structured proposals and results**, not vague chat text.

That means Nexus should not send:

* “please probably do the build thing”

It should send something like:

* proposal type
* target scope
* requested intent
* authority basis
* confidence
* why it thinks this is appropriate

Similarly, Maestro should not answer with only freeform narration.
It should emit structured execution outcomes, blocks, and clarification needs.

---

# 6. Message families

For v0.1, the boundary should support the following message families.

## A. Maestro -> Nexus: session and context messages

Examples:

* session_started
* session_resumed
* active_mode_changed
* focus_changed
* workflow_started
* workflow_completed

Purpose:

* give Nexus continuity without giving it direct control ownership

## B. Maestro -> Nexus: execution outcome messages

Examples:

* command_executed
* workflow_executed
* command_blocked
* chooser_required
* confirmation_required
* route_downgraded

Purpose:

* let Nexus learn, explain, and adapt proposals

## C. Maestro -> Nexus: preference training signals

Examples:

* user_chose_route
* user_confirmed_action
* user_rejected_proposal
* user_overrode_preference

Purpose:

* feed long-horizon personal learning into Nexus

## D. Nexus -> Maestro: proposal messages

Examples:

* proposed_command
* proposed_workflow
* suggested_preference
* suggested_context
* reminder_or_nudge

Purpose:

* let Nexus influence execution through structured proposals

## E. Nexus -> Maestro: authority messages

Examples:

* delegation_token
* confidence_assertion
* scope_grant_reference
* escalation_request

Purpose:

* represent why Nexus believes it may act or recommend action

## F. Nexus -> Maestro: memory/context messages

Examples:

* relevant_memory_bundle
* user_preference_bundle
* active_goal_context
* project_stewardship_context

Purpose:

* improve interpretation and planning without collapsing ownership

---

# 7. Proposed protocol objects

The exact wire schema can evolve, but the conceptual objects should be frozen.

## A. `NexusProposal`

Suggested fields:

* proposal_id
* proposal_type
* source_goal
* requested_intent
* requested_scope
* confidence
* authority_basis
* rationale
* novelty_level
* requires_human_confirmation

## B. `NexusContextBundle`

Suggested fields:

* bundle_id
* user_id
* memory_refs
* preference_refs
* active_goal_refs
* product_refs
* delegation_state
* freshness

## C. `MaestroExecutionOutcome`

Suggested fields:

* execution_id
* source
* command_or_workflow_id
* status
* route_selected
* policy_decision
* confirmation_applied
* chooser_applied
* elapsed_ms
* audit_ref

## D. `DelegationGrant`

Suggested fields:

* grant_id
* grantor_identity
* grantee
* authority_scope
* allowed_risk_level
* expiration
* revocation_state
* provenance

These objects are enough to keep the boundary structured even before a final wire schema is frozen.

---

# 8. Ownership of context and memory

This must be explicit.

## Maestro owns

* live session state
* active focus state
* active mode state
* hot-path operating context
* current chooser/confirmation state
* execution-local traces

These are time-critical operating facts.

## Nexus owns

* long-horizon memory
* personal context continuity
* preference synthesis across sessions
* delegation confidence history
* product stewardship context
* long-range planning context

These are continuity and agency facts.

## Shared references

Maestro and Nexus should exchange references and bundles, not duplicate unbounded state blindly.

That keeps the systems composable rather than fused.

---

# 9. Ownership of memory writes

The boundary should also define who may write what.

## Maestro may write

* execution traces
* route outcomes
* confirmation outcomes
* chooser outcomes
* local operating preferences
* short-horizon session facts

## Nexus may write

* long-horizon preference models
* memory summaries
* delegation profiles
* user intent continuity
* product/project-level ownership context

## Important rule

Nexus may suggest or learn preferences, but it should not silently rewrite Maestro’s canonical operating language or hard security policy.

---

# 10. How proposals become execution

The clean handoff should be:

1. Nexus proposes an action or workflow.
2. Maestro converts that proposal into a command contract or workflow contract candidate.
3. Maestro applies legality, policy, and route checks.
4. Maestro decides:
   * execute
   * confirm
   * chooser
   * block
   * refuse
5. Maestro emits structured outcome back to Nexus.

This preserves Maestro’s deterministic operating authority.

Even a high-confidence Nexus proposal is still a proposal until Maestro accepts it.

---

# 11. Human-directed cognitive handoff

When the user speaks in a cognitive/assistant lane:

* Maestro should detect the lane
* Maestro may forward the request to Nexus
* Nexus may return:
  * explanation
  * recommendation
  * plan proposal
  * preference suggestion

If the result includes a proposed operating action, Maestro should still gate and execute it as Maestro work, not as direct Nexus command injection.

---

# 12. Product and system stewardship

Your Nexus model is broader than a simple chatbot assistant.

Nexus may also own:

* products invented by the system
* product continuity across agents
* synthesis of discoveries from Science Monkeys
* translation into governed possibilities for Code Monkeys
* meta-checking and “checking the checkers”

That means the Maestro boundary must support more than personal reminders.

It must also support:

* stewardship context bundles
* project/product proposals
* governance escalation
* higher-order review requests

But even in those cases:

* Nexus proposes architecture and continuity
* Maestro remains the spoken operating gateway

---

# 13. Existing protocol anchors

The current ecosystem already provides some useful anchors:

* `QueryRequest`
* `QueryResponse`
* `NexusEvent`

These are good starting points for:

* query/response
* telemetry
* event visibility

But they are not yet enough to define the full Maestro-Nexus execution boundary.

We still need richer structured proposal and delegation objects for VOS integration.

---

# 14. Safety and refusal rules

Nexus should not be able to bypass Maestro’s safety posture.

Rules:

* Maestro may refuse a Nexus proposal if it is illegal, unsafe, or under-authorized
* Maestro may require confirmation even when Nexus says confidence is high
* Maestro may downgrade or block routes based on security mode or environmental conditions
* Nexus should receive structured refusal reasons so it can adapt

This keeps refusal informative rather than adversarial.

---

# 15. Delegation and kill switch

Delegation must be explicit, scoped, and revocable.

Rules:

* the human grants authority
* Nexus acts within that authority
* Maestro validates each proposed action against that authority
* the human may revoke or narrow the grant at any time
* emergency stop and override remain human-first

This is how the system scales the human without replacing the human.

---

# 16. Example interaction flows

## Example 1: cognitive suggestion

User:

* “prepare me to work on the parser”

Flow:

* Maestro classifies cognitive lane
* Nexus returns preparation plan and suggested workspace actions
* Maestro asks for confirmation before executing operating steps

## Example 2: delegated routine action

Nexus:

* proposes routine log review workflow under an approved delegation scope

Flow:

* Maestro validates delegation grant
* Maestro validates workflow legality and route policy
* Maestro executes and reports structured result

## Example 3: blocked delegated action

Nexus:

* proposes destructive or privileged action beyond granted scope

Flow:

* Maestro blocks
* emits refusal reason
* Nexus may escalate to human review

---

# 17. What the boundary must not do

The Maestro-Nexus boundary must not:

* let Nexus redefine Maestro language semantics
* let Nexus bypass actuation policy
* collapse all memory ownership into Maestro
* collapse all execution ownership into Nexus
* blur who made a proposal versus who executed it

Those are exactly the failure modes this document exists to prevent.

---

# 18. Laws to freeze

## Law 1

Maestro and Nexus are sibling AGOs with distinct responsibilities.

## Law 2

Nexus may propose and guide, but Maestro owns deterministic spoken execution.

## Law 3

Long-horizon memory and delegation continuity belong to Nexus; live operating state belongs to Maestro.

## Law 4

No Nexus proposal becomes execution without Maestro legality and policy gating.

## Law 5

Delegated authority must be explicit, scoped, inspectable, and revocable.

## Law 6

Protocol messages between Maestro and Nexus should be structured proposals, contexts, grants, and outcomes, not vague freeform chat only.

## Law 7

Nexus may scale the human, but may not erase the human kill switch.

## Law 8

The boundary should preserve architectural legibility even as Nexus becomes more capable.

---

# 19. What this unlocks

Once this boundary is frozen, Maestro can integrate deeply with Nexus while preserving:

* a clean hot operating path
* lawful assistant delegation
* personal continuity without scope collapse
* structured proposals and refusals
* long-horizon stewardship without muddy execution authority

That is how Maestro and Nexus become powerful together without becoming confused together.
