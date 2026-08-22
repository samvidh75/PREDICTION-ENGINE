/**
 * Identity invariant: the prepared template, rendered with NO data supplied,
 * must produce exactly what the original design produces.
 *
 * This is the guard that makes "pixel-perfect" a checked property rather than
 * a hope. Every literal→binding conversion carries a default equal to the text
 * it replaced, so a zero-props render has to be indistinguishable from the
 * untouched design. If this fails, a conversion changed the output and the
 * design has been altered — stop and fix before injecting real data.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import { serveDirectory } from "./dcRenderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const ORIGINAL_DIR = path.join(root, "public", "frontend");
const TEMPLATE_DIR = path.join(root, "public", "frontend", "templates");
const OUT_DIR = path.join(root, "tmp-prerender-proof");
const PAGE = "StockStory Stock Detail.dc.html";

async function renderFor(
  browser: Browser,
  origin: string,
  label: string,
): Promise<{ text: string; shot: string }> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${origin}/${encodeURIComponent(PAGE)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const shot = path.join(OUT_DIR, `identity-${label}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  const text = (await page.innerText("body")).replace(/\s+/g, " ").trim();
  await page.close();
  return { text, shot };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const originalServer = await serveDirectory(ORIGINAL_DIR);
  const templateServer = await serveDirectory(TEMPLATE_DIR);
  const browser = await chromium.launch();

  try {
    const original = await renderFor(browser, originalServer.origin, "original");
    const prepared = await renderFor(browser, templateServer.origin, "prepared");

    const identical = original.text === prepared.text;
    console.log(`  original visible text: ${original.text.length} chars`);
    console.log(`  prepared visible text: ${prepared.text.length} chars`);
    console.log(`  IDENTICAL            : ${identical ? "YES" : "NO"}`);

    if (!identical) {
      const i = [...original.text].findIndex((c, idx) => c !== prepared.text[idx]);
      console.log(`\n  first divergence at char ${i}:`);
      console.log(`    original: ${JSON.stringify(original.text.slice(Math.max(0, i - 70), i + 70))}`);
      console.log(`    prepared: ${JSON.stringify(prepared.text.slice(Math.max(0, i - 70), i + 70))}`);
      process.exitCode = 1;
    }

    console.log(`\n  screenshots: ${original.shot}\n               ${prepared.shot}`);
    console.log(identical ? "\nIDENTITY INVARIANT HOLDS" : "\nIDENTITY BROKEN — do not proceed");
  } finally {
    await browser.close();
    await originalServer.close();
    await templateServer.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
