---
title: Maestro Focus Gap Analysis v0.1
status: draft
last_updated: 2026-03-15
---

> **NOTE**: Phase 1A, 1B, and 1C are already hard-closed. This analysis assumes migration to v0.1 happens post-Phase 1 completion.

# Maestro Focus Gap Analysis v0.1

## Risk and Difficulty Assessment

| # | Component | Risk Level | Difficulty | Dependencies | Why Risky? |
|---|-----------|------------|------------|--------------|------------|
| 1 | Verification step after focus transfer | 🟢 Low | Easy | Existing xdotool driver | Low risk - adds robustness |
| 2 | Confidence scoring (High/Medium/Low) | 🟡 Medium | Medium | Command contract model | New concept - requires careful design |
| 3 | Expanded history model (multi-level restore) | 🟡 Medium | Medium | None | Requires state management changes |
| 4 | Command contract registry | 🟡 Medium | Medium | Confidence scoring | API design decision - affects all commands |
| 5 | Safety gating for destructive commands | 🔴 High | Hard | Confidence + contracts | Could break existing functionality if too strict |
| 6 | Region awareness (accessibility-based) | 🟡 Medium | Hard | A11y APIs (accessibility) | Platform-specific, may not work on all surfaces |
| 7 | Modal detection and handling | 🔴 High | Hard | A11y APIs | Modals intercept focus unpredictably |
| 8 | Multi-window disambiguation (chooser) | 🟡 Medium | Hard | UI components | Requires chooser UX implementation |
| 9 | Control focus tracking | 🔴 High | Hard | A11y APIs | Complex tree traversal, performance concerns |
| 10 | Caret detection and verification | 🔴 High | Hard | App integration / A11y | Different per application, unreliable |
| 11 | Pin mechanism (lock scope) | 🟡 Medium | Medium | Command routing | New semantic concept to integrate |
| 12 | Recovery engine (repair drifted focus) | 🔴 High | Hard | Verification + history | Complex state machine, edge cases |
| 13 | Semantic intent routing (Layer 8) | 🔴 High | Hard | All above | Requires full stack to work reliably |
| 14 | Source-of-truth classification | 🟡 Medium | Medium | None | Debugging/tracking infrastructure |
| 15 | Focus observer module (unified) | 🟡 Medium | Hard | Platform backends | Architectural refactor of existing observers |

## Detailed Risk Analysis

### Why High Risk Items Are Risky

| Component | Risk Explanation |
|-----------|------------------|
| **Safety gating** | Could block valid commands, frustrate users if threshold too strict; too loose defeats purpose |
| **Modal detection** | Modals appear unpredictably, can steal focus mid-command; handling race conditions is hard |
| **Control focus** | Accessibility tree traversal is complex, different per platform, performance-intensive |
| **Caret detection** | Each app exposes caret differently; no universal API; editors vs terminals differ wildly |
| **Recovery engine** | Must handle circular failure states, user expectations around "undo" vs "repair" |
| **Semantic intent routing** | Must resolve ambiguous references ("this", "that", "it") - requires strong context tracking |

### Why Medium Risk Items Are Moderately Risky

| Component | Risk Explanation |
|-----------|------------------|
| **Confidence scoring** | Requires defining thresholds; different for each surface; user may not understand why "low" |
| **History model** | Must persist across sessions? How deep? What when app closes? |
| **Command contracts** | API design affects all future commands; hard to change once established |
| **Chooser UI** | New UI component; must integrate with existing chooser system |
| **Pin mechanism** | New semantic concept; must integrate with executor and validation |
| **Source tracking** | Adds overhead; must be lightweight or impacts performance |

### Why Low Risk Items Are Safe

| Component | Why Safe |
|-----------|----------|
| **Verification step** | Just confirms what we already do worked; graceful handling only improves reliability |

## Difficulty Breakdown

| Difficulty | Count | Components |
|------------|-------|------------|
| 🟢 Easy | 1 | Verification step |
| 🟡 Medium | 6 | Confidence scoring, History model, Command contracts, Pin mechanism, Source tracking, Chooser (UI) |
| 🔴 Hard | 8 | Safety gating, Modal detection, Region awareness, Control tracking, Caret detection, Recovery engine, Semantic routing, Focus observer refactor |

## Implementation Order Recommendation

### Tier 1: Safe Foundation (Start Here)

| Order | Component | Effort | Benefit |
|-------|-----------|--------|---------|
| 1 | Verification step | 1 day | High reliability |
| 2 | Source-of-truth classification | 2 days | Debugging clarity |
| 3 | Expanded history model | 3 days | "Return focus" works better |

### Tier 2: Core Intelligence

| Order | Component | Effort | Benefit |
|-------|-----------|--------|---------|
| 4 | Confidence scoring | 3 days | Enables safety |
| 5 | Command contracts | 5 days | Declarative model |
| 6 | Safety gating | 3 days | Prevents unsafe ops |

