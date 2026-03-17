/**
 * Speaker Verification Service
 *
 * Manages speaker verification state and identity determination.
 * Part of FP-2A: Identity and Safety Gating
 *
 * This service:
 * 1. Manages current speaker identity state
 * 2. Handles verification confidence levels
 * 3. Provides identity queries for authorization
 * 4. Integrates with enrollment service
 */

// Use console.log for now - can be replaced with proper logger
function log(message: string): void {
  console.log(`[SpeakerVerification] ${message}`);
}
import SpeakerEnrollmentService, { 
  SpeakerEnrollment, 
  SpeakerRole,
  EnrollmentStatus 
} from "./speaker-enrollment-service";

/**
 * Speaker identity states
 */
export enum SpeakerIdentityState {
  /** No trusted identity match */
  UNKNOWN = "unknown",
  /** Likely enrolled speaker but confidence below threshold */
  UNVERIFIED_KNOWN_CANDIDATE = "unverified_known_candidate",
  /** Primary sovereign user verified */
  VERIFIED_PRIMARY = "verified_primary",
  /** Enrolled non-primary person verified */
  VERIFIED_SECONDARY = "verified_secondary",
  /** Delegated non-human authority */
  VERIFIED_DELEGATE = "verified_delegate",
  /** Multiple speakers, unclear separation, or noisy */
  CONTAMINATED = "contaminated",
}

/**
 * Verification confidence levels
 */
export enum VerificationConfidence {
  /** Confidence >= 0.9 */
  HIGH = "high",
  /** Confidence >= 0.7 and < 0.9 */
  MEDIUM = "medium",
  /** Confidence >= 0.5 and < 0.7 */
  LOW = "low",
  /** Confidence < 0.5 or no match */
  NONE = "none",
}

/**
 * Verification result from STT/provider
 */
export interface VerificationResult {
  /** Whether a match was found */
  matched: boolean;
  /** The claimed identity ID (may be empty if no match) */
  claimedIdentityId?: string;
  /** Verification confidence [0.0, 1.0] */
  confidence: number;
  /** Additional provider-specific data */
  providerData?: Record<string, unknown>;
}

/**
 * Current speaker state
 */
export interface SpeakerState {
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
  /** Raw confidence value [0.0, 1.0] */
  confidenceValue: number;
  /** When this state was last updated */
  lastUpdated: string;
  /** Whether contamination was detected */
  contaminated: boolean;
  /** Number of speakers detected (if known) */
  speakerCount?: number;
}

/**
 * Verification event for history
 */
export interface VerificationEvent {
  /** Event ID */
  eventId: string;
  /** Timestamp */
  timestamp: string;
  /** Previous state */
  previousState: SpeakerIdentityState;
  /** New state */
  newState: SpeakerIdentityState;
  /** Identity ID if applicable */
  identityId?: string;
  /** Confidence value */
  confidenceValue: number;
  /** Whether contamination was detected */
  contaminated: boolean;
  /** Event type */
  eventType: "verification_success" | "verification_failure" | "state_change" | "contamination";
}

/**
 * Service configuration
 */
export interface VerificationServiceConfig {
  /** Minimum confidence for verification [0.0, 1.0] */
  minVerificationConfidence: number;
  /** Minimum confidence for primary user [0.0, 1.0] */
  minPrimaryConfidence: number;
  /** Whether to require explicit enrollment match */
  requireEnrollmentMatch: boolean;
  /** Timeout for verification requests (ms) */
  verificationTimeoutMs: number;
  /** Maximum verification history events */
  maxHistoryEvents: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: VerificationServiceConfig = {
  minVerificationConfidence: 0.8,
  minPrimaryConfidence: 0.9,
  requireEnrollmentMatch: true,
  verificationTimeoutMs: 5000,
  maxHistoryEvents: 100,
};

/**
 * Get verification confidence level from raw value
 */
export function getConfidenceLevel(value: number): VerificationConfidence {
  if (value >= 0.9) return VerificationConfidence.HIGH;
  if (value >= 0.7) return VerificationConfidence.MEDIUM;
  if (value >= 0.5) return VerificationConfidence.LOW;
  return VerificationConfidence.NONE;
}

/**
 * Speaker Verification Service
 *
 * Manages speaker verification state for authorization decisions.
 */
export default class SpeakerVerificationService {
  private enrollmentService: SpeakerEnrollmentService;
  private config: VerificationServiceConfig;
  private currentState: SpeakerState;
  private verificationHistory: VerificationEvent[];

  constructor(enrollmentService: SpeakerEnrollmentService, config: Partial<VerificationServiceConfig> = {}) {
    this.enrollmentService = enrollmentService;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize with unknown state
    this.currentState = this.createUnknownState();
    this.verificationHistory = [];
  }

  /**
   * Create unknown state
   */
  private createUnknownState(): SpeakerState {
    return {
      identityState: SpeakerIdentityState.UNKNOWN,
      confidence: VerificationConfidence.NONE,
      confidenceValue: 0,
      lastUpdated: new Date().toISOString(),
      contaminated: false,
    };
  }

