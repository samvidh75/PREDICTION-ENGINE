import { expect, test } from "@playwright/test";

/**
 * Product regression smoke tests for StockStory India.
 *
 * Covers all active public routes, navigation, auth boundary,
 * search, rankings, company page, and API contract safety.
 *
 * All API calls are intercepted to prevent external dependencies.
 * Auth is not required — tests verify both unauthenticated and
 * mock-authenticated states.
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Mock a minimal authenticated session in localStorage. */
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

/** Intercept all /api/ calls and return empty/controlled JSON. */
async function mockAllApi(page: import("@playwright/test").Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    // Return realistic empty-state shapes for known endpoints
    if (url.includes("/api/intelligence/leaderboard")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
    if (url.includes("/api/predictions/signals")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          signals: [],
          snapshotDate: new Date().toISOString().split("T")[0],
          symbolsAnalyzed: 0,
        }),
      });
    }
    if (url.includes("/api/intelligence/trust-metrics")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "partial",
          message: "Trust metrics are partially available.",
          data: {
            alpha: null,
            hit_rate: null,
            sharpe_ratio: null,
            calibration_score: null,
            total_predictions: null,
            total_outcomes: null,
          },
          dataState: {
            asOf: null,
            missingInputs: [
              "audited_outcomes.alpha",
              "prediction_registry.total_predictions",
            ],
          },
        }),
      });
    }
    if (url.includes("/api/stockstory/")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "unavailable",
          code: "PREDICTION_NOT_FOUND",
          message:
            "Symbol is in the universe but has no prediction registry entry.",
          symbol: url.split("/").pop()?.toUpperCase() ?? "",
        }),
      });
    }
    if (url.includes("/api/market-data/metadata/")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          companyName: "Test Company Ltd",
          sector: "Technology",
          industry: "Software",
          exchange: "NSE",
          currency: "INR",
          verificationStatus: "VERIFIED",
          enrichmentSource: "provider",
        }),
      });
    }
    if (url.includes("/api/market-data/market-action")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "unavailable",
          message: "Market action is not available yet.",
          data: {
            gainers: [],
            losers: [],
            volumeLeaders: [],
            sectorMovers: [],
            scannerPresets: [],
          },
          dataState: {
            sourceTables: [],
            rowsAnalyzed: 0,
            rowsWithComparisons: 0,
            missingInputs: ["daily_prices"],
          },
          asOf: null,
        }),
      });
    }
    if (url.includes("/api/company/")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ categories: [], comment: "" }),
      });
    }
    // Default empty JSON for unknown API routes
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

/** Assert the page has no rendering errors like NaN, undefined, or [object Object]. */
async function assertNoRenderGarbage(page: import("@playwright/test").Page): Promise<void> {
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("NaN");
  expect(bodyText).not.toContain("undefined");
  expect(bodyText).not.toContain("[object Object]");
  expect(bodyText).not.toContain("Infinity");
}

// ── Public Route Smoke ───────────────────────────────────────────────

test.describe("Public route smoke", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
  });

  test("landing page renders without blank screen", async ({ page }) => {
    await page.goto("/?page=landing");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { name: /research indian stocks/i })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("about page renders", async ({ page }) => {
    await page.goto("/?page=about");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { name: /research/i })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/?page=login");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("section").getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("signup page renders", async ({ page }) => {
    await page.goto("/?page=signup");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText("Create your account", { exact: true })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("methodology page renders", async ({ page }) => {
    await page.goto("/?page=methodology");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/methodology/i)).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("rankings page renders", async ({ page }) => {
    await page.goto("/?page=rankings");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/rankings/i)).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("predictions page renders", async ({ page }) => {
    await page.goto("/?page=predictions");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });
});

// ── Navigation Smoke ─────────────────────────────────────────────────

test.describe("Public navigation", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
  });

  test("landing page has working CTA to signup", async ({ page }) => {
    await page.goto("/?page=landing");
    await page.getByRole("button", { name: /create.*account/i }).first().click();
    await expect(page).toHaveURL(/page=signup/);
  });

  test("landing page has working CTA to methodology", async ({ page }) => {
    await page.goto("/?page=landing");
    await page.getByRole("button", { name: /methodology/i }).first().click();
    await expect(page).toHaveURL(/page=methodology/);
  });
});

// ── Auth Boundary Smoke ──────────────────────────────────────────────

