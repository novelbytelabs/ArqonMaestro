/**
 * Intent Routing Service
 *
 * Provides bounded intent-based routing for supported commands.
 * Part of FP-6A: Intent Routing Foundations
 * Part of FP-6B: Intent Routing Hardening + Scoped Action Safety
 *
 * This service provides:
 * - Intent target model (distinct from focus state)
 * - Explicit scope routing
 * - Small implicit target rules
 * - Routing confidence
 * - Routing telemetry (FP-6A + FP-6B hardened)
 * - Focus-routing agreement checks (FP-6B)
 * - Scoped action validation (FP-6B)
 * - Degraded routing outcomes (FP-6B)
 *
 * =============================================================================
 * ARCHITECTURAL RULES (FP-6A + FP-6B)
 * =============================================================================
 *
 * 1. Intent routing sits on TOP of focus architecture (Rule 1)
 * 2. Routing must NOT bypass safety, precision, or recovery (Rule 2)
 * 3. Explicit scope outranks implicit routing (Rule 3)
 * 4. Unsupported routes must fail clearly (Rule 4)
 * 5. Routing confidence is separate from focus confidence (Rule 5)
 * 6. If routing and focus disagree, resolve or abort (Rule 6)
 * 7. Degraded fallback routing must be visibly distinct from normal success (Rule 7 - FP-6B)
 *
 * =============================================================================
 * SUPPORTED TARGETS (FP-6A + FP-6B)
 * =============================================================================
 *
 * Application targets:
 * - VS Code
 * - Chrome
 *
 * Region targets:
 * - VS Code: editor, terminal
 * - Chrome: address_bar, page
 *
 * Control/insertion targets:
 * - VS Code: text_editor, terminal
 * - Chrome: address_bar
 *
 * =============================================================================
 * NOT IN SCOPE (FP-6A + FP-6B)
 * =============================================================================
 *
 * - Pronoun resolution (this, that, it, here)
 * - Broad semantic graph routing
 * - Universal app support
 * - General web-page semantic targeting
 * - Autonomous disambiguation loops
 * - "AI decides what user meant" behavior
 * - Routing that bypasses safety/precision/recovery
 */

import { RegionKind, SupportedApplication } from "./focus-region-service";
import { ControlType, PrecisionSurface } from "./focus-precision-service";

/**
 * Target kinds for intent routing (FP-6A)
 */
export enum IntentTargetKind {
  /** Target is an application */
  APPLICATION = "application",
  /** Target is a region within an application */
  REGION = "region",
  /** Target is a specific control */
  CONTROL = "control",
  /** Target is an insertion point */
  INSERTION = "insertion",
}

/**
 * Routing confidence levels (FP-6A)
 */
export enum RoutingConfidence {
  /** High: explicit scope + supported target + verified surface */
  HIGH = "high",
  /** Medium: partially explicit + low ambiguity + compatible focus */
  MEDIUM = "medium",
  /** Low: inferred target with unresolved ambiguity */
  LOW = "low",
}

/**
 * Ambiguity status for routing (FP-6A)
 */
export enum AmbiguityStatus {
  /** No ambiguity - single clear target */
  NONE = "none",
  /** Minor ambiguity - can be resolved with context */
  LOW = "low",
  /** Significant ambiguity - needs explicit resolution */
  HIGH = "high",
}

/**
 * Resolution source - how the target was determined (FP-6A)
 */
export enum ResolutionSource {
  /** Explicit scope in command (e.g., "in code") */
  EXPLICIT_SCOPE = "explicit_scope",
  /** Implicit rule inference */
  IMPLICIT_RULE = "implicit_rule",
  /** Fallback to current focus */
  FOCUS_FALLBACK = "focus_fallback",
  /** Failed - no valid route */
  FAILED = "failed",
}

/**
 * Routing outcome - explicit result classification (FP-6B)
 * Degraded fallback routing must be visibly distinct from normal success.
 */
