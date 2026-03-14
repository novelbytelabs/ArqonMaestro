# Maestro Capability Registry and Adapter Contract v0.1

## Purpose

The executor architecture says Maestro needs:

* a router
* executors
* adapters
* safety gates
* structured results

But none of that becomes implementation-tight until every adapter can declare, in a uniform way:

* what it can operate on
* what verbs it supports
* what object classes it understands
* which execution modes it can perform
* how trustworthy it is
* what undo it supports
* how security-sensitive it is
* how fast and reliable it tends to be

That is the job of the **Capability Registry** and **Adapter Contract**.

This is the document that turns “we have executors” into “the router can actually make lawful decisions.”

---

# 1. Core principle

## The language stays sovereign; adapters only declare realization power

An adapter is never allowed to mutate the language.

It does not define what `focus` means.
It only declares whether it can realize `focus` on some surface or object.

So:

* language defines intent
* contract defines capability
* router chooses among declared capabilities
* policy constrains execution

That separation is sacred.

---

# 2. What the capability registry is

The Capability Registry is the runtime catalog of every execution path currently available to Maestro.

It answers questions like:

* Which adapter can realize `open definition` right now?
* Can the current browser adapter do semantic `click first result`?
* Does the VS Code adapter support bound execution for `run cargo build in integrated terminal`?
* Does this route support undo?
* Is this route safe enough in secure mode?
* Which route is faster and more reliable?

The registry is therefore the **shared truth layer** between:

* parser
* router
* policy gate
* planner
* undo manager
* observability layer

---

# 3. What an adapter is

An adapter is a named integration boundary for a concrete environment.

Examples:

* VS Code adapter
* browser adapter
* terminal adapter
* filesystem adapter
* OS adapter
* Talon adapter
* Arqon adapter

An adapter may expose one or more executors.

Example:

The VS Code adapter may expose:

* surface executor
* semantic executor
* integrated terminal executor
* diagnostic executor

So the adapter is the integration unit.
The executor is the action unit.

---

# 4. Registry object model

The registry needs four layers.

## Layer 1: Adapter record

Describes the integration boundary itself.

## Layer 2: Executor record

Describes each execution path exposed by the adapter.

## Layer 3: Capability record

Describes what a given executor can actually do.

## Layer 4: Health and performance record

Describes current availability, latency, and reliability.

This four-layer model is cleaner than one giant flat table.

---

# 5. Adapter Contract v0.1

Every adapter must declare at least the following top-level fields.

## Adapter identity

* adapter_id
* adapter_name
* adapter_version
* adapter_kind
* vendor_or_source
* active
* runtime_status

## Environment binding

* environment_type
* app_id
* platform_scope
* session_scope
* supported_modes

## Execution model

* executor_ids
* default_trust_tier
* security_sensitivity
* supports_bound_execution
* supports_focus_transfer
* supports_background_execution

## Operational metadata

* health_status
* reliability_score
* latency_profile
* observability_level
* audit_level

## Contract metadata

* contract_version
* registration_time
* heartbeat_time
* failure_count
* degradation_status

---

# 6. Required adapter fields, explained

## adapter_id

Stable canonical identifier.

Example:
vscode_adapter

## adapter_name

Human-readable name.

Example:
VS Code Adapter

## adapter_version

Version of the adapter implementation.

## adapter_kind

Examples:

* ide
* browser
* terminal
* os
* filesystem
* cognitive
* fallback_ui

## environment_type

Examples:

* local_desktop
* browser_runtime
* editor_runtime
* system_runtime
* arqon_runtime

## app_id

Examples:

* vscode
* chrome
* firefox
* alacritty
* linux_desktop

## platform_scope

Examples:

* linux
* macos
* windows
* cross_platform

## active

Boolean: currently registered and routable.

## runtime_status

Examples:

* healthy
* degraded
* unavailable
* initializing

---

# 7. Executor Contract v0.1

Each adapter exposes one or more executors, and each executor must declare:

## Executor identity

* executor_id
* executor_name
* executor_class
* adapter_id
* executor_version

## Capability declaration

* supported_surfaces
* supported_verbs
* supported_object_classes
* supported_command_families
* supported_execution_modes
* supported_postfixes
* supported_modifiers

