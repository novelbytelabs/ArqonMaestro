# Maestro Speech Architecture: Lane Separation and Command-Control Doctrine

## 1. Multi-Lane Fundamental Law

Arqon Maestro enforces strict lane separation because a Voice Operating System has different speech jobs with different success criteria.

- command lane = deterministic control
- dictation lane = unconstrained transcription

## 2. Command Lane (Primary)

The command lane is a **control system**, not a generic ASR lane.

It must preserve:

- bounded command language
- grammar authority
- lexicon/pronunciation control
- deterministic accept/reject behavior
- interrupt and operator-safety behavior

### 2.1 Command Platform Ownership

Command semantics are owned by Maestro command services:

- command language and compiler
- grammar/parser gate
- lexicon/pronunciation layer
- routing/policy/safety
- telemetry and provenance
- engine adapter boundaries

### 2.2 Acoustic Modernization Role

`Parakeet-CTC` is the first near-term acoustic candidate in this stack.

It is a modernization rail, not command-lane architecture ownership.

## 3. Dictation Lane (Secondary)

The dictation lane is a separate transcription path for prose/text entry.

- optimized for textual quality and fluency
- may use provider-flexible ASR candidates (for example `Qwen3-ASR`)
- must remain isolated from command execution authority

## 4. Rust Hot-Path Orchestration

The Rust layer bridges neural acoustic adapters and the symbolic command-control plane.

Responsibilities include:

- low-latency audio ingestion and endpointing
- lane routing and failover
- confidence/policy adjudication
- deterministic interrupt path
- evidence emission for replay and audit

## 5. Acceptance Gates

Command-lane acceptance requires evidence of:

1. grammar compatibility
2. deterministic out-of-grammar rejection
3. custom vocabulary/pronunciation control behavior
4. policy-safe interrupt and guarded command handling
5. control metrics beyond WER

## 6. Conclusion

Maestro command speech is a governed command platform with replaceable acoustic adapters. Lane separation protects both control integrity and dictation quality.
