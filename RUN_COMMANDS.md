# Arqon Maestro Run Commands

This document contains the working commands to run Arqon Maestro locally.

## Current Status

- ✅ Java server builds and runs on port 17200
- ✅ Electron client builds and runs
- 🔄 VS Code extension integration in progress

## Current Status

- ✅ Java server builds and runs on port 17200
- ✅ Electron client builds and runs
- 🔄 VS Code extension integration in progress

## Prerequisites

1. **Build the server first** (from project root):
   ```bash
   cd ~/Projects/arqon/ArqonMaestro/maestro
   ARQON_MAESTRO_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/maestro ./gradlew :core:installDist -x downloadModels
   ```

   For a full local voice stack, this repository also needs the native dependencies described in `maestro/docs/building.md` (`scripts/setup/build-dependencies.sh`). Without those, `speech-engine` / `code-engine` packaging can still be incomplete.

2. **Select the local endpoint in the canonical settings file**:
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
PY
   ```
   Arqon Maestro now treats `~/.arqon/arqon.json` as canonical. Legacy `~/.serenade/serenade.json` is still read as a fallback during migration.

3. **Install missing X11 libraries** (if on Linux):
   ```bash
   sudo apt install libxcb-dri3-0 libxcb-present0 libxcb-sync1
   ```

## Running the Application

### Terminal 1 - Build the Local Server Bundle

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
./gradlew client:installServer -x downloadModels
```

If native dependencies are installed correctly, this populates `maestro/client/static/local` with:
- `core`
- `speech-engine`
- `code-engine`
- models
- bundled JDK

### Terminal 2 - Start the Client

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
./scripts/run_client.sh
```

When the endpoint is `local`, the Electron client will start the bundled local services itself from `out/static/local`.

### VS Code Extension

To use Arqon Maestro with VS Code:

1. **Build the extension**:
   ```bash
   cd ~/Projects/arqon/ArqonMaestro/vscode-plugin
   npm install
   npm run build
   ```
   This creates `build/extension.js`

2. **Package the extension** (creates .vsix file):
   ```bash
   npx vsce package
   ```
   This creates a VS Code extension package. The current artifact name may still contain legacy naming until later rebrand phases land.

3. **Install in VS Code**:
   - Open VS Code
   - Go to Extensions
   - Click the "..." menu
   - Select "Install from VSIX"...
   - Select the built .vsix file

4. **Configure**:
   - Make sure the Arqon Maestro backend is running (Terminal 1)
   - The extension should connect automatically to localhost:17200

Or with debugging:
```bash
../scripts/with_clean_electron_env.sh env ELECTRON_ENABLE_LOGGING=1 ./node_modules/.bin/electron . --enable-logging --no-sandbox --disable-gpu 2>&1 | tee electron.log
```

Legacy compatibility note:

- If another legacy program needs Node-style Electron behavior, scope it per command instead of exporting globally:
  `ELECTRON_RUN_AS_NODE=1 <legacy-command>`

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| CORE_PORT | 17200 | Server port |
| ARQON_MAESTRO_SOURCE_ROOT | ~/Projects/arqon/ArqonMaestro/maestro | Engine source tree |
| ARQON_MAESTRO_LIBRARY_ROOT | ~/libarqon | Models and native dependencies |

Legacy compatibility:

- `SERENADE_SOURCE_ROOT` still works as a fallback
- `SERENADE_LIBRARY_ROOT` still works as a fallback

## Troubleshooting

- **NumberFormatException on Core.java:18**: Missing CORE_PORT environment variable
- **ECONNREFUSED on WebSocket**: Local bundle missing or backend incomplete - run `./gradlew client:installServer -x downloadModels`
- **Wrong endpoint errors**: Check `~/.arqon/arqon.json` has `"streaming_endpoint": "local"`
- **Only core is running**: This is not enough for voice. Local mode also requires `speech-engine` on `17202` and `code-engine` on `17203`
- **libxcb errors**: Install libxcb libraries: `sudo apt install libxcb-dri3-0 libxcb-present0 libxcb-sync1`
- **Window not showing**: Try with `--no-sandbox --disable-gpu` flags

## Project Structure

```
~/Projects/arqon/ArqonMaestro/
├── maestro/                    # Renamed engine subtree
│   ├── core/                    # Java server
│   │   └── build/install/core/  # Built distribution
│   ├── client/                  # Electron client
│   └── gradlew                 # Gradle wrapper
└── ~/.arqon/arqon.json        # Canonical system settings / active endpoint
```