### Tier 3: Surface Expansion

| Order | Component | Effort | Benefit |
|-------|-----------|--------|---------|
| 7 | Pin mechanism | 2 days | Scoped actions |
| 8 | Region awareness | 5 days | Sub-window focus |
| 9 | Modal detection | 5 days | Handles popups |

### Tier 4: Advanced Features

| Order | Component | Effort | Benefit |
|-------|-----------|--------|---------|
| 10 | Chooser/disambiguation | 5 days | Resolves ambiguity |
| 11 | Control focus tracking | 7 days | Widget-level |
| 12 | Caret detection | 7 days | Text insertion |
| 13 | Recovery engine | 7 days | Auto-repair |
| 14 | Semantic intent routing | 10 days | Full VOS |

**Estimated Total: 58 developer days**

## Cross-Dependency Map

```
Verification ─────┐
                 ├──► Confidence ──────► Safety Gating
Source Tracking ─┤         │
                 │         ▼
History ◄────────┴──► Contracts ──► Pin Mechanism
                                           │
                                           ▼
                            Region Awareness ──► Modal Detection
                                           │
                                           ▼
                                    Chooser/Disambig
                                           │
                                           ▼
Control + Caret ──────────────────────────────┴──► Recovery ──► Semantic Intent
```

---

## Purpose

This document maps the current implemented focus slice against the full Maestro Focus Architecture v0.1 target. It identifies what is in place, what is missing, the risk of deferring each gap, and the recommended next implementation move.

---

## Architectural Scope Comparison

### Full Target (Maestro Focus Architecture v0.1)

| Layer | Description |
|-------|-------------|
| 1 — Environment | Desktop session, VM, workspace, monitor topology |
| 2 — Application | VS Code, Chrome, Terminal, etc. |
| 3 — Window | Main window, dialogs, popups |
| 4 — Region | Editor, sidebar, terminal panel, address bar |
| 5 — Control | Button, input, tree, list, command palette |
| 6 — Item | Selected file, active tab, highlighted entry |
| 7 — Caret | Editor cursor, terminal prompt, search field insertion |
| 8 — Intent Target | Semantic routing destination |

### Current Implementation

| Layer | Status | Notes |
|-------|--------|-------|
| 1 — Environment | ⚠️ Partial | Assumes local desktop session |
| 2 — Application | ✅ Implemented | Active app detection via xdotool |
| 3 — Window | ✅ Implemented | Window activation via xdotool |
| 4 — Region | ❌ Not implemented | Not yet needed for Phase 1 |
| 5 — Control | ❌ Not implemented | Would require accessibility APIs |
| 6 — Item | ❌ Not implemented | Would require accessibility/tree APIs |
| 7 — Caret | ❌ Not implemented | Would require app integration |
| 8 — Intent Target | ⚠️ Primitive | Alias-based normalization only |

---

## Gap Map: Current → Target

### G1: Application Focus Layer

| Aspect | Current State | Target State | Risk if Deferred | Next Move |
|--------|---------------|--------------|------------------|------------|
| App detection | xdotool search --class | Unified observer with multiple backends | Low - current works for basic switching | Keep as-is for Phase 1 |
| App aliases | Hardcoded map in system.ts | Dynamic alias registry with plugin support | Medium - will become unwieldy | Extract to config file |
| App validation | wmctrl title matching | Canonical target model with multiple match strategies | Medium - split truth between validation and execution | Unify target model |

### G2: Window Focus Layer

| Aspect | Current State | Target State | Risk if Deferred | Next Move |
|--------|---------------|--------------|------------------|------------|
| Window activation | xdotool windowactivate | Unified transfer engine with verify step | Low - functional | Add verification step |
| Multi-window handling | First match wins | Window disambiguation (chooser) | Medium - ambiguous targets will fail | Add chooser integration |
| Modal detection | None | Modal override policy | High - modals will intercept silently | Add accessibility-based modal detection |

### G3: Focus History / Restore

| Aspect | Current State | Target State | Risk if Deferred | Next Move |
|--------|---------------|--------------|------------------|------------|
| History storage | Single previous app | Full stack history (app, window, region, control) | Medium - restore will be shallow | Expand history model |
| Restore command | "return focus" → switch to prior app | Restore to exact prior state including caret | Medium - user expectation mismatch | Add multi-layer restore |
| History depth | 1 level | Configurable depth (default 5) | Low - nice to have | Add depth configuration |

### G4: Confidence Modeling

| Aspect | Current State | Target State | Risk if Deferred | Next Move |
|--------|---------------|--------------|------------------|------------|
| Confidence scoring | None | High / Medium / Low bands | High - unsafe commands execute on weak inference | Add confidence field to focus state |
| Safety gating | None | Block destructive commands on low confidence | High - data loss risk | Implement safety gate |
| Source of truth | Driver-level only | Classification per field (OS, A11y, heuristic, etc.) | Medium - debugging difficulty | Add source tracking |

