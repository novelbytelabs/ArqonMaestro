# Arqon Maestro POC Testing Plan

This document defines the testing strategy for the **current Arqon Maestro POC** - what's actually built and can be tested today.

---

## 1. Current System Overview

### Architecture (from ARCHITECTURE.md)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│    Core     │────▶│   Speech    │
│  (Electron) │     │   (Java)    │     │   Engine    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │   WebSocket       │                   │
       │   (Protobuf)      │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Plugin    │     │    Code     │     │   Kaldi     │
│  (VS Code)  │     │   Engine    │     │   Models    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Running the POC (from RUN_COMMANDS.md)

| Component | Port | Status |
|-----------|------|--------|
| Core Server | 17200 | ✅ Running |
| Speech Engine | 17202 | ✅ Running |
| Code Engine | 17203 | ✅ Running |
| Electron Client | GUI | ✅ Running |
| VS Code Extension | 17200 | 🔄 In Progress |

---

## 2. Existing Test Assets

### Test Files Already in Codebase

| Location | Tests |
|----------|-------|
| `maestro/client/src/test/audio/` | 25+ unit/integration tests |
| `maestro/client/test-*.ts` | 15+ smoke tests |
| `maestro/client/benchmark-*.ts` | Performance benchmarks |

### Existing Test Categories

1. **Audio Tests**
    - VAD (Voice Activity Detection)
    - Diarization
    - Speaker Verification
    - STT Providers (Whisper, Faster Whisper)
    - TTS Broker
    - Turn Events

2. **Smoke Tests**
    - test-focus-chrome.ts
    - test-focus-recovery-smoke.ts
    - test-intent-routing-smoke.ts
    - test-kokoro-smoke.ts
    - test-integrity-smoke.ts
    - test-control-plane-smoke.ts

3. **Benchmarks**
    - benchmark-tts-stt.ts
    - benchmark-tts-stt.js

---

## 3. Test Strategy by Component

### 3.1 Audio Pipeline

**Components to Test:**

- Microphone capture
- VAD (Silero)
- Diarization (PyAnnote)
- Speaker Verification (Wespeaker)
- STT Providers (Whisper, Faster Whisper)

**Test Commands:**
```bash
# Run audio unit tests
cd maestro/client
npm test -- --testPathPattern="audio"

# Run VAD tests
npm test -- --testPathPattern="vad"

# Run speaker verification tests
npm test -- --testPathPattern="speaker-verification"

# Run STT provider tests
npm test -- --testPathPattern="whisper"
```

**Manual Test Procedures:**

| Test | Steps | Expected |
|------|-------|----------|
| Microphone Capture | 1. Press Alt+Space 2. Speak "hello" 3. Release | Audio waveform appears |
| VAD Detection | 1. Speak continuously 2. Stop 3. Wait 1s | VAD shows active→inactive |
| STT Fast Path | 1. Press Alt+Space 2. Say "focus terminal" 3. Release | Transcript appears in < 2s |
| Dictation Path | 1. Enter dictation mode 2. Speak paragraph 3. Exit | Accurate transcript |

### 3.2 Command Routing

**Components to Test:**

- Intent Routing
- Command Parser
- Context Resolver
- Command Router

**Manual Test Procedures:**

| Test | Steps | Expected |
|------|-------|----------|
| Basic Command | Say "focus terminal" | Terminal focuses |
| Complex Command | Say "create branch feature auth" | Branch created |
| Ambiguous Command | Say "open file" | Chooser appears |
| Failed Command | Say invalid command | Error message |

**Existing Tests:**

- `test-intent-routing-smoke.ts` - validates routing logic

### 3.3 Focus System

**Components to Test:**

- Focus Context
- Surface Detection
- Modal Awareness
- Recovery

**Manual Test Procedures:**

| Test | Steps | Expected |
|------|-------|----------|
| Focus Retention | 1. Focus terminal 2. Focus editor 3. Say "go back" | Returns to terminal |
| Surface Expansion | Say "open that" | Resolves to last opened file |
| Mode Switch | Say "enter dictation" | Mode changes, STT lane changes |
| Recovery | 1. Give ambiguous command 2. Select option | Correct execution |

**Existing Tests:**
- `test-focus-chrome.ts`
- `test-focus-recovery-smoke.ts`
- `focus-precision-service.spec.ts`

### 3.4 Output/TTS

**Components to Test:**

- TTS Broker (Kokoro primary, Piper fallback)
- Persona routing
- Interruption handling

**Manual Test Procedures:**

| Test | Steps | Expected |
|------|-------|----------|
| TTS Output | Wait for voice response | Audio plays |
| Persona Switch | Trigger different response types | Different voices |
| Interruption | 1. Start speaking 2. Press Alt+Space | Current audio stops |

