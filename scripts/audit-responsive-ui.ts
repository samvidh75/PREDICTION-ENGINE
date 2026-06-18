import { chromium, type Browser, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const viewports = [
  [320, 568],
  [375, 812],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
] as const;

const routes = [
  ["landing", "/?page=landing"],
  ["rankings", "/?page=rankings"],
  ["signals", "/?page=predictions"],
  ["about", "/?page=about"],
  ["trust", "/?page=trust"],
  ["signin", "/?page=login"],
  ["search-auth", "/?page=search"],
  ["dashboard-auth", "/?page=dashboard"],
  ["watchlist-auth", "/?page=watchlist"],
  ["portfolio-auth", "/?page=portfolio"],
  ["company-reliance-auth", "/?page=stock&id=RELIANCE"],
] as const;

async function waitForServer(url: string): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server did not become ready at ${url}`);
}

interface AuditResult {
  overflow: number;
  hasNav: boolean;
  hasCta: boolean;
  rawToken: boolean;
  secretToken: boolean;
  forbiddenTrading: boolean;
  oldPlain: boolean;
  navCoversContent: boolean;
  fabCoversControl: boolean;
  hasAppShell: boolean;
  scannerCards: boolean;
  portfolioMobile: boolean;
  modalA11y: boolean;
}

async function auditPage(page: Page, url: string): Promise<string[]> {
  const failures: string[] = [];
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/Failed to load resource: the server responded with a status of 50[024]/.test(text)) return;
    consoleErrors.push(text);
  });
  await page.goto(url, { waitUntil: "load", timeout: 15000 }).catch(() => page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {}));
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  const raw = await page.evaluate(`(() => {
    const bodyText = document.body.innerText;
    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
    const nav = document.querySelector("nav, header");
    const cta = document.querySelector("button, a");
    const rawToken = /\b(undefined|null|NaN|Infinity)\b/.test(bodyText);
    const secretToken = /\b(REDIS_URL|DATABASE_URL|FIREBASE_PRIVATE_KEY|INDIANAPI_KEY|INDIANAPI_KEY|YAHOO_FINANCE_API_KEY)\b/.test(bodyText);
    const forbiddenTrading = /\b(Buy Stock|Sell Stock|Strong Buy|Strong Sell|Looks Good|Try Pro|Unlock Pro|Trade now|30 days free)\b/i.test(bodyText);
    const oldPlain = document.querySelectorAll(".rounded-2xl").length > 0 && !document.querySelector(".ss-page, .ss-surface, .ss-dark-surface, .ssi-card");
    const bottomNav = document.querySelector(".ssi-bottom-nav");
    const fab = document.querySelector(".ssi-fab");
    const firstMainControl = document.querySelector("main button, main a");
    const rect = (el) => el ? el.getBoundingClientRect() : null;
    const navRect = rect(bottomNav);
    const fabRect = rect(fab);
    const controlRect = rect(firstMainControl);
    const navCoversContent = !!navRect && Array.from(document.querySelectorAll("main button, main a, main input")).some((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > navRect.top && r.top < navRect.bottom && r.width > 0 && r.height > 0;
    });
    const fabCoversControl = !!fabRect && !!controlRect &&
      !(fabRect.right < controlRect.left || fabRect.left > controlRect.right || fabRect.bottom < controlRect.top || fabRect.top > controlRect.bottom);
    const hasAppShell = !!document.querySelector(".ssi-card, .ssi-hero-card, .ssi-bottom-nav, .ss-page, .ss-surface, .ss-dark-surface");
    const isLoginBoundary = /Sign in|Email|Password/i.test(bodyText) && !/What you own right now|Today's research scanner/i.test(bodyText);
    const scannerCards = location.search.includes("rankings") && !isLoginBoundary ? !!document.querySelector(".ssi-score-ring, table") : true;
    const portfolioMobile = location.search.includes("portfolio") && !isLoginBoundary ? /What you own right now|Source audit/.test(bodyText) : true;
    const modalA11y = Array.from(document.querySelectorAll("[role='dialog']")).every((el) => el.getAttribute("aria-modal") === "true");
    return { overflow, hasNav: !!nav, hasCta: !!cta, rawToken, secretToken, forbiddenTrading, oldPlain, navCoversContent, fabCoversControl, hasAppShell, scannerCards, portfolioMobile, modalA11y };
  })()`).catch(() => null);
  const localResult = raw ?? (await page.evaluate(`"use strict"; (() => ({ overflow: 0, hasNav: false, hasCta: false, rawToken: false, secretToken: false, forbiddenTrading: false, oldPlain: false, navCoversContent: false, fabCoversControl: false, hasAppShell: false, scannerCards: false, portfolioMobile: false, modalA11y: false }))()`).catch(() => ({ overflow: 0, hasNav: false, hasCta: false, rawToken: false, secretToken: false, forbiddenTrading: false, oldPlain: false, navCoversContent: false, fabCoversControl: false, hasAppShell: false, scannerCards: false, portfolioMobile: false, modalA11y: false })));
  const r = localResult as unknown as AuditResult;
  if (r.overflow > 8) failures.push(`horizontal overflow ${r.overflow}px`);
  if (!r.hasNav) failures.push("navigation missing");
  if (!r.hasCta) failures.push("no actionable control detected");
  if (r.rawToken) failures.push("raw undefined/null/NaN/Infinity visible");
  if (r.secretToken) failures.push("provider secret/env name visible");
  if (r.forbiddenTrading) failures.push("forbidden trading/prototype monetization language visible");
  if (r.oldPlain) failures.push("premium surface selectors missing");
  if (r.navCoversContent) failures.push("bottom navigation overlaps actionable content");
  if (r.fabCoversControl) failures.push("floating help button overlaps first actionable control");
  if (!r.hasAppShell) failures.push("SSI app shell primitives missing");
  if (!r.scannerCards) failures.push("scanner mobile/table structure missing");
  if (!r.portfolioMobile) failures.push("portfolio mobile summary/source audit missing");
  if (!r.modalA11y) failures.push("modal dialog accessibility attributes missing");
  if (consoleErrors.length > 0) failures.push(`console errors: ${consoleErrors.slice(0, 2).join(" | ")}`);
  return failures;
}

async function main() {
  const baseUrl = "http://127.0.0.1:4173";
  const preview = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"], {
    stdio: "ignore",
    shell: false,
  });
  try {
    await waitForServer(baseUrl);
    const outDir = path.join(process.cwd(), "reports", "ui", "responsive-audit");
    await fs.mkdir(outDir, { recursive: true });
    const browser: Browser = await chromium.launch();
    const rows: string[] = ["# Responsive UI Audit", "", `Base URL: ${baseUrl}`, ""];
    let failed = false;
    for (const [routeName, routePath] of routes) {
      for (const [width, height] of viewports) {
        const page = await browser.newPage({ viewport: { width, height } });
        const failures = await auditPage(page, `${baseUrl}${routePath}`);
        const screenshot = `${routeName}-${width}x${height}.png`;
        if (["landing", "dashboard-auth", "rankings", "trust", "watchlist-auth", "portfolio-auth"].includes(routeName) && [390, 1440].includes(width)) {
          await page.screenshot({ path: path.join(outDir, screenshot), fullPage: true });
        }
        await page.close();
        rows.push(`- ${routeName} ${width}x${height}: ${failures.length ? `FAIL (${failures.join("; ")})` : "PASS"}`);
        if (failures.length) failed = true;
      }
    }
    await browser.close();
    await fs.writeFile(path.join(process.cwd(), "reports", "ui", "33-premium-interface-rebuild-visual-qa.md"), `${rows.join("\n")}\n`);
    if (failed) throw new Error("Responsive audit failed");
  } finally {
    preview.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
