# Maestro VOS Comprehensive Test Strategy

This document defines the testing approach for Maestro, derived from the [Master Plan](maestro-master-plan.md) and [Test Inventory](maestro-test-inventory.md).

---

## 1. Test Philosophy

### Core Principles

1. **Test against canonical specs** - Every test must trace to a governing spec document
2. **Test bounded behavior** - Each accepted slice has explicit boundaries
3. **Test deterministically** - Maestro does not guess; tests verify this
4. **Test reversibility** - Preferences and personalization must be inspectable/resetable
5. **Test failure paths** - Degraded mode, recovery, and reconnection are first-class

### What NOT to Test (Yet)

Per Section 7 of the Master Plan, these gaps exist:
- Live platform wiring (Platform signals not yet live)
- Active surface/focus binding fidelity
- Capability registry population from real adapters
- Wave D beyond D1

---

## 2. Test Organization

### By Program (Execution Priority)

| Program | Focus | Priority |
|---------|-------|----------|
| Program A | Platform Bridge & Live Signal Wiring | 🔴 HIGH |
| Program B | Production Hardening | 🟡 MEDIUM |
| Program C | Operational Benchmarking | 🟡 MEDIUM |
| Program D | Persistence & Governance | 🟢 LOWER |
| Program E | Advanced Interaction | 🟢 LOWER |

---

## 3. Program A Testing (Current Focus)

### 3.1 Live Modal Signal Ingestion

**Objective:** Verify modal signals are correctly ingested from host/platform

**Governing Specs:**

