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

* Date: 2026-03-15
* Program state: Phase 2A in progress
* Active phase: Phase 2A - Identity and safety gating
* Reasoning posture: `high` is still appropriate while the main-process runtime boundary is being chosen and extracted
* Deep handoff doc: [`maestro-phase-1c-hard-close-handoff.md`](./maestro-phase-1c-hard-close-handoff.md)

## Recent fixes (2026-03-15)

* G-009: Fixed outcome classification precedence - blocked/refusal/clarification now reachable
* G-010: Fixed command_execution reason - now uses `executed_successfully`
* G-011: Fixed trace chunk-id keying - generates unique ID when missing
* G-012: Added integration tests for dispatcher + outcome + trace

## Test coverage

* runtime-command-dispatcher.test.ts: 17 tests
* runtime-command-emitter.test.ts: 9 tests
* focus-history-service.test.ts: 6 tests
* runtime-outcome.test.ts: 13 tests
* runtime-integration.test.ts: 8 tests

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
* Upgraded the live normalized command object in [`maestro/client/src/main/runtime/runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts) to carry object, binding, executor candidates, reversibility, confirmation, scope, and execution metadata
* Added the first route-specific live dispatch behavior: reflex and focus commands can now take dedicated local routes through [`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts) and [`maestro/client/src/main/execute/executor.ts`](../../maestro/client/src/main/execute/executor.ts)
* Extended the first route-specific slice so `COMMAND_TYPE_RUN` can also take a dedicated local execution route
* Expanded the Phase 1B local-route slice so app-control and mode commands that are already fully local in the current app can also bypass the legacy executor path
* Added an explicit editing-local route for clipboard, copy, custom-command, callback, and revision-box control commands that the current app already owns locally
* Added explicit dispatch-reason tracing so remaining legacy routes now say why they stayed legacy instead of only recording that they did
* Added a real focus-history runtime service so the live focus path can observe current and previous surfaces and support `return focus` semantics through actual state
* Extracted an explicit navigation plugin-assisted route so navigation no longer hides behind the generic legacy executor path
* Extracted an explicit editing plugin-assisted route so richer editing commands no longer hide behind the generic legacy executor path
* Added focused runtime tests for the new focus-history service and verified them with `ts-node`
* Added explicit mixed-route handling so mixed local bundles can use `composite_local` and mixed bundles with plugin-dependent commands can use `mixed_plugin_assisted` instead of dropping straight to generic legacy execution
* Added focused runtime tests for dispatcher planning so route and reason selection are regression-protected
* Added an explicit `system_plugin` route so dominant system-family commands no longer collapse directly into generic legacy execution
* Split residual legacy execution into explicit `mixed_legacy` and `unknown_legacy` route classes for better hot-path observability
* Expanded runtime command-family classification coverage for previously uncategorized protobuf command types, reducing `unknown_legacy` drift
* Added explicit `focus_plugin` routing for dominant focus-family commands that are not safely local
* Added explicit no-op/invalid command handling so non-executable bundles stay on `presentation_only` instead of being treated as unknown legacy execution
* Added focused runtime tests for runtime-command emitter unknown-id fallback to prevent crashes on unrecognized command ids
* Added emitter classification tests for newly covered protobuf command families (focus/navigation/editing/system examples)
* Reduced `mixed_legacy` again by treating mixed bundles containing known system/plugin-assisted command types as `mixed_plugin_assisted`
* Reclassified `COMMAND_TYPE_LOGOUT` to system-family/plugin-assisted behavior and kept unresolved mixed legacy focused on truly unresolved pairs
* Added routing normalization for ignorable command noise (`NONE`, `INVALID`, `NO_OP`, `PING`) so mixed bundles route by actionable commands instead of drifting into avoidable mixed legacy
* Reduced `mixed_legacy` further by treating mixed bundles with `COMMAND_TYPE_REPEAT` as plugin-assisted mixed execution rather than unresolved legacy
* Hardened unknown-command handling so mixed bundles containing unknown families now route to `unknown_legacy` with explicit mixed-unknown telemetry instead of generic mixed legacy fallback
* Completed runtime-emitter protobuf `CommandType` classification coverage so every current enum is explicitly mapped
* Aligned debugger-family commands with plugin-assisted editing behavior and mixed-bundle plugin-assisted routing
* Expanded focused runtime tests to cover debugger and revision-box classification/routing behavior
* Added stage-latency telemetry fields to execution trace so Phase 1B can observe parse->dispatch, dispatch->handoff, and parse->feedback timing directly in hot-path logs

