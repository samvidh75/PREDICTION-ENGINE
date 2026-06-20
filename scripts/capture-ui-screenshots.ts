/** Bounded production-preview screenshot harness. Output is always local-only under .tmp. */
import { chromium, type Browser, type Page } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT_DIR = resolve(process.env.SCREENSHOT_DIR || ".tmp/part-ba-after");
const NAVIGATION_TIMEOUT_MS = 15_000;
const READY_TIMEOUT_MS = 8_000;

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

type CaptureState = "invest" | "palette" | "mobile-nav";
interface Route { name: string; path: string; auth?: boolean; state?: CaptureState; mobileOnly?: boolean }

const ROUTES: Route[] = [
  { name: "home", path: "/?page=landing" },
  { name: "login", path: "/?page=login" },
  { name: "signup", path: "/?page=signup" },
  { name: "about", path: "/?page=about" },
  { name: "stock-CHENNPETRO", path: "/?page=stock&id=CHENNPETRO", auth: true },
  { name: "stock-ITC", path: "/?page=stock&id=ITC", auth: true },
  { name: "stock-RELIANCE", path: "/?page=stock&id=RELIANCE", auth: true },
  { name: "stock-TCS", path: "/?page=stock&id=TCS", auth: true },
  { name: "scanner", path: "/?page=scanner" },
  { name: "rankings", path: "/?page=rankings" },
  { name: "compare", path: "/?page=compare", auth: true },
  { name: "watchlist", path: "/?page=watchlist", auth: true },
  { name: "portfolio", path: "/?page=portfolio", auth: true },
  { name: "alerts", path: "/?page=alerts", auth: true },
  { name: "methodology", path: "/?page=methodology" },
  { name: "invest-sheet", path: "/?page=invest&id=RELIANCE", auth: true, state: "invest" },
  { name: "command-palette", path: "/?page=dashboard", auth: true, state: "palette" },
  { name: "mobile-nav", path: "/?page=dashboard", auth: true, state: "mobile-nav", mobileOnly: true },
];
const ROUTE_FILTER = new Set((process.env.SCREENSHOT_ROUTES || "").split(",").map((value) => value.trim()).filter(Boolean));

async function seedAuthenticatedSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("ss_auth_session_v1", JSON.stringify({
      status: "authenticated", uid: "visual-acceptance", createdAtMs: Date.now(),
    }));
  });
}

async function settle(page: Page): Promise<void> {
  await page.waitForSelector("#root", { timeout: READY_TIMEOUT_MS });
  await page.waitForSelector("main:visible, [role='main']:visible", { timeout: READY_TIMEOUT_MS });
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
  await page.waitForTimeout(450);
}

async function openState(page: Page, state?: CaptureState): Promise<void> {
  if (!state) return;
  if (state === "invest") {
    const button = page.getByRole("button", { name: "Invest", exact: true });
    if (await button.count()) await button.click();
  } else if (state === "palette") {
    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
  } else {
    const button = page.getByRole("button", { name: /menu|navigation/i });
    if (await button.count()) await button.first().click();
  }
  await page.waitForTimeout(200);
  if (state === "invest" && !(await page.getByRole("dialog").count())) throw new Error("Invest sheet did not open");
  if (state === "palette" && !(await page.getByRole("dialog").count())) throw new Error("Command palette did not open");
  if (state === "mobile-nav" && !(await page.locator(".ssi-bottom-nav").count())) throw new Error("Mobile navigation is not visible");
}

async function assertPageAcceptance(page: Page, route: Route): Promise<void> {
  const result = await page.evaluate((isStock) => {
    const text = document.body.innerText;
    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
    const forbidden = /\b(Unhealthy|Very Unhealthy|Strong Buy|Buy now|price target|target price|stop-loss|guaranteed return|undefined|NaN|Infinity|N\/A)\b/i.test(text);
    return {
      overflow,
      forbidden,
      h1: document.querySelectorAll("h1").length,
      healthometer: isStock ? (text.match(/^Healthometer$/gim) || []).length : 0,
      prediction: isStock ? (text.match(/^Prediction Engine$/gim) || []).length : 0,
      price: isStock ? (text.match(/^Price context$/gim) || []).length : 0,
      actions: isStock ? document.querySelectorAll("[data-testid='stock-action-cluster']").length : 0,
    };
  }, route.name.startsWith("stock-"));
  if (result.overflow > 8) throw new Error(`horizontal overflow ${result.overflow}px`);
  if (result.forbidden) throw new Error("forbidden public copy detected");
  if (route.name.startsWith("stock-") && (result.h1 !== 1 || result.healthometer !== 1 || result.prediction !== 1 || result.price !== 1 || result.actions !== 1)) {
    throw new Error(`stock composition mismatch h1=${result.h1} health=${result.healthometer} prediction=${result.prediction} price=${result.price} actions=${result.actions}`);
  }
}

async function captureOne(browser: Browser, route: Route, viewport: typeof VIEWPORTS[number], attempt = 1): Promise<{ errors: number; path: string }> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (/Failed to load resource|ERR_CONNECTION_REFUSED|net::ERR_FAILED/i.test(message.text())) return;
    consoleErrors.push(message.text());
  });
  try {
    if (route.auth) await seedAuthenticatedSession(page);
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
    await settle(page);
    await openState(page, route.state);
    await assertPageAcceptance(page, route);
    const output = resolve(OUT_DIR, `${route.name}-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: output, fullPage: false, animations: "disabled", timeout: 15_000 });
    return { errors: consoleErrors.length, path: output };
  } catch (error) {
    if (attempt === 1) {
      await context.close();
      return captureOne(browser, route, viewport, 2);
    }
    throw error;
  } finally {
    if (attempt !== 1 || !page.isClosed()) await context.close().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  let failures = 0;
  try {
    for (const route of ROUTES.filter((item) => ROUTE_FILTER.size === 0 || ROUTE_FILTER.has(item.name))) {
      for (const viewport of VIEWPORTS) {
        if (route.mobileOnly && viewport.width > 430) continue;
        try {
          const result = await captureOne(browser, route, viewport);
          console.log(`[PASS] ${route.name} ${viewport.width}x${viewport.height} errors=${result.errors} path=${result.path}`);
        } catch (error) {
          failures += 1;
          console.error(`[FAIL] ${route.name} ${viewport.width}x${viewport.height}: ${error instanceof Error ? error.message : error}`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  if (failures) throw new Error(`${failures} screenshot capture(s) failed`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
