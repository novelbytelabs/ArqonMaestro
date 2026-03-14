# Maestro Language Constitution v0

## Prime thesis

**Maestro is not a voice assistant language.
Maestro is a spoken operating language.**

Its purpose is to let a human:

* direct attention
* issue action
* compose workflows
* recover from error
* operate across surfaces
* escalate to cognition only when needed

The language must therefore be:

* deterministic by default
* compact at mastery
* learnable at entry
* composable under pressure
* safe under ambiguity
* universal across surfaces

---

# The first laws

## Law 1: Focus is part of the language

A Voice OS does not only act. It **moves control**.

So these are first-class:

* focus terminal
* focus editor
* focus browser
* return focus
* previous focus
* swap focus

This is not a workaround. This is foundational.

## Law 2: Every utterance belongs to a lane

Every spoken input must resolve first into one of these classes:

* **reflex**
* **mode**
* **focus**
* **action**
* **cognitive**
* **dictation**

This prevents mush.

## Law 3: The canonical sentence is structured

The canonical Maestro command form is:

**verb + object + qualifiers + scope + postfix**

Examples:

* open terminal
* focus editor
* run cargo build
* select line 42
* search files auth token
* run tests in api
* build and return

Natural speech is allowed, but it must compile into this shape.

## Law 4: Ambiguity fails closed on the operating lane

Unresolved pronouns do not belong in deterministic operation unless context is very strong.

Risky:

* open it
* run that
* click this

Safe:

* open terminal
* run cargo build
* click first result

## Law 5: Compression is earned, not assumed

Beginners can speak naturally.
Experts can compress.

Example progression:

* open terminal
* focus terminal
* terminal
* term

But canonical meaning stays stable.

## Law 6: The strongest control contract wins

Maestro should prefer:

1. native/API/tool control
2. structured semantic surface control
3. focus-driven UI control
4. visual fallback

That rule belongs to the language because it affects what commands mean.

## Law 7: Undo is sacred

"undo" must be universal wherever logically possible.

That means the language must be designed around:

* reversibility
* recoverability
* explicit confirmation tiers for risky actions

---

# The six language layers

## 1. Reflex language

The shortest, highest-priority commands in the system.

Examples:

* stop
* cancel
* undo
* redo
* mute
* sleep
* wake
* pause
* resume
* yes
* no

Properties:

* one or two words
* globally available
* never overloaded
* interrupt anything

This is the brainstem of Maestro.

## 2. Mode language

Commands that change interpretation.

Examples:

* enter command mode
* enter dictation
* enter coding mode
* enter browser mode
* enter secure mode
* enter quiet mode
* leave dictation

Modes affect:

* parsing
* allowed actions
* confirmation rules
* accepted speakers
* output behavior

## 3. Focus language

Commands that move operating attention.

Examples:

* focus terminal
* focus editor
* focus browser
* focus left pane
* focus explorer
* return focus
* previous focus
* swap focus

This is a core VOS language family.

## 4. Operating language

The main command language of the OS.

Examples:

* open terminal
* close window
* next tab
* split right
* run build
* clear terminal
* search files auth token
* open definition

This is the central spoken operating grammar.

## 5. Domain language

Specialized dialects for surfaces.

### Coding

* select function foo
* rename symbol bar
* next error
* extract method

### Browser

* click first result
* open link two
* next heading

### Terminal

* run cargo build
* stop process
* show logs

### System

* switch workspace
* lock screen
* open settings

## 6. Cognitive language

The freer, higher-order lane.

Examples:

* explain this error
* compare these files
* prepare my workspace
* refactor this safely
* summarize what changed

This is not the default lane for ordinary operation.

---

# The core grammar forms

## Form A: Reflex

**REFLEX**

Examples:

* stop
* undo
* mute

## Form B: Mode

**ENTER/LEAVE + MODE**

Examples:

* enter coding mode
* leave dictation

## Form C: Focus

**FOCUS + SURFACE**
or
**RETURN/PREVIOUS/SWAP + FOCUS**

Examples:

* focus terminal
* return focus

