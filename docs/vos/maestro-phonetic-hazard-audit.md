# Maestro Phonetic Hazard Audit v0.1

## Purpose

This audit evaluates whether Maestro's spoken language is actually fit for real speech conditions.

It asks:

* which words are too easy to confuse
* which command forms are fragile under STT
* which abbreviations are unsafe
* which high-risk commands need extra protection
* which vocabulary choices should be kept, changed, or constrained

This is not cosmetic.
For a VOS, **phonetic robustness is part of the safety model**.

---

# 1. Core principle

## A spoken operating language must optimize for survivability, not elegance

A term can be logically perfect and still be bad for speech.

So Maestro vocabulary should optimize for:

* phonetic distinctness
* low confusion under STT
* robustness across accents
* robustness under fast speech
* robustness under clipped speech
* robustness under noise
* safety under partial recognition

That means the right question is not:

"Is this a nice word?"

The right question is:

"Can this word survive real speech without causing dangerous drift?"

---

# 2. Hazard classes

I would classify phonetic hazards into six classes.

## H1 — low hazard

Very robust under speech.
Clear enough to remain in the core language.

## H2 — mild hazard

Usually acceptable, but should be monitored.

## H3 — moderate hazard

Usable, but needs contextual reinforcement, alias shielding, or command-shape protection.

## H4 — high hazard

Too fragile for unconstrained use.
Should require context, longer forms, or confirmation in risky cases.

## H5 — severe hazard

Unsafe as a general spoken command term.
Should be replaced, restricted, or demoted.

## H6 — catastrophic hazard

Likely to cause frequent or dangerous misrecognition.
Should not be used as a canonical term.

---

# 3. Evaluation dimensions

Every lexical item should be judged along these dimensions.

## A. Acoustic confusion risk

How often the term can be misheard as another term.

## B. STT substitution risk

How often engines replace it with a nearby unrelated word.

## C. Command criticality

How dangerous a mistaken execution would be.

## D. Context recoverability

Whether surrounding words make the intended meaning obvious.

## E. Compression survivability

Whether the term still survives when spoken quickly or shortened.

## F. Accent resilience

Whether the term remains distinct across accent variation.

---

# 4. Verb hazard audit

## `focus`

Assessment:
Strong core verb.

Likely confusions:

* focuses
* folk us
* fog us

Risk:
H2

Why it survives:
It is distinctive enough, and the command shapes around it are strong:

* focus terminal
* focus browser
* focus editor

Decision:
Keep as canonical.

Notes:
Very strong first-class verb.

---

## `open`

Assessment:
Good but slightly soft.

Likely confusions:

* opened
* hoping
* hop in

Risk:
H3

Why it mostly survives:
Usually attached to a strong object:

* open terminal
* open file
* open settings

Weakness:
As a single word, it is fragile.

Decision:
Keep as canonical.

Protection:
Avoid relying on lone `open` without object.

---

## `close`

Assessment:
Strong.

Likely confusions:

* clothes
* closed

Risk:
H2

Why it survives:
Usually paired with strong object nouns:

* close tab
* close panel
* close window

Decision:
Keep as canonical.

---

## `show`

Assessment:
Usable but slightly soft.

Likely confusions:

* show
* showe
* so

Risk:
H3

Why it survives:
Usually anchored by object:

* show logs
* show sidebar
* show problems

Decision:
Keep, but prefer object-required usage.

---

## `hide`

Assessment:
Good.

Likely confusions:

* height
* hi

Risk:
H2

Decision:
Keep.

---

## `run`

Assessment:
Short and somewhat risky in isolation.

Likely confusions:

* one
* done
* ran

Risk:
H4 in isolation
H2 in strong phrase

Examples:

* run cargo build
* run tests
* run server

Why it survives:
The payload following `run` is usually strong enough to disambiguate.

Decision:
Keep as canonical.

Protection:
Do not rely on bare `run` except in tightly bound contexts.

---

## `build`

Assessment:
Strong enough, but can blur with billed.

Likely confusions:

* billed
* built

Risk:
H3

Why it survives:
Good semantic context:

* build project
* build workspace
* build api

Decision:
Keep.

---

## `test`

Assessment:
Strong.

Likely confusions:

* tests
* text

Risk:
H3

Why it survives:
Usually followed by clear target:

* test file
* test project
* test module

Decision:
Keep.

---

## `stop`

Assessment:
Short but essential.

Likely confusions:

* top
* stop it
* stock

Risk:
H4

