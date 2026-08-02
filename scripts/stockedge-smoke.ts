import { config as loadDotEnv } from "dotenv";
import { StockEdgeIngestionJob } from "../src/backend/integrations/stockedge/StockEdgeIngestionJob";

loadDotEnv({ path: ".env", quiet: true });

function argValue(name: string, fallback?: string): string | undefined {
  const prefixed = `--${name}=`;
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex >= 0) return process.argv[exactIndex + 1] ?? fallback;
  const item = process.argv.find((value) => value.startsWith(prefixed));
  return item ? item.slice(prefixed.length) : fallback;
}

async function main(): Promise<void> {
  const symbol = (argValue("symbol", "RELIANCE") ?? "RELIANCE").toUpperCase();
  const job = new StockEdgeIngestionJob();

  console.log("=== StockEdge Wrapper Smoke ===");
  console.log(JSON.stringify({ config: job.configSummary(), symbol }, null, 2));

  const summary = await job.runForSymbol(symbol);
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok && summary.status !== "disabled") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "StockEdge smoke failed");
  process.exitCode = 1;
});
