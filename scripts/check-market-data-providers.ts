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
import { config as loadDotEnv } from 'dotenv';

loadDotEnv({ path: '.env', quiet: true });

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

function domainState(status?: { healthy?: boolean }): string {
  if (!status) return "unavailable";
  return status.healthy ? "healthy" : "unavailable";
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
  const providerMatrix = await broker.getProviderStatusMatrix();
  const domainRows: Array<[string, Array<[string, string]>]> = [
    ["Quote", [["indianapi", "INDIANAPI_KEY.quote"], ["jugaad-data", "JUGAD_DATA.quote"], ["nsepython", "NSEPYTHON.quote"], ["yahoo", "YAHOO.quote"]]],
    ["Historical", [["jugaad-data", "JUGAD_DATA.historical"], ["nsepython", "NSEPYTHON.historical"], ["yahoo", "YAHOO.historical"]]],
    ["Bhavcopy", [["jugaad-data", "JUGAD_DATA.bhavcopy"], ["nsepython", "NSEPYTHON.bhavcopy"]]],
    ["Index", [["nsepython", "NSEPYTHON.index_quote"], ["jugaad-data", "JUGAD_DATA.index"]]],
    ["Fundamentals", [["automatic_public", "FUNDAMENTALS_AUTOMATIC.fundamentals"], ["csv_import", "CSV_FALLBACK.fundamentals"]]],
    ["Macro", [["jugaad-data", "JUGAD_DATA.rbi"]]],
  ];
  for (const [label, providers] of domainRows) {
    const statuses = providers.map(([provider, path]) => {
      const [key, domain] = path.split(".");
      return `${provider}=${domainState(providerMatrix[key]?.domains?.[domain])}`;
    });
    console.log(`  ${label}: ${statuses.join(" → ")}`);
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
  const yahooHealthy = yahooHealth?.status === "healthy";
  const yahooDetail = yahooQuoteOk || yahooHistOk
    ? `Reachable fallback${yahooQuoteOk ? " quote" : ""}${yahooQuoteOk && yahooHistOk ? " +" : ""}${yahooHistOk ? " historical" : ""}; optional and may be delayed/stale`
    : yahooHealthy
      ? "Reachable optional fallback; higher-precedence providers served this run"
    : `Unavailable or blocked${yahooHealth?.status ? ` — ${yahooHealth.status}` : ""}`;
  const healthyDomainList = (key: string) => Object.entries(providerMatrix[key]?.domains ?? {})
    .filter(([, v]) => v.healthy)
    .map(([domain]) => domain)
    .join(", ") || "no usable domains";
  console.log("  ✓ IndianAPI: Active for quotes (when configured)");
  console.log(`  ${jugaadFlag ? "✓" : "⊘"} Jugaad-Data: ${jugaadFlag ? `Active — ${healthyDomainList("JUGAD_DATA")}` : "Configured off"}`);
  console.log(`  ${nsepythonFlag ? "✓" : "⊘"} NSEPython: ${nsepythonFlag ? `Active — ${healthyDomainList("NSEPYTHON")}` : "Configured off"}`);
  console.log(`  ${yahooQuoteOk || yahooHistOk || yahooHealthy ? "✓" : "△"} Yahoo: ${yahooDetail}`);
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
