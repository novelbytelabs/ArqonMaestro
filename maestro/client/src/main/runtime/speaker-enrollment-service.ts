/**
 * Speaker Enrollment Service
 *
 * Manages enrolled speaker profiles for voice identity verification.
 * Part of FP-2A: Identity and Safety Gating
 *
 * This service:
 * 1. Manages speaker enrollment profiles
 * 2. Stores identity metadata (name, role, authority scope)
 * 3. Handles enrollment lifecycle (create, update, revoke)
 * 4. Provides enrollment lookup for verification
 */

// Use console.log for now - can be replaced with proper logger
function log(message: string): void {
  console.log(`[SpeakerEnrollment] ${message}`);
}

/**
 * Speaker identity roles
 */
export enum SpeakerRole {
  /** Highest human authority */
  SOVEREIGN_OWNER = "sovereign_owner",
  /** Enrolled trusted human with meaningful but narrower permissions */
  APPROVED_USER = "approved_user",
  /** Recognized speaker with limited low-risk interaction rights */
  HOUSEHOLD_USER = "household_user",
  /** Unverified or unknown person */
  GUEST = "guest",
  /** Non-human authority acting through explicit delegation */
  DELEGATED_AGENT = "delegated_agent",
}

/**
 * Enrollment status
 */
export enum EnrollmentStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  REVOKED = "revoked",
  PENDING = "pending",
}

/**
 * Verification threshold configuration
 */
export interface VerificationThreshold {
  /** Minimum confidence to consider verified [0.0, 1.0] */
  minConfidence: number;
  /** Minimum confidence for high-security commands [0.0, 1.0] */
  highSecurityConfidence: number;
}

/**
 * Authority scope for a speaker
 */
export interface AuthorityScope {
  /** Allowed command risk levels: low, medium, high, privileged */
  allowedRiskLevels: ("low" | "medium" | "high" | "privileged")[];
  /** Specific command families allowed */
  allowedCommandFamilies?: string[];
  /** Specific surfaces allowed */
  allowedSurfaces?: string[];
  /** Commands that always require confirmation */
  alwaysConfirmCommands?: string[];
  /** Commands that are always blocked */
  blockedCommands?: string[];
}

/**
 * Speaker enrollment profile
 */
export interface SpeakerEnrollment {
  /** Unique identity ID */
  identityId: string;
  /** Display name for the speaker */
  displayName: string;
  /** Role of the speaker */
  role: SpeakerRole;
  /** Voice profile data (opaque to Maestro - handled by STT provider) */
  voiceProfileData?: string;
  /** Enrollment status */
  status: EnrollmentStatus;
  /** Authority scope for this speaker */
  authorityScope: AuthorityScope;
  /** Verification thresholds */
  verificationThreshold: VerificationThreshold;
  /** When the profile was created */
  enrolledAt: string;
  /** When the profile was last verified */
  lastVerifiedAt?: string;
  /** When the profile was last updated */
  updatedAt: string;
  /** Enrollment metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Enrollment create request
 */
export interface CreateEnrollmentRequest {
  identityId: string;
  displayName: string;
  role: SpeakerRole;
  voiceProfileData?: string;
  authorityScope?: Partial<AuthorityScope>;
  verificationThreshold?: Partial<VerificationThreshold>;
  metadata?: Record<string, unknown>;
}

/**
 * Enrollment update request
 */
export interface UpdateEnrollmentRequest {
  displayName?: string;
  role?: SpeakerRole;
  status?: EnrollmentStatus;
  authorityScope?: Partial<AuthorityScope>;
  verificationThreshold?: Partial<VerificationThreshold>;
  metadata?: Record<string, unknown>;
}

/**
 * Enrollment query filter
 */
export interface EnrollmentQuery {
  role?: SpeakerRole;
  status?: EnrollmentStatus;
  includeRevoked?: boolean;
}

/**
 * Service configuration
 */
export interface EnrollmentServiceConfig {
  /** Default authority scope for new enrollments */
  defaultAuthorityScope: AuthorityScope;
  /** Default verification thresholds */
  defaultVerificationThreshold: VerificationThreshold;
  /** Maximum number of enrolled speakers */
  maxEnrolledSpeakers?: number;
  /** Whether to allow duplicate identity IDs */
  allowDuplicateIds?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: EnrollmentServiceConfig = {
  defaultAuthorityScope: {
    allowedRiskLevels: ["low", "medium"],
  },
  defaultVerificationThreshold: {
    minConfidence: 0.8,
    highSecurityConfidence: 0.95,
  },
  maxEnrolledSpeakers: 10,
  allowDuplicateIds: false,
};

/**
 * Speaker Enrollment Service
 *
 * Manages speaker enrollment profiles for voice identity verification.
 */
export default class SpeakerEnrollmentService {
  private enrollments: Map<string, SpeakerEnrollment>;
  private config: EnrollmentServiceConfig;

