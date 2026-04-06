# Fix: Voice → RAIL Delta Gap for Reflex/Closed-Structure Commands

## The Problem — Diagnosed

After tracing the entire codebase from microphone to command execution, I've found **the exact gap**. It is NOT a single missing piece — it's a **three-layer dependency chain** where each layer requires the layer below it, and layer 1 currently cannot work without Parakeet running.

### The Architecture As-Is (What Currently Happens)

```
Microphone PCM Audio
      │
      ▼
┌─────────────────────────────────────────────┐
│  chunk-manager.ts onChunkStart()            │
│  Creates a Parakeet WebSocket stream        │
│  Sends audio frames to sidecar via WS       │
└────────────────┬────────────────────────────┘
                 │
      ┌──────────▼──────────┐
      │  parakeet_sidecar.py │ ◄── THIS IS THE BOTTLENECK
      │                      │
      │  1. Loads Parakeet   │ ◄── Requires NeMo + ~2GB model
      │     ASR model        │
      │  2. Runs geometric   │ ◄── Geometric detector runs INSIDE
      │     detector as a    │     the same sidecar process
      │     side-effect      │
      │  3. Returns BOTH:    │
      │     - transcript     │
      │     - geometric_event│
      └──────────┬───────────┘
                 │
      ┌──────────▼──────────┐
      │  chunk-manager.ts   │
      │  observeH3Geometric │ ◄── Only processes geometric events
      │  Event()            │     that arrive FROM the sidecar WS
      └─────────────────────┘
```

### Why It Doesn't Work

> [!CAUTION]
> **Root Cause:** The H3 geometric detector (`H3GeometricDetector`) is **embedded inside `parakeet_sidecar.py`**. It cannot run independently. The geometric detection only happens as a *by-product* of sending audio to the Parakeet ASR WebSocket stream.

**This means:**
1. If Parakeet model fails to load → No sidecar → **No geometric detection at all**
2. If `MAESTRO_HARD_FAIL_ON_PARAKEET` is set (default `!= "0"`) → `shouldUseParakeetForCurrentChunk()` returns `false` → **No stream created** → **No geometric events ever fire**
3. If the sidecar WS is down → No audio reaches the geometric detector → **Commands go to legacy fallback**

**The geometric detector has ZERO independent access to microphone audio.** It is completely slaved to the Parakeet transcription pipeline.

### The Specific Code Evidence

#### Evidence 1: Geometric detector lives inside parakeet_sidecar.py
`parakeet_sidecar.py:98-352` — `H3GeometricDetector` class is defined here.

#### Evidence 2: Geometric events only emitted as part of WS /transcribe_stream
`parakeet_sidecar.py:476-510` — During partial transcription, if `H3_GEOMETRIC_DETECTOR` exists, it runs detection and attaches it to the WS response payload.

#### Evidence 3: Chunk-manager only receives geometrics from the Parakeet WS stream
`chunk-manager.ts:5072-5091` — `createStream()` is only called when `useParakeetCommandFast` is true, and the geometric event callback is wired to `observeH3GeometricEvent`.

#### Evidence 4: HARD_FAIL_ON_PARAKEET blocks the stream entirely  
`chunk-manager.ts:3847-3855` — When `MAESTRO_HARD_FAIL_ON_PARAKEET` is set (which it is by default since line 94-95 checks `!= "0"`), `shouldUseParakeetForCurrentChunk()` returns `false`, meaning NO Parakeet stream is ever created, meaning NO geometric events are ever emitted.

#### Evidence 5: Only "pause" and "new tab" are hard-coded for geometric-only resolution
`h4-geometric-only-command-resolution.ts:17-43` — Even when geometric events DO arrive, only two specific commands can resolve: `pause` and `new tab`. Everything else falls through.

---

## What Needs To Happen

The fix is to **decouple** the geometric detector from the Parakeet transcription pipeline. The geometric detector needs its own independent audio ingest path so it can receive raw PCM frames directly from the microphone, run the manifold/atlas detection, and emit geometric events — all **without** depending on Parakeet being loaded, healthy, or enabled.

### Proposed Changes

---

### Component 1: Standalone Geometric Sidecar

#### [NEW] `sidecars/geometric_sidecar.py`

A new lightweight Python sidecar that runs **only** the H3 geometric detector. No Parakeet, no NeMo, no ASR model. Just:
- `libhume` + `numpy` (already dependencies)
- Atlas v1 loading + validation
- WebSocket endpoint: `/detect_stream`
  - Client sends JSON config then streams raw PCM16 bytes
  - Server runs `H3GeometricDetector.detect()` on each accumulated buffer
  - Server returns geometric events (or nothing if no region matched)
