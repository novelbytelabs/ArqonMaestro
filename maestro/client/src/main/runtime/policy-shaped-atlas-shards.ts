import { FocusConditionedCommandContextEnvelope } from "./focus-conditioned-command-context";

export type PolicyShapedAtlasShardHintId =
  | "global_default"
  | "browser_navigation"
  | "editor_symbolic"
  | "terminal_session";

export type PolicyShapedAtlasShardHintSource =
  | "focus_app"
  | "focus_region"
  | "focus_control"
  | "global_default"
  | "none";

export interface PolicyShapedAtlasShardHint {
  schemaVersion: "h3_policy_shaped_atlas_shard_hint_v1";
  policyVersion: string;
  atlasShardHintId: PolicyShapedAtlasShardHintId | null;
  atlasShardHintEligible: boolean;
  atlasShardHintSource: PolicyShapedAtlasShardHintSource;
  atlasShardHintPriority: number | null;
  atlasShardReasonCodes: string[];
}

export interface PolicyShapedAtlasShardEvidenceFields {
  atlasShardPolicyVersion: string | null;
  atlasShardHintId: string | null;
  atlasShardHintEligible: boolean | null;
  atlasShardHintSource: string | null;
  atlasShardHintPriority: number | null;
  atlasShardReasonCodes: string[] | null;
}

export interface PolicyShapedAtlasShardRankingCandidate {
  regionId: string | null;
  canonicalPrefix: string | null;
  canonicalMergedText: string | null;
  commandFamily: string | null;
  parameterType?: "numeric" | "open" | null;
}

export interface PolicyShapedAtlasShardRankingAdjustment {
  atlasShardRankingApplied: boolean;
  atlasShardRankingBoost: number;
  atlasShardRankingReasonCodes: string[];
  atlasShardRankingCandidateKind: string | null;
}

export const POLICY_SHAPED_ATLAS_SHARD_HINT_SCHEMA_VERSION =
  "h3_policy_shaped_atlas_shard_hint_v1" as const;
export const POLICY_SHAPED_ATLAS_SHARD_POLICY_VERSION =
  "3e2_policy_shaped_atlas_shards_v1" as const;
export const POLICY_SHAPED_ATLAS_SHARD_RANKING_MAX_BOOST = 0.045;

const BROWSER_APPS = new Set(["chrome", "chromium", "brave", "firefox", "arc"]);
const BROWSER_REGIONS = new Set(["address-bar", "tab-strip", "browser-tab-content"]);
const BROWSER_CONTROLS = new Set(["omnibox", "tab-strip"]);
const EDITOR_APPS = new Set(["code", "vscode", "cursor"]);
const EDITOR_REGIONS = new Set(["editor", "file-tree", "symbol-outline"]);
const EDITOR_CONTROLS = new Set(["editor", "explorer"]);
const TERMINAL_APPS = new Set(["terminal", "gnome-terminal", "alacritty", "kitty", "wezterm"]);
const TERMINAL_REGIONS = new Set(["terminal", "terminal-prompt", "terminal-output"]);
const TERMINAL_CONTROLS = new Set(["prompt", "terminal"]);
const CODE_EXTENSIONS = /\.(ts|tsx|js|jsx|py|md|json|yaml|yml|rs|go|java|c|cpp|h|hpp|sh|sql)$/;
const DOMAINISH = /(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})(\/|$)/;

