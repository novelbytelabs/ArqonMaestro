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
* Active phase: Phase 1B - Core operating path
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
* Routed chunk execution and text-command responses through a shared dispatch seam at [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts)
* Added real command-family classification and dispatch-plan tracing to the shared runtime-command dispatcher
* Extracted transcript-response observation out of [`maestro/client/src/main/stream/chunk-manager.ts`](../../maestro/client/src/main/stream/chunk-manager.ts) into [`maestro/client/src/main/runtime/transcript-response-observer.ts`](../../maestro/client/src/main/runtime/transcript-response-observer.ts)
* Extracted predictive-address state, SAS precheck throttling, presence pulse, and STT shadow publishing into [`maestro/client/src/main/runtime/stt-shadow-publisher.ts`](../../maestro/client/src/main/runtime/stt-shadow-publisher.ts)
* Extracted listening-state transitions, session bookkeeping, and renderer-visible listening status into [`maestro/client/src/main/runtime/listening-state-service.ts`](../../maestro/client/src/main/runtime/listening-state-service.ts)
* Extracted Bus/comparator/router cutover logic into [`maestro/client/src/main/runtime/stt-routing-service.ts`](../../maestro/client/src/main/runtime/stt-routing-service.ts)
* Verified the updated main-process path with a focused TypeScript pass and a successful `npm run build:main` build in `maestro/client`
* Completed manual app-level validation of the Phase 1A runtime-spine work

## Current in-progress area

Phase 1A is complete and validated.

Completed inside Phase 1A:

* renderer shell contract extraction
* first main-process runtime-spine extraction
* first execution trace artifact
* first listening-session service extraction
* first chunk-evaluation service extraction
* first command-response service extraction
* first normalized command emission artifact
* first shared runtime-command dispatcher seam
* first command-family dispatch planning seam
* first transcript-response observation service extraction
* first STT shadow-publishing service extraction
* first listening-state service extraction
* first STT routing/cutover service extraction
* manual app-level validation pass

Current Phase 1B focus:

* canonical normalized command object on the live path
* first narrow command-family slice behind the dispatcher
* explicit route-specific command dispatch rather than legacy-response dominance

## Next implementation target

The next best move is:

1. commit the validated Phase 1A checkpoint
2. start Phase 1B with the first narrow command slice behind the dispatcher
3. implement explicit route-specific handling for reflex, focus, navigation, and terminal/editor execution
4. keep reducing dependence on raw `CommandsResponse` shapes in the live dispatch path

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
