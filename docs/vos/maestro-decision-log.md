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

## VOS-005: Wave A Denoise Default = WebRTC APM, RNNoise = Benchmark Candidate

* Date: 2026-03-18
* Status: Superseded by VOS-006

Decision:

Wave A denoise direction is WebRTC Audio Processing (APM) noise suppression on the 16 kHz-native speech path. RNNoise is retained as a benchmark candidate, not the default production integration target.

Why:

Current Maestro speech path and Silero VAD alignment favor 16 kHz coherence and deterministic low-latency behavior. Forcing a 48 kHz-oriented denoise island adds complexity and conversion risk unless benchmark evidence justifies it.

Consequences:

* (Historical) This decision was later replaced by ONNX-denoiser-first direction in VOS-006 / ADM-052

---

## VOS-006: Wave A Patch 4 Denoise Default = ONNX Denoiser Path

* Date: 2026-03-19
* Status: Accepted

Decision:

Patch 4 denoise direction is ONNX-denoiser-first on Maestro’s 16 kHz speech path, with DTLN-class ONNX as the primary current candidate. WebRTC APM and RNNoise remain benchmark/alternate candidates only.

Why:

ONNX Runtime integration is already proven in Maestro via Silero shadow mode, and 16 kHz alignment preserves a coherent speech-path contract without forcing host migration into this phase.

Consequences:

* Patch 4 should be described as ONNX denoiser integration + interruption plumbing
* WebRTC APM is not default production direction
* RNNoise is not default production direction
* Tauri remains a later parity-gated track, not current Wave A scope
* see repo decision: [`ADM-052`](../decision-log.md)

---

## VOS-007: Wave B1 Command-Fast Bridge Uses Local Transcribe -> `sendTextRequest(...)`

* Date: 2026-03-19
* Status: Accepted

Decision:

Wave B1 is accepted with an explicit bridge architecture note:

* `whisper.cpp` now owns the command-fast STT lane
* B1 uses a local-transcribe -> `sendTextRequest(...)` bridge for final command resolution
* this preserves existing downstream command semantics without reopening backend/protocol design
* response provenance and chunk-final correlation semantics are therefore not identical to the prior endpoint-final STT path
* this is an accepted bounded compromise for B1, not the final ideal end-state

Why:

This keeps Wave B1 bounded and additive while modernizing command-fast STT now, without forcing a broader backend/protocol redesign inside this slice.

Consequences:

* bridge behavior is intentional and should remain visible in future design and migration decisions
* future phases may replace this bridge with a more ideal end-state, but B1 should not be retroactively treated as hidden doctrine

---

## VOS-008: Wave C2 WeSpeaker Verification Is CPU-First And Policy-Input Only

* Date: 2026-03-19
* Status: Accepted

Decision:

Wave C2 is accepted with the following explicit architecture constraints:

* WeSpeaker owns the verification lane for this slice via a bounded Python subprocess bridge
* execution policy for this slice is CPU-first only; GPU mismatch hardening is explicitly deferred
* diarization and verification remain distinct functions and must not be merged
* speaker identity output in this slice feeds authorization/policy inputs, not command-language semantics
* Wave C2 must align with voice-identity architecture docs without broadening into full Phase 2A policy implementation

Why:

This preserves the intended identity architecture while keeping Wave C2 tightly scoped, auditable, and reversible if needed.

Consequences:

* verification bridge behavior is intentional and visible, not implicit doctrine
* hot-path expectations remain local/fast/interruptible without redesigning language interpretation
* Phase 2A policy completion remains a separate follow-on scope after Wave C completion

---

## VOS-009: Program A1 Uses A Dedicated Desktop Security-Session Policy Bridge

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 runtime behavior is implemented through a dedicated desktop service:

* [`maestro/client/src/main/runtime/security-session-policy-service.ts`](../../maestro/client/src/main/runtime/security-session-policy-service.ts)

This service is now the bounded authority for:

* lifecycle phase signals (`heard` / `activated` / `executed`)
* per-command authentication gating for executable commands
* pause -> listening fresh-evidence boundary invalidation
* unknown-speaker hard-block semantics in Assist/Pilot
* unknown-activation rate guard and LOCKED transitions
* security reason-code continuity for downstream UI/audit surfaces

Why:

Without a dedicated bridge, policy semantics remained fragmented across UI assumptions and legacy authorization checks, making behavior hard to audit and easy to drift from the canonical browser policy docs.

Consequences:

* authorization path now accepts additive session-policy context and reasons over it before legacy fallback logic
* desktop security state now exposes policy bridge signals (`securityPolicyMode`, `securityRequiresReauthNext`, `securityLastAuthorizationReasonCode`)
* Security tab identity display is resolved through enrollment/profile label first, then fallback identity metadata

---

## VOS-010: Settings IA Migrates `Server` To `Profiles`; Network Controls Move To `Advanced`

* Date: 2026-03-21
* Status: Accepted

Decision:

Settings information architecture now uses:

* `Profiles` tab for identity profile CRUD/switch/re-enroll operations
* `Advanced` tab for network/endpoint + telemetry controls (former Server content)

`Server` as a top-level settings tab is removed.

Why:

Profiles and identity control are now first-class runtime concerns for Program A security/session behavior. Keeping identity profile operations behind a server/network label made user mental model and operational flow inconsistent.

Consequences:

* endpoint indicator now routes to `Advanced` instead of a removed `Server` page
* profile operations are additive and bounded to in-memory state for this slice
* deleting currently active profile is explicitly blocked
* active profile identity label is surfaced in security status as user-facing display name

---

## VOS-011: Runtime Security Mode Must Map To Session-Policy Mode Immediately

* Date: 2026-03-21
* Status: Accepted

Decision:

Security mode changes now synchronously map into session-policy mode:

* `normal -> pilot`
* `shared_room -> assist`
* `secure -> assist`
* `restricted -> locked`

Why:

Program A1 policy behavior cannot remain deterministic if mode transitions only update legacy identity/security state while the session-policy bridge remains stale.

Consequences:

* mode changes from Settings now update session-policy behavior immediately
* session-policy state is published live to renderer state during runtime interactions (not only during explicit settings refresh)

---

## VOS-012: Profile Operations Must Surface Explicit Outcome Signals In UI

* Date: 2026-03-21
* Status: Accepted

Decision:

Profile-management operations (create/update/switch/delete/re-enroll/list) must always surface explicit outcome context into renderer state:

* `securityProfilesLastAction`
* `securityProfilesLastError`

Why:

Without explicit operation outcomes, profile-management failures (especially guarded deletes and missing-profile operations) appear silent and are hard to diagnose during security/session work.

Consequences:

* profile IPC handlers are wrapped with fail-safe error capture
* errors are propagated into settings state rather than remaining console-only
* Profiles tab now presents actionable status/error feedback after each operation

---

## VOS-013: Chunk Hot-Path Dispatch Must Carry The Same Policy Context As Text Dispatch

* Date: 2026-03-21
* Status: Accepted

Decision:

The chunk execution hot path (`ChunkEvaluationService -> RuntimeCommandDispatcher.dispatch`) must forward the same runtime policy context shape as the text-command path:

* `securityMode`
* `speakerVerified`
* `interactionMode`
* `currentApp`
* `targetSurface`

Why:

Program A policy behavior cannot remain deterministic if only one ingress path (text-command callback) carries security context while the primary chunk execution path omits it. That mismatch risks route/policy drift between equivalent commands.

Consequences:

* `ChunkEvaluationService` now receives dispatch context via explicit dependency callback
* `ChunkManager` now supplies live runtime-derived dispatch context for chunk dispatch
* chunk and text dispatch paths now share policy-context parity for core security/session routing inputs

---

