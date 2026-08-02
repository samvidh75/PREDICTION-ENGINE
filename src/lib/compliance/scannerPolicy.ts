/**
 * Scanner compliance policy.
 * Ensures all scanner-related copy avoids prohibited investment advice.
 *
 * FORBIDDEN_SCANNER_TERMS — terms that cannot appear in scanner labels/descriptions.
 * These are regulated/prohibited forms of investment advice.
 */
export const FORBIDDEN_SCANNER_TERMS: string[] = [
  "buy",
  "sell",
  "hold",
  "strong buy",
  "target price",
  "recommendation",
];

/**
 * SAFE_SCANNER_ACTIONS — compliance-safe actions users can take from the scanner.
 */
export const SAFE_SCANNER_ACTIONS: string[] = [
  "Research",
  "Compare",
  "Track",
  "Review",
];

/**
 * SAFE_SCANNER_STATES — compliance-safe states displayed in UI.
 */
export const SAFE_SCANNER_STATES: string[] = [
  "High conviction",
  "Watch",
  "Needs review",
  "Risk rising",
];

/** Map of forbidden investment terms → safe research state. */
const ADVICE_TO_RESEARCH_MAP: Record<string, string> = {
  "strong buy": "High conviction",
  "buy": "High conviction",
  "outperform": "High conviction",
  "overweight": "High conviction",
  "sell": "Needs review",
  "underperform": "Needs review",
  "underweight": "Needs review",
  "reduce": "Needs review",
  "hold": "Watch",
  "neutral": "Watch",
  "market perform": "Watch",
  "equal weight": "Watch",
};

const FORBIDDEN_RE = new RegExp(
  `\\b(${FORBIDDEN_SCANNER_TERMS.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|")})\\b`,
  "gi",
);

/**
 * Remove or replace forbidden investment advice terms from a label.
 * Returns the sanitised label with forbidden terms stripped out.
 */
export function sanitizeScannerLabel(label: string): string {
  return label.replace(FORBIDDEN_RE, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Throw if the given text contains forbidden scanner copy.
 */
export function assertNoForbiddenScannerCopy(text: string): void {
  const match = text.match(FORBIDDEN_RE);
  if (match) {
    throw new Error(
      `Forbidden scanner copy detected: "${match[0]}" in "${text}"`,
    );
  }
}

/**
 * Map a conventional investment advice term to a compliance-safe research state.
 * Returns the input state unchanged if it is already a safe state.
 * Falls back to "Review" for unknown input.
 */
export function toResearchState(state: string): string {
  const trimmed = state.trim();
  if (!trimmed) return "Review";
  // Already a safe state
  if (SAFE_SCANNER_STATES.includes(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  // Walk the map so longer patterns (e.g. "strong buy") match before shorter ones ("buy")
  for (const [term, mapped] of Object.entries(ADVICE_TO_RESEARCH_MAP)) {
    if (lower.includes(term)) return mapped;
  }
  return "Review";
}