export enum RoutingOutcome {
  /** Successfully resolved with explicit scope */
  RESOLVED_EXPLICIT = "resolved_explicit",
  /** Successfully resolved with implicit rule */
  RESOLVED_IMPLICIT = "resolved_implicit",
  /** Resolved via focus fallback - degraded (FP-6B) */
  RESOLVED_FALLBACK_DEGRADED = "resolved_fallback_degraded",
  /** Aborted - unsupported route */
  ABORTED_UNSUPPORTED_ROUTE = "aborted_unsupported_route",
  /** Aborted - focus/routing mismatch (FP-6B) */
  ABORTED_FOCUS_ROUTE_MISMATCH = "aborted_focus_route_mismatch",
  /** Aborted - precision guard blocked (FP-6B) */
  ABORTED_PRECISION_GUARD = "aborted_precision_guard",
  /** Aborted - safety gate blocked (FP-6B) */
  ABORTED_SAFETY_GATE = "aborted_safety_gate",
  /** Aborted - low confidence without explicit scope (FP-6B) */
  ABORTED_LOW_CONFIDENCE = "aborted_low_confidence",
}

/**
 * Focus-routing agreement status (FP-6B)
 */
export enum FocusRoutingAgreement {
  /** Focus and routing are compatible */
  COMPATIBLE = "compatible",
  /** Focus and routing are incompatible */
  INCOMPATIBLE = "incompatible",
  /** No focus context available */
  NO_FOCUS_CONTEXT = "no_focus_context",
  /** Routing is explicit scope - focus check not needed */
  EXPLICIT_SCOPE_OVERRIDE = "explicit_scope_override",
}

/**
 * Safety/Precision gate status (FP-6B)
 */
export enum GateStatus {
  /** Gate passed */
  PASSED = "passed",
  /** Gate blocked */
  BLOCKED = "blocked",
  /** Gate not applicable */
  NOT_APPLICABLE = "not_applicable",
}

/**
 * Intent target model (FP-6A)
 * Distinct from focus state - represents semantic routing target
 */
