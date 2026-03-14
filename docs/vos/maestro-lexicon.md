# Maestro Lexicon v0.1

## Purpose

The lexicon defines:

* the canonical words of the language
* which words are reserved
* which aliases are accepted
* which abbreviations are legal
* which vague words are rejected
* which words belong to which command families
* which terms are too collision-prone for safe use

This is what gives Maestro a disciplined spoken vocabulary.

---

# 1. First law of the lexicon

## The lexicon must optimize for spoken clarity, not literary richness

That means:

* fewer better words
* stable meanings
* low collision
* strong operational feel
* easy repetition under pressure
* good STT survivability

Maestro should not try to be poetic.
It should try to be **clear, terse, and durable**.

---

# 2. Lexicon classes

I would divide the lexicon into nine classes.

## A. Reserved control words

Critical words that have system-wide priority.

## B. Canonical verbs

The core action words.

## C. Canonical objects

The core target nouns.

## D. Qualifiers

Words that refine target or action.

## E. Scope markers

Words that introduce scope and relation.

## F. Postfix markers

Words that modify flow/behavior at the end.

## G. Alias words

Accepted alternate spoken forms.

## H. Expert abbreviations

Compressed forms that are legal only by rule or preference.

## I. Forbidden vague terms

Words that should not be accepted on the deterministic lane.

That is the right structure.

---

# 3. Reserved control words

These are the most sensitive words in the entire language.

They should be:

* globally recognizable
* short
* phonetically distinct
* never reused as ordinary object names

## Reserved reflex words

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

## Reserved overlay words

* one
* two
* three
* four
* five
* always
* prefer
* cancel
* never mind
* confirm

## Reserved mode words

* enter
* leave
* switch
* mode
* secure
* dictation
* command
* quiet

## Rule

Reserved control words should not be repurposed as ordinary nouns or aliases.

Example:

* do not create a project alias called `stop`
* do not let `wake` mean `open browser`

This is crucial.

---

# 4. Canonical verb lexicon v0.1

These are the official verbs.

## Reflex/control verbs

* stop
* cancel
* undo
* redo
* mute
* unmute
* pause
* resume

## Focus/session verbs

* focus
* return
* swap
* switch

## Visibility/lifecycle verbs

* open
* close
* show
* hide

## Navigation verbs

* next
* previous
* go
* move
* scroll

## Execution verbs

* run
* build
* test

## Manipulation verbs

* select
* copy
* paste
* delete
* rename
* comment
* uncomment

## Discovery/inspection verbs

* search
* find
* inspect
* explain
* compare

## Optional domain verb

* click

This is the canonical action inventory.

---

# 5. Canonical object lexicon v0.1

These are the core nouns.

## Surface nouns

* editor
* terminal
* browser
* explorer
* problems
* sidebar
* panel
* window
* workspace
* settings

## Container nouns

* tab
* pane
* split
* file
* folder
* project
* session

## Location nouns

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

## Code nouns

* symbol
* function
* method
* class
* variable
* parameter
* type
* import
* error
* warning
* test
* module
* selection

## Execution nouns

* command
* process
* build
* tests
* task
* logs
* server
* branch
* commit

## UI nouns

* button
* link
* result
* field
* checkbox
* menu
* item
* dialog
* page

## Session/control nouns

* focus
* mode
* voice
* playback
* microphone
* history
* clipboard

That is already a serious vocabulary.

---

# 6. Qualifier lexicon v0.1

Qualifiers are essential because they sharpen meaning without needing new verbs.

## Positional qualifiers

* first
* second
* third
* last
* current
* next
* previous

## Directional qualifiers

* left
* right
* up
* down

## State qualifiers

* active
* visible
* hidden
* selected
* current

## Safety/behavior qualifiers

* quietly
* safely

## Temporal qualifiers

* now

## Contextual qualifiers

* here

Important:

* `here` and `now` should be tightly constrained
* `safely` should not be decorative; it should have real behavioral meaning
* `quietly` should connect to output/acknowledgment behavior

---

# 7. Scope marker lexicon v0.1

Keep this tight.

## Canonical scope markers

* in
* on
* to
* from

## Recommended strong forms

* `in` for target scope
* `to` for destination
* `from` for source
* `on` for action binding when needed

