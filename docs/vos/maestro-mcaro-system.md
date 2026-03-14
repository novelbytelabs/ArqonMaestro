# Maestro Macro System v0.1

## Purpose

The macro system defines how Maestro turns **multiple commands into one lawful workflow**.

A macro is **not** just a shortcut string.
It is a structured, inspectable, policy-aware workflow built from canonical commands.

Example:

`build project then show logs then return focus`

should not be treated as vague prose.
It should compile into a real workflow plan.

The macro system exists to answer:

* how commands chain
* when chains become macros
* how macros are stored
* how macros stay safe and inspectable
* how macros interact with chooser, preferences, and recovery
* how Maestro supports expert compression without losing determinism

---

# 1. Core principle

## A macro is compiled from canonical commands, not raw speech fragments

That means:

* speech may be natural
* normalization produces canonical commands
* the macro stores the canonical form
* execution always runs the canonical workflow, not the original fuzzy utterance

So:

`build project then show logs then return focus`

internally becomes something like:

1. `build project`
2. `show logs`
3. `return focus`

This is essential for safety and stability.

---

# 2. Macro classes

I would define four macro classes.

## A. Inline chains

Single utterance, immediate execution.

Example:

`focus terminal then run cargo build then return focus`

These are not yet persistent.
They are just multi-step command chains executed now.

---

## B. Named macros

Saved workflows with a stable name.

Example:

`run build loop`

which expands to:

1. focus terminal
2. run cargo build
3. show logs
4. return focus

---

## C. Parameterized macros

Saved workflows with slots.

Example:

`open file {name} then search {query}`

Spoken use:

`run search file macro for config.toml and auth token`

These are more advanced and should come after basic named macros.

---

## D. System macros

Built-in Maestro workflow patterns.

Examples:

* build and return
* search and open first result
* open definition and return

These are canonical workflow shapes the system knows natively.

---

# 3. What counts as a macro

Not every chain needs to become a macro.

## Inline chain

A short sequence of 2–3 commands spoken once.

Example:

`focus browser then search page websocket`

This should just execute as a chain.

## Macro candidate

A repeated or named multi-step workflow.

Example:

`build project then show logs then return focus`

This is a strong macro candidate because it is:

* repeated
* useful
* stable
* cross-command
* meaningful as one unit

---

# 4. Canonical macro shape

A macro should compile to a structured object like:

* macro_id
* macro_name
* source_type
* steps
* slots
* preconditions
* postconditions
* confirmation_policy
* undo_policy
* allowed_modes
* allowed_surfaces
* risk_level

Example concept:

```text
macro_name: build_project_review
steps:
  1. build project
  2. show logs
  3. return focus
risk_level: medium
allowed_modes: [coding, terminal]
```

This makes macros real runtime artifacts.

---

# 5. Macro source forms

Macros can originate from three sources.

## A. Explicit speech composition

Example:

`build project then show logs then return focus`

The parser treats this as an inline macro candidate.

---

## B. Named save flow

Example:

`save this as build review`

This turns the current inline chain into a named macro.

---

## C. Repeated behavior learning

If the user repeatedly executes the same chain, Maestro may suggest:

`You often do this. Save as a macro?`

But it should not silently create strong workflows without visibility.

---

# 6. Chain syntax

The macro system begins with lawful chain syntax.

## Canonical chain markers

* then
* and then
* pause-separated list, if parser supports it cleanly

Preferred form:

`command then command then command`

Example:

`build project then show logs then return focus`

This is clearer than conversational nesting.

---

# 7. Macro step rules

Every macro step must first be a valid canonical command.

That means Maestro should:

1. parse each step independently
2. legality-check each step
3. compile the sequence only if each step is lawful

Bad macro candidate:

`do build then handle logs`

This should not compile on the deterministic lane.

Good macro candidate:

`build project then show logs then return focus`

This is lawful because each step is canonical.

---

# 8. Workflow semantics

A macro is more than a list.
It also has control semantics.

Each macro step may specify:

* must succeed
* may fail softly
* may require chooser
* may require slot prompt
* may require confirmation
* may be skipped on failure
* may produce bindings used later

This is crucial.

