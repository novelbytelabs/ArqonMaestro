# ArqonMaestro Vision

**Voice-Native Layer for Arqon**

---

## The Opportunity

We did not just acquire an old voice app. We acquired a **working local voice-native application framework**.

This system has already solved the hard problems:

| Problem | Serenade's Solution |
|---------|---------------------|
| Speech vs dictation mode | Voice Activity Detection + command grammar |
| Local/offline operation | Kaldi + Marian models (no cloud) |
| Domain-specific speech | Trainable vocabulary + G2P |
| Command parsing | ANTLR grammar + transcript parser |
| Context-aware interpretation | AST-aware + contextual LM |
| Application integration | Plugin protocol (WebSocket) |
| Trainable small models | CorpusGen + Marian pipeline |

**We are not starting from zero. We are starting from a platform.**

---

## The Real Opportunity

Build software where **voice is a first-class interface**, not an afterthought.

### What Most AI Apps Do Today

- ❌ Chat box pasted into a GUI
- ❌ Generic STT pasted onto an app
- ❌ Cloud-dependent
- ❌ Not tuned to application state

### What ArqonMaestro Enables

- ✅ Local, embedded, offline-capable
- ✅ Context-aware (knows app state)
- ✅ Domain-tuned (knows app vocabulary)
- ✅ Low-latency (<300ms end-to-end)
- ✅ Voice-native (built-in, not bolted-on)

---

## Why This Matters

In complex software, generic voice integration fails because the system doesn't know:

| What Generic Voice Doesn't Know | What ArqonMaestro Knows |
|--------------------------------|------------------------|
| What screen the user is on | Current view/context |
| What object is selected | Selection state |
| What actions are legal | Available commands |
| Whether user is dictating or commanding | Speech mode detection |
| What the local domain vocabulary is | Custom lexicon |

**Serenade's architecture was built to care about exactly this.**

---

## The Product Thesis

**Every serious software application should have its own embedded, domain-tuned, local voice interface.**

Not a generic assistant.
Not a cloud dependency.
Not a chat popup.

**A real interface layer.**

---

## ArqonMaestro for ArqonPilot

### Current ArqonPilot Capabilities

ArqonPilot is a Rust-based CI/CD control plane with:

- Branch management (`pilot branch`)
- Code healing (`pilot heal`)
- Knowledge graph (`pilot oracle`)
- Governance (`pilot govern`)
- Multi-repo operations (`pilot multi`)
- Web UI (`pilot serve`)

### Voice-Native Integration Points

| ArqonPilot Command | Voice Command Example |
|--------------------|----------------------|
| `pilot branch create feature-x` | "create branch feature x" |
| `pilot heal --file src/main.rs` | "heal main dot r s" |
| `pilot oracle query "auth logic"` | "query oracle for auth logic" |
| `pilot govern check` | "run governance check" |
| `pilot multi status` | "show multi repo status" |
| `pilot serve` | "start web server" |

### Context-Aware Commands

