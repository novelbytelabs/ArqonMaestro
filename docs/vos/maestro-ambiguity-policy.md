Yes — that is the right answer.

If Maestro is **not using an LLM**, then ambiguity should be handled by a **deterministic disambiguation policy**, not by open-ended clarification dialogue.

## The rule

When speech parses into:

* **one strong interpretation** → execute
* **multiple plausible interpretations** → **do not guess**
* **no valid interpretation** → fail closed

## The right mechanism

What you described is strong:

**show ranked interpretations and let the user choose**

That is very Serenade-like, and for a VOS it is actually better than a vague conversational clarification.

## Best pattern

### 1. Parse into candidate commands

Use:

* grammar
* current mode
* current focus surface
* app context
* recent command history
* visible targets
* confidence score

### 2. If confidence is high enough

Execute automatically.

### 3. If confidence is in the gray zone

Show a small disambiguation UI with:

* top 2–5 interpretations
* numbers or short labels
* default highlighted choice

Example:

Spoken:

* "open terminal"

Candidates:

1. Focus external terminal
2. Open integrated terminal
3. Open new terminal tab

### 4. Let user resolve quickly

By:

* voice: "one", "two", "three"
* keyboard
* mouse
* maybe gaze/focus later

## Even better: support "always use this"

That is extremely important.

The chooser should let the user say:

* "two always here"
* "make this default in VS Code"
* "prefer integrated terminal"

That turns ambiguity resolution into **learning without an LLM**.

## So the actual policy should be

### Low-risk commands

* allow chooser UI
* let user select quickly

### High-risk commands

* fail closed unless interpretation is clear
* no guessing
* no silent fallback

## The key architectural idea

This means Maestro needs a real:

**Interpretation Engine**
that outputs:

* candidate intents
* ranked confidence
* ambiguity class
* whether chooser UI is allowed
* whether execution is blocked pending selection

## My blunt answer

Yes — **displaying interpretations and letting the user select is the correct non-LLM solution**.

In fact, for a deterministic VOS, it is often **better** than pretending the system should "chat" its way through ambiguity.

The short principle is:

**rank, present, choose, learn, then reduce future ambiguity.**

That is probably exactly how Maestro should do it.