export interface IntentTarget {
  /** The kind of target */
  targetKind: IntentTargetKind;
  /** Application name */
  application: string;
  /** Region kind (if applicable) */
  region?: RegionKind;
  /** Control type (if applicable) */
  control?: ControlType;
  /** The resolved execution target */
  resolvedEntity: string;
  /** Whether scope was explicit in command */
  explicitScope: boolean;
  /** Routing confidence */
  routingConfidence: RoutingConfidence;
  /** Ambiguity status */
  ambiguity: AmbiguityStatus;
  /** How the target was resolved */
  resolutionSource: ResolutionSource;
  /** The source command that triggered routing */
  sourceCommand: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Routing request - input for routing decision
 */
export interface RoutingRequest {
  /** The command to route */
  command: string;
  /** Current focus state (if available) */
  currentApplication?: string;
  /** Current region (if available) */
  currentRegion?: RegionKind;
  /** Current control (if available) */
  currentControl?: ControlType;
}

/**
 * Routing result
 */
export interface RoutingResult {
  /** Whether routing succeeded */
  success: boolean;
  /** The resolved intent target */
  target: IntentTarget | null;
  /** Details about the routing decision */
  details: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Routing telemetry - HARDENED (FP-6B)
 * Extended for operational inspection and debugging.
 */
export interface RoutingTelemetry {
  /** Requested command */
  command: string;
  /** Resolved intent target */
  target: IntentTarget | null;
  /** Routing succeeded */
  success: boolean;
  /** Routing outcome classification (FP-6B) */
  outcome: RoutingOutcome;
  /** Focus-routing agreement status (FP-6B) */
  focusRoutingAgreement: FocusRoutingAgreement;
  /** Precision gate status (FP-6B) */
  precisionGate: GateStatus;
  /** Safety gate status (FP-6B) */
  safetyGate: GateStatus;
  /** Recovery invoked (yes/no) */
  recoveryInvoked: boolean;
  /** Error/abort reason if any */
  error?: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Implicit routing rule (FP-6A)
 */
export interface ImplicitRule {
  /** Command pattern */
  commandPattern: string;
  /** Expected application */
  application?: string;
  /** Expected region */
  region?: RegionKind;
  /** Expected control */
  control?: ControlType;
  /** Target kind */
  targetKind: IntentTargetKind;
  /** Confidence boost */
  confidenceBoost: number;
}

/**
 * Explicit scope mapping (FP-6A)
 */
export interface ScopeMapping {
  /** Scope keyword */
  scope: string;
  /** Application */
  application: string;
  /** Region */
  region?: RegionKind;
}

/**
 * Action target mapping (FP-6A)
 */
export interface ActionTargetMapping {
  /** Action keyword */
  action: string;
  /** Application */
  application: string;
  /** Region */
  region?: RegionKind;
  /** Control type */
  control: ControlType;
  /** Target kind */
  targetKind: IntentTargetKind;
}

// =============================================================================
// EXPLICIT SCOPE MAPPINGS (FP-6A)
// =============================================================================

/**
 * Known scope mappings
 */
export const SCOPE_MAPPINGS: ScopeMapping[] = [
  { scope: "code", application: "vscode", region: RegionKind.EDITOR },
  { scope: "vscode", application: "vscode", region: RegionKind.EDITOR },
  { scope: "visual studio code", application: "vscode", region: RegionKind.EDITOR },
  { scope: "chrome", application: "chrome", region: RegionKind.PAGE },
  { scope: "browser", application: "chrome", region: RegionKind.PAGE },
];

// =============================================================================
// ACTION TARGET MAPPINGS (FP-6A)
// =============================================================================

/**
 * Known action to target mappings
 */
export const ACTION_TARGET_MAPPINGS: ActionTargetMapping[] = [
  // VS Code actions
  { action: "paste", application: "vscode", region: RegionKind.EDITOR, control: ControlType.TEXT_EDITOR, targetKind: IntentTargetKind.INSERTION },
  { action: "type", application: "vscode", region: RegionKind.EDITOR, control: ControlType.TEXT_EDITOR, targetKind: IntentTargetKind.INSERTION },
  { action: "run", application: "vscode", region: RegionKind.TERMINAL, control: ControlType.TERMINAL, targetKind: IntentTargetKind.CONTROL },
  { action: "execute", application: "vscode", region: RegionKind.TERMINAL, control: ControlType.TERMINAL, targetKind: IntentTargetKind.CONTROL },
  // Focus actions (for focus commands like "focus chrome", "focus code")
  { action: "focus", application: "vscode", region: RegionKind.EDITOR, control: ControlType.TEXT_EDITOR, targetKind: IntentTargetKind.APPLICATION },
  { action: "focus", application: "chrome", region: RegionKind.PAGE, control: ControlType.ADDRESS_BAR, targetKind: IntentTargetKind.APPLICATION },
  // Chrome actions
  { action: "type", application: "chrome", region: RegionKind.ADDRESS_BAR, control: ControlType.ADDRESS_BAR, targetKind: IntentTargetKind.INSERTION },
  { action: "paste", application: "chrome", region: RegionKind.ADDRESS_BAR, control: ControlType.ADDRESS_BAR, targetKind: IntentTargetKind.INSERTION },
  { action: "go", application: "chrome", region: RegionKind.ADDRESS_BAR, control: ControlType.ADDRESS_BAR, targetKind: IntentTargetKind.INSERTION },
];

// =============================================================================
// IMPLICIT RULES (FP-6A)
// =============================================================================

/**
 * Small set of implicit routing rules (FP-6A)
 */
export const IMPLICIT_RULES: ImplicitRule[] = [
  // Insertion in editor
  {
    commandPattern: "paste",
    application: "vscode",
    region: RegionKind.EDITOR,
    control: ControlType.TEXT_EDITOR,
    targetKind: IntentTargetKind.INSERTION,
    confidenceBoost: 0.2,
  },
  // Terminal execution
  {
    commandPattern: "run",
    application: "vscode",
    region: RegionKind.TERMINAL,
    control: ControlType.TERMINAL,
    targetKind: IntentTargetKind.CONTROL,
    confidenceBoost: 0.2,
  },
  // Address bar
  {
    commandPattern: "type",
    application: "chrome",
    region: RegionKind.ADDRESS_BAR,
    control: ControlType.ADDRESS_BAR,
    targetKind: IntentTargetKind.INSERTION,
    confidenceBoost: 0.2,
  },
  // Focus commands - route to application target
  {
    commandPattern: "focus",
    application: "vscode",
    region: RegionKind.EDITOR,
    control: ControlType.TEXT_EDITOR,
    targetKind: IntentTargetKind.APPLICATION,
    confidenceBoost: 0.3,
  },
  {
    commandPattern: "focus",
    application: "chrome",
    region: RegionKind.PAGE,
    control: ControlType.ADDRESS_BAR,
    targetKind: IntentTargetKind.APPLICATION,
    confidenceBoost: 0.3,
  },
];

/**
 * Confidence thresholds
 */
export const ROUTING_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
};

export default class IntentRoutingService {
  // Routing history for telemetry
  private routingHistory: RoutingTelemetry[] = [];
  private maxHistorySize = 100;

