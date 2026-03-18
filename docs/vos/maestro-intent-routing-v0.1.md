# Maestro Intent Routing v0.1

## Overview

Intent Routing (FP-6A + FP-6B) adds a first-class intent target model and makes Maestro use it for a limited class of commands on already-supported surfaces. This is a bounded move into Layer 8 — Intent Target.

**FP-6B** adds hardening: focus-routing agreement checks, scoped action validation, degraded routing distinction, and richer telemetry.

## Why Intent Routing Now

The Focus Project has achieved:
- App/window focus (FP-1)
- Region focus (FP-3A/3B)
- Control/caret precision (FP-4A/4B)
- Safety/guard rails (FP-2, FP-4B)
- Bounded recovery (FP-5A/5B)

The next gap is routing. Maestro needs to distinguish between:
- Current focus state
- Requested semantic target
- Resolved execution target

That distinction is the key architectural step.

## Architectural Rules

| Rule | Description |
|------|-------------|
| 1 | Intent routing sits on TOP of focus architecture |
| 2 | Routing must NOT bypass safety, precision, or recovery |
| 3 | Explicit scope outranks implicit routing |
| 4 | Unsupported routes must fail clearly |
| 5 | Routing confidence is separate from focus confidence |
| 6 | If routing and focus disagree, resolve or abort |
| 7 | Degraded fallback routing must be visibly distinct from normal success (FP-6B) |

## Supported Targets

### Application Targets

- VS Code
- Chrome
- Terminal (where already supported)

### Region Targets

| Application | Supported Regions |
|-------------|------------------|
| VS Code | editor, terminal |
| Chrome | address_bar, page |

### Control/Insertion Targets

| Application | Control | Target Kind |
|-------------|---------|-------------|
| VS Code | text_editor | insertion |
| VS Code | terminal | control |
| Chrome | address_bar | insertion |

## Supported Command Patterns

### Explicitly Scoped Focus Commands

| Command | Target |
|---------|--------|
| `in code, focus terminal` | VS Code terminal |
| `in code, focus editor` | VS Code editor |
| `in chrome, focus address bar` | Chrome address bar |
| `in chrome, focus page` | Chrome page |

### Explicitly Scoped Action Commands

| Command | Target |
|---------|--------|
| `paste in editor` | VS Code editor insertion |
| `type in address bar` | Chrome address bar insertion |
| `run in terminal` | VS Code terminal |

## Intent Target Model

### Target Kinds

```typescript
enum IntentTargetKind {
  APPLICATION = "application",  // Target is an application
  REGION = "region",           // Target is a region
  CONTROL = "control",         // Target is a control
  INSERTION = "insertion",     // Target is an insertion point
}
```

### Routing Confidence

```typescript
enum RoutingConfidence {
  HIGH = "high",    // Explicit scope + supported + verified
  MEDIUM = "medium", // Partially explicit + compatible focus
  LOW = "low",      // Inferred with ambiguity
}
```

### Ambiguity Status

```typescript
enum AmbiguityStatus {
  NONE = "none",   // Single clear target
  LOW = "low",     // Can resolve with context
  HIGH = "high",   // Needs explicit resolution
}
```

### Resolution Source

```typescript
enum ResolutionSource {
  EXPLICIT_SCOPE = "explicit_scope",  // From "in X" pattern
  IMPLICIT_RULE = "implicit_rule",   // From rule inference
  FOCUS_FALLBACK = "focus_fallback", // From current focus
  FAILED = "failed",                 // No valid route
}
```

### Intent Target Interface

```typescript
interface IntentTarget {
  targetKind: IntentTargetKind;
  application: string;
  region?: RegionKind;
  control?: ControlType;
  resolvedEntity: string;
  explicitScope: boolean;
  routingConfidence: RoutingConfidence;
  ambiguity: AmbiguityStatus;
  resolutionSource: ResolutionSource;
  sourceCommand: string;
  timestamp: string;
}
```

## Routing Confidence

### Confidence Computation

| Factor | Score Contribution |
|--------|-------------------|
| Explicit scope | +0.3 |
| Supported target | +0.15 |
| Focus compatible | +0.1 |
| No ambiguity | +0.1 |
| High ambiguity | -0.3 |

### Confidence Thresholds

| Level | Threshold |
|-------|-----------|
| HIGH | >= 0.8 |
| MEDIUM | >= 0.5 |
| LOW | < 0.5 |

### Safety Policy

- **HIGH**: Safe to proceed
- **MEDIUM**: Proceed with caution
- **LOW**: Must fail safely (requires explicit scope or abort)

