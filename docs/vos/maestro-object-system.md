# Maestro Object System v0.1

## Purpose

The object system defines:

* what kinds of things exist in the spoken language
* how those things are categorized
* which nouns are canonical
* which nouns are aliases
* which objects are global vs surface-specific
* how objects bind to visible state, focus, and context

The object system is what keeps Maestro from becoming vague.

Without it, you get:

* "open thing"
* "select item"
* "run this"

With it, you get:

* open terminal
* select line 42
* run cargo build
* open definition

---

# 1. First law of objects

## Every object must belong to a class

Maestro should never treat all nouns as one flat bag of words.

Every object should belong to an object class such as:

* surface
* container
* location
* artifact
* symbol
* execution target
* UI target
* state target
* memory/cognitive target

That gives the grammar structure.

---

# 2. The object hierarchy

I think Maestro needs **seven primary object classes**.

## A. Surfaces

Top-level places where focus and action occur.

Examples:

* editor
* terminal
* browser
* explorer
* problems
* sidebar
* panel
* window
* workspace

These are the most important objects in the VOS.

---

## B. Containers

Objects that hold other objects.

Examples:

* tab
* pane
* split
* file
* folder
* project
* workspace
* result list
* terminal session

Containers matter because many commands act on them:

* next tab
* split right
* open file
* close pane

---

## C. Locations

Places within a surface or container.

Examples:

* line
* column
* top
* bottom
* start
* end
* definition
* heading
* section
* result one
* page top

These usually pair with verbs like:

* go
* select
* open
* scroll

---

## D. Symbols and code objects

These are coding-language objects.

Examples:

* symbol
* function
* method
* class
* variable
* parameter
* type
* import
* definition
* reference
* error
* warning
* test
* module

These are critical for Maestro as a coding VOS.

---

## E. Execution objects

Things that can be run, built, tested, stopped, or inspected.

Examples:

* command
* process
* build
* tests
* task
* logs
* server
* branch
* commit
* pipeline

These pair with:

* run
* build
* test
* stop
* show
* inspect

---

## F. UI interaction objects

Things users can click, open, choose, or inspect in interactive surfaces.

Examples:

* button
* link
* result
* menu
* item
* tab
* dialog
* field
* checkbox
* dropdown
* heading

These are important for browser and desktop UI control.

---

## G. Session and control objects

Objects that govern Maestro itself.

Examples:

* mode
* focus
* voice
* microphone
* playback
* session
* history
* selection
* clipboard

These matter for:

* enter dictation
* return focus
* mute playback
* inspect session

---

# 3. The most important object class: surfaces

This is the backbone of the VOS.

## Canonical surface objects v0.1

I would start with this list:

* editor
* terminal
* browser
* explorer
* problems
* sidebar
* panel
* window
* workspace

And optionally:

* logs
* settings
* command palette
* integrated terminal
* external terminal

## Rules for surfaces

### Rule 1

Surfaces are focusable.

### Rule 2

Most surface-relative commands inherit meaning from the active surface.

### Rule 3

A surface may contain containers and locations.

### Rule 4

A surface may have aliases, but one canonical spoken name.

Example:

* `vs code`
* `code`
* `editor`

These may all map to canonical:
`editor`

Or:

* `integrated terminal`
* `internal terminal`

map to:
`integrated_terminal`

---

# 4. The second most important class: containers

Containers are what make commands composable.

## Canonical container objects v0.1

* tab
* pane
* split
* file
* folder
* project
* workspace
* session
* result list

## Why containers matter

Because:

* next tab
* close file
* move pane right
* open project
* search folder auth

all rely on container semantics.

## Container rules

### Rule 1

Containers may be nested.
Example:

* file in project
* tab in pane
* pane in window

### Rule 2

Containers may be active, visible, or hidden.

### Rule 3

Containers may be referred to by:

* position
* name
* currentness

Examples:

* current tab
* file auth service
* left pane
* first result

---

# 5. Locations

Locations give precision.

## Canonical location objects v0.1

* line
* column
* top
* bottom
* start
* end
* definition
* reference
* heading
* section
* first
* second
* third
* current
* next
* previous

These often combine with qualifiers.

Examples:

* go line 42
* select current line
* open first result
* scroll page top

## Rule

Locations should not usually stand alone.
They typically need:

* an object
* a container
* or a current surface

---

# 6. Code objects

This is where Maestro starts becoming truly powerful for programming.

## Canonical code objects v0.1

* line
* file
* symbol
* function
* method
* class
* variable
* parameter
* type
* import
* definition
* reference
* error
* warning
* test
* module
* selection

## Why these matter

They enable commands like:

* select function parse input
* rename symbol token map
* open definition
* next error
* test file
* compare modules

## Rule

Code objects should resolve through the strongest available source:

1. IDE/editor semantic API
2. language server / symbol index
3. visible structural text
4. visual fallback

That principle should be baked into the language model.

---

