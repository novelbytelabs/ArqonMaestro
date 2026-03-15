import { core } from "../../gen/core";

/**
 * RuntimeOutcome represents the normalized result of a command processing attempt.
 * 
 * This unifies executable and non-executable outcomes through one explicit runtime path:
 * - command_execution: commands were executed locally or via plugin
 * - chooser_required: ambiguity remains, user must choose from alternatives
 * - clarification_required: command is partially understood, needs more input
 * - refusal: command cannot be executed (safety, policy, or capability)
 * - blocked: command is blocked by current state or preconditions
 * - presentation_only: no executable commands, just showing state/feedback
 */
export type RuntimeOutcomeType =
  | "blocked"
  | "chooser_required"
  | "clarification_required"
  | "command_execution"
  | "presentation_only"
  | "refusal";

/**
 * Reason provides context about why a particular outcome was produced.
 */
export type RuntimeOutcomeReason =
  | "all_commands_invalid"
  | "ambiguous_alternatives"
  | "blocked_by_state"
  | "executed_successfully"
  | "no_commands_extracted"
  | "no_executable_commands"
  | "no_op_or_invalid_commands"
  | "policy_refusal"
  | "requires_confirmation"
  | "safety_refusal"
  | "silence_threshold_not_met"
  | "unknown_command_family"
  | "user_cancelled";

export interface RuntimeOutcome {
  type: RuntimeOutcomeType;
  reason: RuntimeOutcomeReason;
  alternativesCount: number;
  hasExecutable: boolean;
  dispatchRoute?: string;
  chunkId?: string;
  sessionId?: string;
  timestamp: number;
}

/**
 * Analyzes a CommandsResponse and produces a normalized RuntimeOutcome.
 * 
 * This creates a unified outcome path for both executable and non-executable
 * results, replacing scattered legacy handling with explicit classification.
 */
export class RuntimeOutcomeClassifier {
  /**
   * Classifies a command response into a normalized RuntimeOutcome.
   * 
   * IMPORTANT: The order of checks matters! More specific outcomes (blocked, refusal,
   * clarification) must be checked BEFORE broader outcomes (chooser, presentation_only)
   * to ensure they are reachable in realistic response flows.
   */
  classify(
    response: core.ICommandsResponse,
    dispatchRoute?: string,
    chunkId?: string,
    sessionId?: string
  ): RuntimeOutcome {
    const now = Date.now();
    const hasExecute = this.hasExecutableCommands(response);
    const alternativesCount = response.alternatives?.length || 0;
    
    // CRITICAL: Check for blocked FIRST - this must be reachable even when there are alternatives
    // Check if execution was blocked by state
    if (this.isBlockedByState(response)) {
      return {
        type: "blocked",
        reason: "blocked_by_state",
        alternativesCount,
        hasExecutable: false,
        dispatchRoute,
        chunkId,
        sessionId,
        timestamp: now,
      };
    }
    
    // CRITICAL: Check for refusal BEFORE chooser - refusal indicates valid alternatives
    // that were rejected for safety/policy reasons
    if (this.isRefusal(response)) {
      return {
        type: "refusal",
        reason: "safety_refusal",
        alternativesCount,
        hasExecutable: false,
        dispatchRoute,
        chunkId,
        sessionId,
        timestamp: now,
      };
    }
    
    // CRITICAL: Check for clarification BEFORE chooser - clarification is more specific
    // and indicates partial understanding that needs refinement
    if (this.requiresClarification(response)) {
      return {
        type: "clarification_required",
        reason: "requires_confirmation",
        alternativesCount,
        hasExecutable: true, // Has some executable but also needs clarification
        dispatchRoute,
        chunkId,
        sessionId,
        timestamp: now,
      };
    }
    
    // Now check for command execution - this is a positive outcome
    if (hasExecute) {
      return {
        type: "command_execution" as RuntimeOutcomeType,
        reason: "executed_successfully",
        alternativesCount,
        hasExecutable: true,
        dispatchRoute,
        chunkId,
        sessionId,
        timestamp: now,
      };
    }
    
    // No executable commands - check for chooser vs presentation_only
    if (alternativesCount > 0) {
      // There are alternatives but no execution - user needs to choose
      return {
        type: "chooser_required",
        reason: "ambiguous_alternatives",
        alternativesCount,
        hasExecutable: false,
        dispatchRoute,
        chunkId,
        sessionId,
        timestamp: now,
      };
    }
    
    // No alternatives, no execute - presentation only
    // Check if there are any commands in execute that are no-op/invalid
    if (response.execute && response.execute.commands && response.execute.commands.length > 0) {
      return {
        type: "presentation_only",
        reason: "no_op_or_invalid_commands",
        alternativesCount,
        hasExecutable: false,
        dispatchRoute,
        chunkId,
        sessionId,
        timestamp: now,
      };
    }
    
    // Truly no commands extracted at all
    return {
      type: "presentation_only",
      reason: "no_commands_extracted",
      alternativesCount: 0,
      hasExecutable: false,
      dispatchRoute,
      chunkId,
      sessionId,
      timestamp: now,
    };
  }
  
