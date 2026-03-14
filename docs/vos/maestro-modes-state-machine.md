## Maestro should not use one flat mode switch

That would become a mess immediately.

Instead, Maestro should use **orthogonal state axes**.

Meaning:

* one axis for readiness
* one axis for interaction style
* one axis for domain focus
* one axis for security posture
* one axis for temporary control overlays

That is the correct architecture.

# Maestro Modes And State Machine v0.1

## Purpose

This model defines:

* what "mode" means in Maestro
* which states are global, temporary, or contextual
* how modes interact
* which states override others
* how transitions occur
* what interrupts what
* how parsing and execution are affected by state

This is what keeps Maestro from becoming chaotic.

---

# 1. First law of modes

## Modes are not one variable. Modes are a state vector.

Maestro should not think:

* current_mode = coding

It should think more like:

* readiness_state = listening
* interaction_mode = command
* domain_mode = coding
* security_mode = normal
* output_mode = normal
* overlay_mode = none

That is much stronger.

---

# 2. The five primary state axes

I would define these five axes.

## A. Readiness state

Is Maestro awake and actively listening?

## B. Interaction mode

What kind of speech is being interpreted?

## C. Domain mode

Which working domain has current priority?

## D. Security mode

What trust and authorization posture is active?

## E. Overlay mode

Is Maestro temporarily inside chooser, slot prompt, confirmation, or another interrupting micro-state?

This is the right foundation.

---

# 3. Axis A: Readiness state

This controls whether Maestro is actively available.

## States

* asleep
* armed
* listening
* busy
* suspended

## Meaning

### asleep

Maestro is inactive except for wake detection or explicit activation.

### armed

Wake engine active, but no current utterance session.

### listening

Actively receiving and interpreting speech.

### busy

Executing, speaking, or resolving a command while still able to receive reflex interruption.

### suspended

Temporarily unavailable due to higher-level block, configuration, or explicit pause.

## Transitions

* asleep → armed via wake
* armed → listening via speech start
* listening → busy via accepted command execution
* busy → armed after completion
* any → suspended via policy/system pause
* suspended → armed via resume

## Important rule

Even in `busy`, reflex commands must remain available.

---

# 4. Axis B: Interaction mode

This determines how speech should be interpreted.

## States

* command
* dictation
* conversational
* command_locked
* silent_command

## Meaning

### command

Default operating mode.
Speech is parsed primarily as commands.

### dictation

Speech is primarily text input.
Command set becomes restricted and special dictation commands become active.

### conversational

Higher tolerance for free-form cognitive requests.
Still not a generic chatbot shell, but freer than command mode.

### command_locked

A stricter version of command mode where casual natural language is deprioritized and the parser expects strong canonical grammar.

### silent_command

Command mode with minimal or no spoken acknowledgments.

## Important rule

Interaction mode changes interpretation, not world structure.

---

# 5. Axis C: Domain mode

This determines which object families and surface assumptions get priority.

## States

* neutral
* coding
* browser
* terminal
* system
* research

## Meaning

### neutral

No special domain bias.

### coding

Favor editor/code objects, build/test routes, integrated terminal assumptions, symbol semantics.

### browser

Favor browser surfaces, results, tabs, headings, fields.

### terminal

Favor shell/process/log semantics.

### system

Favor windows, workspaces, settings, desktop surfaces.

### research

Favor reading, browsing, comparison, notes, and information gathering.

## Important rule

Domain mode biases ranking. It should not invent legality.

---

# 6. Axis D: Security mode

This controls what trust posture Maestro uses.

## States

* normal
* secure
* shared_room
* restricted
* privileged_confirm

## Meaning

### normal

Standard local workstation posture.

### secure

Higher-trust operations require stronger confirmation and possibly speaker-aware authorization.

### shared_room

Assume multiple nearby speakers or environmental contamination risk.
More conservative on medium/high-impact actions.

### restricted

Only a reduced action set is allowed.

### privileged_confirm

A temporary elevated state for executing a privileged command after proper confirmation.

## Important rule

Security mode must affect:

* confirmation thresholds
* chooser permissiveness
* speaker identity requirements
* action allow/block behavior

It must not silently relax itself.

---

# 7. Axis E: Overlay mode

This is extremely important.

These are temporary micro-states that interrupt normal parsing.

## States

* none
* chooser
* slot_prompt
* confirmation
* correction
* onboarding
* tutorial

## Meaning

### chooser

System is awaiting ranked interpretation selection.

### slot_prompt

System needs one missing required value.

### confirmation

System is awaiting approval for a risky action.

### correction

System is waiting for command correction or override.

### onboarding

