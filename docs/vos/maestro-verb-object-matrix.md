# Maestro Verb-Object Matrix v0.1

## Purpose

The verb system defines **what can be done**.
The object system defines **what exists**.

The **verb-object matrix** defines:

* which pairings are legal
* which pairings are preferred
* which pairings require qualification
* which pairings are only allowed in certain surfaces or modes
* which pairings are invalid and should never be guessed

This matrix is the heart of deterministic interpretation.

---

# 1. Compatibility classes

Every verb-object pair should fall into one of five classes.

## C1 — Canonical legal

Clear, direct, deterministic.

Examples:

* focus terminal
* run cargo build
* select line 42
* rename symbol token map

## C2 — Legal with qualification

Valid, but needs scope, identifier, or context.

Examples:

* open file `main.rs`
* run tests `in api`
* move tab `right`
* compare files `a and b`

## C3 — Legal alias, but normalize inward

User phrasing is accepted, but it maps to another canonical pair.

Examples:

* switch to browser → focus browser
* launch terminal → open terminal
* highlight line 42 → select line 42

## C4 — Cognitive-only

Do not execute on the deterministic lane.

Examples:

* fix build
* make this cleaner
* improve function
* handle logs

## C5 — Illegal

Impossible or nonsensical pairing.

Examples:

* focus cargo build
* rename browser
* scroll symbol
* comment terminal

---

# 2. The matrix laws

## Law 1

A legal verb-object pair must have a stable operational meaning.

## Law 2

If a pair is legal only in one context, that context must be explicit or strongly bound.

## Law 3

Illegal pairings should be eliminated before ranking.

## Law 4

Alias pairings normalize into canonical pairings before execution.

## Law 5

If multiple C1/C2 interpretations remain, show chooser UI rather than guess.

---

# 3. Object classes recap

For matrix purposes, I would use these classes:

* **surface**
* **container**
* **location**
* **code object**
* **execution object**
* **UI object**
* **session/control object**
* **query payload** for search/find

That last one matters because some verbs do not operate on nouns like `file` or `symbol`, but on a free payload like `auth token`.

---

# 4. Universal matrix by verb

## `focus`

### Canonical legal

* surface
* focusable container
* focusable UI region

Examples:

* focus terminal
* focus editor
* focus browser
* focus left pane
* focus problems

### Qualified legal

* focus tab 2
* focus terminal pane
* focus result list

### Alias

* go to browser → focus browser
* activate terminal → focus terminal

### Illegal

* focus build
* focus symbol foo
* focus cargo test

---

## `return`

### Canonical legal

* focus
* prior surface
* prior container

Examples:

* return focus
* return editor

### Qualified legal

* return browser
* return terminal

### Illegal

* return symbol
* return line 42

Rule: `return` is about restoring prior control context, not arbitrary navigation.

---

## `swap`

### Canonical legal

* focus
* pane
* tab
* window-side pair

Examples:

* swap focus
* swap panes
* swap tabs

### Qualified legal

* swap left and right pane

### Illegal

* swap build
* swap process

---

## `switch`

### Canonical legal

* peer container
* peer context
* workspace
* branch
* mode

Examples:

* switch tab
* switch workspace
* switch branch

### Alias

* switch to browser → focus browser

### Illegal

* switch symbol
* switch line 42

Rule: `switch` is for **peer-level context change**, not direct focus restoration.

---

## `open`

### Canonical legal

* surface
* container
* artifact
* code location
* UI object that reveals content

Examples:

* open terminal
* open file
* open settings
* open definition
* open first result

### Qualified legal

* open file main.rs
* open result 2
* open definition in editor

### Alias

* launch terminal → open terminal
* bring up settings → open settings

### Illegal

* open cargo build
* open comment
* open rename

---

## `close`

### Canonical legal

* surface
* container
* UI object
* active artifact

Examples:

* close tab
* close panel
* close dialog
* close window

### Qualified legal

* close file main.rs
* close browser tab 2

### Illegal

* close line 42
* close symbol foo
* close process

For processes, prefer `stop`.

