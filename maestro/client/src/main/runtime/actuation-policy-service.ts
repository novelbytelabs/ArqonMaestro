import Log from "../log";

/**
 * Policy decision outcomes as defined in maestro-actuation-policy-engine.md
 */
export type PolicyDecisionType =
  | "approve_route"
  | "approve_with_confirmation"
  | "approve_with_chooser"
  | "downgrade_route"
  | "retry_route"
  | "block_route"
  | "refuse_command";

/**
 * Trust tier levels as defined in the actuation policy engine docs.
 * Tier 1 = native semantic (preferred), Tier 4 = raw visual (fallback)
 */
export type TrustTier = 1 | 2 | 3 | 4;

/**
 * Security mode affecting route policy decisions
 */
export type SecurityMode = "standard" | "secure" | "shared_room";

/**
 * Command risk classification for policy decisions
 */
export type CommandRisk = "low" | "medium" | "high";

/**
 * Route class types for policy evaluation
 */
export type RouteClass =
  | "native_semantic"
  | "plugin_assisted"
  | "structured_command"
  | "accessibility"
  | "visual_actuation"
  | "talon_fallback";

/**
 * Policy factors that influenced the decision
 */
export interface PolicyFactor {
  name: string;
  value: string;
  weight: number;
}

/**
 * Blocked route information for auditing
 */
export interface BlockedRouteInfo {
  route: string;
  reason: string;
  blockedBy?: string;
}

/**
 * Alternative route considered during policy evaluation
 */
export interface ConsideredRoute {
  route: string;
  routeClass: RouteClass;
  trustTier: TrustTier;
  available: boolean;
  blocked?: boolean;
  blockReason?: string;
  semanticFidelity: number;
  safetyCompatible: boolean;
}

/**
 * Structured explanation for route decision (satisfies "why" questions)
 */
export interface RouteExplanation {
  chosenRoute: string;
  chosenRouteClass: RouteClass;
  chosenTrustTier: TrustTier;
  alternativesConsidered: ConsideredRoute[];
  blockedRoutes: BlockedRouteInfo[];
  policyFactors: PolicyFactor[];
  decision: PolicyDecisionType;
  requiresConfirmation: boolean;
  requiresChooser: boolean;
  downgradeApplied: boolean;
  downgradeFrom?: string;
  summary: string;
}

/**
 * Policy context input for decision making
 */
export interface PolicyContext {
  commandTypes: string[];
  commandFamilies: string[];
  targetSurface?: string;
  currentApp?: string;
  securityMode: SecurityMode;
  speakerVerified: boolean;
  interactionMode?: "command" | "dictation" | "conversation";
  recentRouteReliability?: Map<string, number>;
  userRoutingPreferences?: Map<string, string>;
}

/**
 * Policy decision output
 */
export interface PolicyDecision {
  decision: PolicyDecisionType;
  approvedRoute?: string;
  approvedRouteClass?: RouteClass;
  approvedTrustTier?: TrustTier;
  confirmationRequired: boolean;
  chooserRequired: boolean;
  retryStrategy?: string;
  explanation: RouteExplanation;
  decisionMadeAt: number;
}

/**
 * Actuation Policy Service v0.1
 * 
 * Implements the policy engine defined in maestro-actuation-policy-engine.md.
 * 
 * Responsibilities:
 * - Evaluate candidate routes against policy rules
 * - Apply trust tier constraints based on security mode
 * - Determine downgrade eligibility
 * - Produce structured explanations for "why" questions
 * - Block routes that violate policy constraints
 */
export default class ActuationPolicyService {
  private log: Log;

  constructor(log: Log) {
    this.log = log;
  }

