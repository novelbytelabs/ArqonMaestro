/**
 * Authorization Service
 *
 * Gates commands based on speaker identity, role, and risk levels.
 * Part of FP-2A: Identity and Safety Gating
 *
 * This service:
 * 1. Evaluates authorization for commands based on identity state
 * 2. Applies role-based access control
 * 3. Determines confirmation requirements
 * 4. Integrates with security mode
 */

// Use console.log for now - can be replaced with proper logger
function log(message: string): void {
  console.log(`[Authorization] ${message}`);
}
import SpeakerVerificationService, { 
  SpeakerIdentityState,
  VerificationConfidence 
} from "./speaker-verification-service";
import SpeakerEnrollmentService, { 
  SpeakerRole,
  AuthorityScope 
} from "./speaker-enrollment-service";
import { SecurityMode } from "./security-mode-service";

/**
 * Command risk levels
 */
export enum CommandRiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  PRIVILEGED = "privileged",
}

/**
 * Authorization decision
 */
export enum AuthorizationDecision {
  ALLOW = "allow",
  DENY = "deny",
  CONFIRM = "confirm",
  BLOCK = "block",
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
  /** The decision */
  decision: AuthorizationDecision;
  /** Reason for the decision */
  reason: string;
  /** Required confirmation level if CONFIRM */
  confirmationLevel?: "low" | "medium" | "high";
  /** Risk level of the command */
  riskLevel: CommandRiskLevel;
  /** Whether this is a fallback decision */
  isFallback: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Command authorization request
 */
export interface AuthorizationRequest {
  /** Command family (e.g., "focus", "terminal", "filesystem") */
  commandFamily: string;
  /** Specific command verb */
  commandVerb: string;
  /** Target of the command */
  target?: string;
  /** Risk level of the command */
  riskLevel: CommandRiskLevel;
  /** Whether the command is destructive */
  destructive?: boolean;
  /** Whether the command is privileged */
  privileged?: boolean;
  /** Current security mode */
  securityMode: SecurityMode;
  /** Whether in shared room mode */
  sharedRoomMode: boolean;
}

/**
 * Default risk levels for command families
 */
const DEFAULT_COMMAND_RISK_LEVELS: Record<string, CommandRiskLevel> = {
  // Reflex commands - always allowed
  reflex: CommandRiskLevel.LOW,
  
  // Focus commands - generally low risk
  focus: CommandRiskLevel.LOW,
  
  // Navigation - low risk
  navigation: CommandRiskLevel.LOW,
  
  // Display/visibility - low to medium
  display: CommandRiskLevel.LOW,
  visibility: CommandRiskLevel.LOW,
  
  // Editing - medium risk
  edit: CommandRiskLevel.MEDIUM,
  selection: CommandRiskLevel.MEDIUM,
  
  // Execution - medium to high
  execution: CommandRiskLevel.MEDIUM,
  terminal: CommandRiskLevel.MEDIUM,
  build: CommandRiskLevel.MEDIUM,
  test: CommandRiskLevel.MEDIUM,
  
  // File operations - high risk
  filesystem: CommandRiskLevel.HIGH,
  file_create: CommandRiskLevel.HIGH,
  file_delete: CommandRiskLevel.HIGH,
  file_rename: CommandRiskLevel.HIGH,
  
  // System - high to privileged
  system: CommandRiskLevel.HIGH,
  settings: CommandRiskLevel.HIGH,
  process: CommandRiskLevel.HIGH,
  
  // Privileged operations
  privileged: CommandRiskLevel.PRIVILEGED,
  admin: CommandRiskLevel.PRIVILEGED,
  security: CommandRiskLevel.PRIVILEGED,
  
  // Browser - medium
  browser: CommandRiskLevel.MEDIUM,
  
  // Cognitive - low (explain, compare don't execute)
  cognitive: CommandRiskLevel.LOW,
  
  // Default
  default: CommandRiskLevel.MEDIUM,
};

/**
 * Commands that are always available regardless of identity
 */
const ALWAYS_AVAILABLE_COMMANDS = [
  "stop",
  "cancel",
  "pause",
  "mute",
  "wake",
  "sleep",
  "no",
  "undo", // when safe and scoped
];

/**
 * Service configuration
 */
export interface AuthorizationServiceConfig {
  /** Default risk level for unknown commands */
  defaultRiskLevel: CommandRiskLevel;
  /** Whether to apply security mode restrictions */
  enforceSecurityMode: boolean;
  /** Whether to apply shared room restrictions */
  enforceSharedRoomMode: boolean;
  /** Minimum confidence for high-risk commands */
  minConfidenceForHighRisk: number;
  /** Minimum confidence for privileged commands */
  minConfidenceForPrivileged: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AuthorizationServiceConfig = {
  defaultRiskLevel: CommandRiskLevel.MEDIUM,
  enforceSecurityMode: true,
  enforceSharedRoomMode: true,
  minConfidenceForHighRisk: 0.8,
  minConfidenceForPrivileged: 0.95,
};

/**
 * Authorization Service
 *
 * Evaluates authorization for commands based on identity and security context.
 */
export default class AuthorizationService {
  private verificationService: SpeakerVerificationService;
  private enrollmentService: SpeakerEnrollmentService;
  private config: AuthorizationServiceConfig;

