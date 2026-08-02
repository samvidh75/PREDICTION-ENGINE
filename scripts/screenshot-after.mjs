import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../.tmp/part-bd-after");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const ROUTES = [
  { name: "home", page: "dashboard" },
  { name: "stock-chennpetro", page: "stock", id: "CHENNPETRO" },
  { name: "stock-itc", page: "stock", id: "ITC" },
  { name: "stock-reliance", page: "stock", id: "RELIANCE" },
  { name: "stock-tcs", page: "stock", id: "TCS" },
  { name: "scanner", page: "scanner" },
  { name: "rankings", page: "rankings" },
  { name: "compare", page: "compare" },
  { name: "watchlist", page: "watchlist" },
  { name: "portfolio", page: "portfolio" },
  { name: "alerts", page: "alerts" },
  { name: "methodology", page: "methodology" },
  { name: "login", page: "login" },
  { name: "create-account", page: "signup" },
  { name: "about", page: "about" },
];

async function main() {
  console.log("Starting Vite preview server...");
  
  const serverProcess = spawn("npx", ["vite", "preview", "--port", "4174", "--strictPort"], {
    stdio: "pipe",
    shell: true,
  });

  await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), 8000);
    const handler = (data) => {
      const text = data.toString();
      if (text.includes("Local") || text.includes("127.0.0.1")) {
        clearTimeout(timer);
        resolve();
      }
    };
    serverProcess.stdout.on("data", handler);
    serverProcess.stderr.on("data", handler);
  });

  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
    const page = await context.newPage();

    for (const route of ROUTES) {
      let url = `http://localhost:4174/?page=${route.page}`;
      if (route.id) url += `&id=${route.id}`;
      const filename = `${route.name}_${vp.width}x${vp.height}.png`;
      const filepath = path.join(OUT, filename);
      
      try {
        console.log(`  ${route.name} @ ${vp.width}x${vp.height}...`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: filepath, fullPage: true });
        results.push({ route: route.name, viewport: `${vp.width}x${vp.height}`, status: "ok" });
      } catch (err) {
        console.error(`  FAIL ${route.name} @ ${vp.width}x${vp.height}: ${err.message}`);
        results.push({ route: route.name, viewport: `${vp.width}x${vp.height}`, status: "error", error: err.message });
      }
    }

    // Special states: invest sheet, command palette, mobile nav, mobile nav open
    // Only capture these on mobile viewports
    if (vp.width <= 430) {
      // Mobile nav open
      try {
        console.log(`  mobile-nav-open @ ${vp.width}x${vp.height}...`);
        await page.goto(`http://localhost:4174/?page=dashboard`, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(500);
        // Click the menu button (last button in bottom nav)
        const menuBtn = page.locator('button[aria-label="Toggle menu"]');
        if (await menuBtn.isVisible()) {
          await menuBtn.click();
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(OUT, `mobile-nav-open_${vp.width}x${vp.height}.png`), fullPage: true });
          results.push({ route: "mobile-nav-open", viewport: `${vp.width}x${vp.height}`, status: "ok" });
        }
      } catch (err) {
        console.error(`  FAIL mobile-nav-open @ ${vp.width}x${vp.height}: ${err.message}`);
      }

      // Command palette - try with Cmd+K
      try {
        console.log(`  command-palette @ ${vp.width}x${vp.height}...`);
        await page.goto(`http://localhost:4174/?page=dashboard`, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(500);
        // Try to trigger Cmd+K
        await page.keyboard.press("Meta+k");
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT, `command-palette_${vp.width}x${vp.height}.png`), fullPage: true });
        results.push({ route: "command-palette", viewport: `${vp.width}x${vp.height}`, status: "ok" });
      } catch (err) {
        console.error(`  FAIL command-palette @ ${vp.width}x${vp.height}: ${err.message}`);
      }

      // Invest sheet open
      try {
        console.log(`  invest-sheet @ ${vp.width}x${vp.height}...`);
        await page.goto(`http://localhost:4174/?page=invest&id=RELIANCE`, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(OUT, `invest-sheet_${vp.width}x${vp.height}.png`), fullPage: true });
        results.push({ route: "invest-sheet", viewport: `${vp.width}x${vp.height}`, status: "ok" });
      } catch (err) {
        console.error(`  FAIL invest-sheet @ ${vp.width}x${vp.height}: ${err.message}`);
      }
    }
    
    await context.close();
  }

  await browser.close();
  serverProcess.kill("SIGTERM");

  const ok = results.filter(r => r.status === "ok").length;
  const fail = results.filter(r => r.status !== "ok").length;
  console.log(`\n=== ${ok} OK, ${fail} FAIL ===`);
  
  fs.writeFileSync(path.join(OUT, "_results.json"), JSON.stringify(results, null, 2));
  console.log(`Results: ${path.join(OUT, "_results.json")}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
