import {
  ModalContext,
  ModalRoutingDecision,
  modalAwarenessService,
} from "./modal-awareness-service";
import {
  SurfaceContext,
  SurfaceRoutingDecision,
  surfaceModelService,
} from "./surface-model-service";
import ReferentialIntentService, {
  ReferentialContext,
  ReferentialResolutionResult,
} from "./referential-intent-service";
import { ReferentialReferenceStack } from "./referential-reference-stack";

export type LanguageSystemIntegrationStatus = "pass" | "block";

export interface LanguageSystemIntegrationRequest {
  transcript: string;
  securityMode: "standard" | "secure" | "shared_room";
  speakerVerified: boolean;
  interactionMode: "command" | "dictation" | "conversation";
  isReflexCommand: boolean;
  dominantFamily: string;
  modalContext?: ModalContext;
  surfaceContext?: SurfaceContext;
}

export interface LanguageSystemIntegrationResult {
  status: LanguageSystemIntegrationStatus;
  reason: string;
  referential: ReferentialResolutionResult | null;
  modal: ModalRoutingDecision;
  surface: SurfaceRoutingDecision | null;
}

/**
 * Phase 4D bounded integration service.
 *
 * Integrates referential, modal, and surface signals into one deterministic
 * pre-dispatch decision without broad parser/runtime redesign.
 */
export class LanguageSystemIntegrationService {
  private readonly referentialService = new ReferentialIntentService();
  private readonly referenceStack = new ReferentialReferenceStack();

  evaluate(request: LanguageSystemIntegrationRequest): LanguageSystemIntegrationResult {
    const modalContext = request.modalContext ?? modalAwarenessService.noModalContext();
    const modalDecision = modalAwarenessService.evaluateRoutingImpact(
      modalContext,
      request.isReflexCommand
    );

    const referentialResult = this.resolveReferential(request);
    const surfaceDecision =
      request.surfaceContext !== undefined
        ? surfaceModelService.evaluateRoutingConstraint(
            request.surfaceContext,
            this.mapRequestedCapability(request.dominantFamily)
          )
        : null;

    const blockingReasons: string[] = [];

    if (referentialResult && referentialResult.outcome !== "no_marker" && referentialResult.outcome !== "resolved") {
      blockingReasons.push(`referential_${referentialResult.outcome}`);
    }

    if (modalDecision.impact === "block") {
      blockingReasons.push(`modal_block:${modalDecision.reason}`);
    }
    if (modalDecision.impact === "reflex_only" && !request.isReflexCommand) {
      blockingReasons.push(`modal_reflex_only_non_reflex:${modalDecision.reason}`);
    }

    if (surfaceDecision) {
      if (surfaceDecision.constraint === "block") {
        blockingReasons.push(`surface_block:${surfaceDecision.reason}`);
      }
      if (surfaceDecision.constraint === "unknown_surface") {
        blockingReasons.push(`surface_unknown:${surfaceDecision.reason}`);
      }
    }

    if (blockingReasons.length > 0) {
      return {
        status: "block",
        reason: blockingReasons.join(";"),
        referential: referentialResult,
        modal: modalDecision,
        surface: surfaceDecision,
      };
    }

    const passReasons: string[] = [];
    if (referentialResult && referentialResult.outcome === "resolved") {
      passReasons.push(`referential_resolved:${referentialResult.detectedMarker}`);
    } else if (referentialResult?.outcome === "no_marker") {
      passReasons.push("referential_no_marker");
    }
    passReasons.push(`modal_${modalDecision.impact}`);
    if (surfaceDecision) {
      passReasons.push(`surface_${surfaceDecision.constraint}`);
    } else {
      passReasons.push("surface_not_provided");
    }

    return {
      status: "pass",
      reason: passReasons.join(";"),
      referential: referentialResult,
      modal: modalDecision,
      surface: surfaceDecision,
    };
  }

  private resolveReferential(
    request: LanguageSystemIntegrationRequest
  ): ReferentialResolutionResult | null {
    if (!this.referentialService.hasReferentMarker(request.transcript)) {
      return {
        outcome: "no_marker",
        detectedMarker: null,
        grounding: "unknown",
        resolved: null,
        candidatesConsidered: [],
        reason: "No supported referent marker detected in transcript",
        timestamp: Date.now(),
      };
    }

    const referentialContext = this.buildReferentialContext(request);
    const result = this.referentialService.resolve(request.transcript, referentialContext);

    if (result.outcome === "resolved" && result.resolved) {
      this.referenceStack.push({
        type: result.resolved.entityType,
        label: result.resolved.label,
        id: result.resolved.id,
      });
    }

    return result;
  }

  private buildReferentialContext(request: LanguageSystemIntegrationRequest): ReferentialContext {
    const context = request.surfaceContext ?? surfaceModelService.noSurfaceContext();
    const anchor = surfaceModelService.extractReferentialAnchor(context);
    const activeSurface = context.activeSurface;

    return {
      activeSelection:
        anchor && (anchor.surfaceType === "selection" || anchor.surfaceType === "field")
          ? { label: anchor.label, id: anchor.id }
          : null,
      focusedPane: anchor ? { label: anchor.label, id: anchor.id } : null,
      activeApp:
        activeSurface?.identity.appId && activeSurface.identity.appId.length > 0
          ? {
              label: activeSurface.identity.appId,
              id: activeSurface.identity.appId,
            }
          : null,
      securityMode: request.securityMode,
      speakerVerified: request.speakerVerified,
      referenceStack: this.referenceStack,
    };
  }

  private mapRequestedCapability(
    dominantFamily: string
  ): keyof import("./surface-model-service").SurfaceCapabilities | null {
    switch (dominantFamily) {
      case "focus":
        return "canFocus";
      case "execution":
        return "canRunCommands";
      case "editing":
        return "canAcceptText";
      case "navigation":
        return "canScroll";
      case "system":
        return "canOpen";
      case "reflex":
      case "mixed":
      case "none":
      case "unknown":
      default:
        return null;
    }
  }
}

export const languageSystemIntegrationService = new LanguageSystemIntegrationService();
