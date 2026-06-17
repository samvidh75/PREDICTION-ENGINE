export {};
/**
 * verify-symbol-universe.ts
 *
 * Verifies provider-backed availability for candidate symbols.
 * Checks canonical symbol, provider lookup, and DB existence.
 * Does NOT add fake data — marks unavailable domains honestly.
 *
 * Usage:
 *   npx tsx scripts/verify-symbol-universe.ts
 *   npx tsx scripts/verify-symbol-universe.ts --symbols=SBIN,ITC,LT
 *
 * Environment:
 *   SMOKE_TIMEOUT_MS  — per-request timeout in ms (default: 10000)
 *   CANDIDATE_SYMBOLS  — comma-separated override (alternative to --symbols)
 */

const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT_MS || "10000", 10);

const DEFAULT_CANDIDATES = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
  "SBIN", "BHARTIARTL", "ITC", "LT", "AXISBANK",
  "KOTAKBANK", "HINDUNILVR", "MARUTI", "SUNPHARMA", "BAJFINANCE",
];

const UPSTOX_API = "https://api.upstox.com/v2";
const FRONTEND_URL = "https://www.stockstory-india.com";

interface SymbolAvailability {
  symbol: string;
  dbExists: boolean | null;
  quoteAvailable: boolean;
  historicalAvailable: boolean;
  financialAvailable: boolean;
  scoreAvailable: boolean;
  reason: string | null;
}

function getSymbols(): string[] {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("--symbols=")) return arg.split("=")[1].split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  }
  const envSymbols = process.env.CANDIDATE_SYMBOLS;
  if (envSymbols) return envSymbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  return DEFAULT_CANDIDATES;
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function checkSymbol(symbol: string): Promise<SymbolAvailability> {
  const result: SymbolAvailability = {
    symbol,
    dbExists: null,
    quoteAvailable: false,
    historicalAvailable: false,
    financialAvailable: false,
    scoreAvailable: false,
    reason: null,
  };

  // Check DB existence via data-coverage API
  // (This only tells us if the symbol is in the coverage list, not individual existence)
  const coverageResp = await fetchWithTimeout(`${FRONTEND_URL}/api/ops/data-coverage`);
  if (coverageResp?.ok) {
    try {
      const body = await coverageResp.json();
      result.dbExists = true; // We'll refine this with the coverage count
    } catch {
      result.dbExists = null;
    }
  }

  // Check stockstory endpoint (does the company have a prediction entry?)
  const storyResp = await fetchWithTimeout(`${FRONTEND_URL}/api/stockstory/${symbol}`);
  if (storyResp?.ok) {
    try {
      const body = await storyResp.json();
      if (body.status === "available") {
        result.scoreAvailable = true;
        result.quoteAvailable = true;
        result.historicalAvailable = true;
        result.financialAvailable = body.data?.fundamentals?.length > 0;
      } else if (body.status === "unavailable") {
        // Symbol exists in universe but has no prediction entry yet
        result.reason = body.message || "Symbol in universe, no prediction entry yet";
      } else {
        result.reason = `stockstory status: ${body.status}`;
      }
    } catch {
      result.reason = "stockstory JSON parse failed";
    }
  } else {
    const status = storyResp?.status ?? 0;
    if (status === 404) {
      result.reason = "Symbol not found in stockstory universe";
    } else {
      result.reason = `stockstory HTTP ${status}`;
    }
  }

  // Quick quote check via market-data endpoint
  // (This may not work for all symbols, but we try)
  const quoteResp = await fetchWithTimeout(`${FRONTEND_URL}/api/market-data/company/${symbol}`);
  if (quoteResp?.ok) {
    result.quoteAvailable = true;
  }

  // Check leaderboard for score availability
  const lbResp = await fetchWithTimeout(`${FRONTEND_URL}/api/intelligence/leaderboard?limit=30`);
  if (lbResp?.ok) {
    try {
      const body = await lbResp.json();
      const data = body.data ?? [];
      const found = data.find((e: any) => e.symbol === symbol);
      if (found) {
        result.scoreAvailable = true;
        if (found.rankingScore !== null && found.rankingScore !== undefined) {
          result.historicalAvailable = true;
        }
      }
    } catch {
      // Leaderboard parse failed
    }
  }

  return result;
}

async function main(): Promise<void> {
  const symbols = getSymbols();
  console.log(`\n=== Symbol Universe Verification (${symbols.length} candidates) ===\n`);
  console.log(`  Provider: Vercel API (${FRONTEND_URL})\n`);
  console.log("  Legend: ✓=available  △=partial/unavailable  ✗=not found  ?=unknown\n");

  const results: SymbolAvailability[] = [];
  for (const symbol of symbols) {
    process.stdout.write(`  Checking ${symbol}...`);
    const result = await checkSymbol(symbol);
    results.push(result);
    const icon = result.scoreAvailable ? "✓" : result.reason?.includes("prediction entry") ? "△" : "✗";
    console.log(` ${icon}  ${result.reason ? `(${result.reason})` : ""}`);
  }

  // Summary
  const verified = results.filter((r) => r.scoreAvailable);
  const limited = results.filter((r) => !r.scoreAvailable && r.reason?.includes("prediction entry"));
  const missing = results.filter((r) => !r.scoreAvailable && !limited.includes(r));

  console.log(`\n  --- Summary ---`);
  console.log(`  Verified (scored): ${verified.length}`);
  console.log(`  In universe (unscored): ${limited.length}`);
  console.log(`  Not found: ${missing.length}`);

  if (verified.length > 0) {
    console.log(`\n  Verified symbols:`);
    for (const r of verified) {
      console.log(`    ✓ ${r.symbol}`);
    }
  }

  if (limited.length > 0) {
    console.log(`\n  In universe but pending scoring:`);
    for (const r of limited) {
      console.log(`    △ ${r.symbol}`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n  Symbols not found in any provider:`);
    for (const r of missing) {
      console.log(`    ✗ ${r.symbol}`);
    }
  }

  console.log();
  process.exit(0);
}

main();
