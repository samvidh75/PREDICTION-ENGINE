import { expect, test } from "@playwright/test";

const authSession = {
  status: "authenticated",
  uid: "browser-user",
  email: "browser@example.com",
  displayName: "Browser User",
  createdAtMs: Date.now(),
};

async function installAuthenticatedSession(page: any) {
  await page.addInitScript((session) => {
    window.localStorage.setItem("ss_auth_session_v1", JSON.stringify(session));
  }, authSession);
}

async function routeStockStory(page: any) {
  await page.route("**/api/market-data/metadata/**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ companyName: "TCS Limited", sector: "IT", industry: "Software", exchange: null, currency: "INR" }),
  }));
  await page.route("**/api/stockstory/TCS**", route => {
    const url = new URL(route.request().url());
    const horizon = Number(url.searchParams.get("horizon") || 30);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stockStoryEnvelope(horizon)),
    });
  });
  await page.route("**/api/company/TCS/ownership", route => route.fulfill({ status: 200, contentType: "application/json", body: "null" }));
  await page.route("**/api/company/TCS/timeline", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/api/predictions/explain/TCS**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      status: "ok",
      data: { symbol: "TCS", horizon: new URL(route.request().url()).searchParams.get("horizon"), summary: "Explanation available" },
      dataState: { availability: "available", asOf: "2026-06-10", lineage: [] },
    }),
  }));
}

function stockStoryEnvelope(horizon: number) {
  return {
    status: "ok",
    dataState: { availability: "available", asOf: "2026-06-10", lineage: [{ sourceTable: "prediction_registry", isFallback: false, isSynthetic: false }] },
    data: {
      symbol: "TCS",
      predictionDate: "2026-06-10",
      predictionHorizon: horizon,
      rankingScore: horizon === 90 ? 91 : 70,
      healthScore: horizon === 90 ? 91 : 70,
      classification: horizon === 90 ? "Excellent" : "Healthy",
      confidence: { level: horizon === 90 ? "Very High" : "High", score: 80, source: "prediction_registry", snapshotDate: "2026-06-10" },
      confidenceLevel: horizon === 90 ? "Very High" : "High",
      confidenceScore: 80,
      narrative: `Browser horizon ${horizon} analysis`,
      factors: {
        growth: { score: 70, source: "prediction_registry", snapshotDate: "2026-06-10" },
        quality: { score: 71, source: "prediction_registry", snapshotDate: "2026-06-10" },
        stability: { score: 72, source: "prediction_registry", snapshotDate: "2026-06-10" },
        value: { score: 73, source: "prediction_registry", snapshotDate: "2026-06-10" },
        momentum: { score: 74, source: "prediction_registry", snapshotDate: "2026-06-10" },
        risk: { score: 30, source: "prediction_registry", snapshotDate: "2026-06-10" },
      },
    },
  };
}