## VOS-014: Executor Owns Canonical Dispatch Context Synthesis For Program A

* Date: 2026-03-21
* Status: Accepted

Decision:

`Executor.getRuntimeDispatchPolicyContext()` is the canonical source for dispatch policy context synthesis and now includes additive platform-bridge fields:

* `currentApp`
* `targetSurface` (canonicalized from app alias when possible)
* `surfaceContext` (best-effort active root surface snapshot)

Why:

If each ingress path synthesizes its own context independently, policy and routing drift over time. Program A requires one deterministic context source that both chunk and text dispatch paths consume.

Consequences:

* chunk and text ingress now pull from the same synthesized runtime context
* surface-awareness for dispatch is now additive and bounded, with a clear future upgrade path to richer live platform signals

---

## VOS-015: Program A Modal Context Is Heuristic-Bound Until Deeper Host Signals Land

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A dispatch now carries `modalContext`, synthesized in a bounded way from active app and filename heuristics:

* `system dialog` -> blocking dialog context
* filenames containing `modal` / `dialog` -> blocking dialog context
* filenames containing `quick-open` / `command-palette` -> quick-open navigation context
* otherwise -> `noModalContext()`

Why:

Program A requires explicit modal signal wiring in dispatch flow now, but full host-level modal telemetry ingestion is a larger follow-on slice. This bounded heuristic bridge improves policy fidelity without pretending complete platform coverage.

Consequences:

* chunk and text dispatch paths now carry modal context consistently
* modal context remains inspectable and deterministic, with clear bounded limitations

---

## VOS-016: Program A Surface Bridge Must Preserve One-Step Previous Surface Continuity

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A surface-context bridge in `Executor` now preserves a bounded one-step `previousSurface` when active surface changes between dispatch cycles.

Why:

Without previous-surface continuity, downstream routing/recovery logic cannot distinguish stable focus from immediate cross-surface transitions, reducing explainability and limiting lawful restore behavior.

Consequences:

* `surfaceContext.previousSurface` is now populated when active app surface changes
* continuity remains intentionally bounded to one prior surface in this slice (not a deep history stack)

---

## VOS-017: Authorization Replay Audit Must Include Security-Session Context

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A authorization replay records now include additive security-session context fields:

* `interactionId`
* `reasonCode`
* `securityPolicyMode`
* `securityRequiresReauthNext`

Why:

Without these fields, downstream replay can show decision outcomes but cannot reconstruct whether a decision was driven by per-command auth boundaries, speaker trust transitions, or session-policy transitions.

Consequences:

* identity-gateway audit emission now carries security-session metadata when available
* replay artifacts become more actionable for Program A policy verification and regression triage

---

## VOS-018: Security-Session Lifecycle Events Must Be First-Class Replay Records

* Date: 2026-03-21
* Status: Accepted

Decision:

Phase 3B replay audit schema now includes `security_session_event` category with explicit lifecycle events:

* `heard`
* `activated`
* `executed`
* `pause_to_listening`
* `trust_state_change`

Each event carries mode/reauth and reason-code state snapshot fields.

Why:

Inferring session-policy transitions indirectly from authorization/dispatch logs is fragile and incomplete. Program A requires direct replay evidence for session lifecycle behavior.

Consequences:

* executor now emits explicit security-session replay records at lifecycle boundaries
* replay tooling can reason over lifecycle transitions without reconstructing them from side effects

---

## VOS-019: Program A1 Persists Security Runtime State To Local Versioned Snapshot

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 now persists bounded security runtime state into a versioned local snapshot file:

* active profile id and profile UI operation metadata
* enrollment state (export/restore)
* security-session policy state (export/restore)

Persistence is restored on startup and checkpointed periodically and on profile/security mutations.

Why:

Program A1 completion criteria explicitly call out persistence hardening. Without restart continuity, mode/profile context can drift across sessions and degrade deterministic policy behavior.

Consequences:

* `security-runtime-state.json` under app settings path becomes the bounded continuity artifact for Program A1
* enrollment and session policy services now support export/restore with validation and adversarial payload tolerance
* state schema is additive/versioned but intentionally local-file based in this slice

---

## VOS-020: Session Lifecycle Phase And Interaction ID Are First-Class Bridge Fields

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 bridge state now exposes explicit lifecycle status fields:

* `securityLastLifecyclePhase`
* `securityLastInteractionId`

and treats `securityLastReasonCode` as session-policy reason continuity (with authorization reason code retained separately).

Why:

Downstream UI/extension consumers need deterministic lifecycle position without parsing audit records or inferring from text. This also prevents ambiguity between authorization reason-code semantics and session-policy transition reason semantics.

Consequences:

* lifecycle phase/id now survive persistence restore paths
* security status UI can render exact session lifecycle position directly

---

## VOS-021: Surface Context Now Uses Focus-History Live Snapshot As Primary App Signal

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A surface-context synthesis now consults `FocusHistoryService.snapshot()` (`current`, `previous`) before canonical surface mapping, rather than relying only on direct active-app alias and local ad hoc previous-surface bookkeeping.

Why:

Program A requires stronger live signal fidelity for cross-surface continuity. Focus-history snapshots are already a runtime source-of-truth candidate for app focus transitions and provide a cleaner bounded signal for `previousSurface`.

Consequences:

* `surfaceContext.activeSurface` and `surfaceContext.previousSurface` now derive from live focus-history app observations
* prior ad hoc previous-surface tracking in executor is removed in favor of focus-history-derived continuity

---

## VOS-022: Security Bridge State Must Push Live To Settings And Support Explicit Snapshot IPC

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 security bridge now:

* pushes live session-bridge updates to settings window (in addition to main/mini windows)
* exposes additive IPC retrieval channel:
  * request: `securityRequestSnapshot`
  * response: `securitySnapshot`

Why:

Program A1 completion calls for stronger extension/runtime end-to-end wiring. Poll-only or mount-only refresh patterns risk stale security observability in settings and downstream consumers.

Consequences:

* settings security UI receives bridge transitions in real time during runtime lifecycle changes
* downstream consumers can request full security snapshot on demand without scraping incremental state assumptions

---

## VOS-023: Context Jump Invalidation Must Be Triggered From Live App Boundary Changes

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 now triggers security-session context-jump invalidation from live app focus boundary changes (derived from focus-history current app snapshot), not only from manual or synthetic hooks.

Why:

Program A1 policy requires context-boundary invalidation on context/surface jumps. Having an API hook without a real runtime trigger leaves a silent policy gap.

Consequences:

* runtime now calls `securitySessionPolicyService.onContextJump()` when observed app context changes across interactions
* lifecycle phase taxonomy now includes `context_jump`
* replay security-session events can encode context-jump transitions explicitly

---

## VOS-024: Replay Audit Snapshot Access Is Exposed Via Additive Security IPC

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 now exposes bounded replay-audit IPC for security session verification tooling:

* `securityRequestReplaySnapshot` -> `securityReplaySnapshot`
* `securityResetReplaySnapshot`

Why:

Adversarial and regression verification needs explicit access to replay artifacts without requiring in-process debug hooks. This supports extension/runtime end-to-end evidence workflows.

Consequences:

* downstream consumers can retrieve and inspect replay security/session records on demand
* replay reset path supports deterministic test harness setup in bounded local workflows

---

## VOS-025: Live Security Bridge Uses Replay Summary (Not Full Snapshot) For Continuous UI State

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 now exposes replay summary metadata as additive live bridge state and avoids full replay snapshot cloning in the hot publish loop:

* additive summary IPC: `securityRequestReplaySummary` -> `securityReplaySummary`
* additive bridge fields:
  * `securityReplayGeneratedAt`
  * `securityReplayTotalRecords`
  * `securityReplaySessionEventCount`
  * `securityReplayLastSequence`

