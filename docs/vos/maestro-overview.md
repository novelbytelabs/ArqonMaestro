> Status: background synthesis document.
>
> Use [`README.md`](./README.md) for the documentation map, [`maestro-project-roadmap.md`](./maestro-project-roadmap.md) for canonical planning status, and the topic-specific specs in `/docs/vos` for source-of-truth definitions.

Yes. This is the right next topic.

Because if Maestro is really going to become a **Voice Operating System**, then its spoken grammar cannot just be “English commands plus vibes.” It needs to become a **real operating language**.

## The core design question

You are really deciding:

**What kind of spoken language is Maestro?**

There are three broad possibilities:

### 1. Natural-language-first

Example:

* “Could you open the terminal and run cargo build?”

Pros:

* easy for beginners
* feels conversational

Cons:

* ambiguous
* slower
* harder to make deterministic
* harder to scale into a real operating language

### 2. Command-language-first

Example:

* “terminal run cargo build”

Pros:

* compact
* fast
* deterministic
* composable

Cons:

* steeper learning curve
* can feel robotic if done badly

### 3. Hybrid layered language

Example:

* beginner layer:

  * “open terminal”
* advanced layer:

  * “terminal run cargo build”
* expert terse layer:

  * “term build”

This is the best answer.

For Maestro, I strongly recommend:

## Official language direction

**Maestro should use a layered spoken language:**

* **natural enough to learn**
* **structured enough to operate**
* **terse enough to become expert-fast**

That is how it becomes both:

* usable by ordinary people
* a true language for advanced builders

---

# The first major principle

## Maestro should be designed as a spoken operating grammar, not an English parser

That means:

* commands should resolve through known grammar where possible
* freeform language should exist, but mainly in the cognitive lane
* the reflex and command lanes should become increasingly **structured**

So the split is:

### Reflex / operating lane

Short, structured, low-ambiguity, command-like

### Cognitive / assistant lane

Freeform, explanatory, planning-oriented

This is crucial.

If you do not separate these, Maestro becomes mushy.

---

# The second major principle

## Spoken grammar should be mode-aware

The same words should not always mean the same thing.

Example:

### In coding mode

“select line three”
means code/editor selection

### In browser mode

“select the third result”
means page selection

### In dictation mode

“select line three”
might literally be text

So Maestro’s grammar should not be one universal flat parser.

It should be:

**mode + surface + intent class + utterance**

That gives you a much more powerful language.

---

# The third major principle

## Maestro needs a core command grammar and a higher natural-language shell

Think of it like this:

### Core grammar

The actual machine-operable language

### Natural-language shell

A user-friendly paraphrase layer that maps into the core grammar

That means these might all normalize to the same internal command:

* “open terminal”
* “please open the terminal”
* “bring up terminal”
* “terminal open”

Internally:

`app.open(target=terminal)`

This is how you get both friendliness and rigor.

---

# What the Maestro language should optimize for

I think the spoken language should optimize for these six things:

## 1. Low ambiguity

A command should usually have one obvious meaning.

## 2. Brevity at mastery

Experts should be able to say things quickly.

## 3. Composability

Commands should combine cleanly.

## 4. Recoverability

It should be easy to correct, cancel, and undo.

## 5. Surface portability

The same grammar should transfer across browser, IDE, terminal, and desktop where possible.

## 6. Learnability

Beginners should be able to start with natural commands and gradually compress into expert speech.

That is the sweet spot.

---

# The language architecture I recommend

I would design Maestro with **four layers of spoken language**.

## Layer 1: Reflex primitives

These are the sacred ultra-fast commands.

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

Rules:

* one or two words
* globally available
* never overloaded
* highest priority
* should interrupt anything

This is the **brainstem language**.

---

## Layer 2: Operating grammar

This is the core Voice OS language.

Examples:

* open terminal
* focus editor
* next tab
* close panel
* run build
* search files
* split right
* go line 42
* select function
* scroll down
* switch browser

Rules:

* short
* structured
* action-first or target-first, but consistent
* works across surfaces

This is the actual **VOS language**.

---

## Layer 3: Domain grammars

These are specialized sublanguages.

Examples:

### Coding grammar

* select function foo
* rename symbol bar
* extract method
* next error
* run tests
* open definition

