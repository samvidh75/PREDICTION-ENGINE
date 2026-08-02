export {};
/**
 * verify-symbol-universe.ts
 *
 * Verifies provider-backed availability for candidate symbols via production API.
 * Checks quote availability, metadata, stockstory universe membership.
 * Does NOT add fake data — marks unavailable domains honestly.
 *
 * Usage:
 *   npx tsx scripts/verify-symbol-universe.ts
 *   npx tsx scripts/verify-symbol-universe.ts --symbols=SBIN,ITC,LT
 *
 * Environment:
 *   SMOKE_TIMEOUT_MS  — per-request timeout in ms (default: 10000)
 */

const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT_MS || "10000", 10);

const DEFAULT_CANDIDATES = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "BHARTIARTL",
  "SBIN", "ITC", "LT", "AXISBANK", "KOTAKBANK", "HINDUNILVR",
  "MARUTI", "SUNPHARMA", "BAJFINANCE", "HCLTECH", "WIPRO",
  "ASIANPAINT", "ULTRACEMCO", "TITAN", "NTPC", "POWERGRID",
  "M&M", "ADANIENT", "ADANIPORTS", "TATASTEEL", "JSWSTEEL",
  "COALINDIA", "ONGC", "NESTLEIND", "TECHM",
];

const FRONTEND_URL = "https://www.stockstory-india.com";

interface SymbolStatus {
  symbol: string;
  companyName: string | null;
  inDb: boolean;
  quoteAvailable: boolean;
  metadataAvailable: boolean;
  scoreAvailable: boolean;
  providerSource: string | null;
  unavailableReason: string | null;
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

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return null;
    return await resp.json() as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStatus(url: string): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    return resp.status;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function checkSymbol(symbol: string): Promise<SymbolStatus> {
  const result: SymbolStatus = {
    symbol,
    companyName: null,
    inDb: false,
    quoteAvailable: false,
    metadataAvailable: false,
    scoreAvailable: false,
    providerSource: null,
    unavailableReason: null,
  };

  // 1. Check quote availability
  const quoteStatus = await fetchStatus(`${FRONTEND_URL}/api/market-data/quote/${symbol}`);
  if (quoteStatus === 200) {
    result.quoteAvailable = true;
    result.providerSource = "IndianAPI/Yahoo";
  }

  // 2. Check metadata availability (company name, sector)
  const meta = await fetchJson(`${FRONTEND_URL}/api/market-data/metadata/${symbol}`);
  if (meta && meta.symbol) {
    result.metadataAvailable = true;
    result.companyName = (meta.companyName as string) || null;
    result.providerSource = "IndianAPI";
  }

  // 3. Check stockstory universe membership
  const story = await fetchJson(`${FRONTEND_URL}/api/stockstory/${symbol}`);
  if (story) {
    const status = story.status as string;
    if (status === "available") {
      result.scoreAvailable = true;
      result.inDb = true;
    } else if (status === "unavailable") {
      result.inDb = true; // symbol is in DB but has no prediction entry
      const msg = story.message as string;
      result.unavailableReason = msg || "In universe, no prediction entry";
    }
  }

  // 4. Check leaderboard for score availability
  const lb = await fetchJson(`${FRONTEND_URL}/api/intelligence/leaderboard?limit=50`);
  if (lb) {
    const data = (lb as any).data ?? [];
    const found = data.find((e: any) => e.symbol === symbol);
    if (found) {
      result.scoreAvailable = true;
      result.inDb = true;
      if (result.companyName && !result.companyName.startsWith(symbol)) {
        result.companyName = found.companyName || result.companyName;
      }
    }
  }

  // Determine final classification
  if (!result.quoteAvailable && !result.metadataAvailable) {
    result.unavailableReason = result.unavailableReason || "No provider data available for this symbol";
  } else if (!result.inDb) {
    result.unavailableReason = "Provider data available — not yet indexed in DB. Can be added via pipeline.";
  }

  return result;
}

async function main(): Promise<void> {
  const symbols = getSymbols();
  console.log(`\n=== Symbol Universe Verification (${symbols.length} candidates) ===\n`);

  const results: SymbolStatus[] = [];
  for (const symbol of symbols) {
    process.stdout.write(`  ${symbol}...`);
    const result = await checkSymbol(symbol);
    results.push(result);

    const flags: string[] = [];
    if (result.scoreAvailable) flags.push("scored");
    if (result.quoteAvailable) flags.push("quote");
    if (result.metadataAvailable) flags.push("meta");
    if (result.inDb && !result.scoreAvailable) flags.push("in_db");
    const flagStr = flags.length > 0 ? ` [${flags.join(",")}]` : "";

    if (result.scoreAvailable) {
      const name = result.companyName ? ` (${result.companyName})` : "";
      console.log(` ✓${flagStr}${name}`);
    } else if (result.quoteAvailable || result.metadataAvailable) {
      const reason = result.unavailableReason ? ` — ${result.unavailableReason}` : "";
      console.log(` △${flagStr}${reason}`);
    } else {
      const reason = result.unavailableReason ? ` — ${result.unavailableReason}` : "";
      console.log(` ✗${reason}`);
    }
  }

  // Summary
  const scored = results.filter((r) => r.scoreAvailable);
  const ingestible = results.filter((r) => !r.scoreAvailable && (r.quoteAvailable || r.metadataAvailable));
  const unavailable = results.filter((r) => !r.scoreAvailable && !r.quoteAvailable && !r.metadataAvailable);

  console.log(`\n  --- Summary ---`);
  console.log(`  Total candidates:     ${symbols.length}`);
  console.log(`  Already scored:       ${scored.length}`);
  console.log(`  Ingestible (new):     ${ingestible.length}`);
  console.log(`  Unavailable:          ${unavailable.length}`);

  if (scored.length > 0) {
    console.log(`\n  Already scored:`);
    for (const r of scored) console.log(`    ✓ ${r.symbol}  ${r.companyName ? `(${r.companyName})` : ""}`);
  }

  if (ingestible.length > 0) {
    console.log(`\n  Ready for ingestion (real provider data exists):`);
    for (const r of ingestible) console.log(`    △ ${r.symbol}  ${r.companyName ? `(${r.companyName})` : ""}`);
  }

  if (unavailable.length > 0) {
    console.log(`\n  Unavailable (no provider data):`);
    for (const r of unavailable) console.log(`    ✗ ${r.symbol}  ${r.unavailableReason ? `(${r.unavailableReason})` : ""}`);
  }

  console.log();
  process.exit(0);
}

main();
