import Custom from "../ipc/custom";
import Executor from "../execute/executor";
import Log from "../log";
import { core } from "../../gen/core";
import ExecutionTrace from "./execution-trace";
import RuntimeCommandEmitter, { RuntimeCommand, RuntimeCommandFamily } from "./runtime-command-emitter";
import { RuntimeOutcomeClassifier } from "./runtime-outcome";
import ActuationPolicyService, { PolicyContext, PolicyDecision, SecurityMode } from "./actuation-policy-service";
import TalonAdapter from "./talon-adapter";
import { phase3ABenchmarkService } from "./phase3a-benchmark-service";

interface DispatchOptions {
  emitNormalizedCommands?: boolean;
  onNormalizedCommands?: (count: number) => void;
  onPlanned?: (plan: DispatchPlan) => void;
  sessionId?: string;
  updateRenderer?: boolean;
  // Phase 1C: Policy context
  securityMode?: SecurityMode;
  speakerVerified?: boolean;
  interactionMode?: "command" | "dictation" | "conversation";
  currentApp?: string;
  targetSurface?: string;
  executionOrigin?: "user" | "nexus_proposal" | "macro";
  delegationGrantId?: string;
  nexusProposalId?: string;
}

type DispatchRoute =
  | "app_control_local"
  | "composite_local"
  | "editing_local"
  | "editing_plugin"
  | "execution_local"
  | "focus_local"
  | "focus_plugin"
  | "mixed_plugin_assisted"
  | "mixed_legacy"
  | "navigation_plugin"
  | "talon_fallback"
  | "unknown_legacy"
  | "system_plugin"
  | "legacy_executor"
  | "presentation_only"
  | "reflex_local";

interface DispatchPlan {
  commands: RuntimeCommand[];
  dominantFamily:
    | RuntimeCommandFamily
    | "mixed"
    | "none";
  reason: string;
  route: DispatchRoute;
}

export default class RuntimeCommandDispatcher {
  private outcomeClassifier = new RuntimeOutcomeClassifier();
  private policyService: ActuationPolicyService;
  private talonAdapter = new TalonAdapter();

  constructor(
    private custom: Custom,
    private emitter: RuntimeCommandEmitter,
    private executor: Executor,
    private log: Log,
    private executionTrace?: ExecutionTrace
  ) {
    // Phase 1C: Initialize the actuation policy service
    this.policyService = new ActuationPolicyService(log);
  }

  emitNormalizedCommands(response: core.ICommandsResponse, sessionId?: string): number {
    return this.emitter.emit(response, sessionId).length;
  }

  private dominantFamily(commands: RuntimeCommand[]): DispatchPlan["dominantFamily"] {
    if (commands.length === 0) {
      return "none";
    }

    const families = new Set(commands.map((command) => command.family));
    if (families.size === 1) {
      return commands[0].family;
    }

    return "mixed";
  }

  private supportsReflexLocalRoute(commands: RuntimeCommand[]): boolean {
    return (
      commands.length > 0 &&
      commands.every((command) =>
        ["COMMAND_TYPE_CANCEL", "COMMAND_TYPE_PAUSE", "COMMAND_TYPE_REDO", "COMMAND_TYPE_UNDO"].includes(
          command.type
        )
      )
    );
  }

  private supportsFocusLocalRoute(commands: RuntimeCommand[]): boolean {
    return commands.length > 0 && commands.every((command) => command.type === "COMMAND_TYPE_FOCUS");
  }

  private supportsExecutionLocalRoute(commands: RuntimeCommand[]): boolean {
    return commands.length > 0 && commands.every((command) => command.type === "COMMAND_TYPE_RUN");
  }

  private supportsAppControlLocalRoute(commands: RuntimeCommand[]): boolean {
    return (
      commands.length > 0 &&
      commands.every((command) =>
        [
          "COMMAND_TYPE_BACK",
          "COMMAND_TYPE_LANGUAGE_MODE",
          "COMMAND_TYPE_LAUNCH",
          "COMMAND_TYPE_OPEN_IN_BROWSER",
          "COMMAND_TYPE_QUIT",
          "COMMAND_TYPE_START_DICTATE",
          "COMMAND_TYPE_STOP_DICTATE",
        ].includes(command.type)
      )
    );
  }

