# Maestro Executor Architecture v0.1

## Purpose

The runtime contract tells Maestro **what the user means**.

The executor architecture tells Maestro **how that meaning becomes real action**.

This layer must solve:

* how commands are routed
* how multiple execution paths compete
* how surface-aware execution works
* how bound execution differs from focus transfer
* how recovery, undo, and safety gates integrate
* how Maestro stays deterministic while supporting many backends

This is the layer that turns Maestro from a language into a working VOS.

---

# 1. Core principle

## The language layer defines intent. The executor layer defines realization.

That means:

* `focus terminal` is a language-level intent
* whether that becomes:

  * IDE panel focus
  * OS window activation
  * Talon action
  * native app API call

is an executor decision

This separation is essential.

If language and execution are fused too early, Maestro becomes brittle.

---

# 2. Executor stack overview

The full action path should look like this:

```text
speech
  ↓
STT
  ↓
parser
  ↓
runtime command contract
  ↓
executor router
  ↓
safety / policy gate
  ↓
executor plan
  ↓
actuation
  ↓
result / recovery / undo registration
```

The executor architecture sits after parsing but before actual system actuation.

---

# 3. The main executor roles

Maestro needs at least six architectural roles.

## A. Executor Router

Chooses the best execution path for a command.

## B. Capability Registry

Knows which executors can handle which command shapes.

## C. Planner

Builds a concrete execution plan from the chosen executor path.

## D. Policy Gate

Checks safety, security mode, confirmation requirements, and authorization.

## E. Actuator

Actually performs the operation.

## F. Result Handler

Collects success, failure, undo metadata, and recovery options.

---

# 4. Executor classes

I would define the following executor classes.

## 1. Surface executors

Operate on surfaces directly.

Examples:

* IDE surface manager
* OS window manager
* browser tab manager

These handle commands like:

* focus terminal
* open explorer
* close panel
* show sidebar

---

## 2. Semantic executors

Operate through structured semantic APIs.

Examples:

* language server
* editor extension API
* browser DOM API
* accessibility tree API
* internal Maestro registry

These handle commands like:

* open definition
* rename symbol
* next error
* click first result
* focus search field

These are preferred whenever available.

---

## 3. Command executors

Run shell or process-like operations.

Examples:

* integrated terminal API
* external terminal launcher
* shell sidecar
* task runner
* background process manager

These handle commands like:

* run cargo build
* run tests
* stop process
* show logs

---

## 4. Filesystem executors

Operate on files, folders, and projects.

Examples:

* rename file
* move file
* delete file
* open file

These may be OS-level or app-aware depending context.

---

## 5. UI actuation executors

Operate through visible UI when no semantic path exists.

Examples:

* Talon
* mouse/keyboard automation
* OCR-backed selection
* UI.Vision-like visual actuation

These are fallback paths, not first choice.

---

## 6. Cognitive executors

Handle explain/compare/inspect-style commands.

Examples:

* Arqon/Nexus reasoning layer
* structured analysis engine
* diff engine
* summarizer
* error interpreter

These are not low-level actuators; they are cognitive realization paths.

---

# 5. Executor priority principle

## Prefer semantic execution over visual execution.

This should be a constitutional runtime law.

The preferred order should generally be:

1. native semantic API
2. app extension / plugin API
3. structured internal service
4. shell / task execution
5. accessibility tree / DOM
6. visual actuation fallback

So:

* `rename symbol foo` should prefer editor/LSP rename
* not simulated keyboard typing

And:

* `click first result` should prefer DOM or accessibility target
* not raw screen coordinates

This is one of the strongest design principles in the whole system.

---

# 6. Executor capability registry

Every executor should declare its capabilities in a structured registry.

Example fields:

* executor_id
* executor_class
* supported_verbs
* supported_object_types
* supported_surfaces
* supports_bound_execution
* supports_focus_transfer
* supports_background_execution
* supports_undo
* supports_confirmation_hooks
* security_level
* confidence_base
* latency_profile

Example:

```text
executor_id: vscode_semantic
executor_class: semantic
supported_verbs: [focus, open, rename, select, inspect, search, show]
supported_object_types: [surface, symbol, file, error, selection]
supported_surfaces: [editor, explorer, problems, integrated_terminal]
supports_bound_execution: true
supports_focus_transfer: true
supports_background_execution: false
supports_undo: true
security_level: medium
confidence_base: high
latency_profile: low
```

This registry is how routing becomes deterministic.

---

# 7. The executor router

The router decides which executor path should realize a command.

It should use:

* command contract
* active surface
* mode/state vector
* available executors
* capability registry
* user preferences
* security policy
* current environment
* latency / robustness heuristics

## Router output

The router should not just choose an executor.
It should produce a ranked candidate list.

Example:

Command:

`run cargo build in terminal`

Candidate routes:

1. vscode_integrated_terminal_api
2. shell_sidecar
3. external_terminal_focus_path
4. talon_keystroke_fallback

Then policy and planning refine the final path.

---

# 8. Router scoring model

Each executor candidate should be scored by at least these factors:

## A. Legality

Can this executor perform the action at all?

