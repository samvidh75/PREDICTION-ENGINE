import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const BASE_URL = "http://127.0.0.1:4173";
const OUT_DIR = resolve(".tmp/part-at-before");

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const ROUTES = [
  { name: "landing", path: "/" },
  { name: "home", path: "/?page=home" },
  { name: "scanner", path: "/?page=scanner" },
  { name: "rankings", path: "/?page=rankings" },
  { name: "search", path: "/?page=search" },
  { name: "watchlist", path: "/?page=watchlist" },
  { name: "compare", path: "/?page=compare" },
  { name: "portfolio", path: "/?page=portfolio" },
  { name: "alerts", path: "/?page=alerts" },
  { name: "methodology", path: "/?page=methodology" },
  { name: "pricing", path: "/?page=pricing" },
  { name: "stock-RELIANCE", path: "/?page=stock&id=RELIANCE" },
  { name: "stock-TCS", path: "/?page=stock&id=TCS" },
  { name: "stock-INFY", path: "/?page=stock&id=INFY" },
  { name: "stock-HDFCBANK", path: "/?page=stock&id=HDFCBANK" },
  { name: "stock-ICICIBANK", path: "/?page=stock&id=ICICIBANK" },
  { name: "stock-SBIN", path: "/?page=stock&id=SBIN" },
  { name: "stock-ITC", path: "/?page=stock&id=ITC" },
  { name: "stock-HINDUNILVR", path: "/?page=stock&id=HINDUNILVR" },
  { name: "stock-LT", path: "/?page=stock&id=LT" },
  { name: "stock-BHARTIARTL", path: "/?page=stock&id=BHARTIARTL" },
  { name: "mobile-nav", path: "/?page=scanner" },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  let pass = 0, fail = 0;

  try {
    for (const route of ROUTES) {
      for (const vp of VIEWPORTS) {
        if (route.name === "mobile-nav" && vp.width > 430) continue;

        const context = await browser.newContext({ viewport: vp });
        const page = await context.newPage();
        const errors: string[] = [];

        page.on("console", (msg) => {
          if (msg.type() === "error") errors.push(msg.text());
        });

        try {
          await page.goto(`${BASE_URL}${route.path}`, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });
          await page.waitForTimeout(1500);

          if (route.name === "mobile-nav") {
            const menuBtn = page.locator("button:has(svg.lucide-menu), [aria-label*='Menu']").first();
            if (await menuBtn.isVisible()) await menuBtn.click();
            await page.waitForTimeout(500);
          }

          const filePath = resolve(OUT_DIR, `${route.name}-${vp.width}x${vp.height}.png`);
          await page.screenshot({ path: filePath, fullPage: false });
          console.log(`[PASS] ${route.name} ${vp.width}x${vp.height} errors=${errors.length}`);
          pass++;
        } catch (e: any) {
          console.log(`[FAIL] ${route.name} ${vp.width}x${vp.height}: ${e.message}`);
          fail++;
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nResults: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
