/**
 * Modal Awareness Service
 *
 * Part of FP-8A: Modal Awareness Foundations (Phase 4B)
 *
 * Provides bounded, deterministic detection and classification of modal UI
 * context. Modal context is then attached to runtime decisions so commands
 * route lawfully (or abort safely) when a modal is active.
 *
 * =============================================================================
 * ARCHITECTURAL RULES (Phase 4B)
 * =============================================================================
 *
 * 1. Modal state is recognized explicitly — never guessed loosely (Rule 1)
 * 2. Modal context is represented as a typed state, not a boolean flag (Rule 2)
 * 3. Hot path remains local, fast, deterministic, and synchronous (Rule 3)
 * 4. Modal context adds a routing constraint; it does not redesign language (Rule 4)
 * 5. Modal awareness aligns with Axis E (overlay mode) of the 5-axis state
 *    vector defined in maestro-modes-state-machine.md (Rule 5)
 * 6. Safe abort when modal context changes lawful execution — never proceed
 *    blindly into a potentially incorrect modal target (Rule 6)
 *
 * =============================================================================
 * OUT OF SCOPE (Phase 4B)
 * =============================================================================
 *
 * - Full modal interaction end-state (FP-8B)
 * - Focus restoration after modal dismissal (FP-8B)
 * - State verification pre/post modal close (FP-8B)
 * - Cross-surface modal handling (Phase 4C)
 * - Natural language understanding of modal content
 * - Disambiguation UI   (FP-7B)
 *
 * =============================================================================
 * INTEGRATION WITH STATE VECTOR (maestro-modes-state-machine.md)
 * =============================================================================
 *
 * The 5-axis state vector is:
 *   A. readiness_state
 *   B. interaction_mode
 *   C. domain_mode
 *   D. security_mode
 *   E. overlay_mode          ← modal context lives here
 *
 * When a modal is active, it influences Axis E and constrains Axes A/B
 * per the overlay priority rule: overlay mode captures interpretation priority.
 */

// =============================================================================
// MODAL TYPES
// =============================================================================

/**
 * The five modal types supported in FP-8A.
 * Intentionally narrow — expanding this set is out of scope for Phase 4B.
 *
 * - dialog:     Standard modal dialogs (save confirmation, delete warning)
 * - popup:      Non-blocking popups/dropdowns (autocomplete, quick-fix menu)
 * - overlay:    Full-screen overlays (settings panel, welcome screen)
 * - notification: Toast notifications and alert banners
 * - quick_open: Command palettes and quick openers (VS Code command palette)
 */
export type ModalType =
  | "dialog"
  | "popup"
  | "overlay"
  | "notification"
  | "quick_open";

// =============================================================================
// MODAL CLASSIFICATION (behavior dimension)
// =============================================================================

/**
 * How a detected modal impacts user interaction.
 *
 * - blocking:      User MUST respond before any non-reflex action can proceed
 * - informational: Displays info, may auto-dismiss; does not block most actions
 * - navigation:    Replaces the main view; reroutes focus
 * - transient:     Appears briefly, may auto-dismiss; lowest disruption
 */
export type ModalClassification =
  | "blocking"
  | "informational"
  | "navigation"
  | "transient";

// =============================================================================
// MODAL STATE
// =============================================================================

/**
 * The current modal overlay state.
 *
 * - none:    No modal present — normal focus hierarchy applies
 * - active:  A modal is currently present and classified
 * - unknown: A modal may be present but could not be confidently detected
 */
export type ModalOverlayState = "none" | "active" | "unknown";

// =============================================================================
// MODAL CONTEXT
// =============================================================================

/**
 * A fully classified modal context snapshot.
 * Produced by ModalAwarenessService.classifyContext().
 *
 * This snapshot is what the dispatcher and policy layer receive.
 * It is always structured and inspectable.
 */
export interface ModalContext {
  /**
   * Current overlay state of the modal layer
   */
  overlayState: ModalOverlayState;

  /**
   * The type of modal, if overlayState is "active"
   */
  modalType: ModalType | null;

  /**
   * Behavioral classification of the modal
   */
  classification: ModalClassification | null;

  /**
   * Whether commands other than reflex should be blocked while this modal is active.
   * True for blocking/navigation modals; false for informational/transient.
   */
  blocksNonReflex: boolean;

  /**
   * Whether focus is currently trapped within this modal.
   * Blocking modals always trap focus. Quick_open modals usually do too.
   */
  focusTrapped: boolean;

  /**
   * Human-readable reason for the current modal state (for traces and diagnostics)
   */
  reason: string;

