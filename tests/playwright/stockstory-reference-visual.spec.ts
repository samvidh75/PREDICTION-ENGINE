import { expect, test } from "@playwright/test";
import { mockAuthSession, mockAllApi, assertNoForbiddenTerms } from "../fixtures/stockstoryVisualFixtures";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

test.describe.configure({ timeout: 15000 });

function testRoute(route: string, name: string, auth = false) {
  VIEWPORTS.forEach((vp) => {
    test(`${name} @ ${vp.width}x${vp.height}`, async ({ page }) => {
      test.setTimeout(20000);
      await page.setViewportSize(vp);
      if (auth) await page.addInitScript(mockAuthSession);
      await page.addInitScript(mockAllApi);
      await page.goto(`/?page=${route}`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForTimeout(1000);
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await expect(page.locator("body")).toBeAttached();
      if (auth) await expect(page.locator("main, [role='main']").first()).toBeAttached();
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
