# Arqon Maestro Decision Log

> **Purpose**: Track architectural and technical decisions to preserve context across sessions.

## Maintenance Rule

Add a decision here when a choice is:

- phase-shaping
- architecture-shaping
- compatibility-shaping
- costly to reverse
- likely to be forgotten later without a written record

Do not put transient debugging discoveries here. Those belong in the gotcha registry or phase closeout material.

---

## ADM-001: Java Baseline = 17

- **Date**: 2026-03-07
- **Status**: Superseded for Maestro command lane by VOS-041
- **Decision**: Arqon Maestro will target Java 17 as its control-plane baseline.
- **Why**: The inherited Java 14 stack is historical, not strategic. Java 17 is a modern LTS target and matches the broader Arqon modernization direction.
- **Consequences**:
  - Build scripts updated for Java 17
  - Removed dependency on project-local JDK 14
  - Migrated `javax.xml.bind` → `jakarta.xml.bind` (Java 11+ removed JAXB)
  - Java 14 will not be part of the long-term toolchain

---

## ADM-002: Gradle 8.5 Wrapper

- **Date**: 2026-03-07
- **Status**: Accepted
- **Decision**: Use Gradle 8.5 via wrapper instead of system Gradle 7.4.2.
- **Why**: System Gradle was incompatible with the legacy build configuration. Gradle 8.5 provides better Java 17 support and faster builds.
- **Consequences**:
  - Created `gradle/wrapper/gradle-wrapper.properties`
  - Build now uses `./gradlew` instead of system `gradle`
  - Scripts updated to use wrapper

---

## ADM-003: Dependency Modernization

- **Date**: 2026-03-07
- **Status**: Accepted
- **Decision**: Update inherited dependencies to modern, compatible versions.
- **Why**: Original versions from the pre-pivot stack had compatibility issues with Java 17 and modern toolchains.
- **Consequences**:
  - Jetty: 9.4.38 → 9.4.53
  - Dagger: 2.41 → 2.51.1
  - Protobuf: 3.14.0 → 3.25.2
  - JUnit Jupiter: 5.8.2 → 5.10.2
  - Logback: 1.2.3 → 1.4.14
  - SLF4J: 1.7.25 → 2.0.13
  - Guava: 29.0-jre → 33.0.0-jre

---

## ADM-004: Jakarta EE Namespace Migration

- **Date**: 2026-03-07
- **Status**: Accepted
- **Decision**: Migrate all `javax.*` packages to `jakarta.*` equivalents for Java 17 compatibility.
- **Why**: Java 11+ removed JAXB from the standard library. Jakarta EE is the modern successor.
- **Consequences**:
  - Replaced `javax.xml.bind` → `jakarta.xml.bind`
  - Replaced `javax.annotation` → `jakarta.annotation`
  - Added `jaxb-runtime` dependency for XML binding

---

## ADM-005: Gradle Kotlin DSL

- **Date**: 2026-03-07
- **Status**: Proposed
- **Decision**: Convert build.gradle files to Kotlin DSL (build.gradle.kts)
- **Why**: Kotlin DSL provides better IDE support, type safety, and is the modern Gradle standard
- **Consequences**:
  - More maintainable build scripts
  - Better error messages at configuration time
  - Requires Kotlin knowledge for build customization

---

## ADM-006: Protobuf Version

- **Date**: 2026-03-07
- **Status**: Accepted
- **Decision**: Use Protobuf 3.25.2 (upgraded from 3.14.0)
- **Why**: Better Java 17 compatibility and modern feature support
- **Consequences**:
  - Regenerated proto files may be needed
  - Must ensure protoc version matches

---

## ADM-007: Python Environment

- **Date**: 2026-03-07
- **Status**: Accepted
- **Decision**: Set up Python 3 environment for ANTLR and build scripts
- **Why**: Build system uses Python for grammar generation and corpus processing
- **Consequences**:
  - Installed: pybars3, pyyaml, click, antlr4-python3-runtime
  - Downloaded ANTLR 4.7.2 JAR for grammar generation

---

## ADM-008: Voltron Pattern (Java + Rust)

- **Date**: 2025-01-01
- **Status**: Accepted
- **Decision**: Arqon Maestro follows "Java conducts, Rust performs" architecture.
- **Why**: 
  - Java provides better control plane (orchestration, business logic, plugins)
  - Rust provides better data plane (audio streaming, VAD, low-latency processing)
- **Consequences**:
  - Keep Java for control plane
  - Move latency-critical components to Rust
  - Use FFI/JNI for Java-Rust communication

---

## ADM-009: Project-Local Toolchain

- **Date**: 2025-01-01
- **Status**: Superseded
- **Decision**: Originally used project-local JDK 14.0.1 and Gradle 7.4.2
- **Why**: Initial attempt to isolate from system packages
- **Consequences**: 
  - Superseded by ADM-001 and ADM-002
  - Now uses system Java 17 and Gradle wrapper

---

## ADM-010: Don't Rewrite

- **Date**: 2025-01-01
- **Status**: Accepted
- **Decision**: Do not rewrite Maestro in Rust. Modularize and replace only latency-critical components.
- **Why**: A full rewrite would discard working functionality during a live ecosystem pivot. Incremental migration is safer.
- **Consequences**:
  - Keep existing Java code working
  - Extract hot paths to Rust incrementally
  - Maintain backward compatibility during transition