  /**
   * Parse scope from command (FP-6A)
   * Looks for explicit scope like "in code" or "in chrome"
   */
  parseExplicitScope(command: string): ScopeMapping | null {
    const lowerCommand = command.toLowerCase();

    for (const mapping of SCOPE_MAPPINGS) {
      if (lowerCommand.includes(`in ${mapping.scope}`) || lowerCommand.includes(`${mapping.scope},`)) {
        return mapping;
      }
    }

    return null;
  }

  /**
   * Parse action from command (FP-6A)
   * Looks for action keywords like "paste", "type", "run"
   */
  parseAction(command: string): ActionTargetMapping | null {
    const lowerCommand = command.toLowerCase();

    for (const mapping of ACTION_TARGET_MAPPINGS) {
      if (lowerCommand.includes(mapping.action)) {
        return mapping;
      }
    }

    return null;
  }

  /**
   * Apply implicit rules (FP-6A)
   * Only for commands without explicit scope
   */
  applyImplicitRule(command: string, currentFocus?: { app?: string; region?: RegionKind }): IntentTarget | null {
    const lowerCommand = command.toLowerCase();

    // Check implicit rules
    for (const rule of IMPLICIT_RULES) {
      if (lowerCommand.includes(rule.commandPattern)) {
        // If we have current focus context, verify compatibility
        if (currentFocus && currentFocus.app) {
          const focusApp = currentFocus.app.toLowerCase();
          const ruleApp = rule.application?.toLowerCase() || "";

          // Only apply if focus is compatible
          if (ruleApp && !focusApp.includes(ruleApp) && !ruleApp.includes(focusApp)) {
            continue;
          }
        }

        const timestamp = new Date().toISOString();
        return {
          targetKind: rule.targetKind!,
          application: rule.application || currentFocus?.app || "unknown",
          region: rule.region,
          control: rule.control,
          resolvedEntity: rule.application || currentFocus?.app || "unknown",
          explicitScope: false,
          routingConfidence: RoutingConfidence.MEDIUM,
          ambiguity: AmbiguityStatus.LOW,
          resolutionSource: ResolutionSource.IMPLICIT_RULE,
          sourceCommand: command,
          timestamp,
        };
      }
    }

    return null;
  }

  /**
   * Compute routing confidence (FP-6A)
   */
  computeRoutingConfidence(
    explicitScope: boolean,
    targetSupported: boolean,
    focusCompatible: boolean,
    ambiguity: AmbiguityStatus
  ): RoutingConfidence {
    let score = 0.5;

    // Explicit scope is high confidence
    if (explicitScope) {
      score += 0.3;
    }

    // Supported target
    if (targetSupported) {
      score += 0.15;
    }

    // Compatible with current focus
    if (focusCompatible) {
      score += 0.1;
    }

    // Adjust for ambiguity
    switch (ambiguity) {
      case AmbiguityStatus.NONE:
        score += 0.1;
        break;
      case AmbiguityStatus.LOW:
        // No change
        break;
      case AmbiguityStatus.HIGH:
        score -= 0.3;
        break;
    }

    // Clamp to thresholds
    if (score >= ROUTING_CONFIDENCE_THRESHOLDS.HIGH) {
      return RoutingConfidence.HIGH;
    } else if (score >= ROUTING_CONFIDENCE_THRESHOLDS.MEDIUM) {
      return RoutingConfidence.MEDIUM;
    } else {
      return RoutingConfidence.LOW;
    }
  }

  /**
   * Check if target is supported (FP-6A)
   */
  isTargetSupported(application: string, region?: RegionKind, control?: ControlType): boolean {
    const normalizedApp = application.toLowerCase();

    // VS Code supported
    if (normalizedApp.includes("vscode") || normalizedApp.includes("code")) {
      if (region) {
        return region === RegionKind.EDITOR || region === RegionKind.TERMINAL;
      }
      return true;
    }

    // Chrome supported - focus commands to chrome are supported
    if (normalizedApp.includes("chrome")) {
      if (region) {
        return region === RegionKind.ADDRESS_BAR || region === RegionKind.PAGE;
      }
      return true;
    }

    return false;
  }

