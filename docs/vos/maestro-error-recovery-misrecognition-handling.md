# Maestro Error Recovery and Misrecognition Handling v0.1

## Purpose

Speech systems fail in four predictable ways:

1. **STT error**
2. **parser ambiguity**
3. **object binding failure**
4. **execution failure**

If recovery is slow or confusing, the system becomes unusable.

So Maestro must treat **error recovery as a first-class language feature**, not a fallback.

The goal:

**recover from mistakes faster than typing.**

---

# 1. The Four Failure Layers

Every Maestro command moves through four stages.

```
speech
  ↓
STT transcript
  ↓
command parse
  ↓
object binding
  ↓
execution
```

Errors can occur at each layer.

| Layer     | Failure Type                   |
| --------- | ------------------------------ |
| STT       | speech misheard                |
| Parser    | multiple valid interpretations |
| Binding   | object not found               |
| Execution | action failed                  |

Each layer needs **distinct recovery behavior**.

---

# 2. STT Error Handling

This is the most common failure.

Example speech:

```
focus terminal
```

STT output:

```
focus thermal
```

The system must detect this and recover.

### Strategy

Maestro uses **three signals**:

1. **STT confidence**
2. **phonetic correction table**
3. **object registry matching**

### Example recovery

Transcript:

```
focus thermal
```

Parser attempts:

```
verb = focus
object = thermal
```

Object registry check:

```
thermal → not valid
terminal → valid object
```

Phonetic similarity detected.

Recovery action:

```
auto-correct → terminal
```

Execution:

```
focus terminal
```

---

### Auto-correction rule

Auto-correct only occurs when:

```
confidence ≥ medium
AND
single high-probability correction exists
```

Otherwise Maestro asks.

Example:

```
Did you mean:

1 terminal
2 thermal view
3 cancel
```

---

# 3. Parser Ambiguity

Example command:

```
open settings browser
```

Possible parses:

```
open (settings) (browser)
open (settings browser)
```

Ambiguity detection occurs when:

```
multiple valid parse trees exist
```

Recovery strategy:

**chooser overlay**

Example:

```
Which did you mean?

1 open browser settings
2 open settings in browser
3 cancel
```

The user responds:

```
two
```

Command executes.

---

# 4. Object Binding Failure

Example command:

```
open file config.toml
```

But the file does not exist.

Maestro should not fail silently.

### Recovery hierarchy

1. **exact lookup**
2. **similarity search**
3. **context search**
4. **chooser**

Example recovery:

```
File "config.toml" not found.

Did you mean:

1 config.yaml
2 config.json
3 create config.toml
4 cancel
```

---

# 5. Execution Failure

Example:

```
run cargo build
```

Execution error:

```
cargo: command not found
```

Recovery strategy:

Return **structured failure report**.

Example response:

```
Build failed.

cargo command not found.

Options:

1 install cargo
2 run in container
3 cancel
```

This turns runtime failure into a **recoverable workflow**.

---

# 6. The Maestro Recovery Ladder

All errors follow the same escalation ladder.

```
auto-correct
      ↓
chooser
      ↓
slot prompt
      ↓
refusal
```

### Auto-correct

Silent correction when extremely confident.

Example:

```
focus thermal → focus terminal
```

---

### Chooser

User selects interpretation.

Example:

```
1 open terminal
2 open external terminal
```

---

### Slot prompt

Missing parameter.

Example:

```
rename file

Which file?
```

User:

```
config.toml
```

Execution continues.

---

### Refusal

If command cannot be safely interpreted.

Example:

```
delete it
```

Response:

```
I need the file name.
```

---

# 7. Repair Commands

Users must be able to repair commands instantly.

These become **reflex commands**.

### Core repair verbs

```
cancel
undo
redo
stop
repeat
correct
```

Example:

```
rename file config.toml to config.json
```

User:

```
undo
```

System reverses action.

---

### Correction example

User:

```
open file config.yaml
```

