/**
 * Render public/og-image.svg to public/og-image.png at its native 1200x630.
 *
 * index.html references /og-image.png for og:image/twitter:image, but only
 * the .svg existed — social platforms (Facebook/LinkedIn/Slack in particular)
 * largely don't render SVG previews, so every share of the site showed no
 * image at all. Uses the Playwright Chromium already installed for this
 * repo's e2e tests rather than adding a new image-processing dependency.
 *
 *   npx tsx scripts/render-og-image.ts
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SRC = path.join(root, "public", "og-image.svg");
const OUT = path.join(root, "public", "og-image.png");
const WIDTH = 1200;
const HEIGHT = 630;

async function main() {
  const svg = readFileSync(SRC, "utf-8");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
    await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  } finally {
    await browser.close();
  }
  console.log(`Wrote ${OUT} (${WIDTH}x${HEIGHT})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