  /**
   * Make a policy decision for a given dispatch plan and context.
   * This is the main entry point for the policy engine.
   */
  decide(
    dispatchRoute: string,
    dispatchFamily: string,
    context: PolicyContext
  ): PolicyDecision {
    const decisionStartTime = Date.now();
    
    // Get the route class and trust tier for the proposed route
    const routeClass = this.classifyRouteClass(dispatchRoute);
    const trustTier = this.classifyTrustTier(dispatchRoute, routeClass);
    
    // Build list of considered routes (just the primary for now, can expand)
    const alternativesConsidered: ConsideredRoute[] = [
      {
        route: dispatchRoute,
        routeClass,
        trustTier,
        available: true,
        semanticFidelity: this.assessSemanticFidelity(dispatchRoute, dispatchFamily),
        safetyCompatible: this.isSafetyCompatible(dispatchRoute, context),
      },
    ];
    
    // Evaluate policy factors
    const policyFactors = this.evaluatePolicyFactors(
      dispatchRoute,
      dispatchFamily,
      routeClass,
      trustTier,
      context
    );
    
    // Check if route is blocked by security policy
    const blockedRoutes: BlockedRouteInfo[] = [];
    const securityBlockReason = this.checkSecurityPolicy(dispatchRoute, routeClass, context);
    if (securityBlockReason) {
      alternativesConsidered[0].blocked = true;
      alternativesConsidered[0].blockReason = securityBlockReason;
      blockedRoutes.push({
        route: dispatchRoute,
        reason: securityBlockReason,
        blockedBy: "security_policy",
      });
      
      const decision: PolicyDecision = {
        decision: "block_route",
        confirmationRequired: false,
        chooserRequired: false,
        explanation: this.buildExplanation(
          dispatchRoute,
          routeClass,
          trustTier,
          alternativesConsidered,
          blockedRoutes,
          policyFactors,
          "block_route",
          false,
          false
        ),
        decisionMadeAt: Date.now() - decisionStartTime,
      };
      
      this.logPolicyDecision(decision, context);
      return decision;
    }
    
    // Check if confirmation is required
    const requiresConfirmation = this.requiresConfirmation(
      dispatchRoute,
      routeClass,
      trustTier,
      context
    );
    
    // Check if chooser is required (multiple valid routes with different semantics)
    const requiresChooser = this.requiresChooser(dispatchFamily, alternativesConsidered);
    
    // Determine downgrade eligibility
    const downgradeFrom = this.checkDowngradeEligibility(
      dispatchRoute,
      routeClass,
      trustTier,
      context
    );
    const downgradeApplied = downgradeFrom !== undefined;
    
    // Determine final decision
    let decisionType: PolicyDecisionType;
    if (requiresConfirmation) {
      decisionType = "approve_with_confirmation";
    } else if (requiresChooser) {
      decisionType = "approve_with_chooser";
    } else if (downgradeApplied) {
      decisionType = "downgrade_route";
    } else {
      decisionType = "approve_route";
    }
    
    const decision: PolicyDecision = {
      decision: decisionType,
      approvedRoute: dispatchRoute,
      approvedRouteClass: routeClass,
      approvedTrustTier: trustTier,
      confirmationRequired: requiresConfirmation,
      chooserRequired: requiresChooser,
      retryStrategy: undefined,
      explanation: this.buildExplanation(
        dispatchRoute,
        routeClass,
        trustTier,
        alternativesConsidered,
        blockedRoutes,
        policyFactors,
        decisionType,
        requiresConfirmation,
        requiresChooser,
        downgradeFrom
      ),
      decisionMadeAt: Date.now() - decisionStartTime,
    };
    
    this.logPolicyDecision(decision, context);
    return decision;
  }

  /**
   * Classify a dispatch route into its route class
   */
  private classifyRouteClass(dispatchRoute: string): RouteClass {
    switch (dispatchRoute) {
      case "reflex_local":
      case "focus_local":
      case "execution_local":
      case "app_control_local":
      case "editing_local":
      case "composite_local":
        return "native_semantic";
      
      case "focus_plugin":
      case "navigation_plugin":
      case "editing_plugin":
      case "system_plugin":
        return "plugin_assisted";
      
      case "mixed_plugin_assisted":
        return "structured_command";
      
      case "talon_fallback":
        return "talon_fallback";
      
      case "presentation_only":
        return "native_semantic";
      
      case "legacy_executor":
      case "mixed_legacy":
      case "unknown_legacy":
      default:
        return "visual_actuation";
    }
  }