## Examples

* run cargo build in terminal
* move file to src
* compare output from build
* comment on selection

Rule:
Do not explode the preposition set early.
A smaller scope lexicon keeps parsing clean.

---

# 8. Postfix lexicon v0.1

These should be small and important.

## Canonical postfixes

* and return
* quietly
* safely
* here
* now

## Recommended special postfix

* then

Though `then` also acts as a chain marker.

Examples:

* run cargo build and return
* test file quietly
* refactor this safely

Rule:
Postfixes should have real semantics, not just conversational flavor.

---

# 9. Alias lexicon policy

Aliases are allowed, but they must map inward to canonical terms.

## Good alias behavior

Beginner says:

* launch terminal

Maestro normalizes to:

* open terminal

That is good.

## Bad alias behavior

Beginner says:

* do terminal thing

Maestro tries to infer a random action

That is bad.

So aliasing must be:

* conservative
* one-way
* canonicalizing

---

# 10. Canonical alias sets v0.1

Here are the first strong alias groups.

## Verb alias sets

### focus

aliases:

* activate
* go to
* jump to
* switch to

canonical:

* focus

### open

aliases:

* launch
* bring up
* load

canonical:

* open

### close

aliases:

* dismiss
* shut
* exit

canonical:

* close

### run

aliases:

* execute
* start

canonical:

* run

### search

aliases:

* look for
* search for
* locate

canonical:

* search

### select

aliases:

* highlight
* mark

canonical:

* select

### delete

aliases:

* remove
* erase

canonical:

* delete

### rename

aliases:

* change name
* rename to

canonical:

* rename

### comment

aliases:

* comment out

canonical:

* comment

### uncomment

aliases:

* remove comment

canonical:

* uncomment

## Object alias sets

### editor

aliases:

* code
* VS Code
* vscode

canonical:

* editor

### terminal

aliases:

* shell
* console

canonical:

* terminal

### problems

aliases:

* errors
* problems panel

canonical:

* problems

### browser

aliases:

* web
* chrome
* firefox

canonical:

* browser

Though specific browser names may also bind as actual surface targets.

---

# 11. Expert abbreviation policy

This is where Maestro becomes fast.

But abbreviations are dangerous unless controlled.

## Rule

Expert abbreviations must be:

* explicit
* auditable
* low-collision
* preference-enabled or system-declared

They should not emerge from random guesswork.

## Good expert abbreviations

* term → terminal
* defs → definitions
* prev → previous
* err → error
* probs → problems
* exec → execute/run if explicitly mapped
* refs → references

## Risky abbreviations

* go → already canonical verb
* do → too vague
* mod → could mean mode/module
* sel → could be okay, but only if declared
* win → window or win as a regular word

So:

* some abbreviations are excellent
* some are too collision-prone for v0.1

---

# 12. Initial expert abbreviation set v0.1

I would keep the first set small.

## Recommended safe abbreviations

* term → terminal
* err → error
* defs → definition / definitions
* refs → reference / references
* prev → previous
* curr → current
* probs → problems
* cfg → config, if config becomes a canonical object later

## Maybe later

* sym → symbol
* func → function
* proj → project
* ws → workspace

These should likely remain opt-in at first.

---

# 13. Forbidden vague lexicon

This is essential.

These terms should not be accepted as deterministic operating verbs unless they route to the cognitive lane.

## Forbidden vague verbs

* do
* make
* handle
* fix
* use
* work
* get
* take
* put
* deal with

## Forbidden vague targets

* thing
* stuff
* item
* that one
* whatever
* this thing

## Dangerous unresolved pronouns

* it
* that
* this
* there

unless strongly bound in a safe context.

This is one of the most important sections in the whole lexicon.

---

# 14. Reserved words that should stay untouched

Some words should be permanently protected.

## Protected words

* stop
* cancel
* undo
* redo
* focus
* return
* enter
* leave
* mode
* secure
* dictation
* yes
* no
* confirm
* one
* two
* three
* four
* five

Why?
Because these words anchor:

* reflexes
* overlays
* mode control
* chooser UX
* confirmations

Do not let users redefine or alias over them.

---

# 15. Lexical collision policy

Speech systems suffer badly from collisions.

We need rules for when two words are too close.

## Collision types

