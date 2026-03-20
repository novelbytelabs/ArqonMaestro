/**
 * Surface Model Service
 *
 * Part of FP-9A: Surface Expansion Foundations (Phase 4C)
 *
 * Implements the bounded surface model described in:
 *   - maestro-surface-model.md
 *   - maestro-surface-expansion-v0.1.md
 *
 * =============================================================================
 * ARCHITECTURAL RULES (Phase 4C)
 * =============================================================================
 *
 * 1. Surfaces are modeled explicitly — never inferred loosely (Principle 1-5)
 * 2. Surface identity is typed and structured, not a raw string (Section 4)
 * 3. Alias normalization resolves inward to canonical surface identities (Principle 5)
 * 4. Surface resolution is deterministic and preference-aware (Rule 6 / Section 15)
 * 5. Surface capability constrains legal actions (Principle 7)
 * 6. Bound execution and visible focus transfer are distinct (Principle 3)
 * 7. Integrated and external terminal are distinct internal surfaces (Principle 4)
 * 8. Surface security metadata constrains policy decisions (Section 18)
 * 9. Safe abort when surface context is unknown or insufficient (Phase 4C)
 *
 * =============================================================================
 * OUT OF SCOPE (Phase 4C)
 * =============================================================================
 *
 * - Full multi-surface action coordination (FP-9 advanced)
 * - Focus coordinator with cross-surface history (FP-9 advanced)
 * - Cross-surface referent resolution beyond context attachment (FP-9 advanced)
 * - Surface adapter platform implementation (FP-9 platform bridge)
 * - Cross-surface state synchronization
 * - Natural language cross-surface understanding
 * - Full focus history stack with restoration (FP-8B territory)
 *
 * =============================================================================
 * INTEGRATION
 * =============================================================================
 *
 * SurfaceContext is the output of this service. It is consumed by:
 * - ReferentialIntentService: attaches active surface as candidate context
 * - ModalAwarenessService: overlay surface classification aligns with modal type
 * - RuntimeCommandDispatcher: surfaceContext attaches to DispatchOptions
 */

// =============================================================================
// SURFACE CLASS  (maestro-surface-model.md §2)
// =============================================================================

/**
 * The six surface classes defined by the surface model.
 *
 * - root:        Top-level environment (editor, terminal, browser, explorer, settings)
 * - subsurface:  Structured region inside a root surface (integrated terminal, sidebar)
 * - overlay:     Temporary surfaces above others (dialog, modal, command palette)
 * - interaction: Smaller focused contexts inside another surface (field, prompt, selection)
 * - virtual:     Addressable via bound integration, not necessarily visually focused
 * - background:  Non-visual execution contexts (background build, daemon, MCP executor)
 */
export type SurfaceClass =
  | "root"
  | "subsurface"
  | "overlay"
  | "interaction"
  | "virtual"
  | "background";

// =============================================================================
// SURFACE TYPE  (canonical names, §5)
// =============================================================================

/**
 * Canonical surface types. Aliases normalize to these.
 * Phase 4C supports the types that matter for the current routing layer.
 */
export type SurfaceType =
  // Root surfaces
  | "editor"
  | "browser"
  | "external_terminal"
  | "explorer"
  | "settings"
  | "workspace"
  // Subsurfaces
  | "integrated_terminal"
  | "sidebar"
  | "panel"
  | "problems"
  | "output"
  | "tab_group"
  // Overlays
  | "dialog"
  | "command_palette"
  | "quick_open"
  | "menu"
  | "popup"
  // Interaction surfaces
  | "field"
  | "search_field"
  | "prompt"
  | "selection"
  // Virtual / background
  | "shell_executor"
  | "build_runner"
  | "mcp_executor"
  | "background_task"
  // Unknown
  | "unknown";

// =============================================================================
// SURFACE VISIBILITY STATE  (§12)
// =============================================================================

/**
 * Visibility and availability state of a surface.
 * A surface is not just active/inactive.
 */
export type SurfaceVisibility =
  | "focused"   // Active focus target
  | "visible"   // Visible but not currently focused
  | "hidden"    // Exists but not visible
  | "available" // Known and launchable, not currently open
  | "blocked"   // Exists but blocked (e.g., by overlay)
  | "destroyed" // No longer valid
  | "unknown";  // State could not be determined

// =============================================================================
// SURFACE EXECUTION MODE  (§11)
// =============================================================================