## B. Semantic fidelity

How close is the executor to the intended operation?

## C. Surface fidelity

Does it respect the intended target surface?

## D. Focus cost

Does it require visible focus transfer?

## E. Reversibility

Does it preserve undo/recovery support?

## F. Safety

Is it compatible with current security mode and risk policy?

## G. User preference

Has the user preferred this path before?

## H. Reliability

How often has this executor succeeded recently?

## I. Latency

How fast is this path?

This gives Maestro a real routing brain without needing an LLM.

---

# 9. Execution modes

Each command realization should choose one of three execution modes.

## A. Focus transfer

The system visibly changes focus, then acts.

Example:

* focus terminal
* run cargo build

This is straightforward and transparent.

---

## B. Bound execution

The command is executed against a target without visible focus transfer.

Example:

* run cargo build in integrated terminal
* open definition in editor
* search files auth token

This is one of Maestro’s signature powers.

---

## C. Background execution

The command runs off-surface without becoming visible unless needed.

Example:

* run tests in background
* start watch process
* index project

This mode must be explicit or policy-permitted.

---

# 10. Planning layer

The router chooses the route.
The planner builds the actual step sequence.

Example:

Command:

`run cargo build in terminal and return`

Plan:

1. capture current focus
2. identify terminal target
3. determine bound vs focus path
4. execute cargo build
5. if focus transferred, restore focus
6. register undo/recovery metadata
7. emit result

So the executor architecture needs a planner, not just direct dispatch.

---

# 11. Plan object

A command should compile into an execution plan object.

Suggested fields:

* plan_id
* command_id
* executor_id
* steps
* preconditions
* postconditions
* undo_plan
* rollback_strategy
* expected_result_type
* visibility_mode
* risk_level

Example step types:

* focus_surface
* open_surface
* bind_target
* run_command
* semantic_api_call
* wait_for_signal
* restore_focus
* emit_feedback

This gives the runtime a clean execution model.

---

# 12. Safety and policy gate

Before execution, every plan must pass through a policy layer.

The policy gate checks:

* confirmation requirements
* secure mode rules
* shared-room restrictions
* privilege requirements
* speaker verification status
* destructive operation policy
* executor trust level
* environmental constraints

Example:

`delete file secrets.toml`

The parser may say this is legal.
The router may find a valid filesystem executor.

But policy may still require:

* explicit confirmation
* privileged mode
* speaker verification
* refusal in shared-room mode

So legality is not enough.
Execution must still be policy-cleared.

---

# 13. Executor trust tiers

Not all executors are equally trustworthy.

I would define at least four tiers.

## Tier 1 — native semantic executors

Examples:

* LSP rename
* editor API
* filesystem API
* browser DOM API

Highest trust.

---

## Tier 2 — structured command executors

Examples:

* task runners
* shell sidecars
* bounded subprocess launchers

High trust, but with more operational risk.

---

## Tier 3 — accessibility/UI semantic fallback

Examples:

* accessibility tree click
* structured desktop accessibility action

Moderate trust.

---

## Tier 4 — raw visual actuation

Examples:

* mouse movement
* coordinate click
* OCR-guided action
* keystroke emulation fallback

Lowest trust. Use only when needed and with caution.

This trust model should directly affect routing.

---

# 14. Undo and rollback integration

The executor architecture must support two related but distinct concepts.

## Undo

A user-facing reversal action.

Examples:

* undo rename
* undo comment
* undo move line

## Rollback

A runtime-level failure recovery strategy.

Examples:

* restore focus after failed action
* revert partial plan state
* cancel background launch if precondition fails

Executors should declare:

* supports_undo
* supports_partial_rollback
* supports_focus_restore
* supports_transactional_grouping

This is crucial for Maestro’s “undo is sacred” law.

---

# 15. Result handling

Every executor must return a structured result, not just success/fail text.

Suggested result fields:

* command_id
* executor_id
* status
* steps_completed
* target_realized
* undo_registered
* warnings
* error_code
* recovery_options
* elapsed_ms

Possible statuses:

* success
* partial_success
* blocked
* failed
* cancelled
* needs_confirmation
* needs_slot
* needs_chooser

This result object feeds directly into:

* feedback
* history
* recovery UI
* learning
* debugging

---

# 16. Feedback model

Execution feedback should be minimal but structured.

Types of feedback:

## A. Silent success

For expert / quiet mode.

## B. Brief acknowledgment

Examples:

* done
* focused terminal
* build started

## C. Visible confirmation

Overlay or inline status.

## D. Rich recovery prompt

When action failed or needs clarification.

The executor result determines which feedback type is appropriate.

---

# 17. Executor preferences

The preference model should influence routing, not legality.

Examples:

* prefer integrated terminal for build in VS Code
* prefer Playwright over visual browser automation
* prefer external terminal for long-running commands
* prefer silent bound execution for search

These preferences should be stored as executor-routing preferences, not language mutations.

---

# 18. Surface-aware routing examples

## Example 1: `focus terminal`

Possible routes:

* vscode_subsurface_focus
* external_terminal_window_focus
* Talon window activation fallback

