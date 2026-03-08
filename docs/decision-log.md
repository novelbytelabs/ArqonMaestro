# ArqonMaestro Decision Log

> **Purpose**: Track architectural and technical decisions to preserve context across sessions.

---

## ADM-001: Java Baseline = 17

- **Date**: 2026-03-07
- **Status**: Accepted
- **Decision**: ArqonMaestro will target Java 17 as its control-plane baseline.
- **Why**: Serenade's original Java 14 stack is historical, not strategic. Java 17 is a modern LTS target and matches the broader Arqon modernization direction.
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
- **Decision**: Update all Serenade dependencies to modern, compatible versions.
- **Why**: Original versions (2019-2021) had compatibility issues with Java 17 and modern toolchains.
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
- **Decision**: ArqonMaestro follows "Java conducts, Rust performs" architecture
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
- **Why**: Complete rewrite would lose the working Serenade functionality. Incremental migration is safer.
- **Consequences**:
  - Keep existing Java code working
  - Extract hot paths to Rust incrementally
  - Maintain backward compatibility during transition

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

---

## Categories

- **Architecture**: Major structural decisions
- **Dependencies**: Library and tool version choices
- **Build**: Build system configuration
- **Integration**: How components interact
- **Deprecated**: Decisions that are superseded
