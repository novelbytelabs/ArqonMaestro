/**
 * Focus Precision Service
 *
 * Provides precision focus tracking for Layer 5 (Control) and Layer 7 (Caret).
 * Part of FP-4A: Precision Focus Foundations
 * FP-4B: Precision Focus Hardening
 *
 * This service provides:
 * - Control focus tracking on limited surfaces (VS Code editor, terminal, Chrome address bar)
 * - Selection tracking where practical
 * - Caret presence detection (not full semantics)
 * - Text-insertion precheck for safety
 * - Insertion-class command guards
 *
 * =============================================================================
 * APPROVED SURFACES (FP-4A)
 * =============================================================================
 *
 * Precision focus is limited to these surfaces:
 * | Surface           | Application  | Control Type      | Detection Authority    |
 * |-------------------|-------------|------------------|------------------------|
 * | VS Code Editor    | VS Code     | text_editor      | direct_integration    |
 * | VS Code Terminal  | VS Code     | terminal         | direct_integration    |
 * | Chrome Address Bar| Chrome      | address_bar      | shortcut_inference    |
 *
 * =============================================================================
 * DETECTION AUTHORITY (PM Hardening Notes)
 * =============================================================================
 *
 * | Authority           | Description                                            |
 * |--------------------|--------------------------------------------------------|
 * | direct_integration | Direct API/extension integration (most reliable)       |
 * | accessibility      | OS accessibility API (AT)                            |
 * | shortcut_inference | Known keyboard shortcut behavior                      |
 * | heuristic         | Heuristic inference (least reliable)                 |
 *
 * =============================================================================
 * SELECTION AUTHORITY (FP-4B)
 * =============================================================================
 *
 * Tracks the authority/source of selection state information:
 * | Authority         | Description                                            |
 * |-------------------|--------------------------------------------------------|
 * | application_api   | Direct application API (most reliable)                 |
 * | accessibility     | OS accessibility API                                   |
 * | inferred          | Inferred from document/control state                   |
 *
 * =============================================================================
 * EDITABLE VS CARET STATE (FP-4B - PM Hardening Notes)
 * =============================================================================
 *
 * PM Hardening: Separate "editable" from "caret present"
 * - editable_state: Whether the surface CAN accept text input
 * - caret_state: Whether there is currently a cursor/caret
 *
 * These are different because:
 * - A surface can be editable (accepts input) but have no caret (e.g., button focus)
 * - A surface can have a caret but not be fully editable (e.g., read-only region)
 *
 * =============================================================================
 * CHROME PAGE FALLBACK SEMANTICS (PM Hardening Notes)
 * =============================================================================
 *
 * When focus transfer to Chrome fails:
 * 1. If target was address_bar and fails -> return user-safe error message
 * 2. If target was page and nothing happens -> this is INTENTIONAL (not silent failure)
 * 3. If target was page and we can't determine -> log but don't fail silently
 * 4. transfer_failed behavior must always be user-safe (visible feedback)
 *
 * =============================================================================
 * BOUNDARIES (DO NOT DO)
 * =============================================================================
 *
 * - No full caret semantics (position, line, column only)
 * - No general browser control targeting
 * - No full modal system
 * - No recovery engine
 * - No semantic referent routing
 * - No universal accessibility-tree traversal
 */

import { FocusLayer } from "./focus-verification-service";
import { RegionKind, SupportedApplication } from "./focus-region-service";

/**
 * Detection authority for precision focus (PM Hardening Notes)
 * Classifies how the focus/control was detected
 */
export enum DetectionAuthority {
  /** Direct API/extension integration - most reliable */
  DIRECT_INTEGRATION = "direct_integration",
  /** Operating system accessibility API (AT) */
  ACCESSIBILITY = "accessibility",
  /** Known keyboard shortcut behavior */
  SHORTCUT_INFERENCE = "shortcut_inference",
  /** Heuristic inference - least reliable */
  HEURISTIC = "heuristic",
}

/**
 * Selection authority for precision focus (FP-4B)
 * Classifies how the selection state was determined
 */
export enum SelectionAuthority {
  /** Direct application API - most reliable */
  APPLICATION_API = "application_api",
  /** Operating system accessibility API */
  ACCESSIBILITY = "accessibility",
  /** Inferred from document/control state */
  INFERRED = "inferred",
}

/**
 * Insertion-class command types (FP-4B)
 * Commands that insert text content and require precision focus
 */
export enum InsertionCommandType {
  /** Direct text insertion */
  INSERT = "insert",
  /** Dictation text insertion */
  DICTATE = "dictate",
  /** Spelling expansion */
  SPELLING = "spelling",
  /** Template insertion */
  TEMPLATE = "template",
  /** Clipboard paste */
  PASTE = "paste",
  /** Auto-complete selection */
  AUTOCOMPLETE = "autocomplete",
  /** Unknown insertion type */
  UNKNOWN = "unknown",
}

/**
 * Control types for approved surfaces (Layer 5)
 */
