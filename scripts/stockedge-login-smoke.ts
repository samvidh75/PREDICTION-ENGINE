import { config as loadDotEnv } from "dotenv";
import { StockEdgeAuth } from "../src/backend/integrations/stockedge/StockEdgeAuth";
import { summarizeStockEdgeConfig } from "../src/backend/integrations/stockedge/StockEdgeConfig";

loadDotEnv({ path: ".env", quiet: true });

async function main(): Promise<void> {
  const configSummary = summarizeStockEdgeConfig();
  console.log("=== StockEdge Login Smoke ===");
  console.log("Config present:", configSummary.enabled ? "yes" : "no");
  console.log("Has accountId:", configSummary.hasAccountId ? "yes" : "no");
  console.log("Has password:", configSummary.hasPassword ? "yes" : "no");
  console.log("Has baseUrl:", configSummary.hasBaseUrl ? "yes" : "no");

  if (!configSummary.enabled) {
    console.log("Result: SKIPPED (disabled)");
    return;
  }

  if (!configSummary.hasAccountId || !configSummary.hasPassword) {
    console.log("Result: CONFIG_MISSING - accountId or password not set");
    process.exitCode = 1;
    return;
  }

  const auth = new StockEdgeAuth();
  const result = await auth.login();

  console.log("Login strategy:", result.strategy);
  console.log("Session created:", result.sessionCreated ? "true" : "false");
  console.log("MFA required:", result.mfaRequired ? "true" : "false");
  if (result.errorCode) {
    console.log("Error code:", result.errorCode);
  }
  console.log("Ok:", result.ok ? "true" : "false");

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Login smoke failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