Example:

`search files websocket timeout then open first result`

Step 2 depends on a result list from Step 1.

So the macro engine must support **step outputs feeding later steps**.

---

# 9. Data flow between steps

Macros need typed handoff between steps.

Example:

`search files websocket timeout then open first result`

Data flow:

1. step 1 produces `result_list`
2. step 2 consumes `result_list.first`

Another example:

`open definition then return focus`

1. step 1 changes focus and binding context
2. step 2 consumes focus stack state

So macro steps must be allowed to pass:

* focus state
* object bindings
* result lists
* current surface
* temporary variables
* error states

---

# 10. Macro execution modes

A macro may execute in different runtime styles.

## A. Visible sequential

User sees each action happen.

Example:

* build project
* show logs
* return focus

This is best for transparency and debugging.

## B. Bound sequential

Where possible, steps run without visible focus transfer.

Example:

* build project in integrated terminal
* show logs in terminal
* return focus

This feels smoother and more expert.

## C. Mixed

Some steps visible, some bound.

This will likely be the normal mode.

---

# 11. Macro legality

Not every valid chain is a valid macro.

A macro should be rejected or escalated when:

* steps are individually illegal
* steps require unresolved ambiguity
* steps create high-risk side effects without confirmation
* steps depend on missing bindings
* steps become too long or too nested for safe deterministic execution

So macro legality must be checked at both levels:

## Step legality

Can each command exist?

## Workflow legality

Can this sequence safely run as one unit?

---

# 12. Macro risk classes

I would define four macro risk levels.

## M1 — low risk

Navigation and visibility workflows.

Examples:

* focus browser then return focus
* show sidebar then hide sidebar

## M2 — moderate risk

Build/test/search workflows.

Examples:

* build project then show logs
* search files then open first result

## M3 — high risk

Destructive or state-changing workflows.

Examples:

* rename file then run tests
* delete file then rebuild

## M4 — privileged risk

System/admin/security-sensitive workflows.

Examples:

* run privileged command then restart service

Different risk classes should affect:

* confirmation policy
* whether inline execution is allowed
* whether saving is allowed
* whether shared-room mode blocks it

---

# 13. Confirmation policy for macros

A macro should not hide dangerous steps.

If any step requires confirmation, the macro system has two options:

## A. Per-step confirmation

The system asks at the dangerous step.

## B. Preflight confirmation

The system shows:

`This workflow will:`

1. rename file
2. run tests
3. open logs

`Confirm?`

Preflight confirmation is better for medium/high-risk macros.

---

# 14. Macro preconditions

Macros should declare what must be true before running.

Examples:

* coding mode or editor context required
* project must be open
* terminal executor must be available
* browser must have results list
* active selection required

Example:

`build project then show logs then return focus`

Possible preconditions:

* project context exists
* build executor available
* logs surface available or creatable
* focus stack valid

If preconditions fail, the macro should:

* slot prompt
* chooser
* refuse
* or offer repair

---

# 15. Macro postconditions

Macros should also declare expected outcomes.

Example:

`build project then show logs then return focus`

Postconditions may include:

* build started or completed
* logs surface bound or visible
* focus restored

This helps with:

* success criteria
* recovery
* audit
* debugging

---

# 16. Undo and rollback in macros

Macros need both undo and rollback support.

## Undo

User-facing reversal of completed reversible steps.

## Rollback

System recovery if step 3 fails after steps 1 and 2 succeeded.

Example:

`open browser then search page websocket then close dialog`

If step 2 fails, rollback might restore prior focus or dismiss temporary UI.

A macro should declare:

* step undo support
* workflow rollback strategy
* whether partial success is acceptable

---

# 17. Macro result statuses

The macro engine should return structured results like:

* success
* partial_success
* blocked
* failed
* cancelled
* needs_confirmation
* needs_slot
* needs_chooser

This is especially important because workflows can fail in the middle.

Example:

`build project then show logs then return focus`

Possible result:

* step 1 success
* step 2 success
* step 3 success

or:

* step 1 success
* step 2 failed: logs surface unavailable
* step 3 success via rollback/focus restore
* overall = partial_success

---

