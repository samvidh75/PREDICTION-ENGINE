import { describe, it, expect } from "vitest";

const FORBIDDEN_PATTERNS = [
  "provider",
  "API",
  "coverage",
  "freshness",
  "source pending",
  "source verified",
  "lineage",
  "migration",
  "backfill",
  "diagnostics",
  "data operations",
  "quote unavailable",
  "history unavailable",
  "backend",
  "database",
  "ingestion",
  "N/A",
  "Data unavailable",
  "Buy now",
  "Strong Buy",
  "price target",
  "IndianAPI",
  "Yahoo",
  "Jugaad",
  "NSEPython",
  "Upstox",
  "Screener",
  "Finnhub",
  "manual CSV",
  "metadata source",
  "quote freshness",
  "registry-backed",
  "fallback",
  "Infinity",
];

/**
 * Check that a string does not contain forbidden patterns.
 * For use in page-level rendered-content tests.
 */
export function hasForbiddenCopy(text: string): string | null {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern === "N/A") {
      if (/\bN\/A\b/.test(text)) return pattern;
      continue;
    }
    const lower = text.toLowerCase();
    if (lower.includes(pattern.toLowerCase())) return pattern;
  }
  if (/\bNaN\b/.test(text)) return "NaN";
  return null;
}

describe("product copy forbidden patterns", () => {
  const PRODUCT_COPY_VALUES = [
    "Research",
    "Thesis",
    "Conviction",
    "Prediction Engine",
    "Healthometer",
    "Business quality",
    "Financial strength",
    "Valuation context",
    "Risk context",
    "Momentum",
    "Stability",
    "Compare",
    "Track",
    "Review",
    "Invest",
    "What changed",
    "Why it matters",
    "Not enough information for this view yet",
    "Partial research context",
    "Research context is based on available data",
    "Review before investing",
    "Continue with broker",
    "Track instead",
    "Compare first",
    "High conviction",
    "Watch",
    "Needs review",
    "Risk rising",
    "Thesis improving",
    "Avoid for now",
    "Not enough information",
    "Partial research context",
  ];

  it("allowed product copy does not trigger forbidden patterns", () => {
    for (const copy of PRODUCT_COPY_VALUES) {
      const result = hasForbiddenCopy(copy);
      expect(result, `"${copy}" triggered forbidden pattern: ${result}`).toBeNull();
    }
  });

  it("forbidden patterns are detected correctly", () => {
    expect(hasForbiddenCopy("Provider status: active")).not.toBeNull();
    expect(hasForbiddenCopy("API endpoint: /data")).not.toBeNull();
    expect(hasForbiddenCopy("Buy now for best returns")).not.toBeNull();
    expect(hasForbiddenCopy("Strong Buy recommendation")).not.toBeNull();
    expect(hasForbiddenCopy("price target is 500")).not.toBeNull();
    expect(hasForbiddenCopy("N/A")).not.toBeNull();
    expect(hasForbiddenCopy("Data unavailable")).not.toBeNull();
  });
});
