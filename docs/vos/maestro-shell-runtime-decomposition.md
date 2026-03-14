# Maestro Shell and Runtime Decomposition v0.1

## Purpose

Maestro already has strong language and runtime planning.

The remaining architectural question is:

how should the desktop shell, local runtime services, and language/execution core be divided so that:

* Electron can ship now
* Tauri can be adopted later behind gates
* hot-path behavior leaves the shell
* Rust extraction happens where it actually matters
* Java keeps the control-plane responsibilities it still performs well

This document defines:

* what lives in the shell
* what lives in local services
* what becomes Rust first
* what Java keeps owning
* how Electron-now and Tauri-later should actually work

Without this, shell migration and runtime modernization will keep fighting each other.

---

# 1. Core principle

## The shell is a host, not the brainstem

The shell should own:

* windows
* tray
* permissions UX
* settings and operator controls
* shell-level integrations

The shell should not own:

* hot-path audio logic
* STT lane policy
* interpretation law
* routing semantics
* execution policy

That logic belongs in runtime services with stable contracts.

---

# 2. The four-zone model

The architecture already points toward four zones.

## A. Desktop host zone

Owns:

* shell windowing
* tray behavior
* permissions prompts
* operator-facing surfaces
* app lifecycle UX

Examples:

* Electron now
* Tauri later

## B. Hot-path local runtime zone

Owns:

* audio capture
* turn detection
* command-fast STT
* reflex handling
* voice adapter
* interruption-safe TTS broker hooks

This zone must stay lean and latency-sensitive.

## C. Governed execution zone

Owns:

* command/workflow contracts
* routing
* policy
* capability registry
* execution planning
* memory and provenance

This is the operating truth zone.

## D. Heavy/swappable compute zone

Owns:

* slower reasoning
* optional hosted or heavier providers
* noncritical enrichments

This keeps expensive or mutable components from contaminating the hot path.

---

# 3. What lives in the shell

For v0.1, the shell should own only shell responsibilities.

## Shell responsibilities

* app boot and lifecycle
* tray/menu integration
* permissions UX
* settings and operator UI
* active-app awareness if needed for UX
* shell contract exposed to renderer/UI
* bridging shell events into runtime services

## Important rule

The renderer or shell should depend on a shell contract, not raw Electron-only behavior.

This is already aligned with the existing shell ADRs.

---

# 4. What must move out of the shell

The shell should not remain the place where voice runtime truth accumulates.

Move out or keep out:

* microphone hot path
* VAD and turn logic
* command lane STT orchestration
* reflex arbitration
* deterministic interpretation
* executor routing and actuation policy
* speaker security policy
* TTS broker logic

The shell may host UI around these systems.
It should not be their long-term home.

---

# 5. What lives in local services

Local services should own the durable runtime contracts.

## Service responsibilities

* hot-path audio and turn services
* STT lane execution
* voice adapter
* reflex arbiter
* command/workflow contract creation
* router/policy/planner
* executor and adapter management
* TTS broker
* memory/provenance services

These are the things that should survive a shell swap.

---

# 6. Electron-now, Tauri-later policy

The correct stance is already visible in the decision log:

* Electron remains the current compatibility shell
* Tauri is the long-term intended shell target
* migration happens only after explicit parity and startup gates

This means:

* do not rewrite the runtime around Electron
* do not migrate to Tauri just for architectural aesthetics
* extract contracts first
* swap hosts only when those contracts are stable

---

# 7. Shell migration gates

Tauri should become the default shell only after it meets explicit gates.

## Required gate classes

* cold launch no worse than Electron baseline
* warm launch no worse than Electron baseline
* tray lifecycle parity
* permissions UX parity
* plugin bridge parity
* bus connectivity parity
* no regression in operator-facing workflows

If gates fail, remain on Electron and keep extracting runtime boundaries.

---

# 8. Java and Rust ownership

Maestro already has a clear modernization posture:

* Java conducts
* Rust performs

That should be preserved.

## Java keeps owning first

* control-plane orchestration
* business logic that is not latency-critical
* compatibility bridges where they are already stable
* plugin and surrounding legacy continuity where migration cost is high

## Rust should own first

* audio hot path
* VAD/turn detection hot path
* latency-sensitive voice runtime components
* explicit FFI/JNI bridges for performance-critical paths

Do not migrate to Rust by ideology.
Migrate to Rust where latency and systems behavior truly justify it.

---

# 9. First Rust extraction targets