export function derivePolicyShapedAtlasShardHint(
  envelope: FocusConditionedCommandContextEnvelope | null | undefined
): PolicyShapedAtlasShardHint {
  if (!envelope) {
    return {
      schemaVersion: POLICY_SHAPED_ATLAS_SHARD_HINT_SCHEMA_VERSION,
      policyVersion: POLICY_SHAPED_ATLAS_SHARD_POLICY_VERSION,
      atlasShardHintId: null,
      atlasShardHintEligible: false,
      atlasShardHintSource: "none",
      atlasShardHintPriority: null,
      atlasShardReasonCodes: ["focus_context_missing"],
    };
  }

  if (!envelope.contextEligible || !envelope.snapshot) {
    return {
      schemaVersion: POLICY_SHAPED_ATLAS_SHARD_HINT_SCHEMA_VERSION,
      policyVersion: POLICY_SHAPED_ATLAS_SHARD_POLICY_VERSION,
      atlasShardHintId: null,
      atlasShardHintEligible: false,
      atlasShardHintSource: "none",
      atlasShardHintPriority: null,
      atlasShardReasonCodes: ["focus_context_ineligible", ...envelope.ineligibilityReasons],
    };
  }

  const appId = (envelope.snapshot.appId ?? "").toLowerCase();
  const regionId = (envelope.snapshot.regionId ?? "").toLowerCase();
  const controlId = (envelope.snapshot.controlId ?? "").toLowerCase();

  if (BROWSER_CONTROLS.has(controlId)) {
    return buildHint("browser_navigation", "focus_control", 0.97, "browser_control_shard");
  }
  if (BROWSER_REGIONS.has(regionId)) {
    return buildHint("browser_navigation", "focus_region", 0.94, "browser_region_shard");
  }
  if (BROWSER_APPS.has(appId)) {
    return buildHint("browser_navigation", "focus_app", 0.9, "browser_app_shard");
  }

  if (EDITOR_CONTROLS.has(controlId)) {
    return buildHint("editor_symbolic", "focus_control", 0.97, "editor_control_shard");
  }
  if (EDITOR_REGIONS.has(regionId)) {
    return buildHint("editor_symbolic", "focus_region", 0.94, "editor_region_shard");
  }
  if (EDITOR_APPS.has(appId)) {
    return buildHint("editor_symbolic", "focus_app", 0.9, "editor_app_shard");
  }

  if (TERMINAL_CONTROLS.has(controlId)) {
    return buildHint("terminal_session", "focus_control", 0.97, "terminal_control_shard");
  }
  if (TERMINAL_REGIONS.has(regionId)) {
    return buildHint("terminal_session", "focus_region", 0.94, "terminal_region_shard");
  }
  if (TERMINAL_APPS.has(appId)) {
    return buildHint("terminal_session", "focus_app", 0.9, "terminal_app_shard");
  }

  return buildHint("global_default", "global_default", 0.5, "atlas_shard_global_default");
}

export function derivePolicyShapedAtlasShardRankingAdjustment(
  hint: PolicyShapedAtlasShardHint | null | undefined,
  candidate: PolicyShapedAtlasShardRankingCandidate
): PolicyShapedAtlasShardRankingAdjustment {
  if (!hint || !hint.atlasShardHintEligible || !hint.atlasShardHintId) {
    return {
      atlasShardRankingApplied: false,
      atlasShardRankingBoost: 0,
      atlasShardRankingReasonCodes: ["atlas_shard_ranking_not_eligible"],
      atlasShardRankingCandidateKind: null,
    };
  }

  if (hint.atlasShardHintId === "global_default") {
    return {
      atlasShardRankingApplied: false,
      atlasShardRankingBoost: 0,
      atlasShardRankingReasonCodes: ["atlas_shard_global_default_no_adjustment"],
      atlasShardRankingCandidateKind: classifyCandidateKind(candidate),
    };
  }

  const candidateKind = classifyCandidateKind(candidate);
  const reasonCodes: string[] = [];
  let boost = 0;

  if (hint.atlasShardHintId === "browser_navigation") {
    if (candidate.regionId === "new tab") {
      boost = 0.04;
      reasonCodes.push("atlas_shard_browser_new_tab_match");
    } else if (candidateKind === "browser_target") {
      boost = POLICY_SHAPED_ATLAS_SHARD_RANKING_MAX_BOOST;
      reasonCodes.push("atlas_shard_browser_target_match");
    }
  } else if (hint.atlasShardHintId === "editor_symbolic") {
    if (candidate.regionId === "go to line") {
      boost = POLICY_SHAPED_ATLAS_SHARD_RANKING_MAX_BOOST;
      reasonCodes.push("atlas_shard_editor_line_match");
    } else if (candidateKind === "editor_target") {
      boost = 0.04;
      reasonCodes.push("atlas_shard_editor_target_match");
    }
  } else if (hint.atlasShardHintId === "terminal_session") {
    if (candidateKind === "terminal_target") {
      boost = 0.04;
      reasonCodes.push("atlas_shard_terminal_target_match");
    }
  }

  if (boost <= 0) {
    return {
      atlasShardRankingApplied: false,
      atlasShardRankingBoost: 0,
      atlasShardRankingReasonCodes: ["atlas_shard_no_candidate_match"],
      atlasShardRankingCandidateKind: candidateKind,
    };
  }

  return {
    atlasShardRankingApplied: true,
    atlasShardRankingBoost: Math.min(POLICY_SHAPED_ATLAS_SHARD_RANKING_MAX_BOOST, boost),
    atlasShardRankingReasonCodes: reasonCodes,
    atlasShardRankingCandidateKind: candidateKind,
  };
}

