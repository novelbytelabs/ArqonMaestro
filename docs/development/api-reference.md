# API Reference

This page captures the practical custom-commands API surface used by Arqon Maestro today.

> Video placeholder: custom command API walkthrough.

## Builder Entry Points

The runtime exposes builder entry points for:

- global command registration
- app-scoped command registration
- language-scoped command registration
- extension-scoped command registration
- combined app-and-language scopes
- URL-scoped browser commands
- context-change callbacks

## Builder Methods

### `command(templated, callback, options?, disabled?)`

Register an imperative command implemented in JavaScript.

### `text(templated, text, options?, disabled?)`

Register a command that types a fixed text payload.

### `key(templated, key, modifiers, options?, disabled?)`

Register a command that presses a key combination.

### `snippet(templated, generated, options?, snippetType?, disabled?)`

Register a generated snippet template.

### `hint(hint, disabled?)`

Expose a contextual hint.

### `pronounce(before, after, disabled?)`

Register a custom pronunciation or spoken-word mapping.

### `disable(ids)`

Disable previously registered commands, hints, or words.

### `enable(ids)`

Re-enable previously registered commands, hints, or words.

## Driver Methods Exposed To Callbacks

Based on the current sidecar wiring, callbacks can access capabilities such as:

- `focusApplication()`
- `typeText()`
- `pressKey()`
- `domClick()`
- `domFocus()`
- `domBlur()`
- `domCopy()`
- `domScroll()`
- `evaluateInPlugin()`
- `runCommand()`

## Transport Model

The sidecar communicates with the desktop app over a WebSocket on `ws://localhost:17373`.

Messages include:

- `customCommands`
- `execute`
- `reload`
- `keepalive`
- `callback`
- `contextChanged`
- `sendText`

For the exact symbol names used by the current sidecar implementation, consult the local source tree.