/**
 * How a surface can receive commands.
 * Bound execution and visible focus transfer are distinct concepts.
 */
export type SurfaceExecutionMode =
  | "focus_required"   // Must have visual focus before command can execute
  | "bound_allowed"    // Can execute without focus transfer (via API/integration)
  | "background_allowed"; // Can execute in the background without any focus

// =============================================================================
// SURFACE IDENTITY  (§4)
// =============================================================================

/**
 * Structured identity for a surface.
 * Every surface has an explicit identity, not just a display name.
 */
export interface SurfaceIdentity {
  /** Stable unique identifier for this surface */
  surfaceId: string;
  /** Canonical internal surface type */
  surfaceType: SurfaceType;
  /** Classification of this surface's role */
  surfaceClass: SurfaceClass;
  /** Parent surface ID if nested */
  parentSurfaceId: string | null;
  /** App/process that owns this surface */
  appId: string | null;
  /** Human-readable label */
  label: string;
}

// =============================================================================
// SURFACE CAPABILITIES  (§13)
// =============================================================================

/**
 * What can legally be done to a surface.
 * Constraints are explicit, not inferred.
 */
export interface SurfaceCapabilities {
  canFocus: boolean;
  canShow: boolean;
  canHide: boolean;
  canOpen: boolean;
  canClose: boolean;
  canAcceptText: boolean;
  canRunCommands: boolean;
  canSelectObjects: boolean;
  canScroll: boolean;
  canClick: boolean;
  canBindExecution: boolean;
  canRestoreFocus: boolean;
  /** Supported execution modes for this surface */
  executionModes: SurfaceExecutionMode[];
}

// =============================================================================
// SURFACE SECURITY LEVEL  (§18)
// =============================================================================

/**
 * Trust level for a surface.
 * Higher sensitivity = tighter policy requirements.
 */
export type SurfaceSecurityLevel =
  | "normal"     // Standard interaction surface
  | "elevated"   // Shell/terminal-like surface (confirmation recommended for destructive)
  | "sensitive"; // Password dialog, admin tool, payment flow

// =============================================================================
// SURFACE RECORD  (complete surface snapshot)
// =============================================================================

/**
 * A fully described surface, combining identity, capabilities, and runtime state.
 */
export interface SurfaceRecord {
  identity: SurfaceIdentity;
  capabilities: SurfaceCapabilities;
  visibility: SurfaceVisibility;
  securityLevel: SurfaceSecurityLevel;
  /** When this surface snapshot was last updated */
  lastUpdatedAt: number;
}

// =============================================================================
// SURFACE CONTEXT  (output for routing/referential/modal layers)
// =============================================================================

/**
 * A surface context snapshot — the output SurfaceModelService provides to
 * the dispatcher, referential intent service, and modal awareness service.
 *
 * Bounded, inspectable, and always typed.
 */
export interface SurfaceContext {
  /**
   * The currently active (focused or bound) surface.
   * null if no surface can be determined.
   */
  activeSurface: SurfaceRecord | null;

  /**
   * The immediately prior surface (for "return focus" semantics).
   * Bounded to one level — no deep history tracking in Phase 4C.
   */
  previousSurface: SurfaceRecord | null;

  /**
   * The active overlay surface, if any (dialog, command palette, etc.)
   * null if no overlay is active.
   */
  activeOverlay: SurfaceRecord | null;

  /**
   * Whether any overlay is currently focus-blocking (aligns with modal awareness)
   */
  overlayIsFocusBlocking: boolean;

  /**
   * How confidently the surface context could be determined
   */
  confidence: "high" | "medium" | "low" | "unknown";

  /**
   * Human-readable reason for this context snapshot
   */
  reason: string;

  /** Timestamp of this snapshot */
  timestamp: number;
}

// =============================================================================
// SURFACE ROUTING CONSTRAINT  (for dispatcher integration)
// =============================================================================

/**
 * How surface context should affect a routing decision.
 *
 * - pass:              Surface context is compatible with the command
 * - block:             Surface context prevents the command (capability mismatch)
 * - requires_focus:    Surface requires focus transfer before executing
 * - requires_binding:  Surface requires a bound integration channel
 * - unknown_surface:   Surface context could not be determined — safe abort
 */
export type SurfaceRoutingConstraint =
  | "pass"
  | "block"
  | "requires_focus"
  | "requires_binding"
  | "unknown_surface";

/**
 * Result of evaluating surface routing compatibility.
 */