  constructor(
    verificationService: SpeakerVerificationService,
    enrollmentService: SpeakerEnrollmentService,
    config: Partial<AuthorizationServiceConfig> = {}
  ) {
    this.verificationService = verificationService;
    this.enrollmentService = enrollmentService;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Authorize a command
   */
  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const { 
      commandFamily, 
      commandVerb,
      riskLevel, 
      securityMode, 
      sharedRoomMode 
    } = request;

    // Check if command is always available (reflex-like)
    if (this.isAlwaysAvailable(commandVerb)) {
      return {
        decision: AuthorizationDecision.ALLOW,
        reason: "Command is always available",
        riskLevel,
        isFallback: false,
      };
    }

    // Get current identity state
    const identityState = this.verificationService.getIdentityState();
    const confidence = this.verificationService.getConfidenceValue();
    const isVerified = this.verificationService.isVerified();
    const identityId = this.verificationService.getCurrentIdentityId();
    const role = this.verificationService.getCurrentRole();

    // Apply security mode restrictions
    if (this.config.enforceSecurityMode && securityMode === SecurityMode.RESTRICTED) {
      // In restricted mode, only allow low-risk commands from verified speakers
      if (riskLevel !== CommandRiskLevel.LOW) {
        return {
          decision: AuthorizationDecision.BLOCK,
          reason: "Restricted mode: only low-risk commands allowed",
          riskLevel,
          isFallback: false,
        };
      }
    }

    // Apply shared room mode restrictions
    if (this.config.enforceSharedRoomMode && sharedRoomMode) {
      const sharedRoomResult = this.applySharedRoomRestrictions(
        commandVerb,
        riskLevel,
        isVerified,
        confidence
      );
      if (sharedRoomResult) {
        return sharedRoomResult;
      }
    }

    // Apply secure mode restrictions
    if (this.config.enforceSecurityMode && securityMode === SecurityMode.SECURE) {
      const secureResult = this.applySecureModeRestrictions(
        riskLevel,
        isVerified,
        confidence,
        identityState
      );
      if (secureResult) {
        return secureResult;
      }
    }

    // Handle unverified/unknown identity
    if (!isVerified) {
      return this.handleUnverifiedIdentity(commandVerb, riskLevel, confidence);
    }

    // Handle verified identity
    if (identityId) {
      return this.handleVerifiedIdentity(
        identityId,
        role,
        commandVerb,
        commandFamily,
        riskLevel,
        confidence
      );
    }

    // Default deny
    return {
      decision: AuthorizationDecision.DENY,
      reason: "Unable to determine authorization",
      riskLevel,
      isFallback: false,
    };
  }

  /**
   * Check if command is always available
   */
  private isAlwaysAvailable(commandVerb: string): boolean {
    return ALWAYS_AVAILABLE_COMMANDS.includes(commandVerb.toLowerCase());
  }