```
User: "heal this file"
System: Knows current file from editor context
       → Executes: pilot heal --file <current-file>

User: "check the branch"
System: Knows current branch from git context
       → Executes: pilot branch check

User: "what does oracle know about this?"
System: Knows selection/context
       → Executes: pilot oracle query "<selection>"
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ArqonMaestro Layer                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Speech     │    │   Command    │    │   Context    │       │
│  │   Engine     │───▶│   Parser     │───▶│   Resolver   │       │
│  │  (Kaldi)     │    │  (ANTLR)     │    │  (Arqon)     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Acoustic   │    │  Transcript  │    │   Arqon      │       │
│  │   Models     │    │   → Code     │    │   Commands   │       │
│  │  (Local)     │    │  (Marian)    │    │  (Rust)      │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ArqonPilot Core                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Branch  │ │   Heal   │ │  Oracle  │ │ Govern   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Multi   │ │  Create  │ │  Navigate│ │  Secure  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components to Extract

### 1. Speech Engine (Keep)

- **Kaldi acoustic model** - Audio → phonemes
- **Language model** - Domain vocabulary
- **G2P** - Unknown word pronunciation
- **Re-ranker** - Context-aware scoring

**Action**: Wrap as Rust crate or FFI bridge

### 2. Command Parser (Adapt)

- **ANTLR grammar** - Command structure
- **Transcript parser** - Voice → command tree

**Action**: Create Arqon-specific grammar

### 3. Context System (Build)

- **State resolver** - Map app state to context
- **Command router** - Route to Arqon commands
- **Feedback loop** - Speak results back

**Action**: Build new, Arqon-specific

### 4. Plugin Protocol (Adapt)

- **WebSocket protocol** - Client communication
- **State sync** - App state → voice layer

**Action**: Integrate with ArqonPilot's existing bus

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

- [ ] Extract speech engine as standalone service
- [ ] Create Rust FFI bindings for Kaldi/Marian
- [ ] Define Arqon command grammar
- [ ] Build basic context resolver

### Phase 2: Integration (Weeks 5-8)

- [ ] Integrate with ArqonPilot bus system
- [ ] Add voice commands for core operations
- [ ] Build context sync from Arqon state
- [ ] Create audio feedback (TTS)

### Phase 3: Polish (Weeks 9-12)

- [ ] Train Arqon-specific vocabulary
- [ ] Optimize latency
- [ ] Add dictation mode for code
- [ ] Build voice UI overlay

### Phase 4: Advanced (Weeks 13-16)

- [ ] Fine-tune models on Arqon usage
- [ ] Add multi-modal (voice + keyboard)
- [ ] Build voice macros/workflows
- [ ] Create training pipeline for users

---

## Technical Decisions

### Speech Engine: Keep or Replace?

| Option | Pros | Cons |
|--------|------|------|
| **Keep Kaldi** | Works, offline, trainable | Complex, older tech |
| **Replace with Whisper** | Modern, accurate | Larger, slower, less tunable |
| **Hybrid** | Best of both | More work |

**Recommendation**: Start with Kaldi, evaluate Whisper later

### Integration Approach

| Option | Pros | Cons |
|--------|------|------|
| **Separate service** | Clean separation | Latency, complexity |
| **Embedded library** | Low latency | FFI complexity |
| **Sidecar process** | Balance | IPC overhead |

**Recommendation**: Sidecar process with Unix socket

### Command Grammar

```antlr
// Arqon command grammar (draft)
command
    : branchCommand
    | healCommand
    | oracleCommand
    | governCommand
    | multiCommand
    | navigateCommand
    ;

branchCommand
    : 'create' 'branch' name=identifier
    | 'switch' 'to' 'branch' name=identifier
    | 'merge' 'branch' name=identifier
    | 'check' 'branch'
    ;

healCommand
    : 'heal' 'file' path=filePath
    | 'heal' 'this'
    | 'heal' 'selection'
    ;

oracleCommand
    : 'query' 'oracle' 'for' query=text
    | 'what' 'does' 'oracle' 'know' 'about' query=text
    ;

governCommand
    : 'run' 'governance' 'check'
    | 'approve' 'change'
    | 'reject' 'change'
    ;
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| End-to-end latency | < 300ms |
| Command accuracy (Recall@5) | > 95% |
| Offline capability | 100% |
| Vocabulary coverage | 100% of Arqon commands |
| Context accuracy | > 90% |

---

## The Bigger Picture

This is not about preserving Serenade.

This is about **building a voice-native control surface for serious local software.**

ArqonPilot manages complex CI/CD workflows. Adding voice-native control means:

- **Faster workflows** - Speak commands instead of typing
- **Accessibility** - Enable developers with RSI/disabilities
- **Hands-free operation** - Code while debugging, presenting
- **Context awareness** - System knows what you mean
- **Offline capability** - No cloud dependency

**This is the leap.**

---

## Next Steps

1. **Analyze Serenade's plugin protocol** - How does it communicate?
2. **Map ArqonPilot commands** - What can be voiced?
3. **Design context schema** - What state matters?
4. **Prototype integration** - Get one command working
5. **Iterate** - Expand coverage

---

## References

- [`README.md`](README.md) - Project setup
- [`TRAINING.md`](TRAINING.md) - Model training guide
- `serenade/docs/` - Original Serenade documentation
- `serenade/docs/request-lifecycle.md` - How commands flow
- `serenade/docs/codebase-layout.md` - Architecture details
