import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'reports', 'screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.SCREENSHOT_URL || 'http://127.0.0.1:5173';

async function takeScreenshot(label, queryParams = '') {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const url = `${BASE_URL}/?${queryParams}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const filePath = join(OUT_DIR, `${label}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(JSON.stringify({ success: true, path: filePath, label, url }));
  } catch (err) {
    console.log(JSON.stringify({ success: false, error: err.message, label, url }));
  } finally {
    await browser.close();
  }
}

const pages = [
  { label: 'landing', params: 'page=landing' },
  { label: 'login', params: 'page=login' },
  { label: 'signup', params: 'page=signup' },
  { label: 'about', params: 'page=about' },
  { label: 'trust', params: 'page=trust' },
  { label: 'methodology', params: 'page=methodology' },
  { label: 'predictions', params: 'page=predictions' },
  { label: 'rankings', params: 'page=rankings' },
];

const specific = process.argv[2];
if (specific) {
  const found = pages.find(p => p.label === specific);
  if (found) {
    await takeScreenshot(found.label, found.params);
  } else {
    await takeScreenshot(specific, `page=${specific}`);
  }
} else {
  for (const p of pages) {
    await takeScreenshot(p.label, p.params);
  }
}