export interface SurfaceRoutingDecision {
  constraint: SurfaceRoutingConstraint;
  surface: SurfaceRecord | null;
  reason: string;
}

// =============================================================================
// ALIAS NORMALIZATION TABLE  (§6)
// =============================================================================

const SURFACE_ALIAS_MAP: Record<string, SurfaceType> = {
  // editor
  "editor": "editor",
  "vscode": "editor",
  "vs code": "editor",
  "code": "editor",
  // browser
  "browser": "browser",
  "chrome": "browser",
  "web": "browser",
  "firefox": "browser",
  "safari": "browser",
  // terminal (context-resolved externally — default alias to external)
  "terminal": "external_terminal",
  "shell": "external_terminal",
  "terminal app": "external_terminal",
  "outside terminal": "external_terminal",
  // integrated terminal
  "integrated terminal": "integrated_terminal",
  "built-in terminal": "integrated_terminal",
  "internal terminal": "integrated_terminal",
  "vscode terminal": "integrated_terminal",
  "vs code terminal": "integrated_terminal",
  // explorer
  "explorer": "explorer",
  "file explorer": "explorer",
  "files": "explorer",
  // settings
  "settings": "settings",
  "preferences": "settings",
  // sidebar
  "sidebar": "sidebar",
  // panel
  "panel": "panel",
  // problems
  "problems": "problems",
  "errors": "problems",
  // output
  "output": "output",
  "logs": "output",
  // command palette
  "command palette": "command_palette",
  "palette": "command_palette",
  // quick open
  "quick open": "quick_open",
  "go to file": "quick_open",
  // overlays — direct canonical name mappings (missing from above)
  "dialog": "dialog",
  "popup": "popup",
  "menu": "menu",
  // subsurfaces — canonical underscore form (tab_group was missing)
  "tab group": "tab_group",
  "tab_group": "tab_group",
  // interaction surfaces — direct canonical names
  "field": "field",
  "search_field": "search_field",
  "prompt": "prompt",
  "selection": "selection",
  "input": "field",
  // virtual/background — direct canonical names
  "shell_executor": "shell_executor",
  "build_runner": "build_runner",
  "mcp_executor": "mcp_executor",
  "background_task": "background_task",
  // root surfaces — underscore canonical forms (alias form already present above)
  "workspace": "workspace",
  "integrated_terminal": "integrated_terminal",
  "external_terminal": "external_terminal",
  // command_palette underscore form
  "command_palette": "command_palette",
  "quick_open": "quick_open",
};

// =============================================================================
// KNOWN SURFACE DEFAULTS  (built-in capabilities for common surfaces)
// =============================================================================

const SURFACE_DEFAULTS: Partial<Record<SurfaceType, Partial<SurfaceCapabilities>>> = {
  editor: {
    canFocus: true, canShow: true, canHide: false, canOpen: true, canClose: false,
    canAcceptText: true, canRunCommands: false, canSelectObjects: true,
    canScroll: true, canClick: true, canBindExecution: false, canRestoreFocus: true,
    executionModes: ["focus_required"],
  },
  browser: {
    canFocus: true, canShow: true, canHide: false, canOpen: true, canClose: true,
    canAcceptText: true, canRunCommands: false, canSelectObjects: true,
    canScroll: true, canClick: true, canBindExecution: false, canRestoreFocus: true,
    executionModes: ["focus_required"],
  },
  external_terminal: {
    canFocus: true, canShow: true, canHide: true, canOpen: true, canClose: true,
    canAcceptText: true, canRunCommands: true, canSelectObjects: false,
    canScroll: true, canClick: false, canBindExecution: false, canRestoreFocus: true,
    executionModes: ["focus_required"],
  },
  integrated_terminal: {
    canFocus: true, canShow: true, canHide: true, canOpen: true, canClose: true,
    canAcceptText: true, canRunCommands: true, canSelectObjects: false,
    canScroll: true, canClick: false, canBindExecution: true, canRestoreFocus: true,
    executionModes: ["focus_required", "bound_allowed"],
  },
  shell_executor: {
    canFocus: false, canShow: false, canHide: false, canOpen: false, canClose: false,
    canAcceptText: false, canRunCommands: true, canSelectObjects: false,
    canScroll: false, canClick: false, canBindExecution: true, canRestoreFocus: false,
    executionModes: ["bound_allowed", "background_allowed"],
  },
  dialog: {
    canFocus: true, canShow: true, canHide: false, canOpen: false, canClose: true,
    canAcceptText: true, canRunCommands: false, canSelectObjects: false,
    canScroll: false, canClick: true, canBindExecution: false, canRestoreFocus: false,
    executionModes: ["focus_required"],
  },
  command_palette: {
    canFocus: true, canShow: true, canHide: true, canOpen: true, canClose: true,
    canAcceptText: true, canRunCommands: false, canSelectObjects: true,
    canScroll: true, canClick: true, canBindExecution: false, canRestoreFocus: false,
    executionModes: ["focus_required"],
  },
  background_task: {
    canFocus: false, canShow: false, canHide: false, canOpen: false, canClose: true,
    canAcceptText: false, canRunCommands: false, canSelectObjects: false,
    canScroll: false, canClick: false, canBindExecution: true, canRestoreFocus: false,
    executionModes: ["background_allowed"],
  },
};

