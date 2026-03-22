# Maestro VOS Gotcha Registry

## Purpose

This file tracks sticky traps that are easy to forget and expensive to rediscover.

Use it for:

* toolchain surprises
* verification traps
* naming oddities
* architecture mismatches between docs and the inherited codebase

This is not a decision log.
It is a memory aid for future sessions.

## Current gotchas

### G-001: `npx tsc` Is Not The Right TypeScript Entry Point Here

Symptom:

Running `npx tsc` from the repo root prints the "This is not the tsc command you are looking for" message.

Use instead:

```bash
./maestro/client/node_modules/.bin/tsc -p maestro/client/tsconfig.json --noEmit
```

Note:

Prefer the project-local client TypeScript binary when checking renderer work.

### G-002: The Macro-System Filename Still Has A Typo

The macro-system spec is currently:

* [`maestro-mcaro-system.md`](./maestro-mcaro-system.md)

Do not casually rename it during unrelated work.

Why:

The typo is ugly, but a rename will create churn in links, tabs, and in-flight references.

### G-003: The Legacy Runtime Topology Still Exists Under The New VOS Plan

The current inherited codebase still broadly reflects:

* Electron client
* `core`
* `speech-engine`
* `code-engine`

Do not assume the modern hot-path local-service split already exists in code.

Why:

The docs describe the target architecture.
The implementation is still transitioning toward it.

### G-004: The Renderer Shell Contract Exists Now

The renderer host boundary now lives at:

* [`maestro/client/src/renderer/shell/index.ts`](../../maestro/client/src/renderer/shell/index.ts)

Verification command:

```bash
rg -n 'ipcRenderer' maestro/client/src/renderer
```

Expected result:

* only the shell adapter should appear

### G-005: Small Boundary Extractions May Verify Faster With Targeted Checks Than Full Compile Passes

For quick boundary work, use:

* targeted `rg` checks
* focused file reads
* local compile commands through the client toolchain

Why:

A full local compile pass may take longer than a narrow structural verification, especially during small adapter extractions.

### G-006: Current Client TypeScript Check Trips On A Dependency Type Error

Command:

```bash
./maestro/client/node_modules/.bin/tsc -p maestro/client/tsconfig.json --noEmit --pretty false
```

Current observed error:

```text
maestro/client/node_modules/webpack-dev-middleware/types/index.d.ts(204,27): error TS2694: Namespace '"fs"' has no exported member 'StatSyncFn'.
```

Why this matters:

This means a full client TypeScript pass may fail on dependency typing noise even when a local boundary extraction is structurally fine.

Use with care:

Treat this as a known verification constraint until the dependency typing issue is cleaned up.

### G-007: Denoise Runtime Framing May Be 10 ms Even When Recorder Contract Is 30 ms

Current planning direction:

* Wave A denoise default is ONNX denoiser integration on a 16 kHz-native path

Implementation trap:

* denoise internals may prefer 10 ms subframes while recorder/turn contracts currently operate on larger logical frames

Why this matters:

* accidental contract drift at this seam can break callback timing expectations, turn transitions, or regression fixtures

Use with care:

* keep 10 ms chunking internal to denoise/provider boundaries
* keep external recorder/turn metadata semantics stable unless explicitly versioned

### G-008: `onnxruntime-node` Must Stay Externalized In `main.webpack.ts`

Symptom:

`npm run build:main` fails with webpack parse errors on platform `.node` binaries under `onnxruntime-node/bin/napi-v6/...`.

Required fix:

In [`maestro/client/main.webpack.ts`](../../maestro/client/main.webpack.ts), keep these externals:

* `onnxruntime-node`
* `onnxruntime-node/dist/binding.js`

Why this matters:

`SileroVadProvider` imports the package and its binding subpath at runtime; bundling those native binaries causes webpack parse failures.

### G-009: Program A1 Security Session Policy Defaults To `pilot` Unless Explicitly Set

Symptom:

Assist-specific grace behavior (`9s`) appears inactive in manual tests even when security/session wiring exists.

Why:

The Program A1 bridge initializes in `pilot` mode by default to preserve explicit degrade/restore semantics. Assist grace is only active while effective mode is `assist`.

Use with care:

* if validating grace behavior, explicitly set mode to `assist` in test/setup paths
* if validating Pilot downgrade behavior, begin in `pilot` and trigger unknown activation

Verification commands:

```bash
cd maestro/client
npx ts-node src/main/runtime/security-session-policy-service.test.ts
npx ts-node src/main/runtime/authorization-service-security-session.test.ts
```

### G-010: Active Profile Delete Is Intentionally Blocked

Symptom:

Deleting a profile can fail with `security_profile_delete_active_blocked`.

Why:

Program A profile-management slice explicitly blocks deletion of the current active profile to avoid leaving security context without a selected profile anchor.

