
# Maestro Reference System v0.1

*(How the language refers to things)*

Right now we have:

* verbs ✔
* objects ✔
* surfaces ✔
* syntax ✔
* interpretation ✔
* chooser ✔

But one layer is still implicit:

> **How the user refers to targets across time and context.**

Without this, the language becomes frustrating very quickly.

Example problems:

```
delete it
open that
compare these
run it again
```

Your syntax rules forbid these on the deterministic lane — correctly.

But a real VOS **must support them when the referent is clear**.

So we need a **Reference Model**.

This is one of the most important parts of the language.

---

# Maestro Reference System v0.1

## Purpose

The reference system defines:

• how spoken commands refer to targets
• how targets persist across commands
• how pronouns resolve safely
• how recency and focus affect interpretation
• how ambiguous references trigger the chooser

In short:

**How the language remembers what you mean.**

---

# 1. Reference types

Maestro supports **five reference types**.

## 1️⃣ Explicit references

Fully specified targets.

Examples

```
line 42
file main.rs
function parse input
browser tab 2
cargo build
```

These are **deterministic and preferred**.

---

## 2️⃣ Contextual references

Targets inferred from current focus or scope.

Examples

```
current file
current line
current tab
current error
current selection
```

Example command:

```
rename symbol
```

If a symbol is selected → deterministic.

---

## 3️⃣ Positional references

Targets defined by ordering.

Examples

```
first result
second tab
next error
previous match
last item
```

Example:

```
open first result
```

---

## 4️⃣ Persistent references

Targets remembered from previous commands.

Examples:

```
run build
stop build
explain that error
compare those files
```

These rely on the **reference memory system**.

---

## 5️⃣ Pronoun references

Human shorthand.

Examples:

```
it
that
these
those
this
them
```

These are **dangerous unless tightly controlled**.

---

# 2. Reference memory

Maestro should maintain a **reference stack**.

Think of it like this:

```
Reference Memory
────────────────

R1 last object
R2 last selection
R3 last surface
R4 last error
R5 last execution target
```

Example flow:

```
run cargo build
```

Now memory holds:

```
last execution = cargo build
```

Next command:

```
stop it
```

Resolution:

```
stop cargo build
```

Deterministic.

---

# 3. The reference stack

Instead of one memory slot, Maestro should maintain a **typed stack**.

Example:

```
reference_stack:

surface:
  - terminal
  - editor

execution:
  - cargo build

selection:
  - function parse_input

file:
  - main.rs

error:
  - build_error_42
```

This allows commands like:

```
explain that error
```

to resolve properly.

---

# 4. Reference resolution order

When a reference appears, the interpreter should resolve it in this order:

```
1 explicit object
2 explicit positional reference
3 contextual object
4 persistent reference stack
5 surface-local object
6 chooser
```

Example:

```
open it
```

Possible interpretations:

* last file
* last tab
* last result
* last selection

If ambiguity remains → chooser.

---

# 5. Pronoun policy

Pronouns should be **restricted but not banned**.

Allowed pronouns:

```
this
that
these
those
it
them
```

But only when a **strong referent exists**.

Example allowed:

```
explain this error
```

Example blocked:

```
delete it
```

when multiple candidates exist.

---

# 6. Strong vs weak referents

The interpreter should classify referents.

### Strong referents

Unique and recent.

Examples

```
current selection
last error
focused tab
last build
```

Pronouns allowed.

---

### Weak referents

Multiple possibilities.

Examples

```
open file
delete it
run it
```

Chooser required.

---

# 7. Surface-bound references

References should also inherit **surface context**.

Example:

```
search auth token
```

If the browser is focused:

```
search page auth token
```

If editor focused:

```
search file auth token
```

Surface bias reduces ambiguity dramatically.

---

# 8. Reference lifetime

References decay over time.

Suggested rules:

### Immediate

Valid for next command.

Examples

```
open result
click it
```

---

### Short-term

Valid for several commands.

Examples

```
file
selection
surface
```

---

### Long-term

Persistent across sessions.

Examples

```
project
workspace
repository
```

---

# 9. Reference disambiguation

When multiple candidates exist:

Example:

```
delete it
```

Chooser UI:

```
Delete which?

1 file main.rs
2 tab main.rs
3 symbol main
```

The chooser becomes part of the language.

---

# 10. Reference chaining

References allow compact workflows.

Example:

```
search files websocket timeout
open first result
compare it with current file
```

Resolution:

```
compare first_result with current_file
```

Without a reference system, this becomes impossible.

---

# 11. Reference markers

Certain words explicitly trigger reference lookup.

Examples:

```
this
that
these
those
it
them
again
previous
current
```

Example:

```
run build again
```

Resolved as:

```
run last_build
```

---

# 12. Forbidden references

Some references should **never execute directly**.

Example:

```
delete that
```

Without strong referent → reject.

Example:

```
run it
```

Without strong referent → reject.

Safety first.

---

# 13. Reference grammar

Reference syntax integrates into the main grammar.

Canonical form:

```
verb + reference
```

Examples:

```
explain this error
delete current file
open first result
compare those files
run it again
```

---

# 14. Reference + surface

References can combine with surfaces.

Example:

```
open it in browser
run it in terminal
search it in files
```

This is extremely powerful.

---

# 15. Reference laws

These should be added to the constitution.

### Law 1

Explicit references outrank inferred references.

### Law 2

Pronouns require strong referents.

### Law 3

Reference resolution prefers recent targets.

### Law 4

Surface context biases reference interpretation.

### Law 5

Ambiguous references trigger chooser UI.

---

# 16. Why this matters

Without a reference system, the language becomes:

```
search files websocket timeout
open result 1
compare result 1 with file main.rs
```

With references:

```
search files websocket timeout
open first result
compare it with current file
```

That is **natural and fast**.

---

# 17. What we now have

At this point Maestro's language layer includes:

```
Constitution
Syntax
Lexicon
Verb system
Verb-object legality
Surface model
Mode state machine
Interpretation engine
Chooser UX
Preference model
Reference system
```

This is already **a real operating language architecture**.

---

# The next two design topics (after references)

Once references are defined, the two strongest next documents are:

### 1️⃣ Maestro Execution Architecture

How commands actually run.

This is the bridge to:

* Talon
* Arqon
* IDE APIs
* terminal
* browser automation
* MCP tools

---

### 2️⃣ Maestro Macro System

How commands become workflows.

Example:

```
build project then show logs then return focus
```