Why:

Program A1 observability needs runtime-visible replay evidence for settings/extension parity, but continuous bridge updates must remain lightweight as replay record volume grows.

Consequences:

* security UI and downstream consumers can monitor replay evidence continuity in real time
* full replay snapshots remain available on explicit request only
* live bridge state avoids unnecessary record-array copy overhead

---

## VOS-026: Security Replay Controls Use Explicit Request/Reset IPC With Listener Cleanup

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 Security settings now include bounded replay tooling controls (`Refresh Replay`, `Reset Replay`) driven by explicit IPC request/response channels, and renderer shell listeners now support unsubscribe cleanup.

Why:

Program A1 verification and adversarial workflows need direct replay-control entry points in settings without relying on implicit streaming. Listener cleanup prevents stale handler accumulation across settings remount cycles.

Consequences:

* settings users can trigger replay refresh/reset directly during verification workflows
* renderer listener lifecycle is explicit (`shell.on` returns unsubscribe), reducing duplicate event handling risk

---

## VOS-027: Context-Jump Invalidation Includes Modal-Boundary Transitions

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 context-jump invalidation now considers both:

* app-boundary changes (from focus-history app snapshot)
* modal-boundary changes (from `modalContext` key: overlay state, modal type, classification, trap/block flags)

The runtime coalesces these signals into a single `context_jump` invalidation/event per interaction cycle.

Why:

Program A requires live-signal wiring beyond app-only context shifts. Modal transitions can materially change safe routing/authorization behavior even when app identity is unchanged.

Consequences:

* boundary invalidation and re-auth continuity now respond to modal-context transitions
* duplicate invalidations are avoided when app and modal boundaries both shift in the same interaction

---

## VOS-028: Security Context-Boundary Diff Logic Is Centralized In A Runtime Utility

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 boundary-change logic now uses a dedicated runtime utility:

* `buildModalBoundaryKey(modalContext)`
* `hasBoundaryJump(previous, current)`

Executor app/modal jump checks now consume this utility instead of ad hoc per-call string diff logic.

Why:

Program A context-jump behavior is security-critical and should remain deterministic and testable. Centralizing boundary-key construction/diff logic reduces drift and makes adversarial verification straightforward.

Consequences:

* modal-boundary and app-boundary jump behavior is easier to reason about and test
* future boundary-signal expansion can be added in one utility surface

---

## VOS-029: Program A1 Extension Bridge Contract Is Versioned And Correlated On `plugin.chrome`

* Date: 2026-03-21
* Status: Accepted

Decision:

Program A1 extension bridge traffic over Arqon Bus now requires:

* `securityContractVersion: "a1.v1"`
* `requestId` correlation for all security request/response channels
* source validation restricted to `plugin.chrome`

Why:

Extension closure needs deterministic, auditable channel behavior and explicit compatibility boundaries. Unversioned/unmatched payloads increase policy drift risk.

Consequences:

* missing/mismatched contract version now fails hard (`security_bridge_version_mismatch`)
* invalid request correlation fails deterministically (`security_bridge_invalid_payload`)
* unauthorized channel source is rejected (`security_bridge_unauthorized_source`)

---

## VOS-030: Replay Reset Is Devtools-Gated For Program A1 Extension Flows

* Date: 2026-03-21
* Status: Accepted

Decision:

`securityResetReplaySnapshot` is blocked unless `ARQON_SECURITY_DEVTOOLS=1`.

Why:

Replay reset is useful for adversarial/test harness setup but is unsafe as a production control.

Consequences:

* production/default behavior returns `security_bridge_reset_forbidden`
* test operators must explicitly opt in via env gate

---

## VOS-031: Extension Enforces Bridge-Unavailable Fail-Closed Only For Executable Medium/High Commands

* Date: 2026-03-21
* Status: Accepted

Decision:

Extension policy handling now fails closed for executable medium/high commands only after bridge retry budget exhaustion (`1500ms + 250ms + 750ms`), while reflex emergency commands remain allowed.