- Health endpoint: `/health`

**Extraction**: The `H3GeometricDetector` class, `emit_h3_evidence()`, `normalize_pcm16_to_float32()`, and atlas loading/validation code get extracted from `parakeet_sidecar.py` into a shared module and imported by both sidecars.

#### [MODIFY] `sidecars/parakeet_sidecar.py`

Import the shared `H3GeometricDetector` from the extracted module instead of defining it inline. No behavior change — Parakeet sidecar continues to work exactly as before when used.

---

### Component 2: GeometricStreamProvider (TypeScript)

#### [NEW] `stt/geometric-stream-provider.ts`

A new TypeScript provider (analogous to `ParakeetCommandFastProvider`) that:
- Connects to the standalone geometric sidecar's `/detect_stream` WebSocket
- Accepts raw PCM16 audio frames via `sendAudio(buffer)`
- Emits `GeometricRegionEvent` callbacks when the sidecar returns an event
- Has `isReady()`, health check, and `finalize()` like the other providers

---

### Component 3: Chunk-Manager Integration

#### [MODIFY] `stream/chunk-manager.ts`

The critical change:

1. In `onChunkStart()`: When the geometric sidecar is available, create a geometric stream **independent of** the Parakeet stream. Audio frames go to the geometric stream first.

2. When a `geometric_only` route is determined (reflex/closed-structure), the chunk resolves purely from the geometric event — the Parakeet stream is never created or touched.

3. When a `geometric_prefix_asr_tail` route is determined (parameterized), the Parakeet stream is started **only** for tail decoding, receiving only the tail audio after the prefix has been geometrically captured.

4. When no geometric event fires (no region match), the system falls back to the existing Parakeet or legacy path as before.

**The flow becomes:**

```
Microphone PCM Audio
      │
      ├──────────────────────────────┐
      ▼                              ▼
┌──────────────────┐    ┌──────────────────────────┐
│ Geometric Sidecar│    │ Parakeet/Legacy (only if  │
│ (lightweight)    │    │ needed for tail or if     │
│ Atlas + Manifold │    │ geometric miss)           │
│ Only             │    └──────────────────────────┘
└────────┬─────────┘
         │ geometric_event
         ▼
┌──────────────────────────────────────────┐
│ chunk-manager.ts                         │
│ Route: geometric_only → direct resolve   │
│ Route: geometric_prefix → start tail ASR │
│ Route: no match → legacy fallback        │
└──────────────────────────────────────────┘
```

---

### Component 4: Expand geometric-only resolution map

#### [MODIFY] `runtime/h4-geometric-only-command-resolution.ts`

Currently hard-codes only `pause` and `new tab`. Expand to be atlas-driven: any command whose `command_class` is `reflex` or `closed_structure` in the atlas should be eligible for geometric-only resolution, using the `region_id` as the canonical command text.

---

## User Review Required

> [!IMPORTANT]
> **Breaking Change for `MAESTRO_HARD_FAIL_ON_PARAKEET`**: Currently this env var defaults to true and blocks Parakeet. After this change, the geometric sidecar runs independently, so `HARD_FAIL_ON_PARAKEET` will only affect whether Parakeet is used for tail decoding of parameterized commands. Reflex/closed-structure commands will work purely through the geometric sidecar regardless of this setting. Is this the desired behavior?

> [!IMPORTANT]
> **`libhume` dependency**: The standalone geometric sidecar needs `libhume` and `numpy` available in the Python environment. Currently these are already installed in `helios-gpu-118`. Just confirming — should the geometric sidecar also use `helios-gpu-118`, or should it have its own minimal venv?

> [!WARNING]
> **Atlas availability**: The geometric sidecar will fail (gracefully) if `command_atlas_v1.json` is missing from `artifacts/h3/`. This is the same behavior as today, but now it's more visible because the sidecar is standalone. Do you have a valid atlas built, or do we need to build one first?

---

## Open Questions

1. **Port for geometric sidecar?** The Parakeet sidecar uses port 5001. Suggest port **5003** for the geometric sidecar. Acceptable?

2. **Sidecar manager integration?** `sidecar_manager.sh` currently manages the Parakeet and Qwen3 sidecars. Should the geometric sidecar be added there, or should it be started/managed separately?

3. **`focus chrome` / other closed-structure commands**: The atlas has `focus chrome` as a validated v1 region, but `deriveH4GeometricOnlyCommandResolution` currently only handles `pause` and `new tab`. Once the geometric sidecar is running, should ALL atlas closed-structure regions be eligible? That's the plan in Component 4, but wanted to confirm.