  /**
   * Timestamp of this context snapshot
   */
  timestamp: number;
}

// =============================================================================
// ROUTING IMPACT
// =============================================================================

/**
 * How a modal context impacts a routing decision.
 *
 * - pass:         No modal present, or modal is non-blocking — route normally
 * - block:        Modal requires safe abort — do not execute the command
 * - reflex_only:  Modal is present but reflex commands may still pass through
 * - reroute:      Modal is navigation-class — routing target may shift
 */
export type ModalRoutingImpact = "pass" | "block" | "reflex_only" | "reroute";

/**
 * Result of evaluating modal impact on a specific route attempt.
 */
export interface ModalRoutingDecision {
  impact: ModalRoutingImpact;
  modalContext: ModalContext;
  reason: string;
}

// =============================================================================
// RAW MODAL SIGNAL
// =============================================================================

/**
 * A raw detection signal fed into the modal awareness service.
 * Callers supply a signal snapshot; the service classifies it.
 *
 * Phase 4B uses explicit signals from the runtime/focus/event layer.
 * The service does not query DOM, OS, or hardware directly — it classifies
 * what the caller observed.
 */
export interface ModalSignal {
  /**
   * Indicates that a modal container was detected in the UI tree.
   * DOM inspection, accessibility tree, or VS Code API events set this.
   */
  modalContainerDetected: boolean;

  /**
   * A hint about what kind of container was observed.
   * Caller provides this based on observed element role/class.
   * null if caller has no type hint.
   */
  containerHint: ModalType | null;

  /**
   * Whether focus appears to be trapped (cannot move outside a container)
   */
  focusTrapDetected: boolean;

  /**
   * Whether an overlay backdrop (dimming layer) was observed
   */
  backdropDetected: boolean;

  /**
   * Whether a notification/toast element was in the observed UI state
   */
  notificationDetected: boolean;

  /**
   * Whether a quick-open / command palette is known to be open
   */
  quickOpenDetected: boolean;
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * ModalAwarenessService (FP-8A)
 *
 * Classifies UI modal signals into typed ModalContext snapshots and
 * determines how those snapshots should affect routing decisions.
 *
 * This service is stateless — each call to classifyContext() produces an
 * independent snapshot from the provided signal. The caller is responsible
 * for maintaining the live modal signal (e.g. from event subscriptions).
 */
export class ModalAwarenessService {
  /**
   * Classify a raw modal signal into a structured ModalContext.
   *
   * Classification rules (priority order):
   * 1. Any focus trap + backdrop → dialog (blocking)
   * 2. Focus trap alone → dialog (blocking) — could be command palette or dialog
   * 3. Backdrop without focus trap → overlay (navigation)
   * 4. Quick open known open → quick_open (navigation)
   * 5. Notification detected → notification (informational)
   * 6. Container hint provided, no trap/backdrop → popup (transient)
   * 7. Container detected, no hint → unknown
   * 8. Nothing detected → none
   */
  classifyContext(signal: ModalSignal): ModalContext {
    const now = Date.now();

    // 1. Focus trap + backdrop → blocking dialog
    if (signal.focusTrapDetected && signal.backdropDetected) {
      return {
        overlayState: "active",
        modalType: "dialog",
        classification: "blocking",
        blocksNonReflex: true,
        focusTrapped: true,
        reason: "focus_trap_and_backdrop_detected → blocking dialog",
        timestamp: now,
      };
    }

    // 2. Focus trap alone (no backdrop) → blocking (command palette or dialog)
    if (signal.focusTrapDetected && !signal.backdropDetected) {
      const modalType: ModalType = signal.quickOpenDetected ? "quick_open" : "dialog";
      return {
        overlayState: "active",
        modalType,
        classification: "blocking",
        blocksNonReflex: true,
        focusTrapped: true,
        reason: `focus_trap_detected (no backdrop) → blocking ${modalType}`,
        timestamp: now,
      };
    }

    // 3. Backdrop without focus trap → navigation overlay
    if (signal.backdropDetected && !signal.focusTrapDetected) {
      return {
        overlayState: "active",
        modalType: "overlay",
        classification: "navigation",
        blocksNonReflex: false,
        focusTrapped: false,
        reason: "backdrop_detected (no focus_trap) → navigation overlay",
        timestamp: now,
      };
    }

    // 4. Quick open open (no trap/backdrop — some command palettes don't trap strictly)
    if (signal.quickOpenDetected) {
      return {
        overlayState: "active",
        modalType: "quick_open",
        classification: "navigation",
        blocksNonReflex: false,
        focusTrapped: false,
        reason: "quick_open_detected → navigation quick_open",
        timestamp: now,
      };
    }

    // 5. Notification / toast
    if (signal.notificationDetected) {
      return {
        overlayState: "active",
        modalType: "notification",
        classification: "informational",
        blocksNonReflex: false,
        focusTrapped: false,
        reason: "notification_detected → informational notification",
        timestamp: now,
      };
    }

    // 6. Container detected, caller provided a type hint → transient popup
    if (signal.modalContainerDetected && signal.containerHint) {
      return {
        overlayState: "active",
        modalType: signal.containerHint,
        classification: "transient",
        blocksNonReflex: false,
        focusTrapped: false,
        reason: `modal_container_detected (hint:${signal.containerHint}) → transient ${signal.containerHint}`,
        timestamp: now,
      };
    }

    // 7. Container detected, no hint → cannot classify confidently
    if (signal.modalContainerDetected && !signal.containerHint) {
      return {
        overlayState: "unknown",
        modalType: null,
        classification: null,
        blocksNonReflex: false,
        focusTrapped: false,
        reason: "modal_container_detected but no type hint → unknown",
        timestamp: now,
      };
    }

    // 8. Nothing detected
    return {
      overlayState: "none",
      modalType: null,
      classification: null,
      blocksNonReflex: false,
      focusTrapped: false,
      reason: "no_modal_signal_detected",
      timestamp: now,
    };
  }

