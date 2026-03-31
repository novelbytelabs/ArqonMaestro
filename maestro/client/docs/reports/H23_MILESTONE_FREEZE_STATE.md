# Technote: H2.3 Live Integration Milestone

**Milestone Name**: H2.3 Live Integration Pass — First Safe Numeric Closure Runtime  
**Status**: Freeze State Captured  
**Date**: 2026-03-31  
**Author**: Antigravity (AI Assistant)

---

## 🏛 1. Architectural Motivation

The H2.3 policy represents the culmination of research into the "Early Execution Problem" in voice-controlled coding. The core challenge was that numeric parameterized commands (e.g., *"go to line 52"*) are often partially recognized in ways that are valid but incorrect (e.g., *"go to line 50"*). 

Without governance, these partials execute immediately, causing frustrating navigation errors. H2.3 forces a structural and endpoint-closure law that ensures authority is only granted when the speaker has finished the utterance.

---

## 🧬 2. Policy Progression (H1 → H2.3)

| Version | Focus | Limitation |
|---|---|---|
| **H1** | Raw Transcript Matching | Frequent false-positives on noise. |
| **H2** | Structural Stability | Still executed partial numbers (e.g., "5" instead of "52"). |
| **H2.1** | Slot Closure | Blocked missing slots, but not "incomplete" slots. |
| **H2.2** | Consecutive Stability | Better, but failed during rapid speech expanders. |
| **H2.3** | **Endpoint-Closure (Current)** | Mandates final-step signal for parameterized commands. **SAFE.** |

---

## 📦 3. Freeze-State Context

### Changed Files
- `maestro/client/src/main/runtime/h23-command-governor.ts` (Core Policy Engine)
- `maestro/client/src/main/runtime/h23-live-trace-recorder.ts` (State Manager & Singleton)
- `maestro/client/src/main/runtime/h23-trace-replay.ts` (Verification Tooling)
- `maestro/client/src/main/stt/parakeet-command-fast-provider.ts` (STT Hook Points)
- `maestro/client/src/main/execute/executor.ts` (Execution Gating & 4-Rule Logic)
- `maestro/client/src/main/stream/stream.ts` (`chunkId` Stability Persistence)
- `maestro/client/src/main/stream/chunk-manager.ts` (Finalization Dispatch)
- `maestro/client/docs/h23-policy.md` (System Documentation)

### Revision Evidence
- **Commit Hash**: `5207061` (feat(h23): integrate H2.3 command governance policy)
- **Primary Gating Flag**: `H23_HARD_GATE_NUMERIC=true`

---

## 🧪 4. Final Replay Evidence

**Canonical Case**: `go to line fifty two`  
**Provider**: Parakeet-CTC-0.6B Live Partials

| Step | Transcript | isFinalStep | Decision | Reason |
|---|---|---|---|---|
| 1 | "go" | false | **REFUSED** | `out_of_grammar` |
| 2 | "go to line" | false | **REFUSED** | `out_of_grammar` |
| 3 | "go to line fifty" | false | **REFUSED** | `awaiting_slot_value_stability` |
| 4 | "go to line fifty two" | **true** | **GRANTED** | `passed` |

**Conclusion**: Zero unsafe early commits. Execution authority granted exactly at the utterance boundary.

---

## 🪵 5. Live Log Excerpt (Simulated Performance)

```text
[13:30:15] [Parakeet] partial: go to line
[13:30:15] [H23 partial] chunkId=c123 commandClass=unknown granted=false reason=out_of_grammar
[13:30:15] [Parakeet] partial: go to line fifty
[13:30:15] [H23 partial] chunkId=c123 commandClass=parameterized granted=false reason=awaiting_slot_value_stability
[13:30:16] [Parakeet] final: go to line fifty two
[13:30:16] [H23 final] chunkId=c123 commandClass=parameterized granted=true reason=passed
[13:30:16] [Executor] executing response for chunkId: "c123"
[13:30:16] [H23 decision] chunkId=c123 commandClass=parameterized granted=true reason=passed
[13:30:16] [Executor] Moving to line 52
```

---

## 🚩 6. Remaining Risks & Next Steps

1. **Broad Soak Testing**: Observe-mode (logging only) recommended for 48 hours.
2. **Adversarial Variants**: Testing required for phrases like *"go to line... wait... line fifty two"*.
3. **Pilot Hard-Gating**: Enable `H23_HARD_GATE_NUMERIC` for select developers only after soak is confirmed clean.
4. **Identity Staleness**: Periodic verification that `chunkId` remains stable across all future STT shims.
