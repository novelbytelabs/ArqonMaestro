# Maestro Verb System v0.1

## Purpose

The verb system defines:

* which actions are fundamental
* what each action **canonically means**
* which spoken variants collapse into the same meaning
* which verbs are too vague to trust
* which verbs work across all surfaces vs only inside certain domains

The goal is not to have lots of verbs.
The goal is to have a **small lawful set** that composes well.

---

# 1. First law of verbs

## One canonical meaning per verb

Each canonical verb should have **one primary operational meaning**.

That means:

* `focus` means move active control to a surface
* `open` means reveal or activate a target
* `close` means dismiss or terminate a visible target
* `run` means execute a command or process
* `select` means create an active selection

This matters because a VOS language dies if verbs are overloaded carelessly.

---

# 2. Verb classes

I think Maestro needs four verb classes.

## A. Universal operating verbs

These are the backbone of the VOS. They should work across many surfaces.

## B. Focus/navigation verbs

These move attention and position.

## C. Domain verbs

These belong to coding, browser, terminal, etc.

## D. Cognitive verbs

These trigger reasoning/planning/explanation, not direct low-level operation.

---

# 3. Universal operating verbs v0.1

These should be the first-class canonical verbs.

## Focus / surface verbs

* `focus`
* `return`
* `swap`
* `switch`

## Visibility / lifecycle verbs

* `open`
* `close`
* `show`
* `hide`

## Execution verbs

* `run`
* `build`
* `test`
* `stop`

## Navigation verbs

* `next`
* `previous`
* `go`
* `move`
* `scroll`

## Selection / editing verbs

* `select`
* `copy`
* `paste`
* `delete`
* `rename`
* `comment`
* `uncomment`

## Discovery / inspection verbs

* `search`
* `find`
* `explain`
* `compare`
* `inspect`

That is already enough to build a huge amount of language.

---

# 4. Canonical meanings

This is the most important part.

## `focus`

Move active control to a named surface, region, or app.

Examples:

* focus terminal
* focus editor
* focus browser
* focus left pane

Synonym collapse:

* bring up
* activate
* go to
* jump to

Canonical meaning stays:
`focus`

---

## `return`

Restore prior focus or prior control context.

Examples:

* return focus
* return editor

This should not mean "go back in browser history."
That would be a different semantic action.

---

## `swap`

Exchange current focus with a remembered counterpart.

Examples:

* swap focus
* swap panes

---

## `switch`

Move between peers inside a class.

Examples:

* switch tab
* switch workspace
* switch branch

Rule:
`switch` is for **peer-level context change**, not raw focus restoration.

---

## `open`

Reveal, activate, or instantiate a target.

Examples:

* open terminal
* open file
* open settings
* open definition

Rule:
`open` should not mean "focus existing target if already open" vs "create new target" unless object rules specify that behavior.

---

## `close`

Dismiss, terminate, or remove a visible/active target.

Examples:

* close tab
* close window
* close panel

---

## `show`

Make a target visible without implying strong active control.

Examples:

* show logs
* show explorer
* show problems

Difference from `open`:

* `show` emphasizes visibility
* `open` emphasizes active reveal/activation

---

## `hide`

Remove target from visible view without necessarily destroying it.

Examples:

* hide sidebar
* hide panel

---

## `run`

Execute a command, task, or process.

Examples:

* run cargo build
* run tests
* run command

Rule:
`run` is the generic execution verb.

---

## `build`

Compile or assemble the current project or target.

Examples:

* build project
* build api

Rule:
`build` is not just a synonym for `run cargo build`; it is a higher-level intent.

---

## `test`

Execute a test scope.

Examples:

* test file
* test project
* test api

Rule:
`test` is a first-class verb because testing is common enough to deserve direct semantics.

---

## `stop`

Terminate current process, playback, or active action.

Examples:

* stop process
* stop build

Reflex version:

* `stop` alone = top-priority reflex

Contextual version:

* `stop build` = target-specific stop

---

## `next`

Move to the next item in an ordered sequence.

Examples:

* next tab
* next error
* next result
* next line

---

## `previous`

Move to the prior item in an ordered sequence.

Examples:

* previous tab
* previous error

---

## `go`

Navigate directly to a location or index.

Examples:

* go line 42
* go top
* go bottom

Rule:
`go` should be for **direct destination navigation**.

---

## `move`

Relocate something.

Examples:

* move tab right
* move line down
* move pane left

Rule:
`move` implies displacement, not selection.

---

## `scroll`

Change viewport position continuously or incrementally.

Examples:

* scroll down
* scroll up
* scroll page

---

## `select`

Create or adjust a selection.

Examples:

* select line 42
* select function parse
* select next word

This is one of the most important verbs in the system.

---

## `copy`

Copy current or targeted selection.

## `paste`

Paste clipboard into current insertion target.

## `delete`

Remove targeted content or target object.

## `rename`

Change symbolic or named identity.

## `comment`

Apply comment transform.

## `uncomment`

Remove comment transform.

These all have stable editing semantics.

---

## `search`

Look for a target across a scope.

Examples:

* search files auth token
* search page authentication
* search project logger

Rule:
`search` implies broader scoped retrieval.

---

## `find`

Locate a target within the current local surface.

Examples:

* find auth
* find next match

Difference:

* `find` = local
* `search` = broader scope

This is useful enough to preserve.

---