---

## ADM-011: Arqon Paths And Env Vars Are Canonical

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: Treat `.arqon/arqon.json`, `ARQON_MAESTRO_SOURCE_ROOT`, and `ARQON_MAESTRO_LIBRARY_ROOT` as the canonical config and environment surface.
- **Why**: Phase 2 required a real Arqon-first compatibility layer rather than cosmetic path helpers. Canonical names must be the default write target and the default documented interface.
- **Consequences**:
  - settings code now migrates legacy config into `.arqon`
  - VS Code settings code now follows the same migration rule
  - build scripts and native build files prefer `ARQON_MAESTRO_*` and only fall back to legacy vars
  - user-facing docs now describe Arqon paths first and legacy names only as compatibility notes

---

## ADM-012: Phase Completion Requires Hard-Close Packs

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: No rebrand phase is considered complete until it has an explicit closeout record in the docs.
- **Why**: The rebrand spans runtime, packaging, docs, and compatibility shims. Without hard-close records, the next phase starts from a fuzzy boundary and regressions become much harder to audit.
- **Consequences**:
  - every phase must publish scope, verification, residual risk, and rollback information
  - tracker state must match the corresponding closeout pack
  - decision log and gotcha registry must be updated when a phase changes the technical baseline

---

## ADM-013: Repo Subtree Renamed Before Internal Namespace Migration

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: Rename the top-level engine subtree from `serenade/` to `maestro/` now, while deliberately leaving deeper internal identifiers for later phases.
- **Why**: The repo path was a highly visible mismatch and had to be corrected early, but folding namespace, process, and package identity changes into the same patch would make the migration far riskier.
- **Consequences**:
  - repo paths, root scripts, and runbooks now target `maestro/`
  - internal identifiers such as `scripts/serenade`, `rootProject.name = "serenade"`, and `ai.serenade.*` remain deferred
  - later phases must treat path completion and identity completion as separate facts

---

## ADM-014: Runtime Identity Renames Keep Legacy Script Compatibility

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: Phase 4 renames the primary sidecar and packaged local process names to Arqon Maestro identifiers while keeping legacy custom-command globals, script roots, and process-name cleanup fallbacks active.
- **Why**: Runtime identity had to stop presenting inherited process names, but custom-command breakage and shutdown regressions would be too expensive if the transition removed every legacy assumption at once.
- **Consequences**:
  - the primary sidecar entrypoint is now `arqon-maestro-custom-commands-server.js`
  - packaged local binaries now target `arqon-maestro-core`, `arqon-maestro-speech-engine`, and `arqon-maestro-code-engine`
  - custom-command scripts can use `arqon.*`, while older `serenade.*` scripts still resolve
  - `.arqon/scripts` is now canonical, but `.serenade/scripts` still loads during the migration window
  - process teardown still kills both Arqon and legacy process-name patterns until the compatibility layer is intentionally removed

---

## ADM-015: `.arqon` Is Now The Live Maestro State Root

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: Phase 5 promotes `~/.arqon` from a preferred config filename location to the actual live Maestro state root for config, scripts, and logs.
- **Why**: The compatibility layer from Phase 2 was not sufficient on its own. Real user state was still stranded under `~/.serenade`, which meant the product identity and the live storage identity were still out of sync.
- **Consequences**:
  - startup now migrates legacy config-adjacent state into `~/.arqon`
  - `~/.arqon/scripts` becomes the canonical custom-command location
  - historical logs are copied forward into `~/.arqon` when canonical files are absent
- `~/.serenade` remains preserved for fallback and rollback rather than being deleted automatically

---

## ADM-016: Tree-Sitter Binding Is Now A Local Arqon Namespace Dependency

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: Replace the inherited external `com.github.serenadeai:java-tree-sitter` dependency with a vendored local `:java-tree-sitter` project, and migrate its Java/JNI namespace to `ai.arqon.maestro.treesitter`.
- **Why**: Phase 7 needed a real namespace migration. That is not possible while `core` still compiles against an external artifact that exports the inherited `ai.serenade.treesitter` package.
- **Consequences**:
  - `core` now depends on the local `:java-tree-sitter` project
  - `maestro/tree-sitter/java-tree-sitter` is now vendored into the parent repo instead of remaining a detached nested git dependency
  - `rootProject.name` is now `arqon-maestro`
  - the JNI headers, native glue sources, and Java packages now use `ai.arqon.maestro.treesitter`
  - Phase 7 verification must include both `:java-tree-sitter:test` and `:core:buildTreeSitter`

---

## ADM-017: Upstream Driver Package Identity Stays Wrapped, Not Renamed

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: Keep the upstream npm artifact name `serenade-driver` in manifests for now, but remove direct code-facing references by routing the sidecar through a local `arqon-maestro-driver.js` wrapper.
- **Why**: The upstream package name is external supply-chain identity, not internal runtime identity. Forcing a manifest-level rename without new package publication would create a brittle lockfile surgery problem with no functional benefit.
- **Consequences**:
- active sidecar code no longer directly imports `serenade-driver`
- package manifests still record the upstream artifact name
- the remaining inherited driver name is now a documented external/package-ownership exception, not an internal namespace leak