### Browser grammar

* click first result
* open link two
* search page auth token
* next heading

### Terminal grammar

* run cargo build
* clear terminal
* stop process
* show logs

### Window/system grammar

* move left
* maximize window
* switch workspace
* open settings

These are like **dialects** under the core language.

---

## Layer 4: Cognitive / natural speech

This is where full language lives.

Examples:

* explain this error
* compare these two files
* prepare me to work on the parser
* summarize what changed today
* help me refactor this safely

This lane should be freer, but still ideally map into structured intent classes.

---

# The most important grammar design choice

You need to choose whether Maestro’s command language is primarily:

* **verb-first**
* **target-first**
* or **mixed**

## I recommend: verb-first for most operating commands

Examples:

* open terminal
* focus editor
* close tab
* select function foo
* run tests
* search files auth

Why verb-first works:

* matches action orientation
* easier to parse
* easier to compress
* feels like an OS language

But for navigation and expert shorthand, target-first can exist as an alias layer:

* terminal open
* editor focus
* tests run

Internally, though, I would still canonicalize to verb-first.

So:

## Canonical grammar shape

**verb + target + qualifiers**

Examples:

* open terminal
* focus browser
* search files auth token
* run cargo build
* select line 42
* move panel right

That should be the backbone.

---

# The command template

I would define the core spoken command structure like this:

## Core command form

**ACTION + OBJECT + MODIFIERS + CONTEXT**

Examples:

* open terminal
* focus left panel
* run tests in api
* search files for auth token
* select next error
* move tab to browser

Where:

* **ACTION** = verb
* **OBJECT** = target
* **MODIFIERS** = qualifiers like next, left, first, line 42
* **CONTEXT** = optional scope like in browser, in api, on current file

This is simple and powerful.

---

# Compression path for expert users

A real language should allow shortening over time.

Example progression:

### Beginner

“Could you open the terminal and run cargo build?”

### Intermediate

“open terminal, run cargo build”

### Advanced

“terminal run cargo build”

### Expert

“term build”

This suggests an important principle:

## Maestro should support progressive compression

* long natural forms
* standard command forms
* terse aliases
* expert macros

That is how it becomes a real language.

---

# The role of wake words and addressing

Another key design choice:

Should users always address Maestro explicitly?

I think Maestro needs **three interaction states**:

## 1. Explicit address mode

Example:

* “Maestro, open terminal”

Best for:

* shared environments
* secure mode
* public settings

## 2. Active session mode

Example:

* “open terminal”
* “run build”
* “undo that”

Best for:

* active work sessions
* coding flows

## 3. Continuous dictation mode

Example:

* dictated text, punctuation, formatting commands

Best for:

* writing
* coding comments
* notes

So the grammar should not assume one addressing pattern.

---

# The hardest problem: ambiguity

You must decide how Maestro handles ambiguous commands.

Example:

* “open it”
* “select that”
* “run this”

These are human, but dangerous.

My recommendation:

## Rule: reflex lane forbids unresolved pronouns

In the deterministic lane, commands like:

* it
* this
* that
* there

should only work if there is a very strong active referent.

Otherwise Maestro should:

* ask a short clarification
* or refuse cleanly

So:

### Good

“open terminal”
“select line 42”
“click first result”

### Risky

“open it”
“click that”
“run this”

This matters a lot for safety and trust.

---

# The grammar categories Maestro needs

I would define the first official grammar families like this:

## 1. Reflex

* stop
* cancel
* undo
* redo
* yes
* no
* mute
* sleep
* wake

## 2. Session / mode control

* enter dictation
* enter coding mode
* enter browser mode
* enable secure mode
* silent acknowledgments
* switch to conversation

## 3. App and surface control

* open terminal
* focus editor
* switch browser
* close window
* next tab
* split right

## 4. Navigation

* go line 42
* next error
* previous tab
* scroll down
* page top
* open definition

## 5. Selection and editing

* select function foo
* delete line
* copy selection
* rename symbol
* move block down
* comment line

## 6. Execution

* run tests
* build project
* commit changes
* open logs
* search files auth token

## 7. Cognitive tasks

* explain this error
* compare these modules
* summarize changes
* refactor safely
* prepare my workspace

