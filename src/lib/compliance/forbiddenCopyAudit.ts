/**
 * Forbidden copy audit utilities for product-facing text.
 *
 * Each function returns null when the text passes the check, or a non-null
 * string (the matched phrase) when the text violates the rule.
 */

/* ─── Backend provider names ─── */
const BACKEND_PROVIDER_NAMES = [
  "indianapi",
  "yahoo",
  "jugaad",
  "nsepython",
  "upstox",
  "screener",
  "finnhub",
];

/* ─── Backend / operations vocabulary ─── */
const BACKEND_VOCABULARY = [
  "provider health",
  "provider status",
  "data coverage",
  "freshness check",
  "freshness",
  "source lineage",
  "lineage trace",
  "diagnostics panel",
  "data operations",
  "backend offline",
  "quote availability",
];

/* ─── Forbidden trading / hype language ─── */
const FORBIDDEN_TRADING_LANGUAGE = [
  "buy now",
  "sure shot",
  "multibagger",
  "guaranteed returns",
  "best stock",
  "strong buy",
  "ai picks",
  "top picks",
];

/* ─── Forbidden empty-state wording ─── */
const FORBIDDEN_EMPTY_STATE = [
  "data unavailable",
  "quote unavailable",
  "history unavailable",
  "api unavailable",
  "backend error",
  "provider unavailable",
  "insufficient information",
  "production verification",
  "symbol gaps",
  "quote freshness",
  "diagnostics failed",
  "coverage incomplete",
  "source unavailable",
];

/* ─── Forbidden social proof ─── */
const FORBIDDEN_SOCIAL_PROOF = [
  "trusted by thousands",
  "trusted by millions",
  "number one platform",
  "award-winning",
  "broker partner",
  "verified by sebi",
  "official recommendation",
  "real user testimonial",
];

/* ─── Helpers ─── */

/** Check if `text` contains any of the given phrases (case-insensitive). */
function includesAny(text: string, phrases: string[]): string | null {
  const lower = text.toLowerCase();
  for (const phrase of phrases) {
    if (lower.includes(phrase)) return phrase;
  }
  return null;
}

/** Check if `text` mentions any known backend provider name. */
function includesProviderName(text: string): string | null {
  return includesAny(text, BACKEND_PROVIDER_NAMES);
}

/* ─── Exported audit functions ─── */

/**
 * Returns the matched phrase if `text` contains backend / ops vocabulary,
 * or null if the text is clean.
 */
export function hasBackendVocabulary(text: string): string | null {
  return includesProviderName(text) ?? includesAny(text, BACKEND_VOCABULARY);
}

/**
 * Returns the matched phrase if `text` contains any product-forbidden term
 * (backend vocabulary, trading language, or empty-state wording), or null if
 * the text is clean.
 */
export function hasProductForbiddenTerms(text: string): string | null {
  return (
    hasBackendVocabulary(text) ??
    includesAny(text, FORBIDDEN_TRADING_LANGUAGE) ??
    includesAny(text, FORBIDDEN_EMPTY_STATE)
  );
}

/**
 * Returns the matched phrase if `text` contains standalone buy/sell/hold
 * trading language or explicit hype phrases, or null if clean.
 */
export function hasForbiddenTradingLanguage(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(buy|sell|hold)\b/i.test(lower)) {
    // Exclude known non-advice contexts
    if (
      !lower.includes("final order with broker") &&
      !lower.includes("before you invest")
    ) {
      return "buy/sell/hold";
    }
  }
  return includesAny(text, FORBIDDEN_TRADING_LANGUAGE);
}

/**
 * Returns the matched phrase if `text` contains render garbage
 * ("undefined", "null", "NaN"), or null if clean.
 */
export function hasRenderGarbage(text: string): string | null {
  if (text.includes("undefined")) return "undefined";
  if (text.includes("null")) return "null";
  if (text.includes("NaN")) return "NaN";
  return null;
}

/**
 * Returns the matched phrase if `text` contains a backend provider name,
 * or null if clean.
 */
export function hasBackendProviderNames(text: string): string | null {
  return includesProviderName(text);
}

/**
 * Returns the matched phrase if `text` contains forbidden social proof
 * language, or null if clean.
 */
export function hasForbiddenSocialProof(text: string): string | null {
  return includesAny(text, FORBIDDEN_SOCIAL_PROOF);
}
