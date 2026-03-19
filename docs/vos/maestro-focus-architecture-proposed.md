# Maestro Focus Architecture v0.1

## Status

Draft v0.1

## Purpose

This document defines the focus architecture for Maestro as a real Voice Operating System.

It answers five core questions:

1. What does “focus” mean in Maestro?
2. What layers of focus must Maestro model?
3. How does Maestro move, verify, recover, and route focus?
4. What failures can occur?
5. What spoken grammar and runtime behavior should exist around focus?

This document treats focus as a first-class systems problem, not as a UI afterthought.

---

## Prime thesis

**Focus is the routing substrate of a Voice Operating System.**

In a traditional GUI, focus determines where keyboard intent lands.

In a VOS, focus determines where **spoken intent, keyboard intent, automation intent, and semantic intent** land.

Maestro therefore must not treat focus as only:

* tab order
* active element
* cursor position
* accessibility metadata

Maestro must treat focus as a **stacked, dynamic, verified control state** spanning the OS, application, surface, widget, selection, caret, and command target.

---

## Core definition

**Focus is the currently active intent landing zone.**

That means:

* where input goes
* where action applies
* where navigation operates
* what object speech refers to when the user says:

  * this
  * that
  * here
  * it
  * close it
  * rename this
  * paste here

---

## Architectural goals

Maestro focus architecture must be:

### 1. Deterministic by default

The system should know where intent will land before it acts.

### 2. Observable

Focus state must be inspectable by the runtime.

### 3. Addressable

The user must be able to name focus scopes in speech.

### 4. Verifiable

Maestro must confirm that focus movement actually succeeded.

### 5. Recoverable

When focus is lost, trapped, stolen, or drifted, Maestro must repair it.

### 6. Composable

Focus commands must compose with action commands.

### 7. Cross-surface

The architecture must work across:

* native desktop apps
* browsers
* Electron apps
* terminals
* dialogs
* embedded webviews
* hostile or weakly semantic surfaces

### 8. Safe under ambiguity

Maestro must not silently fire destructive commands into uncertain targets.

---

## Non-goals

This architecture does not assume:

* that all surfaces expose rich accessibility semantics
* that keyboard focus and semantic target are always identical
* that the browser model alone is sufficient
* that voice control can rely only on tab order
* that “active app” is enough to identify a target

---

# Focus model

## The Focus Stack

Maestro defines focus as an eight-layer stack.

### Layer 1 — Environment

The execution environment in which interaction occurs.

Examples:

* local desktop session
* remote desktop
* VM
* workspace / virtual desktop
* monitor topology
* active display region

Question answered:
**Which operating context is live?**

---

### Layer 2 — Application

The foreground or routed application context.

Examples:

* VS Code
* Chrome
* Windows Terminal
* Finder
* Explorer

Question answered:
**Which app owns active attention?**

---

### Layer 3 — Window

The active top-level or modal window within the application.

Examples:

* main editor window
* settings dialog
* save prompt
* authentication popup

Question answered:
**Which window is actually receiving interaction?**

---

### Layer 4 — Region

The active sub-area or pane inside the window.

Examples:

* editor
* terminal panel
* sidebar
* address bar
* tab strip
* page content
* devtools

Question answered:
**Which internal surface is the current operating zone?**

---

### Layer 5 — Control

The focused widget or interactive control.

Examples:

* button
* input
* tree
* list item container
* tab control
* command palette input
* menu item

Question answered:
**Which specific control owns keyboard or accessibility focus?**

---

### Layer 6 — Item

The active, highlighted, or selected object within the control.

Examples:

* selected file
* active tab
* highlighted suggestion
* chosen menu entry
* active tree node

Question answered:
**Which object inside the control is the current referent?**

---

### Layer 7 — Caret

The insertion or text-edit location.

Examples:

* editor cursor
* terminal prompt
* search field insertion point
* browser omnibox caret

Question answered:
**Where will text actually be inserted?**

---

### Layer 8 — Intent Target

The semantic object that the current command should apply to.

Examples:

* current editor tab
* active browser tab
* selected file
* focused button
* topmost dialog
* terminal session
* current symbol under cursor

Question answered:
**What does the user most likely mean right now?**

---

## Canonical principle