Temporary guided learning state.

### tutorial

Explicit teaching/demo state.

## Important rule

Overlay modes temporarily capture interpretation priority.

If `chooser` is active and user says:

* one

that must mean chooser option one, not some unrelated command.

---

# 8. Why this multi-axis design is superior

Because otherwise you get impossible flat-mode combinations like:

* coding-secure-dictation-chooser-busy-terminal-mode

That is not a real mode.
That is a **state composition**.

So Maestro should model:

* readiness = busy
* interaction = command
* domain = coding
* security = secure
* overlay = chooser

That is clean, composable, and rigorous.

---

# 9. Effective state resolution

At runtime, Maestro should compute an **effective interpretation state**.

This is the merged result of all axes.

## Example

User is in VS Code, currently coding, chooser is open, system is secure.

Effective state:

* readiness = listening
* interaction = command
* domain = coding
* security = secure
* overlay = chooser

Interpretation priority becomes:

1. chooser grammar
2. reflex grammar
3. secure confirmation rules
4. command/coding grammar

This is the kind of layered logic we want.

---

# 10. Priority rules between axes

Not all axes should have equal force.

## Proposed priority order

1. overlay mode
2. reflex interruption
3. security mode
4. interaction mode
5. domain mode
6. readiness/background context

This means:

* chooser overrides normal parsing
* stop/cancel still overrides chooser if appropriate
* secure policy may block something even if grammar matches
* interaction mode decides whether input is command vs dictation
* domain mode biases ranking inside that

That is exactly right.

---

# 11. Reflex across all modes

This needs to be explicit.

## Reflex availability rule

The reflex family remains active in every state except full suspension or explicit safety lockout cases.

So in:

* dictation
* chooser
* confirmation
* busy
* conversational

these should still work:

* stop
* cancel
* undo
* mute

This is essential for trust.

---

# 12. Dictation mode rules

Dictation mode needs tight rules or it will become messy.

## In dictation mode

* text insertion becomes the default interpretation
* command grammar is restricted
* only high-priority commands remain global
* formatting/dictation commands become active

Examples:

* new line
* new paragraph
* comma
* period
* stop dictation
* undo that

## Important rule

In dictation mode, ambiguous utterances should prefer text over commands unless:

* they are reflex
* they are explicit mode/focus commands
* they are clearly prefixed or otherwise strongly structured

That will make dictation usable.

---

# 13. Command mode rules

## In command mode

* structured spoken commands are preferred
* canonical grammar gets strongest ranking
* ambiguous natural language is not overindulged
* chooser/slot prompt may appear freely for lawful ambiguity

This is the main VOS operating posture.

---

# 14. Conversational mode rules

## In conversational mode

* cognitive bridge commands become easier to trigger
* freeform phrasing tolerance increases
* system can handle more explanatory or planning utterances
* operating commands still work, but should remain canonical where possible

Important:
Conversational mode should not swallow the VOS.

It is still Maestro, not a generic assistant shell.

---

# 15. Coding mode rules

## In coding mode

Bias toward:

* editor surfaces
* file/symbol/function/error/test objects
* integrated terminal as likely terminal referent
* build/test/search-file defaults
* coding command families

Examples:

* "terminal" likely means integrated terminal
* "test" likely means current file or current module depending on project preference
* "definition" means symbol definition

This mode is one of the most important for Maestro.

---

# 16. Browser mode rules

## In browser mode

Bias toward:

* browser/tab/page/result/link/heading objects
* page search scope
* semantic browser actuation
* result navigation

Examples:

* "search" likely means page or web search depending context
* "open first result" strongly binds to browser semantics
* "next heading" is legal and likely

---

# 17. Terminal mode rules

## In terminal mode

Bias toward:

* process, logs, shell commands, command history
* run/stop/clear/show logs semantics
* line-oriented shell operations

Examples:

* "run tests" strongly binds to terminal execution
* "clear" means terminal clear
* "previous command" means shell history

---

# 18. Secure mode rules

This is where VOS seriousness shows.

## In secure mode

* higher-risk actions require stronger confirmation
* voice identity requirements may tighten
* chooser is less willing to auto-default risky actions
* some commands require explicit targets even if preferences exist
* destructive actions fail closed more aggressively

Examples:

* "delete file" requires explicit target
* "send message" requires confirmation
* "run privileged command" may require speaker verification

## Important rule

Secure mode should be visible and audible in a controlled way.

The user must know it is active.

---

# 19. Shared-room mode rules

This is very important for a VOS.

## In shared_room mode

* low-risk commands still work
* medium-risk commands become more conservative
* high-risk commands may require explicit address, confirmation, or verified speaker
* ambient speech should be easier to ignore

