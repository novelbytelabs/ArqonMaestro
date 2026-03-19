/**
 * Identity Gateway Service
 *
 * Unified interface for identity and authorization services.
 * Part of FP-2A: Identity and Safety Gating
 *
 * This service:
 * 1. Provides unified API for all identity operations
 * 2. Integrates enrollment, verification, authorization, and security mode
 * 3. Threads identity state into route approval
 * 4. Provides identity context for command execution
 */

// Use console.log - can be replaced with proper logger in production
const log = (message: string): void => console.log(message);
import SpeakerEnrollmentService, { 
  SpeakerEnrollment,
  SpeakerRole,
  EnrollmentStatus,
  CreateEnrollmentRequest,
  UpdateEnrollmentRequest,
  AuthorityScope,
  VerificationThreshold,
} from "./speaker-enrollment-service";
import SpeakerVerificationService, {
  SpeakerState,
  SpeakerIdentityState,
  VerificationConfidence,
  VerificationResult,
  DiarizationResult,
} from "./speaker-verification-service";
import { DiarizationInput } from "./pyannote-diarization-provider";
import AuthorizationService, {
  AuthorizationRequest,
  AuthorizationResult,
  AuthorizationDecision,
  CommandRiskLevel,
} from "./authorization-service";
import SecurityModeService, {
  SecurityMode,
  ModeSettings,
} from "./security-mode-service";

/**
 * Identity context for command execution
 */
export interface IdentityContext {
  /** Current identity state */
  identityState: SpeakerIdentityState;
  /** Identity ID if verified */
  identityId?: string;
  /** Display name if known */
  displayName?: string;
  /** Role if verified */
  role?: SpeakerRole;
  /** Verification confidence */
  confidence: VerificationConfidence;
  /** Raw confidence value */
  confidenceValue: number;
  /** Current security mode */
  securityMode: SecurityMode;
  /** Whether in shared room mode */
  sharedRoomMode: boolean;
  /** Whether contamination detected */
  contaminated: boolean;
  /** Whether speaker is verified */
  isVerified: boolean;
  /** Whether speaker is primary owner */
  isPrimaryOwner: boolean;
}

/**
 * Full authorization request with identity context
 */
export interface IdentityAuthorizationRequest {
  /** Command family */
  commandFamily: string;
  /** Command verb */
  commandVerb: string;
  /** Target of the command */
  target?: string;
  /** Risk level */
  riskLevel?: CommandRiskLevel;
  /** Destructive flag */
  destructive?: boolean;
  /** Privileged flag */
  privileged?: boolean;
}

/**
 * Gateway configuration
 */
export interface IdentityGatewayConfig {
  /** Enrollment service config */
  enrollmentConfig?: Partial<{
    defaultAuthorityScope: AuthorityScope;
    defaultVerificationThreshold: VerificationThreshold;
    maxEnrolledSpeakers: number;
  }>;
  /** Verification service config */
  verificationConfig?: Partial<{
    minVerificationConfidence: number;
    minPrimaryConfidence: number;
  }>;
  /** Authorization service config */
  authorizationConfig?: Partial<{
    enforceSecurityMode: boolean;
    enforceSharedRoomMode: boolean;
  }>;
  /** Security mode service config */
  securityModeConfig?: Partial<{
    defaultMode: SecurityMode;
    autoDetectSharedRoom: boolean;
  }>;
}

/**
 * Identity Gateway Service
 *
 * Unified interface for identity and authorization.
 */
export default class IdentityGatewayService {
  private enrollmentService: SpeakerEnrollmentService;
  private verificationService: SpeakerVerificationService;
  private authorizationService: AuthorizationService;
  private securityModeService: SecurityModeService;

  constructor(config?: IdentityGatewayConfig) {
    // Initialize enrollment service
    this.enrollmentService = new SpeakerEnrollmentService(config?.enrollmentConfig);
    
    // Initialize verification service with enrollment service
    this.verificationService = new SpeakerVerificationService(
      this.enrollmentService,
      config?.verificationConfig
    );
    
    // Initialize security mode service
    this.securityModeService = new SecurityModeService(config?.securityModeConfig);
    
    // Initialize authorization service
    this.authorizationService = new AuthorizationService(
      this.verificationService,
      this.enrollmentService,
      config?.authorizationConfig
    );

    log(`Initialized identity and security services`);
  }