**The first seven layers describe state.
The eighth layer routes meaning.**

Without Layer 8, Maestro is just keyboard automation.

With Layer 8, Maestro becomes a VOS.

---

# Focus domains

Maestro recognizes multiple focus domains that may align or diverge.

## 1. Foreground focus

The OS-level active app/window.

## 2. Keyboard focus

The control receiving keyboard events.

## 3. Accessibility focus

The control exposed as active in accessibility inspection.

## 4. Selection focus

The currently selected object.

## 5. Caret focus

The text insertion location.

## 6. Semantic focus

The object implied by context for command routing.

## 7. Modal focus

The currently blocking transient context.

## 8. Pinned focus

A focus scope explicitly locked by the user for subsequent commands.

Example:
“in terminal, run tests”
may pin semantic focus to terminal while the app momentarily shows a progress overlay.

---

# Fundamental invariants

## Invariant 1

Every command must have an identifiable target scope.

## Invariant 2

Destructive commands require stronger target confidence than navigational commands.

## Invariant 3

Focus movement is not complete until verified.

## Invariant 4

Selection and focus must not be conflated.

## Invariant 5

Caret-bearing surfaces must expose caret presence as distinct state.

## Invariant 6

Modal surfaces override background assumptions.

## Invariant 7

If semantic target confidence falls below threshold, Maestro must:

* disambiguate
* reject
* or downgrade to a safe query

## Invariant 8

Focus recovery must preserve user orientation whenever possible.

---

# Focus state object

Maestro should maintain a live runtime focus object.

## Canonical focus state

* environment_id
* workspace_id
* monitor_id
* application_id
* application_name
* window_id
* window_title
* window_kind
* region_id
* region_name
* control_id
* control_role
* control_name
* item_id
* item_name
* selection_state
* caret_present
* caret_kind
* caret_location
* editable
* modal_state
* semantic_target_kind
* semantic_target_id
* semantic_target_name
* pinned_scope
* confidence
* timestamp
* source_of_truth
* stale_after_ms

---

## Source of truth classification

Each field should record how it was inferred.

Possible sources:

* OS window manager
* accessibility tree
* app integration
* DOM inspection
* keyboard heuristic
* screen vision inference
* command history
* user pin
* fallback heuristic

This matters because not all focus facts are equally trustworthy.

---

# Focus operations

Maestro focus behavior is organized into six major operations.

## 1. Observe

Read current focus stack.

Examples:

* what has focus
* where am I
* what app is active
* what pane is active
* is there a caret here

Output:
structured focus state plus confidence

---

## 2. Transfer

Move focus from one scope to another.

Examples:

* switch to Chrome
* focus terminal
* move to editor
* go to omnibox
* bring settings window front

Transfer may occur at any layer:

* app
* window
* region
* control
* item
* caret

---

## 3. Verify

Confirm the transfer succeeded.

Verification questions:

* did the app activate
* did the expected window rise
* did the expected pane become active
* did the caret appear
* did a modal steal focus
* did the target name match the intended scope

No transfer is complete until verification succeeds or fails.

---

## 4. Pin

Lock a scope for subsequent interpretation.

Examples:

* keep commands in Chrome
* stay in terminal
* in editor, do the next three actions
* pin focus to browser

Pinning affects semantic routing, not necessarily OS foreground focus.

---

## 5. Restore

Return to a previous focus state or prior scope.

Examples:

* go back
* return to previous app
* restore editor focus
* back to where I was typing

Restore should use focus history, not naive toggling.

---

## 6. Recover

Repair a broken or uncertain focus state.

Examples:

* refocus editor
* recover lost cursor
* escape this dialog
* repair focus
* re-anchor to terminal

Recovery is the anti-drift layer.

---

# Focus confidence

Maestro should score focus certainty.

## Confidence bands

### 1. High confidence

Maestro has direct evidence from:

* app integration
* accessibility tree
* deterministic UI state
* explicit user pin

Action allowed:
all normal commands, including destructive commands if preconditions hold

### 2. Medium confidence

Maestro has partial evidence:

* OS-level app and window known
* region likely inferred
* semantic target probable but not proven

Action allowed:
safe actions, navigation, clarification-free low-risk actions

Action restricted:
destructive or irreversible operations

