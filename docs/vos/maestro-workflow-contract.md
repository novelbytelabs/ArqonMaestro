# Maestro Workflow Contract v0.1

## Purpose

The **Command Contract** defines one lawful action.
The **Macro System** defines how multiple commands become a workflow.
The **Workflow Contract** defines the exact runtime object that carries that workflow through planning, policy, ArqonMCP orchestration, execution, recovery, and result reporting.

This is the object the runtime should execute when Maestro hears something like:

`build project then show logs then return focus`

Without this contract, multi-step execution stays hand-wavy.
With it, workflows become:

* deterministic
* inspectable
* policy-aware
* recoverable
* auditable

This is the last major runtime document needed for the first serious Maestro core.

---

# 1. Core principle

## A workflow is a first-class runtime object, not just a list of commands

That means a workflow must carry more than steps.

It must also carry:

* identity
* source
* execution policy
* shared bindings
* preconditions
* postconditions
* failure rules
* rollback rules
* aggregated result state

So the workflow contract is distinct from both:

* a single command contract
* a stored macro definition

It is the **execution-time object** for multi-step work.

---

# 2. Relationship to other Maestro artifacts

The Workflow Contract sits between Maestro parsing and ArqonMCP orchestration.

Flow:

speech
→ STT
→ parse
→ command contracts
→ workflow contract
→ ArqonMCP routing/orchestration
→ executor router
→ policy gate
→ execution
→ aggregated workflow result

So:

* **language** produces step intents
* **workflow contract** organizes them into a typed execution object
* **ArqonMCP** composes/routes execution strategy
* **executor architecture** realizes bounded actuation

Boundary rule:

* Maestro invokes and supervises workflows
* ArqonMCP orchestrates workflows

---

# 3. v0.1 scope limit

To keep v0.1 tight and buildable, the Workflow Contract should support only:

* sequential workflows
* typed step bindings
* preconditions
* postconditions
* rollback hooks
* result aggregation
* confirmation and chooser integration

It should **not** support yet:

* arbitrary branching
* loops
* recursion
* complex conditional trees
* open-ended planning graphs

That can come later.

For v0.1, Maestro workflows should be:

**linear, typed, inspectable, and safe.**

---

# 4. Workflow classes

The contract should support four source classes.

## A. Inline chain

Derived from one spoken utterance.

Example:

`focus terminal then run cargo build then return focus`

## B. Named macro invocation

Derived from a stored macro.

Example:

`run build review`

## C. Parameterized workflow invocation

Derived from a named macro plus bound parameters.

Example:

`run search file workflow for config.toml and auth token`

## D. System workflow

Derived from a built-in Maestro pattern.

Example:

`build project and return`

These are all represented by the same runtime workflow contract.

---

# 5. Canonical top-level workflow object

A workflow contract should include at least:

* workflow_id
* workflow_class
* source_type
* source_utterance
* canonical_workflow_name
* steps
* shared_state
* preconditions
* postconditions
* risk_level
* execution_policy
* rollback_policy
* confirmation_policy
* chooser_policy
* status
* audit_metadata

That is the minimum shape of a serious runtime workflow object.

---

# 6. Top-level fields explained

## workflow_id

Stable execution-time identifier.

Example:
`wf_2026_03_14_0001`

---

## workflow_class

One of:

* inline_chain
* named_macro
* parameterized_macro
* system_workflow

---

## source_type

How the workflow was produced.

Examples:

* spoken_chain
* stored_macro
* stored_macro_with_slots
* internal_expansion

This is useful for audit and debugging.

---

## source_utterance

The original spoken or normalized triggering phrase.

Example:

`build project then show logs then return focus`

---

## canonical_workflow_name

Optional in inline chains, required for named workflows.

Examples:

* build_review
* search_open_first
* build_and_return

---

## steps

Ordered list of workflow step objects.

This is the heart of the contract.

---

## shared_state

Typed workflow-level state that later steps can consume.

Examples:

* captured_focus
* result_list
* bound_file
* build_process_id
* current_log_surface

---

## preconditions

Conditions that must hold before step execution begins.

