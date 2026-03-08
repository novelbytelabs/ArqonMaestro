# Getting Started

Arqon Maestro is the voice control layer for the Arqon ecosystem. Its job is to turn spoken intent into concrete actions across editors, system windows, browser surfaces, and Arqon workflows.

> Video placeholder: first-run setup and first command demo.

## First Run Checklist

1. Launch Arqon Maestro.
2. Confirm your microphone meter moves in `Settings > General`.
3. Focus the application you want Maestro to control.
4. Turn listening on.
5. Say a simple command such as `next line`, `undo`, or `new tab`.

## What Happens When You Speak

```mermaid
flowchart LR
  U[You speak] --> M[Arqon Maestro]
  M --> A[Audio capture]
  A --> T[Transcript and intent]
  T --> C[Command alternatives]
  C --> X[Best command executes]
```

## The Main Interaction Model

- Maestro sends commands to the application currently in focus.
- Most spoken commands follow an `action + selector` pattern.
- A numbered alternatives list appears while Maestro interprets your speech.
- The first valid interpretation runs automatically unless you choose another one.

## Good First Commands

- `next line`
- `go to line 10`
- `add function hello world`
- `insert equals value plus one`
- `delete line`
- `undo`

## Modes You Should Know

- `Command mode`: interpret speech as structured commands.
- `Type mode`: force literal text and symbols exactly as spoken.
- `Revision box`: edit text or code in a dedicated popup, then send it into another app.
- `Text input`: type into Maestro first, then submit it as a request with alternatives.

## Where To Learn Fastest

- [How Commands Work](how-commands-work.md)
- [Common Commands](common-commands.md)
- [Dictation and Raw Text](dictation-and-raw-text.md)
- [Revision Box and Text Input](revision-box-and-text-input.md)
- [In-App Tutorials](in-app-tutorials.md)
