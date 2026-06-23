import { config as loadDotEnv } from "dotenv";
import { loadTrendlyneConfig, summarizeTrendlyneConfig } from "../src/backend/integrations/trendlyne/TrendlyneConfig";

loadDotEnv({ path: ".env", quiet: true });

function main(): void {
  const config = loadTrendlyneConfig();
  const summary = summarizeTrendlyneConfig(config);
  console.log("=== Trendlyne Config ===");
  console.log(JSON.stringify(summary, null, 2));
}

main();