Why:

This aligns with safety-first policy while avoiding over-blocking emergency stop/cancel controls.

Consequences:

* first timeout does not immediately mark bridge unavailable
* unavailable state applies only after retries are exhausted
* reflex commands are exempt from bridge-unavailable blocking

---

## VOS-032: App-Scoped Operator Mode Is Authoritative; Desktop Syncs To Focused App

* Date: 2026-03-22
* Status: Accepted

Decision:

Operator mode authority is app/window scoped. For browser interactions, mode set in extension (`pilot` / `assist` / `observe` / `locked`) is authoritative, and desktop runtime synchronizes to focused app mode before authorization.

Why:

Desktop-global mode state created drift where extension could be in `pilot` while desktop remained in stale `assist`, causing false blocks and inconsistent operator expectations.

Consequences:

* extension emits `securitySetPolicyMode` over security bridge contract
* desktop bus bridge validates and applies app-scoped mode updates
* executor applies focused-app mode at authorization time to prevent stale desktop mode lock-in

---

## VOS-033: Desktop Command Panel Must Expose Effective Mode With Compact Visual Signal

* Date: 2026-03-22
* Status: Accepted

Decision:

Desktop command results pane renders an explicit effective-mode indicator:

* tiny mode label (`PILOT`, `ASSIST`, `OBSERVE`, `LOCKED`)
* mode-tinted container around command rows

Why:

Lifecycle visibility (`heard`/`activated`/`executed`) is not enough by itself; operators also need immediate mode context to explain why command behavior differs across focused surfaces.

Consequences:

* command panel communicates mode state without opening settings
* muted tint for `OBSERVE`/`LOCKED`, warning tint for `ASSIST`, primary tint for `PILOT`

---

## VOS-034: Program B Root Trust Is Canonicalized As Passkey-First With Profile Security Governance

* Date: 2026-03-22
* Status: Accepted

Decision:

Program B root trust and startup behavior are centralized in:

* [`docs/security/session-bootstrap-root-trust.md`](../security/session-bootstrap-root-trust.md)

with the following frozen rules:

* passkey/WebAuthn is root trust
* local device-bound PIN is continuity unlock
* voice remains per-command live evidence
* TOTP is recovery-only
* profile security controls are allowed, provider preferences are not
* phased hardening slices are used (B0-B6), not big-bang delivery

Why:

Browser policy/enrollment/decision docs had begun to accumulate overlapping startup/factor semantics. A single canonical authority prevents drift and preserves implementation clarity.

Consequences:

* browser matrix/decisions/enrollment/policy docs defer startup/factor hierarchy to canonical spec
* profile security governance is explicitly documented with strict mutation gates
* Definition of Done for this documentation closure is explicit and evidence-oriented

---

## VOS-035: Program B B1 Freezes A Unified Factor-Orchestrator Contract As Additive Metadata First

* Date: 2026-03-22
* Status: Accepted

Decision:

Program B B1 starts with a unified runtime factor contract surface (required/satisfied/missing/step-up/decision/reason) and exposes it through authorization + bridge snapshots before enabling full passkey/PIN enforcement.

Why:

Freezing cross-surface fields first reduces policy drift and integration churn between desktop runtime and extension consumers while avoiding abrupt behavior regressions during transition.

Consequences:

* factor metadata is now emitted deterministically for authorization outcomes
* app/renderer state includes additive factor fields for observability and downstream parity
* current enforcement remains voice-per-command baseline in this bounded slice; medium/high step-up targets are surfaced but not yet hard-enforced

---

## VOS-036: Program B B2 Introduces Passkey Bootstrap Gate As Runtime-First, Environment-Gated Slice

* Date: 2026-03-22
* Status: Accepted

Decision:

Program B B2 adds passkey bootstrap interfaces and cold-start gate wiring in runtime now, with explicit environment gating until full provider challenge UX is integrated.