// Security levels by surface type
const SURFACE_SECURITY_LEVELS: Partial<Record<SurfaceType, SurfaceSecurityLevel>> = {
  external_terminal: "elevated",
  integrated_terminal: "elevated",
  shell_executor: "elevated",
  dialog: "sensitive",   // dialogs may contain password fields, confirmations
  settings: "normal",
  editor: "normal",
  browser: "normal",
};

// =============================================================================
// SERVICE
// =============================================================================

/**
 * SurfaceModelService (FP-9A Phase 4C)
 *
 * Provides:
 * 1. Alias → canonical surface type normalization
 * 2. Surface record construction with explicit capabilities
 * 3. Surface context snapshot for routing/referential/modal layers
 * 4. Surface routing constraint evaluation
 * 5. Safe abort values when surface context is unknown or insufficient
 */
export class SurfaceModelService {
  // ---------------------------------------------------------------------------
  // Alias normalization
  // ---------------------------------------------------------------------------

  /**
   * Normalize a user-facing surface name to its canonical SurfaceType.
   * Returns "unknown" if no match found.
   *
   * Case-insensitive; trims whitespace.
   */
  normalizeAlias(alias: string): SurfaceType {
    const normalized = alias.trim().toLowerCase();
    return SURFACE_ALIAS_MAP[normalized] ?? "unknown";
  }

  /**
   * Returns true if the alias resolves to a known surface type.
   */
  isKnownAlias(alias: string): boolean {
    return this.normalizeAlias(alias) !== "unknown";
  }

  // ---------------------------------------------------------------------------
  // Surface record construction
  // ---------------------------------------------------------------------------

  /**
   * Build a surface record for a known surface type.
   * Uses canonical capability defaults; caller provides identity fields.
   */
  buildSurfaceRecord(params: {
    surfaceType: SurfaceType;
    surfaceClass: SurfaceClass;
    surfaceId: string;
    label: string;
    appId?: string;
    parentSurfaceId?: string;
    visibility?: SurfaceVisibility;
    securityLevelOverride?: SurfaceSecurityLevel;
  }): SurfaceRecord {
    const caps = this.defaultCapabilities(params.surfaceType);
    return {
      identity: {
        surfaceId: params.surfaceId,
        surfaceType: params.surfaceType,
        surfaceClass: params.surfaceClass,
        parentSurfaceId: params.parentSurfaceId ?? null,
        appId: params.appId ?? null,
        label: params.label,
      },
      capabilities: caps,
      visibility: params.visibility ?? "unknown",
      securityLevel: params.securityLevelOverride ??
        SURFACE_SECURITY_LEVELS[params.surfaceType] ?? "normal",
      lastUpdatedAt: Date.now(),
    };
  }

  /**
   * Return default capabilities for a surface type.
   * If the type is not in the defaults table, returns a conservative
   * capability set (everything false, focus_required).
   */
  defaultCapabilities(surfaceType: SurfaceType): SurfaceCapabilities {
    const defaults = SURFACE_DEFAULTS[surfaceType];
    if (defaults) {
      return {
        canFocus: defaults.canFocus ?? false,
        canShow: defaults.canShow ?? false,
        canHide: defaults.canHide ?? false,
        canOpen: defaults.canOpen ?? false,
        canClose: defaults.canClose ?? false,
        canAcceptText: defaults.canAcceptText ?? false,
        canRunCommands: defaults.canRunCommands ?? false,
        canSelectObjects: defaults.canSelectObjects ?? false,
        canScroll: defaults.canScroll ?? false,
        canClick: defaults.canClick ?? false,
        canBindExecution: defaults.canBindExecution ?? false,
        canRestoreFocus: defaults.canRestoreFocus ?? false,
        executionModes: defaults.executionModes ?? ["focus_required"],
      };
    }
    // Conservative fallback — unknown surface type
    return {
      canFocus: false,
      canShow: false,
      canHide: false,
      canOpen: false,
      canClose: false,
      canAcceptText: false,
      canRunCommands: false,
      canSelectObjects: false,
      canScroll: false,
      canClick: false,
      canBindExecution: false,
      canRestoreFocus: false,
      executionModes: ["focus_required"],
    };
  }

