# Command Modes

Arqon Maestro is not a single flat interaction mode. It has multiple operating modes and bridge surfaces depending on whether you want structured commands, free dictation, exact text, or an intermediate editor.

> Video placeholder: switching between command mode, dictate mode, and bridge surfaces.

## Primary Modes

- `Command mode`
- `Dictate mode`
- `Type command workflow`
- `Revision box`
- `Text input`

## Command Mode

This is the default operating model:

- speak a structured command
- Maestro interprets it
- alternatives appear
- the best command executes

## Dictate Mode

The UI exposes a `Dictate` mode indicator. This is for text-first workflows where you want dictated output rather than a command-centric interaction.

Use it when:

- writing prose
- filling text fields
- working in apps without deep structural integration

## `type` As A Lower-Level Escape Hatch

Even in command mode, you can force exact output with `type`.

Example:

- `type output space equals space double quote plus message double quote`

## Bridge Surfaces

When the target app is not a full plugin-aware editor, Maestro can still work through:

- [Revision Box and Text Input](revision-box-and-text-input.md)

## Mode Map

```mermaid
flowchart TD
  M[Arqon Maestro] --> C[Command mode]
  M --> D[Dictate mode]
  M --> T[Type command]
  M --> R[Revision box]
  M --> X[Text input]
```

## Settings That Affect Modes

Look in `Settings > Advanced` for:

- automatic revision box behavior
- toggle text input shortcut
- compact UI behavior
- command wait time
- speech and silence strictness