Why it survives:
Reflex semantics justify keeping it.

Decision:
Keep as sacred reflex word.

Protection:
Because it is reflex-critical, false negatives are worse than false positives in some contexts, but false positives are still dangerous.
This means runtime policy must privilege immediate halt behavior over destructive interpretation.

---

## `select`

Assessment:
Strong.

Likely confusions:

* selects
* slack
* collect

Risk:
H2

Decision:
Keep.

---

## `delete`

Assessment:
High criticality verb with moderate speech risk.

Likely confusions:

* elite
* deleted
* delete it

Risk:
H4

Why it is dangerous:
High-impact action.

Decision:
Keep as canonical because it is semantically precise.

Protection:

* explicit object required for destructive use
* confirmation in medium/high-risk contexts
* no pronoun-only destructive execution

---

## `rename`

Assessment:
Phonetically weaker than it looks.

Likely confusions:

* re name
* rename it
* main name

Risk:
H3

Why it survives:
Usually paired with symbol/file target.

Decision:
Keep.

---

## `comment`

Assessment:
Moderate.

Likely confusions:

* comment
* command
* comments

Risk:
H3

Important note:
`comment` and `command` are not far enough apart for careless expert compression.

Decision:
Keep canonical verb, but do not allow compressed ambiguous forms around it.

---

## `uncomment`

Assessment:
Surprisingly decent because of length and structure.

Likely confusions:

* uncommented
* on comment

Risk:
H3

Decision:
Keep.

---

## `search`

Assessment:
Moderately risky.

Likely confusions:

* church
* surge
* searches

Risk:
H3

Why it survives:
Usually scope plus payload makes intent clear:

* search files auth token
* search page websocket

Decision:
Keep.

---

## `find`

Assessment:
Short but robust enough.

Likely confusions:

* fine
* finds

Risk:
H3

Why it survives:
Local-scope semantics help.

Decision:
Keep.

---

## `inspect`

Assessment:
Strong, distinctive.

Likely confusions:

* in spec
* inspects

Risk:
H2

Decision:
Keep.

---

## `explain`

Assessment:
Strong enough, though sometimes clipped.

Likely confusions:

* explain it
* explain
* ex plane

Risk:
H2

Decision:
Keep.

---

## `compare`

Assessment:
Strong.

Likely confusions:

* compares
* compare to

Risk:
H2

Decision:
Keep.

---

## `move`

Assessment:
Strong enough.

Likely confusions:

* moon
* moved

Risk:
H2

Decision:
Keep.

---

## `scroll`

Assessment:
Moderately fragile.

Likely confusions:

* scrawl
* crawl
* scrolls

Risk:
H3

Why it survives:
Usually attached to direction or viewport target:

* scroll down
* scroll page top

Decision:
Keep.

---

## `go`

Assessment:
Very weak in isolation.

Likely confusions:

* go
* code-adjacent fillers
* clipped prefixes

Risk:
H4

Why it can remain:
Because it is usually followed by strong location phrase:

* go line 42
* go top
* go bottom

Decision:
Keep but only as location-navigation verb, not a general-purpose command stem.

---

## `next`

Assessment:
Strong.

Likely confusions:

* text
* nexts

Risk:
H2

Decision:
Keep.

---

## `previous`

Assessment:
Longer but robust.

Likely confusions:

* previous
* previews

Risk:
H2

Decision:
Keep.

---

## `click`

Assessment:
Acceptable for domain use.

Likely confusions:

* clique
* quick
* clock

Risk:
H3

Decision:
Keep as domain-scoped, not universal-core.

---

# 5. Reserved word hazard audit

Reserved words need stricter treatment because they affect reflexes, chooser, and control state.

## `cancel`

Assessment:
Strong.

Likely confusions:

* council
* canceled

Risk:
H2

Decision:
Keep sacred.

---

## `undo`

Assessment:
Strong.

Likely confusions:

* undo
* into

Risk:
H2

Decision:
Keep sacred.

---

## `redo`

Assessment:
Good enough.

Likely confusions:

* re do
* radio in poor STT

Risk:
H3

Decision:
Keep sacred.

---

## `mute`

Assessment:
Strong.

Likely confusions:

* moot

Risk:
H2

Decision:
Keep.

---

## `pause`

Assessment:
Good.

Likely confusions:

* paws
* pause it

Risk:
H2

Decision:
Keep.

---

## `resume`

Assessment:
Moderate.

Likely confusions:

* presume
* resume noun/verb

Risk:
H3

Decision:
Keep.