  private hasExecutableCommands(response: core.ICommandsResponse): boolean {
    const noOpTypes = new Set([
      core.CommandType.COMMAND_TYPE_INVALID,
      core.CommandType.COMMAND_TYPE_NONE,
      core.CommandType.COMMAND_TYPE_NO_OP,
      core.CommandType.COMMAND_TYPE_PING,
    ]);
    
    if (!response.execute || !response.execute.commands || response.execute.commands.length === 0) {
      return false;
    }
    
    return response.execute.commands.some(cmd => {
      const cmdType = cmd.type;
      // If type is undefined or null, treat as non-executable
      if (cmdType === undefined || cmdType === null) {
        return false;
      }
      // If type is in no-op set, it's not executable
      if (noOpTypes.has(cmdType)) {
        return false;
      }
      return true;
    });
  }
  
  private isNoOpOrInvalidOnly(response: core.ICommandsResponse): boolean {
    const executeCommands = response.execute?.commands || [];
    const alternativeCommands: core.ICommand[] = [];
    if (response.alternatives) {
      for (const alt of response.alternatives) {
        if (alt.commands) {
          alternativeCommands.push(...alt.commands);
        }
      }
    }
    const allCommands = [...executeCommands, ...alternativeCommands];
    
    if (allCommands.length === 0) {
      return false;
    }
    
    const noOpTypes = new Set([
      core.CommandType.COMMAND_TYPE_NONE,
      core.CommandType.COMMAND_TYPE_NO_OP,
      core.CommandType.COMMAND_TYPE_INVALID,
      core.CommandType.COMMAND_TYPE_PING,
    ]);
    
    return allCommands.every(cmd => noOpTypes.has(cmd.type || core.CommandType.COMMAND_TYPE_NONE));
  }
  
  private areAllAlternativesInvalid(response: core.ICommandsResponse): boolean {
    if (!response.alternatives || response.alternatives.length === 0) {
      return false;
    }
    
    return response.alternatives.every(alt => 
      !alt.commands || 
      alt.commands.length === 0 ||
      alt.commands.every(cmd => cmd.type === core.CommandType.COMMAND_TYPE_INVALID)
    );
  }
  
  private isBlockedByState(response: core.ICommandsResponse): boolean {
    // Check for responses that indicate blocking (e.g., blocked applications)
    if (response.alternatives) {
      for (const alt of response.alternatives) {
        if (alt.commands) {
          for (const cmd of alt.commands) {
            // If a command was explicitly marked invalid due to app state
            if (cmd.type === core.CommandType.COMMAND_TYPE_INVALID && cmd.text != null) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
  
  private isRefusal(response: core.ICommandsResponse): boolean {
    // Refusal should only trigger when there's an explicit refusal signal.
    // In the current CommandResponse model, we don't have explicit refusal indicators,
    // so we check for a pattern where all alternatives were valid but the response
    // explicitly indicates refusal (e.g., through a specific response field or pattern).
    // 
    // For now, we return false since there's no explicit refusal indicator in the protobuf.
    // This can be enhanced when the protocol adds refusal signals.
    //
    // A real refusal would need something like:
    // - response.refusal === true
    // - or specific refusal command types
    // - or a response.error field indicating policy rejection
    
    // TODO: Add explicit refusal detection when protocol supports it
    return false;
    
    // Legacy pattern (incorrect - treats chooser as refusal):
    // let hasValidAlternatives = false;
    // if (response.alternatives) {
    //   for (const alt of response.alternatives) {
    //     if (alt.commands) {
    //       for (const cmd of alt.commands) {
    //         if (cmd.type !== core.CommandType.COMMAND_TYPE_INVALID) {
    //           hasValidAlternatives = true;
    //           break;
    //         }
    //       }
    //     }
    //     if (hasValidAlternatives) break;
    //   }
    // }
    // 
    // const hasNoExecute = !response.execute || 
    //   !response.execute.commands || 
    //   response.execute.commands.length === 0;
    // 
    // return hasValidAlternatives && hasNoExecute;
  }
  
  private requiresClarification(response: core.ICommandsResponse): boolean {
    // Clarification is needed when there's execution but also unresolved alternatives
    if (!response.execute || !response.execute.commands) {
      return false;
    }
    
    const hasAlternatives = !!(response.alternatives && response.alternatives.length > 1);
    let isPartialMatch = false;
    if (response.alternatives) {
      for (const alt of response.alternatives) {
        if (alt.commands) {
          for (const cmd of alt.commands) {
            if (cmd.type === core.CommandType.COMMAND_TYPE_INVALID) {
              isPartialMatch = true;
              break;
            }
          }
        }
        if (isPartialMatch) break;
      }
    }
    
    return hasAlternatives && isPartialMatch;
  }
}
