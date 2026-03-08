# Arqon Maestro

Arqon Maestro is the voice-first control layer for the Arqon ecosystem.

It provides a natural-language interface for coding, navigation, execution, and workflow control across Arqon tools. It is a shared interaction surface designed to make the broader Arqon ecosystem voice-native.

The purpose of Arqon Maestro is straightforward:

- give the Arqon ecosystem a unified voice interface
- make natural-language control practical for real development workflows
- support coding, navigation, orchestration, and execution from one interaction layer
- provide a reusable control surface for future Arqon systems

## What Arqon Maestro Does

Arqon Maestro listens to spoken commands, turns them into transcripts, interprets intent, and routes the resulting actions into the appropriate tool or editor context.

In practice, that means it can help with:

- writing and revising code with natural speech
- navigating files, tabs, editors, and code structure
- issuing editor actions through supported plugins
- driving workflow steps without switching context manually
- acting as a universal voice control plane for Arqon tools
- supporting hands-free and low-friction interaction when voice is the best interface

## Key Capabilities

- Real-time microphone capture from the desktop client
- Speech-to-text pipeline for spoken coding commands
- Command interpretation for source-code edits
- Context-aware editor operations through plugins
- Voice-driven workflow execution across tool boundaries
- Desktop app built with Electron
- VS Code integration via the extension in [`vscode-plugin`](./vscode-plugin)
- Support for local and remote backend endpoints
- Training and model architecture artifacts preserved in the repository

## Typical Workflow

1. Start the Arqon Maestro desktop app.
2. Focus the relevant editor or tool context.
3. Toggle listening.
4. Speak a command such as `new line`, `go to definition`, `add function`, or another supported workflow action.
5. Arqon Maestro captures audio, resolves a transcript, interprets intent, and applies the action through the active integration layer.

## Why It Matters

Arqon Maestro matters because the Arqon ecosystem needs a common interaction model that is:

- fast enough for real development work
- expressive enough for code and tool control
- reusable across multiple Arqon projects
- natural for human operators

Accessibility remains an important benefit, but it is not the primary framing. The core value is broader: Arqon Maestro makes voice a first-class control surface for the ecosystem.

## Repository Layout

| Component | Path | Purpose |
| --- | --- | --- |
| Desktop client | Electron client directory | Electron app, microphone capture, UI, streaming |
| Core service | Core service directory | Main command-processing service |
| Speech engine | Speech engine directory | Speech recognition service |
| Code engine | Code engine directory | Transcript-to-code interpretation models |
| VS Code extension | [`vscode-plugin`](./vscode-plugin) | Editor integration |
| Project docs | [`docs`](./docs) and root `*.md` files | Architecture, troubleshooting, training, rebranding |

## Architecture

The high-level request flow is:

1. The desktop client captures microphone audio.
2. Audio frames are streamed to `core`.
3. `core` coordinates with the speech engine to produce transcripts.
4. The code engine interprets transcripts into structured coding actions.
5. The active editor plugin applies the result.

Related docs:

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [RUN_COMMANDS.md](./RUN_COMMANDS.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [TRAINING.md](./TRAINING.md)
- [LEGACY_INTERNAL_RENAME_TODO.md](./LEGACY_INTERNAL_RENAME_TODO.md)

## Supported Operation Modes

### Cloud-backed mode

This is the simplest way to run the app during development if your config points to a working remote endpoint.

See [RUN_COMMANDS.md](./RUN_COMMANDS.md) for the current launch command.

### Local mode

Arqon Maestro also retains the original multi-service local architecture, but local mode is more demanding. A complete local voice stack requires:

- `core`
- `speech-engine`
- `code-engine`

See [RUN_COMMANDS.md](./RUN_COMMANDS.md) for the exact commands and current local-mode caveats.

## Current State

This repository is an active modernization and recovery effort. The project has already been brought back to a working state in several important areas:

- Electron startup no longer stalls on a permanent `Loading...` screen
- branding has been moved to `Arqon Maestro` across the user-facing surface
- Linux microphone capture and streaming have been repaired
- the voice pipeline has been debugged back into a working state

Some deeper internal rename work and local-packaging work still remain. Those are being tracked explicitly rather than hidden.

## Development Notes

- User-facing branding is `Arqon Maestro`
- Some legacy internal identifiers still remain for compatibility and migration purposes
- Config compatibility exists for both legacy and renamed settings paths
- The repository includes preservation material for models, training, and architecture
- The long-term direction is ecosystem integration through a shared voice interface layer

## Documentation Map

- [RUN_COMMANDS.md](./RUN_COMMANDS.md): practical run commands
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md): startup and runtime troubleshooting
- [MICROPHONE_TROUBLESHOOTING.md](./MICROPHONE_TROUBLESHOOTING.md): microphone and voice-path notes
- [CURRENT_ISSUES.md](./CURRENT_ISSUES.md): actively tracked problems
- [REBRANDING.md](./REBRANDING.md): rebrand tracking
- [TRANSFER_PACK.md](./TRANSFER_PACK.md): project handoff context
- [VISION.md](./VISION.md): broader direction

## Why This Project Exists

Arqon Maestro exists to give Arqon a unified, voice-native interaction layer.

It is the piece that turns speech into a practical control plane for:

- development
- navigation
- execution
- orchestration
- cross-tool interaction

The short version:

- voice coding matters
- voice control matters beyond coding alone
- local-first developer tooling matters
- ecosystems need coherent interaction layers
- this codebase is worth preserving and extending

## Credits

Arqon Maestro exists because voice-native developer tooling and voice-native system control are worth preserving, improving, and making usable in practice.
