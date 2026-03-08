# ArqonMaestro Run Commands

This document contains the working commands to run the ArqonMaestro application locally.

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
   cd ~/Projects/arqon/ArqonMaestro/serenade
   SERENADE_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/serenade ./gradlew :core:installDist -x downloadModels
   ```

   For a full local voice stack, this repository also needs the native dependencies described in `serenade/docs/building.md` (`scripts/setup/build-dependencies.sh`). Without those, `speech-engine` / `code-engine` packaging can still be incomplete.

2. **Select the local endpoint in the correct settings file**:
   ```bash
   mkdir -p ~/.serenade
   python - <<'PY'
import json, os
path = os.path.expanduser("~/.serenade/serenade.json")
data = {}
if os.path.exists(path) and os.path.getsize(path) > 0:
    with open(path) as f:
        data = json.load(f)
data["streaming_endpoint"] = "local"
with open(path, "w") as f:
    json.dump(data, f, indent=2)
PY
   ```
   `ArqonMaestro` reads the active endpoint from `~/.serenade/serenade.json`, not `~/.serenade/settings.json`.

3. **Install missing X11 libraries** (if on Linux):
   ```bash
   sudo apt install libxcb-dri3-0 libxcb-present0 libxcb-sync1
   ```

## Running the Application

### Terminal 1 - Build the Local Server Bundle

```bash
cd ~/Projects/arqon/ArqonMaestro/serenade
./gradlew client:installServer -x downloadModels
```

If native dependencies are installed correctly, this populates `serenade/client/static/local` with:
- `core`
- `speech-engine`
- `code-engine`
- models
- bundled JDK

### Terminal 2 - Start the Client

```bash
cd ~/Projects/arqon/ArqonMaestro/serenade/client
unset ELECTRON_RUN_AS_NODE
./node_modules/.bin/electron . --no-sandbox --disable-gpu
```

When the endpoint is `local`, the Electron client will start the bundled local services itself from `out/static/local`.

### VS Code Extension

To use ArqonMaestro with VS Code:

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
   This creates `serenade-1.5.3.vsix`

3. **Install in VS Code**:
   - Open VS Code
   - Go to Extensions
   - Click the "..." menu
   - Select "Install from VSIX"...
   - Select the built .vsix file

4. **Configure**:
   - Make sure the Serenade server is running (Terminal 1)
   - The extension should connect automatically to localhost:17200

**Note**: The extension is currently named "Serenade" in package.json. To rebrand to "ArqonMaestro", update:
   - `package.json`: name, displayName, publisher

Or with debugging:
```bash
ELECTRON_ENABLE_LOGGING=1 ./node_modules/.bin/electron . --enable-logging --no-sandbox --disable-gpu 2>&1 | tee electron.log
```

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| CORE_PORT | 17200 | Server port |
| SERENADE_SOURCE_ROOT | ~/Projects/arqon/ArqonMaestro/serenade | Source code path |
| SERENADE_LIBRARY_ROOT | ~/Projects/arqon/ArqonMaestro/serenade | Models/libraries path |

## Troubleshooting

- **NumberFormatException on Core.java:18**: Missing CORE_PORT environment variable
- **ECONNREFUSED on WebSocket**: Local bundle missing or backend incomplete - run `./gradlew client:installServer -x downloadModels`
- **Wrong endpoint errors**: Check `~/.serenade/serenade.json` has `"streaming_endpoint": "local"`
- **Only core is running**: This is not enough for voice. Local mode also requires `speech-engine` on `17202` and `code-engine` on `17203`
- **libxcb errors**: Install libxcb libraries: `sudo apt install libxcb-dri3-0 libxcb-present0 libxcb-sync1`
- **Window not showing**: Try with `--no-sandbox --disable-gpu` flags

## Project Structure

```
~/Projects/arqon/ArqonMaestro/
├── serenade/                    # Main project
│   ├── core/                    # Java server
│   │   └── build/install/core/  # Built distribution
│   ├── client/                  # Electron client
│   └── gradlew                 # Gradle wrapper
└── ~/.serenade/serenade.json  # System settings / active endpoint
```
