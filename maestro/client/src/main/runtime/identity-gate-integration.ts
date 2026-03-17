/**
 * Identity Gate Integration for Route Approval
 *
 * Provides identity-based gating for the intent routing service.
 * Part of FP-2A: Identity and Safety Gating
 *
 * This module provides:
 * 1. IdentityGateStatus - gate status for routing telemetry
 * 2. IdentityGateResult - result of identity authorization check
 * 3. Integration helpers for routing service
 */

// Use console.log for now - can be replaced with proper logger
function log(message: string): void {
  console.log(`[IdentityGate] ${message}`);
}
import IdentityGatewayService from "./identity-gateway-service";
import { 
  AuthorizationDecision, 
  CommandRiskLevel 
} from "./authorization-service";

/**
 * Identity gate status for routing telemetry
 */
export enum IdentityGateStatus {
  /** Gate passed - identity authorized */
  PASSED = "passed",
  /** Gate blocked - identity not authorized */
  BLOCKED = "blocked",
  /** Gate requires confirmation */
  CONFIRMATION_REQUIRED = "confirmation_required",
  /** Gate not applicable (no identity check needed) */
  NOT_APPLICABLE = "not_applicable",
  /** Gate failed - error during check */
  FAILED = "failed",
}

/**
 * Result of identity gate check
 */
export interface IdentityGateResult {
  /** Gate status */
  status: IdentityGateStatus;
  /** Authorization decision */
  decision: AuthorizationDecision;
  /** Reason for the decision */
  reason: string;
  /** Whether confirmation is required */
  confirmationRequired: boolean;
  /** Required confirmation level if applicable */
  confirmationLevel?: "low" | "medium" | "high";
  /** Whether command should proceed */
  shouldProceed: boolean;
}

/**
 * Create identity gate for routing
 */
export function createIdentityGate(identityGateway: IdentityGatewayService) {
  /**
   * Check identity gate for a command
   * 
   * @param commandFamily - The command family (e.g., "focus", "terminal")
   * @param commandVerb - The command verb
   * @param riskLevel - Optional risk level (auto-detected if not provided)
   * @returns Identity gate result
   */
  async function checkIdentityGate(
    commandFamily: string,
    commandVerb: string,
    riskLevel?: CommandRiskLevel
  ): Promise<IdentityGateResult> {
    try {
      // Authorize the command
      const authResult = await identityGateway.authorize({
        commandFamily,
        commandVerb,
        riskLevel,
      });

      // Map authorization decision to identity gate status
      switch (authResult.decision) {
        case AuthorizationDecision.ALLOW:
          return {
            status: IdentityGateStatus.PASSED,
            decision: authResult.decision,
            reason: authResult.reason,
            confirmationRequired: false,
            shouldProceed: true,
          };

        case AuthorizationDecision.CONFIRM:
          return {
            status: IdentityGateStatus.CONFIRMATION_REQUIRED,
            decision: authResult.decision,
            reason: authResult.reason,
            confirmationRequired: true,
            confirmationLevel: authResult.confirmationLevel,
            shouldProceed: false, // Requires external confirmation
          };

        case AuthorizationDecision.DENY:
          return {
            status: IdentityGateStatus.BLOCKED,
            decision: authResult.decision,
            reason: authResult.reason,
            confirmationRequired: false,
            shouldProceed: false,
          };

        case AuthorizationDecision.BLOCK:
          return {
            status: IdentityGateStatus.BLOCKED,
            decision: authResult.decision,
            reason: authResult.reason,
            confirmationRequired: false,
            shouldProceed: false,
          };

        default:
          return {
            status: IdentityGateStatus.FAILED,
            decision: authResult.decision,
            reason: `Unknown decision: ${authResult.decision}`,
            confirmationRequired: false,
            shouldProceed: false,
          };
      }
    } catch (error) {
      log(`[IdentityGate] Error checking gate: ${error}`);
      return {
        status: IdentityGateStatus.FAILED,
        decision: AuthorizationDecision.DENY,
        reason: `Error during identity check: ${error}`,
        confirmationRequired: false,
        shouldProceed: false,
      };
    }
  }

  /**
   * Quick check if gate passes (for fast-path decisions)
   */
  async function isCommandAllowed(commandFamily: string, riskLevel?: CommandRiskLevel): Promise<boolean> {
    return identityGateway.isCommandAllowed(commandFamily, riskLevel);
  }

  /**
   * Get current identity context for logging/telemetry
   */
  function getIdentityContext() {
    return identityGateway.getIdentityContext();
  }

  /**
   * Get authorization summary for debugging
   */
  function getAuthorizationSummary(): string {
    return identityGateway.getAuthorizationSummary();
  }

  return {
    checkIdentityGate,
    isCommandAllowed,
    getIdentityContext,
    getAuthorizationSummary,
  };
}

