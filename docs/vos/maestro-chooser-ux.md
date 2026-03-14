# Maestro Chooser And Clarification UX v0.1

## Purpose

The chooser system defines:

* when Maestro should interrupt execution and present alternatives
* how alternatives are shown
* how the user selects one
* how the system learns from selection
* how chooser behavior changes by mode, risk, and surface
* when chooser should be suppressed in favor of refusal

This is the deterministic replacement for vague conversational clarification.

---

# 1. First law of the chooser

## The chooser exists to resolve lawful ambiguity, not to rescue bad parsing

This means:

### Good chooser use

* two or more valid interpretations remain
* all are legal
* the action is low- or medium-risk
* the user can quickly choose

### Bad chooser use

* the utterance is too vague to interpret responsibly
* the action is high-risk and target identity is weak
* the system is actually confused rather than productively ambiguous

So the chooser is for:
**multiple valid meanings**

Not for:
**system ignorance**

That distinction matters a lot.

---

# 2. The chooser decision policy

There are four possible interpretation outcomes.

## Outcome A: Execute directly

One dominant lawful candidate exists.

Example:

* focus terminal

## Outcome B: Show chooser

Multiple lawful candidates remain close enough that the system should not guess.

Example:

* search auth token
  Candidates:

1. search files auth token
2. search page auth token
3. search project auth token

## Outcome C: Ask a structured slot question

A required qualifier is missing, but the command shape is clear.

Example:

* go line
  Prompt:
* "Which line?"

This is not a full chooser. It is a one-slot clarification.

## Outcome D: Fail closed

No lawful deterministic interpretation exists or the action is too risky to guess.

Example:

* delete it

This should not show a chooser unless there are very strong, clearly named candidates.

---

# 3. Types of clarification UI

Maestro should have **three clarification mechanisms**, not one.

## A. Ranked chooser

Shows 2–5 full candidate interpretations.

Use when:

* there are multiple legal full interpretations
* the user can meaningfully choose among them

Example:

* terminal means:

  1. integrated terminal
  2. external terminal

## B. Slot prompt

Requests one missing piece of information.

Use when:

* the grammar is otherwise clear
* a specific required slot is missing

Example:

* open file
  Prompt:
* "Which file?"

## C. Explicit refusal

No chooser, no slot prompt.

Use when:

* target is too vague
* action is too risky
* system cannot narrow responsibly

Example:

* delete that

This should refuse cleanly.

---

# 4. Chooser triggering rules

I would define chooser triggers like this.

## Show chooser when:

* 2–5 valid candidates remain
* the score gap is below auto-execute threshold
* the action is not high-risk enough to require explicit full restatement
* the user can resolve the ambiguity quickly

## Use slot prompt when:

* only one slot is missing
* the rest of the command is stable
* the missing slot is small and easy to provide

## Refuse when:

* more than 5 weak candidates remain
* target identity is unresolved in a destructive action
* the system cannot produce a responsibly ranked list
* security policy forbids ambiguous execution

This keeps the chooser disciplined.

---

# 5. The chooser should be lightweight, not chatty

A Voice OS chooser must not feel like a chatbot.

It should be:

* small
* ranked
* visual
* instantly actionable
* optionally spoken in minimal form
* dismissible
* keyboard/voice selectable

So the default chooser should look like:

## Visual structure

* short title
* 2–5 numbered options
* default highlighted option if appropriate
* optional "always use this here"
* optional cancel

Example:

**Choose terminal**

1. Integrated terminal
2. External terminal
3. Current terminal pane

Footer:

* say "one", "two", "three"
* or press 1, 2, 3
* say "always one here"

That is ideal.

---

# 6. Voice interaction with chooser

This is crucial.

The chooser must be fully operable by voice.

## Required chooser voice commands

* one
* two
* three
* four
* five
* cancel
* never mind
* always one here
* always two in this app
* prefer one for build
* show more

These should be part of the chooser grammar, not regular operating grammar.

## Important rule

While chooser is active, chooser commands temporarily get priority over normal operating commands.

So if chooser is open and user says:

* "one"

that selects option 1, not something else.

---

# 7. The chooser mode

This suggests a real temporary mode:

## `chooser mode`

When chooser is active:

* numeric selection commands are captured
* "cancel" dismisses chooser
* "always X here" stores scoped preference
* normal grammar is partially suspended or deprioritized

This is important for reliable operation.

---

# 8. Visual placement

Chooser placement matters.

I would define three presentation styles.

## A. Inline micro chooser

For app-local choices inside active workspace.

Examples:

* small overlay near cursor/focus region
* inline panel in editor zone

Best for:

* low-friction, current-surface ambiguity

## B. Global tray/overlay chooser

For system-level ambiguity.

Examples:

* choosing browser
* choosing terminal
* choosing execution route

Best for:

* cross-surface or OS-level choices

## C. Voice-only fallback chooser

If no visual surface is appropriate or available.

Spoken:

* "I found two options. Say one for integrated terminal, two for external terminal."

This should exist, but visual should be preferred whenever possible.

For a VOS, visual+voice chooser is the strongest default.

---

# 9. Chooser option design

Options must be **short and canonical**, not verbose prose.

Bad:

* "Use the built-in terminal inside Visual Studio Code"

Better:

* Integrated terminal

Bad:

* "Search across all files in the current project for auth token"

