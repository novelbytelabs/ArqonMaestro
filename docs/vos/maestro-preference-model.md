
### **Maestro should become more natural, faster, and more precise for its user over time, while remaining lawful, inspectable, and reversible so that it does not silently mutate into chaos.**

# Maestro Preference And Personalization Model v0.1

## Purpose

This model defines:

* what Maestro is allowed to learn
* how preferences are scoped
* how ambiguity resolution becomes more precise over time
* how expert compression evolves safely
* what belongs to preference vs policy vs memory
* how personalization stays deterministic and reversible

This is how Maestro becomes **your** VOS without becoming a random one.

---

# 1. First law of personalization

## Personalization may bias interpretation, but it may not redefine canonical meaning

That means:

* user preference may teach Maestro that `terminal` usually means `integrated_terminal` in VS Code
* user preference may teach Maestro that `build` usually routes through external terminal in project X
* user preference may teach Maestro that `browser` usually means Firefox rather than Chrome

But user preference may **not** silently redefine:

* `focus` into `run`
* `delete` into `close`
* `stop` into `undo`

Canonical language meaning remains stable.

This is the most important law.

---

# 2. What personalization is allowed to affect

I would allow personalization to influence six things.

## A. Surface resolution

Examples:

* `terminal` → integrated terminal in coding mode
* `browser` → Brave on this machine
* `editor` → VS Code rather than Pulsar

## B. Scope defaults

Examples:

* `search auth token` defaults to files instead of page
* `test` defaults to current file in coding mode
* `show logs` defaults to terminal logs in this repo

## C. Executor preference

Examples:

* prefer integrated terminal API over focus-transfer terminal typing
* prefer Playwright over UI.Vision in browser
* prefer external terminal for long-running builds

## D. Alias and shorthand enablement

Examples:

* allow `term` as alias for terminal
* allow `defs` as alias for definitions
* allow `build return` as shorthand for `run cargo build and return`

## E. Voice/interaction behavior

Examples:

* quiet acknowledgments by default
* terse chooser UI
* prefer numbered chooser labels
* prefer no spoken confirmations for low-risk actions

## F. Preference-ranked interpretation

Examples:

* when two candidates are legal, prefer the one the user chose five times before in this context

These are all excellent personalization targets.

---

# 3. What personalization must not affect

This is equally important.

## Personalization must not silently alter:

### A. Safety policy

Examples:

* a risky delete command cannot become auto-approved just because the user uses it often

### B. Security policy

Examples:

* voice identity requirements
* secure mode restrictions
* confirmation tiers for privileged commands

### C. Canonical verb meaning

Examples:

* `open`, `close`, `focus`, `run`, `delete`, `stop`

### D. Global reflex semantics

Examples:

* stop
* cancel
* undo
* mute

### E. Legal/illegal verb-object boundaries

Examples:

* `rename browser` does not become valid just because a user says it a lot

This separation keeps Maestro constitutional.

---

# 4. Preference versus policy versus memory

This distinction must be formalized early.

## Preference

A learned or user-set bias among **already legal** options.

Example:

* in VS Code, `terminal` means integrated terminal

## Policy

A rule about what is allowed, blocked, or confirmation-gated.

Example:

* deleting files requires confirmation in secure mode

## Memory

A retained fact about prior state, history, or context.

Example:

* last active project was `arqon-maestro`
* previous focus was editor
* user recently searched for `auth token`

## Important rule

Preference can bias lawful interpretation.
Policy gates execution.
Memory supplies context.

They are not the same thing.

---

# 5. Preference scopes

Preferences should not all live at one level.
They should be scoped.

I would define a six-level hierarchy.

## Scope 1: Global

Applies everywhere unless overridden.

Examples:

* `browser` means Firefox
* chooser uses numeric labels
* acknowledgments are terse

## Scope 2: Machine / environment

Applies on this machine or environment only.

Examples:

* external terminal is Alacritty on workstation
* browser is Chrome on work laptop

## Scope 3: App

Applies inside an app.

Examples:

* in VS Code, `terminal` means integrated terminal
* in browser, `search` defaults to page scope

## Scope 4: Mode

Applies inside a mode.

Examples:

* in coding mode, `test` means current file by default
* in browser mode, `open result` means current tab unless specified

## Scope 5: Project / workspace

Applies inside a repo or workspace.

Examples:

* in `ArqonMaestro`, `build` means `cargo build`
* in another repo, `build` means `npm run build`

## Scope 6: Surface / subcontext

Applies in a very narrow context.

Examples:

* in VS Code integrated terminal, `clear` means terminal clear
* in problems panel, `next` means next error

## Resolution rule

Narrower scope overrides broader scope.

So:
surface > project > mode > app > machine > global

This is a very strong model.

---

# 6. Preference object types

Preferences should be typed, not stored as random freeform settings.

I would define these preference classes.

## A. Surface binding preferences

Examples:

* noun=`terminal` → `integrated_terminal`
* noun=`browser` → `firefox`

## B. Scope default preferences

Examples:

* verb=`search` default scope=`files`
* verb=`test` default scope=`current_file`

## C. Executor preferences

Examples:

* action=`run cargo build` prefer executor=`integrated_terminal_api`
* action=`open result` prefer executor=`playwright`

## D. Alias preferences

Examples:

* allow alias=`term` for `terminal`
* allow alias=`defs` for `definitions`

## E. Shorthand macro preferences

Examples:

* `build return` expands to `run cargo build and return`
* `test quiet` expands to `run cargo test quietly`

## F. Interaction preferences

Examples:

* chooser style=`minimal`
* spoken confirmations=`off` for low risk
* silent acknowledgments=`on`

## G. Voice/persona preferences

Examples:

* default system voice
* warning voice
* agent voice mappings

Those belong here too, though they are not purely grammar-level.

---

# 7. How preferences are created

Preferences should come from three sources only.

## A. Explicit user configuration

The cleanest source.

Examples:

* settings UI
* config file
* explicit voice command:

  * "prefer integrated terminal here"
  * "always use Firefox for browser"
  * "make chooser silent"

## B. Structured chooser learning

When a chooser is shown and the user selects:

* one
* two
* three

the system may offer or accept:

* "always use this here"
* "prefer this in VS Code"
* "always use this for build"

This is one of the most important learning paths.

## C. Repeated confirmed behavior

The system may suggest a preference after repeated identical selections, but it should not silently hard-commit high-impact semantic changes without visibility.

Example:

* after six identical choices:

  * "You usually mean integrated terminal here. Set as default?"

That is safer than silent drift.

---

# 8. How preferences are stored

Preferences should be stored as explicit records.

## Suggested fields

* `preference_id`
* `preference_type`
* `canonical_target`
* `scope_type`
* `scope_key`
* `conditions`
* `priority`
* `source`
* `created_at`
* `updated_at`
* `times_confirmed`
* `times_overridden`
* `active`

## Example

* preference_type: `surface_binding`
* canonical_target: `integrated_terminal`
* scope_type: `app+mode`
* scope_key: `vscode:coding`
* source: `chooser_confirmed`
* times_confirmed: `8`
* times_overridden: `1`

This makes personalization auditable.

---

# 9. Preference resolution order

When Maestro interprets a command, preference lookup should happen in a stable order.

## Proposed order

1. exact surface/situation-specific preference
2. project preference
3. mode preference
4. app preference
5. machine preference
6. global preference
7. system default

This keeps behavior predictable.

---

# 10. Preference confidence and decay

Not every learned preference should be equally strong forever.

I would define simple strength levels:

## Levels

* `suggested`
* `provisional`
* `confirmed`
* `locked`

### Suggested

Observed pattern, but not committed.

### Provisional

Small number of confirmations.

### Confirmed

Repeated successful use.

### Locked

Explicitly user-set and should not drift automatically.

## Important rule

Explicit user-set preferences outrank learned preferences.

## Decay rule

If a confirmed learned preference is repeatedly overridden, Maestro should reduce confidence and possibly prompt for revision.