## Explicit Scope Routing

### Supported Scope Keywords

| Scope | Application | Default Region |
|-------|-------------|----------------|
| code | vscode | editor |
| vscode | vscode | editor |
| visual studio code | vscode | editor |
| chrome | chrome | page |
| browser | chrome | page |

### Examples

```
"in code, focus terminal"
→ application: "vscode"
→ region: "terminal"
→ explicitScope: true
→ confidence: HIGH

"paste in editor"
→ application: "vscode"
→ region: "editor"
→ control: "text_editor"
→ targetKind: "insertion"
→ confidence: HIGH
```

## Implicit Target Rules

### Approved Rules

| Command Pattern | Application | Region | Control | Target Kind |
|----------------|-------------|--------|---------|-------------|
| paste | vscode | editor | text_editor | insertion |
| run | vscode | terminal | terminal | control |
| type | chrome | address_bar | address_bar | insertion |

### Implicit Rule Conditions

1. Must have compatible current focus
2. Cannot override explicit scope
3. Limited to supported surfaces only

## Routing Telemetry (FP-6B Enhanced)

```typescript
interface RoutingTelemetry {
  command: string;
  target: IntentTarget | null;
  success: boolean;
  outcome: RoutingOutcome;           // FP-6B: explicit outcome classification
  focusRoutingAgreement: FocusRoutingAgreement;  // FP-6B: focus compatibility
  precisionGate: GateStatus;         // FP-6B: precision guard status
  safetyGate: GateStatus;            // FP-6B: safety gate status
  recoveryInvoked: boolean;          // FP-6B: recovery invoked
  error?: string;
  timestamp: string;
}
```

### Routing Outcome (FP-6B)

```typescript
enum RoutingOutcome {
  RESOLVED_EXPLICIT = "resolved_explicit",        // Explicit scope success
  RESOLVED_IMPLICIT = "resolved_implicit",        // Implicit rule success
  RESOLVED_FALLBACK_DEGRADED = "resolved_fallback_degraded",  // Fallback - degraded
  ABORTED_UNSUPPORTED_ROUTE = "aborted_unsupported_route",
  ABORTED_FOCUS_ROUTE_MISMATCH = "aborted_focus_route_mismatch",     // FP-6B
  ABORTED_PRECISION_GUARD = "aborted_precision_guard",              // FP-6B
  ABORTED_SAFETY_GATE = "aborted_safety_gate",                      // FP-6B
  ABORTED_LOW_CONFIDENCE = "aborted_low_confidence",                // FP-6B
}
```

### Focus-Routing Agreement (FP-6B)

```typescript
enum FocusRoutingAgreement {
  COMPATIBLE = "compatible",
  INCOMPATIBLE = "incompatible",
  NO_FOCUS_CONTEXT = "no_focus_context",
  EXPLICIT_SCOPE_OVERRIDE = "explicit_scope_override",  // Explicit scope bypasses check
}
```

### Gate Status (FP-6B)

```typescript
enum GateStatus {
  PASSED = "passed",
  BLOCKED = "blocked",
  NOT_APPLICABLE = "not_applicable",
}
```

### Debug Output Format

```
[ROUTING] command="in code, focus terminal"
[ROUTING] target=vscode/terminal
[ROUTING] confidence=HIGH
[ROUTING] source=explicit_scope
[ROUTING] success=true
```

### Focus-Routing Agreement Checks (FP-6B)

Before execution, explicitly check whether the resolved intent target is compatible with the current verified focus state.

**Rules:**
- Explicit scope overrides focus check (Rule 3)
- Without explicit scope, incompatible focus = abort
- No focus context = abort (requires explicit scope)

**Examples:**
- `in code, focus terminal` → explicit scope override, proceeds
- `paste` with Chrome focus → incompatible app, aborts
- `paste` with VS Code editor focus → compatible, proceeds

### Scoped Action Validation (FP-6B)

Validate approved routed actions against compatible targets:

| Action | Valid Target Regions |
|--------|---------------------|
| paste | editor, address_bar |
| type | editor, address_bar |
| go | address_bar |
| run, execute | terminal |

**Rules:**
- `paste in editor` requires insertion target + editor region
- `type in address bar` requires insertion target + address_bar region
- `run in terminal` requires terminal control + terminal region
- Invalid action/target combinations abort with clear error

### Degraded Routing Policy (FP-6B)

**FOCUS_FALLBACK is NOT normal success.** It must be treated as degraded routing.