---

## `sleep`

Assessment:
Good.

Likely confusions:

* sleeve in noisy conditions

Risk:
H2

Decision:
Keep.

---

## `wake`

Assessment:
Moderate.

Likely confusions:

* wait
* wake_up
* make

Risk:
H3

Decision:
Keep, but primarily as control-state term, not overloaded elsewhere.

---

## `yes` / `no`

Assessment:
Phonetically short and dangerous in noise, but unavoidable.

Risk:
H4

Decision:
Keep for confirmation overlays only.

Protection:
Do not let free `yes` or `no` act as broad commands outside explicit confirmation/chooser contexts.

---

## chooser numerals: `one`, `two`, `three`, `four`, `five`

Assessment:
Usable, but only safe inside chooser overlay.

Risks:

* one ↔ run/won
* two ↔ to/too
* four ↔ for
* five ↔ fine

Risk:
H4 generally
H2 inside chooser overlay

Decision:
Keep as chooser vocabulary only when overlay has highest priority.

Protection:
Never treat these as chooser selection words outside chooser context.

---

# 6. Surface noun hazard audit

## `terminal`

Assessment:
Semantically important, phonetically weakish.

Likely confusions:

* thermal
* journal
* terminals

Risk:
H4

Why it is still acceptable:
High operational importance; context often helps.

Decision:
Keep as canonical object.

Protection:

* strong alias support
* preference learning
* contextual disambiguation to integrated/external terminal
* phonetic correction candidates

Recommended alias shield set:

* terminal
* shell
* console

---

## `editor`

Assessment:
Strong.

Likely confusions:

* editors
* editor

Risk:
H2

Decision:
Keep.

---

## `browser`

Assessment:
Moderately fragile.

Likely confusions:

* bowser
* brother
* browsers

Risk:
H3

Decision:
Keep.

Alias shield set:

* browser
* web
* web browser

---

## `explorer`

Assessment:
Moderate.

Likely confusions:

* explore
* explorer
* employer in noisy STT

Risk:
H3

Decision:
Keep.

---

## `sidebar`

Assessment:
Good enough.

Likely confusions:

* side bar
* sidebar

Risk:
H2

Decision:
Keep.

---

## `panel`

Assessment:
Fine.

Likely confusions:

* panels
* channel in poor STT

Risk:
H2

Decision:
Keep.

---

## `problems`

Assessment:
Good.

Likely confusions:

* problem
* problems

Risk:
H2

Decision:
Keep.

---

## `window`

Assessment:
Good.

Likely confusions:

* windows

Risk:
H2

Decision:
Keep.

---

## `workspace`

Assessment:
Moderate.

Likely confusions:

* work space
* workspace

Risk:
H2

Decision:
Keep.

---

## `dialog`

Assessment:
Moderate.

Likely confusions:

* dialogue
* dialog

Risk:
H2

Decision:
Keep.

---

# 7. Object noun hazard audit

## `file`

Assessment:
Strong.

Likely confusions:

* files
* vile in some accents

Risk:
H2

Decision:
Keep.

---

## `folder`

Assessment:
Strong.

Likely confusions:

* folders

Risk:
H2

Decision:
Keep.

---

## `tab`

Assessment:
Short and somewhat fragile.

Likely confusions:

* tag
* tap

Risk:
H3

Decision:
Keep because it is essential.

Protection:
Prefer phrases like `next tab`, `close tab`, `tab two` rather than lone `tab`.

---

## `pane`

Assessment:
Moderately fragile.

Likely confusions:

* pain
* pen

Risk:
H4

Decision:
Keep, but pair strongly with directional qualifiers:

* left pane
* right pane
* swap panes

This improves survivability.

---

## `line`

Assessment:
Moderately fragile.

Likely confusions:

* lion
* lying
* lines

Risk:
H3

Decision:
Keep because indispensable.

Protection:
`select line 42` is much stronger than bare `line`.

---

## `symbol`

Assessment:
Strong enough.

Likely confusions:

* symbols
* simple

Risk:
H3

Decision:
Keep.

---

## `function`

Assessment:
Good.

Likely confusions:

* functions
* junction in very noisy STT

Risk:
H2

Decision:
Keep.

---

## `class`

Assessment:
Moderately fragile.

Likely confusions:

* glass
* classes

Risk:
H3

Decision:
Keep.

---

## `error`

Assessment:
Good.

Likely confusions:

* era
* errors

Risk:
H2

Decision:
Keep.

---

## `warning`