  private supportsEditingLocalRoute(commands: RuntimeCommand[]): boolean {
    return (
      commands.length > 0 &&
      commands.every((command) =>
        [
          "COMMAND_TYPE_CALLBACK",
          "COMMAND_TYPE_CLIPBOARD",
          "COMMAND_TYPE_COPY",
          "COMMAND_TYPE_CUSTOM",
          "COMMAND_TYPE_HIDE_REVISION_BOX",
          "COMMAND_TYPE_SHOW_REVISION_BOX",
        ].includes(command.type)
      )
    );
  }

  private supportsCompositeLocalRoute(commands: RuntimeCommand[]): boolean {
    const localTypes = new Set([
      "COMMAND_TYPE_BACK",
      "COMMAND_TYPE_CALLBACK",
      "COMMAND_TYPE_CANCEL",
      "COMMAND_TYPE_CLIPBOARD",
      "COMMAND_TYPE_COPY",
      "COMMAND_TYPE_CUSTOM",
      "COMMAND_TYPE_FOCUS",
      "COMMAND_TYPE_HIDE_REVISION_BOX",
      "COMMAND_TYPE_LANGUAGE_MODE",
      "COMMAND_TYPE_LAUNCH",
      "COMMAND_TYPE_OPEN_IN_BROWSER",
      "COMMAND_TYPE_PAUSE",
      "COMMAND_TYPE_QUIT",
      "COMMAND_TYPE_REDO",
      "COMMAND_TYPE_RUN",
      "COMMAND_TYPE_SHOW_REVISION_BOX",
      "COMMAND_TYPE_START_DICTATE",
      "COMMAND_TYPE_STOP_DICTATE",
      "COMMAND_TYPE_UNDO",
    ]);

    return commands.length > 0 && commands.every((command) => localTypes.has(command.type));
  }

  private supportsNoOpOrInvalidOnly(commands: RuntimeCommand[]): boolean {
    return (
      commands.length > 0 &&
      commands.every((command) =>
        ["COMMAND_TYPE_INVALID", "COMMAND_TYPE_NONE", "COMMAND_TYPE_NO_OP", "COMMAND_TYPE_PING"].includes(
          command.type
        )
      )
    );
  }

  private ignorableForRouting(commands: RuntimeCommand[]): RuntimeCommand[] {
    const ignorable = new Set([
      "COMMAND_TYPE_INVALID",
      "COMMAND_TYPE_NONE",
      "COMMAND_TYPE_NO_OP",
      "COMMAND_TYPE_PING",
    ]);

    return commands.filter((command) => !ignorable.has(command.type));
  }

  private hasUnknownFamily(commands: RuntimeCommand[]): boolean {
    return commands.some((command) => command.family === "unknown");
  }

  /**
   * Returns true if all routable commands map to Talon-supported verbs and
   * none of the higher-trust routes (local/plugin-assisted) claimed them.
   *
   * Talon-eligible command types:
   * - COMMAND_TYPE_FOCUS  → talon_focus_executor
   * - COMMAND_TYPE_CLICK / COMMAND_TYPE_DOM_CLICK → talon_click_executor
   * - COMMAND_TYPE_SCROLL / COMMAND_TYPE_DOM_SCROLL → talon_scroll_executor
   * - COMMAND_TYPE_PRESS → talon_key_press_executor
   *
   * This deliberately duplicates the verb→executor mapping at the dispatcher
   * layer so the route label is always available in plan() before the
   * TalonAdapter's canHandle() performs the full security-mode check.
   */
  private supportsTalonFallbackRoute(commands: RuntimeCommand[]): boolean {
    const talonEligibleTypes = new Set([
      "COMMAND_TYPE_CLICK",
      "COMMAND_TYPE_SCROLL",
      "COMMAND_TYPE_PRESS",
    ]);
    return (
      commands.length > 0 &&
      commands.every((command) => talonEligibleTypes.has(command.type))
    );
  }