---


## ADM-018: Wave B Must Obey A Frozen Requirements Contract

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: Local runtime completion work may not infer or mutate broader Arqon ecosystem lanes ad hoc. Wave B must run against an explicit frozen requirements registry and compatibility matrix before more native dependency work proceeds.
- **Why**: The local native engine stack intersects shared ecosystem tooling. Continuing without a written contract would risk making Maestro appear healthy by destabilizing the wider environment.
- **Consequences**:
  - Wave B now requires a `Frozen Requirements Registry`
  - Wave B now requires a `Wave B Compatibility Matrix`
  - frozen lanes must be consumed explicitly, not rediscovered by ambient machine state
  - private native artifacts must stay isolated from shared ecosystem environments

---

## ADM-019: Post-Rebrand Work Splits Into Two Explicit Programs

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: Treat the remaining work after Phase 7 as two separate follow-on programs: one for external infrastructure ownership, and one for historical/provenance audit.
- **Why**: Those surfaces have different risks, different ownership constraints, and different definitions of done. Folding them into the completed seven-phase rebrand would blur scope and undermine the value of the hard-close packs.
- **Consequences**:
  - external endpoints, CDN names, image names, marketplace ownership, and upstream repo ownership move into an infrastructure track
  - inherited READMEs, blog pages, website content, legacy docs, and provenance material move into a separate audit/remediation track
  - future progress should be recorded against the new follow-on plans rather than reopening the hard-closed rebrand phases

---

## ADM-038: Internal Python Tooling Slug Uses `arqon_maestro`

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: The internal Python tooling package previously rooted at `scripts/serenade` is renamed to `scripts/arqon_maestro`.
- **Why**: This slug was still an inherited internal identifier, but unlike the Java/native namespace layer it could be changed safely within the Python tooling surface. Using `arqon_maestro` also avoids ambiguity with the repo root name `maestro`.
- **Consequences**:
  - training and repository tooling now import `arqon_maestro.*`
  - internal runbooks now point to `scripts/arqon_maestro`
- setup tooling in the targeted surface now prefers Arqon env names
- `serenade-driver`, `ai.serenade.*`, and external endpoint names remain deferred to Phase 7

---

## ADM-020: Warning-Free Active Build Paths Are The Wave B Baseline

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: Treat the active Electron main build, active tree-sitter helper path, and active Gradle verification path as warning-free baselines before Wave B local runtime work proceeds.
- **Why**: Local runtime recovery is already noisy enough. Carrying avoidable build warnings into that work would make it harder to distinguish code regressions from environmental startup failures.
- **Consequences**:
  - Wave A hard-closes only after build-warning evidence is published
  - the active Webpack, Python, and Gradle warning paths are now regression-sensitive
  - future warning reintroduction on these paths should be treated as modernization regressions, not normal background noise

---

## ADM-021: Local Native Packaging Must Fail Fast Before CMake

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: Treat missing native dependency inputs for local packaging as a preflight failure in Gradle rather than letting `client:installServer` fall through into opaque CMake/compiler errors.
- **Why**: Wave B is about making local runtime operationally explicit. When the native dependency root is incomplete, the useful information is which inputs are missing, not several pages of downstream compile noise.
- **Consequences**:
  - `code-engine` and `speech-engine` packaging now validate required native inputs before invoking CMake
  - local packaging errors now point directly at `maestro/scripts/setup/build-dependencies.sh`
  - Wave B evidence can distinguish source-root bugs from genuine environment/toolchain gaps

---

## ADM-022: Core Tree-Sitter JNI Must Be Built From In-Repo Arqon Sources

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: `core/bin/build-tree-sitter.py` must prefer the in-repo `maestro/tree-sitter/java-tree-sitter/build.py`, and must reject stale prebuilt JNI artifacts that export legacy `Java_ai_serenade_treesitter_*` symbols.
- **Why**: Wave B local core startup was crashing in `Parser.<clinit>()` because the packaged JNI library was built from legacy Serenade java-tree-sitter sources with mismatched class namespaces.
- **Consequences**:
  - local core JNI output is now validated against Arqon symbol namespace before reusing cached artifacts
  - local packaging now regenerates tree-sitter JNI when a stale legacy artifact is detected
  - Wave B runtime evidence now treats JNI symbol namespace verification as a required check

---

## ADM-023: Code-Engine SentencePiece Tokenization Uses CLI Boundary

- **Date**: 2026-03-08
- **Status**: Accepted
- **Decision**: `code-engine` `TokenIdConverter` no longer uses in-process `SentencePieceProcessor::LoadFromSerializedProto(...)`; it now uses the `spm_encode` CLI boundary for sentencepiece token-id encoding.
- **Why**: Wave B local mode was blocked by a reproducible native crash path during sentencepiece/protobuf parsing in-process. The CLI boundary preserves functional tokenization behavior while avoiding that crash path in the service process.
- **Consequences**:
  - local `code-engine` startup now reaches healthy status in the bundled local stack
  - sentencepiece binary resolution is explicit (`ARQON_MAESTRO_SPM_ENCODE`, `SERENADE_SPM_ENCODE`, then default binary paths)
  - Wave B can hard-close on local service health while deeper ABI unification remains a follow-on hardening topic