- [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
- [`focus/maestro-modal-awareness-v0.1.md`](./focus/maestro-modal-awareness-v0.1.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|-----------------|
| A-MOD-001 | Switch to dictation mode via voice | Mode transition confirmed, STT lane changes |
| A-MOD-002 | Switch to command mode | Hot-path routing enabled |
| A-MOD-003 | Nested mode transitions | State machine handles compound states |
| A-MOD-004 | Mode persists across commands | No unexpected mode reset |

### 3.2 Live Surface/Focus Signal Ingestion

**Objective:** Verify surface and focus context from host is correctly captured

**Governing Specs:**

- [`maestro-surface-model.md`](./maestro-surface-model.md)
- [`focus/maestro-surface-expansion-v0.1.md`](./focus/maestro-surface-expansion-v0.1.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| A-SUR-001 | Active surface detection | Correct surface identified |
| A-SUR-002 | Surface context switch | Focus moves with surface |
| A-SUR-003 | Cross-surface reference | "that terminal" resolves correctly |
| A-SUR-004 | Surface binding | Commands route to correct surface |

### 3.3 Referential Anchor Population

**Objective:** Verify referential anchors are populated from live host state

**Governing Specs:**

- [`maestro-reference-system.md`](./maestro-reference-system.md)
- [`focus/maestro-referential-intent-v0.1.md`](./focus/maestro-referential-intent-v0.1.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| A-REF-001 | "open that" resolution | Correct object resolved from context |
| A-REF-002 | "go back" in browser | Previous page restored |
| A-REF-003 | Temporal reference | "the file I just edited" resolves |
| A-REF-004 | Failed reference | Safe abort, no guess |

### 3.4 Capability Registry Wiring

**Objective:** Verify capability registry reflects real adapter capabilities

**Governing Specs:**

- [`maestro-capability-registry-adapter-contract.md`](./maestro-capability-registry-adapter-contract.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| A-CAP-001 | Registry populated | All available adapters registered |
| A-CAP-002 | Capability query | Correct capabilities returned |
| A-CAP-003 | Routing by capability | Commands route to capable adapter |
| A-CAP-004 | Dynamic registration | New adapters appear in registry |

---

## 4. Program B Testing (Production Hardening)

### 4.1 Failure & Contention Handling

**Governing Specs:**

- [`maestro-hot-path-runtime-contract.md`](./maestro-hot-path-runtime-contract.md)
- [`maestro-executor-architecture.md`](./maestro-executor-architecture.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| B-FAIL-001 | STT provider timeout | Graceful degradation, fallback |
| B-FAIL-002 | Executor crash | Error recovery, user notification |
| B-FAIL-003 | Concurrent commands | Proper serialization |
| B-FAIL-004 | Network failure | Offline behavior correct |

### 4.2 Recovery Behavior

**Governing Specs:**

- [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md)
- [`focus/maestro-focus-recovery-v0.1.md`](./focus/maestro-focus-recovery-v0.1.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| B-REC-001 | Misrecognition recovery | Clear error, retry prompt |
| B-REC-002 | Ambiguous command | Chooser displayed, no guess |
| B-REC-003 | Object binding failure | Informative error |
| B-REC-004 | Recovery from interrupted command | Clean state |

### 4.3 Phonetic Survivability

**Governing Specs:**

- [`maestro-phonetic-robustness.md`](./maestro-phonetic-robustness.md)
- [`maestro-phonetic-hazard-audit.md`](./maestro-phonetic-hazard-audit.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| B-PHON-001 | Homophone commands | Correct routing despite similarity |
| B-PHON-002 | Noisy environment | Robust recognition |
| B-PHON-003 | Accent variation | Acceptable recognition rate |
| B-PHON-004 | Command drift | Safety boundaries maintained |

---

## 5. Program C Testing (Benchmarking)

### 5.1 Performance Benchmarks

**Governing Specs:**

- [`maestro-stt-strategy-by-lane.md`](./maestro-stt-strategy-by-lane.md)

**Metrics to Capture:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Hot-path latency | < 200ms | Time from speech end to command dispatch |
| Command-fast STT | < 500ms | End-to-end command recognition |
| Dictation-accurate STT | < 2000ms | Higher accuracy path |
| TTS latency | < 300ms | Voice output start |

### 5.2 Reliability Benchmarks

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| C-REL-001 | Route success rate | > 95% for known commands |
| C-REL-002 | Ambiguity rate | < 5% safe aborts |
| C-REL-003 | Recovery success | > 90% from failure states |
| C-REL-004 | Degraded mode | Graceful operation under stress |

---

## 6. Program D Testing (Persistence & Governance)

### 6.1 Identity & Enrollment

**Governing Specs:**

- [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
- [`maestro-authorization-service.md`](./maestro-authorization-service.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| D-IDE-001 | Speaker enrollment | Profile created, persisted |
| D-IDE-002 | Speaker verification | Correct acceptance/rejection |
| D-IDE-003 | Enrollment persistence | Survives restart |
| D-IDE-004 | Multi-speaker handling | Correct diarization |

### 6.2 Audit & Replay

**Governing Specs:**

- [`maestro-workflow-contract-service.md`](./maestro-workflow-contract-service.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| D-AUD-001 | Decision logging | All decisions traceable |
| D-AUD-002 | Replay capability | Exact reconstruction possible |
| D-AUD-003 | Audit retention | Configurable retention policy |

---

## 7. Program E Testing (Advanced Interaction)

### 7.1 Disambiguation

**Governing Specs:**

- [`maestro-ambiguity-policy.md`](./maestro-ambiguity-policy.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| E-DIS-001 | Chooser display | Correct candidates shown |
| E-DIS-002 | Selection handling | Correct routing after choice |
| E-DIS-003 | Preference override | Learned preference respected |
| E-DIS-004 | Safe abort | No guess when uncertain |

### 7.2 Preference Learning

**Governing Specs:**

- [`maestro-preference-model.md`](./maestro-preference-model.md)

**Test Cases:**

| ID | Test | Expected Result |
|----|------|----------------|
| E-PREF-001 | Preference creation | Via explicit command |
| E-PREF-002 | Chooser learning | After repeated selection |
| E-PREF-003 | Preference application | Biases interpretation correctly |
| E-PREF-004 | Preference inspection | User can view learned prefs |
| E-PREF-005 | Preference reset | Full reversibility |
| E-PREF-006 | Scope handling | Narrow > broad override |

---

## 8. Test Infrastructure Requirements

### 8.1 Corpus & Test Data

Required for benchmarking:

- Command corpus (known valid commands)
- Phonetic hazard corpus (similar-sounding commands)
- Ambiguity corpus (multi-interpretation commands)
- Recovery scenario corpus (failure injection)

### 8.2 Test Environments

| Environment | Purpose |
|-------------|---------|
| Development | Local testing |
| Staging | Integration testing |
| Production-like | Hardening validation |

### 8.3 Automation Requirements

- Regression test suite (CI/CD integration)
- Corpus runners (batch evaluation)
- Benchmark reporters (trend analysis)
- Chaos injection (failure testing)

---

## 9. Test Governance

### 9.1 Acceptance Criteria

Each test must specify:

1. **Governing spec** - Which spec this test validates
2. **Pass criteria** - Explicit pass/fail thresholds
3. **Evidence required** - What proof is collected
4. **Bounded scope** - What's in/out of scope

### 9.2 Regression Rules

Per Section 12 of the Master Plan:
- Benchmarks must support routing, policy, governance decisions
- Lane-relative evidence preferred over aggregate numbers
- Benchmarking is a standing discipline, not one-time

### 9.3 Test Artifacts Required

| Artifact | Purpose |
|----------|---------|
| Test plans | Per-subsystem test design |
| Test cases | Executable test definitions |
| Corpus data | Test command/scenario libraries |
| Benchmark reports | Standing evidence reports |
| Gap analysis | What cannot yet be tested |

---

## 10. Immediate Next Steps (Program A Focus)

1. **Set up test environment** - Local development with logging
2. **Create modal signal test harness** - Inject mock platform signals
3. **Build surface context fixtures** - Known surface states
4. **Establish capability registry test data** - Mock adapter capabilities
5. **Define pass/fail criteria** - Per governing spec requirements

---

## Related Documents

- [Maestro Master Plan](maestro-master-plan.md) - Strategic control
- [Maestro Test Inventory](maestro-test-inventory.md) - Feature capability mapping
- [Maestro Preference Model](maestro-preference-model.md) - Preference testing specs
- [Maestro Focus Architecture](maestro-focus-architecture-proposed.md) - Focus testing specs

---

*Derived from maestro-master-plan.md Section 6 & 7, aligned with Program A priorities*