Assessment:
Good.

Likely confusions:

* warnings
* morning in some accents/noise

Risk:
H3

Decision:
Keep.

---

## `result`

Assessment:
Moderate.

Likely confusions:

* results
* resort in poor STT

Risk:
H3

Decision:
Keep.

---

## `heading`

Assessment:
Good enough.

Likely confusions:

* heading
* headings

Risk:
H2

Decision:
Keep.

---

## `selection`

Assessment:
Strong.

Likely confusions:

* selections

Risk:
H2

Decision:
Keep.

---

# 8. Scope marker hazard audit

## `in`

Assessment:
Very weak acoustically, but structurally necessary.

Risk:
H4

Decision:
Keep because grammar depends on it.

Protection:
Interpret as scope marker only when command shape supports it.

Example:

* run cargo build in terminal
* search logs in project

Do not over-read every `in`.

---

## `to`

Assessment:
Very weak acoustically.

Risk:
H4

Decision:
Keep with structural caution.

Examples:

* switch to browser
* move file to src

---

## `from`

Assessment:
Acceptable.

Risk:
H3

Decision:
Keep.

---

## `on`

Assessment:
Weak.

Risk:
H4

Decision:
Keep but minimize in v0.1 usage.

This reinforces the earlier design instinct to emphasize `in` and `to`, and use `on` sparingly.

---

# 9. Postfix hazard audit

## `and return`

Assessment:
Excellent postfix.

Likely confusions:

* and return
* then return

Risk:
H2

Decision:
Keep as signature Maestro postfix.

This is one of the strongest spoken constructs in the language.

---

## `quietly`

Assessment:
Good enough.

Likely confusions:

* quietly
* quiet lee

Risk:
H3

Decision:
Keep.

---

## `safely`

Assessment:
Good enough.

Likely confusions:

* safely
* safe lee

Risk:
H3

Decision:
Keep.

---

## `here`

Assessment:
Too weak as standalone semantic anchor.

Risk:
H4

Decision:
Keep only in tightly constrained forms.

---

## `now`

Assessment:
Weak and often conversational filler.

Risk:
H4

Decision:
Allow sparingly; do not rely on it for critical semantics.

---

# 10. Abbreviation hazard audit

This is where things become dangerous fast.

## `term`

Assessment:
Potentially workable but not default-safe.

Likely confusions:

* turn
* terms

Risk:
H4

Decision:
Expert mode only.

---

## `defs`

Assessment:
Fragile.

Likely confusions:

* deaths
* defs

Risk:
H4

Decision:
Expert mode only.

---

## `refs`

Assessment:
Fragile.

Likely confusions:

* refs
* wrecks
* breaths in poor STT

Risk:
H4

Decision:
Expert mode only.

---

## `prev`

Assessment:
Somewhat survivable.

Likely confusions:

* pre
* prove

Risk:
H4

Decision:
Expert mode only.

---

## `curr`

Assessment:
Bad for speech.

Likely confusions:
too many clipped outcomes

Risk:
H5

Decision:
Do not recommend as spoken shorthand.

---

## `sym`

Assessment:
Poor.

Likely confusions:
sim, same

Risk:
H5

Decision:
Reject as spoken shorthand.

---

## `func`

Assessment:
Poor.

Likely confusions:
junk, funk, funks

Risk:
H5

Decision:
Reject as spoken shorthand.

---

## `proj`

Assessment:
Poor.

Risk:
H5

Decision:
Reject as spoken shorthand.

---

## shorthand law

Conclusion:
Most textual abbreviations are **not automatically valid spoken abbreviations**.

This should become a formal Maestro law.

---

# 11. High-risk command audit

These are commands where misrecognition could cause harm.

## `delete file ...`

Risk:
High.

Protection required:

* explicit target
* confirmation where policy demands
* no pronoun-only destructive execution

Decision:
Allowed with safeguards.

---

## `close window`

Risk:
Medium.

Protection:
Usually okay, but less dangerous than delete.

Decision:
Allowed.

---

## `stop build`

Risk:
Medium.

Protection:
Context-aware; okay because stoppage is reversible enough.

Decision:
Allowed.

---

## `rename file ...`

Risk:
Medium.

Protection:
Explicit target required.

Decision:
Allowed.

---

## `run privileged command`

Risk:
High.

Protection:

* secure mode aware
* confirmation
* possible speaker verification
* explicit executor target in some environments

Decision:
Allowed only with policy.

---

## `send ...`

