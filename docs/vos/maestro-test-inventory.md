# Maestro VOS Test Inventory

This document provides a comprehensive feature and capability inventory for testing Maestro, derived from the [Master Plan](maestro-master-plan.md).

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Accepted/Ready for testing |
| ⚠️ | Partial/Needs more work |
| ❌ | Not started/Gap |

---

## 1. Voice Ingress & Hot Path

| Capability | Status | Governing Spec |
|------------|--------|----------------|
| Hot-path audio ingress | ✅ | [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md) |
| Interruption behavior | ✅ | [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md) |
| Turn detection (bounded) | ✅ | [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md) |
| STT lane separation (command-fast vs dictation-accurate) | ✅ | [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md) |
| Deterministic routing into runtime | ✅ | [`maestro-intent-routing-v0.1.md`](./maestro-intent-routing-v0.1.md) |
| Lane-relative STT behavior | ⚠️ Partial | [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md) |

---

## 2. Identity, Safety & Policy

| Capability | Status | Governing Spec |
|------------|--------|----------------|
| Speaker diarization | ✅ | [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md) |
| Speaker verification | ✅ | [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md) |
| Identity gating | ✅ | [`maestro-authorization-service.md`](./maestro-authorization-service.md) |
| Contamination-aware authorization | ✅ | [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md) |
| Degraded-evidence-aware authorization | ✅ | [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md) |
| Interaction-mode-aware policy | ✅ | [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md) |

---

## 3. Workflow & Authority

| Capability | Status | Governing Spec |
|------------|--------|----------------|
| Bounded workflow execution | ✅ | [`maestro-workflow-contract.md`](./maestro-workflow-contract.md) |
| Maestro ↔ Nexus boundary | ✅ | [`maestro-nexus-protocol-boundary.md`](./maestro-nexus-protocol-boundary.md) |
| Policy-aware execution control | ✅ | [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md) |
| Replay/audit evidence capture | ✅ | [`maestro-workflow-contract-service.md`](./maestro-workflow-contract-service.md) |
| Workflow contract service | ✅ | [`maestro-workflow-contract-service.md`](./maestro-workflow-contract-service.md) |

---

## 4. Output & Response

| Capability | Status | Governing Spec |
|------------|--------|----------------|
| Brokered TTS output | ✅ | [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md) |
| Kokoro primary / Piper fallback | ✅ | [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md) |
| Interruption-safe playback | ✅ | [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md) |
| Persona routing (bounded) | ✅ | [`maestro-tts-persona-multi-agent-voice.md`](./maestro-tts-persona-multi-agent-voice.md) |

---

## 5. Language & Command System

| Capability | Status | Governing Spec |
|------------|--------|----------------|
| Command families | ✅ | [`maestro-command-families.md`](./maestro-command-families.md) |
| Lexicon | ✅ | [`maestro-lexicon.md`](./maestro-lexicon.md) |
| Verb-object matrix | ✅ | [`maestro-verb-object-matrix.md`](./maestro-verb-object-matrix.md) |
| Core command set | ✅ | [`maestro-core-command-set.md`](./maestro-core-command-set.md) |
| Interpretation engine | ✅ | [`maestro-interpretation-engine.md`](./maestro-interpretation-engine.md) |
| Syntax specification | ✅ | [`maestro-syntax-specification.md`](./maestro-syntax-specification.md) |
| Spoken command grammar | ✅ | [`maestro-spoken-command-grammar.md`](./maestro-spoken-command-grammar.md) |

---

## 6. Focus & Operating Context