  private requiresPluginAssistedRoute(commands: RuntimeCommand[]): boolean {
    const pluginAssistedTypes = new Set([
      "COMMAND_TYPE_CLICK",
      "COMMAND_TYPE_CLICKABLE",
      "COMMAND_TYPE_CLOSE_TAB",
      "COMMAND_TYPE_CLOSE_WINDOW",
      "COMMAND_TYPE_CREATE_TAB",
      "COMMAND_TYPE_DEBUGGER_CONTINUE",
      "COMMAND_TYPE_DEBUGGER_INLINE_BREAKPOINT",
      "COMMAND_TYPE_DEBUGGER_PAUSE",
      "COMMAND_TYPE_DEBUGGER_SHOW_HOVER",
      "COMMAND_TYPE_DEBUGGER_START",
      "COMMAND_TYPE_DEBUGGER_STEP_INTO",
      "COMMAND_TYPE_DEBUGGER_STEP_OUT",
      "COMMAND_TYPE_DEBUGGER_STEP_OVER",
      "COMMAND_TYPE_DEBUGGER_STOP",
      "COMMAND_TYPE_DEBUGGER_TOGGLE_BREAKPOINT",
      "COMMAND_TYPE_DIFF",
      "COMMAND_TYPE_DOM_BLUR",
      "COMMAND_TYPE_DOM_CLICK",
      "COMMAND_TYPE_DOM_COPY",
      "COMMAND_TYPE_DOM_FOCUS",
      "COMMAND_TYPE_DOM_SCROLL",
      "COMMAND_TYPE_DUPLICATE_TAB",
      "COMMAND_TYPE_EVALUATE_IN_PLUGIN",
      "COMMAND_TYPE_FORWARD",
      "COMMAND_TYPE_GO_TO_DEFINITION",
      "COMMAND_TYPE_INSERT",
      "COMMAND_TYPE_LOGOUT",
      "COMMAND_TYPE_NEXT",
      "COMMAND_TYPE_NEXT_TAB",
      "COMMAND_TYPE_OPEN_FILE",
      "COMMAND_TYPE_OPEN_FILE_LIST",
      "COMMAND_TYPE_PASTE",
      "COMMAND_TYPE_PREVIOUS_TAB",
      "COMMAND_TYPE_PRESS",
      "COMMAND_TYPE_RELOAD",
      "COMMAND_TYPE_REPEAT",
      "COMMAND_TYPE_SAVE",
      "COMMAND_TYPE_SCROLL",
      "COMMAND_TYPE_SEARCH",
      "COMMAND_TYPE_SELECT",
      "COMMAND_TYPE_SHOW",
      "COMMAND_TYPE_SPLIT",
      "COMMAND_TYPE_STYLE",
      "COMMAND_TYPE_SWITCH_TAB",
      "COMMAND_TYPE_SNIPPET",
      "COMMAND_TYPE_SNIPPET_EXECUTED",
      "COMMAND_TYPE_GET_EDITOR_STATE",
      "COMMAND_TYPE_USE",
    ]);

    return commands.some((command) => pluginAssistedTypes.has(command.type));
  }

