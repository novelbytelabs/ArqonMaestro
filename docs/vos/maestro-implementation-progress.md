# Maestro VOS Implementation Progress

## Purpose

This file is the fast resume point for implementation work inside `/docs/vos`.

Use it to answer:

* what phase we are in
* what was just completed
* what is in progress now
* what should happen next
* what a new session should read first before touching code

This is not the full roadmap.

The roadmap owns sequencing.
This file owns the live execution snapshot.

## Current snapshot

* Date: 2026-03-14
* Program state: planning complete, implementation started
* Active phase: Phase 1A - Runtime spine
* Reasoning posture: `high` is still appropriate while the main-process runtime boundary is being chosen and extracted

## Completed recently

* Finished the VOS planning corpus under `/docs/vos`
* Expanded [`maestro-project-roadmap.md`](./maestro-project-roadmap.md) into explicit prototype, integration, hardening, benchmark, deferral, and readiness sections
* Created a renderer shell boundary at [`maestro/client/src/renderer/shell/index.ts`](../../maestro/client/src/renderer/shell/index.ts)
* Moved renderer UI modules off raw Electron IPC and onto the renderer shell adapter
* Verified that raw `ipcRenderer` usage in `maestro/client/src/renderer` is now isolated to the shell adapter itself
* Extracted the first main-process runtime-spine module at [`maestro/client/src/main/runtime/runtime-spine.ts`](../../maestro/client/src/main/runtime/runtime-spine.ts)
* Moved hot-path/STT cluster wiring out of inline `App.create()` boot code and into the runtime-spine module
* Added a minimal hot-path execution trace artifact at [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts)
* Wired parse outcome, route choice, executor handoff, and first feedback into the execution trace path
* Simplified the listening-session lifecycle inside [`maestro/client/src/main/stream/chunk-manager.ts`](../../maestro/client/src/main/stream/chunk-manager.ts) by extracting start/stop helpers out of the large `toggle()` path
* Extracted the first explicit listening-session boundary into [`maestro/client/src/main/runtime/listening-session-service.ts`](../../maestro/client/src/main/runtime/listening-session-service.ts)
* Extracted chunk execution gating into [`maestro/client/src/main/runtime/chunk-evaluation-service.ts`](../../maestro/client/src/main/runtime/chunk-evaluation-service.ts)
* Extracted command-response post-processing and renderer presentation into [`maestro/client/src/main/runtime/command-response-service.ts`](../../maestro/client/src/main/runtime/command-response-service.ts)
* Added a first normalized command emission seam at [`maestro/client/src/main/runtime/runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts)
* Verified the updated main-process path with a focused TypeScript pass and a successful `npm run build:main` build in `maestro/client`

## Current in-progress area

Phase 1A is underway, but only the first boundary extraction is complete.

Completed inside Phase 1A:

* renderer shell contract extraction
* first main-process runtime-spine extraction
* first execution trace artifact
* first listening-session service extraction
* first chunk-evaluation service extraction
* first command-response service extraction
* first normalized command emission artifact

Not completed yet inside Phase 1A:

* final tightening of the hot-path local service boundary
* replacement of legacy `core.ICommandsResponse` dominance with the fuller runtime command contract

## Next implementation target

The next best move is:

1. identify the main-process runtime spine in the current Electron client
2. define the smallest local service boundary for audio ingress, utterance boundary, STT handoff, interpretation handoff, and dispatch
3. keep trimming `App.create()` and `ChunkManager` until they are orchestration and session control rather than mixed runtime assembly
4. replace more of the direct legacy `CommandsResponse` handling with runtime-command contract paths and explicit dispatch seams

## Suggested next files to inspect

* [`maestro/client/src/main/index.ts`](../../maestro/client/src/main/index.ts)
* [`maestro/client/src/main/app.ts`](../../maestro/client/src/main/app.ts)
* [`maestro/client/src/main/events.ts`](../../maestro/client/src/main/events.ts)
* [`maestro/client/src/main/stream/stream.ts`](../../maestro/client/src/main/stream/stream.ts)
* [`maestro/client/src/main/stream/chunk-manager.ts`](../../maestro/client/src/main/stream/chunk-manager.ts)
* [`maestro/client/src/main/stt/index.ts`](../../maestro/client/src/main/stt/index.ts)
* [`maestro/client/src/main/stt/traffic-router.ts`](../../maestro/client/src/main/stt/traffic-router.ts)

## Resume checklist

When starting a new AI session, read these first:

1. [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)
2. [`maestro-implementation-progress.md`](./maestro-implementation-progress.md)
3. [`maestro-decision-log.md`](./maestro-decision-log.md)
4. [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md)

Then verify current renderer-shell state with:

```bash
rg -n 'ipcRenderer' maestro/client/src/renderer
```

Expected result:

* only [`maestro/client/src/renderer/shell/index.ts`](../../maestro/client/src/renderer/shell/index.ts) should appear

Then verify the focused main-process work with:

```bash
./maestro/client/node_modules/.bin/tsc -p maestro/client/tsconfig.json --noEmit --pretty false --skipLibCheck
```

Expected result:

* success

## When to lower reasoning

Keep `high` while choosing or extracting the main-process runtime boundary.

It is usually safe to drop to `medium` once the work is a bounded local implementation slice inside a chosen boundary.

Use `extra high` only for:

* protocol redesign
* authority or delegation changes
* security boundary changes
* shell/runtime placement changes
* roadmap reshaping after new evidence