function classifyCandidateKind(
  candidate: PolicyShapedAtlasShardRankingCandidate
): string | null {
  const regionId = (candidate.regionId ?? "").toLowerCase();
  const mergedText = (candidate.canonicalMergedText ?? "").toLowerCase();
  const prefix = (candidate.canonicalPrefix ?? "").toLowerCase();
  const combined = `${prefix} ${mergedText}`.trim();

  if (regionId === "new tab") {
    return "browser_target";
  }
  if (regionId === "go to line") {
    return "editor_target";
  }
  if (looksBrowserTarget(combined)) {
    return "browser_target";
  }
  if (looksEditorTarget(combined)) {
    return "editor_target";
  }
  if (looksTerminalTarget(combined)) {
    return "terminal_target";
  }
  return null;
}

function looksBrowserTarget(text: string): boolean {
  return DOMAINISH.test(text) || text.includes(" tab") || text.includes(" browser");
}

function looksEditorTarget(text: string): boolean {
  return (
    CODE_EXTENSIONS.test(text) ||
    text.includes("src/") ||
    text.includes("lib/") ||
    text.includes("::") ||
    text.includes("#") ||
    text.includes("line ")
  );
}

function looksTerminalTarget(text: string): boolean {
  return (
    text.includes("~/.") ||
    text.includes("/usr/") ||
    text.includes("/var/") ||
    text.includes("./") ||
    text.includes("../") ||
    text.includes("shell") ||
    text.includes("prompt")
  );
}

function buildHint(
  atlasShardHintId: PolicyShapedAtlasShardHintId,
  atlasShardHintSource: PolicyShapedAtlasShardHintSource,
  atlasShardHintPriority: number,
  primaryReason: string
): PolicyShapedAtlasShardHint {
  return {
    schemaVersion: POLICY_SHAPED_ATLAS_SHARD_HINT_SCHEMA_VERSION,
    policyVersion: POLICY_SHAPED_ATLAS_SHARD_POLICY_VERSION,
    atlasShardHintId,
    atlasShardHintEligible: true,
    atlasShardHintSource,
    atlasShardHintPriority,
    atlasShardReasonCodes: [primaryReason],
  };
}

export function derivePolicyShapedAtlasShardEvidenceFields(
  hint: PolicyShapedAtlasShardHint | null | undefined
): PolicyShapedAtlasShardEvidenceFields {
  if (!hint) {
    return {
      atlasShardPolicyVersion: null,
      atlasShardHintId: null,
      atlasShardHintEligible: null,
      atlasShardHintSource: null,
      atlasShardHintPriority: null,
      atlasShardReasonCodes: null,
    };
  }

  return {
    atlasShardPolicyVersion: hint.policyVersion,
    atlasShardHintId: hint.atlasShardHintId,
    atlasShardHintEligible: hint.atlasShardHintEligible,
    atlasShardHintSource: hint.atlasShardHintSource,
    atlasShardHintPriority: hint.atlasShardHintPriority,
    atlasShardReasonCodes: [...hint.atlasShardReasonCodes],
  };
}
