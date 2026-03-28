# Maestro Runtime Command Contract v0.1

This document defines the **canonical structured object** that the Maestro parser emits and the runtime consumes.

It is the **bridge between language and execution**.

Speech → STT → Parser → **Runtime Contract Object** → Executor

If this contract is well-designed, the entire system becomes stable, testable, and deterministic.

---

# 1. Purpose of the Runtime Contract

The runtime contract exists to solve four problems:

1. **Decouple speech from execution**
2. **Make commands deterministic**
3. **Allow multiple executors**
4. **Support safe recovery and undo**

The parser produces a **typed command object** that the runtime can execute without guessing.

---

# 2. Contract Structure Overview

The runtime command object contains:

* lane
* verb
* object
* binding
* scope
* modifiers
* postfix
* confidence
* confirmation policy
* reversibility
* executor candidates
* execution metadata

Conceptually:

```
speech
  ↓
STT transcript
  ↓
parser
  ↓
Command Contract Object
  ↓
executor router
  ↓
execution
```

---

# 3. Canonical Command Object

The standard contract format:

```
{
  "lane": "command",

  "verb": "focus",

  "object": {
    "type": "surface",
    "name": "terminal"
  },

  "binding": {
    "strategy": "registry",
    "resolved_id": "surface.terminal.integrated"
  },

  "scope": null,

  "modifiers": [],

  "postfix": [],

  "confidence": 0.92,

  "confirmation_required": false,

  "reversible": true,

  "executor_candidates": [
    "ide_surface_manager",
    "os_window_manager"
  ],

  "execution_metadata": {
    "timestamp": "...",
    "session_id": "...",
    "speaker_verified": true
  }
}
```

---

# 4. Lane Field

The lane identifies the **language interpretation mode**.

Possible values:

| Lane      | Meaning                 |
| --------- | ----------------------- |
| command   | deterministic command execution |
| dictation | free text input |
| conversation | recipient-targeted cognitive dialogue |
| translation | multilingual transform workflows |
| search_explore | structured retrieval/navigation |
| chooser   | disambiguation overlay |
| repair    | correction commands |
| system    | internal system control |

Example:

```
"lane": "command"
```

Most operating actions run in the **command lane**.

---

# 4A. Recipient Field (Conversation/Search Extension)

For conversation and search/explore turns, the runtime contract may include recipient targeting.

Example:

```
"recipient": {
  "raw": "@oracle",
  "resolved_id": "oracle",
  "class": "oracle"
}
```

Recipient classes:

| Class | Meaning |
| ----- | ------- |
| nexus | Nexus assistant recipient |
| oracle | Reflex + Continuum memory/retrieval profile |
| local_llm | local model endpoint |
| remote_llm | hosted model endpoint |
| agent | named/role agent endpoint |

Important boundary:

* recipient does not grant execution authority
* command-lane commands still own mode switching, recipient switching, and actuation triggers

---

# 5. Verb Field

The verb represents the **action type**.

Example:

```
"verb": "focus"
```

Verbs come from the **verb registry**.

Examples:

* focus
* open
* close
* run
* search
* select
* rename
* delete
* scroll

Verbs are **not arbitrary strings**.

They are canonical registry entries.

---

# 6. Object Field

The object identifies the **target class** and **spoken name**.

Example:

```
"object": {
  "type": "surface",
  "name": "terminal"
}
```

Types may include:

| Type     | Examples         |
| -------- | ---------------- |
| surface  | terminal, editor |
| entity   | file, folder     |
| symbol   | function, class  |
| location | line, top        |
| ui       | tab, panel       |
| system   | process          |

The **spoken name** is preserved for debugging and recovery.

---

# 7. Binding Field

Binding resolves the spoken object to a **specific runtime entity**.

Example:

```
"binding": {
  "strategy": "registry",
  "resolved_id": "surface.terminal.integrated"
}
```

Binding strategies include:

| Strategy | Meaning                     |
| -------- | --------------------------- |
| registry | static object               |
| context  | resolved from current focus |
| search   | fuzzy match                 |
| index    | numeric selection           |
| symbolic | code symbol lookup          |

Example:

Speech:

```
open file config.toml
```

Binding:

```
"binding": {
  "strategy": "filesystem",
  "resolved_id": "/project/config.toml"
}
```

---

# 8. Scope Field

Scope describes **where the command applies**.

Example:

```
search errors in project
```

Scope:

```
"scope": {
  "type": "workspace",
  "value": "project"
}
```

Possible scopes:

| Scope     | Meaning       |
| --------- | ------------- |
| file      | current file  |
| project   | repository    |
| workspace | IDE workspace |
| browser   | web context   |
| system    | OS level      |

Scope clarifies command intent.

---

# 9. Modifiers

Modifiers alter how the command executes.

Example speech:

```
search files websocket quietly
```

Modifiers:

```
"modifiers": ["quietly"]
```

Examples:

| Modifier    | Effect                  |
| ----------- | ----------------------- |
| quietly     | suppress UI             |
| safely      | additional confirmation |
| recursively | expand scope            |
| exactly     | strict matching         |

Modifiers do not change the core command.

They refine behavior.

---

# 10. Postfix Field

Postfix expressions execute **after the main action**.

Example:

```
open terminal and return
```

Postfix:

```
"postfix": ["return"]
```

Examples:

| Postfix | Meaning                    |
| ------- | -------------------------- |
| return  | restore previous focus     |
| here    | execute in current context |
| now     | prioritize execution       |

Postfix actions run after execution completes.

---

# 11. Confidence Score

Confidence indicates parser certainty.

Example:

```
"confidence": 0.91
```

Typical ranges:

| Score   | Meaning                |
| ------- | ---------------------- |
| 0.9–1.0 | safe to execute        |
| 0.7–0.9 | possible chooser       |
| <0.7    | clarification required |

Confidence influences error recovery.

---

# 12. Confirmation Policy

Some commands require confirmation.

Example:

```
"confirmation_required": true
```

Triggered for:

* destructive actions
* system changes
* security-sensitive commands

Example:

Speech:

```
delete file database.db
```

Parser marks:

```
confirmation_required = true
```

Runtime asks for confirmation.

---

# 13. Reversibility

Indicates whether the action can be undone.

Example:

```
"reversible": true
```

Examples:

| Command        | Reversible |
| -------------- | ---------- |
| focus terminal | yes        |
| rename file    | yes        |
| delete file    | maybe      |
| send message   | no         |

Undo system depends on this field.

---

# 14. Executor Candidates

Multiple subsystems may handle a command.

Example:

```
"executor_candidates": [
  "ide_surface_manager",
  "os_window_manager"
]
```

Router decides best executor.

Possible executors:

| Executor            | Role            |
| ------------------- | --------------- |
| ide_surface_manager | IDE UI          |
| filesystem_executor | file operations |
| terminal_executor   | shell commands  |
| browser_controller  | web automation  |
| system_controller   | OS operations   |

This keeps Maestro modular.

---

# 15. Execution Metadata

Metadata captures runtime context.

Example:

```
"execution_metadata": {
  "timestamp": "...",
  "session_id": "...",
  "speaker_verified": true
}
```

Metadata may include:

* session id
* speaker verification
* security context
* environment mode
* command history id

Useful for:

* auditing
* undo
* debugging

---

# 16. Example Commands

### Example 1

Speech:

```
focus terminal
```

Contract:

```
{
  "lane": "command",
  "verb": "focus",
  "object": {
    "type": "surface",
    "name": "terminal"
  },
  "binding": {
    "strategy": "registry",
    "resolved_id": "surface.terminal.integrated"
  },
  "scope": null,
  "modifiers": [],
  "postfix": [],
  "confidence": 0.96,
  "confirmation_required": false,
  "reversible": true,
  "executor_candidates": ["ide_surface_manager"]
}
```

---

