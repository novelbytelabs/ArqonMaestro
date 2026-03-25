# Maestro Command-Lane Architecture Memo (Canonical)

**Date:** 2026-03-25  
**Status:** Canonical alignment memo

## 1. Purpose

This memo locks the command-lane architecture after the March 2026 alignment cycle.

Core rule: **the command lane is a control system, not a generic ASR benchmark lane.**

## 2. Architectural Position

Arqon Maestro command speech is owned by the **Maestro Command Platform**:

- bounded command language
- grammar/compiler authority
- lexicon and pronunciation control
- routing/policy/safety enforcement
- telemetry and provenance
- engine adapter boundaries

Speech engines are adapters. Command semantics remain Maestro-owned.

## 3. Control-First Stack

Command-lane control authority is centered on Kaldi/Vosk-class guarantees and Maestro grammar/policy services.

Near-term modernized command stack:

1. acoustic front end: `Parakeet-CTC` class candidate (first sequencing target)
2. constrained decoder: WFST/Flashlight-class bounded decoding
3. lexicon/pronunciation layer: Maestro-owned mappings and operator customization
4. grammar/parser gate: deterministic in-grammar acceptance + out-of-grammar rejection
5. policy/risk gate: authorization, escalation, interrupt, and fail-closed behavior

## 4. Parakeet-CTC Role (Clarification)

`Parakeet-CTC` is a **near-term acoustic modernization rail**.  
It is not the command-lane architecture by itself and does not own command semantics.

## 5. Rust Orchestrator Role

The Rust hot-path orchestrator bridges neural acoustics and symbolic control plane:

- low-latency audio ingress and endpointing
- lane routing and concurrency control
- adapter lifecycle and failover
- confidence and policy adjudication
- evidence packet emission for replay/audit

## 6. Lane Separation Contract

- **Command lane:** bounded control path for operation, approvals, interrupts, and workflow actuation
- **Dictation lane:** unconstrained prose/text path (accuracy-first)

`Qwen3-ASR` remains dictation-lane candidate work. It is not command-lane foundation architecture.

## 7. Acceptance Gates (Non-Negotiable)

1. grammar compatibility with command corpus
2. deterministic out-of-grammar rejection
3. custom vocabulary and pronunciation controls are testable
4. interrupt and guarded-command behavior remain policy-safe
5. control metrics are first-class, not WER-only reporting

## 8. Adapter Philosophy

Engine adapters may change over time. The platform invariants do not.

Replaceable:

- acoustic model implementation
- decoder implementation details
- lane-specific provider deployment pattern

Non-replaceable without re-architecture:

- bounded command language contract
- Maestro grammar/parser/policy authority
- operator-safe deterministic control requirements

## 9. Product and Messaging Alignment

Externally, Maestro is positioned as a **Voice Operating System** with command authority and software talk-back.

Internally, this command-lane memo is the architecture lock that preserves sovereignty, determinism, and operator-grade governance while allowing acoustic modernization.
