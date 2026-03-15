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

## VOS-019: Phase 1B Should Prefer Real Local Command Expansion Over Pretend Navigation Coverage

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should expand the dispatcher's first-class local routes only for command types the current Maestro app already executes fully on its own, rather than claiming local navigation support that still depends on legacy executor/plugin behavior.

Why:

The current app has truthful local handlers for reflex, focus, run, app-control, and mode commands, but not yet for the navigation slice we originally wanted next. Expanding the real local path is better than introducing a fake route boundary that hides remaining legacy dependence.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now routes launch, quit, open-in-browser, language-mode, and dictation mode commands through a dedicated local path
* [`maestro/client/src/main/runtime/runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts) classifies those commands more accurately in the live normalized command object
* navigation stays on the legacy executor path until Maestro owns a real local navigation boundary rather than an aspirational one

---

## VOS-020: Safe Editing Commands Should Get Their Own Local Route Before Navigation

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should add a dedicated editing-local route for command types the current app already handles entirely in-process, such as clipboard, copy, callback, custom-command, and revision-box control operations.

Why:

Those commands already have truthful local behavior in the command handler and do not depend on the plugin route for correctness. Routing them explicitly through the local runtime path expands real ownership without pretending that editor/navigation semantics are solved.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now distinguishes an `editing_local` route from the remaining legacy executor path
* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records that route explicitly
* the remaining Phase 1B gap is increasingly concentrated in navigation and richer editor-semantic commands instead of low-level local operations

---

## VOS-021: Remaining Legacy Dispatch Must Explain Itself

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should record an explicit reason whenever a normalized command set remains on the legacy executor path instead of only recording the chosen route.

Why:

Once local routes exist for several real command slices, "legacy executor" is no longer enough information. We need to know whether a command stayed legacy because the family is still unsupported locally, because editing semantics still depend on plugin behavior, or because a mixed command bundle prevented a narrower route.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now includes a dispatch reason in the plan it logs and traces
* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records that reason with the route and dominant family
* future Phase 1B and 1C work can target the remaining legacy cases based on evidence instead of intuition

---

## VOS-022: `return focus` Requires A Real Focus-History Service, Not Just A Grammar Entry

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should add a real focus-history runtime service and route the live focus command path through it, so `return focus` semantics depend on observed surface state rather than ad hoc string handling.

Why:

The VOS planning corpus treats `return focus` and `previous focus` as core operating behavior, but the current app did not actually maintain a global focus history. Without a real service, those commands would remain conceptual or fragile.

Consequences:

* [`maestro/client/src/main/runtime/focus-history-service.ts`](../../maestro/client/src/main/runtime/focus-history-service.ts) now tracks current and previous focus surfaces from the live app
* [`maestro/client/src/main/active.ts`](../../maestro/client/src/main/active.ts) now feeds observed active-surface changes into that history
* [`maestro/client/src/main/execute/command-handler.ts`](../../maestro/client/src/main/execute/command-handler.ts) now executes focus commands through the focus-history service, including `return focus` style aliases

---

## VOS-023: Navigation Must Become An Explicit Plugin-Assisted Route Before It Becomes Local

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should give navigation commands an explicit plugin-assisted runtime route rather than leaving them on an undifferentiated legacy executor path until a true local navigation boundary exists.

Why:

Navigation is a real command family in the VOS model, but the current app still relies on plugin/editor integrations for commands like next error, open definition, file search, and tab movement. The right intermediate state is not to pretend those commands are local, but to name and govern the plugin-assisted path explicitly.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now plans a `navigation_plugin` route for dominant navigation command sets
* [`maestro/client/src/main/execute/executor.ts`](../../maestro/client/src/main/execute/executor.ts) now exposes `executePluginAssistedRoute()` as a first-class execution boundary instead of keeping all plugin-dependent work inside the generic executor entrypoint
* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records navigation's plugin-assisted route explicitly

---

## VOS-024: Rich Editing Semantics Should Be Explicitly Plugin-Assisted Until They Become Local

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should give the remaining editing-family commands an explicit plugin-assisted route instead of collapsing them into the generic legacy executor path.

Why:

Editing is too important a family to leave structurally anonymous once reflex, focus, execution, and safe editing-local commands already have named routes. Commands like diff, insert, select, press, and use may still depend on plugin/editor semantics or native-command mediation, but that dependency should be explicit.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now plans an `editing_plugin` route for editing command sets that are not safely local
* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records that route explicitly
* the remaining generic legacy bucket is increasingly reserved for mixed families, unknowns, and still-unspecified system behavior rather than core operating/editor paths

---

## VOS-025: Mixed Command Bundles Must Use Explicit Composite Routes

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should add explicit mixed-route handling so mixed command bundles are dispatched by capability instead of defaulting to a generic legacy route.

Why:

The runtime now supports multiple truthful routes. A mixed bundle of purely local commands should stay local, while a mixed bundle that includes plugin-dependent commands should be clearly routed through plugin-assisted execution. Without this split, mixed bundles hide real capabilities and real dependencies.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now plans `composite_local` and `mixed_plugin_assisted`
* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records both mixed-route types explicitly
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts) now regression-tests route and reason selection for mixed and non-mixed cases

---

## VOS-026: System-Family Commands Need An Explicit Plugin-Assisted Route

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should route dominant system-family command bundles through an explicit `system_plugin` route instead of collapsing them into the generic legacy bucket.

Why:

As we make execution routes more explicit, system commands should be just as observable as navigation and editing paths. Even when they still depend on plugin-assisted behavior, that dependency should be named and traceable.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now plans a `system_plugin` route
* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records `system_plugin`
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts) now validates system-family route selection

---

## VOS-027: Residual Legacy Execution Must Be Typed, Not Opaque

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should split the remaining generic legacy path into explicit `mixed_legacy` and `unknown_legacy` route classes.

Why:

After introducing multiple local and plugin-assisted routes, a single generic legacy label no longer provides enough signal for hardening work. We need to know whether legacy came from mixed command bundles with no known route composition or from unknown command families that need contract-level clarification.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now emits `mixed_legacy` and `unknown_legacy` with explicit reasons
* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records these residual legacy classes
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts) now validates both residual legacy routes

---

## VOS-028: Command-Type Coverage Must Expand Before Unknown-Path Hardening

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should explicitly classify previously uncategorized protobuf command types in the runtime command emitter and add a dedicated `focus_plugin` route for dominant focus-family bundles that are not safely local.

Why:

Unknown fallback behavior can come from missing route policy, but it also comes from missing command-type classification. Expanding classification first reduces accidental `unknown_legacy` routing and keeps hardening work focused on true unknowns.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts) now covers additional command types across reflex, focus, navigation, editing, and system families
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now plans `focus_plugin` for dominant non-local focus-family command bundles
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts) now validates the new route and newly classified navigation/focus command examples

---

## VOS-029: No-Op And Invalid Command Bundles Are Not Unknown Work

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should treat command bundles that contain only `COMMAND_TYPE_NONE` and `COMMAND_TYPE_INVALID` as non-executable presentation outcomes, not as unknown legacy execution.

Why:

Unknown legacy routing should represent unclassified or unresolved behavior that needs implementation attention. No-op and invalid bundles are expected control outcomes and should be explicitly modeled as such.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now routes these bundles to `presentation_only` with reason `no_op_or_invalid_commands`
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts) now validates the no-op/invalid behavior and reserves `unknown_legacy` for truly unknown command ids

---

## VOS-030: Expanded Command-Type Coverage Requires Emitter-Level Regression Tests

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should add focused emitter tests for newly classified protobuf command families, not only dispatcher planning tests.

Why:

Dispatcher tests validate route decisions, but command-family expansion starts in the emitter. Without emitter-level regression tests, family classification drift can silently change routing behavior upstream.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-emitter.test.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.test.ts) now validates unknown-id fallback and representative family mappings for focus/navigation/editing/system command types
* command-family expansions in [`maestro/client/src/main/runtime/runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts) now have direct test protection