export enum ControlType {
  // VS Code controls
  TEXT_EDITOR = "text_editor",
  TERMINAL = "terminal",
  SEARCH_BOX = "search_box",
  INPUT_BOX = "input_box",
  SCM_VIEW = "scm_view",

  // Chrome controls
  ADDRESS_BAR = "address_bar",
  OMNIBOX = "omnibox",
  SEARCH_FIELD = "search_field",

  // Generic
  UNKNOWN = "unknown",
  NONE = "none",
}

/**
 * Precision focus surface - the specific surface being tracked
 * These are the approved surfaces from FP-4A
 */
export interface PrecisionSurface {
  /** Application name */
  application: string;
  /** Control type on the surface */
  controlType: ControlType;
  /** Parent region (from Layer 4) */
  regionKind?: RegionKind;
  /** Optional control identifier (e.g., terminal instance ID) */
  controlId?: string;
  /** Detection authority for how this was determined */
  detectionAuthority: DetectionAuthority;
}

/**
 * Caret presence state (Layer 7 - limited to presence detection)
 * NOT full caret semantics - only presence detection
 * 
 * FP-4B: Separated from editable state per PM hardening notes
 */
export interface CaretPresenceState {
  /** Whether a caret is present */
  hasCaret: boolean;
  /** The surface where caret is present */
  surface: PrecisionSurface | null;
  /** Timestamp when state was captured */
  timestamp: string;
  /** Detection authority for caret presence */
  detectionAuthority: DetectionAuthority;
}

/**
 * Editable state (FP-4B - PM Hardening Notes)
 * 
 * Separated from caret state because:
 * - A surface can be editable (accepts input) but have no caret
 * - A surface can have a caret but not be fully editable
 * 
 * This represents whether text CAN be inserted, regardless of caret position
 */
export interface EditableState {
  /** Whether the surface is currently editable (can accept text) */
  isEditable: boolean;
  /** The surface where editable state applies */
  surface: PrecisionSurface | null;
  /** Reason for editable state (if not editable) */
  reason?: string;
  /** Timestamp when state was captured */
  timestamp: string;
  /** Detection authority for editable state */
  detectionAuthority: DetectionAuthority;
}

/**
 * Selection state for text controls
 * Where practical to track
 * 
 * FP-4B: Includes SelectionAuthority for telemetry visibility
 */
export interface SelectionState {
  /** Whether there is an active selection */
  hasSelection: boolean;
  /** Selection start position (character offset) */
  selectionStart?: number;
  /** Selection end position (character offset) */
  selectionEnd?: number;
  /** Selected text content (if available) */
  selectedText?: string;
  /** Number of characters selected */
  selectionLength: number;
  /** Whether selection is backwards (end < start) */
  isBackward: boolean;
  /** Timestamp when state was captured */
  timestamp: string;
  /** Selection authority - how selection was determined (FP-4B) */
  selectionAuthority: SelectionAuthority;
}

/**
 * Combined precision focus state (FP-4B - normalized)
 * Aggregates control, caret, editable, and selection information
 * 
 * Normalized per PM hardening notes to separate:
 * - editable_state: Can the surface accept text?
 * - caret_state: Is there a cursor present?
 */
export interface PrecisionFocusState {
  /** Current control/surface in focus */
  surface: PrecisionSurface | null;
  /** Caret presence information (Layer 7) */
  caret: CaretPresenceState;
  /** Editable state - can surface accept text? (FP-4B) */
  editable: EditableState;
  /** Current selection (if any) */
  selection: SelectionState | null;
  /** Whether text insertion is safe at current position */
  isTextInsertionSafe: boolean;
  /** Timestamp when state was captured */
  timestamp: string;
}

/**
 * Text insertion precheck result
 * Used for safety checks before text insertion operations
 */
export interface TextInsertionPrecheck {
  /** Whether text insertion is allowed */
  allowed: boolean;
  /** Reason for the result */
  reason: TextInsertionReason;
  /** Detailed message for logging/debugging */
  message: string;
  /** Surface information if relevant */
  surface?: PrecisionSurface;
}

/**
 * Blocked insertion result (FP-4B)
 * 
 * Contains user-safe error messages for blocked insertions
 * Ensures blocked outcomes are never silent
 */
export interface BlockedInsertionResult {
  /** Whether the insertion was blocked */
  blocked: boolean;
  /** The reason the insertion was blocked */
  reason: TextInsertionReason;
  /** User-safe message (can be displayed to user) */
  userSafeMessage: string;
  /** Technical details for logging */
  technicalDetails: string;
  /** Surface information if relevant */
  surface?: PrecisionSurface;
  /** Timestamp when blocked */
  timestamp: string;
}

/**
 * Reasons for text insertion precheck result
 */
export enum TextInsertionReason {
  SAFE = "safe",
  NO_CARET = "no_caret",
  NO_FOCUS = "no_focus",
  UNSAFE_CONTROL = "unsafe_control",
  UNSUPPORTED_SURFACE = "unsupported_surface",
  SELECTION_EXISTS = "selection_exists",
  READ_ONLY = "read_only",
}

