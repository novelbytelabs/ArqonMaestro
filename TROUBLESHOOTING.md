# Arqon Maestro Troubleshooting Guide

## Overview

Arqon Maestro is a voice-native control layer built on top of an inherited engine stack. It currently consists of:
- **Java Server** (Jetty + custom speech processing)
- **Electron Client** (React + TypeScript UI)

## Current Status

- ✅ Java server builds and runs on port 17200
- ✅ Electron client builds and runs
- 🔄 VS Code extension - needs to be built and installed

## System Environment

- **OS**: Linux (helios-gpu-118)
- **Node.js**: v18+
- **Java**: 17 (upgraded from 14)
- **Gradle**: 8.5 (upgraded from 7.4.2)

## Issues Encountered

### 1. Build Issues (RESOLVED)

#### Protobuf Version Mismatch
- **Problem**: System had protobuf 3.12.4, project needed 3.14.0+
- **Solution**: Installed protoc 3.14.0 locally

#### Gradle/Java Version
- **Problem**: Original project used Java 14 + Gradle 7.4.2
- **Solution**: Upgraded to Java 17 + Gradle 8.5
- **Changes**:
  - Added JAXB dependency for Java 17 compatibility in `core/build.gradle`
  - Updated `gradle/wrapper/gradle-wrapper.properties`

### 2. Runtime Issues (RESOLVED)

#### Missing Environment Variables
- **Problem**: `CORE_PORT` was null, causing `NumberFormatException` in `Core.java:18`
- **Solution**: Set environment variables before running:
  ```bash
  CORE_PORT=17200 
  ARQON_MAESTRO_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/maestro
  ARQON_MAESTRO_LIBRARY_ROOT=~/libarqon
  ```

#### Native Module Missing: serenade-driver
- **Problem**: Native Node.js module `serenade-driver` not available
- **Solution**: Created stub at `client/src/main/driver/stub.ts`

#### Native Module Missing: speech-recorder
- **Problem**: Native audio recording module not available
- **Solution**: Created TypeScript implementation at `client/src/main/audio/index.ts`

#### WebSocket Connection
- **Problem**: Client trying to connect to remote server instead of local
- **Solution**: Use `~/.arqon/arqon.json` as the canonical endpoint file:
  ```json
  {"streaming_endpoint":"local"}
  ```

### 3. Current Issue: UI Stuck on Loading

#### Symptoms
- Electron window opens but shows "Loading..." indefinitely
- No error messages in terminal (only warnings)
- Server IS running on port 17200 (confirmed via `lsof`)

#### Terminal Output
```
[WARNING] bluez_dbus_manager.cc: Floss manager not present
[WARNING] gpu_sandbox_hook_linux.cc: dlopen(libxcb-dri3.so) failed
[WARNING] gpu_sandbox_hook_linux.cc: dlopen(libxcb-present.so) failed  
[WARNING] gpu_sandbox_hook_linux.cc: dlopen(libxcb-sync.so) failed
[INFO] Electron Security Warning (Insecure Content-Security-Policy)
```

#### Attempted Fixes
1. Running with `--no-sandbox --disable-gpu` flags
2. Fixed the Linux active-app fallback so the app does not mis-target itself
3. Verified settings file exists with correct endpoint

#### Root Cause (FOUND)
- `loggedIn` in renderer state stayed `undefined`, so `LoadingPage` never redirected.
- Startup could stall or race before renderer got the initial state update:
  - The custom commands sidecar (`serenade-custom-commands-server.min.js`) crashed with:
    `Cannot find module 'chokidar'`
  - `Custom.start()` originally waited indefinitely for sidecar socket connection.
  - Initial `bridge.setState({ loggedIn: ... })` could be missed if renderer IPC listener was not ready yet.

#### Additional Deep-Dive Findings
- The previous local run instructions were incomplete:
  - Running only `core` on `17200` is not enough for voice recognition.
  - Local voice also requires:
    - `speech-engine` on `17202`
    - `code-engine` on `17203`
- Rebuilding the full local engine bundle from this checkout currently requires additional native dependencies (for example Marian / related `code-engine` build inputs). Without those, local packaging can still be incomplete even after `client:installServer`.
- Endpoint selection was being written to the wrong file:
  - Canonical runtime source is `~/.arqon/arqon.json`
  - Legacy `~/.serenade/serenade.json` is only a compatibility fallback
- The Electron main bundle originally did not copy `static/local` into `out/static/local`, so `Local.start()` could not launch bundled services even after they were built.
- The Linux driver stub previously hardcoded the active app to the legacy product name, which could prevent proper editor targeting.

