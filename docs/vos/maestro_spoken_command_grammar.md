# Maestro Spoken Command Grammar v0.1

## 1. The parse order

Every utterance should be tested in this order:

1. **Reflex**
2. **Mode**
3. **Focus**
4. **Operating**
5. **Domain**
6. **Cognitive**
7. **Dictation**

This matters because:

* "stop" must beat everything
* "focus terminal" must not get misread as a generic action
* "run cargo build" should stay deterministic before falling into cognitive interpretation

## 2. Canonical command schema

Every non-dictation utterance should normalize into something like:

* `lane`
* `verb`
* `object`
* `qualifiers`
* `scope`
* `postfix`
* `mode`
* `surface`
* `confidence`
* `reversible`
* `confirmation_tier`

Example:

"focus terminal"

becomes:

* lane: `focus`
* verb: `focus`
* object: `terminal`
* qualifiers: none
* scope: current session
* postfix: none
* mode: command
* surface: desktop
* confidence: high
* reversible: true

Example:

"run cargo build in terminal and return"

becomes:

* lane: `operating`
* verb: `run`
* object: `cargo build`
* qualifiers: none
* scope: `terminal`
* postfix: `return_focus`
* mode: coding
* surface: terminal
* confidence: medium-high
* reversible: partially
* confirmation_tier: none

## 3. The six lane grammars

## A. Reflex grammar

### Shape

* single token
* or fixed two-token phrase

### Canonical set

* stop
* cancel
* undo
* redo
* mute
* unmute
* pause
* resume
* sleep
* wake
* yes
* no

### Rules

* globally available
* never overloaded
* must interrupt playback, cognition, and pending low-risk execution
* "stop" and "cancel" are not synonyms internally:

  * `stop` = halt current operation/playback/process
  * `cancel` = abort pending action/workflow/request

## B. Mode grammar

### Shape

* `enter <mode>`
* `leave <mode>`
* `switch to <mode>`
* `enable <mode>`
* `disable <mode>`

### Canonical modes

* command
* coding
* browser
* terminal
* dictation
* conversational
* secure
* quiet

### Examples

* enter coding mode
* switch to dictation
* enable secure mode
* leave dictation

## C. Focus grammar

### Shape

* `focus <surface>`
* `return focus`
* `previous focus`
* `swap focus`
* `focus <region>`
* `focus <surface> <region>`

### Canonical surfaces

* terminal
* editor
* browser
* explorer
* problems
* sidebar
* left pane
* right pane
* panel
* window
* tab

### Examples

* focus terminal
* focus editor
* focus browser
* focus explorer
* return focus
* previous focus
* swap focus
* focus right pane

## D. Operating grammar

### Shape

* `verb object`
* `verb object qualifier`
* `verb qualifier object`
* `verb object in scope`
* `verb object and postfix`

### Core verbs

* open
* close
* switch
* next
* previous
* select
* move
* run
* build
* test
* search
* show
* hide
* clear
* rename
* delete
* copy
* paste
* comment
* uncomment
* split

### Examples

* open terminal
* close panel
* next tab
* previous error
* select line 42
* search files auth token
* clear terminal
* split right
* rename symbol foo
* build project
* test api

## E. Domain grammar

This is the same syntax, but with domain-specific objects and captures.

### Coding examples

* select function parse input
* rename symbol token map
* next error
* open definition
* extract method
* comment line
* test current file

### Browser examples

* open first result
* click second link
* search page authentication
* next heading
* previous tab

### Terminal examples

* run cargo build
* stop process
* show logs
* clear terminal
* run tests

## F. Cognitive grammar

### Shape

More natural, but still routed through intent classes.

### Examples

* explain this error
* compare these modules
* prepare my workspace
* summarize today's changes
* refactor this safely

### Rule

Cognitive grammar is freer, but should still try to emit structure:

* `explain.error`
* `compare.files`
* `prepare.workspace`
* `summarize.session`
* `refactor.safe`

## 4. The five structural command forms

These are the backbone.

## Form 1: Pure focus

`focus <surface>`

Examples:

* focus terminal
* focus editor
* focus browser

## Form 2: Surface-relative action

`<verb> <object>`

Examples:

* run cargo build
* next tab
* open definition

Interpretation depends on active focus.

## Form 3: Surface-qualified action

`<verb> <object> in <surface>`

Examples:

* run cargo build in terminal
* open file in editor
* search docs in browser

This is powerful because it decouples action from current focus when a bound path exists.

## Form 4: Action with restoration postfix

`<verb> <object> and return`

Examples:

* run cargo build and return
* open docs and return

This should compile to:

1. remember focus
2. move if needed
3. execute
4. restore

## Form 5: Macro chain

`<command>, <command>, <command>`

Examples:

* focus terminal, run cargo build, return focus
* focus browser, search page authentication, return focus

This is explicit chaining.

## 5. Focus model

Focus needs to become a real state machine.

## Required focus state

Maestro should track:

* current focus
* previous focus
* focus stack
* visible surfaces
* active app
* active pane/region
* whether focus was user-set or command-set

## Focus primitives

* `focus X`
* `return focus`
* `previous focus`
* `swap focus`
* `focus left`
* `focus right`
* `focus panel`
* `focus editor`

## Recommended rule

If a command needs a surface that is not active, Maestro should choose one of three strategies:

### Strategy A: require explicit focus

Example:

* focus terminal
* run cargo build

### Strategy B: permit qualified execution

Example:

* run cargo build in terminal

### Strategy C: use bound execution

Example:

* run build in integrated terminal

The choice depends on executor capability and policy.

## 6. Ambiguity policy v0.1

This is critical.

## Disallowed by default on the deterministic lane

* it
* this
* that
* there
* here

unless context is strongly bound.

### Unsafe

* open it
* run that
* click this

### Conditionally allowed

* next tab
* previous error
* current file

because these rely on stable structural referents.

## Clarification pattern

When ambiguity exists, Maestro should ask the shortest useful question.

Example:

* user: "open it"
* maestro: "Which target?"

not a paragraph.

## 7. Compression model

We need a lawful shortening path.

## Level 1: Natural

* please open terminal
* could you run cargo build

## Level 2: Standard

* focus terminal
* run cargo build
* return focus

## Level 3: Compressed

* terminal
* build
* return

## Level 4: Expert alias

* term build return

But:

* compressed forms must map to stable canonical forms
* expert aliases should be explicitly declared, not guessed chaotically

## 8. First 50 canonical commands

Here is a very strong first set.

## Reflex

1. stop
2. cancel
3. undo
4. redo
5. mute
6. unmute
7. pause
8. resume
9. sleep
10. wake

## Mode

11. enter coding mode
12. enter dictation
13. enter browser mode
14. enter terminal mode
15. enter secure mode

## Focus

16. focus terminal
17. focus editor
18. focus browser
19. focus explorer
20. focus problems
21. focus left pane
22. focus right pane
23. return focus
24. previous focus
25. swap focus

## Operating

26. open terminal
27. close panel
28. next tab
29. previous tab
30. split right
31. split down
32. search files
33. search page
34. show logs
35. clear terminal

## Coding

36. select line
37. select function
38. rename symbol
39. open definition
40. next error
41. previous error
42. comment line
43. uncomment line
44. test file
45. build project

## Terminal

46. run cargo build
47. run cargo test
48. stop process

## Cognitive bridge

49. explain this error
50. compare these files

That is already a real language skeleton.

## 9. Chaining rules

Maestro should support explicit chaining, but with limits.

## Safe chain separator

* pause-separated speech
* or spoken "then"

Examples:

* focus terminal then run cargo build
* focus browser then search page authentication

## Rule

Short deterministic chains are allowed when:

* each step is individually valid
* the chain is low-risk
* rollback state is manageable

Long or risky chains should compile into a reviewed macro/workflow.

## 10. Postfix system

Postfixes are powerful because they let the language stay compact.

## First postfixes

* and return
* quietly
* safely
* here
* now

Examples:

* run cargo build and return
* search files auth token here
* refactor safely

These should not explode in number early. Keep them tight.

## 11. Surface dictionary v0.1

We need stable spoken nouns.

## Canonical surfaces

* editor
* terminal
* browser
* explorer
* problems
* panel
* sidebar
* window
* tab
* workspace

## Canonical editor objects

* file
* line
* symbol
* function
* error
* selection
* definition

## Canonical terminal objects

* process
* logs
* command
* build
* tests

## Canonical browser objects

* page
* result
* link
* heading
* tab

## 12. The first golden workflow patterns

These should become design exemplars.

## Pattern A: Focus → act → restore

* focus terminal
* run cargo build
* return focus

## Pattern B: Surface-relative work

* next error
* open definition
* return focus

## Pattern C: Qualified execution

* run cargo build in terminal
* open docs in browser

## Pattern D: Cognitive escalation

* explain this error
* compare these modules

These four patterns will likely define most early Maestro behavior.

## 13. The first non-negotiable grammar rules

I would elevate these immediately.

### Rule 1

Reflex commands are globally available and highest priority.

### Rule 2

Focus is a first-class grammatical category.

### Rule 3

The canonical command form is structured, not freeform.

### Rule 4

Deterministic operation rejects unresolved ambiguity.

### Rule 5

Compression must preserve canonical meaning.

### Rule 6

Mode changes interpretation.

### Rule 7

Short explicit chains are allowed; long risky chains require stronger handling.

## 14. What we should do next

The next exact step should be one of these two:

### Option A

Define the **surface model** in detail:

* what counts as a surface
* how focus stacks work
* how panes, tabs, windows, and apps are represented

### Option B

Define the **verb system** in detail:

* which verbs are universal
* which are domain-only
* synonym mapping
* what each verb canonically means

My recommendation is:

**Do the verb system next.**

Because once the verbs are clean, the language becomes much easier to scale.