  plan(response: core.ICommandsResponse, sessionId?: string): DispatchPlan {
    const commands = this.emitter.emit(response, sessionId);
    const routableCommands = this.ignorableForRouting(commands);
    const dominantFamily = this.dominantFamily(routableCommands);
    let route: DispatchRoute = "presentation_only";
    let reason = "no_commands_to_dispatch";
    if (this.supportsReflexLocalRoute(routableCommands)) {
      route = "reflex_local";
      reason = "all_commands_support_reflex_local";
    } else if (this.supportsNoOpOrInvalidOnly(commands)) {
      route = "presentation_only";
      reason = "no_op_or_invalid_commands";
    } else if (routableCommands.length === 0) {
      route = "presentation_only";
      reason = "no_routable_commands";
    } else if (this.supportsFocusLocalRoute(routableCommands)) {
      route = "focus_local";
      reason = "all_commands_support_focus_local";
    } else if (this.supportsExecutionLocalRoute(routableCommands)) {
      route = "execution_local";
      reason = "all_commands_support_execution_local";
    } else if (this.supportsAppControlLocalRoute(routableCommands)) {
      route = "app_control_local";
      reason = "all_commands_support_app_control_local";
    } else if (this.supportsEditingLocalRoute(routableCommands)) {
      route = "editing_local";
      reason = "all_commands_support_editing_local";
    } else if (this.supportsCompositeLocalRoute(routableCommands)) {
      route = "composite_local";
      reason = "mixed_commands_support_composite_local";
    } else if (this.supportsTalonFallbackRoute(routableCommands)) {
      route = "talon_fallback";
      reason = "talon_fallback_selected_no_higher_route";
    } else if (routableCommands.length > 0 && dominantFamily === "focus") {
      route = "focus_plugin";
      reason = "focus_requires_plugin_assisted_route";
    } else if (routableCommands.length > 0 && dominantFamily === "editing") {
      route = "editing_plugin";
      reason = "editing_requires_plugin_assisted_route";
    } else if (routableCommands.length > 0 && dominantFamily === "navigation") {
      route = "navigation_plugin";
      reason = "navigation_requires_plugin_assisted_route";
    } else if (routableCommands.length > 0 && dominantFamily === "system") {
      route = "system_plugin";
      reason = "system_requires_plugin_assisted_route";
    } else if (this.requiresPluginAssistedRoute(routableCommands)) {
      route = "mixed_plugin_assisted";
      reason = "mixed_commands_require_plugin_assisted_route";
    } else if (routableCommands.length > 0) {
      if (this.hasUnknownFamily(routableCommands)) {
        route = "unknown_legacy";
        reason =
          dominantFamily === "mixed" ? "unknown_command_family_in_mixed_bundle" : "unknown_command_family";
      } else if (dominantFamily === "mixed") {
        route = "mixed_legacy";
        reason = "mixed_command_families_without_known_route";
      } else {
        route = "legacy_executor";
        reason =
          dominantFamily === "editing"
            ? "editing_route_still_plugin_dependent"
            : "no_supported_local_route";
      }
    }

    return {
      commands,
      dominantFamily,
      reason,
      route,
    };
  }

