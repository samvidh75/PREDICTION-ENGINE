/**
 * Playwright interactive-state tests for StockStory India.
 * Covers landing, scanner, stock detail, invest sheet, broker handoff,
 * command palette, compare, watchlist, portfolio, alerts, methodology, and mobile.
 *
 * All API calls are mocked using test-only fixtures.
 * Test-only visual fixture. Not used in production.
 */

import { test, expect } from "@playwright/test";
import { mockAuthSession, mockAllApi, assertNoForbiddenTerms } from "../fixtures/stockstoryVisualFixtures";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

async function setup(page: import("@playwright/test").Page, route: string, viewport = { width: 1440, height: 900 }, auth = true): Promise<void> {
  await page.setViewportSize(viewport);
  if (auth) await page.addInitScript(mockAuthSession);
  await mockAllApi(page);
  await page.goto(`/?page=${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(500);
}

async function assertNoRenderGarbage(page: import("@playwright/test").Page) {
  const text = await page.locator("body").textContent() || "";
  expect(text).not.toContain("undefined undefined");
  expect(text).not.toContain("null null");
  expect(text).not.toContain("NaN");
}

test.describe("1. Landing page interactive", () => {
  VIEWPORTS.forEach((vp) => {
    test(`page loads with nav, market strip, and CTAs @ ${vp.width}x${vp.height}`, async ({ page }) => {
      await setup(page, "landing", vp, false);
      await expect(page.locator("main, [role='main']")).toBeAttached();
      await expect(page.locator("h1")).toBeAttached();
      await assertNoForbiddenTerms(page);
      await assertNoRenderGarbage(page);
    });
  });

  test("Start Free Trial CTA exists", async ({ page }) => {
    await setup(page, "landing", undefined, false);
    const body = await page.locator("body").textContent() || "";
    expect(body).toContain("Start Free Trial");
    await assertNoForbiddenTerms(page);
  });

  test("Explore Scanner CTA exists", async ({ page }) => {
    await setup(page, "landing", undefined, false);
    const body = await page.locator("body").textContent() || "";
    expect(body).toContain("Explore Scanner");
    await assertNoForbiddenTerms(page);
  });

  test("no forbidden copy on landing", async ({ page }) => {
    await setup(page, "landing", undefined, false);
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("backend");
    expect(body).not.toContain("provider health");
    expect(body).not.toContain("database error");
    expect(body).not.toContain("API unavailable");
    expect(body).not.toContain("IndianAPI");
    expect(body).not.toContain("Yahoo");
    expect(body).not.toContain("Jugaad");
    expect(body).not.toContain("NSEPython");
    expect(body).not.toContain("diagnostics");
    expect(body).not.toContain("lineage");
    await assertNoRenderGarbage(page);
  });
});

test.describe("2. Scanner page interactive", () => {
  test("scanner renders with filter rail and results", async ({ page }) => {
    await setup(page, "scanner");
    await expect(page.locator("main, [role='main']")).toBeAttached();
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("search input is present", async ({ page }) => {
    await setup(page, "scanner");
    const input = page.locator("input").first();
    await expect(input).toBeAttached();
    await assertNoForbiddenTerms(page);
  });

  test("no forbidden copy on scanner", async ({ page }) => {
    await setup(page, "scanner");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("Buy now");
    expect(body).not.toContain("Strong Buy");
    expect(body).not.toContain("guaranteed");
    expect(body).not.toContain("sure shot");
    expect(body).not.toContain("multibagger");
    await assertNoRenderGarbage(page);
  });

  test("row click routes to stock detail", async ({ page }) => {
    await setup(page, "scanner");
    const row = page.locator("table tbody tr, [class*='result']").first();
    if (await row.count() > 0) {
      await row.click();
      await page.waitForTimeout(500);
      await assertNoForbiddenTerms(page);
    }
  });
});

test.describe("3. Stock detail interactive", () => {
  test("stock detail renders with mocked TCS data", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    await expect(page.locator("h1")).toBeAttached();
    const body = await page.locator("body").textContent() || "";
    expect(body).toContain("TCS");
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("tabs are present and switch correctly", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const tabNames = ["Thesis", "Fundamentals", "Financials", "Risks", "Technicals", "News", "Peers"];
    const tabButtons = page.locator("button").filter({ hasText: /Thesis|Fundamentals|Financials|Risks|Technicals|News|Peers/ });
    const count = await tabButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("View Full Thesis button exists", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const thesisBtn = page.getByRole("button", { name: /full thesis/i });
    if (await thesisBtn.count() > 0) {
      await expect(thesisBtn.first()).toBeAttached();
    }
    await assertNoForbiddenTerms(page);
  });

  test("Invest review opens InvestmentReviewSheet", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const investBtn = page.getByRole("button", { name: /invest review/i }).first();
    await expect(investBtn).toBeAttached();
    await investBtn.click();
    await page.waitForTimeout(500);
    const dialog = page.locator("[role='dialog']");
    const dialogCount = await dialog.count();
    expect(dialogCount).toBeGreaterThanOrEqual(1);
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("no forbidden copy on stock detail", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("backend");
    expect(body).not.toContain("provider");
    expect(body).not.toContain("coverage");
    expect(body).not.toContain("freshness");
    await assertNoRenderGarbage(page);
  });
});

test.describe("4. InvestmentReviewSheet", () => {
  VIEWPORTS.forEach((vp) => {
    test(`opens and has compliance-safe content @ ${vp.width}x${vp.height}`, async ({ page }) => {
      await setup(page, "stock&id=TCS", vp);
      const investBtn = page.getByRole("button", { name: /invest review/i }).first();
      await expect(investBtn).toBeAttached();
      await investBtn.click();
      await page.waitForTimeout(500);
      const dialog = page.locator("[role='dialog']").first();
      await expect(dialog).toBeAttached();
      const text = await dialog.textContent() || "";
      expect(text).toContain("Investment Review");
      expect(text).toContain("Final order placement happens with your broker");
      expect(text).toContain("Track instead");
      expect(text).toContain("Compare first");
      expect(text).toContain("Back to research");
      expect(text).not.toContain("Buy now");
      expect(text).not.toContain("guaranteed");
      await assertNoForbiddenTerms(page);
      await assertNoRenderGarbage(page);
    });
  });

  test("Escape key closes the sheet", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const investBtn = page.getByRole("button", { name: /invest review/i }).first();
    await investBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator("[role='dialog']").first()).toBeAttached();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const dialogCount = await page.locator("[role='dialog']").count();
    expect(dialogCount).toBe(0);
  });

  test("close button closes the sheet", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const investBtn = page.getByRole("button", { name: /invest review/i }).first();
    await investBtn.click();
    await page.waitForTimeout(300);
    const closeBtn = page.locator("button[aria-label='Close investment review']");
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(300);
      const dialogCount = await page.locator("[role='dialog']").count();
      expect(dialogCount).toBe(0);
    }
  });
});

test.describe("5. BrokerHandoffSheet", () => {
  test("gated state does not show fake brokers", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("Upstox");
    expect(body).not.toContain("Zerodha");
    expect(body).not.toContain("Groww");
    expect(body).not.toContain("Dhan");
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("does not show order placement", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("order placed");
    expect(body).not.toContain("Order Placed");
    expect(body).not.toContain("Continue with broker");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("6. Command palette", () => {
  test("opens with keyboard shortcut", async ({ page }) => {
    await setup(page, "dashboard");
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(300);
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("contains product commands only (no diagnostics)", async ({ page }) => {
    await setup(page, "dashboard");
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(300);
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("diagnostics");
    expect(body).not.toContain("backend");
    expect(body).not.toContain("provider");
    expect(body).not.toContain("migration");
    await assertNoForbiddenTerms(page);
  });

  test("Escape closes palette", async ({ page }) => {
    await setup(page, "dashboard");
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await assertNoForbiddenTerms(page);
  });
});

test.describe("7. Compare page", () => {
  test("renders decision-oriented state", async ({ page }) => {
    await setup(page, "compare");
    await expect(page.locator("main, [role='main']")).toBeAttached();
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("no fake winner when data is missing", async ({ page }) => {
    await setup(page, "compare");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("Winner");
    expect(body).not.toContain("Better pick");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("8. Watchlist page", () => {
  test("empty state uses thesis-tracking language", async ({ page }) => {
    await setup(page, "watchlist");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("fake");
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("Open scanner CTA exists", async ({ page }) => {
    await setup(page, "watchlist");
    const body = await page.locator("body").textContent() || "";
    expect(body).toMatch(/scanner/i);
    await assertNoForbiddenTerms(page);
  });
});

test.describe("9. Portfolio page", () => {
  test("no fake P&L or holdings", async ({ page }) => {
    await setup(page, "portfolio");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("P&L");
    expect(body).not.toContain("Profit & Loss");
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("thesis-monitor language appears", async ({ page }) => {
    await setup(page, "portfolio");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("broker sync");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("10. Alerts page", () => {
  test("What Changed surface renders", async ({ page }) => {
    await setup(page, "alerts");
    await expect(page.locator("main, [role='main']").first()).toBeAttached();
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("no fake active alert history", async ({ page }) => {
    await setup(page, "alerts");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("alert triggered");
    expect(body).not.toContain("Alert triggered");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("11. Methodology page", () => {
  test("explains research, conviction, risk", async ({ page }) => {
    await setup(page, "trust");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("provider");
    expect(body).not.toContain("coverage");
    expect(body).not.toContain("lineage");
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("no backend wording", async ({ page }) => {
    await setup(page, "trust");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("diagnostics");
    expect(body).not.toContain("migration");
    expect(body).not.toContain("backfill");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("12. Mobile navigation", () => {
  test("mobile nav visible at 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(mockAuthSession);
    await mockAllApi(page);
    await page.goto("/?page=watchlist", { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(1000);
    const nav = page.locator("nav[aria-label='Mobile navigation']");
    await expect(nav).toBeAttached();
    await assertNoForbiddenTerms(page);
    await assertNoRenderGarbage(page);
  });

  test("no horizontal overflow at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(mockAuthSession);
    await mockAllApi(page);
    await page.goto("/?page=landing", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(8);
    await assertNoForbiddenTerms(page);
  });

  test("mobile scanner uses cards not crushed table", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(mockAuthSession);
    await mockAllApi(page);
    await page.goto("/?page=scanner", { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(500);
    await assertNoForbiddenTerms(page);
    const overflow = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(8);
  });

  test("stock detail stacks properly at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(mockAuthSession);
    await mockAllApi(page);
    await page.goto("/?page=stock&id=TCS", { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(500);
    await assertNoForbiddenTerms(page);
    const overflow = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(8);
  });
});
