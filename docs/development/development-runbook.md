# Development Runbook

This runbook is the default day-to-day checklist for local Arqon Maestro development.

## Scope

- Desktop renderer/main process development
- Voice loop and onboarding UI iteration
- Browser integration smoke checks with a clean Chrome profile

## Baseline Constraints

- Do not change frozen toolchain versions during normal development.
- Keep runtime assumptions aligned with current project constraints and docs.

## Standard Development Loop

1. Start from a clean git status and pull latest branch updates.
2. Start Maestro client dev process.
3. Start ArqonBus server.
4. Validate onboarding, operator shell, and footer/titlebar behavior in-window.
5. Run a renderer production build check before committing:

```bash
cd maestro/client
npm run build:renderer
```

## Local Bring-Up (Two Terminals)

### Terminal 1: Maestro client

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro/client
npm run dev
```

### Terminal 2: ArqonBus websocket server

```bash
cd ~/Projects/arqon/ArqonBus
python - <<'PY'
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

## Clean Chrome Profile Smoke Test

Use this when testing browser-driven behavior without extension/profile drift.

### Launch Chrome with a clean profile

```bash
google-chrome --user-data-dir=/tmp/arqon-chrome-clean --no-first-run --window-size=1280,800 --force-device-scale-factor=1
```

Expected terminal note (can appear on startup):

```text
Created TensorFlow Lite XNNPACK delegate for CPU.
```

### Cleanup the temporary profile

```bash
rm -rf /tmp/arqon-chrome-clean
```

## Pre-Commit Checks

- Renderer compiles without TypeScript/Webpack regressions for touched areas.
- UI states tested: onboarding screens, operator shell, footer controls, scroll behavior.
- No unintended changes to frozen or explicitly protected styles/components.

## Evidence To Capture In PRs

- What was changed
- Why it was changed
- How it was verified (commands + screenshots if UI)
- Any known unrelated blockers (explicitly labeled)
