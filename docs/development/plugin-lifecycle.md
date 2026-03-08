# Plugin Lifecycle

The plugin lifecycle is straightforward but important: connect, announce, stay alive, handle responses, and return callbacks.

> Video placeholder: plugin startup and request handling.

## Startup

In the VS Code implementation:

1. the extension activates
2. the app instance starts
3. IPC ensures a WebSocket connection
4. the plugin sends `active`

## Steady State

While connected, the plugin:

- keeps reconnecting if disconnected
- sends `heartbeat` every minute
- listens for `response` messages

## Handling A Response

When a `response` message arrives:

1. the plugin parses it
2. it dispatches each command to the local command handler
3. it returns a callback payload if needed
4. if no special result exists, it returns `completed`

## Why This Matters

This lifecycle is the contract that makes structured editing possible. Without it, the desktop app falls back to more generic system input paths.

## Command Handler Surface

The VS Code command handler already supports operations such as:

- opening and closing tabs
- copy and paste
- revealing lines
- reading editor state
- applying source changes and cursor movement

That is the concrete bridge between Arqon Maestro’s interpreted commands and an editor’s actual buffer state.