---

## VOS-031: Mixed Bundles With Known System Plugin Dependencies Should Not Stay `mixed_legacy`

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should route mixed bundles that include known system/plugin-assisted command types through `mixed_plugin_assisted`, reserving `mixed_legacy` for genuinely unresolved mixed-family combinations.

Why:

As routing policy matures, `mixed_legacy` should represent uncertainty, not known dependency. Mixed bundles that already include plugin-required commands should be routed explicitly to improve trace clarity and reduce false legacy noise.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now includes additional known system/plugin-assisted types in plugin-route detection
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts) now validates both the new `mixed_plugin_assisted` case and a still-unresolved `mixed_legacy` case

---

## VOS-032: Logout Belongs To System Plugin-Assisted Routing, Not Reflex Local Routing

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should classify `COMMAND_TYPE_LOGOUT` as a system-family command and route it through plugin-assisted policy behavior rather than treating it as a reflex-family command.

Why:

Reflex commands in the current runtime are local interruption and control primitives. Logout is not a local interruption primitive in the current app and should not be grouped with reflex-local behavior.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts) now classifies logout under `system`
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now includes logout in plugin-assisted route detection
* [`maestro/client/src/main/runtime/runtime-command-emitter.test.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.test.ts) now validates logout family classification

---

## VOS-033: Ignore Non-Routable Control Noise When Selecting A Route

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B route planning should ignore `COMMAND_TYPE_NONE`, `COMMAND_TYPE_INVALID`, `COMMAND_TYPE_NO_OP`, and `COMMAND_TYPE_PING` when selecting execution routes for mixed bundles.

Why:

These command types are control noise or non-executable outcomes in the current runtime. Including them in dominant-family routing can push otherwise actionable mixed bundles into avoidable `mixed_legacy` routing.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now normalizes routable commands before policy selection
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts) now validates that mixed actionable bundles with ping/no-op noise can still route through actionable paths

---

## VOS-034: Repeat In Mixed Bundles Should Use Plugin-Assisted Routing

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should treat `COMMAND_TYPE_REPEAT` as plugin-assisted when it appears in mixed bundles, reducing unnecessary fallback to unresolved mixed legacy routing.

Why:

Repeat is actionable in runtime behavior but not locally handled by the current command handler. Leaving repeat-containing mixed bundles in `mixed_legacy` conflates known plugin dependency with true unresolved routing uncertainty.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now includes repeat in plugin-assisted mixed-route detection
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts) now validates repeat-containing mixed bundles route to `mixed_plugin_assisted`

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

---

## VOS-016: Phase 1B Starts By Enriching The Live Runtime Command Object

* Date: 2026-03-14
* Status: Accepted

Decision:

Phase 1B should begin by enriching the live normalized command object toward the runtime command contract before introducing broader route-specific behavior.

Why:

The dispatcher and trace path already exist. The next low-risk, high-value move is to make the live command object carry the real contract concepts that later routing and policy code will consume.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts) now emits object, binding, executor candidates, reversibility, confirmation, scope, and execution metadata
* later Phase 1B routing work can depend on a richer live contract object instead of raw protobuf command fields
* the next step is to bring the first narrow command slice behind route-specific dispatch decisions

---

## VOS-017: Reflex And Focus Commands Get First-Class Local Routes Before Broader Slice Expansion

* Date: 2026-03-14
* Status: Accepted

Decision:

The first route-specific Phase 1B behavior should be local routes for reflex and focus commands, rather than trying to broaden all command families at once.

Why:

These commands are foundational, safety-sensitive, and already have strong local command-handler implementations. They are the lowest-risk way to prove route-specific dispatch on top of the new runtime boundary.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now plans `reflex_local` and `focus_local` routes
* [`maestro/client/src/main/execute/executor.ts`](../../maestro/client/src/main/execute/executor.ts) now supports a local-route execution path distinct from the generic plugin-forwarding executor flow
* the next slice expansion should target terminal/process execution and navigation behavior

---

## VOS-018: Terminal/Process Execution Is The Next Local Route In The Phase 1B Slice

* Date: 2026-03-14
* Status: Accepted

Decision:

After reflex and focus, the next route-specific local behavior should be terminal/process execution via `COMMAND_TYPE_RUN`.

Why:

`COMMAND_TYPE_RUN` already has a real local command-handler implementation, so it extends the narrow slice without introducing speculative navigation behavior or new backend assumptions.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now plans `execution_local` for run commands
* [`maestro/client/src/main/execute/executor.ts`](../../maestro/client/src/main/execute/executor.ts) now executes run commands through the local-route path rather than only the generic executor path
* the next likely slice expansion is navigation behavior such as `next error` or definition/file navigation

---

## VOS-019: Mixed Bundles With Any Unknown Command Family Must Route To `unknown_legacy`

* Date: 2026-03-14
* Status: Accepted

Decision:

If a mixed routable bundle includes any command with `family === "unknown"`, dispatch should route to `unknown_legacy` rather than `mixed_legacy`.

Why:

Treating mixed+unknown as generic mixed legacy hides schema drift and makes residual unsupported-command behavior harder to audit. Unknown command presence should stay explicit so policy and telemetry can separate "unsupported because mixed" from "unsupported because unknown."

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) now detects unknown families in mixed routable bundles and routes to `unknown_legacy`
* mixed+unknown route plans now emit `unknown_command_family_in_mixed_bundle` instead of `mixed_command_families_without_known_route`
* [`maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts) now regression-protects this route/reason behavior