  // ---------------------------------------------------------------------------
  // Surface context factory
  // ---------------------------------------------------------------------------

  /**
   * Build a fully typed SurfaceContext from the provided surfaces.
   * Callers supply current state from their focus/event layer.
   */
  buildContext(params: {
    activeSurface: SurfaceRecord | null;
    previousSurface?: SurfaceRecord | null;
    activeOverlay?: SurfaceRecord | null;
  }): SurfaceContext {
    const { activeSurface, previousSurface = null, activeOverlay = null } = params;

    const overlayIsFocusBlocking =
      activeOverlay !== null &&
      activeOverlay.identity.surfaceClass === "overlay" &&
      activeOverlay.capabilities.canFocus === true;

    let confidence: SurfaceContext["confidence"] = "unknown";
    let reason = "no_surface_provided";

    if (activeSurface !== null) {
      if (activeSurface.visibility === "focused") {
        confidence = "high";
        reason = `active_surface:${activeSurface.identity.surfaceId} visibility:focused`;
      } else if (activeSurface.visibility === "visible" || activeSurface.visibility === "available") {
        confidence = "medium";
        reason = `active_surface:${activeSurface.identity.surfaceId} visibility:${activeSurface.visibility}`;
      } else if (activeSurface.identity.surfaceType !== "unknown") {
        confidence = "low";
        reason = `active_surface:${activeSurface.identity.surfaceId} visibility:${activeSurface.visibility}`;
      } else {
        confidence = "unknown";
        reason = `active_surface:unknown_type`;
      }
    }

    return {
      activeSurface,
      previousSurface,
      activeOverlay,
      overlayIsFocusBlocking,
      confidence,
      reason,
      timestamp: Date.now(),
    };
  }

  /**
   * Return an empty "no surface context" snapshot.
   * Used when no surface information is available.
   */
  noSurfaceContext(): SurfaceContext {
    return {
      activeSurface: null,
      previousSurface: null,
      activeOverlay: null,
      overlayIsFocusBlocking: false,
      confidence: "unknown",
      reason: "no_surface_context_provided",
      timestamp: Date.now(),
    };
  }

  // ---------------------------------------------------------------------------
  // Surface resolution  (§15 resolution order — deterministic)
  // ---------------------------------------------------------------------------

  /**
   * Resolve a surface noun (alias or canonical name) against the current context.
   *
   * Resolution order (§15):
   * 1. Exact canonical match in active surface
   * 2. Active overlay match
   * 3. Provided candidate set match
   * 4. Alias normalization match in candidate set
   * 5. Returns null → caller must show chooser or abort
   */
  resolveSurface(
    noun: string,
    context: SurfaceContext,
    candidates: SurfaceRecord[] = []
  ): SurfaceRecord | null {
    const canonicalType = this.normalizeAlias(noun);

    // 1. Active surface exact match
    if (
      context.activeSurface !== null &&
      context.activeSurface.identity.surfaceType === canonicalType
    ) {
      return context.activeSurface;
    }

    // 2. Active overlay match
    if (
      context.activeOverlay !== null &&
      context.activeOverlay.identity.surfaceType === canonicalType
    ) {
      return context.activeOverlay;
    }

    // 3. Candidate set — exact type match
    for (const candidate of candidates) {
      if (candidate.identity.surfaceType === canonicalType) {
        return candidate;
      }
    }

    // 4. Candidate set — label match
    const lowerNoun = noun.trim().toLowerCase();
    for (const candidate of candidates) {
      if (candidate.identity.label.toLowerCase() === lowerNoun) {
        return candidate;
      }
    }

    // 5. Not resolved
    return null;
  }

  // ---------------------------------------------------------------------------
  // Surface routing constraint evaluation
  // ---------------------------------------------------------------------------

