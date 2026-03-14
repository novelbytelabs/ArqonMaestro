
# Maestro Interpretation Engine v0.1

## Purpose

The interpretation engine owns:

* parsing spoken input
* generating candidate meanings
* eliminating illegal interpretations
* ranking valid interpretations
* deciding when to:

  * execute
  * ask for chooser selection
  * fail closed
  * escalate to cognitive lane if allowed

This is the deterministic heart of Maestro.

---

# 1. First law of interpretation

## Interpretation is a staged narrowing process, not a guess

Maestro should not "understand" speech by vibes.

It should:

1. classify the utterance
2. parse candidate structures
3. resolve legal meanings
4. rank them deterministically
5. either execute, choose, or refuse

That is how you build trust.

---

# 2. Inputs to the interpretation engine

The interpreter should consume more than transcript text.

## Required inputs

* final transcript
* partial transcript history
* current mode
* current focus surface
* previous focus surface
* active app
* visible surfaces
* surface capabilities
* recent command history
* user preferences
* alias maps
* verb/object registries
* legality matrix
* security state
* speaker identity state when available

## Optional inputs

* acoustic confidence
* per-token uncertainty from STT
* timestamp
* whether speech occurred during playback
* whether a wake/address pattern was used

This is important because the interpreter is operating on a **world state**, not just a string.

---

# 3. Output of the interpretation engine

The interpreter should output a structured result like:

* `status`
* `lane`
* `candidates`
* `selected_candidate`
* `reason`
* `requires_chooser`
* `requires_confirmation`
* `blocked`
* `preference_update_suggestion`

## Example statuses

* `execute`
* `choose`
* `blocked`
* `cognitive_escalation`
* `dictation`

This keeps handoff to the executor and UI clean.

---

# 4. The interpretation pipeline

I would define the pipeline as ten stages.

## Stage 1: Transcript normalization

Normalize:

* casing
* filler words
* punctuation noise
* polite wrappers
* common alias phrases

Examples:

* "could you please open terminal" → "open terminal"
* "bring up browser" → "open browser"
* "go to code" → "focus editor"

This is not semantic guessing. It is normalization.

---

## Stage 2: Lane classification

Classify the utterance into:

* reflex
* mode
* focus
* operating
* domain
* cognitive
* dictation

This should be done with:

* fixed phrase tables
* grammar patterns
* mode constraints
* active-session state

Lane classification must happen early because:

* "stop" must preempt everything
* "enter dictation" should not be mistaken for content
* "focus terminal" should not be handled like a generic action

---

## Stage 3: Candidate parse generation

Generate candidate parses from the grammar.

Examples for:
"focus terminal"

Candidates:

1. verb=`focus`, object=`terminal`, lane=`focus`
2. alias form of `switch to terminal` collapsed inward

Examples for:
"search auth token"

Candidates:

1. verb=`search`, scope=`files`, payload=`auth token`
2. verb=`search`, scope=`page`, payload=`auth token`
3. verb=`search`, scope=`project`, payload=`auth token`

This stage should generate multiple candidates when ambiguity is lawful.

---

## Stage 4: Canonicalization

Collapse:

* synonyms
* aliases
* surface nicknames
* object aliases
* verb aliases

Examples:

* "VS Code" → `editor`
* "shell" → `terminal` or `external_terminal` depending on preference/context
* "highlight" → `select`
* "launch" → `open`

At the end of this stage, all candidates should use:

* canonical verbs
* canonical objects
* canonical surface identities

---

## Stage 5: Legality filtering

Apply the verb-object matrix and lane rules.

Eliminate:

* illegal verb-object pairs
* impossible surface-target combinations
* actions not allowed in current mode
* actions blocked by security posture

Examples:

* `rename + browser` → eliminate
* `comment + terminal` → eliminate
* `delete file` in secure mode without qualification → maybe block or require confirmation

This stage is one of the biggest sources of trust.

