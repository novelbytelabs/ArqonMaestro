# Maestro Surface Model v0.1

## Purpose

The surface model defines:

* what counts as an operable surface
* what can receive focus
* how surfaces are nested
* how Maestro tracks current and previous focus
* how actions bind to surfaces
* how integrated vs external targets are represented

This is what makes "focus terminal → run cargo build → return focus" a lawful VOS pattern instead of an ad hoc macro.

---

# 1. First law of surfaces

## A surface is any addressable operating context that can receive or mediate action

A surface does **not** have to be a whole app window.

A surface may be:

* an app
* a pane
* a panel
* an integrated terminal
* a browser tab
* a dialog
* a command palette
* a focused field
* a result list

So Maestro should not think only in terms of "applications."
It should think in terms of **operating contexts**.

---

# 2. Surface classes

I think Maestro needs six surface classes.

## A. Root surfaces

Top-level environments that can anchor focus.

Examples:

* editor
* terminal
* browser
* file explorer
* settings
* command palette

These are the surfaces users think of first.

## B. Subsurfaces

Structured regions inside a root surface.

Examples:

* integrated terminal in VS Code
* explorer pane in editor
* problems panel
* left pane
* right pane
* sidebar
* editor tab group

These are essential because modern tools are multi-surface environments.

## C. Overlays

Temporary surfaces that interrupt or sit above others.

Examples:

* dialog
* modal
* context menu
* quick open
* command palette
* confirmation sheet

These often take temporary focus priority.

## D. Interaction surfaces

Smaller focused contexts inside another surface.

Examples:

* input field
* text selection
* search box
* terminal prompt
* form field

These matter because commands may target them directly.

## E. Virtual/bound surfaces

Targets that are not necessarily visibly focused, but are addressable through a bound integration.

Examples:

* VS Code integrated terminal via API
* build runner
* language server symbol graph
* MCP tool target
* shell sidecar

This class is extremely important.

It allows Maestro to distinguish:

* visible focus transfer
  from
* bound execution without visible focus change

## F. Background execution surfaces

Non-visual or non-focused execution contexts.

Examples:

* background shell task
* background build
* watch process
* daemon
* sidecar
* MCP executor

These are not focus targets in the user-visual sense, but they are action targets.

---

# 3. The surface hierarchy

Maestro needs a real nested model.

## Example: VS Code environment

Root surface:

* editor

Subsurfaces:

* file explorer
* editor pane
* problems panel
* integrated terminal
* sidebar

Interaction surfaces:

* search field
* rename popup
* terminal prompt

Overlay surfaces:

* command palette
* modal dialog

This means:

"focus terminal" inside VS Code may resolve to:

* integrated terminal subsurface

while in another context it may resolve to:

* external terminal root surface

That is why the surface model must support **canonical target + bound realization**.

---

# 4. Surface identity schema

Every surface should have a structured identity, not just a display name.

I would model each surface with fields like:

* `surface_id`
* `canonical_name`
* `surface_class`
* `parent_surface_id`
* `app_id`
* `focusable`
* `visible`
* `active`
* `accepts_text_input`
* `supports_bound_execution`
* `supports_visual_actuation`
* `supports_semantic_actuation`
* `security_level`

## Example

Integrated terminal in VS Code:

* surface_id: `vscode.integrated_terminal`
* canonical_name: `integrated_terminal`
* surface_class: `subsurface`
* parent_surface_id: `vscode.editor_root`
* app_id: `vscode`
* focusable: true
* visible: maybe true/false
* active: maybe true/false
* accepts_text_input: true
* supports_bound_execution: true
* supports_visual_actuation: true
* supports_semantic_actuation: maybe true via extension/API

This gives Maestro a real world model.

---

# 5. Canonical surface names v0.1

These should be the first stable spoken surface names.

## Root surfaces

* editor
* terminal
* browser
* explorer
* settings
* workspace

## Common subsurfaces