  /**
   * Classify the trust tier for a route
   */
  private classifyTrustTier(dispatchRoute: string, routeClass: RouteClass): TrustTier {
    // Trust tier follows the policy engine law: semantic > plugin > structured > accessibility > visual
    switch (routeClass) {
      case "native_semantic":
        return 1;
      case "plugin_assisted":
        return 2;
      case "structured_command":
        return 2;
      case "accessibility":
        return 3;
      case "talon_fallback":
        return 4;
      case "visual_actuation":
        return 4;
      default:
        return 4;
    }
  }

  /**
   * Assess semantic fidelity (how well the route preserves intended meaning)
   */
  private assessSemanticFidelity(dispatchRoute: string, dispatchFamily: string): number {
    // Higher = better semantic preservation
    switch (dispatchRoute) {
      case "reflex_local":
      case "focus_local":
      case "execution_local":
        return 1.0;
      
      case "app_control_local":
      case "editing_local":
      case "composite_local":
        return 0.95;
      
      case "focus_plugin":
      case "navigation_plugin":
      case "editing_plugin":
      case "system_plugin":
        return 0.85;
      
      case "mixed_plugin_assisted":
        return 0.7;
      
      case "talon_fallback":
        return 0.5;
      
      case "legacy_executor":
      case "mixed_legacy":
      case "unknown_legacy":
        return 0.4;
      
      case "presentation_only":
        return 0.0;
      
      default:
        return 0.3;
    }
  }

  /**
   * Check if route is safety-compatible for the context
   */
  private isSafetyCompatible(dispatchRoute: string, context: PolicyContext): boolean {
    // Most local routes are safety compatible
    const safeRoutes = new Set([
      "reflex_local",
      "focus_local", 
      "execution_local",
      "app_control_local",
      "editing_local",
      "composite_local",
      "presentation_only",
    ]);
    
    if (safeRoutes.has(dispatchRoute)) {
      return true;
    }
    
    // Plugin-assisted routes depend on plugin availability
    const pluginRoutes = new Set([
      "focus_plugin",
      "navigation_plugin", 
      "editing_plugin",
      "system_plugin",
      "mixed_plugin_assisted",
    ]);
    
    if (pluginRoutes.has(dispatchRoute)) {
      return context.currentApp !== undefined;
    }
    
    // Visual/talon fallback requires careful consideration
    return false;
  }

  /**
   * Evaluate policy factors that influence the decision
   */
  private evaluatePolicyFactors(
    dispatchRoute: string,
    dispatchFamily: string,
    routeClass: RouteClass,
    trustTier: TrustTier,
    context: PolicyContext
  ): PolicyFactor[] {
    const factors: PolicyFactor[] = [];
    
    // Trust tier factor
    factors.push({
      name: "trust_tier",
      value: trustTier.toString(),
      weight: 3.0,
    });
    
    // Security mode factor
    factors.push({
      name: "security_mode",
      value: context.securityMode,
      weight: context.securityMode === "secure" ? 4.0 : context.securityMode === "shared_room" ? 3.5 : 1.0,
    });

    factors.push({
      name: "interaction_mode",
      value: context.interactionMode || "command",
      weight: context.interactionMode === "dictation" ? 3.0 : 1.0,
    });
    
    // Speaker verification factor
    factors.push({
      name: "speaker_verified",
      value: context.speakerVerified.toString(),
      weight: context.speakerVerified ? 0.5 : 2.0,
    });
    
    // Route class factor
    factors.push({
      name: "route_class",
      value: routeClass,
      weight: 2.0,
    });
    
    // Command family factor
    if (dispatchFamily) {
      factors.push({
        name: "command_family",
        value: dispatchFamily,
        weight: 1.5,
      });
    }
    
    // Reflex commands get special treatment (they're sacred/time-critical)
    if (dispatchRoute === "reflex_local") {
      factors.push({
        name: "reflex_priority",
        value: "true",
        weight: 5.0,
      });
    }
    
    return factors;
  }