---

## ADM-024: Electron Runtime Checks Must Use A Clean Env Wrapper

- **Date**: 2026-03-09
- **Status**: Accepted
- **Decision**: Desktop runtime and packaging checks for Maestro must execute through `maestro/scripts/with_clean_electron_env.sh`, which unsets `ELECTRON_RUN_AS_NODE` before launching Electron commands.
- **Why**: Some local workflows require `ELECTRON_RUN_AS_NODE=1` for legacy command usage. When exported globally, that flag contaminates packaged-app and runtime smoke checks and can make evidence invalid.
- **Consequences**:
  - Wave C evidence scripts and runbooks now invoke Electron commands through a clean-env wrapper
  - legacy command behavior remains available, but must be scoped per command instead of shell-global export
  - future release-readiness checks treat global Electron mode contamination as a failure condition

---

## ADM-025: Wave D Uses A D1 Preparation Gate Before Any Live Cutover

- **Date**: 2026-03-09
- **Status**: Accepted
- **Decision**: External infrastructure ownership work must run in two stages: `D1` preparation (inventory, ownership assignment, readiness checks) and `D2` live migration. No runtime endpoint cutover is allowed until D1 gate criteria are complete.
- **Why**: Arqon-owned endpoint/CDN coverage is currently minimal. Attempting direct cutover now would create avoidable outages and ambiguous ownership during incidents.
- **Consequences**:
  - Wave D starts with ownership inventory and readiness checklist documents as hard prerequisites
  - modernization tracking marks Wave D as in-progress preparation, not cutover-ready
  - docs and config must not claim Arqon-owned live replacements before infrastructure actually exists

---

## ADM-026: Wave D Hard-Close As Prepared+Deferred

- **Date**: 2026-03-09
- **Status**: Accepted
- **Decision**: Complete Wave D in governance mode and defer live endpoint/CDN migration. Keep inherited remote infrastructure active until Arqon-owned replacements exist and D2 readiness criteria are met.
- **Why**: Current Arqon-owned infrastructure coverage is intentionally minimal. Forcing cutover now would add operational risk without user benefit.
- **Consequences**:
  - Wave D closes with ownership inventory and readiness controls, not runtime changes
  - inherited remote streaming/update surfaces remain active by design
  - D2 migration requires explicit trigger conditions and approval window

---

## ADM-027: Wave E Uses Classification-First Content Governance

- **Date**: 2026-03-09
- **Status**: Accepted
- **Decision**: Wave E executes with a classification-first approach (`rewrite`, `annotate`, `preserve`, `archive`, `remove`) before any large-scale doc/web content edits.
- **Why**: A direct rewrite sweep risks legal/provenance errors and inconsistent handling of historical pages. Classification first gives a safe, auditable sequence.
- **Consequences**:
  - active product surfaces are rewritten in dedicated batches
  - legal and provenance surfaces are preserved or annotated intentionally
  - Wave E progress is measured by inventory coverage before text rewrite volume

---

## ADM-028: Historical Blog And Legal Content Is Preserved With Explicit Provenance Notices

- **Date**: 2026-03-09
- **Status**: Accepted
- **Decision**: Preserve inherited blog/legal body content for provenance and legal traceability, but add explicit UI-level provenance notices and rebrand active surrounding surfaces.
- **Why**: Full body rewrites of historical/legal text risk altering historical context or legal meaning. Annotation preserves traceability while removing ambiguity in active product framing.
- **Consequences**:
  - active pages and metadata are rebranded to Arqon Maestro
  - historical/legal pages remain readable as historical records with explicit notice
  - Wave E closes without legal-text rewrite risk

---

## ADM-029: Gate 1 And Gate 2 Require Artifact-Template Hard-Close Evidence

- **Date**: 2026-03-10
- **Status**: Accepted
- **Decision**: Gate 1 (Comparator Confidence Baseline) and Gate 2 (Address-First Pivot) may be marked hard-closed only when evidence uses the mandatory artifact template (`command`, `timestamp`, `exit_code`, `key_output`) and includes explicit decision-log and rollback-proof paths.
- **Why**: Prior closeout language allowed implementation progress to be reported without fully normalized artifact structure, making hard-close status ambiguous and difficult to audit.
- **Consequences**:
  - Phase E evidence must include command-level artifacts for build, soak, parity, and rollback proof
  - comparator evidence must publish mismatch categories with counts and concrete examples
  - Gate 2 evidence must prove address-first emission and mirror-path coexistence
  - hard-close claims are invalid if evidence omits decision-log or rollback-proof pathing

---

