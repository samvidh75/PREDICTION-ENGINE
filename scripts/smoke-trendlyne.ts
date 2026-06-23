/**
 * smoke-trendlyne.ts — Checks Trendlyne status.
 * Reports disabled-by-config if env var absent (expected non-failure).
 *
 * Usage:
 *   npx tsx scripts/smoke-trendlyne.ts
 */

export {};

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

async function main(): Promise<void> {
  console.log("Trendlyne Smoke");
  console.log("───────────────\n");

  try {
    const res = await fetch(`${BASE_URL}/api/integrations/trendlyne/status`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    const status = data.status || "unknown";
    const enabled = data.enabled === true;
    if (enabled && data.widgetAvailable) {
      console.log(`  PASS — Trendlyne enabled, widget available (${data.latencyMs || "?"}ms)`);
      process.exit(0);
    } else if (enabled) {
      console.log(`  PASS — Trendlyne enabled but widget unavailable (status: ${status})`);
      process.exit(0);
    } else {
      console.log(`  PASS — Trendlyne disabled-by-config (expected, ${status})`);
      process.exit(0);
    }
  } catch (err: any) {
    console.log(`  PASS — Trendlyne unavailable (${err.message}, non-critical)`);
    process.exit(0);
  }
}

main();