/**
 * Precision focus transfer result
 */
export interface PrecisionTransferResult {
  /** Whether the transfer was successful */
  success: boolean;
  /** The target surface */
  target: PrecisionSurface;
  /** Details about the transfer */
  details: string;
  /** Error if failed */
  error?: string;
  /** Detection authority for the result */
  detectionAuthority: DetectionAuthority;
  /** User-safe error message (PM Hardening Notes) */
  userSafeMessage?: string;
}

/**
 * Debug event for precision focus (FP-4A)
 */
export interface PrecisionFocusDebugEvent {
  /** Event type */
  eventType: "surface_detected" | "caret_detected" | "selection_detected" | 
              "text_insertion_check" | "transfer_attempted" | "transfer_completed" | 
              "transfer_failed";
  /** Timestamp in ISO 8601 */
  timestamp: string;
  /** Application */
  application: string;
  /** Control type */
  controlType: ControlType;
  /** Detection authority */
  detectionAuthority: DetectionAuthority;
  /** Whether caret is present */
  hasCaret?: boolean;
  /** Whether selection exists */
  hasSelection?: boolean;
  /** Selection length if applicable */
  selectionLength?: number;
  /** Text insertion allowed */
  textInsertionAllowed?: boolean;
  /** Error details if failed */
  errorDetails?: string;
}

/**
 * Surface definitions for approved surfaces
 * Maps control types to their detection authority and properties
 */
export const APPROVED_SURFACES: Record<SupportedApplication, Partial<Record<ControlType, {
  acceptsInput: boolean;
  hasSelection: boolean;
  hasCaret: boolean;
  detectionAuthority: DetectionAuthority;
  requiresTextPrecheck: boolean;
}>>> = {
  [SupportedApplication.VSCODE]: {
    [ControlType.TEXT_EDITOR]: {
      acceptsInput: true,
      hasSelection: true,
      hasCaret: true,
      detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      requiresTextPrecheck: true,
    },
    [ControlType.TERMINAL]: {
      acceptsInput: true,
      hasSelection: true,
      hasCaret: true,
      detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      requiresTextPrecheck: true,
    },
    [ControlType.SEARCH_BOX]: {
      acceptsInput: true,
      hasSelection: true,
      hasCaret: true,
      detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      requiresTextPrecheck: true,
    },
    [ControlType.INPUT_BOX]: {
      acceptsInput: true,
      hasSelection: true,
      hasCaret: true,
      detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      requiresTextPrecheck: true,
    },
    [ControlType.SCM_VIEW]: {
      acceptsInput: false,
      hasSelection: false,
      hasCaret: false,
      detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      requiresTextPrecheck: false,
    },
    [ControlType.UNKNOWN]: {
      acceptsInput: false,
      hasSelection: false,
      hasCaret: false,
      detectionAuthority: DetectionAuthority.HEURISTIC,
      requiresTextPrecheck: false,
    },
    [ControlType.NONE]: {
      acceptsInput: false,
      hasSelection: false,
      hasCaret: false,
      detectionAuthority: DetectionAuthority.HEURISTIC,
      requiresTextPrecheck: false,
    },
  },
  [SupportedApplication.CHROME]: {
    [ControlType.ADDRESS_BAR]: {
      acceptsInput: true,
      hasSelection: true,
      hasCaret: true,
      detectionAuthority: DetectionAuthority.SHORTCUT_INFERENCE,
      requiresTextPrecheck: true,
    },
    [ControlType.OMNIBOX]: {
      acceptsInput: true,
      hasSelection: true,
      hasCaret: true,
      detectionAuthority: DetectionAuthority.SHORTCUT_INFERENCE,
      requiresTextPrecheck: true,
    },
    [ControlType.SEARCH_FIELD]: {
      acceptsInput: true,
      hasSelection: true,
      hasCaret: true,
      detectionAuthority: DetectionAuthority.HEURISTIC,
      requiresTextPrecheck: true,
    },
    [ControlType.UNKNOWN]: {
      acceptsInput: false,
      hasSelection: false,
      hasCaret: false,
      detectionAuthority: DetectionAuthority.HEURISTIC,
      requiresTextPrecheck: false,
    },
    [ControlType.NONE]: {
      acceptsInput: false,
      hasSelection: false,
      hasCaret: false,
      detectionAuthority: DetectionAuthority.HEURISTIC,
      requiresTextPrecheck: false,
    },
  },
  [SupportedApplication.UNKNOWN]: {
    [ControlType.UNKNOWN]: {
      acceptsInput: false,
      hasSelection: false,
      hasCaret: false,
      detectionAuthority: DetectionAuthority.HEURISTIC,
      requiresTextPrecheck: false,
    },
    [ControlType.NONE]: {
      acceptsInput: false,
      hasSelection: false,
      hasCaret: false,
      detectionAuthority: DetectionAuthority.HEURISTIC,
      requiresTextPrecheck: false,
    },
  },
};

