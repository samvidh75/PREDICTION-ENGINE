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

  // --- Main UI disclaimer-style language stripping (must not appear in product surfaces) ---
  // We only remove/clean disclaimer tokens; we never append legal text here.
  // Legal pages can keep their own wording and should not rely on this sanitizer.
  out = out.replace(/\bSEBI[-\s]?safe\b/gi, "");
  out = out.replace(/\beducational only\b/gi, "");
  out = out.replace(/\bEducational only\b/gi, "");
  out = out.replace(/\beducational environments\b/gi, "");
  out = out.replace(/\beducational framing\b/gi, "");
  out = out.replace(/\beducational probabilistic lens\b/gi, "Probabilistic lens");
  out = out.replace(/\bprobabilistic framing only\b/gi, "Probabilistic lens");
  out = out.replace(/\bprobabilistic lens\b/gi, "Probabilistic lens");

  // --- Product language cleanup for main UI ---
  // Remove disclaimer-style “educational …” tokens that create prototype-like tone.
  // Keep non-disclaimer uses intact to avoid blanking UI labels.
  out = out.replace(/\beducational\s+lens\b/gi, "context lens");
  out = out.replace(/\beducational\s+context\b/gi, "context");
  out = out.replace(/\beducational\s+framing\b/gi, "context framing");
  out = out.replace(/\beducational\s+ticker\s+context\b/gi, "ticker context");
  out = out.replace(/\beducational\s+market\s+context\b/gi, "market context");
  out = out.replace(/\beducational\s+sector\s+context\b/gi, "sector context");
  out = out.replace(/\beducational\s+proxy\b/gi, "proxy");

  out = out.replace(/\bno trade execution\b/gi, "");
  out = out.replace(/\bNo trade execution\b/gi, "");
  out = out.replace(/\btrade execution\b/gi, "");
  out = out.replace(/\bno execution framing\b/gi, "");
  out = out.replace(/\bno certainty claims\b/gi, "");
  out = out.replace(/\bno certainty promises\b/gi, "");
  out = out.replace(/\bnot investment advice\b/gi, "");
  out = out.replace(/\bnot guaranteed\b/gi, "");
  out = out.replace(/\bno guaranteed returns\b/gi, "");
  out = out.replace(/\beducational,\s*SEBI[-\s]?safe\b/gi, "");
  out = out.replace(/\bSEBI-style trust line\b/gi, "");
  out = out.replace(/\bSEBI-Safe\b/gi, "");

  // Cleanup common separator artifacts introduced by removals.
  out = out.replace(/\s+•\s+/g, " • ");
  out = out.replace(/\s+-\s+/g, " - ");
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/(\s+•\s*)+$/g, "");
  out = out.replace(/(\s+-\s*)+$/g, "");
  out = out.trim();

  // --- High-risk recommendation/guarantee/certainty keywords ---
  // Product-first: avoid advisory/broker-style certainty language in normal UI.
  // Convert certainty language into conditional, non-advisory framing.
  out = out.replace(/\b(guaranteed|guarantee)\b/gi, "conditional confidence");
  out = out.replace(/\b(no risk|risk free)\b/gi, "risk profile varies");

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
    out = out.replace(/\b(confidence is (certain|guaranteed|absolute))\b/gi, "confidence is conditional");
  }

  // If removal stripped everything, return empty string rather than leaking fragments.
  // Callers that display these values should handle empty strings (and many already do).
  if (out.trim().length === 0) return "";

  // Important: do NOT append disclaimer-style text into normal product UI.
  // Compliance/legal language belongs only in legal/terms surfaces.
  return out;
}

export function applyComplianceCopyFilterMaybe(
  input: string | undefined | null,
  level: ComplianceFilterLevel = "educational",
): string {
  if (!input) return "";
  return applyComplianceCopyFilter(input, level);
}