---

## Stage 6: Context binding

Bind remaining candidates against current state.

Examples:

* "terminal" binds to `integrated_terminal` vs `external_terminal`
* "current file" binds to the active editor file
* "next error" binds to the current error stream in editor/problems panel
* "return focus" binds to focus stack top

This is where the surface model and preferences matter most.

---

## Stage 7: Candidate scoring

Each surviving candidate gets a deterministic score.

## Score components

* lane priority
* grammar match strength
* alias penalty or bonus
* mode compatibility
* focus/surface compatibility
* preference match
* recent history relevance
* completeness of required qualifiers
* executor availability
* security compatibility
* acoustic confidence influence

This is **not** a neural score.
It is a deterministic weighted ranking.

---

## Stage 8: Decision policy

Apply thresholds.

### Case A: one dominant candidate

Execute.

### Case B: multiple strong candidates close together

Show chooser UI.

### Case C: no legal candidate

Block or fail closed.

### Case D: no deterministic candidate but valid cognitive route exists

Escalate to cognitive lane if policy allows.

### Case E: dictation mode with no command match

Treat as dictation text.

This stage is where Maestro becomes calm and predictable.

---

## Stage 9: Disambiguation / chooser

If chooser is needed:

* show top 2–5 candidates
* rank clearly
* allow:

  * voice selection: "one", "two", "three"
  * keyboard selection
  * pointer selection
* support:

  * "always use this here"
  * "prefer this in VS Code"
  * "always use integrated terminal"

This is how Maestro learns **without an LLM**.

---

## Stage 10: Preference learning and trace

After resolution:

* update preference candidates if user selected an option
* store interpretation trace
* store failure reason if blocked
* emit structured intent for execution

This is critical because the system should get more deterministic over time.

---

# 5. Candidate structure

Every candidate should carry a full interpretation record.

## Suggested fields

* `candidate_id`
* `lane`
* `canonical_verb`
* `canonical_object`
* `qualifiers`
* `scope`
* `surface_target`
* `executor_candidates`
* `canonical_form`
* `score`
* `alias_used`
* `requires_focus_transfer`
* `requires_confirmation`
* `blocked_reason`
* `chooser_label`

## Example

For:
"run cargo build in terminal and return"

Candidate:

* lane: `operating`
* canonical_verb: `run`
* canonical_object: `cargo build`
* qualifiers: none
* scope: `terminal`
* surface_target: `external_terminal`
* executor_candidates: `[focus_terminal_type, shell_sidecar, integrated_terminal_api]`
* canonical_form: `run cargo build in terminal and return`
* requires_focus_transfer: maybe
* requires_confirmation: no

That is the kind of output you want.

---

# 6. Lane priority rules

These should be hardcoded laws.

## Priority order

1. reflex
2. mode
3. focus
4. operating
5. domain
6. cognitive
7. dictation fallback

This means:

* "stop" beats everything
* "enter dictation" beats plain text
* "focus terminal" beats any weird attempt to treat "focus" as generic prose

This is non-negotiable.

---

# 7. Scoring model v0.1

I would use a transparent weighted scoring model.

## Example weights

* exact grammar match: high
* canonical verb-object pair: high
* strong mode fit: high
* preferred surface binding: medium-high
* alias use: small penalty
* missing qualifier: medium penalty
* executor unavailable: hard penalty
* security conflict: eliminate
* recent repeated choice: bonus
* active surface compatibility: medium bonus

The exact numbers can be tuned later, but the structure matters now.

## Important rule

Security conflicts and illegal pairings do not merely lower score.
They should usually **eliminate** the candidate.

---

# 8. Ambiguity policy

This is where the system stays sane.

## Ambiguity class A: harmless lexical ambiguity

Example:

* "code" → editor / VS Code

Resolve with context/preferences.

## Ambiguity class B: structural ambiguity

Example:

* "search auth token"
  Could mean:
* search files
* search page
* search project

Show chooser if no strong dominant default exists.

## Ambiguity class C: target ambiguity with consequence

Example:

* "delete file"
  Which file?

Do not guess.
Require qualification or chooser depending on policy.

## Ambiguity class D: unsafe action ambiguity

Example:

* "send it"
* "run that"
* "remove this"

Fail closed on deterministic lane unless referent is strongly bound and safe.

---

# 9. Chooser policy

Chooser UI should not appear for everything.
It should appear only when it improves safety and speed.

## Good chooser cases

* multiple low-risk valid interpretations
* target preference establishment
* surface ambiguity
* scoped search ambiguity

## Bad chooser cases

* reflex commands
* high-risk actions with weak target identity
* commands too vague to present responsibly

In those cases, block or require explicitness.

---

# 10. Clarification without conversation

Since you do not want LLM dependence, Maestro should not rely on freeform clarifying chat.

Instead it should use:

## Structured clarification forms

* chooser list
* one-slot follow-up
* required qualifier prompt

Examples:

* "Which terminal?"
* "Which file?"
* "Choose one."
* "Say the line number."

That is enough.

---

# 11. Preference learning model

This is essential.

If the user repeatedly chooses:

* `integrated_terminal` when saying `terminal` in editor context

Maestro should learn:

* in app=`vscode`, mode=`coding`, noun=`terminal`
* prefer `integrated_terminal`

Preferences should be scoped by:

* app
* mode
* surface
* command family
* maybe project

This is how the language becomes personal without becoming chaotic.

---

# 12. Failure model

The interpreter must fail honestly.

## Failure types

* `no_match`
* `illegal_pair`
* `ambiguous_requires_choice`
* `missing_qualifier`
* `security_block`
* `executor_unavailable`
* `cognitive_only`

This is valuable because:

* UI can explain it briefly
* logs become useful
* future tuning is possible

---

# 13. Execution handoff

Once a candidate is selected, the interpreter should hand off:

* canonical intent
* chosen surface/executor
* required focus behavior
* security/confirmation requirements
* rollback metadata
* interpretation trace ID

This keeps interpretation separate from execution.

That separation is very important architecturally.

---

# 14. Example flows

## Example 1: clear deterministic success

Input:

* "focus terminal"

Pipeline:

* normalize
* classify as focus
* parse `focus + terminal`
* canonicalize terminal
* legality check passes
* bind to preferred terminal surface
* score one dominant candidate
* execute

## Example 2: chooser case

Input:

* "search auth token"

Pipeline:

* classify as operating/domain
* parse `search + payload`
* generate scope candidates:

  * files
  * page
  * project
* legality passes
* no dominant preference
* chooser

UI:

1. search files auth token
2. search page auth token
3. search project auth token

## Example 3: fail closed

Input:

* "delete it"

Pipeline:

* parse delete + unresolved pronoun
* no safe bound referent
* action is risky
* blocked

Output:

* blocked_reason=`ambiguous_target`

## Example 4: preference learning

Input:

* "focus terminal"

Chooser presented:

1. integrated terminal
2. external terminal

User says:

* "one always here"

Preference stored:

* app=`vscode`
* mode=`coding`
* noun=`terminal`
* default=`integrated_terminal`

---

# 15. Interpretation laws v0.1

I would freeze these.

## Law 1

Interpretation is staged narrowing, not free guessing.

## Law 2

Lane classification happens before full semantic ranking.

## Law 3

Canonicalization happens before legality filtering.

## Law 4

Illegal or blocked candidates are eliminated, not merely down-ranked.

## Law 5

If one dominant lawful candidate remains, execute.

## Law 6

If several lawful candidates remain, chooser UI may resolve them.

## Law 7

If no lawful deterministic candidate remains, fail closed or escalate per policy.

## Law 8

Preference learning is scoped and explicit.

These laws are excellent for a VOS.

---
