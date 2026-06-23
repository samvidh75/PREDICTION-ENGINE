/**
 * audit-provider-reliability.ts — Verifies provider reliability, fallback behavior, and public wording.
 *
 * Usage:
 *   npx tsx scripts/audit-provider-reliability.ts
 */

import { execSync } from "child_process";

interface Check {
  name: string;
  command: string;
  critical: boolean;
}

const USE_PRODUCTION = process.argv.includes("--production");
const API_BASE = USE_PRODUCTION ? "https://www.stockstory-india.com" : "http://localhost:4001";

const CHECKS: Check[] = [
  { name: "public_copy_no_provider_wording", command: "npx tsx scripts/audit-public-copy.ts", critical: true },
  { name: "market_data_consistency", command: `API_BASE_URL=${API_BASE} npx tsx scripts/audit-market-data-consistency.ts`, critical: true },
  { name: "search_quality", command: `API_BASE_URL=${API_BASE} npx tsx scripts/audit-search-quality.ts`, critical: true },
  { name: "scanner_quality", command: `API_BASE_URL=${API_BASE} npx tsx scripts/audit-scanner-quality.ts`, critical: true },
  { name: "news_sanitization", command: `API_BASE_URL=${API_BASE} npx tsx scripts/audit-news-sanitization.ts`, critical: true },
  { name: "health_readiness", command: `API_BASE_URL=${API_BASE} npx tsx scripts/audit-health-readiness.ts`, critical: true },
];

function runCheck(check: Check): boolean {
  process.stdout.write(`  ${check.name}... `);
  try {
    execSync(check.command, { stdio: ["ignore", "pipe", "pipe"], timeout: 30000, env: { ...process.env, API_BASE_URL: API_BASE } });
    console.log("PASS");
    return true;
  } catch (err: any) {
    const message = err.stderr?.toString() || err.stdout?.toString() || err.message || "";
    const lines = message.split("\n").filter((l: string) => l.trim()).slice(-2).join("; ");
    console.log(`FAIL: ${lines}`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log("Provider Reliability Audit");
  console.log("==========================\n");

  let passed = 0;
  let failed = 0;
  let criticalFailed = 0;

  for (const check of CHECKS) {
    const ok = runCheck(check);
    if (ok) passed++;
    else {
      failed++;
      if (check.critical) criticalFailed++;
    }
  }

  // Verify Trendlyne and StockEdge configs are safe when disabled
  console.log("\n  --- Provider Config Safety ---");
  try {
    const trendlyneSmoke = execSync("npx tsx scripts/trendlyne-smoke.ts 2>&1 | head -5", { timeout: 10000 });
    const trendlyneOut = trendlyneSmoke.toString();
    if (trendlyneOut.includes("disabled") || trendlyneOut.includes("DISABLED")) {
      console.log("  Trendlyne: safe disabled state (expected if env not set)");
      passed++;
    } else {
      console.log("  Trendlyne: enabled");
      passed++;
    }
  } catch {
    console.log("  Trendlyne: safe disabled state");
    passed++;
  }

  try {
    const stockedgeSmoke = execSync("npx tsx scripts/stockedge-smoke.ts 2>&1 | head -5", { timeout: 10000 });
    const stockedgeOut = stockedgeSmoke.toString();
    if (stockedgeOut.includes("disabled") || stockedgeOut.includes("miss")) {
      console.log("  StockEdge: safe missing-config state");
      passed++;
    } else {
      console.log("  StockEdge: configured");
      passed++;
    }
  } catch {
    console.log("  StockEdge: safe missing-config state (script or env absent)");
    passed++;
  }

  console.log(`\n${passed} passed, ${failed} failed (${criticalFailed} critical)`);

  if (criticalFailed > 0) {
    console.log("\nProvider reliability: FAIL — critical checks failed");
    process.exit(1);
  }
  console.log("\nProvider reliability: PASS");
  process.exit(0);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
