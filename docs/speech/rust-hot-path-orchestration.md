# Maestro Nervous System: Rust Hot-Path Orchestration Spec

## 1. Requirement

The hot path is the deterministic bridge between audio ingress and governed command execution.

Rust is used for:

- low-latency processing
- memory safety
- explicit concurrency
- predictable fail-closed behavior

## 2. Architectural Role

The orchestrator sits between acoustic adapters and symbolic control services.

It does not define command legality. It enforces runtime sequencing and safety.

## 3. Responsibilities

### 3.1 Audio Ingress and Endpointing

- stream PCM frames
- run VAD/endpointing
- preserve timestamped chunk boundaries

### 3.2 Lane Routing and Adapter Lifecycle

- route utterances to command vs dictation paths
- manage adapter health and fallback transitions
- keep core interrupt vocabulary available under degradation

### 3.3 Policy and Confidence Adjudication

- fuse confidence, grammar, and risk signals
- route low-trust outcomes to clarification, escalation, or refusal
- never bypass command-lane policy gates for high-risk actions

### 3.4 Interrupt Authority

- prioritize stop/cancel class commands
- keep interrupt path locally available
- apply deterministic kill signaling to active managed flows

### 3.5 Evidence and Provenance

Emit evidence packets per utterance:

- audio hash
- lane and adapter metadata
- confidence/adjudication rationale
- latency and policy outcome

## 4. Command-Lane Alignment

Rust hot path must preserve command-platform ownership:

- grammar/parser/policy remain source-of-truth services
- acoustic adapters remain replaceable modules
- adjudication preserves deterministic command safety

## 5. Conclusion

The Rust orchestrator is the real-time reflex bridge between modern acoustic perception and Maestro's governed command-control substrate.
