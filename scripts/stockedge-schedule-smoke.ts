import { config as loadDotEnv } from "dotenv";
import { StockEdgeIngestionJob } from "../src/backend/integrations/stockedge/StockEdgeIngestionJob";
import { stockEdgeExtractionRunStore } from "../src/backend/integrations/stockedge/StockEdgeExtractionRunStore";

loadDotEnv({ path: ".env", quiet: true });

const SCHEDULE_SYMBOLS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "WIPRO", "HINDUNILVR"];

function argValue(name: string, fallback?: string): string | undefined {
  const prefixed = `--${name}=`;
  const item = process.argv.find((value) => value.startsWith(prefixed));
  return item ? item.slice(prefixed.length) : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  const singleSymbol = argValue("symbol")?.toUpperCase();
  const symbols = singleSymbol ? [singleSymbol] : SCHEDULE_SYMBOLS;
  const job = new StockEdgeIngestionJob();
  const configSummary = job.configSummary();

  console.log("=== StockEdge Schedule Smoke ===");
  console.log("Config enabled:", configSummary.enabled ? "yes" : "no");
  console.log("Symbols:", symbols.join(", "));
  console.log("Dry run:", hasFlag("dry-run") ? "yes" : "no");

  if (!configSummary.enabled) {
    console.log("Result: SKIPPED (disabled)");
    return;
  }

  const results: { symbol: string; ok: boolean; elapsedMs?: number; activeFieldCount: number; errors: string[] }[] = [];

  for (const symbol of symbols) {
    const start = Date.now();
    console.log(`\n--- Extracting ${symbol} ---`);
    try {
      const summary = await job.runForSymbol(symbol);
      const elapsedMs = Date.now() - start;

      stockEdgeExtractionRunStore.recordRun({
        id: `run-${symbol}-${Date.now()}`,
        symbol,
        startedAt: new Date(start).toISOString(),
        completedAt: new Date().toISOString(),
        ok: summary.ok,
        layersAttempted: [],
        layersAvailable: [],
        mappedFieldCount: summary.financialTableCount + (summary.ok ? 1 : 0),
        activeFactorInputCount: summary.activeFieldCount,
        errors: summary.internalErrorCode ? [summary.internalErrorCode] : [],
        elapsedMs,
      });

      results.push({ symbol, ok: summary.ok, elapsedMs, activeFieldCount: summary.activeFieldCount, errors: summary.internalErrorCode ? [summary.internalErrorCode] : [] });

      console.log(`  Ok: ${summary.ok ? "true" : "false"}`);
      console.log(`  Status: ${summary.status}`);
      console.log(`  Active fields: ${summary.activeFieldCount}`);
      console.log(`  Financial tables: ${summary.financialTableCount}`);
      console.log(`  Ownership periods: ${summary.ownershipPeriods}`);
      console.log(`  Missing sections: ${summary.missingSections.join(", ") || "none"}`);
      console.log(`  Elapsed: ${elapsedMs}ms`);
    } catch (error) {
      const elapsedMs = Date.now() - start;
      results.push({ symbol, ok: false, elapsedMs, activeFieldCount: 0, errors: [error instanceof Error ? error.message : "unknown"] });
      console.log(`  Failed: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n=== Schedule Smoke Complete ===`);
  console.log(`Total: ${results.length}, Ok: ${okCount}, Failed: ${results.length - okCount}`);

  if (okCount === 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Schedule smoke failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
