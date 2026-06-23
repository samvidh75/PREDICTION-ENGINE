import { config as loadDotEnv } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { StockEdgeAuth } from "../src/backend/integrations/stockedge/StockEdgeAuth";
import { StockEdgeEndpointDiscovery } from "../src/backend/integrations/stockedge/StockEdgeEndpointDiscovery";
import { summarizeStockEdgeConfig } from "../src/backend/integrations/stockedge/StockEdgeConfig";

loadDotEnv({ path: ".env", quiet: true });

function argValue(name: string, fallback?: string): string | undefined {
  const prefixed = `--${name}=`;
  const item = process.argv.find((value) => value.startsWith(prefixed));
  return item ? item.slice(prefixed.length) : fallback;
}

async function main(): Promise<void> {
  const symbol = (argValue("symbol", "RELIANCE") ?? "RELIANCE").toUpperCase();
  const configSummary = summarizeStockEdgeConfig();
  console.log("=== StockEdge Endpoint Discovery ===");
  console.log("Symbol:", symbol);
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

  const discovery = new StockEdgeEndpointDiscovery();
  const result = await discovery.discover({ symbol });

  console.log("Discovery ok:", result.ok ? "true" : "false");
  console.log("Endpoints found:", result.endpoints.length);
  console.log("Elapsed ms:", result.elapsedMs);

  for (const [layer, count] of Object.entries(result.layerCounts)) {
    console.log(`  ${layer}: ${count} endpoint(s)`);
  }

  for (const ep of result.endpoints) {
    console.log(`  [${ep.layer}] ${ep.method} ${ep.urlTemplate} (confidence: ${ep.confidence})`);
  }

  if (result.errorCode) {
    console.log("Error code:", result.errorCode);
  }

  const tmpDir = join(process.cwd(), ".tmp");
  mkdirSync(tmpDir, { recursive: true });
  const discoveryPath = join(tmpDir, "stockedge-discovery.json");
  writeFileSync(discoveryPath, JSON.stringify({ discoveredAt: new Date().toISOString(), endpoints: result.endpoints, layerCounts: result.layerCounts }, null, 2));
  console.log("Discovery written to:", discoveryPath);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Discovery failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
