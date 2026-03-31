# H2.3 Command Governance Policy

This document describes the **H2.3 Policy**, which governs the execution authority for live voice commands in ArqonMaestro.

## Objective

The H2.3 policy is designed to eliminate dangerous early execution for commands that require structural or slot-value stability, specifically **numeric parameterized commands**. 

Without this policy, a command like *"go to line fifty two"* might be partially recognized as *"go to line fifty"* and executed prematurely, leading to incorrect editor navigation.

## Core Laws

1. **Reflex Commands**: (e.g., *"stop"*, *"cancel"*) Can early-commit aggressively (granted immediately on the first stable match).
2. **Closed-Structure Commands**: (e.g., *"focus terminal"*, *"save file"*) Can commit after structural stability is achieved (typically 2 consecutive matches).
3. **Numeric Parameterized Commands**: (e.g., *"go to line 52"*, *"switch tab 3"*) May stabilize structurally early, but MUST NOT receive execution authority before **endpoint/final-step closure**.

## Implementation Details

### Configuration
The policy is active by default in **Observe Mode** (logging only). Hard-gating can be enabled via environment variables:

- `H23_HARD_GATE_NUMERIC=true`: Enables strict execution blocking for numeric parameterized commands until the utterance is finalized.
- `H23_OBSERVE_ONLY=true`: (Optional) Explicitly sets the default observe-only behavior.

### Runtime Components
- `H23CommandGovernor`: The core logic that evaluates transcripts against structural and slot stability rules.
- `H23LiveTraceRecorder`: A singleton that manages state across the STT stream and provides a `H23DecisionSummary` to the `Executor`.
- `Executor.ts`: Consumes the policy decision and enforces the gating logic.
- `Stream.ts`: Ensures `chunkId` stability across the text-to-command roundtrip.

### Trace Auditing
Every decision is logged to the console:
- `[H23 partial]`: Decision on a partial STT update.
- `[H23 final]`: Decision on the final finalized transcript.
- `[H23 decision]`: Final authority check at the execution boundary.

Detailed JSON traces are saved to `artifacts/reports/h23_live_traces/` for auditing and replay validation.

## Verification
The policy logic is validated using `h23-trace-replay.ts` against known behavioral traces. Mandatory success condition for parameterized commands:
- **Refused** during partial streaming.
- **Granted** only at the final endpoint with reason `passed`.