## Behavior declaration

* supports_undo
* supports_partial_rollback
* supports_focus_restore
* supports_slot_completion
* supports_chooser_reentry
* supports_semantic_binding
* supports_visual_fallback

## Trust and safety

* trust_tier
* security_sensitivity
* allowed_in_secure_mode
* allowed_in_shared_room_mode
* requires_speaker_verification_for
* destructive_action_support

## Performance and reliability

* baseline_latency_ms
* p95_latency_ms
* success_rate
* recent_success_rate
* error_rate
* retry_policy
* degradation_policy

## Observability

* emits_structured_results
* emits_audit_events
* emits_step_trace
* emits_recovery_options

---

# 8. Supported surfaces

This must be explicit, not inferred.

Examples of supported_surfaces:

* editor
* integrated_terminal
* external_terminal
* browser
* browser_tab
* explorer
* sidebar
* panel
* problems
* output
* dialog
* command_palette
* search_field
* workspace

Important rule:

An executor must not claim broad surfaces vaguely.

Bad:
all_surfaces

Good:
editor, explorer, integrated_terminal, problems

This keeps routing honest.

---

# 9. Supported verbs

Executors must declare canonical verbs only.

Examples:

* focus
* open
* close
* show
* hide
* run
* build
* test
* select
* rename
* comment
* uncomment
* search
* find
* inspect
* click

Important rule:

Aliases are not stored here.
Aliases belong in the language registry, not the capability registry.

---

# 10. Supported object classes

Executors must declare which kinds of objects they can bind and operate on.

Examples:

* surface
* container
* location
* code_object
* execution_object
* ui_object
* session_object
* query_payload

Optionally they may declare narrower subtypes.

Examples:

* symbol
* function
* error
* result
* file
* process
* heading
* field

This helps the router avoid false matches.

---

# 11. Trust tiers

Trust tier must be an explicit field, not an inference.

I would freeze four tiers.

## Tier 1 — native semantic

Examples:

* LSP rename
* VS Code semantic selection
* filesystem API rename
* browser DOM click

Characteristics:

* highest semantic fidelity
* best undo potential
* strongest reliability
* preferred in secure mode

## Tier 2 — structured command / subprocess

Examples:

* task runner
* integrated terminal API
* shell sidecar
* bounded system command

Characteristics:

* strong operational power
* more side-effect risk
* still highly routable

## Tier 3 — accessibility / structured UI fallback

Examples:

* accessibility-tree click
* accessibility focus
* desktop semantic action through accessibility layer

Characteristics:

* medium trust
* weaker than native semantic
* still better than raw visual actuation

## Tier 4 — raw visual / actuation fallback

Examples:

* coordinate click
* OCR-guided click
* keystroke emulation
* Talon mouse fallback

Characteristics:

* lowest trust
* use sparingly
* avoid for risky operations in secure mode

---

# 12. Execution modes

Each executor must declare which execution modes it supports.

## focus_transfer

Visible active focus changes before the action.

## bound_execution

Action targets a surface or subsystem without visible focus change.

## background_execution

Action runs off-surface without foreground visibility.

This matters enormously.

Example:
VS Code integrated terminal executor may support:

* focus_transfer = yes
* bound_execution = yes
* background_execution = limited

Talon fallback executor may support:

* focus_transfer = yes
* bound_execution = no
* background_execution = no

---

# 13. Undo support

Undo cannot be a vague boolean alone.
It needs more shape.

Each executor should declare:

* supports_undo
* supports_partial_rollback
* supports_focus_restore
* supports_transaction_grouping
* undo_granularity

Possible undo_granularity values:

* none
* step
* command
* workflow
* semantic_object

Examples:

A semantic rename executor may support:
workflow + semantic_object

A raw visual click executor may support:
none

This is crucial for routing and workflow planning.

---

# 14. Security sensitivity

Executors must declare how dangerous they are and what restrictions apply.

Suggested fields:

* security_sensitivity
* handles_privileged_actions
* handles_destructive_actions
* allowed_in_secure_mode
* allowed_in_shared_room_mode
* requires_confirmation_for
* requires_speaker_verification_for

Possible security_sensitivity levels:

* low
* medium
* high
* privileged

Examples:

Filesystem rename executor:
medium

