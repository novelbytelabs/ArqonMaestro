# Maestro Phonetic Robustness and Speech Survivability v0.1

## Purpose

The phonetic layer ensures that Maestro commands:

• survive speech recognition errors
• remain distinguishable under noise
• avoid dangerous misinterpretation
• maintain deterministic interpretation

The goal:

> **A command language engineered for speech, not text.**

---

# 1. The fundamental problem

Speech recognition is noisy.

Even with modern models, you will see errors like:

Example:

```text
focus terminal
```

STT output:

```text
focus thermal
focus terminale
focus journal
focus terminals
```

Another example:

```text
delete line
```

STT output:

```text
delete lion
delete lime
delete line
delete lying
```

In a VOS, this is **dangerous**.

We must engineer the language to **minimize catastrophic collisions**.

---

# 2. Phonetic collision classes

Commands can collide in several ways.

### Class 1 — single phoneme difference

Example:

```text
run
one
```

Too similar.

---

### Class 2 — vowel confusion

Example:

```text
open
```

STT output:

```text
open
hop in
open
hope
```

---

### Class 3 — consonant drop

Example:

```text
scroll
```

STT output:

```text
scrawl
roll
crawl
```

---

### Class 4 — word splitting

Example:

```text
rename
```

STT output:

```text
re name
rain aim
```

---

### Class 5 — semantic substitution

Example:

```text
terminal
```

STT output:

```text
thermal
journal
terminal
```

---

# 3. High-risk command types

Certain commands are **dangerous if misheard**.

Examples:

```text
delete
remove
shutdown
stop
kill
format
```

These must receive **extra phonetic protection**.

---

# 4. Language design rule

The VOS lexicon must satisfy:

> **Maximum phonetic distance between dangerous commands.**

For example:

Bad pair:

```text
run
one
```

Better:

```text
run
execute
```

But even that might not be ideal.

We must **test the lexicon phonetically**.

---

# 5. Core command phonetic audit

Let's evaluate the canonical verbs.

### focus

Phonetic form:

```text
FOH-kus
```

Common misrecognitions:

```text
focus
fog us
folk us
focuses
```

Risk level: **low**

Good verb.

---

### open

Phonetic form:

```text
OH-pen
```

Possible errors:

```text
open
hop in
opened
```

Risk: **moderate**

Acceptable.

---

### run

Phonetic form:

```text
RUN
```

Possible errors:

```text
one
done
run
ran
```

Risk: **moderate-high**

But context disambiguates strongly.

Example:

```text
run cargo build
```

Hard to confuse.

---

### stop

Phonetic form:

```text
STOP
```

Possible errors:

```text
stop
top
stop it
```

Risk: **moderate**

But reflex commands are short by design.

---

### select

Phonetic form:

```text
seh-LECT
```

Possible errors:

```text
select
selects
slack
```

Risk: **low**

Good command.

---

### search

Phonetic form:

```text
SERCH
```

Possible errors:

```text
search
surge
church
```

Risk: **moderate**

Still acceptable.

---

### scroll

Phonetic form:

```text
SKROLL
```

Possible errors:

```text
scroll
scrawl
crawl
```

Risk: **moderate**

Still acceptable.

---

### move

Phonetic form:

```text
MOOV
```

Possible errors:

```text
move
moon
```

Risk: **low**

---

### delete

Phonetic form:

```text
dee-LEET
```

Possible errors:

```text
delete
elite
delete it
```

Risk: **moderate-high**

But context mitigates.

Still acceptable.

---

# 6. Surface name robustness

Surface names also matter.

Example:

```text
focus terminal
```

Possible errors:

```text
focus thermal
focus journal
```

Better design:

Allow aliases.

Example:

```text
terminal
shell
console
```

If STT returns:

```text
focus thermal
```

phonetic similarity may map to:

```text
terminal
```

via alias correction.

---

# 7. Alias phonetic shields

Some aliases exist purely for speech safety.

Example:

```text
browser
```

Possible STT errors:

```text
bowser
browser
brother
```

Aliases:

```text
web
web browser
browser
```

Interpreter maps them all to the same surface.

---

# 8. Dangerous command protection

Some commands require **confirmation patterns**.

Example:

```text
delete file main.rs
```

Possible misrecognition:

```text
delete file
```

Safe design:

Require explicit object.

Example safe command:

```text
delete file main.rs
```

Unsafe command:

```text
delete it
```

Rejected.

---

# 9. Command redundancy

Critical commands should have **semantic redundancy**.

Example:

```text
delete file main.rs
```

Two key tokens:

```text
delete
file
```

If one is misrecognized, the command fails instead of executing incorrectly.

---

# 10. Phonetic grammar rule

Commands should avoid long sequences of short weak words.

Bad:

```text
go to it
```

Better:

```text
go line 42
```

Better still:

```text
go line forty two
```

Numbers should be parsed robustly.

---

# 11. Numeric robustness

Numbers are tricky.

Example:

```text
line 42
```

STT output:

```text
line forty two
line for two
line four two
```

The interpreter should normalize.

Numeric parsing should accept:

```text
forty two
four two
42
```

---

# 12. Homophone avoidance

Avoid commands like:

```text
write
right
```

Better:

```text
move right
```

Because the **object clarifies meaning**.

---

# 13. Confirmation patterns

For high-risk operations:

Example:

```text
delete file main.rs
```

System may respond:

```text
Confirm delete main.rs
```

User:

```text
confirm
```

or

```text
cancel
```

---

# 14. Speech noise tolerance

Commands should remain interpretable even when partially corrupted.

Example:

User:

```text
focus terminal then run cargo build
```

STT:

```text
focus thermal then run cargo build
```

Phonetic matching:

```text
thermal → terminal
```

Confidence high.

Command executes.

---

# 15. Phonetic distance rule

High-risk verbs must be **phonetically distinct**.

Example safe pair:

```text
delete
rename
```

Unsafe pair:

```text
delete
elite
```

The lexicon should be evaluated using **phonetic distance metrics**.

---

# 16. Abbreviation policy

Abbreviations are dangerous.

Example:

```text
def
ref
sel
```

STT may produce:

```text
death
self
```

So abbreviations should only be allowed in **expert shorthand mode**.

---

# 17. Wake word separation

The wake word must not collide with commands.

Example:

```text
Maestro focus terminal
```

If wake word were:

```text
focus
```

It would be catastrophic.

Wake word must be **phonetically isolated**.

---

# 18. Speech survivability law

Add these to the constitution.

### Law 1

Canonical commands must maximize phonetic distance.

### Law 2

Dangerous commands require explicit objects.

### Law 3

Aliases may exist to absorb STT errors.

### Law 4

Ambiguous phonetic matches trigger chooser UI.

### Law 5

Short vague commands should fail closed.

---

# 19. Example robust commands

Good commands:

```text
focus terminal
run cargo build
search files websocket timeout
select line forty two
compare these files
```

These survive speech corruption well.

---

# 20. Bad commands

Bad examples:

```text
run it
go there
do build
make project
```

Too vague, too fragile.

---

# 21. Testing methodology

Maestro commands should be tested with **STT fuzzing**.

Example test:

Original command:

```text
focus terminal
```

Test variations:

```text
focus thermal
focus journal
focus terminal
focus terminals
```

Interpreter must still resolve correctly.

---

# 22. Phonetic robustness summary

The VOS lexicon must optimize for:

```text
phonetic distance
semantic clarity
explicit objects
alias recovery
safe failure
```