test.describe("Auth boundary", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
  });

  test("unauthenticated access to dashboard redirects to login", async ({
    page,
  }) => {
    await page.goto("/?page=dashboard");
    // Should redirect to login since no auth session
    await expect(page).toHaveURL(/page=login/);
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("authenticated access to dashboard renders", async ({ page }) => {
    await page.addInitScript(mockAuthSession);
    await page.goto("/?page=dashboard");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("unauthenticated access to search redirects to login", async ({
    page,
  }) => {
    await page.goto("/?page=search");
    await expect(page).toHaveURL(/page=login/);
  });

  test("authenticated access to search renders", async ({ page }) => {
    await page.addInitScript(mockAuthSession);
    await page.goto("/?page=search");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("unauthenticated access to watchlist redirects to login", async ({
    page,
  }) => {
    await page.goto("/?page=watchlist");
    await expect(page).toHaveURL(/page=login/);
  });

  test("unauthenticated access to portfolio redirects to login", async ({
    page,
  }) => {
    await page.goto("/?page=portfolio");
    await expect(page).toHaveURL(/page=login/);
  });

  test("unauthenticated access to settings redirects to login", async ({
    page,
  }) => {
    await page.goto("/?page=settings");
    await expect(page).toHaveURL(/page=login/);
  });
});

// ── Search Route Smoke ───────────────────────────────────────────────

test.describe("Search route", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(mockAuthSession);
    await mockAllApi(page);
  });

  test("search page renders with input", async ({ page }) => {
    await page.goto("/?page=search");
    await expect(page.locator("body")).toBeVisible();
    const input = page.getByPlaceholder(/reliance|tcs|infy/i);
    await expect(input).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("search for RELIANCE returns results", async ({ page }) => {
    await page.goto("/?page=search");
    const input = page.getByPlaceholder(/reliance|tcs|infy/i);
    await input.fill("RELIANCE");
    // Small wait for local registry search to debounce
    await page.waitForTimeout(300);
    const results = page.locator("text=RELIANCE");
    // Should find RELIANCE in the local stock registry
    await expect(results.first()).toBeVisible();
    await assertNoRenderGarbage(page);
  });
});

// ── Company Page Smoke ───────────────────────────────────────────────

test.describe("Company page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(mockAuthSession);
    await mockAllApi(page);
  });

  test("company page renders for RELIANCE without garbage", async ({
    page,
  }) => {
    await page.goto("/?page=stock&id=RELIANCE");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("company page renders for TCS without garbage", async ({ page }) => {
    await page.goto("/?page=stock&id=TCS");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("company page renders for INFY without garbage", async ({ page }) => {
    await page.goto("/?page=stock&id=INFY");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("company page shows unavailable prediction state for unknown stock", async ({
    page,
  }) => {
    await page.goto("/?page=stock&id=UNKNOWNTEST");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
    // Should show prediction unavailable message
    await expect(
      page.getByText(/prediction unavailable/i)
    ).toBeVisible();
  });
});

// ── Rankings Smoke ───────────────────────────────────────────────────

test.describe("Rankings page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
  });

  test("rankings page renders table structure", async ({ page }) => {
    await page.goto("/?page=rankings");
    await expect(page.locator("body")).toBeVisible();
    // Should have table headers or empty state
    await expect(
      page.getByText(/no ranking|rank|score/i).first()
    ).toBeVisible();
    await assertNoRenderGarbage(page);
  });
});

// ── Authenticated Shell Smoke ──────────────────────────────────────────

test.describe("Authenticated shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(mockAuthSession);
    await mockAllApi(page);
  });

  test("dashboard renders with sidebar", async ({ page }) => {
    await page.goto("/?page=dashboard");
    await expect(page.locator("body")).toBeVisible();
    // Sidebar should be on desktop
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText(/dashboard/i)).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("sidebar navigation works — navigate to methodology", async ({
    page,
  }) => {
    await page.goto("/?page=dashboard");
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: /methodology/i }).click();
    await expect(page).toHaveURL(/page=methodology/);
  });

  test("sidebar navigation works — navigate to settings", async ({
    page,
  }) => {
    await page.goto("/?page=dashboard");
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: /settings/i }).click();
    await expect(page).toHaveURL(/page=settings/);
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("settings page renders with tabs", async ({ page }) => {
    await page.goto("/?page=settings");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("button", { name: "Profile", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("watchlist page renders", async ({ page }) => {
    await page.goto("/?page=watchlist");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });
});

// ── Route Fallback ────────────────────────────────────────────────────

test.describe("Route fallback", () => {
  test("unknown public route falls to landing", async ({ page }) => {
    await mockAllApi(page);
    await page.goto("/?page=some-non-existent-route");
    await expect(page.locator("body")).toBeVisible();
    // Should show landing page
    await expect(page.getByRole("heading", { name: /research indian stocks/i })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("unknown authenticated route falls to dashboard", async ({ page }) => {
    await page.addInitScript(mockAuthSession);
    await mockAllApi(page);
    await page.goto("/?page=some-old-route");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });
});

// ── Regression Search ─────────────────────────────────────────────────

test("no ss:open-search event leakage in rendered output", async ({
  page,
}) => {
  await page.addInitScript(mockAuthSession);
  await mockAllApi(page);
  await page.goto("/?page=dashboard");
  const body = page.locator("body");
  const text = await body.innerText();
  // ss:open-search is a custom event name, should never appear in visible DOM
  expect(text).not.toContain("ss:open-search");
});

test("no href='#' in visible anchor elements", async ({ page }) => {
  await mockAllApi(page);
  await page.goto("/?page=landing");
  const anchors = page.locator('a[href="#"]');
  await expect(anchors).toHaveCount(0);
});
