# Maestro Syntax Specification v0.1

## Purpose

This specification defines the **canonical spoken syntax** of Maestro.

It answers:

* what a valid Maestro command sounds like
* what order parts of a command appear in
* how scopes attach
* how qualifiers attach
* how postfixes attach
* how chaining works
* how shorthand works
* what should be rejected as non-canonical or unsafe

This is the first real syntax layer of the VOS language.

---

# 1. Core syntax principle

## Maestro syntax should be:

* short
* structured
* spoken naturally
* easy to compress
* deterministic to parse
* consistent across surfaces

The language should not try to mimic arbitrary English.
It should sound like a **spoken operator language**.

---

# 2. Canonical command shape

The canonical Maestro command form is:

**VERB + OBJECT + QUALIFIERS + SCOPE + POSTFIX**

That is the master template.

Not every command uses every slot, but that is the canonical ordering.

## Example

* focus terminal
* run cargo build
* select line 42
* search files auth token
* run cargo build in terminal
* run cargo build in terminal and return

---

# 3. Syntax slots

## Slot 1: Verb

The action word.

Examples:

* focus
* open
* run
* build
* search
* select
* rename
* compare

## Slot 2: Object

The target of the action.

Examples:

* terminal
* editor
* line 42
* function parse input
* files
* logs
* browser
* symbol token map

## Slot 3: Qualifiers

Words or phrases that refine the target or action.

Examples:

* next
* previous
* current
* first
* second
* right
* left
* quietly
* safely

## Slot 4: Scope

The surface, area, or context in which the action should occur.

Usually introduced by:

* in
* on
* from
* to

Examples:

* in terminal
* in browser
* in project
* on current file

## Slot 5: Postfix

A trailing modifier that changes command flow or execution behavior.

Examples:

* and return
* quietly
* safely
* now

---

# 4. Command classes and their syntax

Not every family uses the full template the same way.

## A. Reflex syntax

**REFLEX**

Examples:

* stop
* cancel
* undo
* redo
* mute

### Rule

Reflex commands are usually single-token or fixed two-token phrases.
They do not take normal scope or postfix structures.

---

## B. Mode syntax

**ENTER/LEAVE/SWITCH + MODE**

Examples:

* enter coding mode
* leave dictation
* switch to conversation
* enter secure mode

### Canonical preference

Use:

* enter
* leave
* switch to

Avoid too many alternate forms.

---

## C. Focus syntax

**FOCUS + SURFACE**
or
**RETURN/PREVIOUS/SWAP + FOCUS**

Examples:

* focus terminal
* focus editor
* focus browser
* return focus
* previous focus
* swap focus

### Qualified focus forms

* focus left pane
* focus integrated terminal
* focus command palette

---

## D. Operating syntax

**VERB + OBJECT**
**VERB + OBJECT + QUALIFIER**
**VERB + OBJECT + SCOPE**
**VERB + OBJECT + SCOPE + POSTFIX**

Examples:

* open terminal
* close panel
* run cargo build
* search files auth token
* run cargo build in terminal
* run cargo build in terminal and return

---

## E. Selection syntax

**SELECT + TARGET**
**SELECT + TARGET + IDENTIFIER**
**SELECT + RANGE**

Examples:

* select line 42
* select function parse input
* select symbol token map
* select first result
* select lines 10 through 20

---

## F. Search syntax

Search is special because it often includes a query payload.

Canonical forms:

**search + scope + query**
**search + scope + for + query**
**find + query**
**find + query + in + local_scope**

Examples:

* search files auth token
* search files for auth token
* search page websocket
* find token
* find token in file

### Rule

`search` prefers explicit scope.
`find` prefers current/local scope.

---

## G. Execution syntax

**run + payload**
**build + target**
**test + target**
**run + payload + in + scope**
**build + target + postfix**

Examples:

* run cargo build
* run cargo test
* build project
* test file
* run cargo build in terminal
* build project and return

---

## H. Cognitive bridge syntax

**verb + target**
**verb + target + qualifier**
**verb + target + scope**

Examples:

* explain this error
* compare these files
* inspect selection
* compare modules auth and api
* refactor this safely

These are freer than operating syntax, but still structured.

---

# 5. Word order rules

This is one of the most important parts.

## Rule 1: Verb first by default

Canonical Maestro syntax is **verb-first**.

Examples:

* focus terminal
* open file
* search files auth token
* select line 42

This should be the official backbone of the language.

---

## Rule 2: Object-first forms are aliases, not canon

Examples:

* terminal focus
* file open
* browser switch

These may be supported later as compressed or expert forms, but they should canonicalize inward to verb-first forms.

