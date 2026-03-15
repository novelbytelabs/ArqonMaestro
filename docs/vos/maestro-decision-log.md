# Maestro VOS Decision Log

## Purpose

This is the VOS-local decision log for `/docs/vos`.

Use it for decisions that shape:

* the VOS architecture
* the VOS implementation sequence
* phase boundaries inside the Maestro Voice OS program

The repo-level [`docs/decision-log.md`](../decision-log.md) remains the authoritative log for broader Arqon Maestro decisions.

This file exists so new sessions can recover the local VOS thread quickly without rereading the entire repo history.

## Maintenance rule

Add an entry here when a choice is:

* expensive to reverse
* phase-shaping
* implementation-shaping
* likely to affect how future sessions resume work

Do not log transient debugging noise here.
That belongs in [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md).

---

## VOS-001: `/docs/vos` Owns Its Own Continuity Layer

* Date: 2026-03-14
* Status: Accepted

Decision:

`/docs/vos` will maintain its own continuity artifacts in addition to the main roadmap.

Why:

The VOS program is now too large to resume cleanly from a single roadmap or a general repo-level decision log.

Consequences:

* [`maestro-implementation-progress.md`](./maestro-implementation-progress.md) tracks live execution status
* [`maestro-decision-log.md`](./maestro-decision-log.md) tracks VOS-local decisions
* [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md) tracks sticky implementation and verification traps

---

## VOS-002: Implementation Starts With Phase 1A Runtime Spine Work

* Date: 2026-03-14
* Status: Accepted

Decision:

The first implementation work should start with Phase 1A runtime spine extraction rather than jumping directly into broad command coverage.

Why:

The planning corpus already says the deterministic operating path is the identity moat of Maestro.
Without the runtime spine, later work would sprawl across shell, UI, and legacy runtime paths without a stable boundary.

Consequences:

* shell/runtime boundary work comes before broad command-family implementation
* hot-path local service boundaries must be named early
* route policy and workflow work should build on the runtime spine instead of bypassing it

---

## VOS-003: Renderer UI Must Depend On A Shell Adapter, Not Raw Electron IPC

* Date: 2026-03-14
* Status: Accepted

Decision:

The renderer must route host interaction through [`maestro/client/src/renderer/shell/index.ts`](../../maestro/client/src/renderer/shell/index.ts) rather than importing `ipcRenderer` directly.

Why:

This makes the Phase 1A shell contract real, supports future Tauri migration, and reduces renderer coupling to Electron.

Consequences:

* raw `ipcRenderer` usage in `maestro/client/src/renderer` should remain isolated to the shell adapter
* future renderer host actions should be added to the shell adapter first
* shell-host migration can proceed behind the adapter instead of through scattered UI changes

---

## VOS-004: Main-Process Hot-Path Wiring Should Live In A Runtime Spine Module

* Date: 2026-03-14
* Status: Accepted

Decision:

The STT and hot-path cluster in the Electron main process should be extracted out of inline `App.create()` wiring and grouped in a dedicated runtime-spine module.

Why:

The runtime spine needs to be visible as an architectural unit before deeper service decomposition is possible.
Without this step, the hot path remains hidden inside general app boot code.

Consequences:

* [`maestro/client/src/main/runtime/runtime-spine.ts`](../../maestro/client/src/main/runtime/runtime-spine.ts) now owns the first grouped main-process runtime cluster
* `App.create()` becomes more orchestration-focused and less responsible for direct hot-path assembly
* later Phase 1A work can decompose the runtime spine further without reopening the whole app boot path

---

## VOS-005: Phase 1A Uses A Minimal Structured Execution Trace Instead Of Ad Hoc Log Hunting

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1A should capture hot-path progress through a minimal structured execution trace rather than relying only on scattered verbose logs.

Why:

The roadmap explicitly calls for a command execution trace artifact, and the runtime already had the right hook points in `ChunkManager` and `Executor`.

Consequences:

* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records parse outcome, route choice, executor handoff, and first feedback
* `ChunkManager` and `Executor` emit trace events through one shared runtime-spine-owned recorder
* later audit and replay work can build on this trace path instead of rediscovering event boundaries

---

## VOS-006: Listening Session Control Should Be A Local Runtime Service, Not Inline `ChunkManager` Flow

