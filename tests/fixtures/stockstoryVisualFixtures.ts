/* Test-only visual fixture data for Playwright screenshot/interactive tests.
   Not used in production. Never imported from product runtime code. */

import { expect, type Page } from "@playwright/test";

export const STOCK_FIXTURE = {
  companyName: "Test Company Ltd. (Test Fixture)",
  sector: "Information Technology",
  price: { current: 3450.50, change: 1.25, changeAbs: 42.50, marketCap: 1250000000000, weekLow52: 2800, weekHigh52: 3800, exchange: "NSE" },
  prediction: {
    rankingScore: 78,
    factorScores: [
      { group: "quality", value: 82 }, { group: "growth", value: 75 },
      { group: "valuation", value: 65 }, { group: "risk", value: 70 },
      { group: "momentum", value: 80 },
    ],
    explanation: "Strong financial quality with consistent earnings growth and manageable debt levels.",
    keyStrengths: ["Consistent revenue growth above sector average", "Strong operating margins with pricing power"],
    keyRisks: ["Concentration risk in domestic market", "Regulatory changes could impact margins"],
  },
  fundamentals: { revenueGrowth: 12.5, profitGrowth: 15.3, operatingMargin: 24.8, roe: 18.2, eps: 85.50, fcfYield: 4.2, peRatio: 22.5, dividendYield: 1.8 },
  technicals: { closePrices: [3200, 3250, 3300, 3350, 3400, 3450, 3500, 3550, 3600, 3650] },
  dataCompleteness: 85,
  fetchedAt: new Date().toISOString(),
};

export function mockAuthSession(): void {
  window.localStorage.setItem("ss_auth_session_v1", JSON.stringify({
    status: "authenticated", uid: "playwright-test-user", createdAtMs: Date.now(),
  }));
}

export async function mockAllApi(page: Page): Promise<void> {
  await page.route(/\/api\//, async (route) => {
    const url = route.request().url();
    const pathname = new URL(url).pathname;
    if (!pathname.startsWith("/api/")) return route.fallback();
    if (url.includes("/api/stockstory/")) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(STOCK_FIXTURE) });
      return;
    }
    if (url.includes("/api/intelligence/leaderboard")) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify([]) });
      return;
    }
    if (url.includes("/api/intelligence/trust-metrics")) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "partial", data: {} }) });
      return;
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({}) });
  });
}

const FORBIDDEN_TERMS = ["undefined undefined", "null null", "NaN", "backend", "provider", "database error", "API unavailable", "IndianAPI", "Yahoo", "Jugaad", "NSEPython", "Upstox", "Screener", "Finnhub", "coverage", "freshness", "lineage", "migration", "backfill", "diagnostics", "symbol gaps", "production verification"];

export async function assertNoForbiddenTerms(page: Page): Promise<void> {
  const text = await page.locator("body").textContent();
  if (!text) return;
  for (const term of FORBIDDEN_TERMS) {
    expect(text).not.toContain(term);
  }
}