## ADM-030: Gate 3 Native Playback via Child Process
- **Date**: 2026-03-10
- **Status**: Accepted
- **Decision**: Implemented native non-blocking audio playback (`VoiceOutput.ts`) via `child_process.spawn("aplay")` instead of bringing in an external audio library or native speaker Node.js addons.
- **Why**: The existing microphone capture logic (`SpeechRecorder`) reliably leverages standard ALSA/PulseAudio binaries (`arecord`/`parec`). Reversing this pattern for playback natively avoids complex ABI bindings, prevents event-loop blocking during playback, and meets all latency targets cleanly for Linux targets.
- **Consequences**:
  - `VoiceOutput.ts` relies on `aplay` existing in the host environment
  - Playback is fully asynchronous (non-blocking validation proved sub-200ms latency)
  - Replay deduplication is handled in-memory within `VoiceOutput` to remain idempotent on startup
  - Gate 3 can be hard-closed without introducing new native ABI risks

---

## ADM-031: Gate 3 Reliability Hardening For Replay Smoke And Playback Failures
- **Date**: 2026-03-10
- **Status**: Accepted
- **Decision**: Isolate replay smoke from soak by defaulting replay validation to port `9101`, and treat `aplay` startup/pipe failures as real playback failures by removing the message from dedupe tracking.
- **Why**: Gate 3 hard-close requires reproducible command evidence. Shared fixed ports created intermittent `EADDRINUSE` failures, and optimistic playback success on spawn errors could silently suppress valid retries.
- **Consequences**:
  - `test-replay-smoke.ts` now runs on an isolated default port and can still be overridden via `ARQON_REPLAY_SMOKE_PORT`
  - `VoiceOutput` reports startup/pipeline failures via telemetry/logging and does not keep failed `message_id` entries deduped
  - Gate 3 evidence reflects deterministic replay-smoke execution and honest playback state

---
 
## ADM-032: Gate 4 Integrity Handshake (ACE) via Registered Handlers
- **Date**: 2026-03-10
- **Status**: Accepted
- **Decision**: Implemented the Integrity Handshake (ACE/Anchor) using asynchronous registered handlers in `BusClient`, strict nested envelope payload parsing, and a targeted integrity smoke command (`test-integrity-smoke.ts`) that verifies allow, block, policy-block, and default-deny behavior.
- **Why**: A constitutive gate is only trustworthy when payload fields are parsed from the actual wire schema and tests assert concrete action IDs/signals. This prevents false green states caused by undefined payloads or shallow scenario checks.
- **Consequences**:
  - `BusClient` now manages `actionReviewHandler` registration
  - `BusClient` now supports `actionBlockedHandler` for blocked-action semantic signaling
  - invalid `stt.action.review`/`stt.action.blocked` payloads are rejected instead of being treated as valid
  - Failure to register a handler results in automatic `block` for safety (constitutive by default)
  - targeted smoke validation now proves:
    - `stt.action.allow` published for approved review
    - `stt.action.block` published for rejected review
    - `stt.action.blocked` policy events surface semantic failure details
    - no-handler uncertainty paths fail closed (`default-deny`)
 
---

## ADM-033: Gate 5 Control-Plane Coordinator Uses SpacetimeDB Contracts With Fail-Closed Arbitration
- **Date**: 2026-03-10
- **Status**: Accepted
- **Decision**: Add `ControlPlaneCoordinator` on the STT request execution path with SpacetimeDB-backed control-plane operations (`enqueue`, `lease`, `ack`, `retry/dead-letter`, `idempotency`) and enforce per-agent FIFO + fair-share round-robin scheduling under bounded per-agent/global inflight limits.
- **Why**: Multi-agent request contention needs a single authoritative arbitration layer to prevent duplicate execution, starvation, and unsafe execution during backend uncertainty.
- **Consequences**:
  - Gate 5-enabled mode has no execution bypass around coordinator decisions
  - coordinator backend unavailability in fail-closed mode produces explicit refusal (`stt.control.blocked_fail_closed`) instead of optimistic execution
  - rollback remains one switch: `arqon_control_plane_enabled=false` restores Gate 4-safe request flow
  - telemetry now emits coordinator lifecycle signals (`enqueue`, `dispatch`, `retry`, `dead_letter`, queue latency)

---

## ADM-034: TTS Provider Selection Policy

- **Date**: 2026-03-10
- **Status**: Superseded by ADM-036
- **Decision**: Implemented interface-based TTS provider abstraction with runtime switching capability.
- **Why**: This established the provider structure but originally shipped with a non-production Kokoro placeholder path.
- **Consequences**:
  - Created `TtsProvider` interface in `tts-providers.ts`
  - `FallbackTtsProvider` wraps existing aplay behavior
  - `KokoroTtsProvider` contract moved to Firecracker sidecar in ADM-036
  - `createTtsProvider()` factory function instantiates providers from settings
  - `VoiceOutput.refreshProvider()` enables runtime provider switching

---

## ADM-035: Fallback/Fail-Closed Semantics for TTS

- **Date**: 2026-03-10
- **Status**: Accepted
- **Decision**: Define explicit failure/fallback behavior for TTS providers.
- **Why**: Provides operational flexibility while maintaining fail-closed security posture when fallback is disabled.
- **Consequences**:
  - If Kokoro fails + fallback enabled: execute fallback (aplay)
  - If Kokoro fails + fallback disabled: fail closed (no audio, log error)
  - Telemetry events: `stt.tts.fallback.used`, `stt.tts.fail_closed`
  - Implemented in `VoiceOutput.play()` with explicit conditional logic and no implicit persistent provider rewrite

