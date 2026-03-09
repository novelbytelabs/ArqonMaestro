# Arqon Maestro Modernization Matrix

> **Purpose**: Track the current state, modernization sequence, and verification standard for each major subsystem in Arqon Maestro.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| 🟢 Working | Functional and acceptable for current use |
| 🟡 In Progress | Active modernization or recovery work |
| 🔴 Blocked | Cannot move safely without a dependency, decision, or upstream fix |
| ⚪ Planned | Not started, but intentionally queued |
| 🗄️ Legacy | Still present, but should be replaced, retired, or isolated |

---

## Program Summary

The original build recovery and full internal rebrand are complete.

The modernization program now moves forward in six waves:

- `Wave A`: Build Hygiene
- `Wave B`: Local Runtime Completeness
- `Wave C`: Packaging and Distribution
- `Wave D`: External Infrastructure Ownership
- `Wave E`: Historical and Provenance Audit
- `Wave F`: Data Plane Modernization

This ordering is deliberate:

1. clean the engineering baseline
2. make local runtime reliable
3. make packaging repeatable
4. resolve external ownership
5. clean historical/public legacy surfaces
6. extract hot paths into Rust only after the system is operationally stable

---

## Current State Snapshot

Wave B is now governed by two explicit control documents:

- [Frozen Requirements Registry](operations/frozen-requirements-registry.md)
- [Wave B Compatibility Matrix](operations/wave-b-compatibility-matrix.md)


| Area | Current State | Status | Notes |
|------|---------------|--------|-------|
| Java control plane | Modernized to Java 17 / Gradle 8.5 baseline | 🟢 Working | See ADM-001 and ADM-002 |
| Internal rebrand | Seven-phase rebrand complete | 🟢 Working | Hard-close packs published |
| Electron startup | Working | 🟢 Working | No longer stuck at `Loading...` |
| Linux microphone path | Working | 🟢 Working | Voice pipeline recovered |
| Cloud-backed runtime | Usable | 🟢 Working | Current best path for day-to-day use |
| Local multi-service runtime | Healthy local services with concurrent status checks | 🟢 Working | Wave B hard-closed; keep local e2e voice flow under regression |
| Build warning hygiene | Hard-closed | 🟢 Working | Wave A completed on 2026-03-08 |
| Packaging/distribution | Legacy | ⚪ Planned | AppImage/install/release flow still needs modernization |
| External ownership | Inherited | ⚪ Planned | Endpoint/CDN/image ownership remains inherited |
| Historical/provenance surfaces | Mixed | ⚪ Planned | Separate audit track now opened |
| Rust data plane extraction | Architectural direction only | ⚪ Planned | Voltron pattern defined, not executed |

---

## Subsystem Matrix

### Control Plane

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|---------------|--------|----------|--------|-------|
| Java baseline | Java 17 | Keep stable | High | 🟢 Working | ADM-001 |
| Gradle wrapper | 8.5 | Keep stable | High | 🟢 Working | ADM-002 |
| Dependency baseline | Modernized | Keep current | High | 🟢 Working | ADM-003, ADM-006 |
| Gradle deprecations | Cleared on active verification path | Keep clean | High | 🟢 Working | Wave A hard-closed |
| Build script style | Groovy DSL | Kotlin DSL optional migration | Low | ⚪ Planned | ADM-005 |

### Voice Runtime

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|---------------|--------|----------|--------|-------|
| Electron startup | Stable | Keep stable | High | 🟢 Working | Startup recovery complete |
| Microphone capture | Stable on Linux | Keep stable | High | 🟢 Working | Mic pipeline repaired |
| Chunking / endpointing | Stable | Harden | High | 🟢 Working | Keep under regression coverage |
| Cloud-backed listen flow | Working | Keep stable | High | 🟢 Working | Current reliable mode |
| Local multi-service voice flow | Operational with concurrent engine health checks | Full reliability | High | 🟢 Working | Wave B hard-closed; continue e2e command regression |

### Engines

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|---------------|--------|----------|--------|-------|
| Speech engine | Local startup and status endpoint healthy | Stabilize first | High | 🟢 Working | Verified on `:17202` in bundled local stack |
| Code engine | Local startup and status endpoint healthy | Stabilize first | High | 🟢 Working | Previous segfault path removed from `TokenIdConverter` |
| Marian-based path | Legacy | Reassess after Wave B | Medium | ⚪ Planned | Do not optimize before stabilization |
| Corpus generation | Preserved | Re-enable intentionally | Medium | ⚪ Planned | After runtime and packaging |

### Native / Tree-Sitter / Parsing

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|---------------|--------|----------|--------|-------|
| Tree-sitter binding | Vendored and re-namespaced | Keep stable | High | 🟢 Working | Phase 7 complete |
| JNI/native glue | Recovered | Keep stable | High | 🟢 Working | Needs regression coverage |
| Grammar generation | Working | Keep stable | Medium | 🟢 Working | ANTLR still active |
| Python build warnings | Cleared on active tree-sitter build path | Keep clean | Medium | 🟢 Working | Wave A hard-closed |