User notices mistake:

```
correct config.toml
```

Parser updates last command.

Execution:

```
open file config.toml
```

---

# 8. Misrecognition Feedback Loop

Maestro must learn from repeated corrections.

Example:

User repeatedly says:

```
focus terminal
```

STT transcript:

```
focus thermal
```

User corrects to terminal each time.

System adapts:

```
thermal → terminal preference
```

Future commands auto-correct.

This becomes part of the **Preference Model**.

---

# 9. Confirmation Policy

Some commands require confirmation.

Example categories:

| Category         | Confirmation |
| ---------------- | ------------ |
| destructive      | yes          |
| system changes   | yes          |
| navigation       | no           |
| focus change     | no           |
| reversible edits | no           |

Example:

```
delete file database.db
```

System:

```
Delete database.db?

yes / no
```

---

# 10. Silent Correction Rules

Silent corrections are allowed only when:

```
single clear correction
low consequence action
high STT confidence
```

Example:

```
focus therminal
```

Correction:

```
terminal
```

Silent execution.

But **never silent** for:

```
delete
rename
run privileged command
send message
```

---

# 11. Partial Transcript Handling

Sometimes STT returns fragments.

Example:

```
open
```

Parser detects missing object.

Response:

```
Open what?
```

User:

```
terminal
```

Command completes.

---

# 12. Timeout Recovery

Speech pauses should not cancel commands prematurely.

Example:

```
rename file
```

User pauses.

System waits briefly:

```
Which file?
```

User:

```
main.rs
```

---

# 13. Recovery Speed Law

The entire recovery loop must be **fast enough to feel conversational**.

Target latencies:

| Step            | Target  |
| --------------- | ------- |
| STT decode      | <120 ms |
| parse           | <10 ms  |
| correction      | <10 ms  |
| chooser display | <100 ms |

Total recovery cycle:

**<300 ms**

This makes correction feel natural.

---

# 14. Error Transparency

Maestro should show *what it thinks it heard*.

Example:

```
Heard: focus thermal
Corrected: terminal
```

Transparency builds trust.

---

# 15. Catastrophic Error Prevention

Commands with irreversible consequences require extra safeguards.

Examples:

```
delete
wipe
format
send
execute root
```

Safeguards may include:

* confirmation
* privilege checks
* environment restrictions
* speaker verification

---

# 16. Recovery Examples

### Example 1

Speech:

```
focus thermal
```

Recovery:

```
auto-correct → terminal
```

Execution succeeds.

---

### Example 2

Speech:

```
open settings browser
```

Recovery:

```
chooser
```

User selects interpretation.

---

### Example 3

Speech:

```
delete file
```

Recovery:

```
slot prompt
```

System asks which file.

---

### Example 4

Speech:

```
run docker build
```

Runtime error occurs.

Recovery:

```
execution failure workflow
```

System offers options.

---

# 17. Recovery Philosophy

The system must behave like a **competent human operator**.

That means:

* it attempts repair before failing
* it explains errors clearly
* it offers actionable recovery paths
* it never guesses destructively

---

# 18. Key Laws

### Law 1

Errors should resolve within one interaction when possible.

---

### Law 2

Destructive actions require explicit confirmation.

---

### Law 3

Misrecognition corrections should improve the system over time.

---

### Law 4

Recovery must be faster than switching to keyboard.

---

### Law 5

The system must never silently reinterpret a destructive command.

---

# 19. System Components Required

This design implies several modules:

```
stt_correction_engine
phonetic_alias_registry
parse_ambiguity_detector
chooser_overlay
slot_prompt_engine
execution_error_router
preference_learning_engine
```

These become part of the **Maestro runtime architecture**.

---

# 20. The Big Outcome

Once this system exists, Maestro becomes:

* tolerant of STT imperfections
* resilient under noisy speech
* safe under ambiguity
* adaptive to individual speech patterns

Which is exactly what a **Voice Operating System** needs.

---