---

## ADM-036: Firecracker-Only Kokoro Runtime Contract

- **Date**: 2026-03-10
- **Status**: Accepted
- **Decision**: Kokoro production runtime is Firecracker-only. `KokoroTtsProvider` must call a sidecar HTTP contract (`GET /healthz`, `GET /readyz`, `POST /synthesize`) via `arqon_tts_kokoro_url`; host-native Kokoro binaries are not a production path.
- **Why**: The Ubuntu 22.04 glibc mismatch on ONNX Runtime creates unstable host-native Kokoro behavior and encourages environment drift. Firecracker isolates runtime dependencies and keeps behavior reproducible.
- **Consequences**:
  - Runtime config uses `arqon_tts_kokoro_url`, `arqon_tts_kokoro_voice`, `arqon_tts_kokoro_timeout_ms`, `arqon_tts_kokoro_fallback_enabled`
  - Placeholder or simulated Kokoro execution is invalid for Gate 6 hard-close
  - Gate 6 smoke validation must run against a real sidecar endpoint, not mock-only claims
  - Rollback remains single-switch: `arqon_tts_provider=fallback`

---

## ADM-037: Maestro Master Plan Is The Canonical Forward Roadmap

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Treat `docs/overview/maestro-master-plan.md` as the canonical forward-looking roadmap for Arqon Maestro.
- **Why**: Maestro's direction was spread across architecture notes, ecosystem framing, modernization trackers, and operational plans. A single strategic roadmap is required so product identity, near-term priorities, and long-term architecture do not drift apart.
- **Consequences**:
  - top-level docs should point to the master plan as the main roadmap
  - evidence and closeout docs remain the truth source for completed work
  - future roadmap changes should reconcile with the master plan rather than introducing parallel strategic narratives

---

## ADM-038: Near-Term Maestro Prioritizes New Operator GUI Over Legacy Shell Hardening

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Short-term Maestro work prioritizes the new operator-facing GUI, shell/runtime boundary extraction, and Kokoro-backed two-way interaction over deep hardening of the inherited Electron shell.
- **Why**: The current Electron client is a functioning compatibility shell, but not the intended long-term product host. Near-term effort should build migration leverage and operator excitement rather than overinvesting in a shell that is intended to be replaced.
- **Consequences**:
  - Electron is treated as a temporary compatibility shell
  - Tauri is treated as the intended shell target
  - Wave 2 becomes the shell-contract gate before serious GUI implementation
  - legacy `core`, `speech-engine`, and `code-engine` remain continuity bridges rather than the long-term architectural center

---

## ADM-039: Renderer GUI Must Depend On A Shell Contract Rather Than Raw Electron IPC

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Treat `maestro/client/src/renderer/shell` as the renderer boundary for host interactions and prohibit direct raw Electron IPC usage in renderer UI modules outside that adapter layer.
- **Why**: The next operator GUI must survive migration from the current Electron compatibility host to a future Tauri host. That requires a stable shell-facing interface rather than renderer components encoding Electron event and windowing details directly.
- **Consequences**:
  - renderer components and pages should call the shell contract instead of `ipcRenderer`
  - Electron remains the active compatibility adapter for now
  - future shell swaps should replace the adapter rather than the renderer component tree
  - Wave 3 GUI work should build on the shell contract rather than reopening host-specific coupling

---

## ADM-040: Ultimate VOS Stack Intake Matrix Is Canonical For External Technology Choices

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Treat `docs/architecture/ultimate-vos-reference-architecture.md` (`Technology Baseline And Intake` section) as the canonical source for Maestro external stack baselines and project intake status (`adopt`, `borrow`, `integrate-via-provider`, `defer`).
- **Why**: Strategic architecture language was captured, but concrete external project choices were not consistently documented in one governed place. A canonical intake matrix is required to prevent stack drift and accidental hard-coupling.
- **Consequences**:
  - external stack choices must be reflected in the intake matrix before being treated as baseline
  - architecture updates should modify the canonical architecture section instead of splitting project status across multiple docs
  - intake candidates require explicit lane assignment, boundary impact, failure mode, and rollback path
## ADM-037: Shell Strategy Uses Electron Now, Tauri Behind Startup Gates

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Keep Electron as the active shell for current delivery, and treat Tauri as an adoption target only after passing explicit startup-time and parity gates.
- **Why**: Shell migration is architecture-shaping and costly to reverse. Startup feel is a first-order UX requirement for a voice OS, so migration must be decided by measured boot behavior, not assumptions.
- **Consequences**:
  - Electron remains the shipping shell during current runtime stabilization
  - Tauri work proceeds as a compatibility-track prototype, not a forced cutover
  - promote-to-default gate requires launch metrics on the same machine/profile:
    - cold launch: click-to-interactive no worse than Electron baseline
    - warm launch: click-to-interactive no worse than Electron baseline
    - no regression on tray lifecycle, permissions UX, plugin bridge, and bus connectivity
  - if gates are missed, remain on Electron and continue contract extraction until parity is proven

---

