import { config as loadDotEnv } from "dotenv";
import { TrendlyneAdapter } from "../src/backend/integrations/trendlyne/TrendlyneAdapter";

loadDotEnv({ path: ".env", quiet: true });

function main(): void {
  const adapter = new TrendlyneAdapter();
  const status = adapter.getStatus();
  console.log("=== Trendlyne Smoke ===");
  console.log("Enabled:", status.enabled ? "yes" : "no");
  console.log("Widget mode:", status.widgetMode);
  console.log("Available widgets:", status.availableWidgets.length);
  if (status.error) console.log("Status:", status.error);
  console.log("Ok:", status.ok ? "yes" : "no");
  if (!status.ok) process.exitCode = 1;
}

main();
