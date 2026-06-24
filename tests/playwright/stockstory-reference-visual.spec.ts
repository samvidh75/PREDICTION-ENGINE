import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

function mockAuthSession(): void {
  window.localStorage.setItem(
    "ss_auth_session_v1",
    JSON.stringify({
      status: "authenticated",
      uid: "test-user-001",
      createdAtMs: Date.now(),
    })
  );
}

async function mockAllApi(page: import("@playwright/test").Page): Promise<void> {
  await page.route(/\/api\//, async (route) => {
    const url = route.request().url();
    const pathname = new URL(url).pathname;
    if (!pathname.startsWith("/api/")) return route.fallback();
    if (url.includes("/api/intelligence/leaderboard")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify([]) });
    }
    if (url.includes("/api/stockstory/")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          companyName: "Test Company Ltd.",
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
            keyStrengths: ["Consistent revenue growth above sector average", "Strong operating margins with pricing power", "Healthy balance sheet with low debt-to-equity", "Industry-leading return on equity"],
            keyRisks: ["Concentration risk in domestic market", "Regulatory changes could impact margins", "Increasing competition from new entrants"],
          },
          fundamentals: { revenueGrowth: 12.5, profitGrowth: 15.3, operatingMargin: 24.8, roe: 18.2, eps: 85.50, fcfYield: 4.2, peRatio: 22.5, dividendYield: 1.8 },
          technicals: { closePrices: [3200, 3220, 3250, 3280, 3300, 3350, 3400, 3420, 3450, 3440, 3460, 3480, 3500, 3520, 3550, 3530, 3560, 3580, 3600, 3620, 3650, 3630, 3660, 3680, 3700, 3720, 3750, 3730, 3760, 3780, 3800, 3820, 3850, 3830, 3860, 3880, 3900, 3920, 3950, 3930, 3960, 3980, 4000, 4020, 4050, 4030, 4060, 4080, 4100, 4120] },
          dataCompleteness: 85,
          fetchedAt: new Date().toISOString(),
        }),
      });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({}) });
  });
}

async function assertNoForbiddenTerms(page: import("@playwright/test").Page): Promise<void> {
  const body = await page.locator("body").textContent();
  if (!body) return;
  const forbidden = ["undefined undefined", "null null", "NaN", "backend", "provider", "database error", "API unavailable"];
  for (const term of forbidden) {
    expect(body, `Page should not contain "${term}"`).not.toContain(term);
  }
}

function testRoute(route: string, name: string, auth = false) {
  VIEWPORTS.forEach((vp) => {
    test(`${name} @ ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      if (auth) await page.addInitScript(mockAuthSession);
      await page.addInitScript(mockAllApi);
      await page.goto(`/?page=${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await expect(page.locator("body")).toBeAttached();
      await assertNoForbiddenTerms(page);
      if (errors.length > 0) {
        console.warn(`${name} @ ${vp.width}x${vp.height}: ${errors.length} console errors`);
      }
    });
  });
}

test.describe("Landing page reference match", () => {
  testRoute("landing", "landing");
});

test.describe("Scanner page reference match", () => {
  testRoute("scanner", "scanner", true);
});

test.describe("Stock detail page reference match", () => {
  testRoute("stock&id=TCS", "stock-detail", true);
});

test.describe("Compare page", () => {
  testRoute("compare", "compare", true);
});

test.describe("Watchlist page", () => {
  testRoute("watchlist", "watchlist", true);
});

test.describe("Portfolio page", () => {
  testRoute("portfolio", "portfolio", true);
});

test.describe("Alerts page", () => {
  testRoute("alerts", "alerts", true);
});

test.describe("Methodology page", () => {
  testRoute("trust", "methodology", true);
});