## Form D: Surface-relative action

**VERB + OBJECT + QUALIFIERS**

Examples:

* run cargo build
* select line 42
* next tab

Interpretation depends on active focus.

## Form E: Surface-qualified action

**VERB + OBJECT + IN/ON + SURFACE**

Examples:

* run cargo build in terminal
* search auth token in files
* open definition in editor

This is important when the target surface differs from current focus.

## Form F: Macro action

**ACTION + POSTFIX**

Examples:

* build and return
* open logs then focus editor
* run tests quietly

These compile into explicit steps.

---

# The first Maestro operator vocabulary

The first verbs should be small and universal.

## Core verbs

* focus
* open
* close
* switch
* run
* stop
* select
* move
* search
* show
* hide
* split
* return
* rename
* delete
* copy
* paste
* comment
* build
* test
* explain
* compare
* refactor

That is already enough to cover a huge amount of ground.

## Core objects

* terminal
* editor
* browser
* pane
* tab
* panel
* explorer
* file
* line
* symbol
* function
* error
* tests
* logs
* settings
* workspace
* project
* selection

## Core qualifiers

* next
* previous
* first
* last
* left
* right
* up
* down
* current
* all
* line 42
* symbol foo
* quietly
* safely
* here
* in api
* in terminal
* and return

---

# The single most important discovery so far

Your VS Code / terminal example reveals that Maestro must distinguish:

## Focus-required actions

These require visible active control of a surface.

Example:

* focus terminal
* run cargo build
* return focus

## Bound actions

These can target a subsystem without visible focus transfer.

Example:

* run tests in integrated terminal
* build via task runner
* open definition via editor API

So the language needs both:

* explicit focus grammar
* target-qualified execution grammar

That is a major structural principle.

---

# The first official operating pattern

I think the first canonical Maestro work pattern should be:

## Focus → act → restore

Examples:

* focus terminal
* run cargo build
* return focus

or

* focus browser
* open docs
* return focus

This is likely one of the defining patterns of the whole language.

Later, shortcuts can compress it:

* build and return
* open docs and return

But the semantic model remains explicit.

---

# The first ambiguity policy

## Deterministic lane rules

The operating lane should:

* reject unresolved "it/this/that" unless referent is strong
* prefer explicit objects
* ask for clarification briefly when necessary
* never silently guess on risky actions

## Cognitive lane rules

The cognitive lane may tolerate looser reference, but should still surface assumptions.

That keeps Maestro trustworthy.

---

# The first mode model

I think the top-level modes should be:

* asleep
* listening
* command
* coding
* browser
* terminal
* dictation
* conversational
* secure
* quiet

And grammar should be affected by mode.

Example:

* "next line" in coding mode is editor navigation
* "next line" in dictation mode is literal text or formatting
* "send message" in secure mode may require confirmation

---

# The first compression model

Maestro should support three speech levels.

## Level 1: Natural

* please open terminal
* could you run cargo build

## Level 2: Standard

* focus terminal
* run cargo build
* return focus

## Level 3: Expert

* terminal
* build
* return

or eventually:

* term build return

Internally, these all map into the same structured command objects.

---

# The first canonical examples

## Coding loop

* focus terminal
* run cargo build
* return focus

## Error navigation

* next error
* open definition
* return focus

## Browser research loop

* focus browser
* search page authentication
* open first result
* return focus

## Controlled macro

* build and return
* run tests quietly
* open logs in terminal

## Cognitive escalation

* explain this error
* compare these modules
* refactor this safely

---

# The identity of the language

Maestro's language should feel:

* precise
* technical
* commandable
* composable
* calm
* non-cutesy
* operator-grade

It should sound like a:

* flight deck language
* conductor language
* systems operator language

Not like a toy assistant.

---

# The first formal definition of Maestro

Here is the strongest first statement:

**Maestro is a layered spoken operating language in which reflexes, modes, focus, actions, and cognition are distinct classes, and in which canonical operating commands normalize to structured intent using verb + object + qualifiers + scope + postfix.**

That is a real foundation.
