# Arqon Maestro: Universal Voice Plane (UVP)

> **Status**: Implementation complete as of 2026-03-10. All 5 gates hard-closed.
> See: [`docs/voice_plane_implementation_plan.md`](/home/irbsurfer/Projects/arqon/ArqonMaestro/docs/voice_plane_implementation_plan.md)

## The Big Picture: "The Nervous System of Arqon"

Maestro is the high-performance interaction layer for Arqon, providing a full-duplex, zero-latency feedback loop between Human Speech and System Action. It leverages the Arqon ecosystem's specialized Tiers to achieve **The Holy Grail** (sub-200ms TTFS) with industrial-grade safety and memory.

### 1. The Tiered Intelligence Model

Maestro operates across the Arqon Tiers to optimize for speed, safety, and persistence:

- **Tier 0: The Guardian (CASIL Edge)**:
  - **Hygiene**: All voice transcripts are processed by CASIL (WASM) at the Bus edge.
  - **Redaction**: Secrets, PII, and "Negative Intent" are scrubbed or blocked in **<100µs** before hitting the agents.
- **Tier 1: The Subconscious (Reflex SAS)**:
  - **Predictive Addressing**: Maestro resolves common intents to **`AddrId`** pointers using local Semantic Address Space.
  - **Predictive TTFS**: Bypasses raw text parsing for recurring queries, hitting the **42ns** memory-sharing limit.
- **Tier 2: The Novelty (Ollama Agent)**:
  - **Reasoning**: Complex or new intents are routed to the **Qwen 2.5 Coder 7B** agent for deep interpretation.
- **Omega Tier (Tier Ω): The Isolated Lab**:
  - **Gated Execution**: "Risky" or destructive actions identified by Maestro (e.g., "delete all branches") are routed to **Firecracker VMs** for trial execution.

---

### Phase A: Input (The Pulse)

1. **Audio Capture**: Maestro Client (Electron) captures PCM audio.
2. **Stream Processing**: Maestro Core (Java) receives audio via Protobuf.
3. **Reflex & CASIL**: Maestro performs a local **SAS lookup** and the Bus applies **CASIL hygiene**.
4. **Broadcast**: An **`AddrId`** (Pointer) is emitted to the `arqon.speech.transcript` channel.

### Phase B: Intent (The Sync)

1. **Shared Memory**: Agents (Ollama) pull the intent context from the shared **Reflex Subconscious** using the `AddrId`.
2. **Action**: The agent executes the command. If high-risk, it triggers an **Omega Tier** sandbox execution.

### Phase C: Feedback (The Voice)

1. **Continuum Projection**: The successful action is automatically projected to **Continuum** long-term memory via the Bus.
2. **Speech Request**: Tool emits an `Arqon.Speech.Request` event.
3. **Voice Output**: Audio is received via Bus and played through aplay (non-blocking).
4. **History Replay**: On client crash/resume, Maestro uses `op.history.replay` to instantly restore auditory context.

> **Note**: Kokoro TTS is not yet installed. Current implementation uses cloud TTS with audio returned via Bus.

---

## Technical Environment (Frozen)

| Component | Target Version |
| :--- | :--- |
| **Rust** | `1.82` (Pinned) |
| **Python** | `helios-gpu-118` (Conda) |
| **Protobuf** | `4.25.8` |
| **Protoc** | `25.8` |

**Rule**: No environment upgrades without manual permission. No placeholders, stubs, or `todo!()`.

---

## Technical Specifications

### ArqonBus Event Routing

- **Room**: `pilot` (Universal ecosystem room)
- **Channel**: `speech` (Dedicated auditory interaction channel)

### Event Schema

```json
{
  "type": "telemetry",
  "room": "pilot",
  "channel": "speech",
  "payload": {
    "event_type": "speech.request",
    "schema_version": 1,
    "text": "Branch 'feature-uvp' created successfully.",
    "voice": "af_heart",
    "speed": 1.0,
    "priority": "normal"
  }
}
```

### Semantic Memory (Arqon Reflex)

- **CFH (Canonical Fingerprint Hashing)**: Queries are normalized into 1024-bit signatures for 1.0 stability.
- **Predictive Addressing**: Maestro uses `AddrId` pointers to avoid re-sending large text payloads across the Bus.
- **The Subconscious (Layer 0)**: Uses the `arqon-reflex` RAM/SAS layer for <1ms context lookups.

### Optimization Levers (Arqon HPO)

- **Model Quantization**: FP16 vs INT8 (balancing quality vs. latency).
- **Audio Batch Size**: Tuning the synthesis chunking for immediate playback.
- **Buffer Warmth**: Maintaining an initialized `cpal` or `rodio` stream to avoid device initialization lag.
- **SAS Pivot**: Tuning the CFH threshold (e.g., 0.95) to balance between "Hyper-stability" and "Fuzzy-matching".

---

## Implementation Status

### Completed ✅

- [x] **STT Bridge**: Stream processing emits bus events
- [x] **Bus Listener**: Arqon Bus client for speech requests
- [x] **Comparator**: Transcript and command comparison
- [x] **CFH Implementation**: TypeScript CFH matching Rust output (19/19 parity)
- [x] **Address-First**: AddrId emission in live flow
- [x] **Voice Output**: Non-blocking playback via aplay
- [x] **Replay Handling**: Idempotency and deduplication
- [x] **Integrity Handshake**: Allow/block/default-deny
- [x] **Control-Plane Coordinator**: SpacetimeDB-backed coordination
- [x] **Rollback**: All gates have verified rollback paths

### Not Yet Implemented ❌

- [ ] **Kokoro Daemon**: Local TTS (uses cloud TTS currently)
- [ ] **Earcon Cache**: Pre-loaded acknowledgment sounds
- [ ] **HPO Rig**: Optimization tuning

---

## Technical Gotchas & Implementation Tips

### Audio Device Contention

- **Current State**: Using aplay (ALSA) for audio output
- **Future**: When Kokoro is added, use PipeWire/PulseAudio as intermediary

### VRAM & Model Warmth

- **Current**: No local TTS model loaded
- **Future**: Kokoro-82M requires VRAM management with Ollama

### ArqonBus Latency

- **Serialization**: The Bus is JSON-based. Avoid sending raw audio samples over the Bus; send only transcriptions and metadata.
- **WebSocket Handshake**: Maestro maintains a persistent WebSocket connection to the Bus.

### Full-Duplex State (The "Barge-in" Problem)

- **Logic**: If the user starts speaking while TTS is playing, the system should immediately "duck" or mute the TTS.
- **Implementation**: VAD triggers should emit a `Speech.Mute` event to the Bus.

---

## Evidence

All 5 gates hard-closed with full evidence:

- [`docs/operations/phase-e-evidence.md`](/home/irbsurfer/Projects/arqon/ArqonMaestro/docs/operations/phase-e-evidence.md)
- [`docs/operations/phase-e-closeout.md`](/home/irbsurfer/Projects/arqon/ArqonMaestro/docs/operations/phase-e-closeout.md)
- [`docs/voice_plane_implementation_plan.md`](/home/irbsurfer/Projects/arqon/ArqonMaestro/docs/voice_plane_implementation_plan.md)
