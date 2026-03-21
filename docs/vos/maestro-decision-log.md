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
