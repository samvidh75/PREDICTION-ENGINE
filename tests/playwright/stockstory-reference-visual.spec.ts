import { expect, test } from "@playwright/test";
import { mockAuthSession, mockAllApi, assertNoForbiddenTerms, STOCK_FIXTURE } from "../fixtures/stockstoryVisualFixtures";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || ".tmp/part-bf-visual";

test.describe.configure({ timeout: 20000 });

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("Failed to load resource") && !msg.text().includes("ERR_CONNECTION_REFUSED") && !msg.text().includes("net::ERR_FAILED")) {
      console.error(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });
});

async function setupPage(page: import("@playwright/test").Page, route: string, viewport: { width: number; height: number }, auth = false) {
  await page.setViewportSize(viewport);
  if (auth) await page.addInitScript(mockAuthSession);
  await mockAllApi(page);
  await page.goto(`/?page=${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
  await page.waitForTimeout(200);
}

async function assertAppShell(page: import("@playwright/test").Page) {
  await expect(page.locator("body")).toBeAttached();
  const main = page.locator("main, [role='main']").first();
  await expect(main).toBeAttached();
}

async function assertNoRenderGarbage(page: import("@playwright/test").Page) {
  const text = await page.locator("body").textContent() || "";
  expect(text).not.toContain("undefined undefined");
  expect(text).not.toContain("null null");
  expect(text).not.toContain("NaN");
}

async function captureScreenshot(page: import("@playwright/test").Page, name: string, viewport: { width: number; height: number }) {
  const fs = await import("fs");
  const path = await import("path");
  const dir = path.resolve(SCREENSHOT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
  return filePath;
}

async function visit(page: import("@playwright/test").Page, route: string, viewport: { width: number; height: number }, name: string, auth = false) {
  await setupPage(page, route, viewport, auth);
  await assertAppShell(page);
  await assertNoForbiddenTerms(page);
  await assertNoRenderGarbage(page);
  if (auth) {
    const nav = page.locator("nav[aria-label='Primary navigation']");
    if (await nav.count() > 0) {
      await expect(nav.first()).toBeAttached();
    }
  }
  const screenshotPath = await captureScreenshot(page, name, viewport);
  return screenshotPath;
}

VIEWPORTS.forEach((vp) => {
  test.describe(`Viewport ${vp.width}x${vp.height}`, () => {
    test("landing page", async ({ page }) => {
      await visit(page, "landing", vp, "landing");
    });

    test("scanner page", async ({ page }) => {
      await visit(page, "scanner", vp, "scanner", true);
    });

    test("stock detail page", async ({ page }) => {
      await visit(page, "stock&id=TCS", vp, "stock-detail", true);
    });

    test("compare page", async ({ page }) => {
      await visit(page, "compare", vp, "compare", true);
    });

    test("watchlist page", async ({ page }) => {
      await visit(page, "watchlist", vp, "watchlist", true);
    });

    test("portfolio page", async ({ page }) => {
      await visit(page, "portfolio", vp, "portfolio", true);
    });

    test("alerts page", async ({ page }) => {
      await visit(page, "alerts", vp, "alerts", true);
    });

    test("methodology page", async ({ page }) => {
      await visit(page, "trust", vp, "methodology", true);
    });

    test("stock detail invest sheet", async ({ page }) => {
      await setupPage(page, "stock&id=TCS", vp, true);
      await assertAppShell(page);
      const investBtn = page.getByRole("button", { name: /invest review/i });
      if (await investBtn.count() > 0) {
        await investBtn.first().click();
        await page.waitForTimeout(300);
      }
      const dialog = page.locator("[role='dialog']");
      if (await dialog.count() > 0) {
        await expect(dialog.first()).toBeAttached();
      }
      await assertNoForbiddenTerms(page);
      await assertNoRenderGarbage(page);
      await captureScreenshot(page, "stock-detail-invest", vp);
    });

    test("broker handoff gated state", async ({ page }) => {
      await setupPage(page, "stock&id=TCS", vp, true);
      await assertAppShell(page);
      const body = await page.locator("body").textContent() || "";
      expect(body).not.toContain("Upstox");
      expect(body).not.toContain("Zerodha");
      expect(body).not.toContain("Groww");
      expect(body).not.toContain("Dhan");
      await assertNoForbiddenTerms(page);
      await assertNoRenderGarbage(page);
      await captureScreenshot(page, "broker-handoff-gated", vp);
    });

    test("command palette on stock detail", async ({ page }) => {
      await setupPage(page, "stock&id=TCS", vp, true);
      await assertAppShell(page);
      await page.keyboard.press("Meta+k");
      await page.waitForTimeout(300);
      await assertNoForbiddenTerms(page);
      await assertNoRenderGarbage(page);
      await captureScreenshot(page, "command-palette", vp);
    });

    if (vp.width <= 430) {
      test("dashboard mobile nav", async ({ page }) => {
        await setupPage(page, "dashboard", vp, true);
        await assertAppShell(page);
        const nav = page.locator("nav[aria-label='Mobile navigation']");
        await expect(nav).toBeAttached();
        await assertNoForbiddenTerms(page);
        await assertNoRenderGarbage(page);
        await captureScreenshot(page, "dashboard-mobile-nav", vp);
      });
    }
  });
});
