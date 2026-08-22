/**
 * Prerender every PSE stock page as static, crawler-visible HTML.
 *
 * Reads real data from a running API, renders the design template through its
 * own dc-runtime in headless Chromium, strips the runtime, and writes the
 * finished markup to dist/public/stock/{SYMBOL}/index.html.
 *
 * Why static: PHISIX publishes end-of-day data (`as_of` is midnight PHT), so
 * prices move once a day. Regenerating daily matches the data's real cadence,
 * and serving pre-rendered files means crawlers and AI search engines see full
 * content without executing JavaScript.
 *
 *   npx tsx scripts/prerender/prerenderStockPages.ts --api=http://localhost:10000 --limit=5
 *   npx tsx scripts/prerender/prerenderStockPages.ts --api=http://localhost:10000
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import { serveDirectory, stripRuntime } from "./dcRenderer";
import { getCanonicalSymbols } from "../lib/canonical-symbols";
import { buildStockDetailProps, type StockApiResponse } from "../../src/frontend/prerender/stockDetailProps";
import { buildShellProps } from "../../src/frontend/prerender/shellProps";
import { injectSeoMeta } from "../../src/render/seoInjection";
import { resolveRouteMeta } from "../../src/frontend/seo/routeMeta";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const TEMPLATE_DIR = path.join(root, "public", "frontend", "templates");
const OUT_ROOT = path.join(root, "dist", "public", "stock");
const PAGE = "StockStory Stock Detail.dc.html";
const SEO_BASE_URL = process.env.VITE_APP_ORIGIN ?? "https://stockstory-india.com";

/** Concurrent browser pages. Chromium is launched once and reused. */
const CONCURRENCY = 6;

interface RunResult {
  symbol: string;
  ok: boolean;
  reason?: string;
  hasPrice: boolean;
  hasScore: boolean;
}

