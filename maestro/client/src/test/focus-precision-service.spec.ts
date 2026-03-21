/**
 * Focus Precision Service Tests (FP-4B)
 * 
 * Test matrix for precision focus hardening features:
 * - Normalized precision state model (editable vs caret separation)
 * - Selection authority telemetry
 * - Insertion-class command guards
 * - Blocked insertion messages
 * 
 * Run with: npx jest focus-precision-service.spec.ts
 */

import FocusPrecisionService, {
  DetectionAuthority,
  SelectionAuthority,
  InsertionCommandType,
  ControlType,
  PrecisionSurface,
  TextInsertionReason,
  TerminalCaretDetectionMethod,
  APPROVED_SURFACES,
} from "../main/runtime/focus-precision-service";
import { RegionKind, SupportedApplication } from "../main/runtime/focus-region-service";

describe("FocusPrecisionService", () => {
  let service: FocusPrecisionService;

  beforeEach(() => {
    service = new FocusPrecisionService();
  });

  // =============================================================================
  // TEST MATRIX: Detection Authority Confidence
  // =============================================================================
  describe("Detection Authority Confidence", () => {
    it.each([
      [DetectionAuthority.DIRECT_INTEGRATION, 1.0],
      [DetectionAuthority.SHORTCUT_INFERENCE, 0.9],
      [DetectionAuthority.ACCESSIBILITY, 0.85],
      [DetectionAuthority.HEURISTIC, 0.5],
    ])("should return correct confidence for %s", (authority, expected) => {
      expect(service.getDetectionAuthorityConfidence(authority)).toBe(expected);
    });
  });

  // =============================================================================
  // TEST MATRIX: Selection Authority Confidence (FP-4B)
  // =============================================================================
  describe("Selection Authority Confidence (FP-4B)", () => {
    it.each([
      [SelectionAuthority.APPLICATION_API, 1.0],
      [SelectionAuthority.ACCESSIBILITY, 0.85],
      [SelectionAuthority.INFERRED, 0.6],
    ])("should return correct confidence for %s", (authority, expected) => {
      expect(service.getSelectionAuthorityConfidence(authority)).toBe(expected);
    });
  });

  // =============================================================================
  // TEST MATRIX: Insertion Class Command Detection (FP-4B)
  // =============================================================================
  describe("Insertion Class Command Detection (FP-4B)", () => {
    const insertionCommands: Array<[string, boolean]> = [
      ["insert", true],
      ["Insert", true],
      ["INSERT", true],
      ["dictate", true],
      ["Dictation", true],
      ["spelling", true],
      ["spell that", true],
      ["template", true],
      ["paste", true],
      ["autocomplete", true],
      ["auto-complete", true],
    ];

    const nonInsertionCommands: Array<[string, boolean]> = [
      ["click", false],
      ["press", false],
      ["scroll", false],
      ["navigate", false],
      ["focus", false],
      ["select", false],
    ];

    it.each(insertionCommands)("should identify '%s' as insertion command: %p", (cmd, expected) => {
      expect(service.isInsertionClassCommand(cmd)).toBe(expected);
    });

    it.each(nonInsertionCommands)("should identify '%s' as non-insertion command: %p", (cmd, expected) => {
      expect(service.isInsertionClassCommand(cmd)).toBe(expected);
    });
  });

  // =============================================================================
  // TEST MATRIX: Insertion Command Classification (FP-4B)
  // =============================================================================
  describe("Insertion Command Classification (FP-4B)", () => {
    it.each([
      ["insert", InsertionCommandType.INSERT],
      ["dictate hello", InsertionCommandType.DICTATE],
      ["spell that test", InsertionCommandType.SPELLING],
      ["insert template", InsertionCommandType.TEMPLATE],
      ["paste from clipboard", InsertionCommandType.PASTE],
      ["select autocomplete item", InsertionCommandType.AUTOCOMPLETE],
      ["click button", InsertionCommandType.UNKNOWN],
    ])("should classify '%s' as %s", (cmd, expected) => {
      expect(service.classifyInsertionCommand(cmd)).toBe(expected);
    });
  });

  // =============================================================================
  // TEST MATRIX: Precision Surface Detection
  // =============================================================================
  describe("Precision Surface Detection", () => {
    it.each([
      ["vscode", RegionKind.EDITOR, ControlType.TEXT_EDITOR, DetectionAuthority.DIRECT_INTEGRATION],
      ["vscode", RegionKind.TERMINAL, ControlType.TERMINAL, DetectionAuthority.DIRECT_INTEGRATION],
      ["vscode", RegionKind.SEARCH, ControlType.SEARCH_BOX, DetectionAuthority.DIRECT_INTEGRATION],
      ["chrome", RegionKind.ADDRESS_BAR, ControlType.ADDRESS_BAR, DetectionAuthority.SHORTCUT_INFERENCE],
      ["chrome", RegionKind.PAGE, null, null], // Page is not a precision surface
      ["unknown", RegionKind.UNKNOWN, null, null],
    ])(
      "should detect %s with region %s as control %s (authority: %s)",
      async (app, region, expectedControl, expectedAuthority) => {
        const surface = await service.detectPrecisionSurface(app, region);
        
        if (expectedControl === null) {
          expect(surface).toBeNull();
        } else {
          expect(surface).not.toBeNull();
          expect(surface!.controlType).toBe(expectedControl);
          expect(surface!.detectionAuthority).toBe(expectedAuthority);
        }
      }
    );
  });

  // =============================================================================
  // TEST MATRIX: Caret Presence Detection
  // =============================================================================
  describe("Caret Presence Detection", () => {
    it("should return no caret for null surface", async () => {
      const result = await service.detectCaretPresence(null);
      expect(result.hasCaret).toBe(false);
      expect(result.surface).toBeNull();
      expect(result.detectionAuthority).toBe(DetectionAuthority.HEURISTIC);
    });

    it("should detect caret in VS Code text editor", async () => {
      const surface: PrecisionSurface = {
        application: "vscode",
        controlType: ControlType.TEXT_EDITOR,
        detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      };
      
      const result = await service.detectCaretPresence(surface);
      expect(result.hasCaret).toBe(true);
      expect(result.surface).toEqual(surface);
      expect(result.detectionAuthority).toBe(DetectionAuthority.DIRECT_INTEGRATION);
    });

    it("should detect caret in VS Code terminal", async () => {
      const surface: PrecisionSurface = {
        application: "vscode",
        controlType: ControlType.TERMINAL,
        detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      };
      
      const result = await service.detectCaretPresence(surface);
      expect(result.hasCaret).toBe(true);
    });

    it("should detect caret in Chrome address bar", async () => {
      const surface: PrecisionSurface = {
        application: "chrome",
        controlType: ControlType.ADDRESS_BAR,
        detectionAuthority: DetectionAuthority.SHORTCUT_INFERENCE,
      };
      
      const result = await service.detectCaretPresence(surface);
      expect(result.hasCaret).toBe(true);
    });
  });

  // =============================================================================
  // TEST MATRIX: Editable State Detection (FP-4B)
  // =============================================================================
  describe("Editable State Detection (FP-4B)", () => {
    it("should return not editable for null surface", async () => {
      const result = await service.detectEditableState(null);
      expect(result.isEditable).toBe(false);
      expect(result.reason).toBe("No surface in focus");
    });

    it("should return editable for VS Code text editor", async () => {
      const surface: PrecisionSurface = {
        application: "vscode",
        controlType: ControlType.TEXT_EDITOR,
        detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      };
      
      const result = await service.detectEditableState(surface);
      expect(result.isEditable).toBe(true);
      expect(result.surface).toEqual(surface);
    });

    it("should return not editable for SCM view", async () => {
      const surface: PrecisionSurface = {
        application: "vscode",
        controlType: ControlType.SCM_VIEW,
        detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      };
      
      const result = await service.detectEditableState(surface);
      expect(result.isEditable).toBe(false);
      expect(result.reason).toContain("does not accept text input");
    });
  });

  // =============================================================================
  // TEST MATRIX: Terminal Caret Detection (FP-4B - PM Hardening Notes)
  // =============================================================================
  describe("Terminal Caret Detection (FP-4B)", () => {
    it("should return undetectable for non-terminal surface", async () => {
      const surface: PrecisionSurface = {
        application: "vscode",
        controlType: ControlType.TEXT_EDITOR,
        detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      };
      
      const result = await service.getTerminalCaretDetection(surface);
      expect(result.detectionMethod).toBe(TerminalCaretDetectionMethod.UNDETECTABLE);
      expect(result.confidence).toBe(0);
    });

    it("should use VS Code Terminal API for VS Code terminal", async () => {
      const surface: PrecisionSurface = {
        application: "vscode",
        controlType: ControlType.TERMINAL,
        detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      };
      
      const result = await service.getTerminalCaretDetection(surface);
      expect(result.detectionMethod).toBe(TerminalCaretDetectionMethod.VSCODE_TERMINAL_API);
      expect(result.confidence).toBe(0.7); // Conservative
    });
  });

  // =============================================================================
  // TEST MATRIX: Selection State with Authority (FP-4B)
  // =============================================================================
  describe("Selection State with Authority (FP-4B)", () => {
    it("should return null selection for null surface", async () => {
      const result = await service.detectSelection(null);
      expect(result).toBeNull();
    });

    it("should return selection state with APPLICATION_API authority for direct integration", async () => {
      const surface: PrecisionSurface = {
        application: "vscode",
        controlType: ControlType.TEXT_EDITOR,
        detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      };
      
      const result = await service.detectSelection(surface);
      expect(result).not.toBeNull();
      expect(result!.selectionAuthority).toBe(SelectionAuthority.APPLICATION_API);
    });

    it("should return selection state with INFERRED authority for heuristic", async () => {
      const surface: PrecisionSurface = {
        application: "chrome",
        controlType: ControlType.ADDRESS_BAR,
        detectionAuthority: DetectionAuthority.HEURISTIC,
      };
      
      const result = await service.detectSelection(surface);
      expect(result).not.toBeNull();
      expect(result!.selectionAuthority).toBe(SelectionAuthority.INFERRED);
    });
  });

  // =============================================================================
  // TEST MATRIX: Blocked Insertion (FP-4B)
  // =============================================================================
  describe("Blocked Insertion Checks (FP-4B)", () => {
    it("should allow non-insertion commands", async () => {
      const result = await service.checkBlockedInsertion(null, "click");
      expect(result.blocked).toBe(false);
    });

    it("should block insertion when no surface", async () => {
      const result = await service.checkBlockedInsertion(null, "insert");
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe(TextInsertionReason.NO_FOCUS);
      expect(result.userSafeMessage).toContain("No text field in focus");
    });

    it("should block insertion when surface not editable", async () => {
      const surface: PrecisionSurface = {
        application: "vscode",
        controlType: ControlType.SCM_VIEW,
        detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      };
      
      const result = await service.checkBlockedInsertion(surface, "insert");
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe(TextInsertionReason.UNSAFE_CONTROL);
      expect(result.userSafeMessage).toContain("does not accept text input");
    });

    it("should allow insertion when surface is editable and has caret", async () => {
      const surface: PrecisionSurface = {
        application: "vscode",
        controlType: ControlType.TEXT_EDITOR,
        detectionAuthority: DetectionAuthority.DIRECT_INTEGRATION,
      };
      
      const result = await service.checkBlockedInsertion(surface, "insert");
      expect(result.blocked).toBe(false);
    });
  });

  // =============================================================================
  // TEST MATRIX: User-Safe Error Messages (FP-4B)
  // =============================================================================
  describe("User-Safe Error Messages (FP-4B)", () => {
    it("should return empty for unblocked insertion", async () => {
      const result = await service.checkBlockedInsertion(null, "click");
      const message = service.getBlockedInsertionUserMessage(result);
      expect(message).toBe("");
    });

    it("should return user-safe message for blocked insertion", async () => {
      const result = await service.checkBlockedInsertion(null, "insert");
      const message = service.getBlockedInsertionUserMessage(result);
      expect(message).toBe("No text field in focus. Please click in a text field first.");
    });

    it("should handle unified message interface", async () => {
      const blockedResult = await service.checkBlockedInsertion(null, "insert");
      const message = service.getAnyUserSafeMessage(blockedResult);
      expect(message).toBe("No text field in focus. Please click in a text field first.");
    });
  });

  // =============================================================================
  // TEST MATRIX: Complete Precision Focus State (FP-4B)
  // =============================================================================
  describe("Complete Precision Focus State (FP-4B)", () => {
    it("should return complete state with editable field", async () => {
      const state = await service.getPrecisionFocusState("vscode", RegionKind.EDITOR);
      
      expect(state.surface).not.toBeNull();
      expect(state.caret).toBeDefined();
      expect(state.editable).toBeDefined(); // FP-4B: Added editable field
      expect(state.editable.isEditable).toBe(true);
      expect(state.selection).toBeDefined();
      expect(state.isTextInsertionSafe).toBe(true);
      expect(state.timestamp).toBeDefined();
    });

    it("should include selection authority in selection state", async () => {
      const state = await service.getPrecisionFocusState("vscode", RegionKind.EDITOR);
      
      expect(state.selection).not.toBeNull();
      expect(state.selection!.selectionAuthority).toBe(SelectionAuthority.APPLICATION_API);
    });
  });

  // =============================================================================
  // TEST MATRIX: Approved Surfaces Configuration
  // =============================================================================
  describe("Approved Surfaces Configuration", () => {
    it("should have correct configuration for VS Code text editor", () => {
      const config = APPROVED_SURFACES[SupportedApplication.VSCODE][ControlType.TEXT_EDITOR]!;
      expect(config.acceptsInput).toBe(true);
      expect(config.hasSelection).toBe(true);
      expect(config.hasCaret).toBe(true);
      expect(config.detectionAuthority).toBe(DetectionAuthority.DIRECT_INTEGRATION);
    });

    it("should have correct configuration for VS Code terminal", () => {
      const config = APPROVED_SURFACES[SupportedApplication.VSCODE][ControlType.TERMINAL]!;
      expect(config.acceptsInput).toBe(true);
      expect(config.hasSelection).toBe(true);
      expect(config.hasCaret).toBe(true);
      expect(config.detectionAuthority).toBe(DetectionAuthority.DIRECT_INTEGRATION);
    });

    it("should have correct configuration for Chrome address bar", () => {
      const config = APPROVED_SURFACES[SupportedApplication.CHROME][ControlType.ADDRESS_BAR]!;
      expect(config.acceptsInput).toBe(true);
      expect(config.hasSelection).toBe(true);
      expect(config.hasCaret).toBe(true);
      expect(config.detectionAuthority).toBe(DetectionAuthority.SHORTCUT_INFERENCE);
    });

    it("should not accept input for SCM view", () => {
      const config = APPROVED_SURFACES[SupportedApplication.VSCODE][ControlType.SCM_VIEW]!;
      expect(config.acceptsInput).toBe(false);
    });
  });
});