  /**
   * Determine how a modal context should affect a routing decision.
   *
   * Routing impact rules (aligned with modes-state-machine overlay priority):
   *
   * - none:    pass — no modal present, route normally
   * - unknown: reflex_only — cannot confirm no modal, conservatively restrict
   * - active + blocking:      block (unless reflex command)
   * - active + navigation:    reroute (modal is now the focus scope)
   * - active + informational: pass (toast/banner does not block commands)
   * - active + transient:     pass (popup does not block commands)
   *
   * Note: The isReflex flag allows callers to indicate the command is a
   * reflex-family command (stop/cancel/undo). Per the modes-state-machine,
   * reflex commands remain active in all non-suspended states including
   * when overlay / modal is active.
   */
  evaluateRoutingImpact(
    context: ModalContext,
    isReflexCommand: boolean
  ): ModalRoutingDecision {
    // Reflex commands always pass regardless of modal state
    if (isReflexCommand) {
      return {
        impact: "pass",
        modalContext: context,
        reason: "reflex_commands_pass_in_all_modal_states",
      };
    }

    switch (context.overlayState) {
      case "none":
        return {
          impact: "pass",
          modalContext: context,
          reason: "no_modal_present",
        };

      case "unknown":
        // Cannot confirm modal-free — restrict to reflex only
        return {
          impact: "reflex_only",
          modalContext: context,
          reason: "modal_state_unknown → restrict_to_reflex_only_safe_abort",
        };

      case "active": {
        switch (context.classification) {
          case "blocking":
            return {
              impact: "block",
              modalContext: context,
              reason: `blocking_modal_active (${context.modalType}) → non_reflex_blocked`,
            };
          case "navigation":
            return {
              impact: "reroute",
              modalContext: context,
              reason: `navigation_modal_active (${context.modalType}) → reroute_to_modal_scope`,
            };
          case "informational":
          case "transient":
            return {
              impact: "pass",
              modalContext: context,
              reason: `${context.classification}_modal_active (${context.modalType}) → non_blocking_pass`,
            };
          default:
            // Classification is null on active state — shouldn't happen, treat as block
            return {
              impact: "block",
              modalContext: context,
              reason: "active_modal_with_null_classification → safe_block",
            };
        }
      }
    }
  }

  /**
   * Produce an empty "no modal present" context.
   * Convenience factory for callers that have no modal signal yet.
   */
  noModalContext(): ModalContext {
    return {
      overlayState: "none",
      modalType: null,
      classification: null,
      blocksNonReflex: false,
      focusTrapped: false,
      reason: "no_modal_context_provided",
      timestamp: Date.now(),
    };
  }

  /**
   * Returns true if the context requires blocking any non-reflex command.
   * Shorthand for callers that just need a quick block check.
   */
  isBlocking(context: ModalContext, isReflexCommand: boolean): boolean {
    if (isReflexCommand) return false;
    return (
      context.overlayState === "unknown" ||
      (context.overlayState === "active" && context.blocksNonReflex)
    );
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Shared instance — same pattern as phase3a/phase3b benchmark/audit services.
 * The dispatcher and other services import this directly.
 */
export const modalAwarenessService = new ModalAwarenessService();