| Outcome | Meaning | Telemetry |
|---------|---------|-----------|
| RESOLVED_EXPLICIT | Explicit scope, normal success | ✅ |
| RESOLVED_IMPLICIT | Implicit rule, normal success | ✅ |
| RESOLVED_FALLBACK_DEGRADED | Fallback, degraded - marked distinct | ⚠️ |
| ABORTED_* | Various abort reasons | ❌ |

### Debug Output Format (FP-6B Enhanced)

```
[ROUTING] command="in code, focus terminal"
[ROUTING] target=vscode/terminal
[ROUTING] outcome=resolved_explicit
[ROUTING] focusAgreement=explicit_scope_override
[ROUTING] precisionGate=passed
[ROUTING] safetyGate=passed
[ROUTING] success=true

[ROUTING] command="run"
[ROUTING] target=vscode/terminal
[ROUTING] outcome=resolved_fallback_degraded
[ROUTING] focusAgreement=compatible
[ROUTING] precisionGate=not_applicable
[ROUTING] safetyGate=passed
[ROUTING] success=true
[ROUTING] NOTE="Fallback routing - treat as degraded"
```

## Not in Scope (FP-6A + FP-6B)

### Deliberately Excluded

- Pronoun resolution (this, that, it, here)
- Broad semantic graph routing
- Universal app support
- General web-page semantic targeting
- Autonomous disambiguation loops
- "AI decides what user meant" behavior
- Routing that bypasses safety/precision/recovery

## Acceptance Criteria (FP-6A + FP-6B)

### FP-6A Criteria

- [x] Intent target model exists and is distinct from focus state
- [x] Explicitly scoped commands route successfully
- [x] Implicit target rules work on supported surfaces
- [x] Routing confidence is computed and visible
- [x] Routing telemetry shows resolution path
- [x] Routing does not bypass safety/precision/recovery
- [x] No regression in FP-3A through FP-5B

### FP-6B Criteria

- [x] Routing telemetry is rich enough for operational inspection
- [x] Explicitly scoped actions validate against compatible targets
- [x] Degraded fallback routing is visibly distinct from normal routing
- [x] Routing does not silently proceed on focus-target mismatch
- [x] Routing does not bypass precision/safety/recovery
- [x] No regressions in FP-0 through FP-6A behavior

## Service Location

`maestro/client/src/main/runtime/intent-routing-service.ts`

## Public API (FP-6B Enhanced)

```typescript
class IntentRoutingService {
  // Main routing entry point (FP-6A)
  routeCommand(request: RoutingRequest): RoutingResult
  
  // Hardened routing with full telemetry (FP-6B)
  routeCommandHardened(request: RoutingRequest): { result: RoutingResult; telemetry: RoutingTelemetry }
  
  // Parse explicit scope from command
  parseExplicitScope(command: string): ScopeMapping | null
  
  // Apply implicit rules
  applyImplicitRule(command: string, currentFocus?: FocusContext): IntentTarget | null
  
  // Compute routing confidence
  computeRoutingConfidence(...): RoutingConfidence
  
  // Check target support
  isTargetSupported(application: string, region?: RegionKind, control?: ControlType): boolean
  
  // Focus-routing agreement check (FP-6B)
  checkFocusRoutingAgreement(target: IntentTarget, currentFocus: FocusContext): AgreementResult
  
  // Scoped action validation (FP-6B)
  validateScopedAction(action: string, target: IntentTarget): ValidationResult
  
  // Precision gate check (FP-6B)
  checkPrecisionGuard(target: IntentTarget, currentFocus: FocusContext): GateStatus
  
  // Safety gate check (FP-6B)
  checkSafetyGate(target: IntentTarget): GateStatus
  
  // Determine routing outcome (FP-6B)
  determineRoutingOutcome(...): RoutingOutcome
  
  // Telemetry
  recordRouting(telemetry: RoutingTelemetry): void
  getRoutingHistory(): RoutingTelemetry[]
}
```

## Version History

- v0.1 (FP-6A) - Initial intent routing foundations
  - Intent target model
  - Explicit scope routing
  - Implicit target rules
  - Routing confidence
  - Basic routing telemetry

- v0.2 (FP-6B) - Intent routing hardening
  - Extended routing telemetry with outcome classification
  - Focus-routing agreement checks
  - Scoped action validation
  - Degraded routing distinction (fallback != success)
  - Precision and safety gate integration

## Related Documents

- [Focus Project Charter](focus-project-charter.md)
- [Focus Recovery](maestro-focus-recovery-v0.1.md)
- [Focus Precision](maestro-focus-precision-v0.1.md)
- [Implementation Progress](maestro-implementation-progress.md)