  /**
   * Determine whether the current surface context permits the requested
   * command capability.
   *
   * Constraint mapping:
   * - no active surface (unknown) → unknown_surface (safe abort)
   * - overlay is focus-blocking → block (unless command targets the overlay)
   * - capability mismatch → block
   * - surface needs focus but isn't focused → requires_focus
   * - surface supports bound execution → pass
   * - surface has no relevant restriction → pass
   */
  evaluateRoutingConstraint(
    context: SurfaceContext,
    requestedCapability: keyof SurfaceCapabilities | null
  ): SurfaceRoutingDecision {
    // Unknown surface context — safe abort
    if (context.activeSurface === null || context.confidence === "unknown") {
      return {
        constraint: "unknown_surface",
        surface: null,
        reason: "no_active_surface_or_unknown_confidence → safe_abort",
      };
    }

    const surface = context.activeSurface;

    // Capability constraint check
    if (
      requestedCapability !== null &&
      requestedCapability in surface.capabilities &&
      !(surface.capabilities as unknown as Record<string, unknown>)[requestedCapability]
    ) {
      return {
        constraint: "block",
        surface,
        reason: `surface_${surface.identity.surfaceType}_does_not_support_${String(requestedCapability)}`,
      };
    }

    // Execution mode: focus required but surface not focused
    const needsFocus = surface.capabilities.executionModes.every(
      (m) => m === "focus_required"
    );
    if (needsFocus && surface.visibility !== "focused") {
      return {
        constraint: "requires_focus",
        surface,
        reason: `surface_${surface.identity.surfaceType}_requires_focus (current:${surface.visibility})`,
      };
    }

    // Execution mode: binding required (virtual/background surface)
    if (
      surface.identity.surfaceClass === "virtual" ||
      surface.identity.surfaceClass === "background"
    ) {
      if (!surface.capabilities.canBindExecution) {
        return {
          constraint: "block",
          surface,
          reason: `virtual_or_background_surface_${surface.identity.surfaceType}_cannot_bind_execution`,
        };
      }
      return {
        constraint: "requires_binding",
        surface,
        reason: `virtual_or_background_surface_${surface.identity.surfaceType}_requires_bound_execution`,
      };
    }

    // Default: passes
    return {
      constraint: "pass",
      surface,
      reason: `surface_${surface.identity.surfaceType}_compatible_with_requested_action`,
    };
  }

  // ---------------------------------------------------------------------------
  // Surface + modal alignment
  // ---------------------------------------------------------------------------

  /**
   * Determine if a surface record represents a focus-blocking overlay.
   * Used by the modal awareness layer to align surface class with modal type.
   */
  isBlockingOverlay(surface: SurfaceRecord): boolean {
    return (
      surface.identity.surfaceClass === "overlay" &&
      surface.capabilities.canFocus === true &&
      (surface.identity.surfaceType === "dialog" ||
        surface.identity.surfaceType === "command_palette" ||
        surface.identity.surfaceType === "quick_open")
    );
  }

  // ---------------------------------------------------------------------------
  // Surface + referential alignment
  // ---------------------------------------------------------------------------

  /**
   * Given a surface context, extract candidate entities for referential
   * resolution. This bridges the surface layer with the referential-intent
   * layer (FP-7A): the active surface can act as a grounding anchor for
   * "this", "here" referents at the surface level.
   *
   * Returns null if no surface context or confidence is too low.
   */
  extractReferentialAnchor(context: SurfaceContext): {
    label: string;
    id: string;
    entityType: "surface";
    surfaceType: SurfaceType;
  } | null {
    if (
      context.activeSurface === null ||
      context.confidence === "unknown" ||
      context.confidence === "low"
    ) {
      return null;
    }

    return {
      label: context.activeSurface.identity.label,
      id: context.activeSurface.identity.surfaceId,
      entityType: "surface",
      surfaceType: context.activeSurface.identity.surfaceType,
    };
  }

  // ---------------------------------------------------------------------------
  // Inspect / debug helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns a concise summary string for trace/telemetry output.
   */
  summarizeContext(context: SurfaceContext): string {
    const active = context.activeSurface
      ? `${context.activeSurface.identity.surfaceType}(${context.activeSurface.visibility})`
      : "none";
    const overlay = context.activeOverlay
      ? `overlay:${context.activeOverlay.identity.surfaceType}`
      : "no-overlay";
    return `surface[${active}] ${overlay} confidence:${context.confidence}`;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const surfaceModelService = new SurfaceModelService();