#### Final Fix Applied
1. **Fail-open custom sidecar startup**
   - File: `maestro/client/src/main/ipc/custom.ts`
   - Change: `Custom.start()` now resolves even if sidecar never connects (timeout + exit handling), so app initialization continues.
2. **Send loggedIn state twice during startup**
   - File: `maestro/client/src/main/app.ts`
   - Change: send initial `loggedIn` state immediately, then resend after 1.5s to cover IPC listener race.
3. **Loading page fallback redirect**
   - File: `maestro/client/src/renderer/pages/loading.tsx`
   - Change: if `loggedIn` is still `undefined` after 3s, redirect to `/welcome` instead of spinning forever.
4. **Legacy endpoint migration + backend diagnostics**
   - Files:
     - `maestro/client/src/main/settings.ts`
     - `maestro/client/src/main/stream/stream.ts`
     - `maestro/client/src/main/stream/chunk-manager.ts`
   - Changes:
     - migrate legacy endpoint values from the wrong config location
     - fail fast if local backend is incomplete
     - surface a clear UI warning instead of silently entering a broken listen state
5. **Active application detection on Linux**
   - File: `maestro/client/src/main/driver/stub.ts`
   - Change: use `xprop` on X11 to detect the active app instead of always returning `"serenade"`.
6. **Packaged local backend wiring**
   - Files:
     - `maestro/core/build.gradle`
     - `maestro/client/main.webpack.ts`
   - Changes:
     - fixed `core` tree-sitter build task to pass the source-root environment correctly
     - verified `./gradlew client:installServer -x downloadModels` succeeds
     - copy `static/local` into `out/static/local` so Electron can actually launch the bundled local services

#### Verification
- Rebuilt client (`npm run build`) and relaunched Electron.
- UI now leaves `Loading...` and proceeds to onboarding/main flow.

#### What Should Happen
1. Client connects to `ws://localhost:17200/stream/`
2. WebSocket connection established
3. `loggedIn` state set to `true` in Redux store
4. UI transitions from LoadingPage to main app

#### Debugging Steps Taken
1. Confirmed server running: `lsof -i :17200` shows Java process listening
2. Tested WebSocket: `curl` shows server responds (HTTP 400 - normal for curl)
3. Checked settings: `~/.arqon/arqon.json` has correct content
4. Ran with debug flags: `ELECTRON_ENABLE_LOGGING=1 electron . --enable-logging`

## Code Locations

### Server
- Main: `maestro/core/src/main/java/core/Core.java`
- WebSocket: Jetty on `/stream/` endpoint

### Client
- Entry: `maestro/client/src/main/index.ts`
- App: `maestro/client/src/main/app.ts`
- Stream: `maestro/client/src/main/stream/stream.ts`
- Settings: `maestro/client/src/main/settings.ts`
- Loading Page: `maestro/client/src/renderer/pages/loading.tsx`
- Driver Stub: `maestro/client/src/main/driver/stub.ts`

## Commands That Work

### Build Server
```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
ARQON_MAESTRO_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/maestro ./gradlew :core:installDist -x downloadModels
```

### Run Server
```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
CORE_PORT=17200 ARQON_MAESTRO_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/maestro ARQON_MAESTRO_LIBRARY_ROOT=~/libarqon ./core/build/install/core/bin/core
```

### Build Client
```bash
cd ~/Projects/arqon/ArqonMaestro/maestro/client
npm run build
```

### Run Client (with GPU bypass)
```bash
cd ~/Projects/arqon/ArqonMaestro/maestro/client
unset ELECTRON_RUN_AS_NODE
./node_modules/.bin/electron . --no-sandbox --disable-gpu
```

## Questions for Other AI

1. Why is the Electron UI stuck on "Loading..." even though the server is running and the WebSocket should be connecting?

2. The `loading.tsx` component shows "Loading..." when `loggedIn` is undefined. What conditions need to be met for `loggedIn` to become `true`?

3. The `stream.ts` connects to `ws://localhost:17200/stream/`. Is there something that needs to happen BEFORE the WebSocket connects for the UI to load?

4. Could the GPU/X11 warnings be causing a silent crash that's preventing the renderer from initializing?

5. Is there a way to get more verbose logging from the Electron renderer process to see what's failing?

## Related Files

- `RUN_COMMANDS.md` - Working run commands
- `maestro/build.gradle` - Updated dependencies
- `maestro/core/build.gradle` - JAXB added
- `maestro/client/src/main/driver/stub.ts` - Native module stub
- `maestro/client/src/main/audio/index.ts` - Audio implementation