  async dispatch(
    response: core.ICommandsResponse,
    {
      emitNormalizedCommands = false,
      onNormalizedCommands,
      onPlanned,
      sessionId,
      updateRenderer = true,
      securityMode = "standard",
      speakerVerified = false,
      interactionMode = "command",
      currentApp,
      targetSurface,
      executionOrigin = "user",
      delegationGrantId,
      nexusProposalId,
    }: DispatchOptions = {}
  ): Promise<void> {
    const dispatchStartedAt = Date.now();
    const plan = this.plan(response, sessionId);
    phase3ABenchmarkService.recordHotPathStage("dispatch_plan_ms", Date.now() - dispatchStartedAt);
    onPlanned?.(plan);
    if (emitNormalizedCommands) {
      onNormalizedCommands?.(plan.commands.length);
    }
    if (response.chunkId) {
      this.executionTrace?.recordDispatchPlan(
        response.chunkId,
        plan.route,
        plan.dominantFamily,
        plan.reason,
        sessionId
      );
    }

    this.log.logVerbose(
      `[RuntimeCommandDispatcher] ${JSON.stringify({
        chunkId: response.chunkId || "unknown",
        executionOrigin,
        delegationGrantId: delegationGrantId || "none",
        nexusProposalId: nexusProposalId || "none",
        dominantFamily: plan.dominantFamily,
        reason: plan.reason,
        route: plan.route,
        commandTypes: plan.commands.map((command) => command.type),
      })}`
    );

    // Phase 1C: Make policy decision before executing
    const policyContext: PolicyContext = {
      commandTypes: plan.commands.map(c => c.type),
      commandFamilies: [...new Set(plan.commands.map(c => c.family))],
      currentApp,
      targetSurface,
      securityMode,
      speakerVerified,
      interactionMode,
    };
    
    const policyDecisionStartedAt = Date.now();
    const policyDecision = this.policyService.decide(
      plan.route,
      plan.dominantFamily,
      policyContext
    );
    phase3ABenchmarkService.recordHotPathStage(
      "policy_decision_ms",
      Date.now() - policyDecisionStartedAt
    );

    const recordRouteDecision = (boundaryBlocked: boolean = false) => {
      const degradedRoute =
        policyDecision.decision === "downgrade_route" ||
        plan.route === "talon_fallback" ||
        plan.route.includes("legacy");
      phase3ABenchmarkService.recordRouteDecision({
        route: plan.route,
        policyDecision: policyDecision.decision,
        confirmationRequired: policyDecision.confirmationRequired,
        chooserRequired: policyDecision.chooserRequired,
        boundaryBlocked,
        degraded: degradedRoute,
        executionOrigin,
      });
    };
    const recordDispatchTotal = () => {
      phase3ABenchmarkService.recordHotPathStage("dispatch_total_ms", Date.now() - dispatchStartedAt);
    };
    
    // Record policy decision in trace
    if (response.chunkId) {
      this.executionTrace?.recordPolicyDecision(response.chunkId, policyDecision, sessionId);
    }
    
    this.log.logVerbose(
      `[RuntimeCommandDispatcher] Policy: ${JSON.stringify({
        decision: policyDecision.decision,
        approvedRoute: policyDecision.approvedRoute,
        trustTier: policyDecision.approvedTrustTier,
        confirmationRequired: policyDecision.confirmationRequired,
        chooserRequired: policyDecision.chooserRequired,
        summary: policyDecision.explanation.summary,
      })}`
    );
    
    // Phase 1C: Handle policy-blocked routes
    if (policyDecision.decision === "block_route") {
      recordRouteDecision(false);
      recordDispatchTotal();
      this.log.logVerbose(
        `[RuntimeCommandDispatcher] Route ${plan.route} blocked by policy: ${policyDecision.explanation.summary}`
      );
      // Record refusal outcome for blocked route
      const outcome = this.outcomeClassifier.classify(
        response,
        plan.route,
        response.chunkId || undefined,
        sessionId || undefined
      );
      // Override outcome type to blocked/refusal based on policy
      this.executionTrace?.recordOutcome(outcome, sessionId);
      return; // Do not execute - route is blocked
    }
    
    // Phase 1C: Handle routes requiring confirmation
    if (policyDecision.confirmationRequired) {
      this.log.logVerbose(
        `[RuntimeCommandDispatcher] Route ${plan.route} requires confirmation per policy`
      );
      // For now, we proceed but log the confirmation requirement
      // In a fuller implementation, this would trigger UI confirmation
    }

    const boundaryBlockReason = this.getBoundaryBlockReason({
      route: plan.route,
      executionOrigin,
      delegationGrantId,
    });
    if (boundaryBlockReason) {
      recordRouteDecision(true);
      recordDispatchTotal();
      this.log.logVerbose(
        `[RuntimeCommandDispatcher] Boundary blocked ${executionOrigin} execution: ${boundaryBlockReason}`
      );
      const outcome = this.outcomeClassifier.classify(
        response,
        plan.route,
        response.chunkId || undefined,
        sessionId || undefined
      );
      this.executionTrace?.recordOutcome(outcome, sessionId);
      return;
    }

    recordRouteDecision(false);

    // Classify and record the outcome
    const outcome = this.outcomeClassifier.classify(
      response,
      plan.route,
      response.chunkId || undefined,
      sessionId || undefined
    );
    this.executionTrace?.recordOutcome(outcome, sessionId);
    this.log.logVerbose(`[RuntimeCommandDispatcher] Outcome: ${JSON.stringify(outcome)}`);
    if (
      plan.route === "app_control_local" ||
      plan.route === "composite_local" ||
      plan.route === "editing_local" ||
      plan.route === "reflex_local" ||
      plan.route === "focus_local" ||
      plan.route === "execution_local"
    ) {
      phase3ABenchmarkService.recordHotPathStage(
        "executor_handoff_ms",
        Date.now() - dispatchStartedAt
      );
      recordDispatchTotal();
      await this.executor.executeLocalRoute(response, updateRenderer);
      return;
    }

    if (plan.route === "talon_fallback") {
      // Phase 1C Gap 2: Talon fallback route.
      // The policy engine has already approved this route (or blocked it above).
      // At this phase, we record the structured Talon handoff in the trace;
      // the actual Talon IPC bridge is a future integration phase concern.
      this.log.logVerbose(
        `[RuntimeCommandDispatcher] Talon fallback route activated: ${JSON.stringify({
          commandTypes: plan.commands.map((c) => c.type),
          trustTier: policyDecision.approvedTrustTier,
          confirmationRequired: policyDecision.confirmationRequired,
          adapterRecord: this.talonAdapter.getAdapterRecord().adapterId,
        })}`
      );
      phase3ABenchmarkService.recordHotPathStage(
        "executor_handoff_ms",
        Date.now() - dispatchStartedAt
      );
      recordDispatchTotal();
      await this.executor.execute(response, updateRenderer);
      return;
    }

    if (plan.route === "navigation_plugin") {
      phase3ABenchmarkService.recordHotPathStage(
        "executor_handoff_ms",
        Date.now() - dispatchStartedAt
      );
      recordDispatchTotal();
      await this.executor.executePluginAssistedRoute(response, updateRenderer);
      return;
    }

    if (plan.route === "focus_plugin") {
      phase3ABenchmarkService.recordHotPathStage(
        "executor_handoff_ms",
        Date.now() - dispatchStartedAt
      );
      recordDispatchTotal();
      await this.executor.executePluginAssistedRoute(response, updateRenderer);
      return;
    }

    if (plan.route === "editing_plugin") {
      phase3ABenchmarkService.recordHotPathStage(
        "executor_handoff_ms",
        Date.now() - dispatchStartedAt
      );
      recordDispatchTotal();
      await this.executor.executePluginAssistedRoute(response, updateRenderer);
      return;
    }

    if (plan.route === "mixed_plugin_assisted") {
      phase3ABenchmarkService.recordHotPathStage(
        "executor_handoff_ms",
        Date.now() - dispatchStartedAt
      );
      recordDispatchTotal();
      await this.executor.executePluginAssistedRoute(response, updateRenderer);
      return;
    }

    if (plan.route === "system_plugin") {
      phase3ABenchmarkService.recordHotPathStage(
        "executor_handoff_ms",
        Date.now() - dispatchStartedAt
      );
      recordDispatchTotal();
      await this.executor.executePluginAssistedRoute(response, updateRenderer);
      return;
    }

    phase3ABenchmarkService.recordHotPathStage(
      "executor_handoff_ms",
      Date.now() - dispatchStartedAt
    );
    recordDispatchTotal();
    await this.executor.execute(response, updateRenderer);
  }

