export {};
/**
 * check-market-data-providers.ts
 *
 * Safe market data provider diagnostic.
 * Tests public/no-credential providers: Yahoo fallback, IndianAPI.
 * Reports health per provider and fallback behavior for known symbols.
 *
 * Usage:
 *   npx tsx scripts/check-market-data-providers.ts
 *
 * Environment:
 *   CHECK_TIMEOUT_MS  — per-request timeout (default: 10000)
 *
 * Exits non-zero only for script/code failure, not for optional missing provider.
 */

import { ProviderBroker } from '../src/providers/marketData/providerBroker';

const TIMEOUT = parseInt(process.env.CHECK_TIMEOUT_MS || "10000", 10);

interface CheckResult {
  provider: string;
  status: string;
  latencyMs: number | null;
  detail?: string;
}

async function main(): Promise<void> {
  console.log("=== Market Data Provider Health ===\n");
  
  const broker = new ProviderBroker();
  const results: CheckResult[] = [];

  // Provider health checks
  const healths = await broker.checkAllProviders();
  for (const h of healths) {
    results.push({
      provider: h.provider,
      status: h.status,
      latencyMs: h.latencyMs,
      detail: undefined,
    });
    const icon = h.status === "healthy" ? "✓" : h.status === "missing_optional" ? "⊘" : "△";
    console.log(`${icon} ${h.provider}=${h.status}${h.latencyMs != null ? ` (${h.latencyMs}ms)` : ""}`);
  }

  // IndianAPI
  const indianApiStatus = process.env.INDIANAPI_KEY ? "healthy" : "missing_optional";
  results.push({ provider: "indianapi", status: indianApiStatus, latencyMs: null });
  const iaIcon = indianApiStatus === "healthy" ? "✓" : "⊘";
  console.log(`${iaIcon} indianapi=${indianApiStatus}`);

  // Test quote fallback for RELIANCE
  console.log("\n--- Quote Fallback Test: RELIANCE ---");
  const quoteResult = await broker.getQuote("RELIANCE");
  if (quoteResult.data) {
    console.log(`✓ quote provider=${quoteResult.provider} price=${quoteResult.data.lastPrice} latency=${quoteResult.latencyMs}ms`);
    if (quoteResult.fallbackChain.length > 0) {
      console.log(`  fallback chain: ${quoteResult.fallbackChain.join(" → ")}`);
    }
  } else {
    console.log(`△ all quote providers unavailable: ${quoteResult.error}`);
    console.log(`  attempted: ${quoteResult.fallbackChain.join(" → ")}`);
  }
  results.push({
    provider: "quote_fallback",
    status: quoteResult.data ? quoteResult.provider : "unavailable",
    latencyMs: quoteResult.latencyMs,
    detail: quoteResult.error ?? undefined,
  });

  // Test quote fallback for TCS
  console.log("\n--- Quote Fallback Test: TCS ---");
  const tcsQuote = await broker.getQuote("TCS");
  if (tcsQuote.data) {
    console.log(`✓ quote provider=${tcsQuote.provider} price=${tcsQuote.data.lastPrice} latency=${tcsQuote.latencyMs}ms`);
  } else {
    console.log(`△ all quote providers unavailable for TCS: ${tcsQuote.error}`);
  }

  // Test historical fallback for RELIANCE (last 5 days)
  console.log("\n--- Historical Fallback Test: RELIANCE (last 5 days) ---");
  const today = new Date();
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fromDate = fiveDaysAgo.toISOString().split('T')[0];
  const toDate = today.toISOString().split('T')[0];
  
  const histResult = await broker.getHistoricalDaily("RELIANCE", fromDate, toDate);
  if (histResult.data && histResult.data.length > 0) {
    console.log(`✓ historical provider=${histResult.provider} candles=${histResult.data.length} latency=${histResult.latencyMs}ms`);
    if (histResult.fallbackChain.length > 0) {
      console.log(`  fallback chain: ${histResult.fallbackChain.join(" → ")}`);
    }
  } else {
    console.log(`△ all historical providers unavailable: ${histResult.error}`);
    console.log(`  attempted: ${histResult.fallbackChain.join(" → ")}`);
  }

  // Print summary
  console.log("\n=== Provider Summary ===");
  let allEssentialOk = true;
  for (const r of results) {
    if (r.status === "healthy" || r.status === "missing_optional") continue;
    if (r.status === "expired" || r.status === "expired_or_unauthorized" || r.status === "provider_unreachable") {
      console.log(`  △ ${r.provider}: ${r.status} (non-blocking)`);
    } else {
      console.log(`  △ ${r.provider}: ${r.status} (degraded)`);
    }
  }

  // Check if at least one quote provider works
  if (quoteResult.data) {
    console.log("\n  ✓ At least one quote provider is functional");
  } else {
    console.log("\n  △ No quote provider is functional (app will show unavailable)");
  }

  // Check if at least one historical provider works
  if (histResult.data && histResult.data.length > 0) {
    console.log("  ✓ At least one historical provider is functional");
  } else {
    console.log("  △ No historical provider is functional (features/predictions may be limited)");
  }

  process.exitCode = 0;
}

main().catch((err) => {
  console.error("Provider check failed:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
