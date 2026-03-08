# Arqon Maestro

Arqon Maestro is a voice-first coding environment for developers who want to write, navigate, and edit software with natural speech.

It is built from the open-source Serenade codebase and rebranded as a distinct project. The purpose of Arqon Maestro is straightforward:

- make coding by voice practical
- preserve and modernize an accessibility-first voice coding stack
- support both cloud-backed and local/offline-style deployment paths
- provide a foundation for voice-native developer tools

## What Arqon Maestro Does

Arqon Maestro listens to spoken coding commands, turns them into transcripts, interprets those transcripts as code actions, and sends the resulting edits to the active editor plugin.

In practice, that means it can help with:

- writing and revising code by voice
- inserting syntax-aware edits instead of raw dictation only
- navigating files, tabs, and code structure
- issuing editor actions through supported plugins
- dictation and text-entry workflows
- accessibility-focused hands-free coding

## Key Capabilities

- Real-time microphone capture from the desktop client
- Speech-to-text pipeline for spoken coding commands
- Command interpretation for source-code edits
- Context-aware editor operations through plugins
- Desktop app built with Electron
- VS Code integration via the extension in [`vscode-plugin`](./vscode-plugin)
- Support for local and remote backend endpoints
- Training and model architecture artifacts preserved in the repository

## Typical Workflow

1. Start the Arqon Maestro desktop app.
2. Focus a supported editor.
3. Toggle listening.
4. Speak a command such as `new line`, `go to definition`, or `add function`.
5. Arqon Maestro captures audio, resolves a transcript, interprets intent, and applies the action through the active plugin.

## Who It Is For

Arqon Maestro is especially relevant for:

- developers with RSI or other repetitive strain concerns
- developers who need accessibility-first input methods
- developers experimenting with voice-native software workflows
- researchers and builders working on local speech/code systems

## Repository Layout

| Component | Path | Purpose |
| --- | --- | --- |
| Desktop client | [`serenade/client`](./serenade/client) | Electron app, microphone capture, UI, streaming |
| Core service | [`serenade/core`](./serenade/core) | Main command-processing service |
| Speech engine | `serenade/speech-engine` | Speech recognition service |
| Code engine | `serenade/code-engine` | Transcript-to-code interpretation models |
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

Run the client:

```bash
cd serenade/client
unset ELECTRON_RUN_AS_NODE
./node_modules/.bin/electron . --no-sandbox --disable-gpu
```

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
- Some legacy internal identifiers still use `serenade` for compatibility
- Config compatibility exists for both legacy and renamed settings paths
- The repository includes preservation material for models, training, and architecture

## Documentation Map

- [RUN_COMMANDS.md](./RUN_COMMANDS.md): practical run commands
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md): startup and runtime troubleshooting
- [MICROPHONE_TROUBLESHOOTING.md](./MICROPHONE_TROUBLESHOOTING.md): microphone and voice-path notes
- [CURRENT_ISSUES.md](./CURRENT_ISSUES.md): actively tracked problems
- [REBRANDING.md](./REBRANDING.md): rebrand tracking
- [TRANSFER_PACK.md](./TRANSFER_PACK.md): project handoff context
- [VISION.md](./VISION.md): broader direction

## Why This Project Exists

Arqon Maestro is not meant to pretend to be the original Serenade product. It is a fork, a continuation effort, and a practical attempt to keep an important voice-coding stack usable, inspectable, and improvable.

The short version:

- voice coding matters
- accessibility matters
- local-first developer tooling matters
- this codebase is worth preserving and extending

## Credits

Arqon Maestro is based on the open-source Serenade project and continues that work under a distinct name and direction.