## ADM-039: `whisper.cpp` Is The Near-Term Command-Lane STT Baseline (Superseded for Maestro command lane by VOS-041)

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Adopt `whisper.cpp` as the near-term default implementation target for Maestro's `command-fast` STT profile, while keeping `maestro-stt` as a provider contract and preserving an independent provider track for `dictation-accurate`.
- **Why**: Maestro's hot operating path prioritizes local-first execution, predictable latency, portable deployment, and systems-friendly integration. `whisper.cpp` best fits those command-lane requirements without forcing a single engine across all speech modes.
- **Consequences**:
  - `command-fast` STT target is superseded by VOS-041 (customization-first constrained decoding)
  - `dictation-accurate` remains separately benchmarked and may use a different provider
  - STT architecture remains contract-first, not single-engine lock-in
  - routing keeps explicit mode/profile split (`command-fast` versus `dictation-accurate`)

---

## ADM-040: Maestro Is A Voice Operating System, Not A Personal Assistant

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Arqon Maestro is formally defined as a Voice Operating System (VOS) runtime rather than a personal assistant product role.
- **Why**: The operating boundary is the core identity moat of Maestro and determines routing, governance, execution, and UX behavior.
- **Consequences**:
  - architecture and roadmap decisions prioritize operating reliability over assistant theatrics
  - command/governance/runtime contracts remain first-class
  - see: `docs/architecture/maestro-actuation-and-control-stack.md`

---

## ADM-041: Maestro And Nexus Are Separate Sibling AGOs

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Maestro and Nexus are separate sibling AGOs with distinct responsibilities.
- **Why**: Separating VOS operation from assistant continuity preserves clean boundaries, prevents scope collapse, and improves system legibility.
- **Consequences**:
  - Maestro owns spoken operating and governed actuation
  - Nexus owns assistant continuity and long-horizon guidance
  - see: `docs/architecture/maestro-actuation-and-control-stack.md`

---

## ADM-042: Maestro Uses A Multi-Layer Actuation Strategy

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Maestro uses a layered actuation strategy instead of a single automation technology.
- **Why**: Real operating surfaces span browser, desktop, and mixed interfaces where no single layer is reliably sufficient.
- **Consequences**:
  - Talon is adopted as the global desktop control layer
  - Playwright is adopted as the structured browser/web automation layer
  - UI.Vision is retained as the visual/OCR fallback layer
  - actuation policy is layer-aware and fallback-aware
  - future integrations must fit the layered control model
  - see: `docs/architecture/maestro-actuation-and-control-stack.md`

---

## ADM-043: Talon Is The Global Desktop Control Layer

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Talon is adopted as the global desktop control layer for cross-application OS interaction.
- **Why**: Desktop-wide control requires a dedicated global layer when stronger semantic interfaces are unavailable.
- **Consequences**:
  - desktop actuation policy can target a defined global control backend
  - Talon is scoped as a layer role, not a universal replacement for all control paths
  - see: `docs/architecture/maestro-actuation-and-control-stack.md`

---

## ADM-044: Playwright Is The Structured Web Automation Layer

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Playwright is adopted as the structured web automation layer for semantic selector-driven browser control.
- **Why**: Structured web automation needs deterministic DOM-level interaction and repeatable automation contracts.
- **Consequences**:
  - web control favors structured Playwright paths before visual fallback
  - browser automation capabilities can be tested and versioned with explicit selectors
  - see: `docs/architecture/maestro-actuation-and-control-stack.md`

---

## ADM-045: UI.Vision Is The Visual/OCR Fallback Layer

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: UI.Vision is retained as a bounded visual/OCR fallback layer, not the primary universal controller.
- **Why**: Visual/OCR control is useful but less deterministic than semantic/native layers and should be explicitly constrained.
- **Consequences**:
  - fallback policy invokes UI.Vision only when stronger layers are unavailable or insufficient
  - architecture avoids visual-first coupling for standard operating paths
  - see: `docs/architecture/maestro-actuation-and-control-stack.md`

---

## ADM-046: Voice Identity Is A First-Class VOS Security Capability

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Voice identity and speaker-aware controls are first-class security capabilities in Maestro.
- **Why**: High-impact voice actuation must include identity-aware policy enforcement to remain trustworthy.
- **Consequences**:
  - high-impact action paths must support speaker-aware authorization checks where required
  - uncertain identity/policy states fail closed
  - see: `docs/architecture/maestro-actuation-and-control-stack.md`

---

## ADM-047: Native/Semantic Automation Is Preferred Before Visual Fallback

- **Date**: 2026-03-13
- **Status**: Accepted
- **Decision**: Maestro automation policy prefers native/semantic control paths before visual/OCR fallback paths.
- **Why**: Native/semantic control is generally more deterministic, auditable, and governance-compatible for a Voice OS.
- **Consequences**:
  - routing policy must prioritize higher-confidence semantic routes
  - visual/OCR actuation is treated as a bounded fallback lane
  - see: `docs/architecture/maestro-actuation-and-control-stack.md`

---

## ADM-048: Recovery Service Must Delegate To Existing Subsystems

