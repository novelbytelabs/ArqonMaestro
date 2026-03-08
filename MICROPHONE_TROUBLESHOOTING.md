# Microphone Troubleshooting Guide

## Current Status

- ✅ Server runs on port 17200
- ✅ Electron client runs
- ✅ VS Code extension connects to server
- ✅ Microphone capture path fixed in code (pending runtime verification)

## Symptoms

1. Click microphone button → shows "Listening"
2. Microphone meter in Settings shows no activity (stays at zero)
3. No audio transcription occurs

## Configuration

- **Microphone Setting**: System Default (in Settings/Configuration/General)
- **Audio Implementation**: [`serenade/client/src/main/audio/index.ts`](../ArqonMaestro/serenade/client/src/main/audio/index.ts)

## Root Cause

The previous `audio/index.ts` was a placeholder shim:
- It attempted `desktopCapturer.getSources()` (not suitable for Linux microphone input in this path).
- It simulated random audio instead of recording real PCM from the microphone.
- Meter normalization expected native-module scale (`/5000`), so float audio RMS appeared as zero.

Result: UI could show "Listening" while actual microphone capture/transcription remained effectively dead.

## Fix Applied

### 1. Replaced placeholder shim with real Linux recorder
- File: `serenade/client/src/main/audio/index.ts`
- New behavior:
  - Captures real microphone PCM via `parec` (PulseAudio) with `arecord` fallback.
  - Uses 16kHz mono S16LE raw audio.
  - Converts PCM to `Float32Array`, computes RMS volume, and emits real `onAudio`.
  - Emits `onChunkStart`/`onChunkEnd` based on calibrated speaking/silence thresholds.
  - Enumerates input devices via `pactl list short sources` (excluding monitor sinks).

### 2. Fixed meter scaling for float-RMS audio
- File: `serenade/client/src/main/stream/microphone.ts`
- Change:
  - If volume is float-scale (`<= 1`), normalize using `/0.05`.
  - Keeps old `/5000` path for legacy native-volume values.

### 3. Build result
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
4. If still no capture, check terminal for `[Audio]` stderr messages from `parec/arecord`.

## Debugging Steps Taken

1. ✅ Microphone setting shows "System Default"
2. ✅ Clicking microphone shows "Listening" state
3. ❌ Audio meter stays at zero - no sound detected

## What to Check

1. **Check Electron logs** when clicking microphone:
   ```bash
   ELECTRON_ENABLE_LOGGING=1 ./node_modules/.bin/electron . --enable-logging
   ```

2. **Check if desktopCapturer returns audio sources**:
   - Add console.log in audio/index.ts to see what sources are found

3. **Check browser permissions**:
   - In Electron, go to Permissions in Settings
   - Check if Microphone permission is granted

4. **Check system audio**:
   ```bash
   # List audio sources
   pactl list sources
   # or
   arecord -l
   ```

5. **Check gstreamer** (needed for audio processing):
   ```bash
   gst-inspect-1.0 audiotestsrc
   ```

## Code Location

- **Audio implementation**: `serenade/client/src/main/audio/index.ts`
- **Microphone UI component**: `serenade/client/src/renderer/components/listen-toggle.tsx`
- **Stream/connection**: `serenade/client/src/main/stream/stream.ts`

## Notes

- Native `speech-recorder` module in this environment is present but not built (`.node` binding missing), so the Linux PCM path avoids that blocker.

## Related Files

- `serenade/client/src/main/audio/index.ts` - Audio capture implementation
- `serenade/client/src/renderer/components/listen-toggle.tsx` - Microphone button UI
- `serenade/client/src/renderer/components/listen-status.tsx` - Status display
- `serenade/client/src/main/stream/microphone.ts` - Microphone stream handling