### 3. Low confidence

Focus is stale, ambiguous, or weakly inferred.

Action allowed:
query, verify, focus move, disambiguation prompt, safe noop

Action restricted:
all destructive commands and any text insertion likely to land incorrectly

---

# Focus failure taxonomy

Maestro must explicitly model failure classes.

## F1 — Wrong environment

Command routed to wrong desktop/session/monitor context.

## F2 — Wrong application

Wrong app is active.

## F3 — Wrong window

Correct app, wrong window or modal.

## F4 — Wrong region

Correct window, wrong pane/surface.

## F5 — Wrong control

Correct pane, wrong widget focused.

## F6 — Wrong item

Correct widget, wrong item selected or active.

## F7 — Wrong caret

Text lands in wrong field or no field.

## F8 — Selection-focus split

Selected object and focused object diverge.

## F9 — Modal interception

Unexpected dialog, popup, or overlay captures focus.

## F10 — Invisible focus

System technically knows focus, user cannot perceive it.

## F11 — Lost focus

UI rerender, close event, or async update causes focus disappearance.

## F12 — Trapped focus

Cannot escape dialog, menu, widget, or loop.

## F13 — Stale focus model

Maestro’s stored state no longer matches reality.

## F14 — Ambiguous referent

“This,” “that,” or “close it” has multiple valid targets.

## F15 — Cross-surface mismatch

Semantic target exists but surface lacks reliable addressability.

---

# Focus lifecycle

## 1. Acquire

Initial observation of focus state.

## 2. Resolve

Infer semantic target from explicit speech, current context, and history.

## 3. Transfer

Move focus if needed.

## 4. Verify

Ensure focus now matches command requirements.

## 5. Execute

Run the action.

## 6. Confirm

Observe post-action focus and selection effects.

## 7. Repair

Recover if state drifted or action partially succeeded.

This should be the default runtime flow for all focus-sensitive commands.

---

# Command contract model

Each command should declare its focus contract.

## Contract fields

* required_application
* required_window_kind
* required_region
* required_control_role
* requires_selection
* requires_editable_target
* requires_caret
* allows_modal
* destructive
* fallback_strategy

---

## Example contracts

### Paste

* requires_editable_target = true
* requires_caret = true
* destructive = false

### Delete file

* requires_selection = true
* destructive = true
* fallback_strategy = disambiguate if selection unclear

### Close tab

* required_region = tabbed container or app-defined equivalent
* destructive = low
* fallback_strategy = infer current active tab if confidence high

### Rename symbol

* required_application = code editor
* required_region = editor
* requires_caret = true
* destructive = medium

This contract system is extremely important. It turns focus from vague context into enforceable runtime preconditions.

---

# Focus grammar

The spoken language for focus should be compact, deterministic, and composable.

## Category 1 — Query grammar

Commands that ask for focus state.

Examples:

* what has focus
* where am I
* what app is active
* what window is this
* what pane is active
* do I have a cursor here
* what is selected

---

## Category 2 — Transfer grammar

Commands that move focus.

Examples:

* switch to Chrome
* focus terminal
* go to editor
* move to address bar
* open command palette
* jump to sidebar

---

## Category 3 — Scoped action grammar

Commands that bind an action to a target scope.

Examples:

* in terminal, run tests
* in Chrome, open history
* in VS Code, search workspace
* in editor, paste below
* in sidebar, rename file

---

## Category 4 — Pin grammar

Commands that persist a scope.

Examples:

* keep focus in terminal
* stay in editor
* pin browser
* lock commands to VS Code
* route the next commands to Chrome

---

## Category 5 — Restore grammar

Commands that return to prior focus.

Examples:

* go back
* return to previous app
* restore editor focus
* back to where I was typing
* return to last caret

---

## Category 6 — Recovery grammar

Commands that repair broken focus.

Examples:

* recover focus
* refocus editor
* escape this
* dismiss popup
* get me back to terminal
* repair cursor

---

## Category 7 — Disambiguation grammar

Commands for uncertainty resolution.

Examples:

* the browser tab
* the left terminal
* the second window
* the search box
* the file tree
* not that one
* the active editor

---

# Focus resolution rules

Maestro should resolve targets in this order:

