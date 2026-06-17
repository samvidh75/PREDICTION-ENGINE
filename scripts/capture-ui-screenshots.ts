/**
 * UI screenshot capture for visual QA.
 * Usage: npx tsx scripts/capture-ui-screenshots.ts
 *
 * Captures key routes at multiple viewports.
 * Output: reports/screenshots/local-aura-glass/
 *
 * Requires: local dev server running (npm run dev)
 * or set BASE_URL env var for production.
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const OUT_DIR = resolve("reports/screenshots/local-aura-glass");

type RouteConfig = {
  path: string;
  name: string;
  auth?: boolean;
};

const ROUTES: RouteConfig[] = [
  { path: "/?page=landing", name: "landing" },
  { path: "/?page=about", name: "about" },
  { path: "/?page=rankings", name: "rankings" },
  { path: "/?page=predictions", name: "predictions" },
  { path: "/?page=trust", name: "trust-centre" },
  { path: "/?page=login", name: "login" },
  { path: "/?page=signup", name: "signup" },
];

const VIEWPORTS = [
  { width: 375, height: 812, name: "mobile-375" },
  { width: 430, height: 932, name: "mobile-430" },
  { width: 768, height: 1024, name: "tablet-768" },
  { width: 1440, height: 900, name: "desktop-1440" },
];

async function capture() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results: string[] = [];

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: vp });
      const page = await context.newPage();
      try {
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(500);
        const filename = `${route.name}_${vp.name}.png`;
        await page.screenshot({ path: join(OUT_DIR, filename), fullPage: true });
        results.push(`  [OK] ${filename} (${vp.width}x${vp.height})`);
      } catch (err) {
        results.push(`  [ERR] ${route.name}_${vp.name}: ${err}`);
      }
      await context.close();
    }
  }

  await browser.close();

  const report = [
    "=== UI Screenshot Capture Report ===",
    `Source: ${BASE_URL}`,
    `Output: ${OUT_DIR}`,
    `Captured: ${new Date().toISOString()}`,
    "",
    ...results,
    "",
    `Total: ${ROUTES.length} routes × ${VIEWPORTS.length} viewports = ${ROUTES.length * VIEWPORTS.length} screenshots`,
  ];

  writeFileSync(join(OUT_DIR, "capture-report.txt"), report.join("\n"));
  console.log(report.join("\n"));
}

capture().catch(console.error);
