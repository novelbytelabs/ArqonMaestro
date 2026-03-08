# Current Issues - Arqon Maestro

## Summary

**Current state:**
- Client shows "Starting Server..." with NO toggle button ❌
- `loggedIn = true` is not the gating signal for this UI
- The actual gating signal is `localLoading`

## Latest Test Output

```
rm -rf out/
npm run build
# Build succeeded

./node_modules/.bin/electron . --no-sandbox --disable-gpu

# Output:
[Arqon Maestro] Streaming endpoint: local - localhost:17200
[Arqon Maestro] Token present: true
[Arqon Maestro] Setting loggedIn state: true
```

The client is setting `loggedIn = true`, but that does **not** control the toggle visibility.

## Actual Finding

This is **not primarily a React/Redux state propagation bug**.

The UI shows:
- `"Starting Server"` when `state.localLoading === true`
- the actual listen toggle only when `state.localLoading === false`

Relevant code:
- `src/renderer/components/listen-status.tsx`
- `src/renderer/components/listen-toggle.tsx`
- `src/main/ipc/local.ts`

`localLoading` is set here:
- `src/main/ipc/local.ts`
  - `pollUntilRunning()` sets `localLoading: true`
  - it only sets `localLoading: false` after `http://localhost:17202/api/status` succeeds

That means:
- `loggedIn = true` can be true
- and the UI can still correctly show `"Starting Server..."`
- if the local speech engine on port `17202` never comes up

## Root Cause Direction

The deeper issue is local backend completeness / startup, not renderer state:

1. Local mode requires more than `core` on `17200`
2. It also needs:
   - `speech-engine` on `17202`
   - `code-engine` on `17203`
3. If `17202` never becomes healthy, `localLoading` never clears
4. Then the UI intentionally hides the toggle and shows `"Starting Server..."`

## Questions for AI

1. **What controls the "Starting Server" vs toggle button display?**
   - Answer: `localLoading`
   - Toggle appears only when `localLoading === false`

2. **Is this a React/Redux state issue?**
   - Not primarily
   - Renderer is likely behaving correctly based on `localLoading`

3. **What does the listen-status.tsx component do?**
   - It shows "Starting Server" status
   - It switches once local backend startup completes and `localLoading` becomes false

4. **Could there be a WebSocket message not being sent/received?**
   - Possible secondary issue
   - But the immediate visible cause is local backend startup never completing

## Things to Check

1. **Is `speech-engine` actually running on `17202`?**
2. **Is `code-engine` actually running on `17203`?**
3. **Did `local.start()` spawn valid bundled binaries, or only placeholder `run-pro` scripts?**
4. **Is the client using `local` endpoint in `~/.arqon/arqon.json`?**
5. **Does `~/.arqon/speech-engine.log` or `~/.arqon/code-engine.log` show startup failure?**

## Files to Investigate

- `src/renderer/components/listen-status.tsx` - "Starting Server" message
- `src/renderer/components/listen-toggle.tsx` - Toggle button
- `src/main/ipc/local.ts` - localLoading lifecycle
- `src/main/stream/stream.ts` - WebSocket connection
- `src/main/settings.ts` - endpoint source of truth
- `~/.arqon/arqon.json` - canonical endpoint config

## Run Command

```bash
# Terminal 1 - Start only core (insufficient for full local voice)
cd ~/Projects/arqon/ArqonMaestro/maestro
CORE_PORT=17200 ARQON_MAESTRO_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/maestro ARQON_MAESTRO_LIBRARY_ROOT=~/libarqon ./core/build/install/core/bin/core

# Terminal 2 - Start client
cd ~/Projects/arqon/ArqonMaestro/maestro/client
unset ELECTRON_RUN_AS_NODE
./node_modules/.bin/electron . --no-sandbox --disable-gpu
```

## Important Note

Starting only `core` on `17200` is not enough to make the UI leave `"Starting Server..."` in local mode.