Use with care:

* switch to another profile first, then delete
* check renderer state fields `securityProfilesLastAction` and `securityProfilesLastError` for operation outcome diagnostics

### G-011: Policy Context Diverges If Only Text Dispatch Is Wired

Symptom:

Security/session behavior appears inconsistent between typed/text command handling and live chunk-driven speech execution.

Why:

Text dispatch path already forwards runtime policy context, but chunk dispatch historically omitted that context unless explicitly bridged.

Use with care:

* validate both ingress paths whenever changing `RuntimeCommandDispatcher` policy assumptions
* keep chunk and text dispatch option payloads aligned for security/session fields

Verification command:

```bash
cd maestro/client
npx ts-node src/main/runtime/chunk-evaluation-service.test.ts
```

### G-012: Current Surface Context Is Alias-Derived, Not Yet Host-Signal-Derived

Symptom:

Surface-aware routing appears generic in apps that do not map cleanly to a canonical surface alias.

Why:

Current Program A slice derives `targetSurface` and `surfaceContext` from active app alias normalization (`surfaceModelService.normalizeAlias(...)`) as a bounded bridge step, not from deep host/platform surface telemetry.

Use with care:

* treat current surface context as best-effort for policy/routing improvements
* do not over-interpret alias-derived context as full FP-9 live surface binding

### G-013: Current Modal Context Bridge Uses App/Filename Heuristics

Symptom:

Modal-aware behavior may be over- or under-sensitive in edge apps/windows where filename conventions do not reflect true overlay state.

Why:

Program A currently synthesizes modal context from bounded heuristics (`system dialog`, filename tokens like `modal`, `dialog`, `quick-open`, `command-palette`) rather than deep host modal signals.

Use with care:

* treat modal context as bounded bridge telemetry, not full modal truth
* prioritize host-signal modal ingestion in later Program A slices for high-stakes routing paths

### G-014: `previousSurface` Continuity Is One-Step And Focus-History/ Alias-Bounded

Symptom:

`surfaceContext.previousSurface` may remain null in sequences that include unknown/unmapped app aliases, or may only reflect the immediately prior known surface.

Why:

Program A currently tracks bounded one-step continuity from focus-history `current/previous` app snapshots plus alias normalization. It is intentionally not a deep focus-history model.

Use with care:

* treat `previousSurface` as a bounded hint, not authoritative long-span history
* rely on focus history services for deeper restoration logic

### G-015: Authorization Replay Session Fields Are Additive And May Be Absent In Older Records

Symptom:

Some replay snapshots contain authorization records without session-policy fields (`interactionId`, `securityPolicyMode`, grace/reauth attributes).

Why:

Program A added these fields as additive metadata; historical records and some fallback paths may legitimately omit them.

Use with care:

* treat missing session-policy fields as `unknown` for older records
* avoid schema assumptions that require these fields unconditionally

### G-016: Replay Category Set Now Includes `security_session_event`

Symptom:

Downstream tools that hardcode the old Phase 3B category set may fail or undercount records.

Why:

Program A introduced a new replay category for explicit session lifecycle audit records.

Use with care:

* update category parsing/aggregation to include `security_session_event`
* keep category handling tolerant to additive schema evolution

### G-017: Program A1 Security Runtime Snapshot Is Local-File And Best-Effort

Symptom:

Security/session continuity after restart can still diverge if local snapshot file is corrupted or manually edited.

Why:

Program A1 persistence hardening uses a local JSON snapshot (`security-runtime-state.json`) with defensive restore validation. Invalid fields are ignored instead of hard-failing startup.

Use with care:

* treat snapshot restore as bounded continuity support, not cryptographic truth
* monitor `security_runtime_state_restore_failed` / `security_runtime_state_persist_failed` diagnostics

### G-018: `securityLastReasonCode` Is Session-Policy Reason, Not Pure Authorization Reason

Symptom:

Users may compare `securityLastAuthorizationReasonCode` and `securityLastReasonCode` and think one is wrong when they differ.

Why:

Program A1 now separates concerns:

* `securityLastAuthorizationReasonCode` = latest authorization outcome reason
* `securityLastReasonCode` = latest session-policy lifecycle reason

Use with care:

* use authorization reason code for allow/deny/confirm analysis
* use session reason code for grace/mode/lifecycle transition analysis

### G-019: `securitySnapshot` Is Additive IPC And Not A Streaming Feed

Symptom:

Consumers may assume `securitySnapshot` is automatically streamed after a single request.

Why:

Current Program A1 channel is explicit request/response (`securityRequestSnapshot` -> `securitySnapshot`) for on-demand retrieval. Live UI updates still come from bridge state propagation.

Use with care:

* subscribe to normal bridge state updates for live UX
* use `securityRequestSnapshot` for explicit sync points

