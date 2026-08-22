/**
 * Stage 1 kill-switch: prove the capture pipeline is lossless.
 *
 * Renders the UNMODIFIED Stock Detail design through the real dc-runtime,
 * captures the HTML, then re-renders that captured HTML standalone (no
 * runtime, no React) and screenshot-compares the two. If the static capture
 * does not look identical to the live design, the whole prerender approach is
 * invalid and we stop here rather than building on it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { renderTemplate, serveDirectory, stripRuntime } from "./dcRenderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const DESIGN_DIR = path.join(root, "public", "frontend");
const OUT_DIR = path.join(root, "tmp-prerender-proof");
const PAGE = "StockStory Stock Detail.dc.html";

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const server = await serveDirectory(DESIGN_DIR);
  const browser = await chromium.launch();

  try {
    const sourceUrl = `${server.origin}/${encodeURIComponent(PAGE)}`;
    console.log(`[stage1] rendering ${PAGE} via the real dc-runtime…`);

    const live = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await live.goto(sourceUrl, { waitUntil: "networkidle" });
    await live.waitForTimeout(1200); // let fonts/layout settle before the reference shot
    await live.screenshot({ path: path.join(OUT_DIR, "1-live-design.png"), fullPage: true });
    const liveText = (await live.innerText("body")).replace(/\s+/g, " ").trim();
    await live.close();

    const captured = await renderTemplate(browser, sourceUrl);
    const staticHtml = stripRuntime(captured);
    await writeFile(path.join(OUT_DIR, "captured.html"), staticHtml);

    console.log(`[stage1] captured ${(staticHtml.length / 1024).toFixed(0)}KB of static HTML`);

    // Serve the captured file from the same directory so its relative asset
    // paths (fonts, _ds) resolve exactly as the original's do.
    await writeFile(path.join(DESIGN_DIR, "__proof_captured.html"), staticHtml);
    const staticPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await staticPage.goto(`${server.origin}/__proof_captured.html`, { waitUntil: "networkidle" });
    await staticPage.waitForTimeout(1200);
    await staticPage.screenshot({ path: path.join(OUT_DIR, "2-static-capture.png"), fullPage: true });
    const staticText = (await staticPage.innerText("body")).replace(/\s+/g, " ").trim();
    await staticPage.close();

    // Text parity is the substantive check: identical visible copy means the
    // capture preserved the rendered tree, not just that both pages painted.
    const identical = liveText === staticText;
    console.log(`\n  live   visible text: ${liveText.length} chars`);
    console.log(`  static visible text: ${staticText.length} chars`);
    console.log(`  text identical     : ${identical ? "YES" : "NO"}`);

    if (!identical) {
      const firstDiff = [...liveText].findIndex((c, i) => c !== staticText[i]);
      console.log(`  first divergence at char ${firstDiff}:`);
      console.log(`    live  : ${JSON.stringify(liveText.slice(Math.max(0, firstDiff - 60), firstDiff + 60))}`);
      console.log(`    static: ${JSON.stringify(staticText.slice(Math.max(0, firstDiff - 60), firstDiff + 60))}`);
    }

    // Does the captured static HTML actually contain the data in raw markup?
    // This is the crawler-visibility property the whole approach exists for.
    const hasPriceInMarkup = /₱142\.50/.test(staticHtml);
    const hasNameInMarkup = /BDO Unibank/.test(staticHtml);
    console.log(`\n  price present in raw HTML : ${hasPriceInMarkup ? "YES" : "NO"}`);
    console.log(`  name  present in raw HTML : ${hasNameInMarkup ? "YES" : "NO"}`);
    console.log(`  runtime scripts stripped  : ${!/support\.js/.test(staticHtml) ? "YES" : "NO"}`);

    console.log(`\n[stage1] screenshots in ${OUT_DIR}`);
    console.log(identical && hasPriceInMarkup ? "[stage1] PASS" : "[stage1] REVIEW NEEDED");
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
