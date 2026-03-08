# Protocol Messages

This page documents the message types visible in the current plugin implementation and custom-commands sidecar.

> Video placeholder: protocol message examples.

## Plugin To App

### `active`

Sent when the plugin connects. Includes:

- `app`
- `id`

### `heartbeat`

Periodic liveness signal from the plugin.

### `callback`

Used to return a result for a prior protocol request. In the VS Code implementation, a default callback response is:

- `message: "completed"`

Other callback payloads can return editor state or command-specific results.

## App To Plugin

### `response`

Carries structured command responses for the plugin to execute.

### `reload`

Relevant to the custom-commands sidecar; instructs it to reload scripts.

### `keepalive`

Used to keep the sidecar healthy and confirm responsiveness.

## Sidecar-Specific Messages

The custom command process also exchanges:

- `customCommands`
- `execute`
- `contextChanged`
- `sendText`
- `error`

## Command Payloads

The protocol’s command vocabulary is defined in the core protobuf schema and includes command types such as:

- `GET_EDITOR_STATE`
- `COPY`
- `PASTE`
- `PRESS`
- `CLICK`
- `SHOW`
- `SHOW_REVISION_BOX`
- `START_DICTATE`
- `STOP_DICTATE`
- `DOM_CLICK`
- `DOM_FOCUS`
- `DOM_BLUR`
- `DOM_COPY`
- `DOM_SCROLL`

That confirms the protocol is broader than editor text replacement; it is also part of the window, browser, and dictate-mode control surface.
