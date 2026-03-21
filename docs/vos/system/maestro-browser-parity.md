# Maestro Browser Parity (Talon + Rango Benchmark)

## Purpose

This document is the browser-control parity and surpass checklist for Maestro.

It converts Talon + Rango public capability into concrete Maestro execution targets.

Use this as the operational scorecard for Program A (Platform Bridge and Live Signal Wiring) and Program B (Production Hardening).

## Scope And Rules

- Benchmark target: Talon + Rango browser surface.
- Scope: browser control and browser-adjacent command execution.
- Rule: parity claims require measured pass-rate evidence, not ad-hoc demos.
- Rule: Maestro must preserve deterministic, inspectable, policy-aware execution.

## Competitive Capability Map

| Capability Family | Talon + Rango Baseline | Maestro Current State | Readiness |
| --- | --- | --- | --- |
| Browser activation | Strong app/window/browser activation | Strong (`focus chrome`, basic browser focus/switch flow) | Near parity |
| Hint overlay targeting | Dense-page letter hints and fast element targeting | Basic plugin hints and numbered target flows; no full letter-hint fabric | Gap |
| Element actions | click/hover/menu/address actions | Click and key-based actions are present; hover/menu/address workflows are partial | Gap |
| Link workflows | open/open-many/copy/show address workflows | Partial; first-link/target flows exist, but not full multi-target link operations | Gap |
| Tab workflows | advanced tab target/range/audio workflows | Basic next/previous/switch/close; partial recovery semantics | Gap |
| Inputs/forms | field focus/clear/insert/paste/submit patterns | Partial and improving; reliability depends on browser plugin/route health | Gap |
| Scroll/navigation | page + region + target/text snap scroll | Basic up/down/top/bottom and keypress-driven scrolling | Gap |
| Text/reference targeting | text/mark/range targeting | Reference foundations exist; browser realization is partial | Gap |
| Degraded mode behavior | robust hint refresh/retry handling | Partial fail-safe behavior; browser degraded strategy not fully hardened | Gap |
| Browser code surfaces | practical web-editor operation | Partial for Monaco/CodeMirror-like surfaces | Gap |

## Current Blockers (Ranked)

1. Plugin and route health gating
- Browser first-party behavior depends on plugin connectivity and command-route health.
- Effects: command support appears inconsistent when plugin/runtime state degrades.

2. Target acquisition substrate gap
- No full Rango-like hint-overlay + target disambiguation model yet.
- Effects: dense-page interaction and reliable element targeting are weaker than benchmark.

3. Browser action family incompleteness
- Hover/menu/address/multi-target workflows are not complete end-to-end.
- Effects: browser control remains functional but not comprehensive.

4. Operational reliability discipline gap
- Browser command breadth exceeds browser command reliability.
- Effects: users experience “some commands work, many do not” despite grammar coverage.

## Program Alignment

### Program A.1 — Browser Live Signal And Target Acquisition

Objective:
- Build robust browser-target acquisition and live signal wiring.

Deliverables:
- browser hint overlay v1 (deterministic targeting)
- stable target identity model (element id, role, text, fallback selectors)
- iframe/child-frame target traversal rules
- retry/refresh semantics for stale target maps

Primary specs:
- [`maestro-master-plan.md`](../maestro-master-plan.md)
- [`maestro-surface-model.md`](../maestro-surface-model.md)
- [`maestro-reference-system.md`](../maestro-reference-system.md)
- [`maestro-executor-architecture.md`](../maestro-executor-architecture.md)
- [`maestro-actuation-policy-engine.md`](../maestro-actuation-policy-engine.md)

### Program B.1 — Browser Execution Reliability Hardening

Objective:
- Harden browser action execution into a deterministic route ladder.

Deliverables:
- explicit route ladder per command family:
  - semantic DOM route
  - direct DOM route
  - keypress route
  - pointer fallback route
- route telemetry for refusal/fallback/retry causes
- browser command-family reliability thresholds

Primary specs:
- [`maestro-hot-path-runtime-contract.md`](../maestro-hot-path-runtime-contract.md)
- [`maestro-executor-architecture.md`](../maestro-executor-architecture.md)
- [`maestro-actuation-policy-engine.md`](../maestro-actuation-policy-engine.md)

## Parity Checklist

Mark each item `NOT_STARTED`, `PARTIAL`, or `COMPLETE`, and attach evidence links.

### 1. Element Target Acquisition

- [ ] hint overlay targeting for dense pages
- [ ] text target resolution
- [ ] range target resolution
- [ ] mark/reference target resolution
- [ ] iframe and child-frame traversal support
- [ ] stale-target refresh strategy

### 2. Element Actions

- [ ] click target
- [ ] hover target
- [ ] right-click/menu target
- [ ] pointer move to target
- [ ] show address
- [ ] copy address
- [ ] copy markdown link

### 3. Tabs

- [ ] switch/focus by index and target
- [ ] close by target
- [ ] close by range
- [ ] open one target in new tab
- [ ] open multiple targets in new tabs
- [ ] mute/unmute tab controls
- [ ] audible-tab targeting

### 4. Inputs And Forms

- [ ] focus field
- [ ] clear field
- [ ] prepend/append behavior
- [ ] cursor-to-start/cursor-to-end behavior
- [ ] insert text
- [ ] paste text
- [ ] submit/enter behavior

### 5. Scroll

- [ ] scroll up/down
- [ ] scroll to top/bottom
- [ ] page up/page down alias behavior
- [ ] pane/sidebar-specific scroll behavior
- [ ] target/text snap scroll behavior

### 6. Degraded And Recovery

- [ ] behavior when hinting fails
- [ ] refresh/retry command path
- [ ] fallback route transparency
- [ ] refusal with actionable reason
- [ ] noisy/dense page handling profile

### 7. Browser Code Surfaces

- [ ] generic editable behavior in web editors
- [ ] Monaco targeting reliability
- [ ] CodeMirror targeting reliability
- [ ] structural-code vs raw-text pathway clarity

## Evidence Requirements

Parity/surpass claims require:

1. Browser regression suite pass-rate reports
2. Route-level telemetry summaries by command family
3. Failure and fallback trace samples
4. Reproducible test runs across at least:
- Chromium-based browser
- at least one additional browser family (where applicable)

## Readiness Gates

### Gate P0 — Foundational Browser Reliability

Required:
- all Section 4 (Inputs/Forms) items at `COMPLETE`
- all Section 5 (Scroll) core items at `COMPLETE`
- command-family pass rate >= 95% on core browser suite

### Gate P1 — Competitive Parity

Required:
- Section 1 through 6 mostly `COMPLETE`
- stable degraded-mode behavior
- parity evidence package published

### Gate P2 — Surpass Threshold

Required:
- measurable advantage in at least two areas:
  - deterministic fallback transparency
  - policy-aware safety and authority gating
  - cross-surface workflow continuity
  - recoverability and replayability of browser decisions

## Immediate Next Actions

1. Wire this checklist into active implementation tracking.
2. Create browser regression cases for currently brittle commands first (`insert`, `delete`, `enter`, `undo`, `redo`, tab return, scroll aliases).
3. Publish first evidence snapshot and classify each checklist item.