  // ============ ENROLLMENT METHODS ============

  /**
   * Create a new speaker enrollment
   */
  async createEnrollment(request: CreateEnrollmentRequest): Promise<SpeakerEnrollment> {
    return this.enrollmentService.createEnrollment(request);
  }

  /**
   * Update an enrollment
   */
  async updateEnrollment(identityId: string, request: UpdateEnrollmentRequest): Promise<SpeakerEnrollment> {
    return this.enrollmentService.updateEnrollment(identityId, request);
  }

  /**
   * Revoke an enrollment
   */
  async revokeEnrollment(identityId: string): Promise<SpeakerEnrollment> {
    return this.enrollmentService.revokeEnrollment(identityId);
  }

  /**
   * Suspend an enrollment
   */
  async suspendEnrollment(identityId: string): Promise<SpeakerEnrollment> {
    return this.enrollmentService.suspendEnrollment(identityId);
  }

  /**
   * Reactivate an enrollment
   */
  async reactivateEnrollment(identityId: string): Promise<SpeakerEnrollment> {
    return this.enrollmentService.reactivateEnrollment(identityId);
  }

  /**
   * Get enrollment by ID
   */
  getEnrollment(identityId: string): SpeakerEnrollment | undefined {
    return this.enrollmentService.getEnrollment(identityId);
  }

  /**
   * Get all enrollments
   */
  getAllEnrollments(): SpeakerEnrollment[] {
    return this.enrollmentService.getAllEnrollments();
  }

  /**
   * Get active enrollments
   */
  getActiveEnrollments(): SpeakerEnrollment[] {
    return this.enrollmentService.getActiveEnrollments();
  }

  // ============ VERIFICATION METHODS ============

  /**
   * Process verification result from STT/provider
   */
  async processVerificationResult(result: VerificationResult): Promise<SpeakerState> {
    return this.verificationService.processVerificationResult(result);
  }

  async processDiarizationAudio(input: DiarizationInput): Promise<DiarizationResult> {
    return this.verificationService.processDiarizationAudio(input);
  }

  getDiarizationProviderStatus(): {
    enabled: boolean;
    ready: boolean;
    loadError?: string;
  } {
    return this.verificationService.getDiarizationProviderStatus();
  }

  /**
   * Get current speaker state
   */
  getSpeakerState(): SpeakerState {
    return this.verificationService.getCurrentState();
  }

  /**
   * Reset verification state
   */
  async resetVerification(): Promise<void> {
    return this.verificationService.reset();
  }

  // ============ SECURITY MODE METHODS ============

  /**
   * Get current security mode
   */
  getSecurityMode(): SecurityMode {
    return this.securityModeService.getCurrentMode();
  }

  /**
   * Set security mode
   */
  async setSecurityMode(mode: SecurityMode, reason?: string): Promise<void> {
    return this.securityModeService.setMode(mode, reason);
  }

  /**
   * Enter secure mode
   */
  async enterSecureMode(reason?: string): Promise<void> {
    return this.securityModeService.enterSecureMode(reason);
  }

  /**
   * Exit secure mode
   */
  async exitSecureMode(reason?: string): Promise<void> {
    return this.securityModeService.exitSecureMode(reason);
  }

  /**
   * Toggle secure mode
   */
  async toggleSecureMode(): Promise<void> {
    return this.securityModeService.toggleSecureMode();
  }

  /**
   * Enter shared room mode
   */
  async enterSharedRoomMode(reason?: string): Promise<void> {
    return this.securityModeService.enterSharedRoomMode(reason);
  }

  /**
   * Exit shared room mode
   */
  async exitSharedRoomMode(reason?: string): Promise<void> {
    return this.securityModeService.exitSharedRoomMode(reason);
  }