That is a strong first taxonomy.

---

# The personality of the language

This matters more than it seems.

Maestro’s spoken language should feel:

* **precise**
* **technical**
* **clean**
* **commandable**
* **composable**
* **not cutesy**
* **not over-chatty**

It should sound like:

* a pilot language
* a conductor language
* an operator language

Not like:

* a toy assistant
* a smart speaker
* a customer support bot

This is very important for brand identity too.

---

# Should Maestro invent new words?

My recommendation:

## Mostly no, at first

Do not create a bunch of artificial vocabulary too early.

Start with:

* familiar verbs
* clean nouns
* strong aliases
* compressed expert forms

Then over time, if truly necessary, Maestro can evolve distinctive “native” forms.

That way the language becomes its own thing gradually, not artificially.

---

# The internal representation

Very important:

The spoken language should not be stored internally as raw text commands.

It should normalize into structured intent objects.

For example:

“open terminal”
“please open terminal”
“bring up terminal”

all become something like:

* intent class: `app.open`
* target: `terminal`
* mode: `command`
* surface: `desktop`
* confidence: high

This is how the language becomes stable and extensible.

---

# My first official design proposal

Here is the first strong version I would adopt:

## Maestro Language v0 Principles

### P1

The spoken language is layered:

* reflex
* operating
* domain
* cognitive

### P2

The operating language is canonicalized into:
**verb + object + modifiers + context**

### P3

Natural language is accepted, but normalized toward structured forms.

### P4

The deterministic lane forbids unresolved ambiguity unless context is very strong.

### P5

Expert users can compress commands into shorter aliases and macros.

### P6

Modes alter grammar interpretation.

### P7

Reflex commands are globally available and highest priority.

### P8

The language should feel technical, precise, and composable.

That is a real foundation.

---

# The first practical deliverable I’d create next

The next artifact should be a document like:

**`maestro_spoken_command_grammar.md`**

with sections for:

* design goals
* grammar layers
* canonical syntax
* ambiguity rules
* mode rules
* command families
* alias/compression rules
* examples

That would turn today’s discussion into something buildable.

---

# My blunt answer

The right direction is:

**Maestro should become a layered spoken operating language, with a deterministic core command grammar and a broader cognitive natural-language shell around it.**

And the best first canonical form is:

**verb + object + modifiers + context**

That is the cleanest starting point for a real Voice OS.

The next best move is to draft **Maestro Grammar v0** formally.

---
---
---
---

Yes — I think your instinct is right.

That example reveals something very important:

**Maestro grammar cannot be only action semantics. It must also encode focus semantics.**

Because in a real VOS, the user is not just issuing abstract commands. They are piloting **attention across surfaces**.

So this sequence:

* “focus terminal”
* “run cargo build”
* “focus VS Code”

is not clumsy.
It is actually a very clean **operating pattern**.

## The key insight

There are really two kinds of spoken actions:

### 1. Focus-changing actions

These move the active control surface.
Examples:

* focus terminal
* focus VS Code
* focus browser
* focus left pane
* switch workspace

### 2. In-surface actions

These act inside the currently focused surface.
Examples:

* run cargo build
* next tab
* scroll down
* open file
* select line 42

That distinction should become foundational in Maestro grammar.

## The rule I would adopt

**If an action depends on a specific UI surface being active, Maestro should make focus explicit unless there is a trusted bound route that bypasses focus.**

That means your example becomes canonical, not accidental.

## So the grammar model becomes

### Focus grammar

* focus terminal
* focus editor
* focus browser
* focus explorer
* focus problems panel

### Action grammar

* run cargo build
* clear terminal
* open file
* next error
* search auth token

And the system rule is:

* action grammar is interpreted relative to the **active focus surface**
* focus grammar changes that surface explicitly

That is very strong.

---

# Why “terminal run cargo build” may not be the right primary form

You are right to be skeptical.

“terminal run cargo build” sounds elegant at first, but in practice it hides two distinct operations:

1. move control to terminal
2. execute command in terminal

If Maestro pretends those are always one thing, you get ambiguity around:

* whether focus should change visibly
* whether the command should run in a background shell
* whether the terminal should stay active
* whether the editor should retain focus