Shell sidecar with arbitrary command execution:
high

System admin executor:
privileged

This prevents the router from treating all routes as equal.

---

# 15. Latency metadata

Latency matters because Maestro is a VOS, not a batch engine.

Each executor should declare:

* baseline_latency_ms
* p50_latency_ms
* p95_latency_ms
* startup_cost_ms
* focus_switch_cost_ms

This lets the router choose between:

* slower but higher-fidelity path
* faster but still acceptable path

without guessing blindly.

---

# 16. Reliability metadata

Reliability must combine static and dynamic information.

Each executor should declare:

## Static fields

* declared_reliability_class
* known_failure_modes
* degradation_behavior

## Dynamic fields

* recent_success_rate
* rolling_error_rate
* consecutive_failures
* health_status
* degraded_since

This allows adaptive routing.

If the DOM executor has failed 3 times in current session, it should be downgraded.

---

# 17. Capability record format

Each executor should expose multiple capability records, one per action family or action shape.

A capability record should include:

* capability_id
* executor_id
* supported_verb
* supported_object_class
* supported_surfaces
* supported_modes
* supported_execution_modes
* trust_tier
* undo_support
* security_sensitivity
* expected_latency_ms
* expected_reliability
* routing_priority_hint

This makes routing much more precise than a single broad declaration.

---

# 18. Example capability record

Example: VS Code semantic rename

capability_id:
vscode.rename.symbol

executor_id:
vscode_semantic_executor

supported_verb:
rename

supported_object_class:
symbol

supported_surfaces:
editor

supported_modes:
coding

supported_execution_modes:
bound_execution, focus_transfer

trust_tier:
tier_1_native_semantic

undo_support:
semantic_object

security_sensitivity:
medium

expected_latency_ms:
40

expected_reliability:
high

routing_priority_hint:
very_high

That is implementation-tight enough for real routing.

---

# 19. Adapter registration lifecycle

Adapters should not just exist statically.
They must register and heartbeat.

Lifecycle:

## 1. register

Adapter announces itself and its executors.

## 2. validate

Registry checks contract completeness and compatibility.

## 3. activate

Adapter becomes routable.

## 4. heartbeat

Adapter refreshes availability and health.

## 5. degrade

Registry marks the adapter degraded if failures or missing heartbeat occur.

## 6. deactivate

Adapter becomes unavailable for routing.

This is important for real runtime robustness.

---

# 20. Contract validation rules

The registry should reject invalid adapters.

Examples of invalid declarations:

* claims `rename` support but no object classes
* claims `bound_execution` but no supported surfaces
* claims `undo` but no undo granularity
* claims `secure_mode_allowed` while trust tier is raw visual and security policy disallows that
* missing latency or reliability metadata

Bad contracts must fail registration, not limp into runtime.

---

# 21. Router use of the registry

The router should use the registry in this order:

## Step 1

Filter by active adapter availability.

## Step 2

Filter by verb support.

## Step 3

Filter by object-class support.

## Step 4

Filter by surface compatibility.

## Step 5

Filter by mode compatibility.

## Step 6

Filter by execution mode compatibility.

## Step 7

Filter by security policy.

## Step 8

Score by trust, reliability, latency, and preferences.

This is the exact bridge from parser output to execution planning.

---

# 22. Example adapters

## VS Code Adapter

Should declare support for:

Surfaces:

* editor
* explorer
* integrated_terminal
* problems
* sidebar
* panel

Verbs:

* focus
* open
* close
* show
* hide
* select
* rename
* comment
* uncomment
* search
* inspect
* run
* build
* test

Object classes:

* surface
* file
* symbol
* function
* error
* selection
* process
* logs

Trust tier:
mostly tier 1 and tier 2

Execution modes:

* focus_transfer
* bound_execution

Undo support:
strong

Security sensitivity:
medium

Latency:
low

Reliability:
high

---

## Browser Adapter

Surfaces:

* browser
* browser_tab
* page
* result
* heading
* field
* dialog

Verbs:

* focus
* open
* close
* show
* hide
* click
* search
* find
* next
* previous
* inspect

Object classes:

* surface
* ui_object
* result
* heading
* field
* query_payload

Trust tier:
tier 1 if DOM/API available, tier 3 if accessibility fallback