  /**
   * Apply shared room mode restrictions
   */
  private applySharedRoomRestrictions(
    commandVerb: string,
    riskLevel: CommandRiskLevel,
    isVerified: boolean,
    confidence: number
  ): AuthorizationResult | null {
    // Contamination check
    if (this.verificationService.isContaminated()) {
      // In shared room with contamination, block high-risk, confirm medium-risk
      if (riskLevel === CommandRiskLevel.HIGH || riskLevel === CommandRiskLevel.PRIVILEGED) {
        return {
          decision: AuthorizationDecision.BLOCK,
          reason: "Shared room: contamination detected, blocking high-risk command",
          riskLevel,
          isFallback: false,
        };
      }
      
      if (riskLevel === CommandRiskLevel.MEDIUM) {
        return {
          decision: AuthorizationDecision.CONFIRM,
          reason: "Shared room: confirmation required for medium-risk command",
          confirmationLevel: "high",
          riskLevel,
          isFallback: false,
        };
      }
    }

    // Unknown speaker in shared room - stricter
    if (!isVerified) {
      if (riskLevel === CommandRiskLevel.HIGH || riskLevel === CommandRiskLevel.PRIVILEGED) {
        return {
          decision: AuthorizationDecision.BLOCK,
          reason: "Shared room: unknown speaker blocked from high-risk command",
          riskLevel,
          isFallback: false,
        };
      }
      
      if (riskLevel === CommandRiskLevel.MEDIUM) {
        return {
          decision: AuthorizationDecision.CONFIRM,
          reason: "Shared room: confirmation required for medium-risk command",
          confirmationLevel: "medium",
          riskLevel,
          isFallback: false,
        };
      }
    }

    return null;
  }

  /**
   * Apply secure mode restrictions
   */
  private applySecureModeRestrictions(
    riskLevel: CommandRiskLevel,
    isVerified: boolean,
    confidence: number,
    identityState: SpeakerIdentityState
  ): AuthorizationResult | null {
    // Unverified in secure mode - block high-risk
    if (!isVerified) {
      if (riskLevel === CommandRiskLevel.HIGH || riskLevel === CommandRiskLevel.PRIVILEGED) {
        return {
          decision: AuthorizationDecision.BLOCK,
          reason: "Secure mode: verification required for high-risk command",
          riskLevel,
          isFallback: false,
        };
      }
      
      if (riskLevel === CommandRiskLevel.MEDIUM) {
        return {
          decision: AuthorizationDecision.CONFIRM,
          reason: "Secure mode: confirmation required for medium-risk command",
          confirmationLevel: "high",
          riskLevel,
          isFallback: false,
        };
      }
    }

    // Check confidence levels for secure mode
    if (isVerified) {
      if (riskLevel === CommandRiskLevel.PRIVILEGED && 
          confidence < this.config.minConfidenceForPrivileged) {
        return {
          decision: AuthorizationDecision.CONFIRM,
          reason: "Secure mode: higher confidence required for privileged command",
          confirmationLevel: "high",
          riskLevel,
          isFallback: false,
        };
      }
      
      if (riskLevel === CommandRiskLevel.HIGH && 
          confidence < this.config.minConfidenceForHighRisk) {
        return {
          decision: AuthorizationDecision.CONFIRM,
          reason: "Secure mode: higher confidence required for high-risk command",
          confirmationLevel: "medium",
          riskLevel,
          isFallback: false,
        };
      }
    }

    return null;
  }

  /**
   * Handle unverified identity authorization
   */
  private handleUnverifiedIdentity(
    commandVerb: string,
    riskLevel: CommandRiskLevel,
    confidence: number
  ): AuthorizationResult {
    // Low-risk commands allowed for unknown (with warning maybe)
    if (riskLevel === CommandRiskLevel.LOW) {
      return {
        decision: AuthorizationDecision.ALLOW,
        reason: "Low-risk command allowed for unknown speaker",
        riskLevel,
        isFallback: true,
      };
    }

    // Medium-risk requires confirmation
    if (riskLevel === CommandRiskLevel.MEDIUM) {
      return {
        decision: AuthorizationDecision.CONFIRM,
        reason: "Medium-risk command requires confirmation from unknown speaker",
        confirmationLevel: "medium",
        riskLevel,
        isFallback: true,
      };
    }

    // High and privileged blocked
    return {
      decision: AuthorizationDecision.BLOCK,
      reason: `High-risk command blocked for unknown speaker`,
      riskLevel,
      isFallback: false,
    };
  }

