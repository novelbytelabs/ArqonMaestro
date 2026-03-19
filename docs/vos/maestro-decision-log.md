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