### Packaging / Distribution

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|---------------|--------|----------|--------|-------|
| Electron packaging | Legacy | Modernized | High | ⚪ Planned | Wave C |
| AppImage | Unclear / brittle | Verified or replaced | Medium | ⚪ Planned | Wave C |
| Release/update flow | Legacy assumptions | Verified distribution path | Medium | ⚪ Planned | Wave C |
| VS Code extension packaging | Legacy | Modernized and verified | Medium | ⚪ Planned | Wave C |

### Ownership / Public Surface

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|---------------|--------|----------|--------|-------|
| External endpoints/CDN | Inherited ownership | Arqon-owned or explicitly deferred | High | ⚪ Planned | Wave D |
| Historical/public legacy content | Mixed | Audited and classified | Medium | ⚪ Planned | Wave E |
| Provenance/legal materials | Mixed with active content | Explicitly separated | Medium | ⚪ Planned | Wave E |

### Data Plane Modernization

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|---------------|--------|----------|--------|-------|
| Audio hot path | Mostly inherited/native | Rust extraction | Medium | ⚪ Planned | Wave F |
| VAD hot path | Mostly inherited/native | Rust extraction | Medium | ⚪ Planned | Wave F |
| FFI boundary | Minimal / inherited | Explicit Rust bridge | Medium | ⚪ Planned | Wave F |
| Full rewrite pressure | Rejected | Incremental extraction only | High | 🟢 Working | ADM-010 |

---

## Wave Plan

### Wave A: Build Hygiene

**Goal**

Create a clean, boring engineering baseline with warning-free or intentionally-accounted-for builds.

**Scope**

- remove current Webpack warnings
- remove current Gradle deprecation warnings where practical
- remove Python deprecation warnings in the tree-sitter build path
- identify warnings that are acceptable temporary exceptions and record them explicitly

**Exit Criteria**

- `maestro/client` main build is warning-free or has documented temporary exceptions
- core Gradle verification path is warning-free or has documented temporary exceptions
- docs build is clean
- warning exceptions, if any, are captured in docs instead of rediscovered ad hoc

**Primary Risks**

- masking real dependency issues by silencing warnings blindly
- widening scope into dependency churn without a clear payoff

**Status**

- `completed`
- Evidence: [Wave A Evidence](operations/wave-a-evidence.md)
- Closeout: [Wave A Closeout](operations/wave-a-closeout.md)

**Test Requirements**

- unit tests: build-script and helper-script validation where applicable
- integration tests: Gradle verification path for `:java-tree-sitter`, `:core`, and `:corpusgen`
- end-to-end tests: Electron main build plus one working app startup path
- regression tests: rerun the known working microphone/listen flow after warning cleanup
- adversarial tests: intentionally missing optional native modules and stale env vars should fail clearly, not ambiguously

### Wave B: Local Runtime Completeness

**Goal**

Make local mode a first-class operational path instead of a partial recovery path.

**Scope**

- verify `core`, `speech-engine`, and `code-engine` startup together
- close known local startup and health-check gaps
- verify local UI state transitions end-to-end
- verify local voice path from mic capture through command execution

**Exit Criteria**

- local mode reaches healthy state without manual guesswork
- local UI leaves `Starting Server...` correctly
- local listen flow produces actual command execution
- local logs and health checks are documented and reliable
- every dependency used to close Wave B is accounted for in the compatibility matrix
- no frozen lane was mutated to make local mode work

**Primary Risks**

- environment-specific failures being mistaken for code regressions
- partial success in one service hiding another unhealthy service
- violating a frozen ecosystem lane through implicit dependency assumptions

**Current Baseline**

- local build tasks now pass the repo root explicitly into native packaging instead of drifting to `~/serenade`
- local Electron startup now fails explicitly when bundled services or model directories are absent instead of polling forever
- `client:installServer -x downloadModels` now fails fast with a concrete missing-dependency list on this machine
- Wave B is now constrained by the frozen registry and compatibility matrix instead of ambient environment assumptions
- `core` local runtime no longer crashes in `Parser.<clinit>()`; tree-sitter JNI library now exports `ai.arqon.maestro` symbols
- `speech-engine` and `code-engine` startup scripts now default model paths and fail clearly when model env vars are missing
- local `code-engine` no longer hits the previous sentencepiece/protobuf crash path in `TokenIdConverter`
- local `core`, `speech-engine`, and `code-engine` all return `status=ok` concurrently (`17200/17202/17203`)

**Test Requirements**

- unit tests: health-check and local state transition logic
- integration tests: local process startup, port checks, and service health probes
- end-to-end tests: full local listen command from app launch to applied action
- regression tests: compare local behavior against current cloud-backed working flow
- adversarial tests: kill one local service, corrupt one config, or block one port and confirm failure is explicit

**Current Evidence**

