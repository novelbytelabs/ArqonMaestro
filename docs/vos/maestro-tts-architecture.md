# Arqon Maestro TTS Architecture Specification

Version:
1.0

Status:
Canonical Architecture Spec

Purpose:
Define the speech synthesis architecture for Arqon Maestro as a strict, single-lane, high-quality system using Kokoro.

## 1. Core Decision

Maestro SHALL operate a single, high-fidelity TTS lane using **Kokoro**. 
There are NO fallback lanes, NO secondary conversational lanes, and NO multi-lane routing policies.

**Kokoro ONLY, no backups.**

## 2. Rationale

The previous multi-lane strategy (involving Piper for fallback and planned Qwen3-TTS lanes) was deprecated in favor of system simplicity, operational consistency, and maximum quality. 

A single, highly optimized Kokoro deployment provides sufficient quality, latency, and expressive range for all Maestro use cases. If Kokoro is unavailable, the system is designed to fail closed (no speech) rather than degrade to a lower-quality synthetic voice.

## 3. Operational Characteristics

* **Engine:** Kokoro
* **Mode:** Real-time synthesis via dedicated Firecracker VM / FastAPI sidecar.
* **Latency:** Low-latency streaming.
* **Failure Mode:** Fail closed. If the Kokoro sidecar is down, TTS requests will immediately fail and log an error.

## 4. Constraints

* The system SHALL NOT attempt to invoke external or fallback TTS binoculars (e.g., Piper, espeak) if Kokoro fails.
* System configurations related to fallback (`arqon_tts_kokoro_fallback_enabled`) have been permanently removed.

## 5. Future Development

Any future enhancements to Maestro's TTS capabilities will focus exclusively on optimizing the Kokoro pipeline, fine-tuning its voices, or improving the sidecar's resilience, rather than introducing competing provider lanes.