| Capability | Status | Governing Spec |
|------------|--------|----------------|
| Referential intent (bounded) | ✅ | [`focus/maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md) |
| Modal awareness (bounded) | ✅ | [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md) |
| Surface expansion (bounded) | ✅ | [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md) |
| Language/system integration (bounded) | ✅ | [`focus/maestro-language-system-integration-v0.1.md`](./focus/maestro-language-system-integration-v0.1.md) |
| Focus precision | ✅ | [`maestro-focus-precision-v0.1.md`](./maestro-focus-precision-v0.1.md) |
| Focus recovery | ✅ | [`focus/maestro-focus-recovery-v0.1.md`](./focus/maestro-focus-recovery-v0.1.md) |

---

## 7. Ambiguity & Recovery

| Capability | Status | Governing Spec |
|------------|--------|----------------|
| Safe abort behavior | ✅ | [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md) |
| Deterministic non-guessing | ✅ | [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md) |
| Error recovery | ⚠️ Partial | [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md) |
| Misrecognition handling | ⚠️ Partial | [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md) |

---

## 8. Runtime & Computational Fabric

| Capability | Status | Governing Spec |
|------------|--------|----------------|
| Benchmark instrumentation | ✅ | [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md) |
| Shell/runtime decomposition | ✅ | [`maestro-shell-runtime-decomposition.md`](./maestro-shell-runtime-decomposition.md) |
| Runtime dispatch seams | ✅ | [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md) |
| Capability registry | ⚠️ Partial | [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md) |
| Request lifecycle | ✅ | [`../architecture/request-lifecycle.md`](../architecture/request-lifecycle.md) |
| Computational fabric | ✅ | [`../architecture/maestro-computational-fabric.md`](../architecture/maestro-computational-fabric.md) |

---

## 9. Modes & Surfaces

| Capability | Status | Governing Spec |
|------------|--------|----------------|
| Modes state machine | ✅ | [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md) |
| Surface model | ✅ | [`maestro-surface-model.md`](./maestro-surface-model.md) |
| Active surface binding | ⚠️ Gap | - |
| Focus stack | ⚠️ Gap | - |

---

## Test Priority Guide

### 🔴 HIGH PRIORITY (Program A - Live Signal Wiring)

These are the immediate testing focus areas per the Master Plan:

- [ ] Live modal signal ingestion
- [ ] Live surface/focus signal ingestion
- [ ] Referential anchor population from live host state
- [ ] Lawful binding of runtime decisions to real host/platform context
- [ ] Capability-registry-backed surface and environment truth
- [ ] Restore-state fidelity and focus-stack fidelity

**Governing specs for Program A testing:**
- [`maestro-surface-model.md`](./maestro-surface-model.md)
- [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
- [`maestro-reference-system.md`](./maestro-reference-system.md)
- [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)
- [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)
- [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)

---

### 🟡 MEDIUM PRIORITY (Program B - Production Hardening)

Testing focus after Program A:

- [ ] Failure and contention handling
- [ ] Reconnect/retry/recovery hardening
- [ ] Safer degraded behavior under operational load
- [ ] Recovery behavior across STT, ambiguity, object binding, execution failure
- [ ] Phonetic survivability hardening
- [ ] Service-level hardening for authorization, identity gateway, workflow contract

---

### 🟢 LOWER PRIORITY (Program C-E)

Later-phase testing:

- [ ] Benchmark operationalization (corpora runs, standing reports)
- [ ] Regression thresholds
- [ ] Speaker enrollment persistence
- [ ] Delegation persistence/revocation
- [ ] Disambiguation follow-on work
- [ ] Restore behavior completion

---

## Known Gaps (DO NOT TEST YET)

Per Section 7 of the Master Plan, these areas have significant gaps:

1. **Live platform wiring gaps** - Platform-bridge/live-signal coverage incomplete
2. **Active surface/focus binding** - Not fully wired to live signals
3. **Capability registry population** - Needs real adapters and live environment status
4. **Focus architecture completion** - Limited by real host/platform signal fidelity
5. **Wave D beyond D1** - Not yet implemented

---

## Related Documents

- [Maestro Master Plan](maestro-master-plan.md) - Strategic control document
- [Maestro Implementation Progress](maestro-implementation-progress.md) - Current execution state
- [Maestro Decision Log](maestro-decision-log.md) - Architectural decisions
- [Maestro Gotcha Registry](maestro-gotcha-registry.md) - Known traps and caveats
- [Maestro Project Roadmap](maestro-project-roadmap.md) - Historical sequence

---

*Generated from maestro-master-plan.md Section 6 (Current System Capabilities)*