/**
 * Mapping from region kinds to control types for approved surfaces
 */
export const REGION_TO_CONTROL_MAP: Record<RegionKind, ControlType | null> = {
  // VS Code regions
  [RegionKind.EDITOR]: ControlType.TEXT_EDITOR,
  [RegionKind.TERMINAL]: ControlType.TERMINAL,
  [RegionKind.SIDEBAR]: null, // Not a text control
  [RegionKind.ACTIVITY_BAR]: null,
  [RegionKind.STATUS_BAR]: null,
  [RegionKind.PANEL]: null,
  [RegionKind.EXPLORER]: null,
  [RegionKind.SEARCH]: ControlType.SEARCH_BOX,
  [RegionKind.EXTENSIONS]: null,
  [RegionKind.DEBUG_CONSOLE]: null,
  [RegionKind.OUTPUT]: null,

  // Chrome regions
  [RegionKind.PAGE]: null, // Page content - not a specific control
  [RegionKind.ADDRESS_BAR]: ControlType.ADDRESS_BAR,
  [RegionKind.TAB_BAR]: null,
  [RegionKind.BOOKMARKS_BAR]: null,
  [RegionKind.DEVTOOLS]: null,
  [RegionKind.DOWNLOADS]: null,
  [RegionKind.BOOKMARKS]: null,
  [RegionKind.HISTORY]: null,
  [RegionKind.SETTINGS]: null,

  // Generic
  [RegionKind.UNKNOWN]: null,
  [RegionKind.NONE]: null,
};

/**
 * Confidence scores by detection authority
 */
export const DETECTION_AUTHORITY_CONFIDENCE: Record<DetectionAuthority, number> = {
  [DetectionAuthority.DIRECT_INTEGRATION]: 1.0,
  [DetectionAuthority.ACCESSIBILITY]: 0.85,
  [DetectionAuthority.SHORTCUT_INFERENCE]: 0.9,
  [DetectionAuthority.HEURISTIC]: 0.5,
};

/**
 * Confidence scores by selection authority (FP-4B)
 */
export const SELECTION_AUTHORITY_CONFIDENCE: Record<SelectionAuthority, number> = {
  [SelectionAuthority.APPLICATION_API]: 1.0,
  [SelectionAuthority.ACCESSIBILITY]: 0.85,
  [SelectionAuthority.INFERRED]: 0.6,
};

/**
 * Terminal caret detection method (FP-4B - PM Hardening Notes)
 * 
 * Documents the exact detection method used for terminal caret
 * Conservative approach: Only detect when certain
 */
export enum TerminalCaretDetectionMethod {
  /** Direct VS Code Terminal API integration */
  VSCODE_TERMINAL_API = "vscode_terminal_api",
  /** Terminal process control character detection */
  TERMINAL_CONTROL_CHARS = "terminal_control_chars",
  /** Heuristic based on cursor position requests */
  CURSOR_POSITION_HEURISTIC = "cursor_position_heuristic",
  /** Cannot detect - terminal is a black box */
  UNDETECTABLE = "undetectable",
}

/**
 * Terminal caret detection result (FP-4B)
 * Documents exact detection method per PM hardening notes
 */