## Current in-progress area

Phase 1A and Phase 1B are complete and validated.

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

Completed inside Phase 1B:

* richer runtime command contract object on the live path
* first route-specific local dispatch for reflex and focus commands
* first route-specific local dispatch for execution commands
* first route-specific local dispatch for app-control and mode commands
* first route-specific local dispatch for safe editing-local commands
* first explicit legacy-route reason telemetry for unsupported local slices
* first real focus-history service backing the focus command path
* first explicit plugin-assisted navigation route
* first explicit plugin-assisted editing route
* first focused runtime tests for a new Phase 1B service
* first explicit mixed-route dispatch paths (`composite_local` and `mixed_plugin_assisted`)
* first focused runtime tests for dispatcher route planning
* first explicit system-family plugin-assisted route
* first explicit residual-legacy route classes (`mixed_legacy`, `unknown_legacy`)
* first explicit focus-family plugin-assisted route
* broader protobuf command-type classification coverage in the normalized runtime command envelope
* first explicit no-op/invalid command route handling
* first focused runtime tests for normalized-command emitter fallback behavior
* first focused runtime tests for expanded protobuf command-family classification coverage
* narrower residual `mixed_legacy` scope after mixed system/plugin route tightening
* clearer separation between reflex-local and account/system logout behavior
* fewer mixed-legacy outcomes caused by non-routable control-noise commands
* narrower unresolved `mixed_legacy` footprint after repeat-route policy hardening
* explicit `unknown_legacy` routing when mixed bundles include unknown command families
* complete live emitter mapping coverage for all current protobuf command enums
* explicit debugger command handling across emitter family mapping and dispatcher route planning
* first structured stage-latency signals in execution trace without introducing a separate telemetry subsystem
* first runtime outcome classification seam introduced (`runtime-outcome.ts`) and wired to dispatcher + execution trace

Completed inside Phase 1C:

* actuation policy service implementation (actuation-policy-service.ts)
  * Trust tier classification (Tier 1-4 per policy engine docs)
  * Security mode enforcement (standard/secure/shared_room)
  * Policy decision outcomes (approve_route, approve_with_confirmation, block_route, etc.)
  * Route explanation capability for "why" questions
  * Blocked route auditing through execution trace
* Integrated policy service into runtime-command dispatcher
  * Added policy context to dispatch options
  * Policy decision recorded before execution
  * Blocked routes prevented from executing
* Extended execution trace with policy decision recording
  * Added recordPolicyDecision() method
  * Added trustTierEffective, confirmationRequired, chooserRequired fields
  * Added getPolicyExplanation() for audit trails
* Added 20 comprehensive policy service tests
* Talon Adapter implementation (`talon-adapter.ts`)
  * Declared Phase 1C Gap 2 executors (focus, click, scroll, press) with Trust Tier 3/4 bindings
  * Enforced blocked verbs and surface-level constraints within `canHandle()`
* Integrated Talon fallback into runtime-command dispatcher
  * Added `talon_fallback` route with lower precedence than local but higher than plugin-assisted fallback for visual verbs
  * Successfully verified routing decisions through 22 dispatcher tests
  * Validated full adapter contract through 30 TalonAdapter tests

Phase 2A in progress:

* Identity and safety gating (Next target)

## Next implementation target

The next best move is to begin Phase 2A - Identity and safety gating:

1. Implement enrollment, verification state, and authorization policy hooks for voice identity.
2. Enforce secure mode, shared-room mode, confirmation policy, and always-available reflex rules.
3. Thread identity state into route approval and execution outcomes.

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
5. [`maestro-phase-1c-hard-close-handoff.md`](./maestro-phase-1c-hard-close-handoff.md)

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