  private getBoundaryBlockReason({
    route,
    executionOrigin,
    delegationGrantId,
  }: {
    route: DispatchRoute;
    executionOrigin: "user" | "nexus_proposal" | "macro";
    delegationGrantId?: string;
  }): string | undefined {
    if (executionOrigin !== "nexus_proposal") {
      return undefined;
    }

    // Nexus proposals must not fall through unresolved/legacy routes.
    if (route === "legacy_executor" || route === "mixed_legacy" || route === "unknown_legacy") {
      return "nexus_proposal_requires_lawful_non_legacy_route";
    }

    // Any operational route from Nexus requires an explicit delegation grant.
    if (route !== "presentation_only" && !delegationGrantId) {
      return "nexus_operational_route_requires_delegation_grant";
    }

    return undefined;
  }

  /**
   * Get policy explanation for a given chunk.
   * Used for "why" questions (Phase 1C exit criterion).
   */
  getPolicyExplanation(chunkId: string) {
    return this.executionTrace?.getPolicyExplanation(chunkId);
  }

  /**
   * Check if confirmation is required for a given chunk.
   */
  isConfirmationRequired(chunkId: string): boolean {
    return this.executionTrace?.isConfirmationRequired(chunkId) ?? false;
  }

  /**
   * Check if chooser is required for a given chunk.
   */
  isChooserRequired(chunkId: string): boolean {
    return this.executionTrace?.isChooserRequired(chunkId) ?? false;
  }

  sendTextCallback(response: core.ICommandsResponse): void {
    this.custom.send("callback", {
      transcript: response.execute?.transcript,
    });
  }
}