* Date: 2026-03-14
* Status: Accepted

Decision:

Active listening session control should be extracted into a dedicated local runtime service instead of remaining mixed into the large `ChunkManager.toggle()` flow.

Why:

Audio ingress and session control are part of the Phase 1A runtime-spine boundary and should be explicit before deeper handoff work continues.

Consequences:

* [`maestro/client/src/main/runtime/listening-session-service.ts`](../../maestro/client/src/main/runtime/listening-session-service.ts) now owns microphone registration plus stream connect/disconnect for the active listening session
* `ChunkManager` remains the command-flow owner, but no longer owns the entire live session lifecycle inline
* later extraction of utterance/session control can build on this service boundary instead of reopening the whole toggle path

---

## VOS-007: Chunk Execution Gating Should Live In Its Own Runtime Service

* Date: 2026-03-14
* Status: Accepted

Decision:

The final "is this chunk ready to execute?" path should live in a dedicated runtime service instead of remaining inline inside `ChunkManager`.

Why:

Execution gating mixes queue state, silence policy, noise classification, append-to-previous handling, and executor handoff. That is a runtime boundary, not just chunk bookkeeping.

Consequences:

* [`maestro/client/src/main/runtime/chunk-evaluation-service.ts`](../../maestro/client/src/main/runtime/chunk-evaluation-service.ts) now owns the chunk execution decision path
* `ChunkManager` keeps the queue/session context, but no longer owns the full inline handoff logic
* later runtime-command routing work can target this seam instead of reopening the whole audio/session path

---

## VOS-008: Final Command Responses Should Emit A Normalized Runtime Shape Before Execution

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1 should emit a lightweight normalized runtime-command envelope from the post-processed final response path even while the legacy `CommandsResponse` structure is still present.

Why:

Phase 1 cannot end as pure structural cleanup. The runtime needs a first explicit contract-emission seam so later router and executor work can grow out of a deterministic local shape.

Consequences:

* [`maestro/client/src/main/runtime/command-response-service.ts`](../../maestro/client/src/main/runtime/command-response-service.ts) now owns final response post-processing and presentation handoff
* [`maestro/client/src/main/runtime/runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts) emits a first normalized runtime-command envelope from final responses
* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records normalized-command emission counts as part of the hot-path trace

---

## VOS-009: Runtime Command Dispatch Must Become A Shared Service Before Command-Family Expansion

* Date: 2026-03-14
* Status: Accepted

Decision:

The handoff from response-shaped results into live execution must pass through a shared runtime-command dispatcher rather than jumping straight from `ChunkManager` or `Stream` into `Executor`.

Why:

Without a shared dispatch seam, normalized command emission would remain a sidecar log rather than part of the actual runtime path. Phase 1 needs a real dispatch boundary before command-family routing can expand.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now owns the live dispatch seam on top of the legacy executor
* [`maestro/client/src/main/stream/chunk-manager.ts`](../../maestro/client/src/main/stream/chunk-manager.ts) and [`maestro/client/src/main/stream/stream.ts`](../../maestro/client/src/main/stream/stream.ts) now use the same dispatcher boundary
* later command-family routing can be introduced behind the dispatcher instead of rethreading execution across multiple call sites

---

## VOS-010: Dispatch Planning Must Classify Real Command Families Before Phase 1B

* Date: 2026-03-14
* Status: Accepted

Decision:

The shared runtime-command dispatcher must classify concrete command families and record a dispatch plan before Phase 1B expands the first operating command slice.

Why:

If dispatch remains a blind relay into the legacy executor, Phase 1B would still be building on an implicit route. Classifying real families now makes route choice explicit without faking unsupported backends.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts) now emits command family and canonical verb metadata
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now produces a real dispatch plan with dominant family and route choice
* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records dispatch route and dominant family for chunk-backed execution

---

## VOS-011: Transcript Observation Must Be Separate From Command-Response Orchestration

* Date: 2026-03-14
* Status: Accepted

Decision:

Transcript-response observation work should live in its own runtime service instead of remaining embedded inside `ChunkManager.onCommandsResponse()`.

Why:

Latency tracking, comparator storage, transcript normalization, and shadow-publish preparation belong to the STT observation path. Keeping that mixed with final-response orchestration makes the hot path harder to reason about and harder to evolve safely.

Consequences:

* [`maestro/client/src/main/runtime/transcript-response-observer.ts`](../../maestro/client/src/main/runtime/transcript-response-observer.ts) now owns transcript-response observation duties
* [`maestro/client/src/main/stream/chunk-manager.ts`](../../maestro/client/src/main/stream/chunk-manager.ts) now focuses more narrowly on chunk lookup, trace hooks, predictive callbacks, and command-response orchestration
* later STT lane and transport evolution can change transcript observation without reopening the full execution path

---

## VOS-012: Predictive Addressing And Shadow Publish Side Effects Must Live Behind One Runtime Service

* Date: 2026-03-14
* Status: Accepted

Decision:

Predictive addr_id state, SAS precheck throttling, presence pulse, and STT Bus shadow-publish behavior should live in one dedicated runtime service instead of remaining scattered across `ChunkManager`.

Why:

Those responsibilities are transport and routing side effects, not chunk/session orchestration. Keeping them embedded in `ChunkManager` makes the hot path harder to reason about and harder to evolve safely.

Consequences:

* [`maestro/client/src/main/runtime/stt-shadow-publisher.ts`](../../maestro/client/src/main/runtime/stt-shadow-publisher.ts) now owns predictive addressing plus STT shadow-publish behavior
* [`maestro/client/src/main/stream/chunk-manager.ts`](../../maestro/client/src/main/stream/chunk-manager.ts) now delegates audio, endpoint, transcript, and session shadow publishing through one runtime service
* later Bus cutover and STT-lane evolution can change this behavior behind the service boundary instead of reopening chunk/session control

---

## VOS-013: Listening State Transitions Must Be Separate From Live Session Wiring

* Date: 2026-03-14
* Status: Accepted

Decision:

Listening-state transitions, session start/stop bookkeeping, and renderer-visible listening status should live in a dedicated runtime service instead of remaining mixed into `ChunkManager.toggle()`.

Why:

`ChunkManager` already owns live chunk/audio orchestration. Keeping toggle race detection, session bookkeeping, and renderer-facing listening state there makes the class do too many jobs and obscures the runtime boundary.

Consequences:

* [`maestro/client/src/main/runtime/listening-state-service.ts`](../../maestro/client/src/main/runtime/listening-state-service.ts) now owns high-level listening state transitions
* [`maestro/client/src/main/stream/chunk-manager.ts`](../../maestro/client/src/main/stream/chunk-manager.ts) now keeps deferred start/stop orchestration while delegating session-state policy and renderer updates
* later secure-mode or identity-gated listening transitions can be added behind this service boundary instead of reopening chunk/session control

---

## VOS-014: STT Transport Routing And Cutover Bookkeeping Must Live Outside `ChunkManager`

* Date: 2026-03-14
* Status: Accepted

Decision:

Bus-client registration, comparator hookup, traffic-router decisions, and Bus-path session result recording should live in a dedicated runtime service rather than inside `ChunkManager`.

Why:

Those concerns belong to transport routing and cutover governance, not chunk/session orchestration. Keeping them in `ChunkManager` hides the runtime boundary and makes Phase 1A harder to close cleanly.

Consequences:

* [`maestro/client/src/main/runtime/stt-routing-service.ts`](../../maestro/client/src/main/runtime/stt-routing-service.ts) now owns STT transport routing and cutover bookkeeping
* [`maestro/client/src/main/stream/chunk-manager.ts`](../../maestro/client/src/main/stream/chunk-manager.ts) now delegates Bus/comparator/router lifecycle to one runtime service
* later Bus cutover changes can evolve behind this service boundary instead of reopening the main chunk/audio path

---

## VOS-015: Phase 1A Closes Only After Live App Validation

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1A is not considered complete on structure and build checks alone; it closes only after the current Maestro app is manually validated as still working correctly.

Why:

Phase 1A changes the hot path in-place inside a live app. Structural cleanliness is necessary, but runtime validation is what proves we preserved behavior while extracting the boundary.

Consequences:

* Phase 1A is now treated as complete
* the next implementation step is Phase 1B rather than more Phase 1A decomposition
* the validated Phase 1A batch should be committed as one checkpoint before Phase 1B broadens command behavior
