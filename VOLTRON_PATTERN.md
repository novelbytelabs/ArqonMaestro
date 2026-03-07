# ArqonMaestro Voltron Pattern

**Java Control Plane + Rust Hot Path**

---

## The Architecture Decision

**Do not rewrite Maestro in Rust. Modularize it and replace only the latency-critical organs with Rust.**

---

## Mental Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     JAVA CONTROL PLANE                          │
│                                                                 │
│   "Java conducts" - orchestration, product logic, integration   │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  App     │ │ Business │ │ Settings │ │ Plugin   │          │
│  │  Shell   │ │  Logic   │ │  Config  │ │ Mgmt     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ UI/Back  │ │ Model    │ │ CorpusGen│ │ Training │          │
│  │ Coord    │ │ Pipeline │ │  Orch.   │ │  Stack   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Protobuf / IPC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RUST DATA PLANE                            │
│                                                                 │
│   "Rust performs" - streaming, low-latency, systems-sensitive   │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Audio   │ │   VAD    │ │ Chunking │ │ Wake     │          │
│  │ Ingest   │ │  Engine  │ │  Buffer  │ │ Detection│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Transcript│ │ Tokenize │ │ Context  │ │ Inference│          │
│  │ Post-proc│ │ Hot Loop │ │ Extract  │ │ Wrapper  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Map

### Keep in Java (Control Plane)

| Module | Reason |
|--------|--------|
| App orchestration | Stable, works, not latency-critical |
| Business logic | Complex, benefits from Java ecosystem |
| Settings/config | Not performance-sensitive |
| Plugin management | Existing architecture works |
| UI/backend coordination | Not in hot path |
| Model pipeline glue | Works as-is |
| CorpusGen | Training-time, not runtime |
| Training orchestration | Offline process |
| Command routing (initially) | Until profiling shows it's hot |
| WebSocket server | Netty is fast enough |
| Protobuf serialization | Java protobuf works fine |

### Move to Rust Now (Hot Path)

| Module | Reason |
|--------|--------|
| **Audio ingest/streaming** | Latency-sensitive, continuous streaming, buffering matters |
| **VAD (Voice Activity Detection)** | Real-time audio path, concurrency matters |
| **Wake word detection** | Always-on, low-latency requirement |
| **Chunking/buffering** | Memory discipline matters |
| **Audio preprocessing** | Streaming, low-latency |

### Move to Rust Later (After Profiling)

| Module | Reason |
|--------|--------|
| Transcript candidate post-processing | If profiling shows it's hot |
| Tokenization hot loops | If context extraction is expensive |
| Code-context extraction | Measure first |
| Native inference wrapper | If model serving needs optimization |

### Do NOT Move

| Module | Reason |
|--------|--------|
| Entire command grammar | Too much rewrite for too little gain |
| All training code | Offline, not performance-critical |
| Application shell | Works fine in Java |
| Installer/distribution | Not worth the effort |
| Every plugin | Unnecessary rewrite |

---

## Technology Stack

### Protobuf

```
Version: protobuf 4.25.8
Compiler: protoc v25.8
```

### Rust

```
Version: 1.82
```

### Integration Pattern

```
Java <--[Protobuf/IPC]--> Rust
```

**Prefer small service boundary over JNI tentacles** unless ultra-low latency forces in-process integration.

---

## Migration Order

### Phase 1: Get It Running

```
Leave everything in Java.
Get Maestro running end-to-end.
```

**Goal**: Working system, measure baseline

### Phase 2: Measure

```
Profile:
- mic-to-transcript latency
- transcript-to-action latency
- GC pauses
- CPU hotspots
- repeated parsing/token overhead
```

**Goal**: Data-driven optimization targets

### Phase 3: Extract First Hotspot

```
Pull out only the worst hotspot into Rust.
Expose via small IPC/RPC boundary.
```

**Goal**: Prove the pattern works

### Phase 4: Iterate

```
Continue extracting hotspots.
Keep interfaces small.
Measure after each extraction.
```

**Goal**: Incremental improvement

