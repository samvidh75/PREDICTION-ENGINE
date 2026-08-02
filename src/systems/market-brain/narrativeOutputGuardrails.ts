// src/systems/market-brain/narrativeOutputGuardrails.ts
// Phase 15 — Post-processing guardrails for LLM-generated narrative output.
//
// These guardrails are applied *after* model inference to catch anything
// the model produced that violates our safe-narrative constraints.
// They do NOT replace the deterministic guardrails in safeNarrativeExplainer;
// they are an additional safety layer for model-generated text.

// ── Forbidden terms (same base set as safeNarrativeExplainer, plus
//    model-specific leakage patterns) ───────────────────────────────────

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\b(strong\s+)?buy\b/i,
  /\bsell\b/i,
  /\bhold\s+recommendation\b/i,
  /\bguaranteed\b/i,
  /\bsure\s+shot\b/i,
  /\bmultibagger\b/i,
  /\btarget\s+price\b/i,
  /\bprice\s+target\b/i,
  /\bstop[- ]loss\b/i,
  /\bprovider\b/i,
  /\bapi\b/i,
  /\bbackend\b/i,
  /\bdiagnostics?\b/i,
  /\brag\b/i,
  /\bvector\b/i,
  /\bembedding\b/i,
  /\bchunk\b/i,
  /\badapter_unavailable\b/i,
  /\bempty_response\b/i,
  /\bmalformed_response\b/i,
  /\bsource\s+pending\b/i,
  /\bsource\s+verified\b/i,
  /\bquote\s+unavailable\b/i,
  /\bhistory\s+unavailable\b/i,
];

// ── Public guardrail functions ─────────────────────────────────────────

/**
 * Trim leading/trailing whitespace and normalise internal whitespace.
 */
export const trimOutput = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

/**
 * Cap output at `maxChars` characters, preferring to break at a sentence
 * boundary (., !, ?) near the limit.
 */
export const capLength = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value;

  const truncated = value.slice(0, maxChars);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
  );

  if (lastSentenceEnd > 0) {
    return truncated.slice(0, lastSentenceEnd + 1).trim();
  }

  return truncated.trim();
};

/**
 * Reject output containing any forbidden terms.
 * Returns `true` if the output is clean, `false` if it must be discarded.
 */
export const rejectForbiddenTerms = (value: string): boolean => {
  return !FORBIDDEN_PATTERNS.some((pattern) => pattern.test(value));
};

/**
 * Apply all guardrails in sequence.
 * Returns the sanitised string, or an empty string if the output was rejected.
 */
export const applyGuardrails = (value: string, maxChars: number): string => {
  if (!value || typeof value !== 'string') return '';

  const trimmed = trimOutput(value);
  if (trimmed.length === 0) return '';

  if (!rejectForbiddenTerms(trimmed)) return '';

  return capLength(trimmed, maxChars);
};
