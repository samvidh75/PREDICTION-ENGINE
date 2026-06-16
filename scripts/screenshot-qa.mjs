import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'reports', 'screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.SCREENSHOT_URL || 'http://127.0.0.1:5173';

async function capture(label, queryParams = '', viewport = { width: 1440, height: 900 }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  const url = `${BASE_URL}/?${queryParams}`;
  const sizeLabel = `${viewport.width}x${viewport.height}`;
  const filePath = join(OUT_DIR, `${label}-${sizeLabel}.png`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(JSON.stringify({ success: true, path: filePath, label, url, viewport: sizeLabel }));
  } catch (err) {
    console.log(JSON.stringify({ success: false, error: err.message, label, url }));
  } finally {
    await browser.close();
  }
}

const routes = [
  { label: 'landing', params: 'page=landing' },
  { label: 'about', params: 'page=about' },
  { label: 'trust', params: 'page=trust' },
  { label: 'rankings', params: 'page=rankings' },
  { label: 'predictions', params: 'page=predictions' },
  { label: 'login', params: 'page=login' },
  { label: 'signup', params: 'page=signup' },
];

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

for (const route of routes) {
  for (const vp of viewports) {
    await capture(route.label, route.params, vp);
  }
}