  /**
   * Check if security policy blocks this route
   */
  private checkSecurityPolicy(
    dispatchRoute: string,
    routeClass: RouteClass,
    context: PolicyContext
  ): string | null {
    // Dictation mode is not an operating-command execution lane.
    // Reflex remains available for safety.
    if (context.interactionMode === "dictation" && dispatchRoute !== "reflex_local") {
      return "non_reflex_route_blocked_in_dictation_mode";
    }

    // In secure mode, Tier 4 routes are heavily restricted
    if (context.securityMode === "secure") {
      if (routeClass === "visual_actuation") {
        return "visual_actuation_blocked_in_secure_mode";
      }
      if (routeClass === "talon_fallback") {
        return "talon_fallback_blocked_in_secure_mode";
      }
    }
    
    // In shared room mode, restrict visual/talon routes
    if (context.securityMode === "shared_room") {
      if (routeClass === "visual_actuation") {
        return "visual_actuation_restricted_in_shared_room";
      }
      if (routeClass === "talon_fallback" && !context.speakerVerified) {
        return "talon_requires_verification_in_shared_room";
      }
    }
    
    // Block legacy routes in secure mode
    if (context.securityMode === "secure") {
      const legacyRoutes = new Set(["legacy_executor", "mixed_legacy", "unknown_legacy"]);
      if (legacyRoutes.has(dispatchRoute)) {
        return "legacy_routes_blocked_in_secure_mode";
      }
    }
    
    return null;
  }

