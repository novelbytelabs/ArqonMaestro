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

export const POLICY_SHAPED_ATLAS_SHARD_HINT_SCHEMA_VERSION =
  "h3_policy_shaped_atlas_shard_hint_v1" as const;
export const POLICY_SHAPED_ATLAS_SHARD_POLICY_VERSION =
  "3e2_policy_shaped_atlas_shards_v1" as const;

const BROWSER_APPS = new Set(["chrome", "chromium", "brave", "firefox", "arc"]);
const BROWSER_REGIONS = new Set(["address-bar", "tab-strip", "browser-tab-content"]);
const BROWSER_CONTROLS = new Set(["omnibox", "tab-strip"]);
const EDITOR_APPS = new Set(["code", "vscode", "cursor"]);
const EDITOR_REGIONS = new Set(["editor", "file-tree", "symbol-outline"]);
const EDITOR_CONTROLS = new Set(["editor", "explorer"]);
const TERMINAL_APPS = new Set(["terminal", "gnome-terminal", "alacritty", "kitty", "wezterm"]);
const TERMINAL_REGIONS = new Set(["terminal", "terminal-prompt", "terminal-output"]);
const TERMINAL_CONTROLS = new Set(["prompt", "terminal"]);

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
