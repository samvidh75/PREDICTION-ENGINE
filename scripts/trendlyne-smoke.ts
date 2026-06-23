import { config as loadDotEnv } from "dotenv";
import { TrendlyneAdapter, type TrendlyneWidgetKind } from "../src/backend/integrations/trendlyne/TrendlyneAdapter";

loadDotEnv({ path: ".env", quiet: true });

const kinds: TrendlyneWidgetKind[] = ["technicals", "checklist", "ipo"];

function main(): void {
  const adapter = new TrendlyneAdapter();
  const status = adapter.getStatus();
  console.log("=== Trendlyne Smoke ===");
  console.log("Enabled:", status.enabled ? "yes" : "no");
  console.log("Widget mode:", status.widgetMode);
  console.log("Status:", status.statusCode);
  console.log("Available widgets:", status.availableWidgets.length);

  for (const kind of kinds) {
    const widget = adapter.getWidget(kind, kind === "ipo" ? undefined : "RELIANCE");
    console.log(`${kind}: ${widget.available ? "available" : "unavailable"} (${widget.statusCode})`);
    if (widget.widgetUrl && !adapter.validateWidgetUrl(widget.widgetUrl)) {
      console.log(`${kind}: invalid widget URL`);
      process.exitCode = 1;
    }
  }

  if (!status.ok) {
    console.log("Result:", status.statusCode);
    process.exitCode = status.statusCode === "TRENDLYNE_DISABLED" || status.statusCode === "TRENDLYNE_EMBED_NOT_ALLOWED" ? 0 : 1;
    return;
  }

  console.log("Ok: yes");
}

main();
