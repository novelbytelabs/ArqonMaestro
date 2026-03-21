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
* Assist medium-risk grace (`9s`)
* activation-driven grace invalidation
* pause -> listening re-auth boundary invalidation
* Pilot unknown activation downgrade semantics
* unknown-activation rate guard and LOCKED transitions
* security reason-code continuity for downstream UI/audit surfaces

Why:

Without a dedicated bridge, policy semantics remained fragmented across UI assumptions and legacy authorization checks, making behavior hard to audit and easy to drift from the canonical browser policy docs.

Consequences:

* authorization path now accepts additive session-policy context and reasons over it before legacy fallback logic
* desktop security state now exposes policy bridge signals (`securityPolicyMode`, `securityRequiresReauthNext`, `securityGraceValid`, `securityGraceExpiresAt`, `securityLastAuthorizationReasonCode`)
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
* `securityGraceValid`
* `securityGraceExpiresAt`

Why:

Without these fields, downstream replay can show decision outcomes but cannot reconstruct whether a decision was driven by grace expiry, reauth boundaries, or session-policy transitions.

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

Each event carries mode/grace/reauth and reason-code state snapshot fields.

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

Program A1 completion criteria explicitly call out persistence hardening. Without restart continuity, mode/grace/profile context can drift across sessions and degrade deterministic policy behavior.

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

Program A1 policy requires grace invalidation on context/surface jumps. Having an API hook without a real runtime trigger leaves a silent policy gap.

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