  /**
   * Handle verified identity authorization
   */
  private handleVerifiedIdentity(
    identityId: string,
    role: SpeakerRole | undefined,
    commandVerb: string,
    commandFamily: string,
    riskLevel: CommandRiskLevel,
    confidence: number
  ): AuthorizationResult {
    // Get enrollment for authority scope
    const enrollment = this.enrollmentService.getEnrollment(identityId);
    
    if (!enrollment) {
      return {
        decision: AuthorizationDecision.DENY,
        reason: "Enrollment not found",
        riskLevel,
        isFallback: false,
      };
    }

    // Check role-based restrictions
    if (role === SpeakerRole.GUEST) {
      // Guests have limited rights
      if (riskLevel === CommandRiskLevel.HIGH || riskLevel === CommandRiskLevel.PRIVILEGED) {
        return {
          decision: AuthorizationDecision.BLOCK,
          reason: "Guest role not authorized for high-risk commands",
          riskLevel,
          isFallback: false,
        };
      }
      
      if (riskLevel === CommandRiskLevel.MEDIUM) {
        return {
          decision: AuthorizationDecision.CONFIRM,
          reason: "Guest role requires confirmation for medium-risk commands",
          confirmationLevel: "medium",
          riskLevel,
          isFallback: false,
        };
      }
    }

    // Check authority scope
    const authorityScope = enrollment.authorityScope;
    
    // Check blocked commands
    if (authorityScope.blockedCommands?.includes(commandVerb)) {
      return {
        decision: AuthorizationDecision.BLOCK,
        reason: `Command '${commandVerb}' is blocked for this user`,
        riskLevel,
        isFallback: false,
      };
    }

    // Check allowed command families
    if (authorityScope.allowedCommandFamilies?.length) {
      if (!authorityScope.allowedCommandFamilies.includes(commandFamily)) {
        return {
          decision: AuthorizationDecision.BLOCK,
          reason: `Command family '${commandFamily}' not allowed for this user`,
          riskLevel,
          isFallback: false,
        };
      }
    }

    // Check allowed risk levels
    if (!authorityScope.allowedRiskLevels.includes(riskLevel)) {
      return {
        decision: AuthorizationDecision.DENY,
        reason: `Risk level '${riskLevel}' not allowed for this user`,
        riskLevel,
        isFallback: false,
      };
    }

    // Check always-confirm commands
    if (authorityScope.alwaysConfirmCommands?.includes(commandVerb)) {
      return {
        decision: AuthorizationDecision.CONFIRM,
        reason: "Command requires confirmation per user policy",
        confirmationLevel: "low",
        riskLevel,
        isFallback: false,
      };
    }

    // Default allow for verified users within scope
    return {
      decision: AuthorizationDecision.ALLOW,
      reason: `Authorized: ${role} with sufficient scope`,
      riskLevel,
      isFallback: false,
    };
  }

  /**
   * Get default risk level for a command family
   */
  getDefaultRiskLevel(commandFamily: string): CommandRiskLevel {
    return DEFAULT_COMMAND_RISK_LEVELS[commandFamily] || this.config.defaultRiskLevel;
  }

  /**
   * Check if a command requires confirmation
   */
  requiresConfirmation(
    commandFamily: string,
    securityMode: SecurityMode,
    isVerified: boolean
  ): boolean {
    const riskLevel = this.getDefaultRiskLevel(commandFamily);
    
    // Always confirm high/privileged in secure mode for unverified
    if (securityMode === SecurityMode.SECURE && !isVerified) {
      return riskLevel !== CommandRiskLevel.LOW;
    }
    
    // Always confirm privileged
    if (riskLevel === CommandRiskLevel.PRIVILEGED) {
      return true;
    }
    
    return riskLevel === CommandRiskLevel.HIGH;
  }
}

// Re-export SecurityMode for backward compatibility
export { SecurityMode } from "./security-mode-service";
