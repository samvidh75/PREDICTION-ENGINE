import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'reports', 'screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.SCREENSHOT_URL || 'http://127.0.0.1:5173';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '15000', 10);
const MAX_SHOTS = parseInt(process.env.MAX_SHOTS || '20', 10);
const LABEL = process.env.LABEL || 'task-progress';

let count = 0;
const routes = ['/', '/login', '/dashboard', '/markets', '/portfolio'];

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const results = [];
  for (const route of routes) {
    const label = `${LABEL}-${String(count).padStart(3, '0')}`;
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(500);
      const filePath = join(OUT_DIR, `${label}${route.replace(/\//g, '_') || '_root'}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      results.push({ route, filePath, success: true });
    } catch (err) {
      results.push({ route, error: err.message, success: false });
    }
  }
  await browser.close();

  const manifest = { timestamp: Date.now(), label, count, results };
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`[SCREENSHOT] #${count} captured ${results.filter(r => r.success).length}/${routes.length} routes`);
  return manifest;
}

async function loop() {
  console.log(`[WATCHER] Starting screenshot loop: every ${INTERVAL_MS}ms, max ${MAX_SHOTS} shots`);
  while (count < MAX_SHOTS) {
    await capture();
    count++;
    if (count < MAX_SHOTS) {
      await new Promise(r => setTimeout(r, INTERVAL_MS));
    }
  }
  console.log(`[WATCHER] Done — ${count} screenshot batches captured to ${OUT_DIR}`);
}

loop().catch(err => { console.error(err); process.exit(1); });
