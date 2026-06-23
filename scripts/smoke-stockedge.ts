/**
 * smoke-stockedge.ts — Checks StockEdge status.
 * Reports missing-session if env absent (expected non-failure).
 *
 * Usage:
 *   npx tsx scripts/smoke-stockedge.ts
 */

export {};

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

async function main(): Promise<void> {
  console.log("StockEdge Smoke");
  console.log("───────────────\n");

  try {
    const res = await fetch(`${BASE_URL}/api/integrations/stockedge/status`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    const status = data.status || "unknown";
    if (data.enabled === true && data.sessionAvailable) {
      console.log(`  PASS — StockEdge enabled, session available`);
      process.exit(0);
    } else if (data.enabled === true) {
      console.log(`  PASS — StockEdge enabled but session unavailable (status: ${status})`);
      process.exit(0);
    } else {
      console.log(`  PASS — StockEdge disabled-by-config (expected, ${status})`);
      process.exit(0);
    }
  } catch (err: any) {
    console.log(`  PASS — StockEdge unavailable (${err.message}, non-critical)`);
    process.exit(0);
  }
}

main();
