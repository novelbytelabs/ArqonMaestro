# Arqon Maestro: Universal Voice Plane (UVP)
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
3. **Kokoro Service**: Resident Python module (`modules/kokoro`) synthesizes and plays audio via hardware direct out.
4. **History Replay**: On client crash/resume, Maestro uses `op.history.replay` to instantly restore auditory context.

---

## 2. Technical Environment (Frozen)

| Component | Target Version |
| :--- | :--- |
| **Rust** | `1.82` (Pinned) |
| **Python** | `helios-gpu-118` (Conda) |
| **Protobuf** | `4.25.8` |
| **Protoc** | `25.8` |

**Rule**: No environment upgrades without manual permission. No placeholders, stubs, or `todo!()`.

---

## 2. Technical Specifications

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

## 3. Implementation Checklist

- [ ] **STT Bridge**: Update `StreamManager.java` to emit bus events.
- [ ] **Kokoro Daemon**: Implement the persistent Python service in `modules/kokoro`.
- [ ] **Bus Listener**: Set up the Rust-based bus listener for speech requests.
- [ ] **HPO Rig**: Integrate Arqon HPO to optimize Kokoro parameters.
- [ ] **Earcon Cache**: Pre-load PCM chimes for <50ms "Acknowledgement" feedback.

---

## 4. Technical Gotchas & Implementation Tips

### Audio Device Contention
- **Problem**: Maestro's Java core (STT) and Kokoro's Python daemon (TTS) both need hardware access.
- **Solution**: Use **PipeWire** or **PulseAudio** as the intermediary. Ensure the Kokoro daemon uses a non-blocking output (like `rodio` in Rust or `sounddevice` in Python with shared streams) to avoid locking the device and causing STT capture failures.

### VRAM & Model Warmth
- **Resident Memory**: Kokoro-82M must remain in VRAM. However, Ollama (Qwen 2.5 Coder 7B) also consumes GPU resources.
- **Tip**: Set `OLLAMA_MAX_VRAM` or similar constraints to prevent the OS from offloading Kokoro to System RAM, which would spike the TTFS from 150ms to >2000ms.
- **Warmup Inference**: Execute a "silent" inference (e.g., synthesizing a space character) on startup to ensure the GPU kernels are compiled and the model is fully localized in memory.

### ArqonBus Latency
- **Serialization**: The Bus is JSON-based. Avoid sending raw audio samples over the Bus; send only transcriptions and metadata.
- **WebSocket Handshake**: Maestro should maintain a *persistent* WebSocket connection to the Bus (localhost:9100) rather than spawning `pilot bus` CLI commands for every event.

### Full-Duplex state (The "Barge-in" Problem)
- **Logic**: If the user starts speaking while Kokoro is still reporting a result, the system should immediately "duck" or mute the TTS.
- **Tip**: Maestro Core should emit a `Speech.Mute` event to the Bus when Voice Activity Detection (VAD) triggers.