That is dangerous.

So I would not make that the primary operating idiom.

Instead:

## Preferred explicit sequence

* focus terminal
* run cargo build
* focus VS Code

That is operator-clear and cognitively legible.

---

# But you still want compression later

This does not mean you must always speak three separate commands forever.

It means the **canonical semantics** should remain explicit, while expert shortcuts can compress them.

So over time, Maestro can support higher-order forms like:

* build in terminal
* run cargo build in terminal
* build and return
* terminal build return editor

But internally those should expand to something like:

1. focus terminal
2. run cargo build
3. restore previous focus

That is the right architecture.

## So the real rule is

**Canonical semantics explicit.
Spoken shorthand allowed as compiled macros.**

That is very Arqon-like, actually.

---

# A better grammar model

I think Maestro needs to recognize a distinct command family:

## Surface control grammar

This should be first-class.

Examples:

* focus terminal
* focus editor
* focus browser
* return focus
* previous focus
* swap focus
* focus split right
* focus panel
* focus explorer

This becomes part of the core VOS language.

Then:

## Execution grammar

Examples:

* run cargo build
* run tests
* clear
* show logs
* kill process

And:

## Combined macro grammar

Examples:

* build in terminal
* run cargo build and return
* test in terminal
* open logs in terminal

But these should be understood as sugar over the more explicit surface model.

---

# This leads to an important design principle

## Maestro should preserve the user’s mental model of visible focus

If the user says:

* focus terminal

the system should actually make terminal the active visible surface.

If the user says:

* focus VS Code

it should visibly restore that.

This makes Maestro feel like an operating system, not a magician doing hidden things.

That matters for trust.

---

# The exception: bound execution paths

You also hinted at an important exception.

If later you integrate deeply with VS Code, Maestro may be able to do something like:

* run cargo build in integrated terminal

without leaving the editor in a disruptive way, because the executor is not just “type into some external terminal.” It is a richer IDE-aware control path.

That suggests a second principle:

## Maestro should distinguish between focus-required execution and bound execution

### Focus-required execution

Needs active surface control.
Example:

* external terminal
* legacy app
* desktop UI flow

### Bound execution

Can target a subsystem without full visible focus transfer.
Example:

* VS Code integrated terminal API
* IDE task runner
* MCP tool call
* shell sidecar

That is a very important distinction.

So your example is right **for the current likely reality**, especially with an external terminal.

Later, some commands may become focus-independent if the integration path becomes richer.

---

# This gives us a clean formal model

## Command categories

### A. Focus commands

Move attention/control surface.

* focus terminal
* focus VS Code
* return focus

### B. Surface-relative commands

Act inside current focus.

* run cargo build
* clear
* next tab

### C. Surface-qualified commands

Target another surface explicitly.

* run cargo build in terminal
* open file in editor
* search page in browser

### D. Macro commands

Compile into multi-step operating sequences.

* build and return
* run tests then focus editor

This is probably the right formal shape.

---

# “return focus” is going to matter a lot

Your example strongly suggests Maestro should have a first-class concept of:

* previous focus
* return focus
* restore focus

Because then the sequence becomes:

* focus terminal
* run cargo build
* return focus

That is better than forcing:

* focus VS Code

every time.

So I would definitely add:

## Focus history primitives

* return focus
* previous focus
* restore editor
* swap focus

This will make the language much more ergonomic.

---

# My recommendation for your exact case

Yes, for now I would formalize the pattern as:

### Canonical form

* focus terminal
* run cargo build
* return focus

with:

* `focus VS Code` as a valid explicit alternative
* `build and return` as a future macro layer

That gives you:

* clarity
* real operability
* low ambiguity
* future room for compression

---

# The rule I would write into Grammar v0

Something like:

**Commands that require interaction with a specific UI surface should use explicit focus control unless the action is supported by a bound execution path that guarantees safe target resolution without visible focus transfer.**

That is exactly the principle your example uncovered.

---

# My blunt conclusion

You are right.

For a real Voice OS, **focus is part of the language**.

So “focus terminal → run cargo build → return focus” is not a workaround.
It is probably one of the foundational speech patterns of Maestro.

The next thing we should do is define the first **focus grammar** and **surface model** for Maestro.