This prevents stale habits from fossilizing.

---

# 11. Personalization and compression

This is where the language starts becoming truly yours.

## Compression should be preference-mediated, not random

Good:

* user repeatedly uses `focus terminal`
* Maestro allows alias `terminal`
* later user explicitly enables `term`

Bad:

* system randomly assumes `term` means terminal because it sounds plausible

So shorthand should emerge through:

* explicit enablement
* chooser-based learning
* repeated confirmed usage

## Compression levels

### L0

Natural form

* focus terminal

### L1

Standard form

* terminal

### L2

Short alias

* term

### L3

Workflow macro

* build return

Each higher level should remain anchored to a visible canonical form.

---

# 12. Personalization and ambiguity

This is one of the biggest wins.

Without preferences:

* `focus terminal` might produce chooser:

  1. integrated terminal
  2. external terminal

With preferences:

* `focus terminal` can directly resolve to integrated terminal in VS Code coding mode

That means preferences are not just comfort.
They are a key ambiguity-reduction layer.

## Important rule

Preferences may break ties between legal candidates.
They may not manufacture legality where none exists.

---

# 13. Personalization and safety

Preferences must never quietly make the system less safe.

So these rules should hold:

## Rule 1

Preferences cannot disable required confirmations for high-risk actions unless the user explicitly changes policy.

## Rule 2

Preferences cannot bypass speaker verification requirements.

## Rule 3

Preferences cannot make ambiguous destructive actions auto-execute without sufficient target identity.

## Rule 4

Preferences may simplify low-risk repetitive operations.

Examples:

* default build route
* default browser
* default search scope
* default terminal

That is a healthy boundary.

---

# 14. User-visible preference management

A real VOS needs visible preference control.

Maestro should eventually expose:

## A. Preference browser

Show:

* what Maestro has learned
* where each preference applies
* how strong it is
* whether it was explicit or learned

## B. Edit controls

Allow:

* disable
* reset
* lock
* broaden scope
* narrow scope

## C. Spoken preference commands

Examples:

* always use integrated terminal here
* prefer external terminal globally
* reset terminal preference here
* make this the default build route
* never use UI.Vision for browser here

This is a huge part of the magic.

---

# 15. First spoken personalization grammar

These should be first-class commands eventually.

## Preference-setting

* always use this here
* always use this in VS Code
* prefer this here
* prefer this for build
* make this default
* remember this choice

## Preference-resetting

* forget this preference
* reset terminal preference here
* stop preferring this
* use chooser next time

## Preference-inspection

* inspect preferences here
* what does terminal mean here
* show my build preferences
* why did you choose that

That last one is very important.

A trustworthy VOS should be able to answer:
**why did you interpret that this way?**

---

# 16. Preference examples

## Example 1: terminal preference

Context:

* app=`vscode`
* mode=`coding`

User says:

* focus terminal

Chooser:

1. integrated terminal
2. external terminal

User says:

* one always here

Stored:

* terminal → integrated_terminal
* scope=`app+mode`

## Example 2: build route preference

User repeatedly chooses:

* run cargo build in external terminal

Later:

* build project

System may suggest:

* prefer external terminal for build in this project?

## Example 3: search scope preference

User often says:

* search auth token

Chooser repeatedly resolves to:

* search files auth token

System may confirm:

* default `search` to files in coding mode?

That is exactly the kind of useful learning Maestro should do.

---

# 17. Personalization laws v0.1

I would freeze these.

## Law 1

Personalization biases interpretation but does not redefine canonical meaning.

## Law 2

Preference, policy, and memory are distinct systems.

## Law 3

Preferences are scoped, typed, and auditable.

## Law 4

Explicit user preferences outrank learned preferences.

## Law 5

Preferences may break ties among legal interpretations but may not create illegal ones.

## Law 6

Preferences may improve speed and compression only when meaning remains stable.

## Law 7

Safety, security, and confirmation policy are not silently weakened by preference learning.

## Law 8

Users must be able to inspect, reset, and override learned preferences.

These are extremely strong laws for a VOS.