So:

* `terminal focus` → `focus terminal`

---

## Rule 3: Scope comes after object

Examples:

* run cargo build in terminal
* search logs in project
* open result in browser

Not:

* in terminal run cargo build

That sounds natural in English, but it is worse for deterministic parsing.

---

## Rule 4: Postfix comes last

Examples:

* run cargo build in terminal and return
* test file quietly
* refactor this safely

That gives the syntax a strong end-weight.

---

# 6. Qualifier ordering

Qualifiers need a stable order.

I recommend:

## Preferred order

**VERB + POSITION/STATE QUALIFIER + OBJECT + IDENTIFIER + SCOPE + POSTFIX**

But in spoken form, the object and qualifier often blend. So more practically:

### Canonical spoken order

1. verb
2. object noun
3. object identifier or position
4. scope
5. postfix

## Examples

* select line 42
* select first result
* open current file
* move tab right
* search files auth token
* run cargo build in terminal and return

### Note

Direction words like left/right/up/down behave a little differently because they often modify movement or focus directly:

* move tab right
* focus left pane
* split right

That is fine as a special pattern.

---

# 7. Identifiers and payloads

Not all object references are just nouns.

We need three kinds of tail content.

## A. Identifiers

Examples:

* line 42
* file main.rs
* branch feature-auth
* function parse input

## B. Positionals

Examples:

* first result
* second tab
* left pane
* current file
* next error

## C. Free payloads

Examples:

* cargo build
* auth token
* npm run dev
* websocket timeout

These must be treated differently by the parser.

### Rule

The parser should know when the tail is:

* object identification
* positional targeting
* free execution/query payload

That is a major part of deterministic interpretation.

---

# 8. Scope markers

Scope markers should be limited and stable.

## Primary scope words

* in
* on
* from
* to

## Canonical uses

### `in`

Most common scope marker.
Examples:

* run cargo build in terminal
* search logs in project
* open result in browser

### `on`

Use when acting on an object already in context.
Examples:

* comment on selection
* test on current file

This may be less common in v0.1.

### `from`

Use for source-context operations.
Examples:

* open logs from terminal
* compare output from build

### `to`

Use for movement or destination.
Examples:

* move file to src
* switch to browser
* go to line 42

### Recommendation

In v0.1, emphasize:

* `in`
* `to`

Keep the syntax compact and avoid too many preposition patterns early.

---

# 9. Postfix markers

Postfixes should be few and disciplined.

## Canonical postfixes

* and return
* quietly
* safely
* here
* now

## Examples

* run cargo build and return
* search files auth token here
* refactor this safely
* show logs now

## Rule

Postfixes modify execution behavior, not core intent meaning.

That means:

* `run cargo build`
  and
* `run cargo build and return`

share the same core command, but differ in flow behavior.

---

# 10. Chaining syntax

Chaining is essential for a VOS, but it must stay lawful.

## Canonical chain markers

* then
* pause-separated chain

## Examples

* focus terminal then run cargo build
* focus browser then search page websocket
* focus terminal, run cargo build, return focus

## Rule

Short deterministic chains are allowed.
Long or risky chains should become macros or reviewed workflows.

### v0.1 chain rule

Allow chains of:

* 2–3 low-risk commands
* where each command is independently valid
* and where rollback/stop behavior is straightforward

Examples:

* focus terminal then run cargo build
* focus browser then open first result
* focus editor then next error then open definition

---

# 11. Canonical separators

Spoken language still needs implicit punctuation rules.

## Valid separators

* then
* and then
* short pause
* comma pause in STT rendering

## Invalid or discouraged separators

* lots of free conjunctions with unclear grouping
* complex sentence nesting

Bad:

* open the terminal and maybe after that run cargo build and when you are done go back

Good:

* focus terminal then run cargo build then return focus

This is exactly the VOS tone we want.

---

# 12. Shorthand syntax

Shorthand is allowed, but it must be lawful.

## Levels

### Level 1: natural alias

* switch to browser → focus browser
* bring up terminal → open terminal

### Level 2: compact standard

* terminal → focus terminal
* browser → focus browser

Only in contexts where one-token shorthand is enabled and safe.

### Level 3: expert shorthand

* term build return
* next err
* defs

These should not be assumed by default.
They should be preference-enabled or explicitly declared.

## Important rule

Shorthand always maps back to a visible canonical form.

---

# 13. Optional words

Some spoken words may be ignored during normalization.

## Examples

* please
* could you
* can you
* would you
* go ahead and

So:

* "could you open terminal"
  normalizes to:
* `open terminal`

