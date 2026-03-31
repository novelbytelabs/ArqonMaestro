# H2.3 Live Integration Guide for ArqonMaestro

This bundle gives you the smallest first implementation for running the H2.3 governor against **live Parakeet partials** inside ArqonMaestro.

## Files included

- `maestro/client/src/main/runtime/h23-command-governor.ts`
  - pure policy engine for H2.3
- `maestro/client/src/main/runtime/h23-live-trace-recorder.ts`
  - records live partial/final steps and writes JSON trace artifacts
- `maestro/client/src/main/runtime/h23-trace-replay.ts`
  - small CLI replay harness for synthetic/JSON case files

## What this bundle does

- Classifies command-lane transcripts into:
  - reflex
  - closed_structure
  - parameterized
  - unknown
- Applies the H2.3 law:
  - reflex: early commit allowed
  - closed_structure: structural stability required
  - numeric parameterized: **no execution before endpoint/final-step closure**
- Produces evidence-rich step traces showing:
  - structural prefix
  - slot state
  - slot stability
  - slot finalization
  - eligibility
  - grant/refuse reason

## Recommended live hook points

### 1. Parakeet partial path

File from handoff:
- `maestro/client/src/main/stt/parakeet-command-fast-provider.ts`

Hook where partial text already exists:
- `createStream(chunkId, onPartial)`
- inside WebSocket `message` handler when `response.text` is present and `response.is_final !== true`

Recommended action:
- call `recorder.startChunk(chunkId)` when the stream opens
- on each partial, call `recorder.recordPartial(chunkId, response.text, stepIndex)`
- on final, call `recorder.recordFinal(chunkId, response.text, stepIndex)`
- after final dispatch or refusal, call `recorder.finalizeChunk(chunkId)`

### 2. Execution boundary

Files from handoff:
- `maestro/client/src/main/execute/executor.ts`
- `maestro/client/src/main/runtime/runtime-command-dispatcher.ts`
- `maestro/client/src/main/runtime/execution-trace.ts`

Minimum safe first phase:
- **do not** fully replace legacy executor behavior yet
- first, run H2.3 as an **observing governor**
- log what H2.3 would grant/refuse
- compare it to actual execution decisions

Second phase:
- gate numeric parameterized execution on H2.3 `granted === true`

## Suggested first wiring pattern

### In the Parakeet provider or stream orchestrator

Create a recorder singleton:

```ts
import H23LiveTraceRecorder from "../runtime/h23-live-trace-recorder";
const h23Recorder = new H23LiveTraceRecorder();
```

When stream starts:

```ts
h23Recorder.startChunk(chunkId);
let h23StepIndex = 0;
```

On partial text:

```ts
h23StepIndex += 1;
const step = h23Recorder.recordPartial(chunkId, response.text, h23StepIndex);
this.log?.logVerbose(`[H23 partial] ${JSON.stringify(step)}`);
```

On final text:

```ts
h23StepIndex += 1;
const finalStep = h23Recorder.recordFinal(chunkId, response.text, h23StepIndex);
this.log?.logVerbose(`[H23 final] ${JSON.stringify(finalStep)}`);
```

After dispatch/refusal:

```ts
const artifact = h23Recorder.finalizeChunk(chunkId);
this.log?.logVerbose(`[H23 artifact] ${JSON.stringify(artifact)}`);
```

## Important implementation stance

For today, the highest-value move is:

1. **observe and trace live behavior first**
2. compare H2.3 decision vs actual runtime action
3. only then hard-gate execution for numeric parameterized commands

That keeps risk low while proving the law on real streams.

## What to test first

### Reflex
- stop
- cancel
- mute

### Closed structure
- focus terminal
- delete previous token

### Numeric parameterized
- go to line fifty two
- switch tab three
- scroll down five lines

### Adversarial
- go to line fifty ... two
- switch tab three ... teen
- scroll down five ... hundred lines

## Success criteria

- unsafe early commit stays at 0
- locked-prefix revision stays at 0
- out-of-grammar still refuses
- numeric parameterized commands do not execute before endpoint closure

## What is intentionally not attempted yet

- grammar-aware non-expandability
- direct protobuf evidence emission integration
- executor-wide replacement
- productized UI

This bundle is the fastest safe bridge from the notebook H2.3 law into live Parakeet partial tracing.
