# Maestro Focus Recovery v0.1

## Overview

Focus Recovery (FP-5A) introduces the first bounded recovery layer for common focus failures in Maestro. This enables the system to detect when focus has drifted from expected state and attempt bounded recovery actions.

## Why Recovery Now

The Focus Project has achieved:
- App/window focus (FP-1)
- Region focus (FP-3A/3B)
- Control/caret precision (FP-4A/4B)
- Safety/guard rails (FP-2, FP-4B)

The next gap is what happens when the system is **wrong**, **interrupted**, or **drifted**. A real VOS needs not only targeting, but **repair**.

## Recovery Scope

### Approved Recovery Targets

Recovery is limited to already-supported surfaces:

| Surface           | Application  | Recovery Actions Available           |
|-------------------|-------------|--------------------------------------|
| VS Code Editor    | VS Code     | refocus_app, refocus_region           |
| VS Code Terminal  | VS Code     | refocus_app, refocus_region           |
| Chrome Address Bar| Chrome      | refocus_app, refocus_control          |
| Chrome Page       | Chrome      | refocus_app                           |

### Not in Scope

- Full semantic referent resolution ("this", "that", "it")
- General modal intelligence
- Universal recovery across all applications
- Autonomous multi-step recovery loops without bounds

## Drift Detection

### Detection Model

Drift detection identifies common failure cases:

1. **Expected app active, wrong region** - App matches but region is different
2. **Expected region active, wrong control** - Region matches but control differs
3. **Insertion attempted, caret missing** - Text insertion guard failed
4. **Previous target no longer exists** - Target closed or unavailable
5. **Ambiguity invalidated prior assumption** - User clarification changed context

### Detection Confidence

| Drift Type          | Confidence | Rationale                           |
|---------------------|------------|-------------------------------------|
| APP_MISMATCH         | 0.95       | OS-level detection is reliable     |
| REGION_MISMATCH     | 0.85       | Region detection is mostly reliable |
| CONTROL_MISMATCH    | 0.80       | Control detection varies by surface |
| CARET_MISSING       | 0.90       | Caret detection has known limits   |
| TARGET_GONE         | 0.90       | Absence detection is straightforward |
| AMBIGUITY_ESCALATED | 0.75       | Ambiguity resolution is uncertain   |
| UNVERIFIED_STATE    | 1.00       | No state = complete uncertainty     |

## Recovery Reason Taxonomy

```typescript
enum RecoveryReason {
  /** Expected app is active but wrong region focused */
  APP_MISMATCH = "APP_MISMATCH",
  
  /** Expected window is active but focus is in different window */
  WINDOW_MISMATCH = "WINDOW_MISMATCH",
  
  /** Expected region is focused but different region is active */
  REGION_MISMATCH = "REGION_MISMATCH",
  
  /** Expected control is focused but different control is active */
  CONTROL_MISMATCH = "CONTROL_MISMATCH",
  
  /** Insertion attempted but no caret present */
  CARET_MISSING = "CARET_MISSING",
  
  /** Previous target no longer exists (closed tab, etc.) */
  TARGET_GONE = "TARGET_GONE",
  
  /** Ambiguity resolution invalidated prior assumption */
  AMBIGUITY_ESCALATED = "AMBIGUITY_ESCALATED",
  
  /** Focus state cannot be verified */
  UNVERIFIED_STATE = "UNVERIFIED_STATE",
}
```

## Recovery Actions

### Bounded Actions

Recovery uses only these bounded actions:

| Action              | Description                           | Bounded? |
|---------------------|--------------------------------------|----------|
| REFOCUS_APP         | Refocus the entire application       | Yes      |
| REFOCUS_REGION      | Refocus a specific region            | Yes      |
| REFOCUS_CONTROL     | Refocus a specific control           | Yes      |
| RESTORE_PREVIOUS    | Restore to previous verified state   | Yes      |
| ABORT               | Stop and inform user                 | Yes      |

### Policy Selection

| Reason              | Policy           | Action              |
|---------------------|-----------------|---------------------|
| APP_MISMATCH        | RETRY_ONCE      | REFOCUS_APP        |
| WINDOW_MISMATCH     | RETRY_ONCE      | REFOCUS_APP        |
| REGION_MISMATCH    | RETRY_ONCE      | REFOCUS_REGION     |
| CONTROL_MISMATCH   | RETRY_ONCE      | REFOCUS_CONTROL    |
| CARET_MISSING      | ABORT           | ABORT              |
| TARGET_GONE        | RESTORE_PREVIOUS| RESTORE_PREVIOUS   |
| AMBIGUITY_ESCALATED| ABORT           | ABORT              |
| UNVERIFIED_STATE   | RETRY_ONCE      | REFOCUS_APP        |

## Recovery Policy

### Bounded Retry Policy

Recovery attempts are bounded to prevent infinite loops:

- **Maximum 1 retry attempt** per failure
- **Fall back to previous verified state** if retry fails
- **Abort with user-safe message** if no recovery possible
- **Never autonomously loop** without bounds

### Policy Outcomes

| Policy           | Result Status    | Final Confidence |
|-----------------|-----------------|------------------|
| RETRY_ONCE      | SUCCESS/FALLBACK| 0.9 / 0.7       |
| RESTORE_PREVIOUS| FALLBACK        | 0.7             |
| ABORT           | ABORTED         | 0.3             |
| DOWNGRADE       | DOWNGRADED      | 0.5             |

