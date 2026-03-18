# Maestro Focus Precision v0.1

> **Version:** 0.1  
> **Status:** Implementation Complete  
> **Focus Phase:** FP-4A - Precision Focus Foundations  
> **Last Updated:** 2026-03-15

---

## 1. Overview

FP-4A establishes precision focus capabilities for Layer 5 (Control) focus tracking and Layer 7 (Caret) presence detection on limited, approved surfaces. This document describes the implementation of precision focus foundations.

### 1.1 Objectives

| Objective | Description |
|-----------|-------------|
| Control Focus Tracking | Track focus on specific controls within approved surfaces |
| Selection Tracking | Detect and track text selections where practical |
| Caret Presence Detection | Detect caret presence without full semantics |
| Text-Insertion Precheck | Safety check before text insertion operations |

---

## 2. Approved Surfaces

Precision focus is limited to these surfaces only:

| Surface | Application | Control Type | Detection Authority |
|---------|-------------|--------------|---------------------|
| VS Code Editor | VS Code | `text_editor` | `direct_integration` |
| VS Code Terminal | VS Code | `terminal` | `direct_integration` |
| Chrome Address Bar | Chrome | `address_bar` | `shortcut_inference` |

### 2.1 Surface Definitions

#### VS Code Editor
- **Control Type:** `text_editor`
- **Detection Authority:** `direct_integration`
- **Capabilities:**
  - Text input: ✅ Yes
  - Selection tracking: ✅ Yes
  - Caret presence: ✅ Yes
  - Text precheck: ✅ Required

#### VS Code Terminal
- **Control Type:** `terminal`
- **Detection Authority:** `direct_integration`
- **Capabilities:**
  - Text input: ✅ Yes
  - Selection tracking: ✅ Yes
  - Caret presence: ✅ Yes
  - Text precheck: ✅ Required

#### Chrome Address Bar
- **Control Type:** `address_bar`
- **Detection Authority:** `shortcut_inference`
- **Capabilities:**
  - Text input: ✅ Yes
  - Selection tracking: ✅ Yes
  - Caret presence: ✅ Yes
  - Text precheck: ✅ Required

---

## 3. Detection Authority

The detection authority field classifies how focus/control was detected. This is a PM hardening requirement from FP-3B.

### 3.1 Authority Types

| Authority | Description | Confidence |
|-----------|-------------|------------|
| `direct_integration` | Direct API/extension integration (most reliable) | 1.0 |
| `accessibility` | OS accessibility API (AT) | 0.85 |
| `shortcut_inference` | Known keyboard shortcut behavior | 0.9 |
| `heuristic` | Heuristic inference (least reliable) | 0.5 |

### 3.2 Authority by Surface

| Surface | Authority | Rationale |
|---------|-----------|------------|
| VS Code Editor | `direct_integration` | VS Code extension API provides direct access |
| VS Code Terminal | `direct_integration` | VS Code extension API provides direct access |
| Chrome Address Bar | `shortcut_inference` | Ctrl+L shortcut reliably focuses address bar |

---

## 4. Caret Presence State

> **Note:** This is **NOT** full caret semantics. Only presence detection is implemented.

### 4.1 State Model

```typescript
interface CaretPresenceState {
  hasCaret: boolean;           // Whether a caret is present
  surface: PrecisionSurface;  // The surface where caret is present
  timestamp: string;           // ISO 8601 timestamp
  detectionAuthority: DetectionAuthority;
}
```

### 4.2 What We Detect

- ✅ Whether a caret/insertion point exists
- ✅ Which surface has the caret
- ✅ Detection authority for the determination

### 4.3 What We DON'T Detect (Boundaries)

- ❌ Exact caret position (line/column)
- ❌ Caret movement
- ❌ Visual caret properties
- ❌ Text content at caret position

---

## 5. Selection Tracking

Selection tracking is implemented where practical on approved surfaces.

### 5.1 State Model

```typescript
interface SelectionState {
  hasSelection: boolean;        // Whether selection exists
  selectionStart?: number;     // Character offset start
  selectionEnd?: number;      // Character offset end
  selectedText?: string;       // Selected text content
  selectionLength: number;    // Number of chars selected
  isBackward: boolean;        // Selection direction
  timestamp: string;           // ISO 8601 timestamp
}
```

### 5.2 Tracking by Surface

| Surface | Selection Tracking |
|---------|-------------------|
| VS Code Editor | ✅ Full support |
| VS Code Terminal | ✅ Full support |
| Chrome Address Bar | ✅ Full support |

---

## 6. Text Insertion Precheck

A safety check performed before text insertion operations to ensure text won't be lost or misplaced.

### 6.1 Precheck Results

| Reason | Allowed | Description |
|--------|---------|-------------|
| `SAFE` | ✅ Yes | Safe to insert text |
| `NO_CARET` | ❌ No | No caret present - text would be lost |
| `NO_FOCUS` | ❌ No | No surface in focus |
| `UNSAFE_CONTROL` | ❌ No | Control doesn't accept text |
| `UNSUPPORTED_SURFACE` | ❌ No | Surface not in approved list |
| `SELECTION_EXISTS` | ⚠️ Yes | Text will replace selection |

### 6.2 Precheck Flow