## Rule 1 — Explicit spoken target wins

Example:
“in Chrome, close tab”

## Rule 2 — Pinned scope wins over ambient scope

Example:
user pinned terminal, then says “clear”

## Rule 3 — Modal topmost scope overrides background scope

Example:
a save dialog appears

## Rule 4 — Current verified active scope wins over stale history

Example:
if the user manually clicked elsewhere

## Rule 5 — Recent focus history can resolve weak ellipsis

Example:
“go back there”

## Rule 6 — If ambiguity remains, do not guess destructively

Example:
“delete it” with multiple candidates

---

# Focus history

Maestro should maintain a short rolling history of focus transitions.

## History record fields

* previous_application
* previous_window
* previous_region
* previous_control
* previous_item
* previous_caret
* previous_semantic_target
* transition_reason
* timestamp

This enables:

* go back
* restore
* undo focus transfer
* resume after modal interruption

---

# Modal policy

Modals must be first-class citizens in Maestro.

## Modal rules

### 1. Detect

Maestro should detect dialogs, overlays, popups, menus, permission prompts, and transient interceptors.

### 2. Elevate

A true blocking modal overrides background command assumptions.

### 3. Name

The user should be able to refer to it directly.
Examples:

* accept dialog
* deny popup
* dismiss permission window

### 4. Exit cleanly

When the modal closes, focus should:

* restore prior scope if appropriate
* or remain in the newly created scope if action semantics require it

### 5. Refuse unsafe background action

If a modal blocks execution, Maestro must not pretend the background app is still actionable.

---

# Selection policy

Selection is separate from focus.

## Rules

### 1. Track selection independently

A selected tab, file, list item, or text range must not overwrite focused-control truth.

### 2. Permit commands against selection when contract allows

Example:
“delete selected file”

### 3. Refuse referent collapse unless context is strong

Example:
“rename this” should not assume selection if caret target is stronger

### 4. Selection history matters

After modal operations, Maestro may need to restore or re-identify prior selection.

---

# Caret policy

Caret is a first-class focus object.

## Caret state fields

* present
* editable
* read_only
* insertion_mode
* selection_range
* multiline
* shell_mode
* composition_active

## Caret rules

### 1. Text insertion commands require verified caret

### 2. Editable and read-only surfaces must be distinguished

### 3. Selection replacement must be modeled explicitly

### 4. Terminal prompts and editor buffers should not be conflated

### 5. Missing caret should trigger recovery or explicit move

---

# Surface capability model

Not all surfaces support the same level of focus precision.

## Capability tiers

### Tier 1 — Integrated semantic surface

Examples:

* deeply integrated editor
* instrumented terminal
* app plugin with explicit state

Capabilities:
high-confidence region/control/item/caret data

### Tier 2 — Accessibility-rich surface

Examples:

* native controls
* semantic web app
* accessible Electron app

Capabilities:
good control naming and focus observation

### Tier 3 — Keyboard-drivable surface

Examples:

* partially exposed UI
* weak semantics but reliable hotkeys

Capabilities:
transfer and navigation possible, semantic precision weaker

### Tier 4 — Vision-only or heuristic surface

Examples:

* custom canvas UI
* remote stream
* hostile app

Capabilities:
limited confidence, strong verification required

The runtime should use tier information when deciding whether to act automatically or disambiguate.

---

# Safety policy

## Safe commands under uncertainty

Allowed when confidence is medium or low:

* query focus
* switch app
* focus pane
* move to field
* open command palette
* scroll
* read state
* show options

## Unsafe commands under uncertainty

Blocked or disambiguated:

* delete
* close without clarity
* overwrite text
* send message
* submit form
* confirm destructive dialog
* paste into unknown field

---

# User-visible feedback policy

Maestro should not operate as a black box.

For focus-sensitive actions, Maestro should be able to present concise state feedback such as:

* Chrome active, page content focused
* VS Code active, terminal focused
* save dialog intercepted focus
* cursor not found in editor
* ambiguous target: 2 terminals available

This is not merely UX polish. It is part of the trust model.

---

# Example matrix

## Example 1 — App transfer

User says:
“switch to Chrome”

Expected behavior:

1. observe current app
2. transfer foreground to Chrome
3. verify Chrome window active
4. update history
5. confirm state if needed