  /**
   * Check if focus is compatible with target (FP-6A)
   */
  isFocusCompatible(currentFocus: { app?: string; region?: RegionKind }, target: IntentTarget): boolean {
    if (!currentFocus.app) {
      return false;
    }

    const focusApp = currentFocus.app.toLowerCase();
    const targetApp = target.application.toLowerCase();

    // App must match
    if (!focusApp.includes(targetApp) && !targetApp.includes(focusApp)) {
      return false;
    }

    // If target has region, check compatibility
    if (target.region && currentFocus.region) {
      return target.region === currentFocus.region;
    }

    return true;
  }

  /**
   * Check focus-routing agreement (FP-6B)
   * Before execution, explicitly check whether the resolved intent target
   * is compatible with the current verified focus state.
   *
   * Returns the agreement status and whether to proceed or abort.
   */
  checkFocusRoutingAgreement(
    target: IntentTarget,
    currentFocus: { app?: string; region?: RegionKind; control?: ControlType }
  ): { agreement: FocusRoutingAgreement; shouldProceed: boolean; reason: string } {
    // If explicit scope, override focus check (Rule 3)
    if (target.explicitScope) {
      return {
        agreement: FocusRoutingAgreement.EXPLICIT_SCOPE_OVERRIDE,
        shouldProceed: true,
        reason: "Explicit scope overrides focus check",
      };
    }

    // If no focus context, cannot verify
    if (!currentFocus.app) {
      return {
        agreement: FocusRoutingAgreement.NO_FOCUS_CONTEXT,
        shouldProceed: false,
        reason: "No focus context available - requires explicit scope",
      };
    }

    // Check app compatibility
    const focusApp = currentFocus.app.toLowerCase();
    const targetApp = target.application.toLowerCase();

    if (!focusApp.includes(targetApp) && !targetApp.includes(focusApp)) {
      return {
        agreement: FocusRoutingAgreement.INCOMPATIBLE,
        shouldProceed: false,
        reason: `Focus app (${focusApp}) incompatible with target app (${targetApp})`,
      };
    }

    // Check region compatibility
    if (target.region && currentFocus.region) {
      if (target.region !== currentFocus.region) {
        return {
          agreement: FocusRoutingAgreement.INCOMPATIBLE,
          shouldProceed: false,
          reason: `Focus region (${currentFocus.region}) incompatible with target region (${target.region})`,
        };
      }
    }

    // Compatible
    return {
      agreement: FocusRoutingAgreement.COMPATIBLE,
      shouldProceed: true,
      reason: "Focus and routing are compatible",
    };
  }