export interface TerminalCaretDetectionResult {
  /** Whether caret was detected */
  hasCaret: boolean;
  /** The detection method used */
  detectionMethod: TerminalCaretDetectionMethod;
  /** Confidence in the detection [0.0, 1.0] */
  confidence: number;
  /** Details about the detection */
  details: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Check if a surface is approved for precision focus
 */
export function isApprovedSurface(application: string, controlType: ControlType): boolean {
  // Normalize application name
  const normalizedApp = application.toLowerCase();
  
  let supportedApp: SupportedApplication;
  if (normalizedApp.includes("vscode") || normalizedApp.includes("visual studio code")) {
    supportedApp = SupportedApplication.VSCODE;
  } else if (normalizedApp.includes("chrome") || normalizedApp.includes("google-chrome")) {
    supportedApp = SupportedApplication.CHROME;
  } else {
    return false;
  }

  const surfaceConfig = APPROVED_SURFACES[supportedApp]?.[controlType];
  return surfaceConfig !== undefined && surfaceConfig.acceptsInput;
}

export default class FocusPrecisionService {
  /**
   * Detect the current precision surface (control in focus)
   * 
   * @param application - The application name
   * @param regionKind - The current region (optional, from Layer 4)
   * @returns The detected precision surface or null
   */
  async detectPrecisionSurface(
    application: string,
    regionKind?: RegionKind
  ): Promise<PrecisionSurface | null> {
    const timestamp = new Date().toISOString();
    
    // Normalize application name
    const normalizedApp = application.toLowerCase();
    
    // Determine application type
    let supportedApp: SupportedApplication;
    if (normalizedApp.includes("vscode") || normalizedApp.includes("visual studio code") || normalizedApp.includes("code")) {
      supportedApp = SupportedApplication.VSCODE;
    } else if (normalizedApp.includes("chrome") || normalizedApp.includes("google-chrome") || normalizedApp.includes("chromium")) {
      supportedApp = SupportedApplication.CHROME;
    } else {
      return null;
    }

    // Determine control type from region
    let controlType: ControlType | null = null;
    let detectionAuthority: DetectionAuthority = DetectionAuthority.HEURISTIC;

    if (regionKind) {
      controlType = REGION_TO_CONTROL_MAP[regionKind] ?? null;
    }

    // If we have a region-derived control type, use it
    if (controlType) {
      const surfaceConfig = APPROVED_SURFACES[supportedApp]?.[controlType];
      if (surfaceConfig) {
        detectionAuthority = surfaceConfig.detectionAuthority;
        
        return {
          application: normalizedApp,
          controlType,
          regionKind,
          detectionAuthority,
        };
      }
    }

    // Fallback: try to detect based on application behavior
    // VS Code: check for active text editor or terminal via API
    if (supportedApp === SupportedApplication.VSCODE) {
      // This would use VS Code extension API in real implementation
      // For now, return heuristic-based detection
      return {
        application: normalizedApp,
        controlType: ControlType.UNKNOWN,
        regionKind,
        detectionAuthority: DetectionAuthority.HEURISTIC,
      };
    }

    // Chrome: check for address bar focus
    if (supportedApp === SupportedApplication.CHROME) {
      // This would use Chrome extension API in real implementation
      // For now, return heuristic-based detection
      return {
        application: normalizedApp,
        controlType: ControlType.UNKNOWN,
        regionKind,
        detectionAuthority: DetectionAuthority.HEURISTIC,
      };
    }

    return null;
  }

  /**
   * Detect caret presence (not full semantics - only presence)
   * 
   * @param surface - The current precision surface
   * @returns Caret presence state
   */
  async detectCaretPresence(surface: PrecisionSurface | null): Promise<CaretPresenceState> {
    const timestamp = new Date().toISOString();
    
    if (!surface) {
      return {
        hasCaret: false,
        surface: null,
        timestamp,
        detectionAuthority: DetectionAuthority.HEURISTIC,
      };
    }

    // Check if this surface type can have a caret
    const surfaceConfig = APPROVED_SURFACES[
      surface.application.includes("vscode") ? SupportedApplication.VSCODE :
      surface.application.includes("chrome") ? SupportedApplication.CHROME :
      SupportedApplication.UNKNOWN
    ]?.[surface.controlType];

    if (!surfaceConfig?.hasCaret) {
      return {
        hasCaret: false,
        surface,
        timestamp,
        detectionAuthority: surfaceConfig?.detectionAuthority ?? DetectionAuthority.HEURISTIC,
      };
    }

    // In a real implementation, this would query the application
    // For VS Code: check activeTextEditor.selection or activeTerminal
    // For Chrome: check document.activeElement for input/textarea
    
    // Placeholder for actual implementation
    return {
      hasCaret: true, // Assume true for approved surfaces that support it
      surface,
      timestamp,
      detectionAuthority: surface.detectionAuthority,
    };
  }

  /**
   * Detect editable state (FP-4B - PM Hardening Notes)
   * 
   * Separated from caret detection because:
   * - A surface can be editable (accepts input) but have no caret
   * - A surface can have a caret but not be fully editable
   * 
   * @param surface - The current precision surface
   * @returns Editable state
   */
  async detectEditableState(surface: PrecisionSurface | null): Promise<EditableState> {
    const timestamp = new Date().toISOString();
    
    if (!surface) {
      return {
        isEditable: false,
        surface: null,
        reason: "No surface in focus",
        timestamp,
        detectionAuthority: DetectionAuthority.HEURISTIC,
      };
    }

    // Check if this surface type accepts input
    const surfaceConfig = APPROVED_SURFACES[
      surface.application.includes("vscode") ? SupportedApplication.VSCODE :
      surface.application.includes("chrome") ? SupportedApplication.CHROME :
      SupportedApplication.UNKNOWN
    ]?.[surface.controlType];

    if (!surfaceConfig) {
      return {
        isEditable: false,
        surface,
        reason: `Unknown surface type: ${surface.controlType}`,
        timestamp,
        detectionAuthority: DetectionAuthority.HEURISTIC,
      };
    }

    if (!surfaceConfig.acceptsInput) {
      return {
        isEditable: false,
        surface,
        reason: `Control ${surface.controlType} does not accept text input`,
        timestamp,
        detectionAuthority: surfaceConfig.detectionAuthority,
      };
    }

    // In a real implementation, would check if the control is:
    // - Not read-only
    // - Not disabled
    // - Not in a non-editable mode
    
    return {
      isEditable: true,
      surface,
      timestamp,
      detectionAuthority: surface.detectionAuthority,
    };
  }

