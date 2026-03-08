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
- **Status**: Accepted
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