Routing factors:

* current app
* visible integrated terminal
* preference
* mode = coding

Likely winner:
vscode integrated terminal focus

---

## Example 2: `open definition`

Possible routes:

* LSP go-to-definition
* editor plugin command
* search symbol fallback
* visual fallback

Likely winner:
semantic LSP route

---

## Example 3: `click first result`

Possible routes:

* browser DOM result click
* accessibility click
* visual coordinate click

Likely winner:
DOM route

---

## Example 4: `run cargo build in terminal and return`

Possible routes:

* integrated terminal bound API
* shell sidecar
* external terminal focus path

Planner must account for postfix `and return`.

---

# 19. Cognitive executor routing

Cognitive verbs need the same architecture discipline.

For example:

`explain this error`

Possible routes:

* local structured error explainer
* Arqon/Nexus reasoning service
* IDE diagnostic interpreter
* log analysis path

The executor router should still choose among candidates using:

* bound object type
* current surface
* local data availability
* privacy/security policy
* latency preference

So cognitive execution is not exempt from routing discipline.

---

# 20. Executor composition

Some commands require multiple executors.

Example:

`search docs in browser and open first result`

Possible plan:

1. browser semantic executor performs search
2. browser DOM executor obtains result list
3. browser semantic/UI executor opens first result

Another example:

`build project and show logs`

Possible plan:

1. command executor starts build
2. surface executor reveals logs panel
3. feedback/result handler binds live logs stream

So Maestro needs not only single executors, but composed execution plans.

---

# 21. Plugin / adapter model

The executor system should be adapter-driven.

Each app or environment should expose an adapter.

Examples:

* VS Code adapter
* browser adapter
* filesystem adapter
* terminal adapter
* OS window adapter
* Talon fallback adapter
* Playwright browser adapter
* Arqon cognitive adapter

Each adapter registers its executors and capabilities into the common registry.

This gives Maestro extensibility without polluting the language layer.

---

# 22. Failure-aware routing

The router should consider recent failures.

Example:

If `browser_dom_click` has failed 3 times in current session:

* lower its ranking
* prefer accessibility route
* fall back to visual actuation only if policy allows

Likewise, if integrated terminal API is unavailable:

* degrade to external terminal route
* or chooser if the downgrade materially changes semantics

This makes the system adaptive without changing the language.

---

# 23. Secure execution behavior

Security mode must influence executor choice.

Examples:

## In secure mode

* prefer native semantic executors
* avoid raw visual actuation for risky commands
* require confirmation for destructive filesystem actions
* restrict background execution for privileged tasks
* require stronger speaker verification for system-level commands

## In shared-room mode

* suppress risky auto-corrections
* require explicit objects more often
* reduce silent execution of medium/high-impact commands

So the executor architecture must be security-aware by design.

---

# 24. Observability and audit

Every command execution should be logged as structured telemetry.

Suggested audit fields:

* command_id
* canonical command
* executor chosen
* alternative executors considered
* policy checks applied
* result status
* undo registration
* elapsed time
* recovery invoked
* speaker_verified
* security_mode

This is essential for:

* debugging
* user trust
* replay
* learning
* postmortem analysis

Very Arqon-compatible.

---

# 25. Constitutional laws to freeze

## Law 1

The language layer defines intent; the executor layer defines realization.

## Law 2

Semantic execution is preferred over visual actuation whenever available.

## Law 3

Routing must be deterministic, preference-aware, and policy-constrained.

## Law 4

Bound execution, focus transfer, and background execution are distinct runtime modes.

## Law 5

Every execution path must return structured results.

## Law 6

Undo and rollback must be planned, not improvised.

## Law 7

Security mode constrains executor choice, not just command legality.

## Law 8

Adapters extend the runtime without mutating the language.

---

# 26. First executor inventory v0.1

I would freeze this starter inventory.

## Core runtime services

* executor_router
* capability_registry
* plan_builder
* policy_gate
* result_handler
* undo_manager

## Base executors

* ide_surface_executor
* ide_semantic_executor
* terminal_executor
* shell_sidecar_executor
* filesystem_executor
* browser_semantic_executor
* browser_dom_executor
* accessibility_executor
* visual_actuation_executor
* cognitive_executor

## Adapters

* vscode_adapter
* browser_adapter
* os_adapter
* terminal_adapter
* arqon_adapter
* talon_adapter

That is enough to begin a serious implementation.

---

# 27. Example full realization

Command:

`rename symbol token map`

Runtime path:

1. parser emits command contract
2. router queries capability registry
3. candidates found:

   * vscode_semantic_executor
   * talon_visual_editor_fallback
4. router ranks vscode semantic route highest
5. policy gate approves
6. planner builds semantic rename plan
7. executor runs rename through editor/LSP
8. result handler registers undo
9. feedback: “renamed symbol”

This is exactly the kind of deterministic flow we want.

---

# 28. What this unlocks

Once this architecture is accepted, Maestro has:

* a real language
* a real command contract
* a real routing model
* a real execution model
* a real safety gate
* a real plugin/adaptation path

That is enough to move from pure design into system architecture.

---