test.describe("public browser journeys", () => {
  test("trust centre handles unavailable metrics without fabricated numbers", async ({ page }) => {
    await page.route("**/api/intelligence/trust-metrics", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "unavailable",
          data: null,
          dataState: {
            availability: "unavailable",
            asOf: null,
            missingInputs: ["prediction_registry"],
            lineage: [],
          },
          asOf: null,
          lineage: [],
          missingInputs: ["prediction_registry"],
          isSynthetic: false,
          isFallback: false,
        }),
      });
    });

    await page.goto("/?page=trust");

    await expect(page.getByRole("heading", { name: "Trust Centre" })).toBeVisible();
    await expect(page.getByText("Data state: unavailable")).toBeVisible();
    await expect(page.getByText("Data unavailable").first()).toBeVisible();
    await expect(page.getByText("106,920")).toHaveCount(0);
    await expect(page.getByText("493,200")).toHaveCount(0);
    await expect(page.getByText(/Every prediction/i)).toHaveCount(0);
  });

  test("public rankings journey can open without backend auth", async ({ page }) => {
    await page.goto("/?page=rankings");

    await expect(page.locator("body")).toContainText(/rankings|stockstory/i);
  });

  test("stock horizon switching changes network request and missing exchange is unavailable", async ({ page }) => {
    await installAuthenticatedSession(page);
    await routeStockStory(page);
    const stockRequests: string[] = [];
    page.on("request", request => {
      if (request.url().includes("/api/stockstory/TCS")) stockRequests.push(request.url());
    });

    await page.goto("/?page=stock&id=TCS&horizon=30");
    await expect(page.getByText("Browser horizon 30 analysis")).toBeVisible();
    await expect(page.getByText("Data unavailable").first()).toBeVisible();
    await page.getByRole("button", { name: "90 days" }).click();
    await expect(page.getByText("Browser horizon 90 analysis")).toBeVisible();
    expect(stockRequests.some(url => url.includes("horizon=30"))).toBeTruthy();
    expect(stockRequests.some(url => url.includes("horizon=90"))).toBeTruthy();
  });

  test("unknown stock renders an honest unavailable state", async ({ page }) => {
    await installAuthenticatedSession(page);
    await page.route("**/api/market-data/metadata/**", route => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
    await page.route("**/api/stockstory/UNKNOWN**", route => route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "STOCKSTORY_NOT_FOUND" }) }));

    await page.goto("/?page=stock&id=UNKNOWN&horizon=30");
    await expect(page.getByText("Company health analysis unavailable")).toBeVisible();
    await expect(page.getByText(/No fallback scores are shown/i)).toBeVisible();
  });

  test("local-only alert centre can mark all alerts read without remote auth", async ({ page }) => {
    await installAuthenticatedSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("stockstory_alerts_v2_browser-user", JSON.stringify([{
        id: "local-alert",
        category: "Risk",
        title: "Local risk alert",
        body: "Local alert remains available without remote sync.",
        timestamp: "2026-06-11T10:00:00.000Z",
        symbol: "TCS",
        isRead: false,
      }]));
    });
    await page.route("**/api/alerts**", route => route.abort());

    await page.goto("/?page=alerts");
    await expect(page.getByText("Local risk alert")).toBeVisible();
    await page.getByText("Mark all as read").click();
    const stored = await page.evaluate(() => window.localStorage.getItem("stockstory_alerts_v2_browser-user"));
    expect(JSON.parse(stored || "[]")[0].isRead).toBe(true);
  });

  test("core authenticated routes load without fatal browser errors", async ({ page }) => {
    await installAuthenticatedSession(page);
    const pageErrors: string[] = [];
    let currentRoute = "initial";
    page.on("pageerror", error => pageErrors.push(`${currentRoute}: ${error.message}`));
    await page.route("**/api/validation/performance", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        hitRate: 0,
        alphaRate: 0,
        bestFactor: "Data unavailable",
        worstFactor: "Data unavailable",
        calibration: 0,
        driftStatus: "healthy",
        perHorizon: {},
        classification: [],
        calibrationCurve: [],
        factorRanking: [],
        drift: { currentPeriod: "Data unavailable", previousPeriod: "Data unavailable", hitRateChange: 0, alphaChange: 0, status: "healthy" },
      }),
    }));
    await page.route("**/api/predictions/journal", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.route("**/api/watchlists", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.route("**/api/intelligence/portfolio**", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "empty", data: null, dataState: { availability: "available" } }),
    }));
    await page.route("**/api/intelligence/discovery/rankings", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ highestQuality: [], highestGrowth: [], highestRisk: [], highestMomentum: [], topImproving: [] }),
    }));
    await page.route("**/api/**", route => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));

    for (const routeName of ["watchlist", "portfolio", "discovery", "academy", "journal", "validation-dashboard"]) {
      currentRoute = routeName;
      await page.goto(`/?page=${routeName}`);
      await expect(page.locator("body")).not.toBeEmpty();
    }
    expect(pageErrors).toEqual([]);
  });
});
