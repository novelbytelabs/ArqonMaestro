import { SecurityMode } from "./actuation-policy-service";

/**
 * Executor kinds Talon can provide.
 * These map to the verbs declared in the adapter contract.
 */
export type TalonVerb = "focus" | "click" | "scroll" | "press";

/**
 * Surface targets Talon can actuate against.
 * Talon operates on visible desktop surfaces only — not all surfaces.
 */
export type TalonSurface = "window" | "desktop" | "panel" | "visible_ui";

/**
 * Trust tier levels available to the Talon adapter.
 * Tier 3: when backed by accessibility API (a11y-backed focus).
 * Tier 4: raw visual actuation (all other cases).
 */
export type TalonTrustTier = 3 | 4;

/**
 * Execution modes for a given Talon executor.
 * Per §11 of maestro-talon-integration-strategy.md:
 * - focus_transfer: true for focus executor only
 * - bound_execution: false (Talon is not bound to a plugin surface)
 * - background_execution: false (Talon requires visible focus to actuate)
 */
export interface TalonExecutionModes {
  focusTransfer: boolean;
  boundExecution: boolean;
  backgroundExecution: boolean;
}

/**
 * A Talon executor declaration per the capability registry adapter contract.
 */
export interface TalonExecutorRecord {
  executorId: string;
  verb: TalonVerb;
  supportedSurfaces: TalonSurface[];
  trustTier: TalonTrustTier;
  executionModes: TalonExecutionModes;
  undoSupported: boolean;
  securitySensitivity: "low" | "medium" | "high";
  semanticFidelity: number; // 0.0 to 1.0
}

/**
 * Full Talon adapter record, as would be registered with the capability registry.
 */
export interface TalonAdapterRecord {
  adapterId: string;
  adapterKind: "fallback_ui";
  environmentType: "local_desktop";
  platformScope: string;
  routeClass: "talon_fallback";
  defaultTrustTier: TalonTrustTier;
  executors: TalonExecutorRecord[];
  blockedVerbs: string[];
  blockedInSecureMode: boolean;
  blockedInSharedRoomWithoutVerification: boolean;
}

/**
 * TalonAdapter v0.1
 *
 * Implements the Maestro-side adapter contract for Talon Voice as a
 * fallback actuation provider. Per maestro-talon-integration-strategy.md:
 *
 * - Talon is a fallback adapter, NOT the command language owner.
 * - Maestro retains language sovereignty; Talon provides execution capability.
 * - Used only when no higher-trust route (native semantic, plugin-assisted) is available.
 * - Trust tier defaults to Tier 4 (raw visual); Tier 3 when a11y-backed (focus executor).
 * - Blocked entirely in secure mode.
 * - Requires speaker verification in shared_room mode.
 * - Requires user confirmation in standard mode (enforced by policy service).
 *
 * This class does NOT communicate with the Talon binary directly. It declares
 * the contract and provides policy-aware routing helpers. The actual IPC bridge
 * to the Talon binary is a future integration phase concern.
 */
export default class TalonAdapter {
  /**
   * Verbs whose actuation would violate Maestro's language sovereignty or
   * could cause irreversible/destructive side effects. These are never routed
   * to Talon, regardless of security mode.
   */
  private static readonly BLOCKED_VERBS = new Set([
    "delete",
    "rename",
    "move",
    "write",
    "execute_shell",
    "install",
    "uninstall",
    "sudo",
    "format",
    "overwrite",
  ]);

  /**
   * The set of surfaces Talon can operate on.
   * "all_surfaces" is explicitly excluded — Talon requires a visible target.
   */
  private static readonly SUPPORTED_SURFACES: TalonSurface[] = [
    "window",
    "desktop",
    "panel",
    "visible_ui",
  ];

  /**
   * Returns the full adapter record for this adapter.
   * This is what would be registered with the capability registry.
   */
  getAdapterRecord(): TalonAdapterRecord {
    return {
      adapterId: "talon_adapter",
      adapterKind: "fallback_ui",
      environmentType: "local_desktop",
      platformScope: process.platform,
      routeClass: "talon_fallback",
      defaultTrustTier: 4,
      executors: this.buildExecutors(),
      blockedVerbs: Array.from(TalonAdapter.BLOCKED_VERBS),
      blockedInSecureMode: true,
      blockedInSharedRoomWithoutVerification: true,
    };
  }