  /**
   * Process a verification result from STT/provider
   */
  async processVerificationResult(result: VerificationResult): Promise<SpeakerState> {
    const previousState = { ...this.currentState };
    const now = new Date().toISOString();

    // Handle contamination (multiple speakers detected)
    // This would come from diarization - for now, check provider data
    const contaminated = result.providerData?.["contaminated"] as boolean || false;
    
    if (contaminated) {
      this.currentState = {
        identityState: SpeakerIdentityState.CONTAMINATED,
        confidence: VerificationConfidence.NONE,
        confidenceValue: 0,
        lastUpdated: now,
        contaminated: true,
        speakerCount: result.providerData?.["speakerCount"] as number,
      };
      
      this.addHistoryEvent({
        eventType: "contamination",
        previousState: previousState.identityState,
        newState: SpeakerIdentityState.CONTAMINATED,
        confidenceValue: 0,
        contaminated: true,
      });
      
      log(`[SpeakerVerification] Contamination detected`);
      return this.currentState;
    }

    // No match found
    if (!result.matched || !result.claimedIdentityId) {
      this.currentState = {
        identityState: SpeakerIdentityState.UNKNOWN,
        confidence: getConfidenceLevel(result.confidence),
        confidenceValue: result.confidence,
        lastUpdated: now,
        contaminated: false,
      };
      
      this.addHistoryEvent({
        eventType: "verification_failure",
        previousState: previousState.identityState,
        newState: SpeakerIdentityState.UNKNOWN,
        confidenceValue: result.confidence,
        contaminated: false,
      });
      
      log(`[SpeakerVerification] No match: confidence=${result.confidence}`);
      return this.currentState;
    }

    // Check if identity is enrolled
    const enrollment = this.enrollmentService.getEnrollment(result.claimedIdentityId);
    
    if (!enrollment) {
      // Identity not enrolled
      if (result.confidence >= this.config.minVerificationConfidence) {
        // High confidence but not enrolled - treat as known candidate
        this.currentState = {
          identityState: SpeakerIdentityState.UNVERIFIED_KNOWN_CANDIDATE,
          identityId: result.claimedIdentityId,
          displayName: result.claimedIdentityId,
          confidence: getConfidenceLevel(result.confidence),
          confidenceValue: result.confidence,
          lastUpdated: now,
          contaminated: false,
        };
      } else {
        // Low confidence and not enrolled - unknown
        this.currentState = {
          identityState: SpeakerIdentityState.UNKNOWN,
          confidence: getConfidenceLevel(result.confidence),
          confidenceValue: result.confidence,
          lastUpdated: now,
          contaminated: false,
        };
      }
      
      this.addHistoryEvent({
        eventType: "verification_failure",
        previousState: previousState.identityState,
        newState: this.currentState.identityState,
        identityId: result.claimedIdentityId,
        confidenceValue: result.confidence,
        contaminated: false,
      });
      
      log(`[SpeakerVerification] Identity not enrolled: ${result.claimedIdentityId}`);
      return this.currentState;
    }

    // Check enrollment status
    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      this.currentState = {
        identityState: SpeakerIdentityState.UNKNOWN,
        displayName: enrollment.displayName,
        confidence: getConfidenceLevel(result.confidence),
        confidenceValue: result.confidence,
        lastUpdated: now,
        contaminated: false,
      };
      
      this.addHistoryEvent({
        eventType: "verification_failure",
        previousState: previousState.identityState,
        newState: SpeakerIdentityState.UNKNOWN,
        identityId: result.claimedIdentityId,
        confidenceValue: result.confidence,
        contaminated: false,
      });
      
      log(`[SpeakerVerification] Enrollment not active: ${result.claimedIdentityId}`);
      return this.currentState;
    }

    // Check confidence against enrollment threshold
    const threshold = enrollment.verificationThreshold.minConfidence;
    
    if (result.confidence < threshold) {
      // Below threshold - unverified known candidate
      this.currentState = {
        identityState: SpeakerIdentityState.UNVERIFIED_KNOWN_CANDIDATE,
        identityId: result.claimedIdentityId,
        displayName: enrollment.displayName,
        role: enrollment.role,
        confidence: getConfidenceLevel(result.confidence),
        confidenceValue: result.confidence,
        lastUpdated: now,
        contaminated: false,
      };
      
      this.addHistoryEvent({
        eventType: "verification_failure",
        previousState: previousState.identityState,
        newState: SpeakerIdentityState.UNVERIFIED_KNOWN_CANDIDATE,
        identityId: result.claimedIdentityId,
        confidenceValue: result.confidence,
        contaminated: false,
      });
      
      log(`[SpeakerVerification] Below threshold: ${result.claimedIdentityId}, confidence=${result.confidence}, threshold=${threshold}`);
      return this.currentState;
    }

    // Determine identity state based on role
    let identityState: SpeakerIdentityState;
    
