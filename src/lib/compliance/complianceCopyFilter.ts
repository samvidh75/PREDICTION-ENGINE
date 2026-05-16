export type ComplianceFilterLevel = "educational" | "strict";

/**
 * Central compliance copy filter.
 * Goal: prevent advisory/broker-style language and certainty framing from reaching the UI.
 *
 * Notes:
 * - This is intentionally conservative: it only rewrites a small set of high-risk phrases.
 * - If the copy already contains compliant disclaimers, we avoid duplicating them.
 */
export function applyComplianceCopyFilter(
  input: string,
  level: ComplianceFilterLevel = "educational",
): string {
  if (!input) return input;

  let out = input;

  // --- High-risk recommendation/guarantee/certainty keywords ---
  out = out.replace(/\b(guaranteed|guarantee)\b/gi, "conditional (not guaranteed)");
  out = out.replace(/\b(no risk|risk free)\b/gi, "not risk-free");

  out = out.replace(/\b(recommendation|recommend)\b/gi, "analytical framing");
  out = out.replace(/\b(must buy)\b/gi, "may be worth monitoring");
  out = out.replace(/\b(must sell)\b/gi, "may be worth reassessing");

  // Target language (target price / price target)
  out = out.replace(/\b(price target|target price)\b/gi, "contextual benchmark");

  // Common certainty verbs
  out = out.replace(/\bwill rise\b/gi, "may rise");
  out = out.replace(/\bwill fall\b/gi, "may fall");
  out = out.replace(/\bwill increase\b/gi, "may increase");
  out = out.replace(/\bwill decrease\b/gi, "may decrease");

  // Advisory verbs (keep narrow: whole-word "buy"/"sell" to reduce false positives)
  out = out.replace(/\b(buy)\b/gi, "learn");
  out = out.replace(/\b(sell)\b/gi, "review");

  // --- Optional strict mode enforcement ---
  if (level === "strict") {
    // If copy tries to imply certainty, downgrade it.
    out = out.replace(/\b(confidence is (certain|guaranteed|absolute))\b/gi, "confidence is conditional (educational)");
  }

  // --- Always ensure educational disclaimer exists (without duplicating) ---
  const hasKnownDisclaimer =
    /\b(no trade execution|educational only|no investment advice|not investment advice|probabilistic|not guaranteed|no certainty)\b/i.test(out) ||
    /\b(SEBI-safe|SEBI safe)\b/i.test(out);

  if (!hasKnownDisclaimer) {
    const disclaimer =
      "Educational analysis only • no trade execution • no investment advice • probabilistic framing (not guarantees).";
    out = `${out.trim()} ${disclaimer}`;
  }

  return out;
}

export function applyComplianceCopyFilterMaybe(
  input: string | undefined | null,
  level: ComplianceFilterLevel = "educational",
): string {
  if (!input) return "";
  return applyComplianceCopyFilter(input, level);
}
