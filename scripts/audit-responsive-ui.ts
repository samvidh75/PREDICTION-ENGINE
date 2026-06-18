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

async function auditPage(page: Page, url: string): Promise<string[]> {
  const failures: string[] = [];
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/Failed to load resource: the server responded with a status of 50[024]/.test(text)) return;
    consoleErrors.push(text);
  });
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
    const nav = document.querySelector("nav, header");
    const cta = document.querySelector("button, a");
    const rawToken = /\b(undefined|null|NaN|Infinity)\b/.test(bodyText);
    const secretToken = /\b(REDIS_URL|DATABASE_URL|FIREBASE_PRIVATE_KEY|INDIANAPI_KEY)\b/.test(bodyText);
    const oldPlain = document.querySelectorAll(".rounded-2xl").length > 0 && !document.querySelector(".ss-page, .ss-surface, .ss-dark-surface");
    return { overflow, hasNav: !!nav, hasCta: !!cta, rawToken, secretToken, oldPlain };
  });
  if (result.overflow > 8) failures.push(`horizontal overflow ${result.overflow}px`);
  if (!result.hasNav) failures.push("navigation missing");
  if (!result.hasCta) failures.push("no actionable control detected");
  if (result.rawToken) failures.push("raw undefined/null/NaN/Infinity visible");
  if (result.secretToken) failures.push("provider secret/env name visible");
  if (result.oldPlain) failures.push("premium surface selectors missing");
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
        if (["landing", "dashboard-auth", "rankings", "trust"].includes(routeName) && [390, 1440].includes(width)) {
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