---

## postconditions

Expected or required outcomes after completion.

---

## risk_level

One of:

* low
* moderate
* high
* privileged

This affects planning, confirmation, and policy.

---

## execution_policy

Defines how the workflow should run.

Examples:

* visible vs bound
* allow background execution
* stop on first failure
* continue on soft failure

---

## rollback_policy

Defines how runtime restoration behaves if something fails.

---

## confirmation_policy

Defines whether confirmation is needed:

* none
* preflight
* per_step
* policy_driven

---

## chooser_policy

Defines whether chooser is allowed inside the workflow and how it is handled.

---

## status

Current workflow state.

Examples:

* created
* validated
* awaiting_confirmation
* running
* partial_success
* failed
* completed
* cancelled

---

## audit_metadata

Session, speaker, environment, timestamp, and routing details.

---

# 7. Workflow step object

Each workflow step should itself be a structured object.

Minimum fields:

* step_id
* order_index
* command_contract
* step_role
* required
* input_bindings
* output_bindings
* on_failure
* timeout_ms
* visibility_override
* policy_override
* status

This gives the runtime a real step model.

---

# 8. Step fields explained

## step_id

Stable identifier within the workflow.

Example:
`wf_0001_step_02`

---

## order_index

Execution order.

---

## command_contract

The embedded or referenced **Maestro Command Contract** for this step.

This is the single-command object already defined earlier.

---

## step_role

Why the step exists.

Examples:

* primary_action
* setup
* focus_capture
* context_reveal
* cleanup
* restore_focus
* recovery_step

This becomes useful in rollback and result aggregation.

---

## required

Boolean.

If true, workflow cannot be considered successful if this step fails.

If false, step may fail softly.

---

## input_bindings

Workflow state this step consumes.

Examples:

* `captured_focus`
* `result_list.first`
* `bound_symbol`
* `current_project`

---

## output_bindings

New state this step produces for later steps.

Examples:

* `build_process_id`
* `logs_surface`
* `opened_result`
* `new_focus_state`

---

## on_failure

Failure policy for this step.

Possible values:

* abort_workflow
* skip_and_continue
* chooser_then_retry
* slot_prompt_then_retry
* run_recovery_step
* escalate_to_user

---

## timeout_ms

Optional max execution time or step responsiveness threshold.

---

## visibility_override

Allows a step to request:

* visible
* bound
* background

If omitted, workflow-level execution policy applies.

---

## policy_override

Rare, tightly constrained override hook for a step’s confirmation or security behavior.

Should be used sparingly.

---

## status

Examples:

* pending
* running
* succeeded
* soft_failed
* hard_failed
* cancelled
* skipped
* rolled_back

---

# 9. Shared workflow state

This is one of the most important parts of the contract.

A workflow is not just a list.
It is a typed state container.

Shared state may include:

* focus_state
* surface_bindings
* result_lists
* file_bindings
* symbol_bindings
* process_handles
* temporary selections
* confirmation outcomes
* chooser outcomes
* timing data

This is how step 1 can meaningfully feed step 2.

Example:

`search files websocket timeout then open first result`

Step 1 produces:
`result_list`

Step 2 consumes:
`result_list.first`

That should be explicit in the workflow state model.

---

# 10. Binding types

Bindings must be typed.

Suggested binding types:

* surface_ref
* file_ref
* symbol_ref
* selection_ref
* process_ref
* result_list_ref
* location_ref
* query_ref
* focus_snapshot
* chooser_selection
* text_value
* boolean_flag
* number_value

This is essential because typed state is what keeps workflows deterministic.

---

# 11. Preconditions

A workflow contract should support both:

* workflow-level preconditions
* step-level preconditions

## Workflow-level examples

* project context exists
* user is in coding or terminal mode
* at least one terminal-capable executor is available
* secure mode permits execution

## Step-level examples

* a result list exists
* a file is currently bound
* focus snapshot was captured
* logs surface is available or creatable

If a precondition fails, the workflow may:

* chooser
* slot prompt
* refuse
* or fail fast

---

# 12. Postconditions

Postconditions define what success means.

