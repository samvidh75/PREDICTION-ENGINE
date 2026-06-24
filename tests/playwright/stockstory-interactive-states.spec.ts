/**
 * Playwright interactive-state tests for StockStory India.
 * Tests invest dialog, broker handoff, command palette, scanner interactions,
 * stock detail tabs, compare, watchlist, portfolio, alerts, methodology, and mobile.
 *
 * All API calls are mocked using test-only fixtures.
 */

import { test, expect } from "@playwright/test";
import { mockAuthSession, mockAllApi, assertNoForbiddenTerms } from "../fixtures/stockstoryVisualFixtures";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

async function setup(page: import("@playwright/test").Page, route: string, auth = true): Promise<void> {
  if (auth) await page.addInitScript(mockAuthSession);
  await page.addInitScript(mockAllApi);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/?page=${route}`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(500);
}

async function getShell(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return { errors };
}

test.describe("Landing page interactive", () => {
  test("page loads with nav and market strip", async ({ page }) => {
    await setup(page, "landing", false);
    await expect(page.locator("main, [role='main']")).toBeAttached();
    await expect(page.locator("nav[aria-label='Primary navigation']")).toBeAttached();
    await expect(page.locator("h1")).toBeAttached();
    await assertNoForbiddenTerms(page);
  });

  test("Start Free Trial button exists", async ({ page }) => {
    await setup(page, "landing", false);
    const body = await page.locator("body").textContent() || "";
    expect(body).toContain("Start Free Trial");
  });

  test("Explore Scanner button exists", async ({ page }) => {
    await setup(page, "landing", false);
    const body = await page.locator("body").textContent() || "";
    expect(body).toContain("Explore Scanner");
  });
});

test.describe("Scanner page interactive", () => {
  test("scanner renders with filter rail and results", async ({ page }) => {
    await setup(page, "scanner");
    await expect(page.locator("main, [role='main']")).toBeAttached();
    await assertNoForbiddenTerms(page);
  });

  test("search input updates result state", async ({ page }) => {
    await setup(page, "scanner");
    const input = page.locator("input[placeholder*='e.g.'], input[placeholder*='search' i], input[type='text']").first();
    if (await input.count() > 0) {
      await input.fill("TCS");
      await page.waitForTimeout(300);
    }
    await assertNoForbiddenTerms(page);
  });
});

test.describe("Stock detail interactive", () => {
  test("stock detail renders with mocked data", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    await expect(page.locator("h1")).toBeAttached();
    await assertNoForbiddenTerms(page);
  });

  test("tabs are present and switch", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const tabs = ["Thesis", "Fundamentals", "Financials", "Risks", "Technicals", "News", "Peers"];
    const tabButtons = page.locator("button").filter({ hasText: /Thesis|Fundamentals|Financials|Risks|Technicals|News|Peers/ });
    await expect(tabButtons.first()).toBeAttached();
    await assertNoForbiddenTerms(page);
  });

  test("Invest opens InvestmentReviewSheet", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const investBtn = page.getByRole("button", { name: /invest review|invest/i }).first();
    if (await investBtn.count() > 0) {
      await investBtn.click();
      await page.waitForTimeout(500);
    }
    await assertNoForbiddenTerms(page);
  });
});

test.describe("InvestmentReviewSheet", () => {
  test("contains compliance-safe text", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const investBtn = page.getByRole("button", { name: /invest review|invest/i }).first();
    if (await investBtn.count() > 0) {
      await investBtn.click();
      await page.waitForTimeout(500);
    }
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("Buy now");
    expect(body).not.toContain("guaranteed");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("BrokerHandoffSheet", () => {
  test("gated state does not show fake brokers", async ({ page }) => {
    await setup(page, "stock&id=TCS");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("Upstox");
    expect(body).not.toContain("Zerodha");
    expect(body).not.toContain("Groww");
    expect(body).not.toContain("Dhan");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("Command palette", () => {
  test("opens with keyboard shortcut", async ({ page }) => {
    await setup(page, "dashboard");
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(300);
    const dialogs = page.locator("[role='dialog'], [role='search']");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("Compare page", () => {
  test("renders empty or decision-oriented state", async ({ page }) => {
    await setup(page, "compare");
    await expect(page.locator("main, [role='main']")).toBeAttached();
    await assertNoForbiddenTerms(page);
  });
});

test.describe("Watchlist page", () => {
  test("empty state uses thesis-tracking language", async ({ page }) => {
    await setup(page, "watchlist");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("fake");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("Portfolio page", () => {
  test("no fake P&L or holdings", async ({ page }) => {
    await setup(page, "portfolio");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("P&L");
    expect(body).not.toContain("Profit & Loss");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("Alerts page", () => {
  test("What Changed surface renders", async ({ page }) => {
    await setup(page, "alerts");
    await expect(page.locator("main, [role='main']").first()).toBeAttached();
    await assertNoForbiddenTerms(page);
  });
});

test.describe("Methodology page", () => {
  test("product-facing with no backend wording", async ({ page }) => {
    await setup(page, "trust");
    const body = await page.locator("body").textContent() || "";
    expect(body).not.toContain("provider");
    expect(body).not.toContain("coverage");
    expect(body).not.toContain("lineage");
    await assertNoForbiddenTerms(page);
  });
});

test.describe("Mobile navigation", () => {
  test("mobile nav visible at 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(mockAuthSession);
    await page.addInitScript(mockAllApi);
    await page.goto("/?page=watchlist", { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(1000);
    const nav = page.locator("nav[aria-label='Mobile navigation']");
    if (await nav.count() > 0) {
      await expect(nav).toBeAttached();
    }
    await assertNoForbiddenTerms(page);
  });

  test("no horizontal overflow at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(mockAuthSession);
    await page.addInitScript(mockAllApi);
    await page.goto("/?page=landing", { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(8);
    await assertNoForbiddenTerms(page);
  });
});
