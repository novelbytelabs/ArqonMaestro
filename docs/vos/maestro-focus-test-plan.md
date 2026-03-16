# Focus Project Test Plan

> **Status:** Test Plan Active
> **Date:** 2026-03-16
> **Program State:** FP-6B Complete - Ready for Testing

## Overview

This test plan validates all Focus Project features from FP-0 through FP-6B. Testing is organized by **Focus Layers** and **FP Phase Acceptance Criteria**.

---

## Test Setup

### Prerequisites
1. Arqon Maestro running in dev mode: `npm run dev`
2. Chrome, VS Code, Terminal, and other test apps available
3. Voice input active and working
4. Developer console open for debug output

### Test Environment
- **OS:** Linux (for xdotool focus)
- **Applications:** Chrome, VS Code, Terminal, Slack (or similar)
- **Voice:** Functional microphone with Maestro listening

---

## Layer 2-3: Application & Window Focus (FP-1)

### FP-1.1: Verification Step After Focus Transfer

**Test Commands:**
| Command | Expected Behavior |
|---------|-------------------|
| "focus chrome" | Switches to Chrome, verifies focus arrived |
| "focus vscode" | Switches to VS Code, verifies focus arrived |
| "focus terminal" | Switches to Terminal, verifies focus arrived |

**Verification:**
- Check debug log for `[FocusVerificationService] Verification passed`
- Confirm window is active and receives keyboard input

### FP-1.2: Source-of-Truth Classification

**Test Commands:**
- After any focus transfer, check debug output for authority classification
- Should show OS, Application, or Maestro as Source of Truth

### FP-1.3: Expanded History Model

**Test Commands:**
- Perform multiple focus changes in sequence
- Check debug logs for `[FocusHistoryService]` entries with timestamps

### FP-1.4: Coarse Confidence Scoring

**Test Commands:**
- Focus transfer to running app → High confidence (0.8+)
- Focus transfer to closed app → Lower confidence

---

## Layer 4: Region Focus (FP-3A/3B)

### FP-3A.1: Canonical Region Model for VS Code

**Test Commands:**
| Command | Expected Behavior |
|---------|-------------------|
| "focus sidebar" | Focus VS Code sidebar region |
| "focus editor" | Focus VS Code editor region |
| "focus terminal" | Focus VS Code integrated terminal |

### FP-3A.2: Canonical Region Model for Chrome

**Test Commands:**
| Command | Expected Behavior |
|---------|-------------------|
| "focus address bar" | Focus Chrome URL bar |
| "focus page" | Focus Chrome page content |

### FP-3B.4: Terminal Ambiguity Policy

**Test Commands:**
- "focus terminal" → Should resolve ambiguity (system terminal vs VS Code terminal)
- Check debug log for ambiguity resolution

---

## Layer 5-7: Precision Focus (FP-4A/4B)

### FP-4A.2: Caret Presence Detection

**Test Commands:**
- Start typing in a text field → Should detect caret presence
- Click in non-text area → Should detect no caret

### FP-4A.4: Text Insertion Precheck

**Test Commands:**
- With caret in editor: "type hello" → Should succeed
- Without caret in editor: "type hello" → Should show safety message

### FP-4B.4: Blocked Insertion Messages

**Test Commands:**
- Attempt text insertion outside text field
- Verify user-safe message appears

---

## Recovery (FP-5A/5B)

### FP-5A.1: Drift Detection

**Test Commands:**
1. "focus chrome" → Focus transfers to Chrome
2. Manually click away to different app
3. Issue another focus command
4. Check debug for `[FocusRecoveryService]` drift detection

### FP-5A.4: Bounded Recovery

**Test Commands:**
1. Focus to app A
2. Trigger recovery scenario
3. Verify bounded retry (max 3 attempts)
4. Verify user-safe message on failure

### FP-5B.1: State Integrity Thresholds

**Test Commands:**
- Multiple rapid focus changes
- Check state integrity status in telemetry

---

## Intent Routing (FP-6A/6B)

### FP-6A.1: Intent Target Model

**Test Commands:**
- Issue any focus command
- Check debug for `[IntentRoutingService]` routing target model

### FP-6A.2: Explicit Scope Routing

**Test Commands:**
| Command | Expected Behavior |
|---------|-------------------|
| "focus chrome" | Explicit scope - chrome app |
| "focus vscode terminal" | Explicit scope - vscode terminal region |

### FP-6B.2: Focus-Routing Agreement Checks

**Test Commands:**
1. Current focus: Chrome
2. Issue "focus vscode"
3. Check debug for `[ROUTING] Focus-Routing Agreement` message
4. Should show AGREEMENT or MISMATCH