---

## `show`

### Canonical legal

* surface
* panel
* UI region
* logs/results/stateful view

Examples:

* show logs
* show explorer
* show problems
* show sidebar

### Qualified legal

* show logs in terminal
* show results in browser

### Illegal

* show cargo build
* show rename

---

## `hide`

### Canonical legal

* visible surface
* panel
* UI region

Examples:

* hide sidebar
* hide panel
* hide explorer

### Illegal

* hide build
* hide line 42
* hide symbol

---

## `run`

### Canonical legal

* command
* task
* process target
* explicit shell payload

Examples:

* run cargo build
* run npm test
* run command
* run server

### Qualified legal

* run cargo build in terminal
* run tests in integrated terminal
* run task build-api

### Alias

* execute cargo build → run cargo build
* start server → run server

### Illegal

* run browser
* run tab
* run line 42

Rule: `run` is generic execution, not lifecycle activation of surfaces.

---

## `build`

### Canonical legal

* build target
* project
* module
* workspace
* file when build semantics exist

Examples:

* build project
* build api
* build workspace

### Qualified legal

* build current file
* build project in terminal

### Alias

* compile project → build project

### Illegal

* build browser
* build panel

Rule: `build` is higher-level than `run cargo build`.

---

## `test`

### Canonical legal

* test target
* file
* module
* project
* suite

Examples:

* test file
* test project
* test api
* test current module

### Qualified legal

* test file in terminal
* test module auth

### Illegal

* test browser
* test tab

---

## `stop`

### Reflex legal

* no object

Example:

* stop

### Canonical legal

* process
* build
* tests
* playback
* server
* command

Examples:

* stop process
* stop build
* stop tests
* stop playback

### Illegal

* stop line 42
* stop browser tab

Use `close` or `focus` there.

---

## `next`

### Canonical legal

* ordered container
* ordered location
* ordered code object
* ordered UI object

Examples:

* next tab
* next error
* next result
* next heading
* next match

### Illegal

* next browser
* next project

Unless there is a defined ordered set.

---

## `previous`

Same pattern as `next`.

Examples:

* previous tab
* previous error
* previous result
* previous heading

---

## `go`

### Canonical legal

* direct location
* destination
* indexed position

Examples:

* go line 42
* go top
* go bottom
* go definition

### Qualified legal

* go line 42 in file
* go result 3

### Alias

* jump to line 42 → go line 42

### Illegal

* go browser

That should map to `focus browser`.

---

## `move`

### Canonical legal

* movable container
* movable selection
* movable line/block/tab/pane

Examples:

* move tab right
* move line down
* move pane left
* move selection up

### Qualified legal

* move file to folder src
* move branch to archive

### Illegal

* move browser
* move definition

Unless there is a very explicit context.

---

## `scroll`

### Canonical legal

* viewport location
* page region
* surface viewport

Examples:

* scroll down
* scroll up
* scroll page top
* scroll bottom

### Qualified legal

* scroll browser down
* scroll editor up

### Illegal

* scroll symbol
* scroll build

---

## `select`

### Canonical legal

* location
* code object
* UI object
* range-bearing object
* container item

Examples:

* select line 42
* select function parse
* select symbol token map
* select first result
* select current file

### Qualified legal

* select lines 10 through 20
* select function in current file
* select result in browser

### Alias

* highlight line 42 → select line 42
* mark symbol foo → select symbol foo

### Illegal

* select cargo build
* select browser as execution target

---

## `copy`

### Canonical legal

* selection
* file
* symbol reference
* object with copy semantics

Examples:

* copy selection
* copy line
* copy file path

### Qualified legal

* copy symbol name
* copy current error

### Illegal

* copy browser
* copy terminal

---

## `paste`

### Canonical legal

* insertion target
* current selection target
* current surface insertion point

Examples:

* paste
* paste here
* paste into terminal

### Qualified legal

* paste into editor
* paste into search field

### Illegal

* paste browser
* paste tab

---

## `delete`

### Canonical legal

* selection
* file
* line
* symbol reference
* UI item with explicit deletion semantics

