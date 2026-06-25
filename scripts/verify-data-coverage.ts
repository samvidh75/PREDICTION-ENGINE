/**
 * verify-data-coverage.ts
 *
 * Checks actual data coverage by querying the Railway backend directly.
 * Reports symbol coverage, price/candle/fundamentals availability.
 *
 * Usage:
 *   npx tsx scripts/verify-data-coverage.ts
 *
 * Environment:
 *   RAILWAY_URL  — backend URL (default: https://prediction-engine-production-f7a8.up.railway.app)
 *   FRONTEND_URL — frontend URL (default: https://www.stockstory-india.com)
 */

export {};

const RAILWAY = process.env.RAILWAY_URL || "https://prediction-engine-production-f7a8.up.railway.app";
const FRONTEND = process.env.FRONTEND_URL || "https://www.stockstory-india.com";

const TARGET_SYMBOLS = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "ITC",
  "HINDUNILVR", "LT", "BHARTIARTL", "KOTAKBANK", "AXISBANK", "BAJFINANCE",
  "ASIANPAINT", "MARUTI", "SUNPHARMA", "TITAN", "ULTRACEMCO", "WIPRO", "ONGC",
];

interface CoverageRow {
  symbol: string;
  backendReachable: boolean;
  priceAvailable: boolean;
  profileAvailable: boolean;
  fundamentalsAvailable: boolean;
  stockstoryAvailable: boolean;
  healthScore: number | null;
  sector: string | null;
  classification: string | null;
  responseMs: number;
  error: string | null;
}

async function checkEndpoint(url: string, timeoutMs = 10000): Promise<{ ok: boolean; data: any; ms: number }> {
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const ms = Date.now() - start;
    if (!res.ok) return { ok: false, data: null, ms };
    const text = await res.text();
    try { return { ok: true, data: JSON.parse(text), ms }; }
    catch { return { ok: false, data: null, ms }; }
  } catch (e: any) {
    return { ok: false, data: null, ms: Date.now() - start };
  } finally { clearTimeout(timer); }
}

async function main() {
  console.log("=== StockStory Data Coverage Verification ===\n");
  console.log(`Railway backend: ${RAILWAY}`);
  console.log(`Frontend: ${FRONTEND}\n`);

  // Check backend health
  const health = await checkEndpoint(`${RAILWAY}/api/ops/health`);
  const h = health.data?.metrics || {};
  console.log("Backend health:");
  console.log(`  status: ${health.data?.status || "unreachable"}`);
  console.log(`  symbols_covered: ${h.symbols_covered ?? "?"}`);
  console.log(`  db_health: ${h.db_health || "?"}`);
  console.log(`  predictions_today: ${h.predictions_today ?? "?"}`);
  console.log(`  pipeline_freshness: ${h.pipeline_freshness || "?"}`);
  console.log(`  response_ms: ${h.response_ms ?? "?"}\n`);

  const rows: CoverageRow[] = [];
  for (const sym of TARGET_SYMBOLS) {
    const price = await checkEndpoint(`${RAILWAY}/api/market/stock/${sym}/price`);
    const profile = await checkEndpoint(`${RAILWAY}/api/market/stock/${sym}/profile`);
    const funda = await checkEndpoint(`${RAILWAY}/api/market/stock/${sym}/fundamentals`);
    const stockstory = await checkEndpoint(`${RAILWAY}/api/stockstory/${sym}`);

    rows.push({
      symbol: sym,
      backendReachable: price.ok || profile.ok || funda.ok || stockstory.ok,
      priceAvailable: price.ok && price.data?.data !== null,
      profileAvailable: profile.ok && profile.data?.data !== null,
      fundamentalsAvailable: funda.ok && funda.data?.data !== null,
      stockstoryAvailable: stockstory.ok && stockstory.data?.status === "ok",
      healthScore: stockstory.data?.data?.healthScore ?? null,
      sector: stockstory.data?.data?.sector ?? null,
      classification: stockstory.data?.data?.classification ?? null,
      responseMs: Math.max(price.ms, profile.ms, funda.ms, stockstory.ms),
      error: [price, profile, funda, stockstory].find(r => !r.ok)?.data?.message || null,
    });
  }

  // Coverage summary
  const withPrice = rows.filter(r => r.priceAvailable).length;
  const withProfile = rows.filter(r => r.profileAvailable).length;
  const withFundamentals = rows.filter(r => r.fundamentalsAvailable).length;
  const withStockstory = rows.filter(r => r.stockstoryAvailable).length;
  const withHealth = rows.filter(r => r.healthScore !== null).length;

  console.log("\nCoverage results:");
  console.log(`  Symbols checked: ${rows.length}`);
  console.log(`  Backend reachable: ${rows.filter(r => r.backendReachable).length}/${rows.length}`);
  console.log(`  With price data: ${withPrice}`);
  console.log(`  With profile data: ${withProfile}`);
  console.log(`  With fundamentals data: ${withFundamentals}`);
  console.log(`  With stockstory data: ${withStockstory}`);
  console.log(`  With health score: ${withHealth}`);

  if (withPrice === 0 && withProfile === 0 && withFundamentals === 0 && withStockstory === 0) {
    console.log("\n⚠ No data available for tested symbols. Database likely not populated.");
    console.log("  Verify: DATABASE_URL in Railway, migrations run, ingestion pipeline triggered.");
  }

  console.log("\nPer-symbol breakdown:");
  for (const r of rows) {
    const fields = [
      r.priceAvailable ? "price" : null,
      r.profileAvailable ? "profile" : null,
      r.fundamentalsAvailable ? "fundamentals" : null,
      r.stockstoryAvailable ? `stockstory(${r.healthScore})` : null,
    ].filter(Boolean);
    console.log(`  ${r.symbol}: ${fields.join(", ") || "no data"} ${r.error ? `[${r.error}]` : ""}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
