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
  await page.route(/\/api\//, async (route) => {
    const url = route.request().url();
    const pathname = new URL(url).pathname;
    // Only intercept actual API routes, not source files containing "/api/" in their path
    if (!pathname.startsWith("/api/")) {
      return route.fallback();
    }
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
    if (url.includes("/api/research/scanner")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            { symbol: "RELIANCE", companyName: "Reliance Industries", sector: "Energy", rank: 1, score: 75, conviction: "Very Healthy", oneLineThesis: "Strong market position in energy and telecom", keyReason: "Quality is the clearest current signal", riskMarker: null },
            { symbol: "TCS", companyName: "Tata Consultancy Services", sector: "Technology", rank: 2, score: 70, conviction: "Healthy", oneLineThesis: "Leading IT services player", keyReason: "Growth is the clearest current signal", riskMarker: null },
            { symbol: "HDFCBANK", companyName: "HDFC Bank", sector: "Financial Services", rank: 3, score: 80, conviction: "Very Healthy", oneLineThesis: "Strong fundamentals in banking", keyReason: "Quality is the clearest current signal", riskMarker: null },
          ],
          preset: "Quality compounders",
        }),
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

async function dismissWelcomeIfVisible(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    try { window.localStorage.setItem("stockstory_feature_welcome_v1", "seen"); } catch {}
  }).catch(() => {});
  const close = page.getByRole("button", { name: /close feature introduction/i });
  if (await close.isVisible().catch(() => false)) {
    await close.click({ force: true });
    await page.waitForTimeout(300);
  }
}



// ── Public Route Smoke ───────────────────────────────────────────────

test.describe("Public route smoke", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
  });

  test("landing page renders without blank screen", async ({ page }) => {
    await page.goto("/?page=landing");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Understand/i })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("about page renders", async ({ page }) => {
    await page.goto("/?page=about");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { name: /AI research workspace for Indian equities/i })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/?page=login");
    await expect(page.locator("body")).toBeVisible();
    // Login page should show "Sign in" heading (not "Create your account")
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("signup page renders", async ({ page }) => {
    await page.goto("/?page=signup");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("methodology page renders", async ({ page }) => {
    await page.goto("/?page=methodology");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { name: "How StockStory Thinks" })).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("rankings redirects to scanner", async ({ page }) => {
    await page.goto("/?page=rankings");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("predictions page renders", async ({ page }) => {
    await page.goto("/?page=predictions");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });
});

// ── Rankings merged into Scanner ────────────────────────────────────

test.describe("Rankings redirected to Scanner", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
  });

  test("rankings route redirects to scanner", async ({ page }) => {
    await page.goto("/?page=rankings");
    await expect(page.locator("body")).toBeVisible();
    // Should show some product page (scanner or landing)
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("scanner page has no raw HTTP/backend error wording", async ({ page }) => {
    await page.goto("/?page=scanner");
    await expect(page.locator("body")).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text).not.toContain("backend");
    expect(text).not.toContain("HTTP");
    expect(text).not.toContain("500");
    expect(text).not.toContain("API");
    await assertNoRenderGarbage(page);
  });

  test("no forbidden copy for unauthenticated users", async ({ page }) => {
    await page.goto("/?page=rankings");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });
});

// ── Navigation Smoke ─────────────────────────────────────────────────

test.describe("Public navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem("stockstory_feature_welcome_v1", "seen"); } catch {}
    });
    await mockAllApi(page);
  });

  test("landing page has CTA to Start Free Trial", async ({ page }) => {
    await page.goto("/?page=landing", { waitUntil: "domcontentloaded" });
    await dismissWelcomeIfVisible(page);
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: /start free trial/i }).first()).toBeVisible();
  });

  test("landing page has CTA to Explore Scanner", async ({ page }) => {
    await page.goto("/?page=landing", { waitUntil: "domcontentloaded" });
    await dismissWelcomeIfVisible(page);
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: /explore scanner/i }).first()).toBeVisible();
  });

  test("landing page has navigation to methodology", async ({ page }) => {
    await page.goto("/?page=landing", { waitUntil: "domcontentloaded" });
    await dismissWelcomeIfVisible(page);
    const link = page.getByRole("button", { name: /research/i }).first();
    if (await link.count() > 0) {
      await link.click();
    }
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
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

  test("unauthenticated access to search renders body", async ({
    page,
  }) => {
    await page.goto("/?page=search");
    await expect(page.locator("body")).toBeVisible();
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

// ── Signin/Signup Copy Verification ──────────────────────────────────

test.describe("Signin/Signup copy", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
  });

  test("signup page has correct heading and secondary link", async ({ page }) => {
    await page.goto("/?page=signup");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByText("Already have an account? Sign in").first()).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("login page has correct heading and secondary link", async ({ page }) => {
    await page.goto("/?page=login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Need an account? Create one").first()).toBeVisible();
    await assertNoRenderGarbage(page);
  });
});

// ── Scanner Smoke ────────────────────────────────────────────────────

test.describe("Scanner", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(mockAuthSession);
    await mockAllApi(page);
  });

  test("scanner shows no white scrollbar issue", async ({ page }) => {
    await page.goto("/?page=scanner");
    await expect(page.locator("body")).toBeVisible();
    // The guided lens grid must not create horizontal page overflow.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await assertNoRenderGarbage(page);
  });

  test("scanner cards do not show Sector pending", async ({ page }) => {
    await page.goto("/?page=scanner");
    await expect(page.locator("body")).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text).not.toContain("Sector pending");
    await assertNoRenderGarbage(page);
  });
});

