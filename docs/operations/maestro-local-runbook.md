# Arqon Maestro Local Runbook

This runbook is the fastest way to get the backend running locally.

## 30-Second Quick Start (Use This First)

If you just want working local backend services:

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
export ARQON_MAESTRO_SOURCE_ROOT="$PWD"
export ARQON_MAESTRO_LIBRARY_ROOT="$HOME/libserenade"
export SERENADE_SOURCE_ROOT="$ARQON_MAESTRO_SOURCE_ROOT"
export SERENADE_LIBRARY_ROOT="$ARQON_MAESTRO_LIBRARY_ROOT"
./gradlew :core:installDist client:installServer -x downloadModels
./scripts/run_client.sh
```

Then verify:

```bash
ss -ltnp | rg "17200|17202|17203"
curl -sS -m 3 http://127.0.0.1:17200/api/status
curl -sS -m 3 http://127.0.0.1:17202/api/status
curl -sS -m 3 http://127.0.0.1:17203/api/status
```

If any of those ports is missing, non-focus commands will fail.

## Desktop App Start Modes (Use The Right One)

Use these modes instead of defaulting to `npm run dev` for everything.

| Goal | Command | Speed | Notes |
| --- | --- | --- | --- |
| Fastest relaunch with existing build | `./scripts/run_client.sh` | Fastest | Uses existing `client/out` bundles. No webpack wait. |
| Active frontend development | `cd client && npm run dev` | Medium startup, fastest iteration | Runs webpack-dev-server + electron with hot reload. |
| Refresh production bundles, then launch | `cd client && npm run build && cd .. && ./scripts/run_client.sh` | Slowest startup | Best for clean bundle validation, not day-to-day quick restarts. |

Important:

* `npm run dev` is not the only valid way to run Maestro.
* `run_client.sh` is the fastest path when you are not changing renderer/main bundle code.
* If `run_client.sh` fails after a clean checkout, build once: `cd client && npm run build`.

## What To Start

Use this table first:

| If you need... | Start this | Port(s) |
| --- | --- | --- |
| Chrome extension / Arqon Bus transport | ArqonBus WebSocket server | `9100` |
| Full local Maestro voice stack | Core + speech-engine + code-engine via local bundle | `17200`, `17202`, `17203` |

## Option A: Start ArqonBus (Port 9100)

Use this when the Chrome extension or bus-based integrations need to connect.

### 1. Start the server

From the `ArqonBus` repo:

```bash
cd ~/Projects/arqon/ArqonBus
PYTHONPATH=src python - <<'PY'
import asyncio
from arqonbus.config.config import get_config
from arqonbus.transport.websocket_bus import WebSocketBus
from arqonbus.routing.client_registry import ClientRegistry

async def main():
    config = get_config()
    ws_bus = WebSocketBus(ClientRegistry(), config=config)
    await ws_bus.start_server(host=config.server.host, port=config.server.port)
    print(f"ArqonBus listening on {config.server.host}:{config.server.port}")
    await asyncio.Future()

asyncio.run(main())
PY
```

Expected output:

```text
ArqonBus listening on 127.0.0.1:9100
```

### 2. Verify the port is open

```bash
ss -ltnp | rg "9100"
```

### 3. Quick probe

```bash
curl -i http://127.0.0.1:9100/ --max-time 3
```

Expected result: HTTP `426 Upgrade Required` or another upgrade-related response.

That is normal for a WebSocket endpoint.

### 4. Chrome extension connection target

The extension should point to:

`ws://localhost:9100/?room=maestro&channel=plugin.chrome`

## Option B: Start Full Local Maestro Backend (17200/17202/17203)

Use this when you want the local speech + command processing stack.

Important symptom mapping:

* If only `focus` commands work and `insert` / `go to` / `undo` / `new line` fail, your local backend is not fully healthy.
* In that state, one or more of `17200`, `17202`, `17203` is down or unhealthy.

### 1. Build local bundle

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
export ARQON_MAESTRO_SOURCE_ROOT="$PWD"
export ARQON_MAESTRO_LIBRARY_ROOT="$HOME/libserenade"
export SERENADE_SOURCE_ROOT="$ARQON_MAESTRO_SOURCE_ROOT"
export SERENADE_LIBRARY_ROOT="$ARQON_MAESTRO_LIBRARY_ROOT"
./gradlew client:installServer -x downloadModels
```

If the bundle is incomplete, verify these paths exist:

```bash
ls -la ~/Projects/arqon/ArqonMaestro/maestro/client/static/local/{core,speech-engine,code-engine}
```

### 2. Validate dependency root before build

If you get missing native dependency errors, check which dependency root is populated:

```bash
ls -la "$HOME/libserenade/boost" "$HOME/libserenade/crow/include" \
       "$HOME/libserenade/sentencepiece/lib/libsentencepiece.a" \
       "$HOME/libserenade/marian/build/libmarian.a"