**Existing Tests:**

- `test-kokoro-smoke.ts`
- `test-kokoro-stream-smoke.ts`

### 3.5 Identity & Security

**Components to Test:**

- Speaker Diarization
- Speaker Verification
- Identity Gating

**Manual Test Procedures:**

| Test | Steps | Expected |
|------|-------|----------|
| Enrollment | 1. Enroll voice 2. Speak | Profile created |
| Verification (Match) | Enrolled user speaks | Verified = true |
| Verification (No Match) | Unknown user speaks | Verified = false |
| Multi-speaker | 2 users speak | Correct diarization |

**Existing Tests:**
- `speaker-verification-wespeaker.unit.spec.ts`
- `pyannote-diarization-provider.unit.spec.ts`

---

## 4. Test Execution Guide

### 4.1 Prerequisites

```bash
# Install dependencies
cd maestro
npm install

# Build the server
./gradlew :core:installDist -x downloadModels

# Build client
cd client
npm run build
```

### 4.2 Running Tests

```bash
# All tests
npm test

# Audio tests only
npm test -- --testPathPattern="audio"

# Smoke tests
npm test -- --testPathPattern="smoke"

# Benchmarks
npm run benchmark
```

### 4.3 Manual Testing Checklist

#### Pre-Flight Checklist
- [ ] Core server running on port 17200
- [ ] Speech engine running on port 17202
- [ ] Code engine running on port 17203
- [ ] Microphone accessible
- [ ] Audio output working

#### Voice Command Tests
- [ ] "focus terminal" - Terminal focuses
- [ ] "focus browser" - Browser focuses  
- [ ] "open file" - File picker opens
- [ ] "go back" - Previous context restored
- [ ] "enter dictation" - Mode changes
- [ ] "stop" - Current action cancels

#### Error Handling Tests
- [ ] Unknown command - Error message
- [ ] Ambiguous command - Chooser appears
- [ ] Recognition failure - Retry prompt
- [ ] Network failure - Graceful degradation

---

## 5. Known Issues (from CURRENT_ISSUES.md)

Review [`CURRENT_ISSUES.md`](../../CURRENT_ISSUES.md) for known bugs before testing.

### Common Issues to Test Against

1. **Audio Issues**
    - Microphone not detected
    - VAD too sensitive/insensitive
    - STT timeout

2. **Routing Issues**
    - Wrong command interpretation
    - Context not retained
    - Surface binding failures

3. **UI Issues**
    - Chooser not appearing
    - Mode indicator incorrect
    - TTS not playing

---

## 6. Test Reporting

### What to Document

For each test, record:

1. Test ID and description
2. Steps taken
3. Expected vs Actual result
4. Environment (OS, Node version, etc.)
5. Screenshots/logs if applicable

### Report Template

```markdown
## Test Report: [Feature Name]

### Test Case: [ID]

- **Date:** YYYY-MM-DD
- **Tester:** [Name]
- **Environment:** [OS, Node, etc.]

**Steps:**
1. [Step 1]
2. [Step 2]

**Expected:** [Result]
**Actual:** [Result]
**Status:** PASS / FAIL

**Notes:** [Any observations]
```

---

## 7. Test Priority Matrix

### P0 - Must Pass (Basic Functionality)

| Feature | Test Type | Priority |
|---------|-----------|----------|
| Audio Capture | Manual | P0 |
| STT Recognition | Manual | P0 |
| Command Execution | Manual | P0 |
| Focus Terminal | Manual | P0 |
| TTS Output | Manual | P0 |

### P1 - Should Pass (Core Features)

| Feature | Test Type | Priority |
|---------|-----------|----------|
| Speaker Verification | Auto | P1 |
| Intent Routing | Auto | P1 |
| Mode Switching | Manual | P1 |
| Recovery Behavior | Manual | P1 |

### P2 - Nice to Have (Polish)

| Feature | Test Type | Priority |
|---------|-----------|----------|
| Benchmark Performance | Auto | P2 |
| Degraded Mode | Manual | P2 |
| Preference Learning | Manual | P2 |

---

## 8. Related Documentation

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture
- [RUN_COMMANDS.md](../../RUN_COMMANDS.md) - How to run the POC
- [CURRENT_ISSUES.md](../../CURRENT_ISSUES.md) - Known issues
- [Maestro Test Inventory](maestro-test-inventory.md) - Feature capability mapping
- [Maestro Comprehensive Test Strategy](maestro-comprehensive-test-strategy.md) - Future test planning

---

*This testing plan is specific to the current Arqon Maestro POC implementation. For planned features, see the comprehensive test strategy document.*
low 