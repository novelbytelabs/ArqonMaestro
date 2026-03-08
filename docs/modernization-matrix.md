# Arqon Maestro Modernization Matrix

> **Purpose**: Track the state and future of each module/component in the project.

---

## Overview

| Status | Meaning |
|--------|---------|
| 🟢 Working | Currently functional, no changes needed |
| 🟡 In Progress | Being modernized or refactored |
| 🔴 Blocked | Waiting on dependencies or decisions |
| ⚪ Not Started | Future work |
| 🗄️ Deprecated | Will be replaced/removed |

---

## Core Modules

### Java Control Plane

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|--------------|--------|----------|--------|-------|
| **Java Version** | Java 14 (legacy) | Java 17 | High | 🟢 Working | ADM-001 |
| **Build System** | Gradle 7.4.2 | Gradle 8.5 | High | 🟢 Working | ADM-002 |
| **Jetty Server** | 9.4.38 | 9.4.53 | Medium | 🟢 Working | |
| **Dagger DI** | 2.41 | 2.51.1 | Medium | 🟢 Working | |
| **JUnit Testing** | 5.8.2 | 5.10.2 | Medium | 🟢 Working | |
| **Kotlin DSL** | Groovy | Kotlin | Low | ⚪ Not Started | ADM-005 |

---

### Speech Engine (Kaldi)

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|--------------|--------|----------|--------|-------|
| **Kaldi** | Legacy build | Keep | High | 🟡 In Progress | Need Marian first |
| **Acoustic Model** | Working | Keep | High | 🟢 Working | 122MB model |
| **Language Model** | Working | Keep | High | 🟢 Working | 96MB |
| **G2P Model** | Working | Keep | Medium | 🟢 Working | 45MB |
| **Rust Port** | N/A | Port | Medium | ⚪ Not Started | FFI bridge needed |
| **Whisper Option** | N/A | Evaluate | Low | ⚪ Not Started | Alternative to Kaldi |

---

### Code Engine (Marian NMT)

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|--------------|--------|----------|--------|-------|
| **Marian NMT** | Not built | Build | High | 🔴 Blocked | Needs Boost 1.78 |
| **Auto-Style Models** | Downloaded | Keep | High | 🟢 Working | 163MB |
| **Contextual LM** | Downloaded | Keep | High | 🟢 Working | 162MB |
| **Rust Port** | N/A | Port | Medium | ⚪ Not Started | FFI bridge needed |
| **Training Pipeline** | Python 2/3 mix | Modernize | Low | ⚪ Not Started | TRAINING.md |

---

### CorpusGen

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|--------------|--------|----------|--------|-------|
| **Python Scripts** | Legacy | Keep | Medium | ⚪ Not Started | Generates training data |
| **Data Generation** | N/A | Enable | Medium | ⚪ Not Started | 50GB corpus needed |
| **Model Training** | N/A | Enable | Low | ⚪ Not Started | GPU recommended |

---

### Native Hot Path

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|--------------|--------|----------|--------|-------|
| **Audio Capture** | C++ | Rust | High | ⚪ Not Started | ADM-008 |
| **VAD** | C++ | Rust | High | ⚪ Not Started | ADM-008 |
| **Chunking/Buffer** | Java | Keep | High | ⚪ Not Started | |
| **FFI Layer** | N/A | Create | High | ⚪ Not Started | JNI for Rust |

---

### Packaging & Distribution

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|--------------|--------|----------|--------|-------|
| **Electron Client** | Legacy | Modernize | Medium | ⚪ Not Started | Update to latest |
| **VS Code Plugin** | Legacy | Modernize | Medium | ⚪ Not Started | API changed |
| **AppImage** | Broken | Fix | Medium | ⚪ Not Started | Linux only |
| **Native Installer** | N/A | Create | Low | ⚪ Not Started | .deb, .rpm |

---

### Toolchain

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|--------------|--------|----------|--------|-------|
| **Protobuf** | 3.14.0 | 3.25.2 | High | 🟢 Working | ADM-006 |
| **ANTLR** | 4.7.2 | Keep | Medium | 🟢 Working | |
| **Rust** | N/A | 1.82+ | High | ⚪ Not Started | For data plane |
| **Node.js** | 16+ | Keep | Medium | ⚪ Not Started | For Electron |

---

## Integration Points

### ArqonPilot Integration

| Aspect | Current State | Target | Priority | Status | Notes |
|--------|--------------|--------|----------|--------|-------|
| **Bus Protocol** | Legacy voice protocol | Extend | High | ⚪ Not Started | Voice events |
| **WebSocket** | N/A | Create | High | ⚪ Not Started | Voice endpoint |
| **Command Router** | N/A | Create | High | ⚪ Not Started | Voice → CLI |
| **Context Resolver** | N/A | Create | High | ⚪ Not Started | App state |

---

## Priority Order

### Phase 1: Build Fix (Completed)
1. ✅ Java 17 migration
2. ✅ Gradle 8.5 wrapper
3. ✅ Dependency updates

### Phase 2: Runtime Verification (Next)
1. ⏳ `gradle installd`
2. ⏳ Core engine startup
3. ⏳ Electron client
4. ⏳ Microphone test
5. ⏳ Speech-to-text test

### Phase 3: Integration
1. Voice WebSocket endpoint
2. Command router
3. Context resolver
4. Bus protocol extension

### Phase 4: Modernization
1. Extract audio/VAD to Rust
2. Create FFI layer
3. Update Electron
4. Fix packaging

---

## Owner Assignments

| Module | Owner | Notes |
|--------|-------|-------|
| Java Control Plane | @team | Current focus |
| Speech Engine | @team | Blocked by Marian |
| Code Engine | @team | Blocked by Boost |
| Rust Data Plane | @team | Future work |
| Integration | @team | Phase 3 |

---

## Last Updated

- **Date**: 2026-03-07
- **Updated by**: Code session
- **Next Review**: After Phase 2 completion
