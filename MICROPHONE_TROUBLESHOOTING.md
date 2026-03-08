# Microphone Troubleshooting Guide

## Current Status

- ✅ Server runs on port 17200
- ✅ Electron client runs
- ✅ VS Code extension connects to server
- ✅ Microphone capture path fixed in code and validated

## Symptoms

1. Click microphone button → shows "Listening"
2. Microphone meter in Settings shows no activity (stays at zero)
3. No audio transcription occurs

## Configuration

- **Microphone Setting**: System Default (in Settings/Configuration/General)
- **Audio Implementation**: [`serenade/client/src/main/audio/index.ts`](../ArqonMaestro/serenade/client/src/main/audio/index.ts)

## Root Cause

The previous `audio/index.ts` was a placeholder shim:
- It attempted `desktopCapturer.getSources()` in the wrong capture path.
- It simulated random audio instead of recording real PCM from the microphone.
- Meter normalization expected native-module scale (`/5000`), so float audio RMS appeared as zero.

Result: UI could show "Listening" while actual microphone capture/transcription remained effectively dead.

## Fix Applied

### 1. Replaced placeholder shim with real Linux recorder
- File: `serenade/client/src/main/audio/index.ts`
- New behavior:
  - Captures real microphone PCM via `parec` (PulseAudio) with `arecord` fallback.
  - Uses 16kHz mono S16LE raw audio.
  - Streams real PCM into the existing microphone pipeline.
  - Restores the expected chunk lifecycle with calibrated thresholds and forced finalize protection.
  - Enumerates input devices via `pactl list short sources` (excluding monitor sinks).

### 2. Fixed meter scaling and chunk lifecycle
- File: `serenade/client/src/main/stream/microphone.ts`
- Change:
  - If volume is float-scale (`<= 1`), normalize using `/0.05`.
  - Keeps old `/5000` path for legacy native-volume values.
  - Registers listeners before recorder startup so the listen path cannot miss `chunk_start`.

### 3. Endpointing hardening
- Files:
  - `serenade/client/src/main/audio/index.ts`
  - `serenade/client/src/main/stream/chunk-manager.ts`
  - `serenade/client/src/main/stream/chunk-queue.ts`
- Change:
  - Added adaptive thresholds and forced finalize protection for always-hot microphones.
  - Prevents the app from staying in `Listening` forever without sending a final utterance.

### 4. Build result
- `npm run build:main` succeeds after the patch.

## Runtime Verification Steps

1. Relaunch client:
   ```bash
   cd ~/Projects/arqon/ArqonMaestro/serenade/client
   pkill -f electron || true
   unset ELECTRON_RUN_AS_NODE
   ./node_modules/.bin/electron . --no-sandbox --disable-gpu
   ```
2. Open Settings and verify the volume meter moves while speaking.
3. Click Listen and confirm speech generates transcription activity.
4. If still no capture, check terminal for `[Audio]`, `[Chunk]`, and `[Stream]` messages.

## Debugging Steps Taken

1. ✅ Microphone setting shows "System Default"
2. ✅ Clicking microphone shows "Listening" state
3. ✅ Audio meter and finalization path now work in the repaired build

## What to Check

1. **Check Electron logs** when clicking microphone:
   ```bash
   ELECTRON_ENABLE_LOGGING=1 ./node_modules/.bin/electron . --enable-logging
   ```

2. **Check browser permissions**:
   - In Electron, go to Permissions in Settings
   - Check if Microphone permission is granted

3. **Check system audio**:
   ```bash
   # List audio sources
   pactl list sources
   # or
   arecord -l
   ```

## Code Location

- **Audio implementation**: `serenade/client/src/main/audio/index.ts`
- **Microphone UI component**: `serenade/client/src/renderer/components/listen-toggle.tsx`
- **Stream/connection**: `serenade/client/src/main/stream/stream.ts`

## Notes

- Native `speech-recorder` is still absent in this environment, but the Linux PCM capture path is now sufficient for reliable use.

## Related Files

- `serenade/client/src/main/audio/index.ts` - Audio capture implementation
- `serenade/client/src/renderer/components/listen-toggle.tsx` - Microphone button UI
- `serenade/client/src/renderer/components/listen-status.tsx` - Status display
- `serenade/client/src/main/stream/microphone.ts` - Microphone stream handling