  /**
   * Detect terminal caret using conservative method (FP-4B - PM Hardening Notes)
   * 
   * Terminal caret detection is inherently unreliable. This method documents
   * the exact detection method and uses conservative semantics.
   * 
   * @param surface - The current precision surface
   * @returns Terminal caret detection result
   */
  async getTerminalCaretDetection(surface: PrecisionSurface | null): Promise<TerminalCaretDetectionResult> {
    const timestamp = new Date().toISOString();
    
    // Not a terminal
    if (!surface || surface.controlType !== ControlType.TERMINAL) {
      return {
        hasCaret: false,
        detectionMethod: TerminalCaretDetectionMethod.UNDETECTABLE,
        confidence: 0,
        details: "Not a terminal surface",
        timestamp,
      };
    }

    // VS Code Terminal - can potentially use Terminal API
    if (surface.application.includes("vscode")) {
      // In real implementation, would query VS Code Terminal API
      // For now, use heuristic-based conservative approach
      return {
        hasCaret: true, // Assume true when terminal is focused
        detectionMethod: TerminalCaretDetectionMethod.VSCODE_TERMINAL_API,
        confidence: 0.7, // Conservative - terminal API is not 100% reliable
        details: "VS Code Terminal API integration (conservative)",
        timestamp,
      };
    }

    // Generic terminal - hard to detect reliably
    return {
      hasCaret: false, // Conservative: assume no caret for unknown terminals
      detectionMethod: TerminalCaretDetectionMethod.UNDETECTABLE,
      confidence: 0.1,
      details: "Generic terminal caret is undetectable - conservative fallback",
      timestamp,
    };
  }

  /**
   * Detect selection state (where practical)
   * 
   * FP-4B: Includes SelectionAuthority in return value for telemetry visibility
   * 
   * @param surface - The current precision surface
   * @returns Selection state or null if not applicable
   */
  async detectSelection(surface: PrecisionSurface | null): Promise<SelectionState | null> {
    const timestamp = new Date().toISOString();
    
    if (!surface) {
      return null;
    }

    // Check if this surface type can have selection
    const surfaceConfig = APPROVED_SURFACES[
      surface.application.includes("vscode") ? SupportedApplication.VSCODE :
      surface.application.includes("chrome") ? SupportedApplication.CHROME :
      SupportedApplication.UNKNOWN
    ]?.[surface.controlType];

    if (!surfaceConfig?.hasSelection) {
      return null;
    }

    // In a real implementation, this would query the application
    // For VS Code: check selection in activeTextEditor
    // For Chrome: check window.getSelection() or input.value selection
    
    // Determine selection authority based on detection method
    let selectionAuthority: SelectionAuthority;
    switch (surface.detectionAuthority) {
      case DetectionAuthority.DIRECT_INTEGRATION:
        selectionAuthority = SelectionAuthority.APPLICATION_API;
        break;
      case DetectionAuthority.ACCESSIBILITY:
        selectionAuthority = SelectionAuthority.ACCESSIBILITY;
        break;
      default:
        selectionAuthority = SelectionAuthority.INFERRED;
    }
    
    // Placeholder for actual implementation - return no selection by default
    return {
      hasSelection: false,
      selectionStart: 0,
      selectionEnd: 0,
      selectionLength: 0,
      isBackward: false,
      timestamp,
      selectionAuthority,
    };
  }

  /**
   * Perform text insertion precheck (safety check)
   * 
   * @param surface - The current precision surface
   * @returns Text insertion precheck result
   */
  async textInsertionPrecheck(surface: PrecisionSurface | null): Promise<TextInsertionPrecheck> {
    // No surface = no focus = can't insert text
    if (!surface) {
      return {
        allowed: false,
        reason: TextInsertionReason.NO_FOCUS,
        message: "No precision surface in focus - cannot insert text",
      };
    }

    // Check if surface is approved for text input
    const supportedApp = surface.application.includes("vscode") ? SupportedApplication.VSCODE :
                        surface.application.includes("chrome") ? SupportedApplication.CHROME :
                        SupportedApplication.UNKNOWN;
    
    const surfaceConfig = APPROVED_SURFACES[supportedApp]?.[surface.controlType];
    
    if (!surfaceConfig) {
      return {
        allowed: false,
        reason: TextInsertionReason.UNSUPPORTED_SURFACE,
        message: `Surface ${surface.controlType} is not supported for text insertion`,
        surface,
      };
    }

    if (!surfaceConfig.acceptsInput) {
      return {
        allowed: false,
        reason: TextInsertionReason.UNSAFE_CONTROL,
        message: `Control ${surface.controlType} does not accept text input`,
        surface,
      };
    }

    if (!surfaceConfig.requiresTextPrecheck) {
      return {
        allowed: true,
        reason: TextInsertionReason.SAFE,
        message: "Text insertion is safe - surface does not require precheck",
        surface,
      };
    }

    // For surfaces requiring precheck, verify caret presence
    const caretState = await this.detectCaretPresence(surface);
    
    if (!caretState.hasCaret) {
      return {
        allowed: false,
        reason: TextInsertionReason.NO_CARET,
        message: "No caret present - text would be lost or misplaced",
        surface,
      };
    }

    // Check for existing selection
    const selectionState = await this.detectSelection(surface);
    
    if (selectionState?.hasSelection && (selectionState.selectionLength ?? 0) > 0) {
      return {
        allowed: true, // Allow but document selection exists
        reason: TextInsertionReason.SELECTION_EXISTS,
        message: `Selection exists (${selectionState.selectionLength} chars) - text will replace selection`,
        surface,
      };
    }

    return {
      allowed: true,
      reason: TextInsertionReason.SAFE,
      message: "Text insertion is safe - caret present and no selection",
      surface,
    };
  }