Failure cases:

* Chrome minimized
* wrong Chrome profile window
* OS denied focus raise
* permission popup intercepted

---

## Example 2 — Region targeting

User says:
“focus terminal”

Expected behavior:

1. resolve active app or explicit scope
2. locate terminal region
3. transfer pane focus
4. verify terminal control active
5. if terminal absent, offer:

   * create terminal
   * switch app terminal
   * disambiguate target

---

## Example 3 — Scoped action

User says:
“in VS Code, run tests”

Expected behavior:

1. explicit app scope = VS Code
2. transfer if needed
3. resolve execution route:

   * terminal
   * test runner
   * command palette
4. verify route target
5. execute

This is not merely a focus move. It is focus + semantic action routing.

---

## Example 4 — Ambiguous referent

User says:
“close it”

Possible referents:

* current tab
* current dialog
* current panel
* selected file
* active window

Expected behavior:

1. inspect modal state first
2. inspect recent command context
3. inspect active region
4. if confidence low, disambiguate
5. never choose destructively by weak guess

---

## Example 5 — Lost caret recovery

User says:
“paste here”

Observed:

* VS Code active
* editor region visible
* no caret present
* search bar owns focus

Expected behavior:

1. detect contract failure
2. recover editor caret
3. verify editable target
4. paste
   or
5. ask if recovery fails

---

# Runtime responsibilities

Maestro runtime should have at least these modules.

## 1. Focus Observer

Collect live state from:

* OS
* accessibility APIs
* app integrations
* DOM integrations
* heuristic fallbacks

## 2. Focus Resolver

Turn raw state plus command text into a semantic target.

## 3. Focus Transfer Engine

Move focus across layers.

## 4. Focus Verifier

Check post-transfer truth.

## 5. Focus History Store

Track previous states and transitions.

## 6. Focus Recovery Engine

Repair drift and restore stable state.

## 7. Focus Safety Gate

Block unsafe action when confidence or contract is insufficient.

---

# Design laws

## Law 1

Never confuse active app with valid target.

## Law 2

Never confuse selection with focus.

## Law 3

Never confuse focus with caret.

## Law 4

Never complete a focus move without verification.

## Law 5

Never execute destructive action on low-confidence target inference.

## Law 6

Every scoped action is a focus problem before it is an action problem.

## Law 7

Focus recovery is a core runtime responsibility, not a fallback hack.

## Law 8

Voice disambiguation must be built into the language, not bolted on later.

---

# Minimal implementation roadmap

## Phase 1 — Core stack

Implement:

* active app
* active window
* active region
* caret presence
* focus history
* explicit transfer commands

## Phase 2 — Semantic routing

Implement:

* scoped actions
* pinned focus
* target confidence
* disambiguation grammar

## Phase 3 — Recovery and safety

Implement:

* modal handling
* restore behavior
* repair commands
* destructive safety gating

## Phase 4 — Cross-surface expansion

Implement:

* browser semantics
* Electron semantics
* terminal semantics
* weak-surface fallback model

---

# Open questions

These should be resolved in future versions.

## 1.

How should Maestro represent focus across multiple simultaneous candidate targets on multiple monitors?

## 2.

How should pinned scope interact with explicit user mouse clicks?

## 3.

What is the exact confidence threshold policy for destructive commands?

## 4.

How should Maestro handle focus on vision-only surfaces with no reliable accessibility hooks?

## 5.

Should semantic target be modeled as a graph rather than a flat field?

## 6.

How should command grammar distinguish:

* focus movement
* attention pinning
* semantic routing
* direct invocation

---

# Summary doctrine

**Maestro focus is the verified routing state for intent.**

It spans:

* environment
* application
* window
* region
* control
* item
* caret
* semantic target

Its duties are to:

* observe
* transfer
* verify
* pin
* restore
* recover
* route

A real VOS must master all of these.

Without focus architecture, voice control remains brittle.

With focus architecture, voice becomes an operating language.

---

Next, the strongest follow-on document would be:

**Maestro Focus Grammar v0.1**

That should formalize:

* spoken commands
* scoped syntax
* ambiguity rules
* pin/restore semantics
* and command contracts in a more language-like way.