  /**
   * Determines whether TalonAdapter can handle a given verb/surface/mode
   * combination, based on the declared contract and applicable policy rules.
   *
   * This is the primary routing gate — called before the dispatcher hands off.
   */
  canHandle(
    verb: string,
    surface: string,
    securityMode: SecurityMode
  ): boolean {
    // Law: Talon is fully blocked in secure mode
    if (securityMode === "secure") {
      return false;
    }

    // Law: blocked verbs are never routed to Talon
    if (TalonAdapter.BLOCKED_VERBS.has(verb)) {
      return false;
    }

    // Law: verb must be one Talon declares support for
    const supportedVerbs: TalonVerb[] = ["focus", "click", "scroll", "press"];
    if (!supportedVerbs.includes(verb as TalonVerb)) {
      return false;
    }

    // Law: surface must be one Talon can operate on
    if (!TalonAdapter.SUPPORTED_SURFACES.includes(surface as TalonSurface)) {
      return false;
    }

    return true;
  }

  /**
   * Returns the effective trust tier for a given verb.
   * Focus with a11y backing is Tier 3; all other verbs are Tier 4.
   */
  getTrustTier(verb: TalonVerb, a11yBacked = false): TalonTrustTier {
    if (verb === "focus" && a11yBacked) {
      return 3;
    }
    return 4;
  }

  /**
   * Returns all executor records declared by this adapter.
   */
  getExecutors(): TalonExecutorRecord[] {
    return this.buildExecutors();
  }

  /**
   * Returns the executor record for a specific verb, if declared.
   */
  getExecutor(verb: TalonVerb): TalonExecutorRecord | undefined {
    return this.buildExecutors().find((e) => e.verb === verb);
  }

  /**
   * Builds the four executor declarations.
   * Order reflects priority: focus > click > scroll > press.
   */
  private buildExecutors(): TalonExecutorRecord[] {
    return [
      // 1. Focus executor — highest priority, can be a11y-backed (Tier 3)
      {
        executorId: "talon_focus_executor",
        verb: "focus",
        supportedSurfaces: ["window", "desktop", "panel"],
        // Tier 3 declared here; actual tier chosen at runtime based on a11y availability.
        // Default to Tier 4. Tier 3 upgrade is signaled by `getTrustTier(verb, true)`.
        trustTier: 4,
        executionModes: {
          focusTransfer: true,  // Focus executor MUST declare focus transfer
          boundExecution: false,
          backgroundExecution: false,
        },
        undoSupported: false, // OS-level focus changes are not undoable via Talon
        securitySensitivity: "low",
        semanticFidelity: 0.6,
      },
      // 2. Click executor — Tier 4 (raw visual)
      {
        executorId: "talon_click_executor",
        verb: "click",
        supportedSurfaces: ["window", "desktop", "visible_ui"],
        trustTier: 4,
        executionModes: {
          focusTransfer: false,
          boundExecution: false,
          backgroundExecution: false,
        },
        undoSupported: false,
        securitySensitivity: "medium",
        semanticFidelity: 0.4,
      },
      // 3. Scroll executor — Tier 4, lowest risk
      {
        executorId: "talon_scroll_executor",
        verb: "scroll",
        supportedSurfaces: ["window", "panel", "visible_ui"],
        trustTier: 4,
        executionModes: {
          focusTransfer: false,
          boundExecution: false,
          backgroundExecution: false,
        },
        undoSupported: false,
        securitySensitivity: "low",
        semanticFidelity: 0.5,
      },
      // 4. Key press executor — Tier 3 or 4 depending on target certainty
      {
        executorId: "talon_key_press_executor",
        verb: "press",
        supportedSurfaces: ["window", "panel", "visible_ui"],
        // Tier 4 declared here; runtime may upgrade to Tier 3 if target is
        // deterministically known (e.g., menu navigation from a11y tree).
        trustTier: 4,
        executionModes: {
          focusTransfer: false,
          boundExecution: false,
          backgroundExecution: false,
        },
        undoSupported: false,
        securitySensitivity: "medium",
        semanticFidelity: 0.45,
      },
    ];
  }
}