# 7. Execution objects

These are the nouns that pair with run/build/test/stop.

## Canonical execution objects v0.1

* command
* process
* build
* tests
* task
* logs
* server
* branch
* commit

## Examples

* run cargo build
* stop process
* show logs
* test file
* inspect server

## Rule

Execution objects should declare:

* target surface
* executor type
* reversibility
* visibility behavior

For example:

* `build` may run in terminal, integrated terminal, task runner, or MCP tool
* same object, different executor paths

That is important.

---

# 8. UI interaction objects

These are needed for browser and desktop UI control.

## Canonical UI objects v0.1

* button
* link
* result
* field
* checkbox
* menu
* item
* tab
* dialog
* heading
* page

## Examples

* click first result
* open link two
* focus search field
* close dialog
* next heading

## Rule

UI objects should prefer semantic targeting over visual targeting when available.

Meaning:

* accessibility tree
* DOM
* app semantic hooks
* then OCR/image fallback

That aligns perfectly with Maestro's actuation philosophy.

---

# 9. Session/control objects

These are essential for Maestro's own operation.

## Canonical session objects v0.1

* focus
* mode
* voice
* playback
* microphone
* session
* history
* clipboard
* selection

## Examples

* return focus
* enter coding mode
* mute playback
* inspect session
* clear history

These are important because the VOS must be able to operate on itself.

---

# 10. Object addressing forms

Objects need stable spoken reference patterns.

I think there are five main reference styles.

## A. Canonical noun

* terminal
* editor
* browser
* function
* line

## B. Noun + identifier

* line 42
* function parse input
* file main py
* branch feature auth

## C. Positional reference

* first result
* second tab
* left pane
* current file
* next error

## D. Qualified object

* terminal tab
* browser tab
* current selection
* integrated terminal
* external terminal

## E. Scoped object

* file in api
* logs in terminal
* result in browser
* tests in project

These reference forms should be built into the parser.

---

# 11. Object ambiguity rules

Objects are one of the biggest ambiguity sources.

Examples:

* terminal could mean:

  * external terminal app
  * integrated terminal
  * current terminal pane

* file could mean:

  * current file
  * named file
  * file in explorer
  * open file command target

So the object system needs rules.

## Rule 1

If an object has a dominant meaning in current mode/surface, use it.

Example:
In coding mode, "file" usually means current editor file.

## Rule 2

If two or more meanings are plausible and materially different, do not guess.

Show candidates.

## Rule 3

Allow persistent preference learning.

Example:
If user repeatedly means "integrated terminal" by "terminal" in VS Code context, store that.

## Rule 4

Privileged or risky commands require more explicit object resolution.

Example:

* delete file
  should not silently guess which file.

---

# 12. Object aliases

Objects need beginner-friendly speech aliases, but only one canonical internal form.

## Example alias collapse

### editor

aliases:

* code
* vs code
* editor

canonical:
`editor`

### terminal

aliases:

* shell
* terminal
* console

canonical:
`terminal`

### problems

aliases:

* errors
* problems panel

canonical:
`problems`

### function

aliases:

* function
* method

Maybe canonicalized separately by language context, maybe not.

Important:
**aliases map inward; internal objects stay stable**

---

# 13. Object legality matrix

This is where the language becomes rigorous.

Not every verb can act on every object.

Examples:

### Valid

* focus terminal
* open file
* close tab
* select line 42
* rename symbol foo
* run cargo build
* show logs

### Invalid or odd

* focus cargo build
* rename browser
* run line 42
* comment terminal
* scroll symbol foo

So Maestro eventually needs a **verb-object legality matrix**.

That matrix is one of the strongest things you can build, because it:

* reduces ambiguity
* enables ranking
* enables deterministic failure
* avoids nonsense interpretations

---

# 14. First object registry v0.1

If I were freezing the first official object inventory now, I would define these as core.

## Surfaces

* editor
* terminal
* browser
* explorer
* problems
* sidebar
* panel
* window
* workspace

## Containers

* tab
* pane
* split
* file
* folder
* project
* session

## Locations

* line
* column
* top
* bottom
* start
* end
* first
* second
* third
* current
* next
* previous

## Code objects

* symbol
* function
* method
* class
* variable
* parameter
* type
* import
* definition
* reference
* error
* warning
* test
* module
* selection

## Execution objects

* command
* process
* build
* tests
* task
* logs
* server
* branch
* commit

## UI objects

* button
* link
* result
* field
* checkbox
* menu
* item
* dialog
* heading
* page

## Session/control objects

* focus
* mode
* voice
* playback
* microphone
* session
* history
* clipboard
* selection

That is a very serious first inventory.

---

# 15. The most important design insight here

The object system means Maestro is not just parsing language.
It is parsing **an operating world model**.

That world model has:

* surfaces
* containers
* locations
* symbols
* processes
* UI targets
* control state

That is exactly what makes it a VOS language rather than a chatbot prompt layer.