  /**
   * Check if confirmation is required for this route
   */
  private requiresConfirmation(
    dispatchRoute: string,
    routeClass: RouteClass,
    trustTier: TrustTier,
    context: PolicyContext
  ): boolean {
    // Reflex commands don't require confirmation
    if (dispatchRoute === "reflex_local") {
      return false;
    }

    if (context.interactionMode === "dictation") {
      return true;
    }
    
    // In secure mode, lower trust tiers require confirmation
    if (context.securityMode === "secure" && trustTier >= 3) {
      return true;
    }
    
    // Talon fallback always requires confirmation in standard mode
    if (routeClass === "talon_fallback") {
      return true;
    }
    
    // Visual actuation requires confirmation
    if (routeClass === "visual_actuation") {
      return true;
    }
    
    // Shared room mode increases confirmation requirements
    if (context.securityMode === "shared_room" && trustTier >= 3) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if chooser is required (multiple valid routes with different semantics)
   */
  private requiresChooser(dispatchFamily: string, alternatives: ConsideredRoute[]): boolean {
    // For now, only trigger chooser when there are genuinely multiple valid alternatives
    // This would be expanded when we have multiple candidate routes
    
    // If there are multiple available routes with different trust tiers, chooser may help
    const availableRoutes = alternatives.filter(a => a.available && !a.blocked);
    if (availableRoutes.length > 1) {
      // Check if they have meaningfully different characteristics
      const trustTiers = new Set(availableRoutes.map(a => a.trustTier));
      if (trustTiers.size > 1) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if downgrade should be applied
   */
  private checkDowngradeEligibility(
    dispatchRoute: string,
    routeClass: RouteClass,
    trustTier: TrustTier,
    context: PolicyContext
  ): string | undefined {
    // Don't downgrade reflex commands
    if (dispatchRoute === "reflex_local") {
      return undefined;
    }
    
    // In secure mode, we don't allow downgrades - we block instead
    if (context.securityMode === "secure") {
      return undefined;
    }
    
    // Check if higher trust tier route is available but we're using lower
    // This is a simplified version - full implementation would check capability registry
    
    // For now, don't auto-downgrade - let the dispatcher choose the best available
    return undefined;
  }

  /**
   * Build the structured explanation for the decision
   */
  private buildExplanation(
    dispatchRoute: string,
    routeClass: RouteClass,
    trustTier: TrustTier,
    alternativesConsidered: ConsideredRoute[],
    blockedRoutes: BlockedRouteInfo[],
    policyFactors: PolicyFactor[],
    decision: PolicyDecisionType,
    requiresConfirmation: boolean,
    requiresChooser: boolean,
    downgradeFrom?: string
  ): RouteExplanation {
    // Generate summary text
    let summary = "";
    switch (decision) {
      case "approve_route":
        summary = `Route ${dispatchRoute} approved. Trust tier ${trustTier}, class ${routeClass}.`;
        break;
      case "approve_with_confirmation":
        summary = `Route ${dispatchRoute} approved with confirmation required.`;
        break;
      case "approve_with_chooser":
        summary = `Route ${dispatchRoute} approved. Multiple alternatives available - user chooser may help.`;
        break;
      case "downgrade_route":
        summary = `Downgraded from ${downgradeFrom} to ${dispatchRoute}.`;
        break;
      case "block_route":
        summary = `Route ${dispatchRoute} blocked by policy.`;
        if (blockedRoutes.length > 0) {
          summary += ` Reason: ${blockedRoutes[0].reason}`;
        }
        break;
      case "refuse_command":
        summary = `Command refused - no policy-safe route available.`;
        break;
      default:
        summary = `Policy decision: ${decision}`;
    }
    
    // Add security mode context to summary
    if (decision === "approve_with_confirmation" || decision === "block_route") {
      summary += " Policy factors applied per security settings.";
    }
    
    return {
      chosenRoute: dispatchRoute,
      chosenRouteClass: routeClass,
      chosenTrustTier: trustTier,
      alternativesConsidered,
      blockedRoutes,
      policyFactors,
      decision,
      requiresConfirmation,
      requiresChooser,
      downgradeApplied: downgradeFrom !== undefined,
      downgradeFrom,
      summary,
    };
  }

  /**
   * Log the policy decision for observability
   */
  private logPolicyDecision(decision: PolicyDecision, context: PolicyContext): void {
    this.log.logVerbose(
      `[ActuationPolicy] ${JSON.stringify({
        decision: decision.decision,
        approvedRoute: decision.approvedRoute,
        trustTier: decision.approvedTrustTier,
        confirmationRequired: decision.confirmationRequired,
        chooserRequired: decision.chooserRequired,
        summary: decision.explanation.summary,
        securityMode: context.securityMode,
        speakerVerified: context.speakerVerified,
        interactionMode: context.interactionMode || "command",
        decisionMadeAt: decision.decisionMadeAt,
      })}`
    );
  }

  /**
   * Get the trust tier for a route (public API for other services)
   */
  getRouteTrustTier(dispatchRoute: string): TrustTier {
    const routeClass = this.classifyRouteClass(dispatchRoute);
    return this.classifyTrustTier(dispatchRoute, routeClass);
  }

  /**
   * Check if a route is allowed in the current security mode
   */
  isRouteAllowedInSecurityMode(dispatchRoute: string, securityMode: SecurityMode): boolean {
    const routeClass = this.classifyRouteClass(dispatchRoute);
    
    if (securityMode === "secure") {
      return routeClass !== "visual_actuation" && 
             routeClass !== "talon_fallback" &&
             !new Set(["legacy_executor", "mixed_legacy", "unknown_legacy"]).has(dispatchRoute);
    }
    
    if (securityMode === "shared_room") {
      // More permissive but still restricted
      return true;
    }
    
    // Standard mode - all routes allowed
    return true;
  }
}
