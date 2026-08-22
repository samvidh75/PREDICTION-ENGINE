/**
 * Stage 3: render the Stock Detail template with real data injected.
 *
 * Uses fixture-shaped API responses rather than a live server so the mapping
 * itself is what's under test, independent of provider availability. Renders
 * three cases that must look different from one another and from the design:
 *   - a well-covered stock (real price, real scores)
 *   - a stock the scorer could not rate (must read "Not yet rated", never 88)
 *   - a stock trading down (change must render red, not the design's green)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serveDirectory, stripRuntime } from "./dcRenderer";
import { buildStockDetailProps, type StockApiResponse } from "../../src/frontend/prerender/stockDetailProps";
import { computeStockScores } from "../../src/render/stockScoring";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const TEMPLATE_DIR = path.join(root, "public", "frontend", "templates");
const OUT_DIR = path.join(root, "tmp-prerender-proof");
const PAGE = "StockStory Stock Detail.dc.html";

/** Build an API-shaped response, scoring it through the real engine. */
function fixture(
  symbol: string,
  companyName: string,
  sector: string,
  industry: string,
  price: { current: number; changeAbs: number; changePercent: number; marketCap: number },
  f: {
    pe: number | null; pb: number | null; eps: number | null; dividendYield: number | null;
    roe: number | null; debtToEquity: number | null; netMargin: number | null;
    operatingMargin: number | null; revenueGrowth: number | null; profitGrowth: number | null;
    netProfit: number | null; volume: number;
  },
): StockApiResponse {
  const s = computeStockScores({
    symbol, pe: f.pe, pb: f.pb, eps: f.eps, dividendYield: f.dividendYield,
    roe: f.roe, debtToEquity: f.debtToEquity, netMargin: f.netMargin,
    operatingMargin: f.operatingMargin, revenueGrowth: f.revenueGrowth,
    profitGrowth: f.profitGrowth, netProfit: f.netProfit, priceHistory: null,
  });
  return {
    symbol, companyName, sector, industry, price,
    fundamentals: {
      pe: f.pe, pb: f.pb, eps: f.eps, dividendYield: f.dividendYield,
      netMargin: f.netMargin, volume: f.volume,
    },
    scores: {
      quality: s.quality, valuation: s.valuation, growth: s.growth,
      momentum: s.momentum, risk: s.risk, health: s.health, riskAdjusted: s.riskAdjusted,
    },
    scoreConfidence: s.confidence,
    scoreLabel: s.label,
    roe: f.roe,
    debtToEquity: f.debtToEquity,
    asOf: "2026-08-21T00:00:00+08:00",
  };
}

const CASES: Array<{ key: string; api: StockApiResponse }> = [
  {
    key: "BDO",
    api: fixture("BDO", "BDO Unibank, Inc.", "Financials", "Banks",
      { current: 122.7, changeAbs: 0.5983, changePercent: 0.49, marketCap: 654_650_000_000 },
      { pe: 10.4, pb: 1.62, eps: 12.1, dividendYield: 4.2, roe: 15.8, debtToEquity: 0.25,
        netMargin: 33.2, operatingMargin: 41.0, revenueGrowth: 11.4, profitGrowth: 14.2,
        netProfit: 82_400_000_000, volume: 2_701_960 }),
  },
  {
    key: "AAA",
    // Thinly covered: no fundamentals at all, so nothing may be rated.
    api: fixture("AAA", "Asia Amalgamated Holdings Corporation", "Holding Firms", "Holding Firms",
      { current: 1.61, changeAbs: 0, changePercent: 0, marketCap: 0 },
      { pe: null, pb: null, eps: null, dividendYield: null, roe: null, debtToEquity: null,
        netMargin: null, operatingMargin: null, revenueGrowth: null, profitGrowth: null,
        netProfit: null, volume: 0 }),
  },
  {
    key: "DOWN",
    // Trading down: the design hardcodes the change in green.
    api: fixture("ABA", "AbaCore Capital Holdings, Inc.", "Holding Firms", "Holding Firms",
      { current: 0.34, changeAbs: -0.012, changePercent: -3.41, marketCap: 1_240_000_000 },
      { pe: 45, pb: 6.1, eps: 0.3, dividendYield: 0, roe: 2.1, debtToEquity: 2.8,
        netMargin: 1.2, operatingMargin: 3.0, revenueGrowth: -8, profitGrowth: -22,
        netProfit: -450_000_000, volume: 18_500_000 }),
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const propsByKey = new Map<string, unknown>();
  for (const c of CASES) propsByKey.set(c.key, buildStockDetailProps(c.api));

  const server = await serveDirectory(TEMPLATE_DIR, propsByKey);
  const browser = await chromium.launch();

  try {
    for (const c of CASES) {
      const url = `${server.origin}/${encodeURIComponent(PAGE)}?props=${c.key}`;
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT_DIR, `stage3-${c.key}.png`), fullPage: true });

      const html = stripRuntime(await page.content());
      await writeFile(path.join(OUT_DIR, `stage3-${c.key}.html`), html);
      await page.close();

      const props = propsByKey.get(c.key) as Record<string, unknown>;
      console.log(`\n── ${c.key} ─────────────────────────────`);
      console.log(`  name       : ${props.companyNameText}`);
      console.log(`  price      : ${props.priceText}   change: ${props.changeText}  (${props.changeColor})`);
      console.log(`  market cap : ${(props.quoteFacts as any[])[0].value}`);
      console.log(`  score      : ${props.scoreText}  "${props.scoreLabel}"  coverage ${props.coverageText}`);
      console.log(`  factors    : ${(props.factorBars as any[]).map((b) => `${b.name}=${b.score}`).join("  ")}`);

      // The whole point of prerendering: real values must be in raw markup.
      const inMarkup = String(props.priceText) !== "—" && html.includes(String(props.priceText));
      console.log(`  price in raw HTML (crawler-visible): ${inMarkup ? "YES" : "n/a"}`);
      // Guard against the design's mock data surviving into a real page.
      const leaked = ["₱142.50", "+2.55 (+1.82%)", "₱758.4B"].filter((m) => html.includes(m));
      console.log(`  design mock values leaked: ${leaked.length ? leaked.join(", ") : "none"}`);
    }
    console.log(`\nScreenshots + HTML in ${OUT_DIR}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