Execution modes:

* focus_transfer
* bound_execution

Undo support:
weak to medium depending action

Security sensitivity:
medium to high in payment/auth flows

Latency:
low to medium

Reliability:
high if DOM, lower if fallback

---

## Talon Adapter

Surfaces:

* whatever UI is visibly interactable

Verbs:

* focus
* click
* scroll
* open
* close
* maybe limited typing/selection fallback

Object classes:

* ui_object
* surface
* field
* visual_target

Trust tier:
tier 4 raw visual/actuation fallback, or tier 3 if accessibility-assisted

Execution modes:

* focus_transfer only

Undo support:
weak

Security sensitivity:
high for risky actions

Latency:
medium

Reliability:
context dependent

This is exactly why Talon is powerful but must not be treated as the same kind of route as a semantic LSP action.

---

# 23. Declarative adapter contract example

A concrete adapter declaration should look conceptually like this:

Adapter:
vscode_adapter

Fields:

* adapter_version: 0.1
* adapter_kind: ide
* app_id: vscode
* active: true
* runtime_status: healthy

Executors:

* vscode_surface_executor
* vscode_semantic_executor
* vscode_terminal_executor

Capabilities:

* focus + surface + editor/explorer/problems
* open + definition + editor
* rename + symbol + editor
* run + execution_payload + integrated_terminal
* show + logs + integrated_terminal/panel

Trust:

* semantic executor = tier 1
* terminal executor = tier 2

Execution modes:

* semantic executor = bound_execution, focus_transfer
* terminal executor = bound_execution, focus_transfer

Undo:

* semantic executor = strong
* terminal executor = limited

Security:

* secure mode allowed = yes
* privileged actions = no

Latency:

* semantic p95 = 60ms
* terminal p95 = 120ms

Reliability:

* semantic high
* terminal medium-high

That is the level of declaration the router can actually use.

---

# 24. Registry observability

The registry should expose query functions like:

* list active adapters
* list executors for verb X
* list capabilities for surface Y
* show preferred executor for command Z
* show degraded adapters
* show risky executors blocked in secure mode

This will be invaluable for:

* debugging
* audit
* user trust
* runtime introspection
* later spoken inspection commands like:

  * inspect executors here
  * what can rename symbol
  * why did you choose Talon

---

# 25. Contract versioning

This must be versioned from the start.

Fields:

* contract_version
* compatibility_level
* deprecation_status

Because the registry and adapters will evolve, and you do not want runtime chaos from mismatched contracts.

---

# 26. Laws to freeze

## Law 1

Adapters declare realization power, not language meaning.

## Law 2

Executors must explicitly declare supported surfaces, verbs, object classes, and execution modes.

## Law 3

Trust tier, undo support, security sensitivity, latency, and reliability are first-class routing metadata.

## Law 4

Semantic and native executors outrank raw visual fallbacks by default.

## Law 5

Invalid or incomplete contracts must fail registration.

## Law 6

Dynamic health and reliability must influence routing.

## Law 7

The capability registry is the runtime source of truth for what can actually be done right now.

## Law 8

Adapters may extend execution power without mutating the language.

---

# 27. First fields to implement immediately

If you want the smallest implementation-tight first version, I would freeze these fields first.

## Adapter minimum viable contract

* adapter_id
* adapter_kind
* app_id
* active
* runtime_status
* executor_ids
* contract_version

## Executor minimum viable contract

* executor_id
* executor_class
* adapter_id
* supported_surfaces
* supported_verbs
* supported_object_classes
* trust_tier
* supported_execution_modes
* supports_undo
* security_sensitivity
* baseline_latency_ms
* recent_success_rate

## Capability minimum viable record

* capability_id
* executor_id
* verb
* object_class
* surfaces
* modes
* trust_tier
* execution_modes
* expected_latency_ms
* expected_reliability

That is enough to build the first real router.

---

# 28. What this unlocks

With this contract frozen, Maestro can now do real implementation-tight routing because it will know:

* what adapters exist
* what executors they expose
* what each executor can actually do
* how trustworthy it is
* whether it supports undo
* whether it is safe enough in current mode
* whether it is healthy and fast enough right now

That is the exact missing layer between executor architecture and real runtime code.