Examples:

* "stop" still works
* "open terminal" likely okay
* "delete file" likely blocked or confirmation-gated
* "send that" definitely blocked

This is one of the strongest security concepts for Maestro.

---

# 20. Overlay mode behavior

These need to be crisp.

## Chooser mode

Grammar active:

* one
* two
* three
* cancel
* always one here
* why these options

Timeout:

* yes, context-sensitive

## Slot prompt mode

Grammar active:

* slot value utterance
* cancel
* never mind

Example:
Prompt:

* "Which line?"

Next utterance:

* "forty two"

is interpreted primarily as slot content.

## Confirmation mode

Grammar active:

* yes
* no
* confirm
* cancel
* always require confirmation here
* do not ask again for this low-risk class only if policy allows

## Important rule

Overlay modes should be temporary, focused, and easy to escape.

---

# 21. Mode transitions

We need real lawful transitions.

## Common transitions

### Readiness

* wake → armed
* speech start → listening
* accepted command → busy
* completion → armed

### Interaction

* enter dictation → dictation
* leave dictation → command
* switch to conversation → conversational
* enter command mode → command

### Domain

* explicit command:

  * enter coding mode
* implicit suggestion:

  * active editor context may bias toward coding, but that is not the same as a full mode switch

### Security

* enable secure mode
* leave secure mode
* shared-room auto-trigger possible later via settings/sensors, but not required now

### Overlay

* ambiguity → chooser
* missing slot → slot_prompt
* risky command → confirmation
* resolution/cancel/timeout → overlay none

---

# 22. Explicit vs implicit mode changes

This distinction matters.

## Explicit mode changes

User directly commands the change.

Examples:

* enter coding mode
* leave dictation
* enable secure mode

These are strong and durable.

## Implicit mode biases

System infers probable domain from context.

Examples:

* active VS Code surface may bias toward coding
* active browser surface may bias toward browser

Important:
Implicit bias should **not** silently replace explicit mode.

It should help ranking, not override declared state.

---

# 23. Mode stack vs mode vector

We already decided on state axes, but some modes also need history.

I would define:

## State vector

Always current:

* readiness
* interaction
* domain
* security
* overlay

## Small mode history

Needed for:

* leaving temporary modes
* restoring prior interaction mode
* restoring prior overlay-free state

Examples:

* enter dictation → leave dictation should restore prior interaction mode
* chooser dismissal should restore prior overlay state automatically

So:

* **vector for current truth**
* **small stack for restoration**

That is the right model.

---

# 24. Mode commands as canonical language

These should be first-class and teachable.

## Canonical mode commands

* enter command mode
* enter coding mode
* enter browser mode
* enter terminal mode
* enter dictation
* leave dictation
* enter secure mode
* leave secure mode
* enter quiet mode
* leave quiet mode
* switch to conversation

These should remain stable.

---

# 25. Quiet mode and acknowledgment behavior

This is one of the nicest VOS touches.

## Quiet mode

In quiet mode:

* spoken acknowledgments are minimized
* visual confirmations remain
* reflex/error warnings still speak if necessary
* chooser may appear visually with reduced speech

This is excellent for expert users.

I think quiet mode should affect:

* output behavior only
* not command legality

That is important.

---

# 26. Mode-dependent interpretation examples

## Example 1: "next line"

### Coding mode

Likely:

* move selection or cursor to next line

### Dictation mode

Likely:

* insert newline or literal formatting command depending dictation grammar

### Browser mode

Possibly invalid or low-confidence unless some structured list context exists

This shows why modes matter deeply.

---

## Example 2: "search auth token"

### Coding mode

Likely:

* search files/project

### Browser mode

Likely:

* search page or current web context

### Conversational mode

Could become cognitive search intent if deterministic path weak

---

## Example 3: "terminal"

### Command + coding mode

Could resolve as shorthand for:

* focus terminal

### Dictation mode

Likely literal text unless explicit command prefixing is active

This is exactly the kind of thing the state model must control.

---

# 27. Mode laws v0.1

I would freeze these.

## Law 1

Maestro modes are a state vector, not a single flat mode switch.

## Law 2

Overlay modes have the highest interpretation priority.

## Law 3

Reflex commands remain globally available across nearly all states.

## Law 4

Interaction mode changes how speech is parsed.

## Law 5

Domain mode biases interpretation but does not create legality.

## Law 6

Security mode constrains execution, confirmation, and authorization.

## Law 7

Explicit mode changes outrank implicit contextual bias.

## Law 8

Temporary modes restore cleanly via state history.

These are excellent laws for a VOS.

---