Examples for:

`build project then show logs then return focus`

Possible postconditions:

* build step launched or completed successfully
* logs are visible or bound
* focus is restored to pre-workflow context

Why this matters:

* success can be measured
* partial success can be classified
* recovery can be reasoned about
* audit becomes meaningful

---

# 13. Execution policy

Each workflow must declare how it wants to run.

Suggested fields:

* execution_mode
* focus_policy
* background_policy
* interruption_policy
* step_failure_policy
* retry_policy

## execution_mode

Values:

* visible_sequential
* bound_sequential
* mixed

## focus_policy

Values:

* preserve_if_possible
* allow_temporary_shift
* no_visible_shift
* explicit_shift_required

## background_policy

Values:

* disallow
* allow_marked_steps_only
* allow_if_safe

## interruption_policy

Values:

* reflex_interruptible
* pause_resume_supported
* cancellation_supported

## step_failure_policy

Values:

* abort_on_required_failure
* continue_on_soft_failure
* workflow_defined

## retry_policy

Values:

* none
* chooser_then_retry
* slot_then_retry
* bounded_retry

---

# 14. Confirmation policy

A workflow may contain risky steps even if the utterance sounds simple.

So the contract must support:

* none
* preflight
* per_step
* policy_driven

## none

Low-risk workflows only.

## preflight

System shows a summary before execution.

Example:

This workflow will:

1. build project
2. show logs
3. return focus

Confirm?

## per_step

Used when the workflow contains isolated risky steps.

## policy_driven

Runtime decides based on security mode, shared-room mode, and action type.

---

# 15. Chooser policy

Workflows must define what happens when a step becomes ambiguous.

Suggested options:

* disallow_chooser_inside_workflow
* allow_chooser_and_resume
* allow_chooser_once_then_abort
* inline_chooser_required_for_ambiguous_steps

For v0.1, the best default is:

**allow chooser and resume**

That means if step 2 becomes ambiguous, Maestro can pause, resolve it, then continue the workflow.

---

# 16. Rollback policy

Rollback is not the same as undo.

Rollback handles runtime restoration when a workflow fails mid-flight.

Suggested fields:

* supports_rollback
* rollback_scope
* restore_focus_on_failure
* undo_completed_steps_if_possible
* rollback_steps

## rollback_scope

Values:

* none
* focus_only
* reversible_steps_only
* workflow_defined

## Example

Workflow:

1. capture focus
2. open browser
3. search page
4. return focus

If step 3 fails, rollback may:

* restore focus
* dismiss temporary overlay
* mark workflow partial_success

That is runtime rollback, not user undo.

---

# 17. Undo policy

Undo is the user-facing reversal model.

Suggested fields:

* supports_undo
* undo_scope
* undo_steps
* undo_grouping

## undo_scope

Values:

* none
* per_step
* grouped_workflow

## grouped_workflow

Useful for cases where several reversible steps should be treated as one unit.

Example:
rename symbol + update references

For v0.1, many workflows may simply expose per-step undo.

---

# 18. Workflow result object

Execution of a workflow must produce a structured result.

Minimum fields:

* workflow_id
* final_status
* step_results
* completed_step_count
* failed_step_count
* skipped_step_count
* rollback_applied
* undo_registered
* recovery_options
* elapsed_ms
* warnings
* audit_metadata

## final_status values

* success
* partial_success
* blocked
* failed
* cancelled
* needs_confirmation
* needs_slot
* needs_chooser

This result object feeds:

* UI feedback
* audit logs
* learning
* recovery
* debugging

---

# 19. Step result object

Each step result should include:

* step_id
* executor_id
* status
* bound_targets
* produced_bindings
* warnings
* error_code
* recovery_options
* elapsed_ms

This lets the workflow result be a real aggregation, not a vague summary.

---

# 20. Example workflow: build project then show logs then return focus

Let’s formalize your example.

## Source utterance

`build project then show logs then return focus`

## Workflow class

inline_chain

## Risk

moderate

## Likely execution policy