```

If these exist under `~/libserenade` but not `~/libarqon`, keep `ARQON_MAESTRO_LIBRARY_ROOT=~/libserenade`.

### 3. Set endpoint to local

This is only needed if your endpoint is not already `local`.

Quick check:

```bash
cat ~/.arqon/arqon.json | rg '"streaming_endpoint"'
```

If it already says `"local"`, skip this section.

```bash
mkdir -p ~/.arqon
python - <<'PY'
import json, os
path = os.path.expanduser("~/.arqon/arqon.json")
data = {}
if os.path.exists(path) and os.path.getsize(path) > 0:
    with open(path) as f:
        data = json.load(f)
data["streaming_endpoint"] = "local"
with open(path, "w") as f:
    json.dump(data, f, indent=2)
print("Updated", path)
PY
```

Why this exists:

* it does **not** start services
* it only tells the desktop app which backend profile to use (`local` vs remote)

### 4. Start the client host (which launches local services)

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
export ARQON_MAESTRO_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/maestro
export ARQON_MAESTRO_LIBRARY_ROOT=~/libserenade
export SERENADE_SOURCE_ROOT="$ARQON_MAESTRO_SOURCE_ROOT"
export SERENADE_LIBRARY_ROOT="$ARQON_MAESTRO_LIBRARY_ROOT"
./scripts/run_client.sh
```

### 5. Verify local services

```bash
ss -ltnp | rg "17200|17202|17203"
curl -i http://127.0.0.1:17200/api/status --max-time 3
curl -i http://127.0.0.1:17202/api/status --max-time 3
curl -i http://127.0.0.1:17203/api/status --max-time 3
```

All three ports must be healthy before testing editing/navigation commands.

If one is missing:

* `17200` missing: core is down (no interpretation pipeline)
* `17202` missing: speech-engine is down (no STT lane)
* `17203` missing: code-engine is down (no transcript-to-command pipeline)

### 6. Hard reset if services are stuck

```bash
pkill -f "arqon-maestro-speech-engine|arqon-maestro-code-engine|serenade-speech-engine|serenade-code-engine|core/build/install/core/bin/core" || true
sleep 1
ss -ltnp | rg "17200|17202|17203" || true
```

Then rebuild and restart:

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
./gradlew :core:installDist -x downloadModels
./gradlew client:installServer -x downloadModels
./scripts/run_client.sh
```

## Fast Health Checklist

Run this any time things look broken:

```bash
ss -ltnp | rg "9100|17200|17202|17203"
```

Interpretation:

* `9100` up: ArqonBus up
* `17200` up: core server up
* `17202` up: speech-engine up
* `17203` up: code-engine up
* Only `9100` up: extension transport only; voice command backend is not running
* Only `17203` up: partial/invalid state; editing commands will fail

If no `17200/17202/17203` ports are up, you haven't started the local Maestro backend yet.

If Electron shows `Failed to load URL: http://localhost:4000` with `ERR_CONNECTION_REFUSED`:

* you are in dev URL mode without `npm run dev` running
* use `./scripts/run_client.sh` (it now forces `NODE_ENV=production`)
* only use `npm run dev` when you intentionally want the webpack dev server on port `4000`

## Known Behavior (Not Always Fatal)

If you see this on ArqonBus:

`InvalidUpgrade: invalid Connection header: keep-alive`

it typically means a plain HTTP probe hit the WebSocket endpoint. This is noisy but does not necessarily mean the bus is down.

## Manual Core Startup (debug-only)

Use this only for targeted core debugging, not as the normal full-stack startup path:

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
CORE_PORT=17200 \
ARQON_MAESTRO_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/maestro \
ARQON_MAESTRO_LIBRARY_ROOT=~/libserenade \
SERENADE_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/maestro \
SERENADE_LIBRARY_ROOT=~/libserenade \
./core/build/install/core/bin/core
```

If this crashes with `libjava-tree-sitter` path errors, rebuild core:

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
./gradlew :core:installDist -x downloadModels
```

## Stop / Restart

If you started from a terminal in foreground, `Ctrl+C` stops it.

For a clean restart:

1. stop current process
2. confirm port is free:
   ```bash
   ss -ltnp | rg "9100|17200|17202|17203"
   ```
3. start again with the commands above

## Related Docs

* [Port Reference](./port-reference.md)
* [Configuration](./configuration.md)
* [Troubleshooting Map](./troubleshooting-map.md)
* [Arqon Bus Migration Runbook](./arqon-bus-migration-runbook.md)
