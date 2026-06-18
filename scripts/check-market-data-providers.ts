export {};
/**
 * check-market-data-providers.ts
 *
 * Domain-level market data provider diagnostic.
 * Tests public/no-credential providers: IndianAPI, Jugaad-Data, NSEPython, Yahoo.
 * Reports health per provider with domain-level granularity.
 *
 * Usage:
 *   npx tsx scripts/check-market-data-providers.ts
 *
 * Exits non-zero only for script/code failure, not for optional missing provider.
 */

import { PublicMarketDataProviderBroker } from '../src/providers/publicMarketData/providerBroker';
import type { ProviderDomain, PublicProviderId } from '../src/providers/publicMarketData/types';

const DOMAIN_LABELS: Record<string, string> = {
  quote: "Quote",
  historical: "Historical",
  bhavcopy: "Bhavcopy",
  index: "Index",
  fundamentals: "Fundamentals",
  macro: "Macro",
};

function domainIcon(status: string): string {
  if (status === "healthy" || status === "active") return "✓";
  if (status === "missing_optional") return "⊘";
  if (status === "degraded" || status === "partial") return "△";
  return "✗";
}

async function main(): Promise<void> {
  console.log("=== Market Data Provider Health ===\n");

  const broker = new PublicMarketDataProviderBroker();

  // --- Per-provider health ---
  const healths = await broker.checkAllProviders();
  for (const h of healths) {
    const icon = domainIcon(h.status);
    const detail = h.latencyMs != null ? ` (${h.latencyMs}ms)` : "";
    console.log(`${icon} ${h.provider}=${h.status}${detail}`);
  }

  // --- IndianAPI (env-dependent) ---
  const indianApiStatus = process.env.INDIANAPI_KEY ? "healthy" : "missing_optional";
  const iaIcon = domainIcon(indianApiStatus);
  console.log(`${iaIcon} indianapi=${indianApiStatus} (config)`);

  console.log("");

  // --- Domain-level health matrix ---
  console.log("--- Domain Health Matrix ---");
  const domains: ProviderDomain[] = ["quote", "historical", "bhavcopy", "index", "fundamentals", "macro"];
  for (const domain of domains) {
    const precedence = broker.getDomainPrecedence(domain);
    const statuses = await Promise.all(
      precedence.map(async (pid) => {
        const health = await broker.getProviderHealth(pid as PublicProviderId);
        return `${pid}=${health?.status ?? "unavailable"}`;
      }),
    );
    console.log(`  ${DOMAIN_LABELS[domain] || domain}: ${statuses.join(" → ")}`);
  }

  // --- Quote Fallback Test ---
  console.log("\n--- Quote Fallback: RELIANCE ---");
  const quoteResult = await broker.getQuote("RELIANCE");
  if (quoteResult.data) {
    console.log(`✓ provider=${quoteResult.provider} price=${quoteResult.data.lastPrice} latency=${quoteResult.latencyMs}ms`);
  } else {
    console.log(`△ unavailable: ${quoteResult.error}`);
  }

  // --- Historical Fallback Test ---
  console.log("\n--- Historical Fallback: RELIANCE (last 5 days) ---");
  const today = new Date();
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const histResult = await broker.getHistoricalDaily(
    "RELIANCE",
    fiveDaysAgo.toISOString().split("T")[0],
    today.toISOString().split("T")[0],
  );
  if (histResult.data && histResult.data.length > 0) {
    console.log(`✓ provider=${histResult.provider} candles=${histResult.data.length} latency=${histResult.latencyMs}ms`);
  } else {
    console.log(`△ unavailable: ${histResult.error}`);
  }

  // --- Env status for Jugaad/NSEPython ---
  console.log("\n--- Feature Flag Status ---");
  const jugaadFlag = process.env.JUGAD_DATA_ENABLED === "true";
  const nsepythonFlag = process.env.NSEPYTHON_ENABLED === "true";
  console.log(`  JUGAD_DATA_ENABLED=${jugaadFlag ? "true (active)" : "false/not set (configured off)"}`);
  console.log(`  NSEPYTHON_ENABLED=${nsepythonFlag ? "true (active)" : "false/not set (configured off)"}`);
  console.log(`  NSELIB=archived (not active)`);
  const yahooHealth = healths.find((h) => h.provider === "yahoo");
  console.log(`  YAHOO=${yahooHealth?.status ?? "unavailable"} (optional fallback, not primary)`);

  // --- Summary ---
  console.log("\n=== Summary ===");
  const yahooQuoteOk = quoteResult.provider === "yahoo" && !!quoteResult.data;
  const yahooHistOk = histResult.provider === "yahoo" && !!histResult.data?.length;
  const yahooDetail = yahooQuoteOk || yahooHistOk
    ? `Reachable fallback${yahooQuoteOk ? " quote" : ""}${yahooQuoteOk && yahooHistOk ? " +" : ""}${yahooHistOk ? " historical" : ""}; optional and may be delayed/stale`
    : `Unavailable or blocked${yahooHealth?.status ? ` — ${yahooHealth.status}` : ""}`;
  console.log("  ✓ IndianAPI: Active for quotes (when configured)");
  console.log(`  ${jugaadFlag ? "✓" : "⊘"} Jugaad-Data: ${jugaadFlag ? "Active" : "Configured off"} — bhavcopy, RBI, market_status`);
  console.log(`  ${nsepythonFlag ? "✓" : "⊘"} NSEPython: ${nsepythonFlag ? "Active" : "Configured off"} — index_quote, bhavcopy`);
  console.log(`  ${yahooQuoteOk || yahooHistOk ? "✓" : "△"} Yahoo: ${yahooDetail}`);
  console.log("  △ Fundamentals: Partial via DB snapshots + CSV/manual import");
  console.log("  △ CSV Import: Manual fundamentals fallback");
  console.log("  ⊘ NSELib: Archived/unusable, not active");
  console.log("  ✓ Redis: Infrastructure cache");
  console.log("  ✗ Dhan/Upstox/Finnhub: Not active");
  console.log("");

  // Ensure we don't exit non-zero for expected states
  process.exitCode = 0;
}

main().catch((err) => {
  console.error("Provider check failed:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
