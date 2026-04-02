export type OpenTargetKind = "domain" | "text" | "unknown";
export type OpenTailNormalizationStatus = "ok" | "empty" | "invalid" | "partial";

export interface OpenTailNormalizationResult {
  status: OpenTailNormalizationStatus;
  normalized: string | null;
  confidence: number;
  targetKind: OpenTargetKind;
  reason: string;
}

export interface OpenTailNormalizationOptions {
  commandPrefix?: "go to" | "open";
}

const FILLER_ONLY = new Set(["uh", "um", "er", "ah"]);
const CONNECTOR_ONLY = new Set(["and", "or", "then"]);
const KNOWN_TLDS = new Set([
  "com",
  "org",
  "net",
  "io",
  "dev",
  "ai",
  "edu",
  "gov",
  "uk",
  "co",
]);

function cleanText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\w.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function allInSet(values: string[], s: Set<string>): boolean {
  return values.length > 0 && values.every((v) => s.has(v));
}

function isLikelyDomainFromTokens(parts: string[]): boolean {
  if (parts.length < 2) {
    return false;
  }
  const last = parts[parts.length - 1];
  if (KNOWN_TLDS.has(last)) {
    return true;
  }
  return /^[a-z]{2,}$/.test(last);
}

function normalizeDomainLike(text: string): OpenTailNormalizationResult {
  const toks = tokens(text);
  const hasDotToken = toks.includes("dot");
  const hasDotChar = text.includes(".");
  const isClearlyDomainLike = hasDotToken || hasDotChar;
  if (!isClearlyDomainLike) {
    return {
      status: "partial",
      normalized: null,
      confidence: 0.0,
      targetKind: "unknown",
      reason: "open_tail_not_clearly_domain_like",
    };
  }

  const collapsed = text
    .replace(/\s+dot\s+/g, ".")
    .replace(/\s*\.\s*/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "");
  const labels = collapsed.split(".").filter(Boolean);
  if (!isLikelyDomainFromTokens(labels)) {
    return {
      status: "invalid",
      normalized: null,
      confidence: 0.0,
      targetKind: "domain",
      reason: "open_tail_domain_pattern_invalid",
    };
  }
  if (labels.some((l) => !/^[a-z0-9-]+$/.test(l))) {
    return {
      status: "invalid",
      normalized: null,
      confidence: 0.0,
      targetKind: "domain",
      reason: "open_tail_domain_label_invalid",
    };
  }
  return {
    status: "ok",
    normalized: labels.join("."),
    confidence: 0.93,
    targetKind: "domain",
    reason: "open_tail_domain_ok",
  };
}

function isOpenAppLikeAmbiguous(text: string): boolean {
  return text === "stack over" || text === "set things";
}

function normalizeTextLike(
  text: string,
  options: OpenTailNormalizationOptions
): OpenTailNormalizationResult {
  const toks = tokens(text);
  if (toks.length === 0) {
    return {
      status: "empty",
      normalized: null,
      confidence: 0.0,
      targetKind: "unknown",
      reason: "open_tail_empty",
    };
  }
  if (allInSet(toks, FILLER_ONLY)) {
    return {
      status: "invalid",
      normalized: null,
      confidence: 0.0,
      targetKind: "unknown",
      reason: "open_tail_filler_only",
    };
  }
  if (allInSet(toks, CONNECTOR_ONLY)) {
    return {
      status: "invalid",
      normalized: null,
      confidence: 0.0,
      targetKind: "unknown",
      reason: "open_tail_connector_only",
    };
  }
  if (toks.includes("maybe")) {
    return {
      status: "invalid",
      normalized: null,
      confidence: 0.0,
      targetKind: "unknown",
      reason: "open_tail_ambiguous_target",
    };
  }
  if (options.commandPrefix === "open" && isOpenAppLikeAmbiguous(toks.join(" "))) {
    return {
      status: "partial",
      normalized: null,
      confidence: 0.42,
      targetKind: "text",
      reason: "open_tail_app_like_ambiguous_partial",
    };
  }
  return {
    status: "ok",
    normalized: toks.join(" "),
    confidence: 0.78,
    targetKind: "text",
    reason: "open_tail_text_ok",
  };
}

export function normalizeOpenTail(
  rawTail: string,
  options: OpenTailNormalizationOptions = {}
): OpenTailNormalizationResult {
  const cleaned = cleanText(rawTail);
  if (!cleaned) {
    return {
      status: "empty",
      normalized: null,
      confidence: 0.0,
      targetKind: "unknown",
      reason: "open_tail_empty",
    };
  }

  const domainAttempt = normalizeDomainLike(cleaned);
  if (domainAttempt.status === "ok") {
    return domainAttempt;
  }
  const cleanedTokens = tokens(cleaned);
  if (cleanedTokens.includes("dot") || cleaned.includes(".")) {
    return domainAttempt;
  }
  return normalizeTextLike(cleaned, options);
}
