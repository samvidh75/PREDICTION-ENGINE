import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const LIVE_URL = "https://www.stockstory-india.com";
const LOCAL_URL = "http://127.0.0.1:4173";
const OUT_DIR = resolve(".tmp/part-av-before");

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
  { name: "compare", path: "/?page=compare" },
  { name: "watchlist", path: "/?page=watchlist" },
  { name: "portfolio", path: "/?page=portfolio" },
  { name: "alerts", path: "/?page=alerts" },
  { name: "methodology", path: "/?page=methodology" },
  { name: "pricing", path: "/?page=pricing" },
  { name: "stock-RELIANCE", path: "/?page=stock&id=RELIANCE" },
  { name: "stock-TCS", path: "/?page=stock&id=TCS" },
  { name: "stock-INFY", path: "/?page=stock&id=INFY" },
  { name: "stock-HDFCBANK", path: "/?page=stock&id=HDFCBANK" },
  { name: "stock-ITC", path: "/?page=stock&id=ITC" },
  { name: "stock-HINDUNILVR", path: "/?page=stock&id=HINDUNILVR" },
  { name: "stock-LT", path: "/?page=stock&id=LT" },
  { name: "mobile-nav", path: "/" },
];

async function captureForBase(baseUrl: string, label: string) {
  const baseOut = resolve(OUT_DIR, label);
  await mkdir(baseOut, { recursive: true });
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
          const url = `${baseUrl}${route.path}`;
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.waitForTimeout(2000);

          if (route.name === "mobile-nav") {
            const menuBtn = page.locator("button:has(svg.lucide-menu), [aria-label*='Menu'], button:has-text('☰')").first();
            if (await menuBtn.isVisible().catch(() => false)) {
              await menuBtn.click();
              await page.waitForTimeout(500);
            }
          }

          const filePath = resolve(baseOut, `${route.name}-${vp.width}x${vp.height}.png`);
          await page.screenshot({ path: filePath, fullPage: false });

          const content = await page.evaluate(() => document.body.innerText.substring(0, 100));
          const hasData = content.length > 10;
          console.log(`[${hasData ? "OK" : "EMPTY"}] ${label}/${route.name} ${vp.width}x${vp.height} errors=${errors.length}`);
          pass++;
        } catch (e: any) {
          console.log(`[FAIL] ${label}/${route.name} ${vp.width}x${vp.height}: ${e.message}`);
          fail++;
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  return { pass, fail, label };
}

async function main() {
  console.log("=== Part AV Audit - Capturing screenshots ===\n");

  const results: Array<{ label: string; pass: number; fail: number }> = [];

  console.log("--- Local app ---");
  const local = await captureForBase("http://127.0.0.1:4173", "local");
  results.push(local);

  console.log("\n--- Live production ---");
  const live = await captureForBase(LIVE_URL, "live");
  results.push(live);

  console.log("\n=== Results ===");
  for (const r of results) {
    console.log(`${r.label}: ${r.pass} passed, ${r.fail} failed`);
  }

  if (results.some(r => r.fail > 0)) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