Better:

* Search files: auth token

So each option should have:

* short label
* canonical interpretation
* optional subtitle if needed

## Option fields

* `rank`
* `label`
* `canonical_form`
* `scope_hint`
* `risk_level`
* `preference_action_available`

This keeps the chooser clean.

---

# 10. Auto-execute thresholds

We need a policy so chooser does not appear too often.

I would define three score zones.

## Green zone

One dominant candidate.

* execute automatically

## Yellow zone

Two or more strong candidates close together.

* chooser

## Red zone

No reliable interpretation or risky ambiguity.

* slot prompt or refusal

This should be tuned by lane.

### Reflex lane

Almost never chooser.
Execute or refuse.

### Focus lane

Chooser okay if options are clear.

### Operating lane

Chooser common and useful.

### Cognitive lane

Usually not chooser; either parse to cognitive intent or ask structured follow-up.

---

# 11. Risk-aware chooser policy

Chooser should behave differently by risk class.

## Low-risk actions

Examples:

* focus terminal
* search files auth token
* show logs

Chooser is fine.

## Medium-risk actions

Examples:

* close file
* stop process
* switch branch

Chooser is okay if targets are explicit and clear.

## High-risk actions

Examples:

* delete file
* send message
* push changes
* run privileged shell command

Chooser should not be used to "guess from vagueness."
For these, require:

* explicit target
* maybe explicit confirmation
* maybe speaker-aware authorization

This is critical.

---

# 12. Chooser and preference learning

This is one of the most powerful parts.

The chooser is not just a resolver.
It is a **trainer**.

## After selection, chooser may offer:

* always use this here
* prefer this in this app
* make this the default
* use chooser next time

These should be spoken and clickable options.

Example:
User says:

* focus terminal

Chooser:

1. Integrated terminal
2. External terminal

User says:

* one always here

Stored:

* surface binding preference
* scope=`app+mode`

This is exactly how Maestro becomes personalized.

---

# 13. Chooser and memory

The chooser should remember recent ambiguity contexts.

Examples:

* last chooser for "terminal" in VS Code
* last chooser for "search" in coding mode
* last chooser for "build" in this project

This allows:

* better ranking next time
* smarter default highlighting
* fast repeated selections

But:

* memory should support choice
* not silently replace explicit preference rules

---

# 14. Slot prompt design

Slot prompts are different from choosers and need their own UX.

## Good slot prompt examples

* "Which file?"
* "Which line?"
* "Which terminal?"
* "Which branch?"
* "Say the target."

These should be:

* extremely short
* single-slot
* stateful for one follow-up utterance
* cancelable

## Slot mode

While slot prompt is active:

* next utterance is parsed primarily as slot content
* not as a full new command, unless clearly unrelated

That is another temporary mode, like chooser mode.

---

# 15. Refusal UX

A great VOS must refuse well.

Refusals should be:

* brief
* precise
* non-judgmental
* actionable

Bad:

* "I'm sorry, I didn't understand your request"

Better:

* "Target unclear."
* "Which file?"
* "Delete requires an explicit target."
* "No lawful interpretation."

That tone is very important for Maestro's identity.

---

# 16. Chooser verbosity levels

Users should be able to control chooser verbosity.

## Minimal

* numbered options only
* no extra explanation

## Standard

* label + small scope hint

## Detailed

* label + rationale + effect

For Maestro, I would default to:
**standard**
and allow expert users to choose **minimal**.

---

# 17. Chooser commands as part of the language

Chooser interaction should itself become part of the VOS language.

## First chooser language

* one
* two
* three
* cancel
* never mind
* always one here
* prefer one in this app
* use chooser next time
* why these options

That last one matters a lot.

A trustworthy VOS should be able to say:

* "I saw terminal could mean integrated terminal or external terminal."

Without turning into a full chatty assistant.

---

# 18. Why-chooser and explainability

The chooser is a perfect place for deterministic transparency.

When user asks:

* why these options

Maestro should answer with concise reasoning:

* "Terminal matched two known surfaces here."
* "Search lacked a scope, so I offered files, page, and project."
* "Delete target was ambiguous, so execution was blocked."

This is huge for trust.

---

# 19. Chooser dismissal rules

Chooser should dismiss when:

* selection is made
* cancel is issued
* focus context changes substantially
* timeout occurs and no selection is made

## Timeout behavior

For low-risk chooser:

* dismiss quietly after a short timeout

For medium-risk chooser:

* dismiss but log unresolved ambiguity

For high-risk unresolved case:

* remain blocked until explicit restatement or cancellation

This prevents stale chooser junk.

---

# 20. Chooser laws v0.1

I would freeze these now.

## Law 1

Chooser resolves lawful ambiguity; it does not compensate for irresponsible guessing.

## Law 2

Chooser is voice-operable, visual-first, and minimally disruptive.

## Law 3

Chooser options must be short, ranked, and canonical.

## Law 4

Chooser may appear only when multiple legal interpretations remain.

## Law 5

High-risk ambiguity should prefer explicitness or refusal over chooser-driven guessing.

## Law 6

Chooser mode temporarily captures numeric and preference-setting speech.

## Law 7

Chooser is a learning surface: selections may create scoped preferences.

## Law 8

Users must be able to inspect why chooser appeared and what each option means.

These are extremely strong VOS laws.

---