  constructor(config: Partial<EnrollmentServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.enrollments = new Map();
    
    // Initialize with a default enrollment for testing
    this.initializeDefaultEnrollment();
  }

  /**
   * Initialize with a default sovereign owner for testing
   */
  private initializeDefaultEnrollment(): void {
    const defaultEnrollment: SpeakerEnrollment = {
      identityId: "default_owner",
      displayName: "Primary User",
      role: SpeakerRole.SOVEREIGN_OWNER,
      status: EnrollmentStatus.ACTIVE,
      authorityScope: {
        allowedRiskLevels: ["low", "medium", "high", "privileged"],
      },
      verificationThreshold: {
        minConfidence: 0.8,
        highSecurityConfidence: 0.95,
      },
      enrolledAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.enrollments.set(defaultEnrollment.identityId, defaultEnrollment);
    log(`[SpeakerEnrollment] Initialized default enrollment: ${defaultEnrollment.identityId}`);
  }

  /**
   * Create a new speaker enrollment
   */
  async createEnrollment(request: CreateEnrollmentRequest): Promise<SpeakerEnrollment> {
    // Check for duplicate ID
    if (!this.config.allowDuplicateIds && this.enrollments.has(request.identityId)) {
      throw new Error(`Enrollment with ID '${request.identityId}' already exists`);
    }

    // Check max enrolled speakers
    if (this.config.maxEnrolledSpeakers && 
        this.enrollments.size >= this.config.maxEnrolledSpeakers) {
      throw new Error(`Maximum number of enrolled speakers (${this.config.maxEnrolledSpeakers}) reached`);
    }

    const now = new Date().toISOString();
    
    const enrollment: SpeakerEnrollment = {
      identityId: request.identityId,
      displayName: request.displayName,
      role: request.role,
      voiceProfileData: request.voiceProfileData,
      status: EnrollmentStatus.ACTIVE,
      authorityScope: request.authorityScope 
        ? { ...this.config.defaultAuthorityScope, ...request.authorityScope }
        : { ...this.config.defaultAuthorityScope },
      verificationThreshold: request.verificationThreshold
        ? { ...this.config.defaultVerificationThreshold, ...request.verificationThreshold }
        : { ...this.config.defaultVerificationThreshold },
      enrolledAt: now,
      updatedAt: now,
      metadata: request.metadata,
    };

    this.enrollments.set(enrollment.identityId, enrollment);
    log(`[SpeakerEnrollment] Created enrollment: ${enrollment.identityId} (${enrollment.role})`);

    return enrollment;
  }

  /**
   * Update an existing enrollment
   */
  async updateEnrollment(
    identityId: string, 
    request: UpdateEnrollmentRequest
  ): Promise<SpeakerEnrollment> {
    const enrollment = this.enrollments.get(identityId);
    
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${identityId}`);
    }

    const updated: SpeakerEnrollment = {
      ...enrollment,
      displayName: request.displayName ?? enrollment.displayName,
      role: request.role ?? enrollment.role,
      status: request.status ?? enrollment.status,
      authorityScope: request.authorityScope
        ? { ...enrollment.authorityScope, ...request.authorityScope }
        : enrollment.authorityScope,
      verificationThreshold: request.verificationThreshold
        ? { ...enrollment.verificationThreshold, ...request.verificationThreshold }
        : enrollment.verificationThreshold,
      updatedAt: new Date().toISOString(),
      metadata: request.metadata 
        ? { ...enrollment.metadata, ...request.metadata }
        : enrollment.metadata,
    };

    this.enrollments.set(identityId, updated);
    log(`[SpeakerEnrollment] Updated enrollment: ${identityId}`);

    return updated;
  }

  /**
   * Revoke an enrollment
   */
  async revokeEnrollment(identityId: string): Promise<SpeakerEnrollment> {
    return this.updateEnrollment(identityId, {
      status: EnrollmentStatus.REVOKED,
    });
  }

  /**
   * Suspend an enrollment
   */
  async suspendEnrollment(identityId: string): Promise<SpeakerEnrollment> {
    return this.updateEnrollment(identityId, {
      status: EnrollmentStatus.SUSPENDED,
    });
  }

  /**
   * Reactivate a suspended enrollment
   */
  async reactivateEnrollment(identityId: string): Promise<SpeakerEnrollment> {
    return this.updateEnrollment(identityId, {
      status: EnrollmentStatus.ACTIVE,
    });
  }

  /**
   * Get an enrollment by ID
   */
  getEnrollment(identityId: string): SpeakerEnrollment | undefined {
    return this.enrollments.get(identityId);
  }

  /**
   * Get all enrollments
   */
  getAllEnrollments(query?: EnrollmentQuery): SpeakerEnrollment[] {
    let results = Array.from(this.enrollments.values());

    if (query) {
      if (query.role) {
        results = results.filter(e => e.role === query.role);
      }
      
      if (query.status) {
        results = results.filter(e => e.status === query.status);
      }
      
      if (!query.includeRevoked) {
        results = results.filter(e => e.status !== EnrollmentStatus.REVOKED);
      }
    }

    return results;
  }

  /**
   * Get active enrollments only
   */
  getActiveEnrollments(): SpeakerEnrollment[] {
    return this.getAllEnrollments({ 
      status: EnrollmentStatus.ACTIVE,
      includeRevoked: false,
    });
  }

  /**
   * Get enrollments by role
   */
  getEnrollmentsByRole(role: SpeakerRole): SpeakerEnrollment[] {
    return this.getAllEnrollments({ role, includeRevoked: false });
  }

  /**
   * Get the sovereign owner (highest authority)
   */
  getSovereignOwner(): SpeakerEnrollment | undefined {
    const owners = this.getEnrollmentsByRole(SpeakerRole.SOVEREIGN_OWNER);
    return owners[0];
  }

  /**
   * Check if an identity is enrolled and active
   */
  isEnrolled(identityId: string): boolean {
    const enrollment = this.enrollments.get(identityId);
    return enrollment !== undefined && enrollment.status === EnrollmentStatus.ACTIVE;
  }

  /**
   * Check if an identity has a specific role
   */
  hasRole(identityId: string, role: SpeakerRole): boolean {
    const enrollment = this.enrollments.get(identityId);
    return enrollment?.role === role;
  }

  /**
   * Get authority scope for an identity
   */
  getAuthorityScope(identityId: string): AuthorityScope | undefined {
    const enrollment = this.enrollments.get(identityId);
    return enrollment?.authorityScope;
  }

  /**
   * Get verification thresholds for an identity
   */
  getVerificationThreshold(identityId: string): VerificationThreshold | undefined {
    const enrollment = this.enrollments.get(identityId);
    return enrollment?.verificationThreshold;
  }

  /**
   * Delete an enrollment
   */
  async deleteEnrollment(identityId: string): Promise<boolean> {
    const deleted = this.enrollments.delete(identityId);
    if (deleted) {
      log(`[SpeakerEnrollment] Deleted enrollment: ${identityId}`);
    }
    return deleted;
  }

  /**
   * Get enrollment count
   */
  getEnrollmentCount(): number {
    return this.enrollments.size;
  }

  /**
   * Get active enrollment count
   */
  getActiveEnrollmentCount(): number {
    return this.getActiveEnrollments().length;
  }

  /**
   * Check if command is allowed for identity
   */
  isCommandAllowed(identityId: string, commandFamily: string): boolean {
    const enrollment = this.enrollments.get(identityId);
    
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      return false;
    }

    const { authorityScope } = enrollment;
    
    // Check blocked commands
    if (authorityScope.blockedCommands?.includes(commandFamily)) {
      return false;
    }

    // Check allowed command families
    if (authorityScope.allowedCommandFamilies?.length) {
      return authorityScope.allowedCommandFamilies.includes(commandFamily);
    }

    return true;
  }

  /**
   * Check if risk level is allowed for identity
   */
  isRiskLevelAllowed(identityId: string, riskLevel: "low" | "medium" | "high" | "privileged"): boolean {
    const enrollment = this.enrollments.get(identityId);
    
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      return false;
    }

    return enrollment.authorityScope.allowedRiskLevels.includes(riskLevel);
  }

  /**
   * Update last verified timestamp
   */
  async updateLastVerified(identityId: string): Promise<void> {
    const enrollment = this.enrollments.get(identityId);
    if (enrollment) {
      enrollment.lastVerifiedAt = new Date().toISOString();
      enrollment.updatedAt = new Date().toISOString();
      this.enrollments.set(identityId, enrollment);
    }
  }
}
