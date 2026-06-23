export const FORBIDDEN_SCANNER_TERMS = [
  "buy",
  "sell",
  "hold",
  "strong buy",
  "target price",
  "guaranteed",
  "sure shot",
  "multibagger",
  "best stock to buy",
  "recommendation",
];

export const SAFE_SCANNER_ACTIONS = [
  "Research",
  "Compare",
  "Track",
  "Review",
];

export const SAFE_SCANNER_STATES = [
  "High conviction",
  "Watch",
  "Needs review",
  "Risk rising",
  "Thesis improving",
  "Quality leader",
  "Low debt leader",
  "Momentum improving",
  "Valuation comfort",
];

export const FORBIDDEN_INVESTMENT_ADVICE_PHRASES = [
  "best stock to buy",
  "buy now",
  "strong buy",
  "sell now",
  "hold",
  "target price",
  "guaranteed",
  "sure shot",
  "multibagger",
  "profit guaranteed",
  "recommendation",
  "top pick to buy",
  "invest now",
  "you should invest",
  "personalized recommendation",
];

export function sanitizeScannerLabel(label: string): string {
  if (!label) return "";
  let safe = label;
  for (const term of FORBIDDEN_SCANNER_TERMS) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    safe = safe.replace(regex, "");
  }
  safe = safe.trim();
  for (const state of SAFE_SCANNER_STATES) {
    const lower = state.toLowerCase();
    const idx = safe.toLowerCase().indexOf(lower);
    if (idx !== -1) {
      safe = safe.slice(0, idx) + state + safe.slice(idx + lower.length);
      break;
    }
  }
  return safe || "Review";
}

export function assertNoForbiddenScannerCopy(text: string): void {
  for (const term of FORBIDDEN_SCANNER_TERMS) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(text)) {
      throw new Error(`Forbidden scanner term found: "${term}" in text: "${text.slice(0, 100)}"`);
    }
  }
}

export function assertNoInvestmentAdviceCopy(text: string): void {
  for (const phrase of FORBIDDEN_INVESTMENT_ADVICE_PHRASES) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(text)) {
      throw new Error(`Forbidden investment advice phrase found: "${phrase}" in text: "${text.slice(0, 100)}"`);
    }
  }
}

export function toResearchState(raw: string): string {
  if (!raw) return "Review";
  const lower = raw.toLowerCase().trim();
  if (lower.includes("buy") || lower.includes("strong") || lower.includes("conviction")) {
    return "High conviction";
  }
  if (lower.includes("sell") || lower.includes("risk") || lower.includes("weak")) {
    return "Needs review";
  }
  if (lower.includes("hold") || lower.includes("neutral") || lower.includes("watch")) {
    return "Watch";
  }
  if (lower.includes("momentum") || lower.includes("improving")) {
    return "Thesis improving";
  }
  return "Review";
}
