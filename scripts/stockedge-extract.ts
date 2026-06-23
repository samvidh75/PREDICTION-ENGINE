import { config as loadDotEnv } from "dotenv";
import { StockEdgeAuth } from "../src/backend/integrations/stockedge/StockEdgeAuth";
import { StockEdgeExtractor } from "../src/backend/integrations/stockedge/StockEdgeExtractor";
import { summarizeStockEdgeConfig } from "../src/backend/integrations/stockedge/StockEdgeConfig";

loadDotEnv({ path: ".env", quiet: true });

function argValue(name: string, fallback?: string): string | undefined {
  const prefixed = `--${name}=`;
  const item = process.argv.find((value) => value.startsWith(prefixed));
  return item ? item.slice(prefixed.length) : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  const symbol = (argValue("symbol", "RELIANCE") ?? "RELIANCE").toUpperCase();
  const dryRun = hasFlag("dry-run");
  const configSummary = summarizeStockEdgeConfig();
  console.log("=== StockEdge Extract ===");
  console.log("Symbol:", symbol);
  console.log("Dry run:", dryRun ? "yes" : "no");
  console.log("Config enabled:", configSummary.enabled ? "yes" : "no");

  if (!configSummary.enabled || !configSummary.hasAccountId || !configSummary.hasPassword) {
    console.log("Result: config missing or disabled");
    process.exitCode = 1;
    return;
  }

  const auth = new StockEdgeAuth();
  const loginResult = await auth.login();
  if (!loginResult.ok) {
    console.log("Login failed:", loginResult.errorCode);
    process.exitCode = 1;
    return;
  }
  console.log("Session established");

  const extractor = new StockEdgeExtractor();
  const plan = extractor.buildPlan(symbol, undefined, "cli_extract");
  plan.dryRun = dryRun;
  const result = await extractor.extract(plan);

  console.log("Extraction ok:", result.ok ? "true" : "false");
  console.log("Layers attempted:", result.layersAttempted.length);
  console.log("Layers available:", result.layersAvailable.join(", "));
  console.log("Mapped field count:", result.mappedFieldCount);
  console.log("Active factor input count:", result.activeFactorInputCount);
  console.log("Missing sections:", result.missingSections.join(", ") || "none");
  console.log("Elapsed ms:", result.elapsedMs);

  if (result.errors.length > 0) {
    console.log("Errors:", result.errors.join(", "));
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Extract failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