This is helpful, but should stay conservative.

Do not let optional wrappers hide structural ambiguity.

---

# 14. Forbidden vague syntax

A VOS must reject some language shapes.

## Disfavored forms

* do build
* make project
* handle logs
* work on this
* use browser
* get terminal
* take line 42

These are too vague or semantically unstable.

## Disallowed unresolved-risk forms

* delete it
* run that
* open this
* send it
* remove that

Unless a strongly bound referent exists, these should not be canonical operating syntax.

---

# 15. Pronoun policy

Pronouns should be tightly controlled.

## Allowed with strong context

* this error
* current file
* this selection

## Disallowed on deterministic lane without strong binding

* it
* that
* there
* here as sole target

Examples:

* explain this error → okay
* delete it → block
* run that → block
* open this → chooser or refusal

This rule is essential.

---

# 16. Surface-qualified syntax

This is one of the most important syntax forms for Maestro.

## Canonical form

**VERB + OBJECT + in + SURFACE**

Examples:

* run cargo build in terminal
* search auth token in files
* open result in browser
* show logs in terminal

This form is crucial because it allows Maestro to:

* stay explicit
* avoid ambiguous focus assumptions
* support bound execution

This is one of the defining syntax shapes of the language.

---

# 17. Focus-restore syntax

Another defining Maestro pattern.

## Canonical forms

* return focus
* previous focus
* swap focus

## Postfix form

* and return

Examples:

* focus terminal then run cargo build then return focus
* run cargo build in terminal and return

This is so important that I would call it one of the signature syntactic features of Maestro.

---

# 18. Slot syntax

Some commands require a missing value.

These should use structured slot prompts.

## Example base forms

* go line
* open file
* rename symbol
* compare files

### Slot completion prompts

* which line
* which file
* which symbol
* which two files

The syntax spec should assume that missing required slots can suspend the command into slot-prompt mode.

---

# 19. Syntax precedence

When more than one parse is possible, use this precedence:

1. reflex fixed phrase
2. mode command
3. focus command
4. verb-first canonical command
5. scoped canonical command
6. shorthand/alias form
7. cognitive bridge parse
8. dictation fallback

This is how syntax stays deterministic.

---

# 20. Anti-examples

These are very important.
A language gets clearer when it shows what not to do.

## Bad

* in terminal run cargo build
* cargo build run
* terminal cargo build
* do build now
* delete it
* maybe open the thing in code
* work on this file

## Good

* run cargo build in terminal
* focus terminal then run cargo build
* build project
* open current file
* compare these files
* explain this error

---

# 21. First official syntax patterns

I would freeze these as the official v0.1 patterns.

## Pattern A: Reflex

* stop
* undo
* mute

## Pattern B: Mode

* enter coding mode
* leave dictation

## Pattern C: Focus

* focus terminal
* return focus

## Pattern D: Simple action

* open terminal
* close panel
* next tab

## Pattern E: Qualified target

* select line 42
* rename symbol token map

## Pattern F: Scoped action

* run cargo build in terminal
* search logs in project

## Pattern G: Postfixed action

* run cargo build and return
* refactor this safely

## Pattern H: Chained action

* focus terminal then run cargo build then return focus

These are enough to define the language spine.

---

# 22. Canonical syntax examples by family

## Reflex

* stop
* cancel
* undo

## Focus

* focus browser
* focus editor
* swap focus

## Navigation

* next tab
* previous error
* go line 42
* scroll down

## Selection

* select current line
* select function parse input

## Execution

* run cargo build
* build project
* test file
* stop build

## Search

* search files auth token
* find token in file

## Visibility

* open terminal
* show logs
* hide sidebar
* close panel

## Coding

* rename symbol token map
* open definition
* compare these files

## Browser

* click first result
* open second tab
* search page websocket

## Terminal

* clear terminal
* run cargo test
* inspect process

## Cognitive bridge

* explain this error
* inspect selection
* compare modules auth and api

---

# 23. Formal syntax summary

If I compress the whole syntax spec to a short law set:

## Syntax Laws v0.1

### Law 1

Canonical Maestro syntax is verb-first.

### Law 2

The canonical command template is:
**verb + object + qualifiers + scope + postfix**

### Law 3

Scope follows the object.

### Law 4

Postfix comes last.

### Law 5

Short deterministic chains are allowed.

### Law 6

Shorthand is legal only when it maps cleanly to canonical syntax.

### Law 7

Vague verbs and unresolved pronouns are rejected on the deterministic lane.

### Law 8

Surface-qualified syntax is first-class.

### Law 9

Focus and return forms are first-class.

These are excellent laws.

---