---

## Rust Crate Structure

```
ArqonPilot/crates/
├── maestro-audio/          # Phase 1: Audio ingest
│   ├── src/
│   │   ├── lib.rs
│   │   ├── capture.rs      # Microphone capture
│   │   ├── vad.rs          # Voice activity detection
│   │   └── buffer.rs       # Audio buffering
│   └── Cargo.toml
│
├── maestro-proto/          # Protobuf definitions
│   ├── src/
│   │   ├── lib.rs
│   │   └── generated.rs    # protoc output
│   ├── proto/
│   │   └── maestro.proto
│   └── Cargo.toml
│
├── maestro-bridge/         # Java IPC bridge
│   ├── src/
│   │   ├── lib.rs
│   │   └── ipc.rs          # Unix socket / TCP
│   └── Cargo.toml
│
└── pilot/                  # Existing (extended)
```

---

## Protobuf Schema

```protobuf
// maestro.proto
syntax = "proto3";

package maestro;

// Audio chunk from Java to Rust
message AudioChunk {
    bytes audio_data = 1;
    int32 sample_rate = 2;
    int64 timestamp_ms = 3;
}

// VAD result from Rust to Java
message VadResult {
    bool is_speech = 1;
    float confidence = 2;
    int64 chunk_id = 3;
}

// Transcript from Rust to Java
message Transcript {
    string text = 1;
    float confidence = 2;
    repeated string alternatives = 3;
}

// Service definition
service MaestroAudio {
    rpc StreamAudio(stream AudioChunk) returns (stream VadResult);
    rpc GetTranscript(AudioChunk) returns (Transcript);
}
```

---

## Interface Design

### Rust Side

```rust
// crates/maestro-audio/src/lib.rs

pub struct AudioPipeline {
    capture: AudioCapture,
    vad: VoiceActivityDetector,
    buffer: AudioBuffer,
}

impl AudioPipeline {
    /// Process audio chunk, return VAD result
    pub fn process(&mut self, audio: &[f32]) -> VadResult {
        let is_speech = self.vad.detect(audio);
        self.buffer.push(audio);
        VadResult { is_speech, ... }
    }
    
    /// Get buffered audio when speech ends
    pub fn get_speech_buffer(&self) -> Vec<f32> {
        self.buffer.drain()
    }
}
```

### Java Side

```java
// Java interface to Rust audio service
public interface MaestroAudioBridge {
    // IPC via Unix socket or TCP
    void sendAudioChunk(byte[] audio, int sampleRate);
    VadResult receiveVadResult();
    Transcript getTranscript(byte[] audio);
}
```

---

## Performance Targets

| Metric | Target | Current (Java) | After Rust |
|--------|--------|----------------|------------|
| Audio chunk latency | < 5ms | ~20ms | < 5ms |
| VAD detection | < 2ms | ~10ms | < 2ms |
| GC pauses | 0 | ~50ms | 0 |
| Memory overhead | < 50MB | ~200MB | < 50MB |

---

## Why This Is Best

| Benefit | Explanation |
|---------|-------------|
| Fastest path to shipping | Keep what works |
| Preserves what works | No rewrite risk |
| Optimizes hot path | Rust where it matters |
| Avoids suicidal rewrite | Incremental approach |
| Room for deeper Rust future | Modular design |

---

## The One Sentence Version

**Java shell, Rust core modules.**

Java = orchestration, product logic, integration
Rust = audio runtime, streaming, low-level transforms

---

## Discipline Rules

1. **Do not** let "Rust for hot path" turn into "rewrite everything because Rust is cool"
2. **Use Rust only for**:
   - audio streaming
   - low-latency processing
   - token/context hot loops
   - anything profiling proves is expensive
3. **Measure before optimizing**
4. **Keep interfaces small**
5. **One module at a time**

---

## Next Steps

1. Get Maestro running in Java (Phase 1)
2. Add profiling instrumentation
3. Measure baseline latencies
4. Identify worst hotspot
5. Extract to Rust with small interface
6. Measure improvement
7. Repeat