### G-020: Context-Jump Detection Is App-Boundary-Based (Not Fine-Grained Surface Telemetry)

Symptom:

Grace invalidation may not trigger for fine-grained in-app context shifts that do not change observed app boundary.

Why:

Current Program A1 context-jump trigger is based on focus-history app boundary transitions. It does not yet consume deep per-control/per-region host telemetry.

Use with care:

* treat current context-jump invalidation as app-boundary hardening
* preserve stricter explicit re-auth gating for high-risk paths regardless of jump detection granularity

### G-021: Use Replay Summary For Live UI, Replay Snapshot For Drill-Down

Symptom:

Consumers may try to poll full replay snapshots for every UI refresh and see unnecessary overhead as replay records grow.

Why:

Program A1 now has two replay access surfaces by design:

* live lightweight summary fields (`securityReplay*`) in bridge state
* explicit full snapshot retrieval (`securityRequestReplaySnapshot` -> `securityReplaySnapshot`)

Use with care:

* use summary fields/channels for live dashboarding and status indicators
* use full snapshot retrieval for debug drill-down, export, or offline analysis

### G-022: Renderer Shell Listeners Must Be Unsubscribed On Component Cleanup

Symptom:

Repeated settings tab mounts can duplicate IPC handlers and cause repeated UI updates for the same event.

Why:

Program A1 added request/response replay channels in settings and updated `shell.on` to return unsubscribe callbacks.

Use with care:

* always call cleanup functions returned by `shell.on(...)` in `useEffect` teardown paths
* avoid adding long-lived IPC listeners in render paths

### G-023: Modal-Boundary Context Jumps Are Heuristic-Driven In Current Program A Slice

Symptom:

Unexpected `context_jump` invalidation can occur when modal heuristics change classification for the same app context.

Why:

Program A1 now invalidates on modal-boundary transitions (overlay/type/classification/trap flags), but modal signals are still bounded by heuristic inputs (`active.app`, `active.filename` patterns).

Use with care:

* treat modal-boundary context jumps as safety hardening, not perfect modal truth
* prioritize explicit verification for medium/high-risk paths where modal stability is uncertain

### G-024: Boundary-Jump Utility Is Key-Based And Intentionally Ignores Timestamp Noise

Symptom:

Developers may expect every modal context refresh to trigger jump invalidation.

Why:

Program A1 boundary logic compares stable boundary keys (overlay/type/classification/trap/block semantics), not transient timestamps or free-text reason strings.

Use with care:

* use key-shape fields for security boundary decisions
* keep diagnostic timestamp changes out of boundary keys to avoid false invalidation churn

### G-025: Program A1 Extension Security Bridge Now Hard-Fails Missing/Bad Contract Version

Symptom:

Security request flows fail immediately even when payload otherwise looks usable.

Why:

Program A1 extension contract now requires `securityContractVersion: "a1.v1"` on every security request/response. Missing or mismatched versions return `security_bridge_version_mismatch` and are not silently tolerated.

Use with care:

* always include `securityContractVersion` and `requestId`
* do not rely on legacy unversioned payload behavior

### G-026: Bridge-Unavailable Fail-Closed Activates Only After Retry Budget Exhaustion

Symptom:

Operators may expect medium/high commands to block after the first timeout but see one retry window first.

Why:

Program A1 marks bridge unavailable only after timeout + retry backoff budget is exhausted (`1500ms + 250ms + 750ms`).

Use with care:

* treat first timeout as transient
* inspect `security_bridge_unavailable` vs `security_bridge_timeout` for triage

### G-027: Extension Lifecycle Dedupe Enforces Monotonic `interactionId`

Symptom:

Some lifecycle updates are ignored after reconnect or out-of-order transport.

Why:

Program A1 extension dedupe rejects backward `interactionId` transitions unless reconnect bootstrap explicitly resets monotonic baseline.

Use with care:

* on reconnect/bootstrap, trigger explicit snapshot bootstrap before trusting incremental events
* debug out-of-order lifecycle by checking bootstrap reset time and last accepted interaction id

### G-028: Replay Reset Is Devtools-Gated (`ARQON_SECURITY_DEVTOOLS=1`)

Symptom:

`securityResetReplaySnapshot` returns forbidden in normal runs.

Why:

Reset is intentionally blocked outside explicit devtools mode for production safety.

Use with care:

* set `ARQON_SECURITY_DEVTOOLS=1` only in controlled test environments
* expect `security_bridge_reset_forbidden` in standard/production contexts

### G-029: Startup/Root-Trust Semantics Are Now Canonicalized Outside `docs/browser`

Symptom:

Teams update browser policy/enrollment pages and accidentally reintroduce conflicting startup or factor-hierarchy behavior.

Why:

Program B B0 moved startup/root-trust/factor-order authority into:

* `docs/security/session-bootstrap-root-trust.md`

Browser docs remain scoped for runtime behavior and UX, but are no longer the authority for bootstrap law.

Use with care:

* treat `docs/security/session-bootstrap-root-trust.md` as canonical for startup/bootstrap/factor hierarchy
* keep `docs/browser/security-policy-matrix.md` focused on runtime mode/risk/trust decisions
* avoid duplicating root-trust rules in browser docs unless explicitly marked as a summary with canonical link

### G-030: Program B B1 Factor Contract Is Additive; Non-Voice Step-Up Is Not Yet Enforced

Symptom:

Developers see `targetStepUpType`/`targetFactors` in metadata and assume PIN/passkey enforcement is already active for medium/high.

Why:

Program B B1 intentionally froze a unified factor contract surface first, while preserving current runtime enforcement to avoid abrupt behavior regressions.

Use with care:

* treat `requiredFactors` as current enforced set for this slice (currently voice)
* treat `targetFactors`/`targetStepUpType` as forward-policy signals for subsequent slices
* do not claim medium/high PIN/passkey hard-enforcement is complete until later slices land

### G-031: Program B B2 Passkey Bootstrap Gate Is Environment-Gated In This Bounded Slice

Symptom:

Operators expect passkey bootstrap block behavior by default but do not see it in local runs.

Why:

B2 introduces passkey bootstrap interfaces and gate wiring with explicit environment controls to avoid abrupt runtime lockout before full provider UX integration:

* `ARQON_PASSKEY_BOOTSTRAP_REQUIRED=1`
* `ARQON_PASSKEY_PROVIDER_READY=1`

Use with care:

* treat current B2 behavior as bounded/runtime-first scaffolding
* enable env gates in controlled validation runs when verifying passkey bootstrap block paths
* do not treat provider-ready false positives as production passkey integration completeness

### G-032: (Historical) Earlier B2 Slice Used Temporary Bootstrap Action Controls

Symptom:

In earlier B2 continuation slices, operators could complete passkey bootstrap using explicit UI actions.

Why:

That bounded continuation prioritized deterministic lock visibility and desktop sync behavior ahead of full provider challenge/verify integration.

Current status:

* manual bootstrap action controls have been removed from active desktop UI flow
* runtime listen-lock enforcement now occurs at `ChunkManager` boundary
* provider challenge/verify integration remains pending for full cutover completion

### G-033: Session-Auth Bootstrap Is Stronger Than Manual Buttons But Still Not Provider-Challenge Completion

Symptom:

Operators see bootstrap method `session_auth` and assume full passkey provider cutover is complete.

Why:

Current B2 hardening removed manual bootstrap controls and now synchronizes bootstrap from authenticated session state, with runtime listen-lock enforcement. This is stricter than manual completion controls, but provider challenge/verify wiring is still a separate completion step.

Use with care:

* treat `session_auth` as transitional runtime bootstrap evidence, not final provider-proof completion
* confirm runtime lock behavior using cold-start vs authenticated session transitions
* do not mark B2 complete until provider challenge/verify outcomes are the direct bootstrap source

### G-034: Provider Outcome Wiring Exists In Desktop Runtime, But Extension Workspace Parity Must Be Validated Separately

Symptom:

Desktop runtime shows provider challenge/outcome fields and accepts provider outcome events, but full cross-surface proof is still incomplete.

Why:

Current workspace includes desktop runtime + plugin-bus contract wiring for provider outcomes, while the live browser-extension consumer workspace/evidence loop may be outside this repository context.

Use with care:

* treat provider outcome support in this repo as runtime-authority wiring complete, not full ecosystem closeout
* require extension-side consumption + live-browser adversarial evidence before marking Program B2/A1 hard-closed
* do not remove transitional `session_auth` fallback until extension/provider parity is validated in operator harness runs

### G-035: ArqonBus Echoes Provider-Outcome Requests, But Correlated Ack May Still Be Absent In Live Extension Harness

Symptom:

Extension-side live probes observe:

* outgoing `securityReportPasskeyProviderOutcome` on `room=maestro/channel=plugin.chrome`
* periodic `securityBridgeState` telemetry from `maestro-client`
* but no correlated `securityReportPasskeyProviderOutcomeAck` for matching `requestId`

Why:

In this environment, ArqonBus transport and telemetry feed are active, but provider-outcome ack completion can still fail to surface through the full extension harness path (desktop/plugin-bus responder path not conclusively completing for the correlated request).

Use with care:

* do not mark B2/A1 extension slice hard-closed without live correlated ack evidence
* treat timeout/no-ack as fail-closed and keep transitional safeguards in place
* require rerun of provider-outcome adversarial scenarios after bus/responder confirmation
