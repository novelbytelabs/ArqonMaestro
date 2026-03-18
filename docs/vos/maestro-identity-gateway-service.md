# Maestro Identity Gateway Service

> **Status**: IMPLEMENTED (FP-2A)
> 
> ⚠️ **Note**: This service is integrated into the executor and working. It uses stubbed speaker verification. See [maestro-project-roadroadmap.md](./maestro-project-roadmap.md) for completion requirements.

## Overview

The Identity Gateway Service is the main API surface for FP-2A (Identity and Safety Gating). It wraps authorization, verification, and security mode services into a unified interface.

## Purpose

1. Provide unified API for identity operations
2. Bridge speaker verification to authorization
3. Manage security mode transitions
4. Thread identity context through the system

## Usage

```typescript
import IdentityGatewayService from "./identity-gateway-service";
import { SecurityMode } from "./security-mode-service";

// Initialize (done in executor.ts)
const gateway = new IdentityGatewayService({
  securityModeConfig: {
    defaultMode: SecurityMode.NORMAL,
  },
});

// Authorize a command
const result = await gateway.authorize({
  commandFamily: "focus",
  commandVerb: "focus code",
  riskLevel: CommandRiskLevel.LOW,
});

// Get current identity context
const context = gateway.getIdentityContext();
// Returns: { identityState, confidence, securityMode, ... }

// Set security mode
await gateway.setSecurityMode(SecurityMode.SECURE);
```

## Key Methods

| Method | Description |
|--------|-------------|
| `authorize()` | Authorize a command based on identity |
| `getIdentityContext()` | Get current identity state |
| `getSecurityMode()` | Get current security mode |
| `setSecurityMode()` | Change security mode |
| `isCommandAllowed()` | Fast-path check without full auth |

## Related Files

- [`maestro/client/src/main/runtime/identity-gateway-service.ts`](../../maestro/client/src/main/runtime/identity-gateway-service.ts) - Implementation
- [`maestro/client/src/main/runtime/authorization-service.ts`](../../maestro/client/src/main/runtime/authorization-service.ts) - Authorization logic
- [`maestro/client/src/main/runtime/security-mode-service.ts`](../../maestro/client/src/main/runtime/security-mode-service.ts) - Security modes
- [`maestro/client/src/main/execute/executor.ts`](../../maestro/client/src/main/execute/executor.ts) - Integration point

## Security Modes

See [maestro-modes-state-machine.md](./maestro-modes-state-machine.md) for details.

## TODO

- [ ] Complete speaker verification integration
- [ ] Add enrollment UI
- [ ] Add tests
