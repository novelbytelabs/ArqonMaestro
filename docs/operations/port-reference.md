# Port Reference

Canonical local port assignments for Arqon Maestro.

## Runtime Ports

| Surface | Port | Protocol | Purpose |
|---|---:|---|---|
| Arqon Bus | `9100` | WebSocket | Bus transport for plugin/control-plane/STT bus messages |
| Core stream endpoint | `17200` | WebSocket (`/stream/`) | Legacy core speech stream path used by core client flow |
| Speech engine status | `17202` | HTTP | Local speech-engine health/status |
| Code engine status | `17203` | HTTP | Local code-engine health/status |

## Test/Smoke Ports

| Surface | Port | Purpose |
|---|---:|---|
| Replay smoke default | `9101` | Isolated replay test to avoid soak collision |
| Integrity smoke default | `9102` | Isolated integrity handshake probe |
| Soak override (recommended) | `9103` | Soak test isolation when `9100` is in use |

## Deprecated / Removed

- `17373` is deprecated and removed from active Maestro runtime paths.
- Do not add new integrations against `17373`.

## Rules

1. Use `9100` for plugin/bus integrations.
2. Use `17200/stream/` only for core stream endpoint scenarios.
3. If a doc mentions both, explicitly state which integration path it refers to.
