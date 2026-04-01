export type NumericNormalizationStatus = "ok" | "empty" | "invalid" | "partial";

export interface NumericTailNormalizationResult {
  status: NumericNormalizationStatus;
  normalized: string | null;
  confidence: number;
  reason: string;
}

const UNIT_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const TEEN_WORDS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS_WORDS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const CONNECTOR_WORDS = new Set(["and"]);
const KNOWN_WORDS = new Set([
  ...Object.keys(UNIT_WORDS),
  ...Object.keys(TEEN_WORDS),
  ...Object.keys(TENS_WORDS),
  "hundred",
  "thousand",
  ...Array.from(CONNECTOR_WORDS),
]);

function isPartialToken(token: string): boolean {
  if (!token || KNOWN_WORDS.has(token)) {
    return false;
  }
  for (const known of KNOWN_WORDS) {
    if (known.startsWith(token)) {
      return true;
    }
  }
  return false;
}

function parseWordNumber(tokens: string[]): NumericTailNormalizationResult {
  let total = 0;
  let current = 0;
  let sawNumeric = false;
  let sawConnector = false;

  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (CONNECTOR_WORDS.has(tok)) {
      sawConnector = true;
      const next = tokens[i + 1];
      if (!next || CONNECTOR_WORDS.has(next)) {
        return {
          status: "partial",
          normalized: null,
          confidence: 0.0,
          reason: "numeric_tail_connector_incomplete",
        };
      }
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(UNIT_WORDS, tok)) {
      sawNumeric = true;
      current += UNIT_WORDS[tok];
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(TEEN_WORDS, tok)) {
      sawNumeric = true;
      current += TEEN_WORDS[tok];
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(TENS_WORDS, tok)) {
      sawNumeric = true;
      current += TENS_WORDS[tok];
      continue;
    }
    if (tok === "hundred") {
      if (current <= 0) {
        return {
          status: "partial",
          normalized: null,
          confidence: 0.0,
          reason: "numeric_tail_hundred_without_prefix",
        };
      }
      sawNumeric = true;
      current *= 100;
      continue;
    }
    if (tok === "thousand") {
      if (current <= 0) {
        return {
          status: "partial",
          normalized: null,
          confidence: 0.0,
          reason: "numeric_tail_thousand_without_prefix",
        };
      }
      sawNumeric = true;
      total += current * 1000;
      current = 0;
      continue;
    }

    return {
      status: isPartialToken(tok) ? "partial" : "invalid",
      normalized: null,
      confidence: 0.0,
      reason: isPartialToken(tok) ? "numeric_tail_partial_token" : "numeric_tail_invalid_token",
    };
  }

  if (!sawNumeric) {
    return {
      status: "invalid",
      normalized: null,
      confidence: 0.0,
      reason: "numeric_tail_no_numeric_tokens",
    };
  }

  const value = total + current;
  if (!Number.isFinite(value) || value <= 0) {
    return {
      status: "invalid",
      normalized: null,
      confidence: 0.0,
      reason: "numeric_tail_must_be_positive_integer",
    };
  }

  return {
    status: "ok",
    normalized: String(Math.trunc(value)),
    confidence: sawConnector ? 0.86 : 0.94,
    reason: "numeric_tail_word_parse_ok",
  };
}

export function normalizeNumericTail(rawTail: string): NumericTailNormalizationResult {
  const raw = rawTail.trim().toLowerCase();
  if (!raw) {
    return {
      status: "empty",
      normalized: null,
      confidence: 0.0,
      reason: "numeric_tail_empty",
    };
  }

  if (raw.includes("-") || raw.includes("minus") || raw.includes("negative")) {
    return {
      status: "invalid",
      normalized: null,
      confidence: 0.0,
      reason: "numeric_tail_negative_not_allowed",
    };
  }

  if (/^\d+$/.test(raw)) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return {
        status: "invalid",
        normalized: null,
        confidence: 0.0,
        reason: "numeric_tail_must_be_positive_integer",
      };
    }
    return {
      status: "ok",
      normalized: String(Math.trunc(parsed)),
      confidence: 0.99,
      reason: "numeric_tail_digit_parse_ok",
    };
  }

  const cleaned = raw.replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return {
      status: "invalid",
      normalized: null,
      confidence: 0.0,
      reason: "numeric_tail_invalid_content",
    };
  }
  const tokens = cleaned.split(/[\s-]+/).filter(Boolean);
  return parseWordNumber(tokens);
}
