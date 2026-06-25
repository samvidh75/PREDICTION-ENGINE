import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const normalRouteFiles = [
  "src/pages/ComparePage.tsx",
  "src/pages/WatchlistPage.tsx",
  "src/pages/PortfolioPage.tsx",
  "src/pages/AlertsPage.tsx",
  "src/pages/TrustCentrePage.tsx",
  "src/components/layout/AppShell.tsx",
];

const forbiddenRenderedPhrases = [
  "IndianAPI",
  "Yahoo",
  "Jugaad",
  "NSEPython",
  "Upstox",
  "Screener",
  "Finnhub",
  "provider health",
  "source pending",
  "source verified",
  "data operations",
  "quote unavailable",
  "history unavailable",
  "API unavailable",
  "symbol gaps",
  "production verification",
  "sure shot",
  "guaranteed",
  "multibagger",
  "Buy now",
];

describe("Part AW product-facing copy guardrails", () => {
  for (const file of normalRouteFiles) {
    it(`${file} excludes backend plumbing and prohibited claims`, () => {
      const source = readFileSync(file, "utf8");
      for (const phrase of forbiddenRenderedPhrases)
        expect(source).not.toContain(phrase);
    });
  }
});