Examples:

* delete line
* delete file
* delete selection

### Qualified legal

* delete file main.rs
* delete symbol reference
* delete current tab

### Illegal

* delete browser
* delete build

Note: many delete actions are high-risk and may require confirmation.

---

## `rename`

### Canonical legal

* symbol
* file
* branch
* project artifact
* named UI item if supported

Examples:

* rename symbol token map
* rename file main.rs
* rename branch feature auth

### Qualified legal

* rename function parse input
* rename class build runner

### Illegal

* rename browser
* rename terminal
* rename line 42

---

## `comment`

### Canonical legal

* line
* block
* selection
* function
* code object with comment transform

Examples:

* comment line
* comment selection
* comment function

### Qualified legal

* comment lines 10 through 20

### Illegal

* comment browser
* comment process
* comment terminal

---

## `uncomment`

Same compatibility as `comment`.

---

## `search`

### Canonical legal

* query payload + scope

Examples:

* search files auth token
* search page authentication
* search project logger

### Qualified legal

* search files for auth token
* search logs for timeout
* search browser for docs

### Alias

* look for auth token in files → search files auth token

### Illegal

* search terminal as object with no query
* search symbol without query unless symbol search mode exists

Rule: `search` is broad and scoped.

---

## `find`

### Canonical legal

* query payload in current/local scope

Examples:

* find auth
* find next match
* find token

### Qualified legal

* find auth in current file
* find match in page

### Difference from `search`

* `find` = local
* `search` = broader scoped

---

## `inspect`

### Canonical legal

* stateful object
* session object
* symbol
* process
* logs
* selection
* focus state
* mode

Examples:

* inspect symbol
* inspect process
* inspect session
* inspect selection
* inspect focus

### Qualified legal

* inspect logs in terminal
* inspect current error

### Illegal

Very few, but `inspect` should still reject nonsense:

* inspect run

---

## `explain`

### Cognitive legal

* error
* symbol
* function
* file
* process output
* logs
* behavior/state

Examples:

* explain this error
* explain function parse
* explain build failure

### Deterministic use

Allowed only when the object is strongly bound and explanation route is defined.

### Illegal on operating lane

* explain browser
* explain tab

unless explicit cognitive route exists.

---

## `compare`

### Cognitive legal

* two files
* two symbols
* two modules
* two branches
* two outputs
* two selections

Examples:

* compare these files
* compare modules auth and api
* compare current branch and main

### Qualified legal

Usually needs two objects or a defined comparison set.

### Illegal

* compare browser
* compare terminal

without specific subtargets.

---

## `click`

I am including this now because it will matter.

### Canonical legal

* UI object
* visual target
* result
* button
* link
* menu item
* tab

Examples:

* click first result
* click save
* click search field
* click tab two

### Qualified legal

* click result in browser
* click button save in dialog

### Illegal

* click function
* click build
* click line 42

unless routed through a UI layer that presents them as clickable targets.

---

# 5. Query-bearing verbs

Two verbs are special because their "object" is often a **query payload**, not a noun.

## `search`

Shape:

* search `<scope>` `<query>`
* search `<scope>` for `<query>`

Examples:

* search files auth token
* search page websocket
* search logs timeout

## `find`

Shape:

* find `<query>`
* find `<query>` in `<local scope>`

Examples:

* find auth
* find error in file

This is important because it means the parser should allow:

* verb
* scope object
* free payload string

without pretending the payload is a normal object noun.

---

# 6. Preferred pairings

These are the "gold pairs" the language should privilege.

## Focus gold pairs

* focus + surface
* return + focus
* swap + pane/tab/focus

## Operating gold pairs

* open + surface/container/artifact
* close + surface/container/ui object
* run + execution object/payload
* build + project/module/workspace
* test + file/module/project

## Navigation gold pairs

* next/previous + tab/error/result/heading/match
* go + location
* move + pane/tab/line/selection
* scroll + viewport location

## Editing gold pairs