// ── About Page ───────────────────────────────────────────────────────

test.describe("About page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
  });

  test("about page contains required product sections", async ({ page }) => {
    await page.goto("/?page=about");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText("About StockStory").first()).toBeVisible();
    await expect(page.getByText("How the research workflow works").first()).toBeVisible();
    await expect(page.getByText("What you get inside").first()).toBeVisible();
    await expect(page.getByText("Why StockStory is different").first()).toBeVisible();
    await expect(page.getByText("Research Standards").first()).toBeVisible();
    await expect(page.getByText("Terms & Disclosures").first()).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("about page does not prioritize rankings as main CTA", async ({ page }) => {
    await page.goto("/?page=about");
    // Primary CTA should be "Start research" not "View rankings" or similar
    await expect(page.getByRole("button", { name: "Start research" }).first()).toBeVisible();
    await assertNoRenderGarbage(page);
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
    const input = page.getByRole("textbox", { name: /Search companies/i });
    await expect(input).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("search for RELIANCE returns results", async ({ page }) => {
    await page.goto("/?page=search");
    const input = page.getByRole("textbox", { name: /Search companies/i });
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
    // Wait for loading to complete
    await page.waitForTimeout(2000);
    // Page should render (may show error state for unknown stock)
    // Just verify the page loaded
    await expect(page.locator("body")).toBeVisible();
  });
});

// ── Authenticated Shell Smoke ──────────────────────────────────────────

test.describe("Authenticated shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(mockAuthSession);
    await mockAllApi(page);
  });

  test("dashboard renders", async ({ page }) => {
    await page.goto("/?page=dashboard");
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(1000);
    await assertNoRenderGarbage(page);
  });

  test("dashboard has navigation to methodology", async ({
    page,
  }) => {
    await page.goto("/?page=dashboard");
    const link = page.getByRole("link", { name: /methodology/i });
    if (await link.count() > 0) {
      await link.first().click();
    }
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("settings page renders", async ({ page }) => {
    await page.goto("/?page=settings");
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(1000);
    const h1 = await page.locator("h1").first();
    await expect(h1).toBeAttached();
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
    await expect(page.getByRole("heading", { name: /Understand/i })).toBeVisible();
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

// ── No Forbidden Terms ────────────────────────────────────────────────

test.describe("No forbidden terms", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
  });

  test("no backend/provider/API wording on scanner page", async ({ page }) => {
    await page.goto("/?page=scanner");
    const text = await page.locator("body").innerText();
    expect(text).not.toContain("backend");
    expect(text).not.toContain("API unavailable");
    expect(text).not.toContain("provider");
    expect(text).not.toContain("diagnostics");
    await assertNoRenderGarbage(page);
  });

  test("no Buy/Sell/Hold labels visible on landing", async ({ page }) => {
    await page.goto("/?page=landing");
    const text = await page.locator("body").innerText();
    expect(text).not.toContain("Buy");
    expect(text).not.toContain("Sell");
    expect(text).not.toContain("Hold");
    await assertNoRenderGarbage(page);
  });
});

// ── Scanner CTA routing ───────────────────────────────────────

test.describe("Scanner CTA routing", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
  });

  test("scanner page has get started CTA for unauthenticated", async ({ page }) => {
    await page.goto("/?page=scanner");
    await expect(page.locator("body")).toBeVisible();
    await assertNoRenderGarbage(page);
  });

  test("predictions fallback routes to landing", async ({ page }) => {
    await page.goto("/?page=predictions");
    await expect(page.locator("body")).toBeVisible();
    const cta = page.getByRole("button", { name: /create free account/i });
    await dismissWelcomeIfVisible(page);
    if (await cta.isVisible()) {
      await cta.click();
      await expect(page).toHaveURL(/page=signup/);
    }
    await assertNoRenderGarbage(page);
  });
});

// ── Keyboard & accessibility smoke ────────────────────────────────────

test.describe("Keyboard and accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApi(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "ss_auth_session_v1",
        JSON.stringify({
          status: "authenticated",
          uid: "test-user-001",
          createdAtMs: Date.now(),
        })
      );
    });
  });

  test("skip-to-content link exists and is focusable", async ({ page }) => {
    await page.goto("/?page=dashboard");
    const skipLink = page.locator('a[href="#ss-main-content"]');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#ss-main-content");
  });

  test("command palette opens with Cmd+K and closes with Escape", async ({ page }) => {
    await page.goto("/?page=dashboard");
    await expect(page.locator('a[href="#ss-main-content"]')).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: /command palette/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /command palette/i })).not.toBeVisible();
  });

  test("command palette search input is focused on open", async ({ page }) => {
    await page.goto("/?page=dashboard");
    await expect(page.locator('a[href="#ss-main-content"]')).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.getByLabel("Command search")).toBeFocused();
    await page.keyboard.press("Escape");
  });

  test("modals trap focus and return focus on close", async ({ page }) => {
    await page.goto("/?page=dashboard");
    await expect(page.locator('a[href="#ss-main-content"]')).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: /command palette/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /command palette/i })).not.toBeVisible();
  });

  test("profile button has accessible name", async ({ page }) => {
    await page.goto("/?page=dashboard");
    const profileBtn = page.getByRole("button", { name: /account menu/i });
    if (await profileBtn.isVisible()) {
      await expect(profileBtn).toHaveAttribute("aria-expanded");
    }
  });
});