- [Wave B Evidence (Hard-Close)](operations/wave-b-evidence.md)

### Wave C: Packaging And Distribution

**Goal**

Make packaging, installers, and release artifacts reproducible and supportable.

**Scope**

- modernize Electron packaging assumptions
- validate AppImage or replace it with a clearer Linux distribution path
- verify update/release configuration
- verify VS Code extension packaging separately

**Exit Criteria**

- at least one supported desktop packaging path is repeatable end-to-end
- installer/update assumptions are documented and tested
- extension packaging/build path is verified

**Primary Risks**

- packaging code paths diverging from development startup paths
- release metadata still pointing at inherited infrastructure

**Test Requirements**

- unit tests: packaging helper scripts and config transforms where possible
- integration tests: build/package tasks in CI-like conditions
- end-to-end tests: install or unpack artifact and launch successfully
- regression tests: packaged app preserves working mic and stream behavior
- adversarial tests: missing assets, stale paths, and unsigned builds fail in understandable ways

### Wave D: External Infrastructure Ownership

**Goal**

Move inherited external ownership surfaces into Arqon-owned infrastructure where justified.

**Scope**

- endpoints
- CDN/model distribution
- release/image ownership
- upstream external references that are still active dependencies

**Canonical Plan**

- [External Infrastructure Ownership Plan](operations/external-infrastructure-ownership.md)

**Exit Criteria**

- ownership surfaces are inventoried and classified
- at least the first production-relevant external surface has a real Arqon replacement plan
- runtime changes only occur once replacement infrastructure actually exists

**Test Requirements**

- unit tests: config-selection logic for endpoint ownership cutovers
- integration tests: auth, download, and health-check flows against new infra
- end-to-end tests: live runtime against Arqon-owned surfaces
- regression tests: verify no silent fallback to dead inherited infra
- adversarial tests: endpoint outage, bad TLS, stale token, and partial cutover handling

### Wave E: Historical And Provenance Audit

**Goal**

Separate active product messaging from historical and provenance material.

**Scope**

- inherited READMEs
- website/blog/public docs retained in-tree
- public-facing historical surfaces that still carry inherited messaging

**Canonical Plan**

- [Historical And Provenance Audit Plan](operations/historical-provenance-audit.md)

**Exit Criteria**

- public surfaces are classified as preserve, annotate, rewrite, archive, or remove
- active product surfaces no longer rely on stale inherited messaging
- provenance material remains accurate where preserved

**Test Requirements**

- unit tests: not generally applicable; use lint and content validation instead
- integration tests: docs build, nav integrity, and internal-link integrity
- end-to-end tests: published docs/site navigation reflects the intended classification
- regression tests: retained provenance references remain accurate and intentional
- adversarial tests: ensure historical/legal content is not accidentally rewritten inaccurately

### Wave F: Data Plane Modernization

**Goal**

Start the Rust extraction path only after the system is operationally stable.

**Scope**

- audio hot path
- VAD hot path
- explicit FFI bridge
- incremental replacement of latency-critical components only

**Exit Criteria**

- first Rust hot-path component is isolated behind a stable interface
- Java control-plane behavior remains unchanged from the operator perspective
- measurable latency or maintainability gain is demonstrated

**Primary Risks**

- rewrite creep
- destabilizing a now-working voice path for architectural purity

**Test Requirements**

- unit tests: Rust module behavior and FFI contract boundaries
- integration tests: Java-to-native or Java-to-Rust bridge correctness
- end-to-end tests: real mic-to-command flow still works unchanged
- regression tests: transcript and command behavior match pre-extraction baseline
- adversarial tests: malformed buffers, partial chunks, and timing/pathological input conditions

---

## Testing Policy Across All Waves

Every modernization wave must explicitly define and run the relevant subset of these test classes:

1. `Unit Tests`
- validate isolated code behavior
- parser, helpers, config selection, wrappers, adapters, and transformation logic

2. `Integration Tests`
- validate subsystem boundaries
- client ↔ stream, core ↔ tree-sitter, local service startup, packaging tasks, docs publishing

3. `End-to-End Tests`
- validate real operator workflows
- app start, listen, interpret, execute, and observe result

4. `Regression Tests`
- validate that previously recovered critical paths stay working
- startup, microphone capture, stream connection, command execution, docs build, packaging build

5. `Adversarial Tests`
- validate failure behavior under bad or surprising conditions
- missing dependencies, dead services, stale config, bad paths, malformed input, partial infra cutover

No wave is complete unless its relevant test evidence is recorded.

---

## Recommended Next Wave

The next wave should be `Wave B: Local Runtime Completeness`.

Why:

- the build baseline is now clean enough to interpret runtime failures directly
- local mode is still the largest operational gap in the current stack
- packaging and distribution should not advance until local runtime health is explicit and repeatable

## Last Updated

- **Date**: 2026-03-08
- **Updated by**: Codex
- **Next Review**: At the end of `Wave B`