# 18. Named macro management

Users should be able to create, inspect, run, and delete named macros.

## Spoken creation commands

Examples:

* save this as build review
* name this build loop
* remember this workflow

## Spoken execution commands

Examples:

* run build review
* execute build loop

## Spoken inspection commands

Examples:

* inspect macro build review
* what does build review do

## Spoken deletion commands

Examples:

* delete macro build review
* forget macro build review

These should likely come in v0.2, but the system should be designed now.

---

# 19. Parameterized macros

These are powerful but should be constrained.

Example:

Macro:

`open file {file} then search {query}`

Invocation:

`run find in file for config.toml and auth token`

The key rule:

## Parameters must be typed

Not arbitrary string spaghetti.

Parameter types may include:

* file
* query
* line number
* symbol
* browser result index
* terminal command payload

Typed slots keep macros lawful.

---

# 20. Macro example: build project then show logs then return focus

Let’s formalize your example.

## Spoken form

`build project then show logs then return focus`

## Canonical steps

1. `build project`
2. `show logs`
3. `return focus`

## Likely workflow interpretation

* lane: command
* type: inline macro
* risk: moderate
* allowed mode bias: coding / terminal
* expected execution:

  * choose build executor
  * reveal or bind logs
  * restore previous focus context

## Plan sketch

1. capture focus state
2. route `build project`
3. route `show logs`
4. if logs require focus shift, allow or bind per policy
5. run `return focus`
6. emit workflow result

## Possible optimization

If preferred route exists:

* `build project` via integrated terminal
* `show logs` via terminal/log panel binding
* `return focus` may be a no-op if focus never visibly changed

This is exactly why macro planning matters.

---

# 21. System macros to freeze early

I would freeze a small set of system-native macro patterns.

## A. Build and return

`build project and return`

Expands to:

1. build project
2. return focus

## B. Search and open

`search files auth token then open first result`

## C. Focus work loop

`focus terminal then run cargo build then return focus`

## D. Review error loop

`next error then explain this error`

## E. Browser search loop

`focus browser then focus search field`

These become exemplary patterns for the language.

---

# 22. Macro learning and preferences

Macro learning should be conservative.

Allowed:

* suggest save after repeated identical chains
* allow named saving
* remember preferred executor route for a macro

Not allowed:

* silently invent a macro from loosely similar behavior
* silently broaden macro scope
* silently weaken safety policy

Macro learning should behave like preference learning:

* inspectable
* scoped
* reversible

---

# 23. Macro relation to the parser

The parser does not need full macro intelligence to start.

For v0.1, the parser only needs to do three things:

## 1. Detect chain markers

Example:
`then`

## 2. Split the utterance into candidate step commands

## 3. Parse each step independently and emit a workflow object

That is enough for a serious prototype.

The deeper macro engine can come after the deterministic parser skeleton exists.

---

# 24. Macro runtime object

A macro/workflow object should look something like:

* workflow_id
* source_utterance
* workflow_type
* steps
* bindings
* preconditions
* postconditions
* risk_level
* confirmation_policy
* rollback_policy
* visibility_mode
* status

This keeps the workflow distinct from a single command contract.

Single command = command contract
Multi-step workflow = workflow contract

That distinction should be frozen now.

---

# 25. Macro laws to freeze

## Law 1

A macro is composed of canonical commands, not raw fuzzy speech fragments.

## Law 2

Every macro step must be individually legal before the workflow is legal.

## Law 3

Workflow legality is distinct from step legality.

## Law 4

Macros must remain inspectable, reversible where possible, and policy-constrained.

## Law 5

Data produced by one step may bind later steps only through typed workflow state.

## Law 6

High-risk macros require explicit confirmation or preflight review.

## Law 7

Named and learned macros may bias speed, but may not weaken safety or redefine canonical meaning.

## Law 8

Single-command contracts and workflow contracts are distinct runtime objects.

---

# 26. What this unlocks

With the macro system in place, Maestro can now support:

* short lawful chains
* reusable named workflows
* expert compression
* multi-step planning
* safer automation
* deterministic workflow execution

This is the layer that makes Maestro feel like an operating system instead of a command recognizer.