---

## VOS-020: Runtime Emitter Must Fully Classify Current Protobuf Command Enums

* Date: 2026-03-14
* Status: Accepted

Decision:

The Phase 1B runtime-command emitter should explicitly classify all currently defined protobuf `CommandType` enum values rather than leaving debugger/revision-box commands to implicit unknown fallback.

Why:

Unclassified command enums cause avoidable `unknown` family drift, reduce route observability, and make mixed-bundle policy less deterministic. Explicit mapping keeps unknown routing focused on true schema drift and unsupported future commands.

Consequences:

* [`maestro/client/src/main/runtime/runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts) now includes explicit debugger, revision-box, and invalid command-type classification
* debugger commands now map into editing-family behavior, allowing deterministic `editing_plugin` and mixed plugin-assisted routing
* focused tests in [`maestro/client/src/main/runtime/runtime-command-emitter.test.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.test.ts) and [`maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts) now regression-protect this coverage

---

## VOS-021: Phase 1B Should Emit Stage-Latency Signals Directly From Execution Trace

* Date: 2026-03-14
* Status: Accepted

Decision:

Execution trace should emit first-order stage-latency fields (`parseToDispatchMs`, `dispatchToHandoffMs`, `parseToFirstFeedbackMs`) directly in hot-path trace logs during Phase 1B.

Why:

Phase 1B exit evidence requires measured hot-path behavior, but a full telemetry subsystem is out of scope for this slice. Extending the existing execution trace keeps measurement local, cheap, and immediately useful.

Consequences:

* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts) now records parse and dispatch timestamps and emits derived stage-latency values
* hot-path latency review can start from structured trace events without guessing or ad hoc timestamp math
* later Phase 3 benchmarking can reuse these fields as seed signals before a broader metrics pipeline is introduced

---

## VOS-035: Phase 1C Hard Close via Policy Engine and Talon Adapter

* Date: 2026-03-15
* Status: Accepted

Decision:

Phase 1C is now considered complete, having safely implemented the specified actuation policy constraints and the Talon integration adapter without violating Zero-Installation principles.

Why:

The Actuation Policy Engine now governs trust tiers and secures routes (Gaps 1, 3, 4). The Talon adapter acts as the Tier 4/Tier 3 fallback without taking over language sovereignty (Gap 2). There are no remaining First Execution Route mandates. The project can safely transition to Phase 2A (Identity and safety gating).

Consequences:

* `talon-adapter.ts` operates as a pure TypeScript capability registry bridge without invoking a real local Talon binary
* `runtime-command-dispatcher.ts` is fully gated and traceable
* the next implementation phase is Phase 2A