### Example 2

Speech:

```
search files websocket timeout in project
```

Contract:

```
{
  "lane": "command",
  "verb": "search",
  "object": {
    "type": "entity",
    "name": "files"
  },
  "binding": {
    "strategy": "filesystem",
    "resolved_id": "workspace.files"
  },
  "scope": {
    "type": "project",
    "value": "current"
  },
  "modifiers": [],
  "postfix": [],
  "confidence": 0.88,
  "confirmation_required": false,
  "reversible": false,
  "executor_candidates": ["search_engine"]
}
```

---

### Example 3

Speech:

```
rename file config.toml to config.json
```

Contract:

```
{
  "lane": "command",
  "verb": "rename",
  "object": {
    "type": "entity",
    "name": "file"
  },
  "binding": {
    "strategy": "filesystem",
    "resolved_id": "/project/config.toml"
  },
  "scope": null,
  "modifiers": [],
  "postfix": [],
  "confidence": 0.94,
  "confirmation_required": false,
  "reversible": true,
  "executor_candidates": ["filesystem_executor"]
}
```

---

### Example 3 (Conversation Recipient Turn)

Speech:

```
at nexus what do you think of this strategy
```

Contract:

```
{
  "lane": "conversation",
  "recipient": {
    "raw": "@nexus",
    "resolved_id": "nexus",
    "class": "nexus"
  },
  "verb": "ask",
  "object": {
    "type": "prompt",
    "name": "strategy_review"
  },
  "binding": {
    "strategy": "recipient_router",
    "resolved_id": "recipient.nexus"
  },
  "scope": null,
  "modifiers": [],
  "postfix": [],
  "confidence": 0.93,
  "confirmation_required": false,
  "reversible": false,
  "executor_candidates": ["conversation_router"]
}
```

---

### Example 4 (Search/Explore Recipient Turn)

Speech:

```
at oracle find the name of our calculator function
```

Contract:

```
{
  "lane": "search_explore",
  "recipient": {
    "raw": "@oracle",
    "resolved_id": "oracle",
    "class": "oracle"
  },
  "verb": "find",
  "object": {
    "type": "entity",
    "name": "calculator function name"
  },
  "binding": {
    "strategy": "retrieval",
    "resolved_id": "retrieval.reflex_oracle"
  },
  "scope": {
    "type": "workspace",
    "value": "project"
  },
  "modifiers": [],
  "postfix": [],
  "confidence": 0.89,
  "confirmation_required": false,
  "reversible": false,
  "executor_candidates": ["search_explore_router"]
}
```

---

# 17. Why This Contract Matters

This contract provides:

### Determinism

Speech variability is normalized into structured data.

### Executor independence

Different subsystems can execute commands.

### Safety

Destructive commands carry explicit metadata.

### Debugging

Every command becomes traceable.

### Extensibility

Future verbs or objects fit the same schema.

---

# 18. Runtime Flow

Full pipeline:

```
speech
  ↓
STT
  ↓
parser
  ↓
phonetic correction
  ↓
ambiguity resolution
  ↓
runtime command contract
  ↓
executor router
  ↓
execution
  ↓
result
```

The runtime contract sits at the **center of the system**.

---

# 19. Implementation Note

In code, the contract should likely be represented as:

* a **typed struct**
* validated by schema

Example:

Rust struct concept:

```
struct MaestroCommand {
    lane: Lane,
    verb: Verb,
    object: Object,
    binding: Binding,
    scope: Option<Scope>,
    modifiers: Vec<Modifier>,
    postfix: Vec<Postfix>,
    confidence: f32,
    confirmation_required: bool,
    reversible: bool,
    executor_candidates: Vec<Executor>,
}
```

Strong typing reduces runtime errors.

---

# 20. What This Enables

Once this contract exists, Maestro can support:

* deterministic command execution
* safe error recovery
* command history
* undo stack
* auditing
* cross-system orchestration

Which is exactly what a **Voice Operating System runtime** requires.