```
Text Insertion Request
        ↓
  Get Current Surface
        ↓
  Check if Surface Approved?
        ↓ No → UNSUPPORTED_SURFACE
        ↓ Yes
  Check acceptsInput?
        ↓ No → UNSAFE_CONTROL
        ↓ Yes
  Check Caret Presence?
        ↓ No → NO_CARET
        ↓ Yes
  Check Selection?
        ↓ Exists → SELECTION_EXISTS (allow)
        ↓ None → SAFE
```

---

## 7. Chrome Page Fallback Semantics

> **Important:** This is a PM hardening requirement from FP-3B.

### 7.1 Behavior Specification

| Target | Behavior | Classification |
|--------|----------|---------------|
| `address_bar` | Ctrl+L focuses address bar | INTENTIONAL |
| `page` | Default state when Chrome focused | INTENTIONAL (not failure) |
| `page` | "Do nothing" action | INTENTIONAL (not silent failure) |
| `tab_bar` | No direct shortcut | HEURISTIC |

### 7.2 Important Notes

1. **Chrome page is NOT a failure**: When user says "focus page", the default state (page content) is the correct behavior. "Do nothing" is intentional, not silent failure.

2. **Address bar is verified**: Ctrl+L always works - this is `shortcut_inference` at high confidence.

3. **tab_bar is heuristic**: No single shortcut focuses the tab bar directly.

---

## 8. Transfer Failed Behavior (User-Safe)

> **Critical:** PM hardening requirement - `transfer_failed` must NEVER be silent.

### 8.1 User-Safe Error Messages

| Surface | Failure Type | User-Safe Message |
|---------|-------------|-------------------|
| Chrome Address Bar | Any | "Could not focus Chrome address bar. Please try pressing Ctrl+L manually." |
| Chrome Omnibox | Any | "Could not focus Chrome omnibox. Please try pressing Ctrl+L manually." |
| VS Code Editor | Any | "Could not focus VS Code editor. Please try clicking in the editor first." |
| VS Code Terminal | Any | "Could not focus VS Code terminal. Please try pressing Ctrl+` first." |
| Generic | Default | "Focus transfer failed. Please try again or use an alternative method." |

### 8.2 Implementation

The `getUserSafeErrorMessage()` method in `FocusPrecisionService` ensures all transfer failures produce user-visible feedback.

---

## 9. Debug Events

Structured telemetry events for precision focus operations.

### 9.1 Event Types

| Event | Description |
|-------|-------------|
| `surface_detected` | Control surface detected |
| `caret_detected` | Caret presence determined |
| `selection_detected` | Selection state determined |
| `text_insertion_check` | Text precheck performed |
| `transfer_attempted` | Precision transfer attempted |
| `transfer_completed` | Transfer succeeded |
| `transfer_failed` | Transfer failed |

### 9.2 Event Shape

```typescript
interface PrecisionFocusDebugEvent {
  eventType: string;
  timestamp: string;
  application: string;
  controlType: ControlType;
  detectionAuthority: DetectionAuthority;
  hasCaret?: boolean;
  hasSelection?: boolean;
  selectionLength?: number;
  textInsertionAllowed?: boolean;
  errorDetails?: string;
}
```

---

## 10. Implementation

### 10.1 Service Location

| File | Description |
|------|-------------|
| `maestro/client/src/main/runtime/focus-precision-service.ts` | Main service implementation |

### 10.2 Key Classes

| Class | Purpose |
|-------|---------|
| `FocusPrecisionService` | Main service for precision focus operations |
| `DetectionAuthority` | Enum for detection authority types |
| `ControlType` | Enum for control types on approved surfaces |
| `PrecisionSurface` | Surface definition interface |
| `CaretPresenceState` | Caret presence state interface |
| `SelectionState` | Selection state interface |

---

## 11. Boundaries (What We DON'T Do)

Per the FP-4A charter:

- ❌ **No full caret semantics** - Only presence detection
- ❌ **No general browser control targeting** - Only approved surfaces
- ❌ **No full modal system** - Modal policy deferred
- ❌ **No recovery engine** - Recovery deferred to future phase
- ❌ **No semantic referent routing** - Layer 8 deferred
- ❌ **No universal accessibility-tree traversal** - Limited to approved surfaces

---

## 12. Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-4A.1 | Control focus model for approved surfaces | ✅ Complete |
| FP-4A.2 | Caret presence state model | ✅ Complete |
| FP-4A.3 | Control detection on approved surfaces | ✅ Complete |
| FP-4A.4 | Selection tracking where practical | ✅ Complete |
| FP-4A.5 | Text-insertion precheck | ✅ Complete |
| FP-4A.6 | Debug/telemetry with control/caret facts | ✅ Complete |
| FP-4A.7 | Detection-authority field | ✅ Complete |
| FP-4A.8 | Chrome page fallback semantics documented | ✅ Complete |
| FP-4A.9 | Transfer_failed user-safe behavior | ✅ Complete |

---

## 13. Related Documents

- [Focus Project Charter](./focus-project-charter.md)
- [Maestro Implementation Progress](./maestro-implementation-progress.md)
- [Focus Region Service](./focus-region-service.ts)
- [Focus Region Handler](./focus-region-handler.ts)