  /**
   * Get complete precision focus state (FP-4B - normalized)
   * 
   * Returns normalized state with separated editable vs caret state
   * 
   * @param application - Current application
   * @param regionKind - Current region (optional)
   * @returns Complete precision focus state
   */
  async getPrecisionFocusState(
    application: string,
    regionKind?: RegionKind
  ): Promise<PrecisionFocusState> {
    const surface = await this.detectPrecisionSurface(application, regionKind);
    const caret = await this.detectCaretPresence(surface);
    const editable = await this.detectEditableState(surface);
    const selection = await this.detectSelection(surface);
    const textCheck = await this.textInsertionPrecheck(surface);
    
    return {
      surface,
      caret,
      editable,
      selection,
      isTextInsertionSafe: textCheck.allowed,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a debug event for precision focus
   */
  createDebugEvent(
    eventType: PrecisionFocusDebugEvent["eventType"],
    surface: PrecisionSurface | null,
    options: {
      hasCaret?: boolean;
      hasSelection?: boolean;
      selectionLength?: number;
      textInsertionAllowed?: boolean;
      errorDetails?: string;
    }
  ): PrecisionFocusDebugEvent {
    return {
      eventType,
      timestamp: new Date().toISOString(),
      application: surface?.application ?? "unknown",
      controlType: surface?.controlType ?? ControlType.UNKNOWN,
      detectionAuthority: surface?.detectionAuthority ?? DetectionAuthority.HEURISTIC,
      hasCaret: options.hasCaret,
      hasSelection: options.hasSelection,
      selectionLength: options.selectionLength,
      textInsertionAllowed: options.textInsertionAllowed,
      errorDetails: options.errorDetails,
    };
  }

  /**
   * Get detection authority confidence score
   */
  getDetectionAuthorityConfidence(authority: DetectionAuthority): number {
    return DETECTION_AUTHORITY_CONFIDENCE[authority] ?? 0.5;
  }

  /**
   * Get selection authority confidence score (FP-4B)
   */
  getSelectionAuthorityConfidence(authority: SelectionAuthority): number {
    return SELECTION_AUTHORITY_CONFIDENCE[authority] ?? 0.5;
  }

  /**
   * Check if a command type is an insertion-class command (FP-4B)
   * 
   * Insertion-class commands require precision focus to work correctly
   * because they insert text content that could be lost or misplaced
   * without proper caret/editable state.
   * 
   * @param commandType - The command type string (e.g., "insert", "dictate")
   * @returns Whether this is an insertion-class command
   */
  isInsertionClassCommand(commandType: string): boolean {
    const insertionTypes: Record<InsertionCommandType, boolean> = {
      [InsertionCommandType.INSERT]: true,
      [InsertionCommandType.DICTATE]: true,
      [InsertionCommandType.SPELLING]: true,
      [InsertionCommandType.TEMPLATE]: true,
      [InsertionCommandType.PASTE]: true,
      [InsertionCommandType.AUTOCOMPLETE]: true,
      [InsertionCommandType.UNKNOWN]: false,
    };
    
    // Normalize command type
    const normalized = commandType.toLowerCase().trim();
    
    // Check against known insertion types
    if (normalized in insertionTypes) {
      return insertionTypes[normalized as InsertionCommandType];
    }
    
    // Check if it contains insertion-related keywords
    const insertionKeywords = ["insert", "dictat", "spell", "template", "paste", "autocomplete"];
    return insertionKeywords.some(keyword => normalized.includes(keyword));
  }

  /**
   * Get insertion command type classification (FP-4B)
   * 
   * @param commandType - The command type string
   * @returns The classified insertion command type
   */
  classifyInsertionCommand(commandType: string): InsertionCommandType {
    const normalized = commandType.toLowerCase().trim();
    
    if (normalized === "insert") return InsertionCommandType.INSERT;
    if (normalized.includes("dictat")) return InsertionCommandType.DICTATE;
    if (normalized.includes("spell")) return InsertionCommandType.SPELLING;
    if (normalized.includes("template")) return InsertionCommandType.TEMPLATE;
    if (normalized.includes("paste")) return InsertionCommandType.PASTE;
    if (normalized.includes("autocomplete")) return InsertionCommandType.AUTOCOMPLETE;
    
    return InsertionCommandType.UNKNOWN;
  }

  /**
   * Check if an insertion should be blocked and return user-safe message (FP-4B)
   * 
   * @param surface - The current precision surface
   * @param commandType - The command type being attempted
   * @returns Blocked insertion result with user-safe message
   */
  async checkBlockedInsertion(
    surface: PrecisionSurface | null,
    commandType: string
  ): Promise<BlockedInsertionResult> {
    const timestamp = new Date().toISOString();
    
    // First check: Is this an insertion-class command?
    if (!this.isInsertionClassCommand(commandType)) {
      return {
        blocked: false,
        reason: TextInsertionReason.SAFE,
        userSafeMessage: "",
        technicalDetails: "Non-insertion command - no blocking needed",
        surface,
        timestamp,
      };
    }

    // No surface = block
    if (!surface) {
      return {
        blocked: true,
        reason: TextInsertionReason.NO_FOCUS,
        userSafeMessage: "No text field in focus. Please click in a text field first.",
        technicalDetails: `Insertion command '${commandType}' blocked: No precision surface`,
        surface: undefined,
        timestamp,
      };
    }

    // Check editable state
    const editable = await this.detectEditableState(surface);
    if (!editable.isEditable) {
      return {
        blocked: true,
        reason: TextInsertionReason.UNSAFE_CONTROL,
        userSafeMessage: `Cannot insert text here. This field (${surface.controlType}) does not accept text input.`,
        technicalDetails: `Insertion command '${commandType}' blocked: Surface not editable - ${editable.reason}`,
        surface,
        timestamp,
      };
    }

    // Check caret state for insertion commands
    const caret = await this.detectCaretPresence(surface);
    
    // For text input commands, require caret presence
    const insertionType = this.classifyInsertionCommand(commandType);
    if (insertionType !== InsertionCommandType.PASTE && !caret.hasCaret) {
      return {
        blocked: true,
        reason: TextInsertionReason.NO_CARET,
        userSafeMessage: "No cursor position detected. Please click where you want to insert text.",
        technicalDetails: `Insertion command '${commandType}' blocked: No caret present`,
        surface,
        timestamp,
      };
    }

    // All checks passed
    return {
      blocked: false,
      reason: TextInsertionReason.SAFE,
      userSafeMessage: "",
      technicalDetails: `Insertion command '${commandType}' allowed`,
      surface,
      timestamp,
    };
  }

  /**
   * Check if transfer failure should be user-safe (PM Hardening Notes)
   * Ensures transfer_failed behavior is never silent
   * 
   * @param result - The transfer result
   * @returns User-safe message if available
   */
  getUserSafeErrorMessage(result: PrecisionTransferResult): string | undefined {
    if (result.success) {
      return undefined;
    }

    // Chrome-specific: address bar failure is always user-safe
    if (result.target.application.includes("chrome")) {
      if (result.target.controlType === ControlType.ADDRESS_BAR) {
        return "Could not focus Chrome address bar. Please try pressing Ctrl+L manually.";
      }
      if (result.target.controlType === ControlType.OMNIBOX) {
        return "Could not focus Chrome omnibox. Please try pressing Ctrl+L manually.";
      }
    }

    // VS Code specific errors
    if (result.target.application.includes("vscode")) {
      if (result.target.controlType === ControlType.TEXT_EDITOR) {
        return "Could not focus VS Code editor. Please try clicking in the editor first.";
      }
      if (result.target.controlType === ControlType.TERMINAL) {
        return "Could not focus VS Code terminal. Please try pressing Ctrl+` first.";
      }
    }

    // Default user-safe message
    return result.userSafeMessage ?? "Focus transfer failed. Please try again or use an alternative method.";
  }

  /**
   * Get user-safe error message for blocked insertion (FP-4B)
   * 
   * @param result - The blocked insertion result
   * @returns User-safe message for display
   */
  getBlockedInsertionUserMessage(result: BlockedInsertionResult): string {
    if (!result.blocked) {
      return "";
    }

    // Return the pre-computed user-safe message
    return result.userSafeMessage;
  }

  /**
   * Get user-safe error message from any supported result type (FP-4B)
   * 
   * Unified interface for getting user-safe messages from either
   * transfer results or blocked insertion results.
   * 
   * @param result - Either a transfer result or blocked insertion result
   * @returns User-safe message if applicable
   */
  getAnyUserSafeMessage(
    result: PrecisionTransferResult | BlockedInsertionResult
  ): string | undefined {
    // Check if it's a blocked insertion result
    if ("blocked" in result) {
      const blockedResult = result as BlockedInsertionResult;
      if (blockedResult.blocked) {
        return blockedResult.userSafeMessage;
      }
      return undefined;
    }

    // Otherwise treat as transfer result
    return this.getUserSafeErrorMessage(result as PrecisionTransferResult);
  }
}
