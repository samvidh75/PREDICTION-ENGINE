#!/usr/bin/env npx tsx
/**
 * Responsive UI Audit
 *
 * Checks key routes at multiple viewports for:
 *  - Console errors
 *  - Horizontal overflow
 *  - Missing key content (headings)
 *  - Render garbage (NaN, undefined, null text)
 *  - Raw env name leakage
 *
 * Usage: npx tsx scripts/audit-responsive-ui.ts
 *        BASE_URL=http://localhost:4173 npx tsx scripts/audit-responsive-ui.ts
 *
 * Exit 0 = pass, 1 = failures
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const OUT_DIR = resolve("reports/responsive-audit");

const VIEWPORTS = [
  { width: 320, height: 568, name: "320-iphone5-se" },
  { width: 375, height: 812, name: "375-iphoneX" },
  { width: 390, height: 844, name: "390-iphone14" },
  { width: 768, height: 1024, name: "768-ipad" },
  { width: 1024, height: 768, name: "1024-ipad-landscape" },
  { width: 1366, height: 768, name: "1366-laptop" },
  { width: 1440, height: 900, name: "1440-desktop" },
  { width: 1920, height: 1080, name: "1920-fullhd" },
];

const PUBLIC_ROUTES = [
  { path: "/?page=landing", name: "landing", heading: /Indian equity research/i },
  { path: "/?page=rankings", name: "rankings", heading: /research rankings/i },
  { path: "/?page=predictions", name: "predictions", heading: null },
  { path: "/?page=trust", name: "trust", heading: null },
];

const AUTH_ROUTES = [
  { path: "/?page=dashboard", name: "dashboard", heading: null },
  { path: "/?page=stock&id=RELIANCE", name: "company-RELIANCE", heading: null },
];

const ENV_VAR_PATTERNS = [
  "VITE_FIREBASE_API_KEY",
  "FIREBASE_API_KEY",
  "AIzaSy",
  "VITE_",
  "import.meta.env",
];

interface CheckResult {
  route: string;
  viewport: string;
  consoleErrors: number;
  consoleMessages: string[];
  horizontalOverflow: boolean;
  headingVisible: boolean;
  renderGarbage: string[];
  envLeakage: string[];
  passed: boolean;
}

function mockAuthSession(page: import("playwright").Page): void {
  page.addInitScript(() => {
    window.localStorage.setItem(
      "ss_auth_session_v1",
      JSON.stringify({
        status: "authenticated",
        uid: "audit-user-001",
        createdAtMs: Date.now(),
      })
    );
  });
}

async function mockAllApi(page: import("playwright").Page): Promise<void> {
  await page.route(/\/api\//, async (route) => {
    const url = route.request().url();
    const pathname = new URL(url).pathname;
    if (!pathname.startsWith("/api/")) {
      return route.fallback();
    }
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
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

async function checkRenderGarbage(
  page: import("playwright").Page
): Promise<string[]> {
  const bodyText = await page.locator("body").innerText();
  const garbage: string[] = [];
  if (bodyText.includes("NaN")) garbage.push("NaN");
  if (bodyText.includes("undefined")) garbage.push("undefined");
  if (bodyText.includes("null")) garbage.push("null");
  if (bodyText.includes("[object Object]")) garbage.push("[object Object]");
  if (bodyText.includes("Infinity")) garbage.push("Infinity");
  return garbage;
}

async function checkEnvLeakage(
  page: import("playwright").Page
): Promise<string[]> {
  const bodyText = await page.locator("body").innerText();
  const leaks: string[] = [];
  for (const pattern of ENV_VAR_PATTERNS) {
    if (bodyText.includes(pattern)) {
      leaks.push(pattern);
    }
  }
  return leaks;
}

async function runAudit(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const allResults: CheckResult[] = [];
  let totalFailures = 0;

  console.log(`\n  Responsive UI Audit — ${BASE_URL}\n`);

  for (const route of PUBLIC_ROUTES) {
    const results = await checkRoute(browser, route.path, route.name, route.heading, false);
    allResults.push(...results);
  }

  for (const route of AUTH_ROUTES) {
    const results = await checkRoute(browser, route.path, route.name, route.heading, true);
    allResults.push(...results);
  }

  await browser.close();

  const jsonPath = resolve(OUT_DIR, "audit-results.json");
  writeFileSync(jsonPath, JSON.stringify(allResults, null, 2));

  printSummary(allResults);

  totalFailures = allResults.filter((r) => !r.passed).length;
  process.exit(totalFailures > 0 ? 1 : 0);
}

async function checkRoute(
  browser: import("playwright").Browser,
  path: string,
  name: string,
  heading: RegExp | null,
  needsAuth: boolean
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();

    const consoleMessages: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleMessages.push(msg.text());
      }
    });

    if (needsAuth) {
      await mockAuthSession(page);
    }
    await mockAllApi(page);

    const result: CheckResult = {
      route: name,
      viewport: vp.name,
      consoleErrors: 0,
      consoleMessages: [],
      horizontalOverflow: false,
      headingVisible: true,
      renderGarbage: [],
      envLeakage: [],
      passed: true,
    };

    try {
      await page.goto(`${BASE_URL}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(1000);

      result.consoleErrors = consoleMessages.length;
      result.consoleMessages = consoleMessages.slice(0, 5);

      const overflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      result.horizontalOverflow = overflow;

      if (heading) {
        try {
          await page.waitForSelector(`:is(h1, h2, h3, h4, h5, h6)`, {
            timeout: 3000,
          });
          const headings = await page.locator(`:is(h1, h2, h3, h4, h5, h6)`).allInnerTexts();
          const match = headings.some((h) => heading.test(h));
          result.headingVisible = match;
        } catch {
          result.headingVisible = false;
        }
      }

      result.renderGarbage = await checkRenderGarbage(page);
      result.envLeakage = await checkEnvLeakage(page);

      const failures: string[] = [];
      if (result.consoleErrors > 0) failures.push("console-errors");
      if (result.horizontalOverflow) failures.push("overflow");
      if (!result.headingVisible && heading) failures.push("missing-heading");
      if (result.renderGarbage.length > 0) failures.push("render-garbage");
      if (result.envLeakage.length > 0) failures.push("env-leakage");
      result.passed = failures.length === 0;
    } catch (err) {
      result.passed = false;
      result.consoleMessages.push(`Navigation error: ${err}`);
    }

    results.push(result);
    await context.close();
  }

  return results;
}

function printSummary(results: CheckResult[]): void {
  const failed = results.filter((r) => !r.passed);
  const passed = results.filter((r) => r.passed);

  console.log(`  Results: ${passed.length} passed, ${failed.length} failed\n`);

  if (failed.length > 0) {
    console.log("  Failures:");
    for (const f of failed) {
      const issues: string[] = [];
      if (f.consoleErrors > 0) issues.push(`${f.consoleErrors} console error(s)`);
      if (f.horizontalOverflow) issues.push("overflow");
      if (!f.headingVisible) issues.push("no heading");
      if (f.renderGarbage.length > 0) issues.push(`garbage: ${f.renderGarbage.join(",")}`);
      if (f.envLeakage.length > 0) issues.push(`env leak: ${f.envLeakage.join(",")}`);
      console.log(`    ${f.route} @ ${f.viewport}: ${issues.join(", ")}`);
    }
    console.log();
  }

  const byRoute = new Map<string, { pass: number; fail: number }>();
  for (const r of results) {
    if (!byRoute.has(r.route)) byRoute.set(r.route, { pass: 0, fail: 0 });
    const entry = byRoute.get(r.route)!;
    if (r.passed) entry.pass++;
    else entry.fail++;
  }

  console.log("  Summary by route:");
  for (const [route, counts] of byRoute) {
    const status = counts.fail === 0 ? "PASS" : "FAIL";
    console.log(`    ${status}  ${route}  (${counts.pass}/${counts.pass + counts.fail} viewports passed)`);
  }
  console.log();

  const jsonPath = resolve(OUT_DIR, "audit-results.json");
  console.log(`  Full results written to ${jsonPath}\n`);
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