### A. Semantic collision

Example:

* terminal vs shell vs console

This is manageable via alias collapse.

### B. Role collision

Example:

* mode as noun and mode as command keyword

This is manageable if grammar position is strict.

### C. Phonetic collision

Example:

* tab vs tag
* pane vs pain
* build vs billed
* code vs quote in some STT conditions

This is more dangerous.

### D. Family collision

Example:

* one as chooser selection vs literal number in command

This is why overlay mode priority matters.

---

# 16. Lexicon robustness principle

## Prefer words that are:

* short
* common
* phonetically stable
* not easily confused with reflex words
* not overloaded across too many families

That means Maestro should prefer:

* focus
* open
* close
* run
* build
* test
* search
* select

These are strong operating words.

It should be more cautious with:

* do
* make
* get
* set
* use

These are weak.

---

# 17. Spoken number lexicon

Numbers deserve their own section because they appear everywhere.

## Canonical number use cases

* line 42
* result 2
* tab 3
* chooser option 1
* line range 10 through 20

## Number rules

* spoken cardinals should parse directly
* ordinals should map where appropriate:

  * first
  * second
  * third

## Important overlay rule

When chooser mode is active:

* one, two, three, four, five
  default to chooser selection semantics

Outside chooser mode:

* they revert to numeric object content

This is a perfect example of mode-sensitive lexicon behavior.

---

# 18. Lexicon by family

This is useful for teachability.

## Reflex vocabulary

* stop
* cancel
* undo
* redo
* mute
* pause
* resume

## Focus vocabulary

* focus
* return
* swap
* switch
* terminal
* editor
* browser
* sidebar
* panel

## Execution vocabulary

* run
* build
* test
* stop
* process
* command
* logs
* server

## Coding vocabulary

* file
* line
* symbol
* function
* class
* method
* definition
* reference
* error
* warning

## Browser vocabulary

* page
* result
* link
* heading
* tab
* field

This will help later when documenting the language.

---

# 19. Lexicon and personalization

The lexicon should be partly fixed and partly personalized.

## Fixed layer

* canonical verbs
* canonical objects
* reserved words
* forbidden vague words

## Personalizable layer

* aliases
* preferred surface names
* expert shorthand enablement
* scope defaults
* domain nicknames if safe

## Important rule

Personalization may add or enable aliases.
It may not overwrite reserved or canonical system words.

---

# 20. Lexicon and chooser learning

Chooser learning is one of the best ways to expand the lexicon safely.

Example:
User repeatedly says:

* code

Chooser or context resolves to:

* editor

System may learn:

* `code` is an alias for `editor` in this app or globally

But:

* only if safe
* only if transparent
* only if inspectable

That is how the lexicon evolves without becoming unstable.

---

# 21. Lexicon laws v0.1

I would freeze these.

## Law 1

Canonical meanings must stay stable.

## Law 2

Aliases map inward to canonical forms.

## Law 3

Reserved control words must remain protected.

## Law 4

Abbreviations must be explicit, low-collision, and auditable.

## Law 5

Vague verbs and vague targets are rejected on the deterministic lane.

## Law 6

Lexicon design must optimize for spoken clarity and STT survivability.

## Law 7

Personalization may extend aliases, but not overwrite constitutional words.

These are excellent laws.

---

# 22. First canonical lexicon inventory

If I were freezing the first official lexicon right now, I would include:

## Canonical verbs

* focus
* return
* open
* close
* show
* hide
* run
* build
* test
* stop
* next
* previous
* go
* move
* scroll
* select
* copy
* paste
* delete
* rename
* comment
* uncomment
* search
* find
* inspect
* explain
* compare

## Canonical objects

* editor
* terminal
* browser
* explorer
* problems
* sidebar
* panel
* window
* workspace
* file
* folder
* project
* tab
* pane
* line
* symbol
* function
* class
* definition
* reference
* error
* warning
* test
* module
* process
* logs
* result
* link
* heading
* field
* selection

## Core qualifiers

* current
* next
* previous
* first
* second
* third
* left
* right
* up
* down
* quietly
* safely

## Core scope markers

* in
* to
* from
* on

## Core postfixes

* and return
* quietly
* safely
* here
* now

That is a strong v0.1 lexicon.

---