    switch (enrollment.role) {
      case SpeakerRole.SOVEREIGN_OWNER:
        identityState = SpeakerIdentityState.VERIFIED_PRIMARY;
        break;
      case SpeakerRole.APPROVED_USER:
      case SpeakerRole.HOUSEHOLD_USER:
        identityState = SpeakerIdentityState.VERIFIED_SECONDARY;
        break;
      case SpeakerRole.DELEGATED_AGENT:
        identityState = SpeakerIdentityState.VERIFIED_DELEGATE;
        break;
      default:
        identityState = SpeakerIdentityState.VERIFIED_SECONDARY;
    }

    // Update enrollment last verified
    await this.enrollmentService.updateLastVerified(enrollment.identityId);

    // Create verified state
    this.currentState = {
      identityState,
      identityId: result.claimedIdentityId,
      displayName: enrollment.displayName,
      role: enrollment.role,
      confidence: getConfidenceLevel(result.confidence),
      confidenceValue: result.confidence,
      lastUpdated: now,
      contaminated: false,
    };

    this.addHistoryEvent({
      eventType: "verification_success",
      previousState: previousState.identityState,
      newState: identityState,
      identityId: result.claimedIdentityId,
      confidenceValue: result.confidence,
      contaminated: false,
    });

    log(`[SpeakerVerification] Verified: ${result.claimedIdentityId} (${identityState}), confidence=${result.confidence}`);
    
    return this.currentState;
  }

  /**
   * Get current speaker state
   */
  getCurrentState(): SpeakerState {
    return { ...this.currentState };
  }

  /**
   * Get current identity state
   */
  getIdentityState(): SpeakerIdentityState {
    return this.currentState.identityState;
  }

  /**
   * Get current identity ID if verified
   */
  getCurrentIdentityId(): string | undefined {
    return this.currentState.identityId;
  }

  /**
   * Get current role if verified
   */
  getCurrentRole(): SpeakerRole | undefined {
    return this.currentState.role;
  }

  /**
   * Get current confidence
   */
  getCurrentConfidence(): VerificationConfidence {
    return this.currentState.confidence;
  }

  /**
   * Get raw confidence value
   */
  getConfidenceValue(): number {
    return this.currentState.confidenceValue;
  }

  /**
   * Check if current speaker is verified
   */
  isVerified(): boolean {
    return (
      this.currentState.identityState === SpeakerIdentityState.VERIFIED_PRIMARY ||
      this.currentState.identityState === SpeakerIdentityState.VERIFIED_SECONDARY ||
      this.currentState.identityState === SpeakerIdentityState.VERIFIED_DELEGATE
    );
  }

  /**
   * Check if current speaker is the primary owner
   */
  isPrimaryOwner(): boolean {
    return this.currentState.identityState === SpeakerIdentityState.VERIFIED_PRIMARY;
  }

  /**
   * Check if contamination was detected
   */
  isContaminated(): boolean {
    return this.currentState.contaminated;
  }

  /**
   * Check if state meets minimum confidence for a specific threshold
   */
  meetsConfidenceThreshold(threshold: number): boolean {
    return this.currentState.confidenceValue >= threshold;
  }

  /**
   * Get the current enrollment if verified
   */
  getCurrentEnrollment(): SpeakerEnrollment | undefined {
    if (!this.currentState.identityId) {
      return undefined;
    }
    return this.enrollmentService.getEnrollment(this.currentState.identityId);
  }

  /**
   * Reset to unknown state
   */
  async reset(): Promise<void> {
    const previousState = { ...this.currentState };
    this.currentState = this.createUnknownState();
    
    this.addHistoryEvent({
      eventType: "state_change",
      previousState: previousState.identityState,
      newState: SpeakerIdentityState.UNKNOWN,
      confidenceValue: 0,
      contaminated: false,
    });
    
    log(`[SpeakerVerification] Reset to unknown state`);
  }

  /**
   * Get verification history
   */
  getHistory(limit?: number): VerificationEvent[] {
    if (limit && limit > 0) {
      return this.verificationHistory.slice(0, limit);
    }
    return [...this.verificationHistory];
  }

  /**
   * Add event to history
   */
  private addHistoryEvent(event: Omit<VerificationEvent, "eventId" | "timestamp">): void {
    const fullEvent: VerificationEvent = {
      ...event,
      eventId: `ve-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    
    this.verificationHistory.unshift(fullEvent);
    
    // Trim to max events
    if (this.verificationHistory.length > this.config.maxHistoryEvents) {
      this.verificationHistory = this.verificationHistory.slice(0, this.config.maxHistoryEvents);
    }
  }

  /**
   * Get recent verification events
   */
  getRecentEvents(since?: string): VerificationEvent[] {
    if (!since) {
      return [...this.verificationHistory];
    }
    
    return this.verificationHistory.filter(e => e.timestamp >= since);
  }

  /**
   * Get verification success rate
   */
  getSuccessRate(): number {
    if (this.verificationHistory.length === 0) {
      return 0;
    }
    
    const successes = this.verificationHistory.filter(
      e => e.eventType === "verification_success"
    ).length;
    
    return successes / this.verificationHistory.length;
  }

  /**
   * Check if speaker can be trusted for a given confidence threshold
   */
  canTrustForThreshold(threshold: number): boolean {
    return this.isVerified() && this.currentState.confidenceValue >= threshold;
  }
}