## Recovery Telemetry

### Telemetry Structure

```typescript
interface RecoveryTelemetry {
  // Detection
  driftDetected: boolean;
  reason: RecoveryReason | null;
  
  // Action
  action: RecoveryAction | null;
  policy: RecoveryPolicy | null;
  
  // Result
  result: RecoveryResultStatus;
  finalConfidence: number;
  
  // History
  attempts: RecoveryAttempt[];
  
  // User communication
  userSafeMessage?: string;
  
  // Timestamps
  startTimestamp: string;
  endTimestamp: string;
}
```

### Debug Output Format

Recovery events are logged with full context:

```
[RECOVERY] drift_detected=true reason=REGION_MISMATCH confidence=0.85
[RECOVERY] action=REFOCUS_REGION policy=RETRY_ONCE
[RECOVERY] result=SUCCESS final_confidence=0.9
[RECOVERY] duration_ms=127
```

## User-Safe Messages

Blocked/aborted recovery paths always include user-safe messages:

| Reason              | User Message                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| APP_MISMATCH        | "Could not recover focus. The expected application is not active..."       |
| WINDOW_MISMATCH     | "Could not recover focus. The expected window is not focused..."            |
| REGION_MISMATCH     | "Could not recover to the expected region. Please navigate..."              |
| CONTROL_MISMATCH    | "Could not recover to the expected control. Please click..."                |
| CARET_MISSING       | "No cursor position detected. Please click where you want to insert text." |
| TARGET_GONE         | "The target you were working with no longer exists..."                      |
| AMBIGUITY_ESCALATED | "Could not determine the correct target. Please be more specific..."       |
| UNVERIFIED_STATE    | "Could not verify focus state. Please click on the target and try again."  |

## Engineering Implementation

### Service Location

`maestro/client/src/main/runtime/focus-recovery-service.ts`

### Key Classes

| Class/Interface      | Purpose                                      |
|---------------------|---------------------------------------------|
| FocusRecoveryService | Main service for drift detection/recovery |
| RecoveryReason      | Enum for drift types                        |
| RecoveryAction      | Enum for recovery actions                  |
| RecoveryPolicy      | Enum for policy decisions                   |
| RecoveryTelemetry  | Telemetry structure                         |
| VerifiedFocusState  | Stored state for restoration                |

### Public API

```typescript
class FocusRecoveryService {
  // Main recovery entry point
  async performRecovery(input: DriftDetectionInput): Promise<RecoveryTelemetry>
  
  // Drift detection
  detectDrift(input: DriftDetectionInput): DriftDetectionResult
  
  // Policy and action determination
  determineRecoveryPolicy(reason: RecoveryReason): RecoveryPolicy
  determineRecoveryAction(reason: RecoveryReason, policy: RecoveryPolicy, request: RecoveryActionRequest): RecoveryAction
  
  // State management
  storeVerifiedState(state: VerifiedFocusState): void
  getPreviousVerifiedState(): VerifiedFocusState | null
  
  // Utilities
  isRecoverySupported(application: string, region?: RegionKind): boolean
  getRecoveryCapabilities(application: string): RecoveryCapabilities
  getAbortUserMessage(reason: RecoveryReason): string
  
  // History
  getRecoveryHistory(): RecoveryTelemetry[]
  clearHistory(): void
}
```

## Acceptance Criteria

- [x] Maestro can detect at least the approved common drift/failure classes
- [x] Maestro can attempt bounded recovery on supported surfaces
- [x] Recovery attempts are visible in telemetry
- [x] Recovery does not loop indefinitely
- [x] Blocked/aborted recovery paths are explicit and user-safe
- [x] No regression in FP-3A through FP-4B behavior

## Testing Matrix

### Drift Detection Tests

| Scenario                    | Expected Result      |
|-----------------------------|---------------------|
| App match, region mismatch  | REGION_MISMATCH     |
| App mismatch                | APP_MISMATCH        |
| Control mismatch            | CONTROL_MISMATCH    |
| Target gone                 | TARGET_GONE         |
| No focus state             | UNVERIFIED_STATE    |

### Recovery Action Tests

| Scenario                    | Policy       | Action            | Result          |
|-----------------------------|-------------|-------------------|-----------------|
| APP_MISMATCH                | RETRY_ONCE  | REFOCUS_APP       | SUCCESS         |
| REGION_MISMATCH            | RETRY_ONCE  | REFOCUS_REGION    | SUCCESS         |
| CARET_MISSING              | ABORT       | ABORT             | ABORTED         |
| TARGET_GONE, has previous  | RESTORE_PREVIOUS | RESTORE_PREVIOUS | FALLBACK      |
| TARGET_GONE, no previous   | RESTORE_PREVIOUS | ABORT          | ABORTED         |

## Version History

- v0.1 (FP-5A) - Initial recovery foundations
  - Drift detection model
  - Recovery reason taxonomy
  - Bounded recovery actions
  - Recovery policy
  - Recovery telemetry

## Related Documents

- [Focus Project Charter](focus-project-charter.md)
- [Focus Precision Service](maestro-focus-precision-v0.1.md)
- [Focus Region Service](maestro-region-model-v0.1.md)
- [Implementation Progress](maestro-implementation-progress.md)