- **Date**: 2026-03-17
- **Status**: Accepted
- **Decision**: Focus recovery must be a bounded state-repair orchestrator that delegates to existing subsystems, not a second xdotool layer. Recovery actions (REFOCUS_APP, REFOCUS_REGION, REFOCUS_CONTROL, RESTORE_PREVIOUS) are logical actions delegated to system.focus(), focus-region-handler, focus-precision-service, and focus-history-service respectively.
- **Why**: The previous recovery implementation directly called xdotool, bypassing existing subsystem abstractions. This violated architectural layering and created unmaintainable duplication. Recovery must re-verify state after every action using focus-verification-service.
- **Consequences**:
  - Recovery is now an orchestrator, not a driver
  - Each recovery action delegates to the appropriate existing service
  - Re-verification is mandatory after every recovery attempt
  - Telemetry accurately reflects verification status
  - Architectural boundaries are preserved

---

## ADM-049: Recovery Taxonomy Includes Precision And Safety Blocks

- **Date**: 2026-03-17
- **Status**: Accepted
- **Decision**: Recovery reason taxonomy must include PRECISION_GUARD_BLOCKED and SAFETY_GATE_BLOCKED in addition to the base mismatch reasons. These are abort-only reasons that should not trigger aggressive recovery.
- **Why**: The original taxonomy was incomplete. Precision and safety blocks indicate deeper system issues that recovery should not attempt to work around.
- **Consequences**:
  - RecoveryReason enum expanded with PRECISION_GUARD_BLOCKED and SAFETY_GATE_BLOCKED
  - Both map to ABORT policy
  - Recovery never bypasses precision/safety gates

---

## ADM-050: Focus Should Not Launch - Keep Focus vs Launch Separate

- **Date**: 2026-03-17
- **Status**: Accepted
- **Decision**: `focus <target>` should only succeed if the target already exists. It should NOT auto-launch applications. A separate `launch` or `open` verb should handle application startup.
- **Why**: In a deterministic VOS, `focus` means "move attention to an already-existing surface" - not "create a new surface and move attention to it." Blurring these semantics introduces ambiguity between focus, launch, restore, and recovery verbs.
- **Consequences**:
  - `focus console` fails if gnome-terminal is not already running
  - Pre-validator reports `targetExists: FAIL` when target not runtime-accessible
  - User-facing message: "Console is not currently open. Say 'launch console' to open it."
  - Future: Implement separate `launch console` / `open console` command path
  - This keeps VOS semantics deterministic and recovery semantics trustworthy

---

## ADM-051: [Historical] Maestro Denoise Default Moves To WebRTC APM (16 kHz-Native)

- **Date**: 2026-03-18
- **Status**: Superseded by ADM-052
- **Decision**: For Voice Plane modernization, Maestro's denoise default is now WebRTC Audio Processing (APM) noise suppression on a 16 kHz-native speech path. RNNoise is retained as a benchmark candidate, not the default production direction.
- **Why**: Maestro's current speech path and Silero VAD lane align naturally with 16 kHz operation. A 48 kHz-oriented denoise-first architecture introduces avoidable 16↔48↔16 resampling complexity and weakens hot-path determinism unless benchmark evidence proves a clear advantage.
- **Consequences**:
  - (Historical) At the time, Wave A / Patch 4 planning targeted WebRTC APM first
  - audio contracts should preserve a coherent 16 kHz end-to-end runtime path
  - if denoise internals need 10 ms subframes, they should stay behind the denoise boundary while preserving recorder/turn contract behavior
  - RNNoise remains available for controlled benchmark comparison, not default cutover

---

## ADM-052: Patch 4 Denoise Direction = ONNX Denoiser Integration (16 kHz-Native)

- **Date**: 2026-03-19
- **Status**: Accepted
- **Decision**: For Wave A Patch 4, Maestro’s primary denoise direction is ONNX denoiser integration on the existing 16 kHz speech path. DTLN-class ONNX is the primary candidate. WebRTC APM and RNNoise remain benchmark/alternate candidates only.
- **Why**:
  - ONNX Runtime path is already proven in Maestro through real Silero ONNX integration.
  - Silero VAD supports the 16 kHz path already used in Maestro.
  - Cross-platform runtime consistency favors reusing the same inference/runtime strategy where possible.
  - Patch 4 scope should remain denoise + interruption plumbing without forcing host migration.
- **Consequences**:
  - roadmap and migration docs must use ONNX-denoiser-first wording for Patch 4
  - WebRTC APM is no longer default production denoise direction
  - RNNoise remains benchmark-only unless evidence changes the default
  - Tauri migration remains a later, gated track and is not part of Patch 4

---

## Template for Future Decisions

```markdown
## ADM-XXX: <Decision Title>

- **Date**: YYYY-MM-DD
- **Status**: Proposed | Accepted | Superseded
- **Decision**: <What was decided>
- **Why**: <Rationale>
- **Consequences**: <Impact on project>
```

## Rebrand Decision Rule

During the rebrand program, record decisions here for topics like:

- whether a legacy name gets a compatibility shim
- whether a rename is intentionally breaking
- whether a subsystem is deferred
- whether a namespace stays inherited temporarily

---

## Categories

- **Architecture**: Major structural decisions
- **Dependencies**: Library and tool version choices
- **Build**: Build system configuration
- **Integration**: How components interact
- **Deprecated**: Decisions that are superseded