### G5: Region, Control, Item, Caret

| Aspect | Current State | Target State | Risk if Deferred | Next Move |
|--------|---------------|--------------|------------------|------------|
| Region awareness | None | Pane, panel, sidebar detection | Medium - can't target sub-windows | Add accessibility observer |
| Control focus | None | Widget-level focus tracking | Medium - can't target specific controls | Add A11y API integration |
| Item selection | None | Track selected objects | Medium - can't act on selections | Add selection observer |
| Caret detection | None | Text insertion point verification | High - can't reliably insert text | Add caret presence check |

### G6: Command Contracts

| Aspect | Current State | Target State | Risk if Deferred | Next Move |
|--------|---------------|--------------|------------------|------------|
| Contract model | Implicit in executor.ts | Explicit per-command declaration | Medium - inconsistent preconditions | Add command contract registry |
| Required focus scopes | Hardcoded in executor | Declarative in command definition | Medium - maintenance burden | Extract to config |
| Destructive command gating | None | Explicit destructive flag + confidence check | High - unsafe operations | Add safety policy layer |

### G7: Focus Operations

| Aspect | Current State | Target State | Risk if Deferred | Next Move |
|--------|---------------|--------------|------------------|------------|
| Observe | ✅ Basic app/window | Full stack observation | Low | Expand to regions |
| Transfer | ✅ Basic switch | Verify before declaring success | Medium | Add verification step |
| Verify | ⚠️ Partial (post-refresh) | Full verification (app, window, region, control, caret) | Medium | Implement complete verify |
| Pin | ❌ Not implemented | Lock scope for subsequent commands | Medium - scoped actions limited | Add pin mechanism |
| Restore | ⚠️ App-level only | Full stack restore | Medium | Expand history model |
| Recover | ❌ Not implemented | Repair drifted focus | High - stuck sessions | Add recovery engine |

### G8: Ambiguity Handling

| Aspect | Current State | Target State | Risk if Deferred | Next Move |
|--------|---------------|--------------|------------------|------------|
| Multiple targets | First match wins | Chooser UI for disambiguation | High - wrong target activated | Integrate chooser |
| "this/that/it" | None | Context-based resolution | Medium - natural language limited | Add semantic resolution |
| Implicit targets | None | History + proximity inference | Medium - friction in command flow | Add implicit resolution |

---

## Risk Assessment Summary

| Risk Level | Gaps | Impact |
|------------|------|--------|
| 🔴 High | G5 (region-care), G6 (contracts), G7 (verify/recover), G8 (ambiguity) | Unsafe operations, reliability issues |
| 🟡 Medium | G1 (aliases), G2 (multi-window), G3 (history), G4 (confidence) | Scalability, maintenance, user expectation |
| 🟢 Low | G1 (detection), G2 (activation) | Working as intended |

---

## Recommended Implementation Roadmap

### Phase 1C (Current)

- [x] Application focus (Layer 2)
- [x] Window focus (Layer 3)
- [x] Basic transfer
- [ ] Fix validation bug (in progress)
- [ ] Add verification step

### Phase 1D / 2A (Next)

- [ ] Expand history model (multi-level restore)
- [ ] Add confidence scoring
- [ ] Implement safety gating for destructive commands
- [ ] Add command contract registry

### Phase 2B

- [ ] Region awareness (accessibility-based)
- [ ] Modal detection
- [ ] Multi-window disambiguation

### Phase 2C

- [ ] Control focus tracking
- [ ] Caret detection
- [ ] Pin mechanism

### Phase 2D

- [ ] Recovery engine
- [ ] Full focus verification
- [ ] Semantic intent routing

---

## Architectural Alignment Summary

**Current implementation = Valid early slice**

| Implemented | Not Yet |
|-------------|---------|
| Environment (partial) | Region |
| Application | Control |
| Window | Item |
| Basic history | Caret |
| Basic transfer | Intent Target (full) |
| Basic verify | Confidence modeling |
| | Pin / Restore (full) |
| | Recovery |
| | Disambiguation |

**Verdict**: The architecture is not broken or misaligned. It is incomplete in the expected way for Phase 1. The key risk is allowing "application focus" to become a mistaken substitute for the full focus model.

---

## Conclusion

Migrating to the full v0.1 architecture now would be **detrimental** because:

1. **Scope creep** - Would derail Phase 1C completion
2. **Immediate need** - User has a bug that needs fixing now
3. **Valid foundation** - Current implementation is architecturally sound for its scope

The **beneficial approach** is:

1. **Fix the current bug** (focus command not working)
2. **Add incremental enhancements** from v0.1:
   - Verification step after transfer
   - Confidence scoring for safety
   - Expanded history model
3. **Plan v0.2 expansion** after Phase 1 closes

This preserves the working foundation while deliberately expanding toward the full focus stack.
