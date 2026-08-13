import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto('http://103.211.56.127:80/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/live-home.png', fullPage: true });
await browser.close();
console.log('Screenshot saved to /tmp/live-home.png');