async function fetchStock(apiBase: string, symbol: string): Promise<StockApiResponse | null> {
  try {
    const res = await fetch(`${apiBase}/api/stock/${encodeURIComponent(symbol)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as StockApiResponse;
  } catch {
    return null;
  }
}

/** Render one symbol and write its static page. */
async function renderSymbol(
  browser: Browser,
  origin: string,
  symbol: string,
  api: StockApiResponse,
): Promise<RunResult> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${origin}/${encodeURIComponent(PAGE)}?props=${encodeURIComponent(symbol)}`, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });
    await page.waitForFunction(
      () => document.querySelector("h1")?.textContent?.trim().length ?? 0 > 0,
      undefined,
      { timeout: 45_000 },
    );

    // Bake the head tags in here. injectSeoMeta runs on the SPA-fallback
    // branch in startServer, which prerendered files never reach — without
    // this they ship with an empty <title> and no canonical, losing exactly
    // the crawler-facing metadata these pages exist to provide.
    const meta = resolveRouteMeta(`/stock/${symbol.toUpperCase()}`, {
      symbol: symbol.toUpperCase(),
      companyName: api.companyName ?? undefined,
      sector: api.sector ?? undefined,
      industry: api.industry ?? undefined,
    });
    const html = injectSeoMeta(
      stripRuntime(await page.content()),
      meta,
      SEO_BASE_URL,
      "STOCKEX",
    );
    const outDir = path.join(OUT_ROOT, symbol.toUpperCase());
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), html);

    // Confirm the company's own values actually reached the markup, rather
    // than the page rendering with design defaults.
    const name = api.companyName ?? symbol;
    return {
      symbol,
      ok: html.includes(name) && !html.includes("₱142.50"),
      hasPrice: typeof api.price?.current === "number",
      hasScore: typeof api.scores?.health === "number",
    };
  } catch (err) {
    return {
      symbol, ok: false, hasPrice: false, hasScore: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;

  const apiBase = (arg("api") ?? "http://localhost:10000").replace(/\/+$/, "");
  const limit = arg("limit");
  const only = arg("symbols");

  let symbols = only
    ? only.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : getCanonicalSymbols();
  if (limit) symbols = symbols.slice(0, Number(limit));

  console.log(`[prerender] ${symbols.length} symbol(s), api=${apiBase}`);

  // Fetch everything first: the browser should never wait on the network.
  //
  // Paced under the API's own 60 requests/minute limiter. An earlier unpaced
  // run at 8 concurrent got exactly 60 symbols through and 429 for the other
  // 222 — the prerender was rate-limiting itself, and the missing pages looked
  // like missing data. 4 per 4.5s is ~53/min, comfortably inside the window.
  const apiBySymbol = new Map<string, StockApiResponse>();
  const FETCH_BATCH = 4;
  const FETCH_GAP_MS = 4500;
  let fetched = 0;
  for (let i = 0; i < symbols.length; i += FETCH_BATCH) {
    const batch = symbols.slice(i, i + FETCH_BATCH);
    const results = await Promise.all(batch.map((s) => fetchStock(apiBase, s)));
    batch.forEach((s, j) => {
      const r = results[j];
      if (r) apiBySymbol.set(s, r);
    });
    fetched += batch.length;
    if (fetched % 40 === 0 || fetched >= symbols.length) {
      console.log(`[prerender] fetched ${Math.min(fetched, symbols.length)}/${symbols.length}`);
    }
    if (i + FETCH_BATCH < symbols.length) {
      await new Promise((r) => setTimeout(r, FETCH_GAP_MS));
    }
  }
  console.log(`[prerender] API returned data for ${apiBySymbol.size}/${symbols.length}`);
  if (apiBySymbol.size < symbols.length * 0.9) {
    console.warn(
      `[prerender] WARNING: ${symbols.length - apiBySymbol.size} symbol(s) returned no data. ` +
      `If the API logged 429s, the fetch pacing is above its rate limit.`,
    );
  }

  if (apiBySymbol.size === 0) {
    throw new Error(`No data from ${apiBase} — is the API running? (--api=<url>)`);
  }

  // One props entry per symbol; the static server swaps data-props per request.
  const propsByKey = new Map<string, unknown>();
  for (const [symbol, api] of apiBySymbol) {
    propsByKey.set(symbol, {
      ...buildShellProps({
        active: "Research",
        crumbs: [
          { label: "Home", href: "/" },
          { label: "Research", href: "/scanner" },
          ...(api.sector ? [{ label: api.sector, href: "/sectors" }] : []),
          { label: symbol.toUpperCase(), href: `/stock/${symbol.toUpperCase()}` },
        ],
        // Real index levels are not plumbed through yet; an empty tape is
        // preferable to the design's invented PSE Index figures.
        indices: [],
        marketOpen: null,
        closesAt: null,
      }),
      ...buildStockDetailProps(api),
    });
  }

  const server = await serveDirectory(TEMPLATE_DIR, propsByKey);
  const browser = await chromium.launch();
  const results: RunResult[] = [];

  try {
    const queue = [...apiBySymbol.keys()];
    let done = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        for (;;) {
          const symbol = queue.shift();
          if (!symbol) return;
          results.push(await renderSymbol(browser, server.origin, symbol, apiBySymbol.get(symbol)!));
          if (++done % 25 === 0 || done === apiBySymbol.size) {
            console.log(`[prerender] rendered ${done}/${apiBySymbol.size}`);
          }
        }
      }),
    );
  } finally {
    await browser.close();
    await server.close();
  }

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  console.log("\n── Summary ──────────────────────────");
  console.log(`  written        ${results.length}`);
  console.log(`  own data OK    ${ok.length}`);
  console.log(`  suspect        ${failed.length}`);
  console.log(`  with price     ${results.filter((r) => r.hasPrice).length}`);
  console.log(`  with score     ${results.filter((r) => r.hasScore).length}`);
  if (failed.length) {
    console.log("\n  suspect symbols:");
    for (const f of failed.slice(0, 20)) {
      console.log(`    ${f.symbol.padEnd(8)} ${f.reason ?? "design defaults may have rendered"}`);
    }
  }
  console.log(`\n[prerender] output: ${OUT_ROOT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