* execution_mode: mixed
* focus_policy: preserve_if_possible
* confirmation_policy: policy_driven
* chooser_policy: allow_chooser_and_resume
* rollback_scope: focus_only + reversible_steps_if_possible

## Steps

### Step 1

Command:
`build project`

Role:
primary_action

Required:
true

Possible output bindings:

* `build_handle`
* `build_executor`
* `build_target`

### Step 2

Command:
`show logs`

Role:
context_reveal

Required:
false or true depending policy
I would mark it **soft-required** in v0.1

Possible input bindings:

* `build_handle`
* `build_executor`

Possible output bindings:

* `logs_surface`
* `logs_binding`

### Step 3

Command:
`return focus`

Role:
restore_focus

Required:
true

Input bindings:

* `captured_focus`

Output bindings:

* `restored_focus`

## Shared state

* captured_focus
* build_handle
* logs_surface
* restored_focus

## Postconditions

* build launched or completed
* logs visible or bound
* focus restored

## Possible final statuses

* success
* partial_success if logs failed but build and focus restore succeeded
* failed if build never started

This is exactly the kind of structure the workflow contract should carry.

---

# 21. Example workflow object, conceptually

A runtime workflow object for that example should look conceptually like:

* workflow_id: wf_build_project_show_logs_return_focus
* workflow_class: inline_chain
* source_utterance: "build project then show logs then return focus"
* steps:

  1. build project
  2. show logs
  3. return focus
* shared_state:

  * captured_focus
  * build_handle
  * logs_surface
* preconditions:

  * project_context_exists
  * build_executor_available
* postconditions:

  * build_started
  * focus_restored
* risk_level: moderate
* execution_policy:

  * mixed
  * preserve_if_possible
* rollback_policy:

  * focus_restore_on_failure
* confirmation_policy:

  * policy_driven
* chooser_policy:

  * allow_chooser_and_resume

That is enough for the runtime to plan and execute it cleanly.

---

# 22. System workflow examples to support early

The Workflow Contract should cleanly support these early built-ins:

## A. build and return

`build project and return`

## B. search and open first

`search files auth token then open first result`

## C. focus-run-return loop

`focus terminal then run cargo build then return focus`

## D. review next error

`next error then explain this error`

## E. browser search loop

`focus browser then focus search field`

These are excellent test cases for the first workflow runtime.

---

# 23. Restrictions for v0.1

To keep the first implementation sane, freeze these constraints:

* only sequential execution
* no arbitrary branching
* no loops
* no nested workflows beyond one expansion layer
* no hidden destructive steps
* no silent weakening of per-step confirmation
* no untyped state passing
* no execution without lawful step contracts

These constraints will save enormous pain later.

---

# 24. Inspection commands this contract enables later

Once the workflow contract exists, Maestro can later support commands like:

* inspect current workflow
* why did step two fail
* repeat step two
* cancel this workflow
* save this as build review
* what does build review do
* undo this workflow

That is only possible because the workflow is a real runtime object.

---

# 25. Laws to freeze

## Law 1

A workflow is a first-class runtime object, not merely a list of commands.

## Law 2

Every workflow step must contain a lawful command contract.

## Law 3

Workflow state shared across steps must be typed and inspectable.

## Law 4

Workflow legality is distinct from command legality.

## Law 5

Rollback and undo are distinct and must both be represented explicitly.

## Law 6

Chooser, slot, and confirmation behavior inside workflows must be policy-defined, not improvised.

## Law 7

The first workflow runtime supports sequential execution only.

## Law 8

Workflow results must be structured and step-aware.

---

# 26. Minimum viable Workflow Contract

For the first implementation-tight version, I would freeze this minimum field set.

## Workflow minimum

* workflow_id
* workflow_class
* source_utterance
* steps
* shared_state
* risk_level
* execution_policy
* confirmation_policy
* chooser_policy
* rollback_policy
* status

## Step minimum

* step_id
* order_index
* command_contract
* required
* input_bindings
* output_bindings
* on_failure
* status

## Result minimum

* workflow_id
* final_status
* step_results
* rollback_applied
* undo_registered
* elapsed_ms

That is enough to build the first real workflow engine.

---
