# Maestro Authorization Service

> **Status**: IMPLEMENTED (FP-2A)
> 
> ⚠️ **Note**: This service is integrated but relies on stubbed speaker verification. See [maestro-project-roadmap.md](./maestro-project-roadmap.md) for completion requirements.

## Overview

The Authorization Service gates command execution based on speaker identity, role, and command risk levels. It is the core of FP-2A (Identity and Safety Gating).

## Purpose

1. Evaluate authorization for commands based on identity state
2. Apply role-based access control (RBAC)
3. Determine confirmation requirements
4. Integrate with security mode

## Key Concepts

### Command Risk Levels

| Level | Description | Example Commands |
|-------|-------------|------------------|
| LOW | Safe, non-destructive | focus, navigation, display |
| MEDIUM | Edit/insert operations | insert, paste, run |
| HIGH | File system operations | delete, remove, create |
| PRIVILEGED | System configuration | settings, config |

### Authorization Decisions

| Decision | Behavior |
|----------|----------|
| ALLOW | Command proceeds |
| DENY | Command blocked with reason |
| CONFIRM | Requires user confirmation |
| BLOCK | Hard block, no override |

## Usage

```typescript
import AuthorizationService from "./authorization-service";
import { CommandRiskLevel, AuthorizationDecision } from "./authorization-service";

// Create service (typically done by IdentityGateway)
const authService = new AuthorizationService(
  verificationService,  // SpeakerVerificationService
  enrollmentService,     // SpeakerEnrollmentService
  { defaultRiskLevel: CommandRiskLevel.MEDIUM }
);

// Authorize a command
const result = await authService.authorize({
  commandFamily: "focus",
  commandVerb: "focus editor",
  riskLevel: CommandRiskLevel.LOW,
  securityMode: SecurityMode.NORMAL,
  sharedRoomMode: false,
});

if (result.decision === AuthorizationDecision.ALLOW) {
  // Proceed with command
}
```

## Related Files

- [`maestro/client/src/main/runtime/authorization-service.ts`](../../maestro/client/src/main/runtime/authorization-service.ts) - Implementation
- [`maestro/client/src/main/runtime/identity-gateway-service.ts`](../../maestro/client/src/main/runtime/identity-gateway-service.ts) - Gateway wrapper
- [`maestro/client/src/main/runtime/speaker-verification-service.ts`](../../maestro/client/src/main/runtime/speaker-verification-service.ts) - Verification (STUBBED)
- [`maestro/client/src/main/runtime/speaker-enrollment-service.ts`](../../maestro/client/src/main/runtime/speaker-enrollment-service.ts) - Enrollment (STUBBED)

## TODO

- [ ] Add STT provider integration for real speaker verification
- [ ] Add persistence for enrollment data
- [ ] Add unit tests
- [ ] Add integration tests for command pipeline