  /**
   * Validate scoped action against compatible targets (FP-6B)
   * Ensures that approved routed actions validate against compatible targets.
   *
   * Examples:
   * - "paste in editor" requires insertion target compatibility
   * - "type in address bar" requires address bar insertion target compatibility
   * - "run in terminal" requires terminal-compatible execution target
   */
  validateScopedAction(
    action: string,
    target: IntentTarget
  ): { valid: boolean; error?: string } {
    const lowerAction = action.toLowerCase();

    // Paste requires insertion target
    if (lowerAction.includes("paste")) {
      if (target.targetKind !== IntentTargetKind.INSERTION) {
        return {
          valid: false,
          error: `Paste requires insertion target, got ${target.targetKind}`,
        };
      }
      // Editor or address bar are valid insertion targets
      if (target.region !== RegionKind.EDITOR && target.region !== RegionKind.ADDRESS_BAR) {
        return {
          valid: false,
          error: `Paste requires editor or address bar region, got ${target.region}`,
        };
      }
    }

    // Type (text) requires insertion target
    if (lowerAction.includes("type") && !lowerAction.includes("type")) {
      // Just checking for generic "type" action
      if (target.targetKind !== IntentTargetKind.INSERTION) {
        return {
          valid: false,
          error: `Type requires insertion target, got ${target.targetKind}`,
        };
      }
    }

    // Run/execute requires terminal control
    if (lowerAction.includes("run") || lowerAction.includes("execute")) {
      if (target.region !== RegionKind.TERMINAL) {
        return {
          valid: false,
          error: `Run/execute requires terminal region, got ${target.region}`,
        };
      }
      if (target.control !== ControlType.TERMINAL) {
        return {
          valid: false,
          error: `Run/execute requires terminal control, got ${target.control}`,
        };
      }
    }

    // Address bar specific
    if (target.region === RegionKind.ADDRESS_BAR) {
      if (lowerAction.includes("type") || lowerAction.includes("paste") || lowerAction.includes("go")) {
        // These are valid for address bar
        return { valid: true };
      }
      // Other actions may not be valid
      return {
        valid: false,
        error: `Action not supported in address bar: ${action}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check precision guard (FP-6B)
   * Simulated precision gate - in real implementation would check caret presence.
   */
  checkPrecisionGuard(target: IntentTarget, currentFocus: { control?: ControlType }): GateStatus {
    // If no control context, not applicable
    if (!currentFocus.control) {
      return GateStatus.NOT_APPLICABLE;
    }

    // For insertion targets, check if we have a valid text control
    if (target.targetKind === IntentTargetKind.INSERTION) {
      if (currentFocus.control === ControlType.TEXT_EDITOR ||
          currentFocus.control === ControlType.ADDRESS_BAR) {
        return GateStatus.PASSED;
      }
      return GateStatus.BLOCKED;
    }

    // For terminal control targets
    if (target.region === RegionKind.TERMINAL) {
      if (currentFocus.control === ControlType.TERMINAL) {
        return GateStatus.PASSED;
      }
      return GateStatus.BLOCKED;
    }

    return GateStatus.NOT_APPLICABLE;
  }

  /**
   * Check safety gate (FP-6B)
   * Simulated safety gate - in real implementation would check safety policies.
   */
  checkSafetyGate(target: IntentTarget): GateStatus {
    // Basic safety check - supported targets pass
    if (this.isTargetSupported(target.application, target.region, target.control)) {
      return GateStatus.PASSED;
    }
    return GateStatus.BLOCKED;
  }

  /**
   * Determine routing outcome based on result and context (FP-6B)
   */
  determineRoutingOutcome(
    success: boolean,
    target: IntentTarget | null,
    focusAgreement: FocusRoutingAgreement,
    precisionGate: GateStatus,
    safetyGate: GateStatus,
    error?: string
  ): RoutingOutcome {
    if (!success) {
      if (error?.includes("Unsupported")) {
        return RoutingOutcome.ABORTED_UNSUPPORTED_ROUTE;
      }
      if (error?.includes("confidence")) {
        return RoutingOutcome.ABORTED_LOW_CONFIDENCE;
      }
      return RoutingOutcome.ABORTED_UNSUPPORTED_ROUTE;
    }

    if (!target) {
      return RoutingOutcome.ABORTED_UNSUPPORTED_ROUTE;
    }

    // Check gates
    if (precisionGate === GateStatus.BLOCKED) {
      return RoutingOutcome.ABORTED_PRECISION_GUARD;
    }
    if (safetyGate === GateStatus.BLOCKED) {
      return RoutingOutcome.ABORTED_SAFETY_GATE;
    }

    // Check focus agreement
    if (focusAgreement === FocusRoutingAgreement.INCOMPATIBLE) {
      return RoutingOutcome.ABORTED_FOCUS_ROUTE_MISMATCH;
    }

    // Success - classify by resolution type
    if (target.explicitScope) {
      return RoutingOutcome.RESOLVED_EXPLICIT;
    }

    if (target.resolutionSource === ResolutionSource.IMPLICIT_RULE) {
      return RoutingOutcome.RESOLVED_IMPLICIT;
    }

    if (target.resolutionSource === ResolutionSource.FOCUS_FALLBACK) {
      return RoutingOutcome.RESOLVED_FALLBACK_DEGRADED;
    }

    return RoutingOutcome.RESOLVED_EXPLICIT;
  }

  /**
   * Route command to intent target (FP-6A)
   */
  routeCommand(request: RoutingRequest): RoutingResult {
    const timestamp = new Date().toISOString();
    const command = request.command;

    // Step 1: Check for explicit scope
    const scopeMapping = this.parseExplicitScope(command);

    // Step 2: Check for action
    const actionMapping = this.parseAction(command);

    // Build context for implicit rules
    const focusContext = {
      app: request.currentApplication,
      region: request.currentRegion,
    };

    // Route based on what we found
    if (scopeMapping) {
      // EXPLICIT SCOPE ROUTING
      const targetKind = actionMapping ? actionMapping.targetKind : IntentTargetKind.REGION;
      const control = actionMapping?.control;
      const region = scopeMapping.region || actionMapping?.region;
      const resolvedEntity = scopeMapping.application;

      const targetSupported = this.isTargetSupported(resolvedEntity, region, control);
      const focusCompatible = this.isFocusCompatible(focusContext, {
        targetKind,
        application: resolvedEntity,
        region,
        control,
        resolvedEntity,
        explicitScope: true,
        routingConfidence: RoutingConfidence.HIGH,
        ambiguity: AmbiguityStatus.NONE,
        resolutionSource: ResolutionSource.EXPLICIT_SCOPE,
        sourceCommand: command,
        timestamp,
      } as IntentTarget);

      const confidence = this.computeRoutingConfidence(
        true,
        targetSupported,
        focusCompatible,
        AmbiguityStatus.NONE
      );

      // Check if low confidence - may need to abort
      if (confidence === RoutingConfidence.LOW || !targetSupported) {
        return {
          success: false,
          target: null,
          details: `Explicit scope found but target unsupported or confidence too low`,
          error: targetSupported ? "Low confidence routing" : "Unsupported target",
        };
      }

      const target: IntentTarget = {
        targetKind,
        application: scopeMapping.application,
        region,
        control,
        resolvedEntity,
        explicitScope: true,
        routingConfidence: confidence,
        ambiguity: AmbiguityStatus.NONE,
        resolutionSource: ResolutionSource.EXPLICIT_SCOPE,
        sourceCommand: command,
        timestamp,
      };

      return {
        success: true,
        target,
        details: `Explicit scope routing: ${scopeMapping.scope}`,
      };
    } else if (actionMapping) {
      // IMPLICIT ROUTING - action only
      // Try implicit rules first
      const implicitTarget = this.applyImplicitRule(command, focusContext);

      if (implicitTarget) {
        const targetSupported = this.isTargetSupported(
          implicitTarget.application,
          implicitTarget.region,
          implicitTarget.control
        );
        const focusCompatible = this.isFocusCompatible(focusContext, implicitTarget);

        const confidence = this.computeRoutingConfidence(
          false,
          targetSupported,
          focusCompatible,
          implicitTarget.ambiguity
        );

        const finalTarget: IntentTarget = {
          ...implicitTarget,
          routingConfidence: confidence,
        };

        // Check safety gates for low confidence
        if (confidence === RoutingConfidence.LOW) {
          return {
            success: false,
            target: finalTarget,
            details: "Implicit routing but confidence too low",
            error: "Low confidence routing - requires explicit scope",
          };
        }

        return {
          success: true,
          target: finalTarget,
          details: `Implicit rule applied: ${actionMapping.action}`,
        };
      }

      // Fall back to current focus
      if (request.currentApplication) {
        const focusCompatible = actionMapping.application.toLowerCase().includes(request.currentApplication.toLowerCase()) ||
          request.currentApplication.toLowerCase().includes(actionMapping.application.toLowerCase());

        const confidence = this.computeRoutingConfidence(
          false,
          true,
          focusCompatible,
          AmbiguityStatus.HIGH
        );

        if (confidence === RoutingConfidence.LOW) {
          return {
            success: false,
            target: null,
            details: "Cannot determine target - requires explicit scope",
            error: "Ambiguous routing",
          };
        }

        const target: IntentTarget = {
          targetKind: actionMapping.targetKind,
          application: actionMapping.application,
          region: actionMapping.region,
          control: actionMapping.control,
          resolvedEntity: request.currentApplication,
          explicitScope: false,
          routingConfidence: confidence,
          ambiguity: AmbiguityStatus.HIGH,
          resolutionSource: ResolutionSource.FOCUS_FALLBACK,
          sourceCommand: command,
          timestamp,
        };

        return {
          success: true,
          target,
          details: "Routed to current focus (ambiguous)",
        };
      }

      return {
        success: false,
        target: null,
        details: "No scope or focus context available",
        error: "Cannot route - requires explicit scope or focus context",
      };
    }

    // No actionable command parts found
    return {
      success: false,
      target: null,
      details: "No routable command pattern found",
      error: "Command not recognized for routing",
    };
  }

  /**
   * Route command with full FP-6B hardening (FP-6B)
   * Returns result with extended telemetry for operational inspection.
   */
  routeCommandHardened(request: RoutingRequest): {
    result: RoutingResult;
    telemetry: RoutingTelemetry;
  } {
    const timestamp = new Date().toISOString();
    
    // Step 1: Route the command
    const result = this.routeCommand(request);
    
    // Step 2: Get focus context
    const focusContext = {
      app: request.currentApplication,
      region: request.currentRegion,
      control: request.currentControl,
    };
    
    // Step 3: Check focus-routing agreement
    const focusAgreement = result.target
      ? this.checkFocusRoutingAgreement(result.target, focusContext)
      : { agreement: FocusRoutingAgreement.NO_FOCUS_CONTEXT, shouldProceed: false, reason: "No target" };
    
    // Step 4: Check precision guard
    const precisionGate = result.target
      ? this.checkPrecisionGuard(result.target, focusContext)
      : GateStatus.NOT_APPLICABLE;
    
    // Step 5: Check safety gate
    const safetyGate = result.target
      ? this.checkSafetyGate(result.target)
      : GateStatus.NOT_APPLICABLE;
    
    // Step 6: Determine outcome
    const outcome = this.determineRoutingOutcome(
      result.success,
      result.target,
      focusAgreement.agreement,
      precisionGate,
      safetyGate,
      result.error
    );
    
    // Step 7: Build telemetry
    const telemetry: RoutingTelemetry = {
      command: request.command,
      target: result.target,
      success: result.success && focusAgreement.shouldProceed && precisionGate !== GateStatus.BLOCKED && safetyGate !== GateStatus.BLOCKED,
      outcome,
      focusRoutingAgreement: focusAgreement.agreement,
      precisionGate,
      safetyGate,
      recoveryInvoked: false, // Would be set by recovery service integration
      error: result.error,
      timestamp,
    };
    
    // Step 8: Record telemetry
    this.recordRouting(telemetry);
    
    // Step 9: If focus mismatch but not explicit scope, abort
    if (result.success && result.target && !focusAgreement.shouldProceed && !result.target.explicitScope) {
      return {
        result: {
          success: false,
          target: null,
          details: focusAgreement.reason,
          error: focusAgreement.reason,
        },
        telemetry: {
          ...telemetry,
          success: false,
          error: focusAgreement.reason,
          outcome: RoutingOutcome.ABORTED_FOCUS_ROUTE_MISMATCH,
        },
      };
    }
    
    // Step 10: If precision or safety gate blocked, abort
    if (result.success && result.target) {
      if (precisionGate === GateStatus.BLOCKED) {
        return {
          result: {
            success: false,
            target: null,
            details: "Precision guard blocked",
            error: "Precision guard blocked",
          },
          telemetry: {
            ...telemetry,
            success: false,
            error: "Precision guard blocked",
            outcome: RoutingOutcome.ABORTED_PRECISION_GUARD,
          },
        };
      }
      
      if (safetyGate === GateStatus.BLOCKED) {
        return {
          result: {
            success: false,
            target: null,
            details: "Safety gate blocked",
            error: "Safety gate blocked",
          },
          telemetry: {
            ...telemetry,
            success: false,
            error: "Safety gate blocked",
            outcome: RoutingOutcome.ABORTED_SAFETY_GATE,
          },
        };
      }
    }
    
    return { result, telemetry };
  }

  /**
   * Record routing telemetry (FP-6A)
   */
  recordRouting(telemetry: RoutingTelemetry): void {
    this.routingHistory.push(telemetry);
    if (this.routingHistory.length > this.maxHistorySize) {
      this.routingHistory = this.routingHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get routing history
   */
  getRoutingHistory(): RoutingTelemetry[] {
    return [...this.routingHistory];
  }

  /**
   * Clear routing history
   */
  clearHistory(): void {
    this.routingHistory = [];
  }
}