  /**
   * Toggle shared room mode
   */
  async toggleSharedRoomMode(): Promise<void> {
    return this.securityModeService.toggleSharedRoomMode();
  }

  /**
   * Get security mode settings
   */
  getModeSettings(): ModeSettings {
    return this.securityModeService.getCurrentSettings();
  }

  // ============ AUTHORIZATION METHODS ============

  /**
   * Authorize a command
   */
  async authorize(request: IdentityAuthorizationRequest): Promise<AuthorizationResult> {
    const riskLevel = request.riskLevel || this.authorizationService.getDefaultRiskLevel(request.commandFamily);
    
    const fullRequest: AuthorizationRequest = {
      commandFamily: request.commandFamily,
      commandVerb: request.commandVerb,
      target: request.target,
      riskLevel,
      destructive: request.destructive,
      privileged: request.privileged,
      securityMode: this.securityModeService.getCurrentMode(),
      sharedRoomMode: this.securityModeService.isSharedRoom(),
    };

    return this.authorizationService.authorize(fullRequest);
  }

  /**
   * Quick check if command is allowed
   */
  async isCommandAllowed(commandFamily: string, riskLevel?: CommandRiskLevel): Promise<boolean> {
    const result = await this.authorize({
      commandFamily,
      commandVerb: "*",
      riskLevel: riskLevel || this.authorizationService.getDefaultRiskLevel(commandFamily),
    });

    return result.decision === AuthorizationDecision.ALLOW;
  }

  // ============ IDENTITY CONTEXT ============

  /**
   * Get identity context for command execution
   */
  getIdentityContext(): IdentityContext {
    const state = this.verificationService.getCurrentState();
    const securityMode = this.securityModeService.getCurrentMode();

    return {
      identityState: state.identityState,
      identityId: state.identityId,
      displayName: state.displayName,
      role: state.role,
      confidence: state.confidence,
      confidenceValue: state.confidenceValue,
      securityMode,
      sharedRoomMode: this.securityModeService.isSharedRoom(),
      contaminated: state.contaminated,
      isVerified: this.verificationService.isVerified(),
      isPrimaryOwner: this.verificationService.isPrimaryOwner(),
    };
  }

  // ============ CONVENIENCE METHODS ============

  /**
   * Check if current speaker can execute high-risk commands
   */
  canExecuteHighRisk(): boolean {
    const context = this.getIdentityContext();
    return context.isVerified && context.securityMode !== SecurityMode.RESTRICTED;
  }

  /**
   * Check if current speaker can execute privileged commands
   */
  canExecutePrivileged(): boolean {
    const context = this.getIdentityContext();
    return context.isPrimaryOwner && context.confidenceValue >= 0.95;
  }

  /**
   * Get authorization summary for debugging
   */
  getAuthorizationSummary(): string {
    const context = this.getIdentityContext();
    const mode = this.securityModeService.getCurrentMode();
    const settings = this.getModeSettings();
    
    return JSON.stringify({
      identity: {
        state: context.identityState,
        identityId: context.identityId,
        displayName: context.displayName,
        role: context.role,
        confidence: context.confidence,
        isVerified: context.isVerified,
        isPrimaryOwner: context.isPrimaryOwner,
        contaminated: context.contaminated,
      },
      security: {
        mode,
        settings: {
          requireVerificationForHighRisk: settings.requireVerificationForHighRisk,
          requireVerificationForPrivileged: settings.requireVerificationForPrivileged,
          blockUnknownHighRisk: settings.blockUnknownHighRisk,
        },
      },
    }, null, 2);
  }

  /**
   * Destroy the gateway and all services
   */
  destroy(): void {
    this.securityModeService.destroy();
    log(`Destroyed identity gateway`);
  }
}

// Export enums and types for convenience
export { 
  SpeakerRole, 
  EnrollmentStatus, 
  SpeakerIdentityState, 
  VerificationConfidence, 
  AuthorizationDecision, 
  CommandRiskLevel, 
  SecurityMode 
};