/**
 * Identity Gate Integration type
 */
export type IdentityGate = ReturnType<typeof createIdentityGate>;

/**
 * Map identity gate status to routing outcome
 * Used to convert identity gate result to routing service outcome
 */
export function mapIdentityGateToRoutingOutcome(
  gateResult: IdentityGateResult
): { shouldProceed: boolean; error?: string } {
  switch (gateResult.status) {
    case IdentityGateStatus.PASSED:
      return { shouldProceed: true };

    case IdentityGateStatus.CONFIRMATION_REQUIRED:
      return { 
        shouldProceed: false, 
        error: `Identity confirmation required: ${gateResult.reason}` 
      };

    case IdentityGateStatus.BLOCKED:
      return { 
        shouldProceed: false, 
        error: `Identity gate blocked: ${gateResult.reason}` 
      };

    case IdentityGateStatus.FAILED:
      return { 
        shouldProceed: false, 
        error: `Identity gate failed: ${gateResult.reason}` 
      };

    case IdentityGateStatus.NOT_APPLICABLE:
    default:
      return { shouldProceed: true };
  }
}

/**
 * Risk level mappings for common command families
 * Used to determine risk level when not explicitly provided
 */
export const COMMAND_FAMILY_RISK_LEVELS: Record<string, CommandRiskLevel> = {
  // Focus commands - generally low risk
  focus: CommandRiskLevel.LOW,
  
  // Navigation - low risk
  navigation: CommandRiskLevel.LOW,
  
  // Display - low risk
  display: CommandRiskLevel.LOW,
  visibility: CommandRiskLevel.LOW,
  
  // Editing - medium risk
  edit: CommandRiskLevel.MEDIUM,
  selection: CommandRiskLevel.MEDIUM,
  
  // Execution - medium risk
  execution: CommandRiskLevel.MEDIUM,
  terminal: CommandRiskLevel.MEDIUM,
  build: CommandRiskLevel.MEDIUM,
  test: CommandRiskLevel.MEDIUM,
  
  // File operations - high risk
  filesystem: CommandRiskLevel.HIGH,
  file_create: CommandRiskLevel.HIGH,
  file_delete: CommandRiskLevel.HIGH,
  file_rename: CommandRiskLevel.HIGH,
  
  // System - high risk
  system: CommandRiskLevel.HIGH,
  settings: CommandRiskLevel.HIGH,
  process: CommandRiskLevel.HIGH,
  
  // Privileged operations
  privileged: CommandRiskLevel.PRIVILEGED,
  admin: CommandRiskLevel.PRIVILEGED,
  security: CommandRiskLevel.PRIVILEGED,
  
  // Browser - medium
  browser: CommandRiskLevel.MEDIUM,
  
  // Cognitive - low
  cognitive: CommandRiskLevel.LOW,
  
  // Default
  default: CommandRiskLevel.MEDIUM,
};

/**
 * Get risk level for a command family
 */
export function getRiskLevelForCommandFamily(commandFamily: string): CommandRiskLevel {
  return COMMAND_FAMILY_RISK_LEVELS[commandFamily] || CommandRiskLevel.MEDIUM;
}