* integrated terminal
* external terminal
* sidebar
* panel
* explorer pane
* problems
* output
* left pane
* right pane
* tab group

## Common overlays

* dialog
* command palette
* quick open
* menu
* popup

## Common interaction surfaces

* field
* search field
* prompt
* selection
* input

The user may say aliases, but Maestro should normalize them inward.

---

# 6. Alias normalization for surfaces

This is essential.

## Example alias sets

### editor

aliases:

* VS Code
* code
* editor

canonical:
`editor`

### integrated terminal

aliases:

* built-in terminal
* internal terminal
* VS Code terminal

canonical:
`integrated_terminal`

### external terminal

aliases:

* shell
* terminal app
* outside terminal

canonical:
`external_terminal`

### browser

aliases:

* Chrome
* browser
* web

canonical:
`browser`

This is how you keep the spoken language friendly while the operating model stays stable.

---

# 7. Focus model

This is the heart of the surface system.

Maestro should track at least:

* `current_focus_surface`
* `previous_focus_surface`
* `focus_stack`
* `last_user_focus_surface`
* `last_commanded_focus_surface`
* `active_root_surface`
* `active_overlay_surface`
* `surface_visibility_map`

## Why these matter

Because:

* `return focus` needs previous focus
* `swap focus` needs at least two stable entries
* overlay dismissal may need to restore prior focus
* "build and return" needs a remembered pre-command focus

This is not optional. It is core VOS state.

---

# 8. Focus rules

## Rule 1

Only one surface is the **active focus target** at a time.

## Rule 2

An overlay surface can temporarily supersede a root/subsurface.

## Rule 3

A bound surface may receive action without visible focus change.

## Rule 4

Focus restoration should prefer:

1. most recent valid prior surface
2. prior root surface if subsurface is unavailable
3. user's last stable focus context

## Rule 5

If a focused surface disappears, Maestro should degrade gracefully to parent or prior surface.

Example:

* integrated terminal panel closes
* `return focus` should not fail catastrophically

---

# 9. Focus operations

These are the surface-level primitives.

## `focus <surface>`

Move active focus to target surface.

Examples:

* focus terminal
* focus editor
* focus integrated terminal
* focus problems

## `return focus`

Restore immediately prior valid focus target.

## `previous focus`

Restore prior focus target from stack.

May be the same as `return focus` in v0.1, though later they may diverge.

## `swap focus`

Exchange current and prior focus surfaces.

Useful for editor ↔ terminal loops.

## `focus <region>`

Examples:

* focus left pane
* focus sidebar
* focus panel

These require visible region maps.

---

# 10. The integrated vs external terminal distinction

This one is extremely important for Maestro.

I would formalize this immediately.

## `terminal` is not enough internally

It may mean:

* external terminal app
* integrated terminal inside editor
* current terminal subsurface
* terminal-like shell sidecar

So Maestro should internally distinguish:

* `integrated_terminal`
* `external_terminal`
* `terminal_session`
* `shell_executor`

Then allow user-facing alias collapse.

## Spoken behavior

If user says:

* focus terminal

Maestro may resolve based on context and preference.

Examples:

* in coding mode inside VS Code, `terminal` may default to `integrated_terminal`
* in external-terminal workflow, `terminal` may default to `external_terminal`

If ambiguous, show chooser.

That is exactly where your earlier point matters.

---

# 11. Surface binding vs focus transfer

This is one of the most important concepts in the whole VOS.

## Focus transfer

The visible active surface changes.

Example:

* focus terminal
* run cargo build

## Bound execution

The command targets a surface or executor without visible focus transfer.

Example:

* run cargo build in integrated terminal
* build project via task runner
* test file via editor API

These must be separate in the model.

So I would define:

### Surface execution modes

* `focus_required`
* `bound_allowed`
* `background_allowed`

## Example

### External terminal

Usually:

* focus_required = true
* bound_allowed = maybe false
* background_allowed = maybe false

### Integrated terminal

Usually:

* focus_required = maybe false
* bound_allowed = true
* background_allowed = maybe limited

### Shell sidecar

Usually:

* focus_required = false
* bound_allowed = true
* background_allowed = true

This is powerful because it prevents the language from hardcoding one UX assumption.

---

# 12. Surface visibility state

A surface is not just active/inactive.
It can also be:

* available
* hidden
* visible
* focused
* blocked
* destroyed

Examples:

* integrated terminal exists but hidden
* problems panel visible but not focused
* dialog visible and focus-blocking
* external terminal exists but minimized
* browser tab exists but not active

The VOS needs this because:

* `show logs` is different from `focus logs`
* `open terminal` is different from `focus terminal`
* `close dialog` should only work if dialog exists

---

# 13. Surface capability model

Every surface should advertise what can be done to it.

Fields might include:

* `can_focus`
* `can_show`
* `can_hide`
* `can_open`
* `can_close`
* `can_accept_text`
* `can_run_commands`
* `can_select_objects`
* `can_scroll`
* `can_click`
* `can_bind_execution`
* `can_restore_focus`

This is how the parser and executor stay lawful.

Example:

* `rename browser` should be rejected because browser surface does not advertise rename semantics
* `run cargo build in terminal` works only if terminal-related surface/executor supports command execution

---

# 14. Surface preference model

Users will often have preferred target surfaces.

Example:

* "terminal" means integrated terminal for one user
* "terminal" means kitty/alacritty external terminal for another

So Maestro should support preference bindings like:

* default terminal surface
* default browser surface
* default editor surface
* preferred logs surface
* preferred search-result opening behavior

This is how you reduce ambiguity without an LLM.

---

# 15. Surface resolution rules

When user references a surface, Maestro should resolve in this order:

## Step 1

Exact current-mode canonical match

## Step 2

Preferred surface binding for that noun

## Step 3

Visible active subsurface match

## Step 4

Visible root surface match

## Step 5

Known but hidden surface candidate

## Step 6

Chooser UI

This is deterministic and sensible.

---

# 16. The first golden surface workflows

These should become official reference patterns.

## Pattern A: explicit focus workflow

* focus terminal
* run cargo build
* return focus

## Pattern B: qualified bound workflow

* run cargo build in integrated terminal

## Pattern C: overlay workflow

* open command palette
* search settings
* close palette
* return focus

## Pattern D: cross-surface workflow

* focus browser
* open first result
* return focus

These are the real lived grammar patterns.

---

# 17. Surface ambiguity examples

## Example 1

"focus terminal"

Possible resolutions:

* integrated terminal
* external terminal
* current terminal pane

Resolution:

* use context/preferences
* otherwise chooser

## Example 2

"show logs"

Possible resolutions:

* output panel
* terminal logs
* browser devtools logs
* app log viewer

This should almost certainly go through:

* current surface context
* executor availability
* chooser if needed

## Example 3

"return focus"

Possible resolutions are not semantic but stateful:

* previous subsurface
* previous root surface
* previous app

This must use the focus stack.

---

# 18. Surface security implications

Some surfaces are more sensitive than others.

Examples:

* shell/terminal
* password dialogs
* admin tools
* browser checkout/payment flow
* destructive file managers

So surfaces may need:

* trust level
* confirmation policy
* speaker verification sensitivity
* secure-mode restrictions

That means the surface model should support security metadata.

---

# 19. First official surface principles

I would freeze these now.

## Principle 1

Surfaces are first-class objects in the language.

## Principle 2

Focus is a real state machine, not a cosmetic effect.

## Principle 3

Bound execution and visible focus transfer are distinct.

## Principle 4

Integrated and external terminal targets are distinct internal surfaces.

## Principle 5

Surface aliases normalize inward to canonical surface identities.

## Principle 6

Surface resolution is deterministic and preference-aware.

## Principle 7

Surface capability and security metadata constrain legal actions.

These are excellent VOS laws.

---