* select + line/function/symbol/result/selection
* rename + symbol/file/branch
* delete + line/file/selection/tab
* comment/uncomment + line/selection/block/function

## Discovery gold pairs

* search + scope + query
* find + local scope + query
* inspect + stateful object
* explain + error/function/output
* compare + pair set

These should get the strongest priors.

---

# 7. Red pairs

These should be rejected early.

* focus + execution object
* run + surface
* comment + surface
* rename + surface
* scroll + execution object
* move + abstract cognitive object
* build + UI object
* click + code object
* delete + surface root unless explicitly allowed
* test + tab

These red pairs are gold for deterministic parsing because they prune nonsense fast.

---

# 8. Qualification rules

Some pairings are legal only with extra information.

## Needs identifier

* open file
* rename symbol
* compare files
* delete file

## Needs scope

* run build in terminal
* search logs in workspace
* inspect process in terminal

## Needs explicit dual object

* compare file a and file b
* move file main.rs to src
* swap pane one and pane two

If missing, Maestro should:

* either use strong current context
* or show chooser
* or fail closed

---

# 9. Surface sensitivity

The same verb-object pair can shift legality by surface.

## Example: `open definition`

* in editor: C1 canonical
* in browser: maybe C4 cognitive or invalid
* in terminal: probably invalid unless tool integration exists

## Example: `click result`

* in browser: C1 canonical
* in editor: likely invalid
* in desktop app: C2/C3 depending on UI surface tooling

So the matrix must be filtered by:

* current mode
* active surface
* available executors
* focused app

---

# 10. Executor sensitivity

The language should know not just whether a pair is legal, but **how it would execute**.

Example:

## `run cargo build in terminal`

Could bind to:

* external terminal focus path
* integrated terminal API
* shell-sidecar process
* Talon keystroke path

The verb-object pair stays the same.
The executor policy decides the path.

That means:

## Important principle

The language layer should define **intent legality**, not hardcode one executor.

That keeps Maestro flexible.

---

# 11. Deterministic interpretation flow

This is the exact logic I would use.

## Step 1

Parse candidate verbs.

## Step 2

Parse candidate objects and object classes.

## Step 3

Apply synonym collapse.

## Step 4

Eliminate illegal red pairs.

## Step 5

Promote canonical gold pairs.

## Step 6

Check qualification requirements.

## Step 7

Filter by mode, surface, and executor availability.

## Step 8

If one strong candidate remains, execute.

## Step 9

If multiple strong candidates remain, show chooser UI.

## Step 10

If no deterministic candidate remains, fail closed or escalate to cognitive lane if policy allows.

That is the non-LLM interpretation engine.

---

# 12. First practical examples

## Example 1

"focus terminal"

* verb: focus
* object: terminal
* class: surface
* pair: focus + surface
* status: C1
* execute

## Example 2

"run cargo build"

* verb: run
* object payload: cargo build
* class: execution payload
* pair: run + execution payload
* status: C1
* surface may default to current terminal or require executor routing

## Example 3

"switch browser"

* verb candidate: switch
* object: browser
* class: surface
* switch + surface is not preferred
* alias collapse: focus browser
* execute as C3→C1

## Example 4

"rename browser"

* verb: rename
* object: browser
* class: surface
* pair: rename + surface
* status: C5 illegal
* reject or chooser only if there is a very explicit surface naming context

## Example 5

"search auth token"

* verb: search
* object: query payload
* scope missing
* if current surface is editor or file scope is dominant, maybe C2
* else chooser:

  * search files auth token
  * search page auth token
  * search project auth token

This is a perfect chooser case.

---

# 13. The compact matrix rulebook

If I compress this whole artifact into a few laws:

## Rule A

Every parsed noun must be classified before execution.

## Rule B

Every verb-object pair must be checked against legality.

## Rule C

Gold pairs outrank aliases and vague interpretations.

## Rule D

Red pairs are eliminated before ranking.

## Rule E

Scope, mode, and executor refine legality but do not redefine canonical meaning.

## Rule F

If more than one valid deterministic interpretation remains, show chooser UI.

That is the deterministic kernel.

---