Why:

This preserves forward security direction (passkey-first root trust) while preventing abrupt lockout/regressions during the transition from policy freeze to full provider implementation.

Consequences:

* passkey bootstrap state is now a first-class runtime snapshot surface
* authorization can block executable commands with `auth_block_passkey_required` when bootstrap is required and unsatisfied
* B2 verification can be exercised deterministically via:
  * `ARQON_PASSKEY_BOOTSTRAP_REQUIRED=1`
  * `ARQON_PASSKEY_PROVIDER_READY=1`
* full provider cutover remains a follow-on B2 continuation scope

---

## VOS-037: Program B B2 Locked Startup UX Is Enforced In Main Desktop Surface Before Provider Cutover

* Date: 2026-03-22
* Status: Accepted

Decision:

B2 continuation adds explicit locked-startup UX in the main desktop command surface and security settings, and disables listen-toggle activation while passkey bootstrap is required but unsatisfied.

Why:

Runtime-only gate wiring was not visible enough to operators. A clear UX lock state was required to reduce ambiguity and prevent accidental listening activation before root-trust bootstrap.

Consequences:

* users now see a deterministic startup lock banner in the main alternatives page when passkey bootstrap is required
* listen-toggle clicks fail closed until bootstrap is satisfied
* passkey bootstrap action state updates now publish across renderer targets, not settings-only
* this remains a bounded continuation slice until real provider challenge/verify UX replaces the temporary action controls

---

## VOS-038: Program B B2 Removes Manual Bootstrap Completion Controls And Enforces Listen Lock At Runtime Boundary

* Date: 2026-03-22
* Status: Accepted

Decision:

Program B B2 must not depend on manual bootstrap completion/reset buttons in desktop UI. Bootstrap state is synchronized from authenticated runtime session state, and listening enablement is blocked in runtime (`ChunkManager`) when bootstrap is unsatisfied.

Why:

Manual completion controls created a simulated path that could be mistaken for real provider-backed root trust. Runtime-boundary enforcement plus session-auth synchronization is stricter and reduces bypass risk during B2 hardening.

Consequences:

* alternatives and Security UI are observability-first for bootstrap state
* main-process manual bootstrap IPC handlers are removed from the active flow
* listen-toggle lock now has runtime enforcement, not renderer-only gating
* provider-backed challenge/verify remains required for full B2 cutover completion

---

## VOS-039: Program B B2 Bootstrap Authority Shifts To Explicit Provider Outcomes, With Session-Auth As Transitional Fallback

* Date: 2026-03-22
* Status: Accepted

Decision:

Program B B2 now accepts explicit provider challenge/verify outcomes as first-class runtime bootstrap authority through desktop IPC and plugin bridge contracts. Session-auth bootstrap remains present only as a transitional fallback path until full provider rollout parity is complete.

Why:

Relying only on session-auth to mark bootstrap created ambiguity between authenticated continuity and explicit root-trust provider verification. Explicit provider outcomes reduce ambiguity and create a deterministic promotion path to provider-authoritative bootstrap.

Consequences:

* passkey bootstrap snapshot now includes provider challenge/outcome observability fields
* runtime exposes explicit provider outcome ingestion paths:
  * desktop IPC:
    * `securityBeginPasskeyProviderChallenge`
    * `securityReportPasskeyProviderOutcome`
  * plugin bridge:
    * `securityReportPasskeyProviderOutcome` + deterministic ack
* runtime transition test coverage now includes blocked-listen cold-start -> authenticated/unblocked transition behavior in `ChunkManager`
* hard-close remains gated on live extension/provider parity and adversarial evidence, not only desktop runtime wiring

---

## VOS-040: ASR Model Migration to Parakeet and Qwen3

* Date: 2026-03-23
* Status: Superseded by VOS-041 and refined by VOS-042 (command lane)

Decision:

Migrate from `whisper.cpp` to `Parakeet-TDT-0.6B-v3` for command-fast, and from `faster-whisper` to `Qwen3-ASR-1.7B` for dictation-accurate. Legacy engines are preserved as optional manual fallbacks in Advanced Settings. The python bridges must support strict JSON contracts and Qwen3 must expose a `vllm_service` endpoint mode.

Why:

The new models offer better latency and accuracy. Maintaining the legacy engines ensures fallback compatibility without invisible or magic auto-routing.

Consequences:

* explicit fallback toggles in `system` settings (no automatic silent fallback)
* exact routing maps in `chunk-manager.ts` will use parallel state maps (e.g., `chunkUseCommandFastProvider`) rather than renaming legacy maps to avoid collision risk
* Qwen3 integrates directly against vLLM streaming APIs, removing the need for intermediary shims

---

## VOS-041: Command Lane Pivot To Customization-First CTC + Constrained Decoding

* Date: 2026-03-23
* Status: Accepted

Decision:

Maestro command-lane STT is no longer modeled as a pure benchmark-ASR replacement problem. `Parakeet-TDT` and Whisper-family engines are no longer the architectural target for primary command-lane control. The command lane is now **customization-first** and must preserve Serenade/Kaldi-era controllability using:

* modern CTC acoustic front end (`Conformer-CTC` or `Parakeet-CTC` class)
* constrained decoder (`WFST` / Flashlight / equivalent constrained path)
* custom lexicon + pronunciations
* custom command vocabulary
* Maestro grammar/parser layer for bounded command behavior and deterministic rejection

Dictation lane remains separate and accuracy-first, with `Qwen3-ASR` as the current target.

Why:

Command speech in Maestro is a control system, not generic dictation. The previous direction optimized around broad ASR performance but did not preserve non-negotiable command-lane requirements: grammar control, lexical customization, pronunciation control, and deterministic rejection semantics.

Consequences:

* command-fast architecture is now constrained-decoding-first, not transcription-first
* `whisper.cpp` is no longer the preferred command-control fallback when control/grammar guarantees are required
* Whisper-family may remain as optional general ASR fallback, but not as the control-oriented command fallback
* migration plans and roadmap language that treated `Parakeet-TDT` as command-lane end-state must be updated/superseded
* PM/Minimax/Watchdog stage packets must encode command-lane controllability gates explicitly (grammar, bounded rejection, vocabulary/lexicon tests)

---

## VOS-042: Lane-Split Architecture Lock + Parakeet-CTC First Candidate Sequencing

* Date: 2026-03-24
* Status: Accepted

Decision:

Freeze Maestro speech direction as a lane-split architecture with distinct ownership:

* command lane = customization-first control system
* dictation lane = separate long-form text lane

Freeze command-lane architecture as the full command-control stack, not a model-only choice:

* CTC acoustic model
* constrained decoder (`WFST` / Flashlight / equivalent)
* custom vocabulary + custom pronunciations
* Maestro grammar/parser enforcement
* deterministic bounded rejection and control-safe normalization

Freeze candidate sequencing:

* `Parakeet-CTC` is the first acoustic candidate tested inside this architecture.
* This does **not** mean Parakeet alone is the command-lane architecture.

Negative decisions (command-lane foundation):

* `Qwen3-ASR` is not the command-lane foundation.
* `Parakeet-TDT` is not the command-lane foundation.
* `whisper.cpp` is not the command-lane control-equivalent foundation.

Why:

Command speech in Maestro must preserve Serenade/Kaldi-era controllability (grammar/lexicon/pronunciation/rejection guarantees). General ASR benchmark strength alone is insufficient for command-lane architecture ownership.

Consequences:

* command-lane acceptance gates must prioritize control metrics over generic transcription metrics
* dictation-lane model choices cannot be used to infer command-lane architecture choices
* planning/evidence language must describe command lane as a control stack
* repo-level decision log should mirror this refinement for synchronization with `VOS-041`