Not yet core, but future note:
This will be one of the highest-risk verbs and should receive phonetic hardening plus confirmation rules.

---

# 12. Chooser vocabulary audit

Chooser words must be extremely stable.

## Keep

* one
* two
* three
* four
* five
* cancel
* confirm
* always
* prefer

## caution

`always` and `prefer` are acceptable, but for quick speech they may still need visible UI reinforcement.

Recommended chooser grammar examples:

* one
* two
* cancel
* always one here
* prefer two in code

These are good enough because chooser overlay narrows interpretation space.

---

# 13. Wake-word separation rules

Critical principle:
The wake word must be phonetically distant from core commands.

That means it must not resemble:

* focus
* stop
* open
* run
* one
* undo
* browser
* terminal

And must not be easy to trigger from casual conversation.

This belongs in the broader Maestro wake architecture, but it should be recorded now as a phonetic law.

---

# 14. Recommended replacements and cautions

## Keep unchanged

Strong enough to remain canonical:

* focus
* close
* select
* inspect
* explain
* compare
* editor
* file
* folder
* function
* error
* selection
* and return

## Keep with caution

Retain, but protect with context/grammar:

* open
* run
* build
* test
* stop
* search
* scroll
* go
* terminal
* browser
* tab
* pane
* line
* in
* to
* quietly
* safely

## Restrict

* here
* now
* most spoken abbreviations
* lone high-risk verbs without object

## Reject as spoken shorthand

* curr
* sym
* func
* proj

---

# 15. Command-shape survivability rules

A command becomes stronger when it has multiple reinforcing tokens.

## strong command shape

* focus terminal
* run cargo build
* search files websocket timeout
* select line forty two
* rename symbol token map

## weak command shape

* run it
* go there
* do build
* term build
* open this

This gives us a powerful general rule:

**Speech survivability is not only about words; it is about command shape.**

---

# 16. Formal laws to freeze

## Law 1

Canonical spoken vocabulary must optimize for phonetic survivability, not literary elegance.

## Law 2

High-risk commands must use explicit objects and stronger command shapes.

## Law 3

Short spoken abbreviations are opt-in and must be separately audited for speech safety.

## Law 4

Weak pronoun-based commands remain disallowed on the deterministic lane unless a strong typed referent exists.

## Law 5

Alias systems may act as phonetic shields for common STT substitutions.

## Law 6

Scope markers and postfixes must be interpreted structurally, not loosely.

## Law 7

Chooser vocabulary is safe because chooser overlay narrows interpretation space; outside chooser, the same words may be unsafe.

## Law 8

Wake-word design must remain phonetically distant from command vocabulary.

---

# 17. First phonetic hazard table summary

## Low / mild hazard

Good core terms.

* focus
* close
* select
* inspect
* explain
* compare
* editor
* file
* folder
* function
* error
* selection
* sidebar
* panel
* workspace
* cancel
* undo
* mute

## Moderate hazard

Usable with normal structural safeguards.

* open
* build
* test
* rename
* comment
* uncomment
* search
* find
* scroll
* browser
* explorer
* warning
* result
* line
* tab
* safely
* quietly

## High hazard

Keep, but only with strong context and safeguards.

* run
* stop
* delete
* terminal
* pane
* go
* in
* to
* here
* now
* yes
* no
* chooser numbers outside chooser context
* most short spoken abbreviations

## Severe hazard

Reject or heavily restrict as spoken shorthand.

* curr
* sym
* func
* proj

---

# 18. What this means for Maestro

This audit tells us something important:

**the core Maestro vocabulary is mostly good.**

That is a major win.

The language does **not** need radical redesign.
It needs:

* stronger safeguards around a small set of risky terms
* alias shielding for fragile nouns like `terminal`
* strict restriction of spoken abbreviations
* explicit-object rules for dangerous actions
* future STT fuzz testing

So the conclusion is:

** Maestro's lexicon is viable, but must be hardened by policy and registry design.**

---

# 19. Highest-value next artifacts from this audit

This audit should now produce four concrete follow-up artifacts:

## A. Phonetic shield alias table

Examples:

* terminal ← shell, console, thermal? maybe correction candidate only, not formal alias
* browser ← web, web browser
* editor ← code, vscode

## B. Dangerous command protection table

Examples:

* delete file
* rename file
* run privileged command
* stop process
* close window

## C. Spoken shorthand whitelist

Only a very small list, expert-mode only.

## D. STT fuzz corpus

Canonical command → likely corrupted transcripts → expected recovery behavior.