The modernization matrix already points to the right early targets.

The first extraction candidates should be:

1. audio capture hot path
2. VAD / turn logic
3. narrow FFI boundary for hot-path data flow

Possibly after that:

4. selected voice adapter or reflex-path helpers

These are better first extractions than rewriting broad shell or business-logic surfaces.

---

# 10. What Java should not keep forever

Java should not remain the long-term owner of:

* the most timing-sensitive audio data plane
* the lowest-latency reflex path
* shell-coupled runtime boundaries that block host migration

That does not mean “remove Java.”
It means stop letting Java sit in the most demanding realtime seams if a tighter Rust boundary would help.

---

# 11. Renderer boundary rule

UI code should depend on a shell contract rather than raw host APIs.

That implies:

* renderer components call a stable shell-facing interface
* Electron implements that interface now
* Tauri implements that interface later

This prevents:

* host-specific UI coupling
* shell swap churn in the renderer tree

The shell contract is a migration moat.

---

# 12. Service boundary candidates

The future local runtime should converge on boundaries like:

* `maestro-shell`
* `maestro-audio`
* `maestro-turn`
* `maestro-stt`
* `maestro-voice-adapter`
* `maestro-router` / interpretation path
* `maestro-executor`
* `maestro-tts-broker`
* `maestro-memory`

Whether every one of these is a standalone process immediately is a later implementation detail.

What matters now is that their responsibilities are separable and host-independent.

---

# 13. Process placement guidance

For v0.1 planning:

## In shell process

* host lifecycle
* tray and menus
* permissions UX
* minimal shell adapter

## In local runtime services

* hot path
* interpretation
* policy
* routing
* execution
* TTS broker

## In heavy compute or optional services

* slower reasoning
* optional hosted services
* noncritical enrichment

This reduces startup coupling and keeps the host thinner.

---

# 14. Request-lifecycle alignment

The legacy request lifecycle shows the current path through:

* client
* core
* speech-engine
* code-engine
* plugin

This is useful as continuity evidence, but not as the final target architecture.

The decomposition rule should be:

* preserve what works
* wrap unstable legacy seams behind clearer contracts
* gradually replace inheritance-driven boundaries with explicit runtime ones

Do not break the working voice path just to make the diagram prettier.

---

# 15. Anti-patterns to avoid

Avoid:

* tying hot-path logic to Electron-specific modules
* migrating to Tauri before runtime contracts are stable
* rewriting broad Java control surfaces before extracting the actual hot paths
* letting provider-specific TTS or STT logic leak into shell code
* forcing all runtime services into one process because that feels simpler

These are the traps that create architecture churn without real leverage.

---

# 16. Example target decomposition

## User speaks

Flow:

* shell hosts operator UI and permissions
* audio service captures microphone frames
* turn/STT/voice adapter create structured ingress
* governed runtime routes and executes
* TTS broker returns voiced or visual response
* shell displays operator UI state

In that flow:

* the shell hosts
* the runtime decides

That is the architectural split we want.

---

# 17. Migration sequence

The clean migration order should be:

1. stabilize runtime contracts
2. isolate shell-facing interfaces
3. extract hot-path services behind stable boundaries
4. preserve Electron as compatibility host during extraction
5. prototype Tauri against the same contracts
6. switch only after startup and parity gates pass

This avoids doing a host swap and a runtime rewrite at the same time.

---

# 18. Laws to freeze

## Law 1

The shell is a host for the Voice OS, not the Voice OS brainstem.

## Law 2

Shell migration must not rewrite voice runtime contracts.

## Law 3

Electron remains the current compatibility shell until Tauri proves parity and startup viability.

## Law 4

Hot-path runtime concerns should leave the shell before host migration becomes the central program.

## Law 5

Rust extraction should begin with latency-critical data-plane components, not broad control-plane rewrites.

## Law 6

Java remains the conductor of the control plane unless a specific boundary justifies movement.

## Law 7

Renderer/UI code should bind to a shell contract, not raw host-specific APIs.

## Law 8

Preserve the currently working voice path while replacing inherited architecture incrementally.

---

# 19. What this unlocks

Once this decomposition is frozen, Maestro can:

* keep shipping on Electron without shell lock-in
* migrate to Tauri without rewriting the runtime
* extract hot paths to Rust where it actually matters
* keep Java where it still provides control-plane leverage
* separate host, hot path, and governed execution cleanly

That is how the system becomes modern without throwing away what is already working.
