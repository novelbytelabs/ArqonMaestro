# E5 Execution Setup Guide

This guide walks you through setting up the test environment for E5 adversarial scenario execution.

## Prerequisites

1. **Linux desktop with audio** - The desktop app needs audio input/output
2. **Chrome browser** - For loading the extension
3. **~20GB disk space** - For build dependencies

## Step 1: Build the Desktop App

Open a terminal and run:

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
export ARQON_MAESTRO_SOURCE_ROOT="$PWD"
export ARQON_MAESTRO_LIBRARY_ROOT="$HOME/libserenade"
export SERENADE_SOURCE_ROOT="$ARQON_MAESTRO_SOURCE_ROOT"
export SERENADE_LIBRARY_ROOT="$ARQON_MAESTRO_LIBRARY_ROOT"

# Install server bundle
./gradlew client:installServer -x downloadModels
```

## Step 2: Configure Settings

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

## Step 3: Build the Chrome Extension

```bash
cd ~/Projects/arqon/maestro-chrome-extension
npm install
npm run build
```

This creates the built extension in the `build/` folder.

## Step 4: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `build/` folder from the extension directory

## Step 5: Run Desktop App

Open a new terminal:

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
./scripts/run_client.sh
```

Wait for the app to start. You should see the Arqon Maestro window.

## Step 6: Enable Security Diagnostics

For development/testing, enable the security devtools flag:

```bash
# This can be set before running the app
export ARQON_SECURITY_DEVTOOLS=1
```

## Using Kokoro TTS for Unknown Speaker Testing

For scenarios that require simulating an unknown speaker (S02, S08), you can use Kokoro TTS to generate speech that will be picked up by the microphone.

### Setup Kokoro

1. **Start Kokoro sidecar** (in a separate terminal):
```bash
conda activate helios-gpu-118
cd ~/Projects/arqon/ArqonMaestro
PYTHONPATH=maestro/client/scripts \
python -m uvicorn kokoro_sidecar:app --host 127.0.0.1 --port 7781
```

2. **Verify Kokoro is running**:
```bash
curl http://127.0.0.1:7781/healthz
curl http://127.0.0.1/readyz
```

3. **Configure voice**: The default voice is `af_heart`. To use a different voice (for testing unknown speaker), you'll need to modify the settings or use environment variables:
   - `af_heart` (default female)
   - `af_bella` (alternative female)
   - Male voices may also be available depending on the model

### Testing Unknown Speaker

The key insight is that the speaker verification system compares the voice profile of what's being captured vs. enrolled profiles. To trigger "unknown speaker" behavior:

1. Have the verified speaker activate first (to establish baseline)
2. Use Kokoro with a different voice to speak commands
3. The system may or may not detect it as unknown depending on the voice similarity detection

**Note**: Playing TTS through speakers will be captured by the same microphone, so it may not reliably trigger unknown speaker detection. For more reliable testing, consider:
- Using pre-recorded audio from a different person
- Using the speaker verification service's `reset()` method to force unknown state

---

## Per-Scenario Execution

For each scenario (S01-S08):

1. **Reset replay** (if needed):
    - Open extension popup or sidepanel
    - Click "Reset Replay" (only works with ARQON_SECURITY_DEVTOOLS=1)

2. **Capture baseline**:
    - Take screenshot of diagnostics panel
    - Note the replay summary (total records, sequence)

3. **Run scenario steps**:
    - Follow the steps in the scenario description file

4. **Capture result**:
    - Take screenshot after action
    - Export event log (see below)
    - Note reason code
    - Note replay summary after

5. **Export event log**:
   In the extension popup/sidepanel context:
   ```js
   chrome.runtime.sendMessage({ type: "security-export-artifact" }, (payload) => {
     console.log(JSON.stringify(payload, null, 2));
   });
   ```

## Expected File Structure

After running all scenarios, you should have:

```
e5-evidence/
├── S01-heard-only-ambient/
│   ├── S01-description.md (filled in)
│   ├── S01-before.png
│   ├── S01-after.png
│   ├── S01-events.json
│   ├── S01-replay-before.json
│   └── S01-replay-after.json
├── S02-unknown-speaker-pilot/
│   └── ...
├── ... (all 8 scenarios)
└── e5-summary.md
```

## Troubleshooting

- **Extension not connecting**: Check that the desktop app is running and the Bus is connected
- **Security diagnostics not visible**: Ensure ARQON_SECURITY_DEVTOOLS=1 is set
- **Commands not executing**: Check the mode and trust state in the diagnostics panel

## Next Steps

After completing all scenarios, update the documentation:
1. Fill in the e5-summary.md table
2. Update maestro-implementation-progress.md
3. Update maestro-decision-log.md
4. Update maestro-gotcha-registry.md
