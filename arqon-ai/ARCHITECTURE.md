# Architecture (v0)

## Pipeline

`input stream -> delta encoder -> RAIL state store -> governor -> router -> resolver -> deterministic executor`

## Components

1. Delta Encoder
- Converts raw input increments into structured delta packets.
- Output must be timestamped, confidence-scored, and schema-validated.

2. RAIL State Store
- Per-session/per-entity trajectory state.
- Append-only step history + current summarized state.

3. Governor
- Applies deltas to state.
- Computes stability, closure, readiness, and risk signals.
- Emits reasons for every decision.

4. Router
- Chooses interpretation path based on governor state.
- Must be deterministic given identical state.

5. Resolver
- Converts routed state into canonical action objects.
- No text bridge required in target architecture.

6. Deterministic Executor
- Executes canonical action objects.
- Produces strict execution trace and outcome proof.

## Determinism contract

Given:
- same initial state
- same ordered deltas
- same policy version

Then:
- same routing
- same action object output
- same execution plan