## `explain`

Request interpretation or explanation.

Examples:

* explain this error
* explain this function

This belongs to the cognitive bridge layer.

---

## `compare`

Request structured comparison.

Examples:

* compare these files
* compare these modules

---

## `inspect`

Request details or state exposure.

Examples:

* inspect selection
* inspect process
* inspect symbol

This can bridge deterministic and cognitive lanes depending on target.

---

# 5. The verbs that should be rejected or downgraded

Some verbs are too vague for deterministic VOS use.

I would treat these as **non-canonical** and either:

* map them to something clearer
* or reject them in the operating lane

## Vague verbs

* do
* make
* handle
* fix
* use
* work
* put
* get
* take

Why?
Because these do not carry stable operating semantics.

Example:

* "do build"
* "make it work"
* "handle that"
* "get this"

These are bad VOS verbs unless routed into the cognitive lane.

So the rule is:

## Deterministic lane forbids vague generic verbs

If user says:

* fix this
* handle that
* make it better

that should go cognitive, not operating.

---

# 6. Synonym collapse rules

This is where beginner friendliness lives.

Users do not need to memorize the exact canonical verb immediately.
They can say natural variants, but Maestro should normalize them.

## Example synonym maps

### `focus`

Maps from:

* activate
* jump to
* go to
* switch to
* bring up

### `open`

Maps from:

* launch
* bring up
* show me
* load

### `close`

Maps from:

* dismiss
* shut
* exit

### `run`

Maps from:

* execute
* launch
* start

### `search`

Maps from:

* look for
* search for
* locate

### `select`

Maps from:

* highlight
* mark

### `delete`

Maps from:

* remove
* erase

### `rename`

Maps from:

* change name of

### `comment`

Maps from:

* comment out

### `uncomment`

Maps from:

* remove comment from

Important rule:

## Synonyms map inward; canonical verbs do not multiply outward

Internally, Maestro should store the canonical verb only.

---

# 7. Surface compatibility

Not every verb should be legal on every surface.

## Cross-surface verbs

These are broadly legal:

* focus
* open
* close
* show
* hide
* next
* previous
* search

## Editor-heavy verbs

* select
* rename
* comment
* uncomment
* open definition

## Terminal-heavy verbs

* run
* stop
* clear
* show logs

## Browser-heavy verbs

* click
* open result
* next heading

## Cognitive bridge verbs

* explain
* compare
* inspect

This means verb legality should be checked against:

* current mode
* current surface
* target surface
* available executor

---

# 8. Should `click` be a core verb?

Yes, but I would keep it domain-scoped, not universal-core.

## `click`

Canonical meaning:
Activate a clickable UI target on a visual/interactive surface.

Examples:

* click first result
* click save
* click close

Why not universal-core?
Because in many surfaces:

* browser semantic activation
* Talon mouse actuation
* UI.Vision visual fallback
* API/native action

all may exist.

So `click` is useful, but it belongs more to **UI interaction domain grammar** than the deepest OS core.

---

# 9. Postfix compatibility

Not every verb should accept every postfix.

We need rules.

## Good postfixes

* `and return`
* `quietly`
* `safely`
* `here`
* `now`

### Compatible examples

* run cargo build and return
* search files here
* refactor safely
* show logs quietly

### Incompatible examples

* undo quietly
* focus editor safely
* next tab and return

So postfix support should be declared per verb family.

---

# 10. Verb arity

Another important design point:

Some verbs need:

* one object
* two objects
* an optional scope
* or no object

## Zero-object verbs

* stop
* cancel
* undo
* redo
* mute
* pause

## One-object verbs

* focus terminal
* open browser
* close tab
* build project

## Object + qualifier verbs

* select line 42
* move tab right
* go line 10

## Object + scope verbs

* run cargo build in terminal
* search auth token in files

This should be part of the grammar metadata.

---

# 11. Macro-bearing verbs

Some verbs should be allowed to compile into multi-step actions more naturally than others.

Best macro-bearing verbs:

* run
* build
* test
* open
* search
* compare
* explain

Examples:

* build and return
* search docs and open first result
* test file and show logs

Poor macro-bearing verbs:

* stop
* undo
* mute

Those should stay simple.

---

# 12. First official canonical verb list

If I were freezing v0.1 right now, I would define these as the primary canonical verbs:

## Reflex / control

* stop
* cancel
* undo
* redo
* mute
* unmute
* pause
* resume

## Focus / session

* focus
* return
* swap
* switch

## Visibility / lifecycle

* open
* close
* show
* hide

## Navigation

* next
* previous
* go
* move
* scroll

## Execution

* run
* build
* test

## Editing / manipulation

* select
* copy
* paste
* delete
* rename
* comment
* uncomment

## Discovery / cognition bridge

* search
* find
* inspect
* explain
* compare

That is a very strong compact system.

---

# 13. My recommendation on style

I would make the language style rule:

## Maestro favors strong verbs over helper words

Good:

* focus terminal
* run cargo build
* search files auth token

Bad:

* can you maybe go ahead and open the terminal
* please do a run of cargo build

Natural phrasing can still map in, but the **visible canonical language** should stay crisp.

---

# 14. The most important result of this discussion

We now have:

* a canonical verb set
* vague verbs to forbid
* synonym collapse rules
* domain boundaries
* postfix compatibility logic
* arity logic

That is enough to start defining real command families.