### FP-6B.3: Scoped Action Validation

**Test Commands:**
- Issue scoped action commands
- Verify validation in debug logs

### FP-6B.4: Degraded Routing Distinction

**Test Commands:**
- Issue command that falls back to degraded routing
- Check debug shows DEGRADED outcome (not SUCCESS)

---

## Safety & Contracts (FP-2)

### FP-2.1: Pre-transfer Validation

**Test Commands:**
- Attempt focus to invalid target
- Check debug for `[FocusTransferContract] Pre-validation`

### FP-2.3: Safety Invariant Enforcement

**Test Commands:**
- Verify exactly one entity has focus at any time
- Check debug for `[FocusSafetyMonitor]` invariant checks

---

## Test Matrix

### Application Focus Targets

| Target App | Command | Expected |
|------------|---------|----------|
| Chrome | "focus chrome" | ✅ / ❌ |
| VS Code | "focus vscode" | ✅ / ❌ |
| Terminal | "focus terminal" | ✅ / ❌ |
| Slack | "focus slack" | ✅ / ❌ |
| Firefox | "focus firefox" | ✅ / ❌ |

### Region Focus Targets (VS Code)

| Region | Command | Expected |
|--------|---------|----------|
| Sidebar | "focus sidebar" | ✅ / ❌ |
| Editor | "focus editor" | ✅ / ❌ |
| Terminal | "focus terminal" | ✅ / ❌ |
| Explorer | "focus explorer" | ✅ / ❌ |

### Region Focus Targets (Chrome)

| Region | Command | Expected |
|--------|---------|----------|
| Address bar | "focus address bar" | ✅ / ❌ |
| Page | "focus page" | ✅ / ❌ |

---

## Debug Log Reference

Key debug prefixes to watch:

```
[FocusVerificationService]   - Post-transfer verification
[FocusAuthorityService]     - Source of truth classification
[FocusHistoryService]       - History entries
[FocusTransferContract]     - Pre/post validation
[FocusSafetyMonitor]        - Safety invariant checks
[FocusRegionHandler]        - Region transfer
[FocusPrecisionService]     - Precision focus checks
[FocusRecoveryService]      - Drift detection & recovery
[IntentRoutingService]      - Intent routing decisions
[ROUTING]                   - FP-6B routing telemetry
[arqon-driver]              - Driver execution (xdotool)
```

---

## Acceptance Criteria Checklist

### FP-1 (Verified Focus Core)
- [ ] FP-1.1: Verification Step After Focus Transfer
- [ ] FP-1.2: Source-of-Truth Classification
- [ ] FP-1.3: Expanded History Model
- [ ] FP-1.4: Coarse Confidence Scoring

### FP-2 (Safety + Contracts)
- [ ] FP-2.1: Pre-transfer Validation Checks
- [ ] FP-2.2: Post-transfer Contract Verification
- [ ] FP-2.3: Safety Invariant Enforcement
- [ ] FP-2.4: Failure Mode Documentation

### FP-3 (Region Focus)
- [ ] FP-3A.1: Canonical Region Model for VS Code
- [ ] FP-3A.2: Canonical Region Model for Chrome
- [ ] FP-3A.7: Ambiguity Policy for "Terminal"
- [ ] FP-3B.4: Hardened Terminal Ambiguity Policy

### FP-4 (Precision Focus)
- [ ] FP-4A.2: Caret Presence Detection
- [ ] FP-4A.4: Text Insertion Precheck
- [ ] FP-4B.4: Blocked Insertion Messages

### FP-5 (Recovery)
- [ ] FP-5A.1: Drift Detection
- [ ] FP-5A.4: Bounded Recovery
- [ ] FP-5B.1: State Integrity Thresholds

### FP-6 (Intent Routing)
- [ ] FP-6A.1: Intent Target Model
- [ ] FP-6A.2: Explicit Scope Routing
- [ ] FP-6B.2: Focus-Routing Agreement Checks
- [ ] FP-6B.3: Scoped Action Validation
- [ ] FP-6B.4: Degraded Routing Distinction

---

## Running Tests

### Manual Voice Test
1. Start Maestro: `npm run dev`
2. Activate voice listening
3. Speak commands from test matrix
4. Observe debug console output

### Automated Log Verification
```bash
# Filter for focus-related logs
npm run dev 2>&1 | grep -E "\[Focus|\[ROUTING|\[arqon-driver"
```

---

## Known Limitations

- Layer 6 (Item) is deferred
- xdotool driver for Linux only
- Some region focus requires app-specific handlers

---

## Test Results Recording

| Date | Command | Expected | Actual | Debug Evidence | Status |
|------|---------|----------|--------|-----------------|--------|
| | | | | | |
