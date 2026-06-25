/**
 * audit-engine-depth.ts — Verifies engine depth fields are active.
 *
 * Usage:
 *   npx tsx scripts/audit-engine-depth.ts
 */

export {};

const BASE_URL = process.env.API_BASE_URL || "https://www.stockstory-india.com";

async function main(): Promise<void> {
  let passed = 0;
  let failed = 0;

  console.log("Engine Depth Audit");
  console.log("===================\n");

  // Check scanner returns results with proper scoring
  process.stdout.write("  scanner_valid_results... ");
  try {
    const res = await fetch(`${BASE_URL}/api/research/scanner?preset=Quality%20compounders&limit=5`);
    const data = await res.json();
    const items = data?.data || [];
    if (items.length > 0 && items.every((i: any) => i.score !== null && i.symbol)) {
      console.log(`PASS (${items.length} results)`);
      passed++;
    } else {
      console.log("FAIL: no valid results");
      failed++;
    }
  } catch {
    console.log("FAIL: fetch error");
    failed++;
  }

  // Check stock page healthometer has financial inputs
  process.stdout.write("  stock_page_financials... ");
  try {
    const res = await fetch(`${BASE_URL}/api/research/snapshot/RELIANCE`);
    const data = await res.json();
    const snapshot = data?.data;
    if (snapshot && snapshot.healthometer) {
      console.log("PASS (healthometer present)");
      passed++;
    } else {
      console.log("FAIL: no healthometer");
      failed++;
    }
  } catch {
    console.log("FAIL: fetch error");
    failed++;
  }

  // Check quote consistency
  process.stdout.write("  quote_price_consistent... ");
  try {
    const qRes = await fetch(`${BASE_URL}/api/market-data/quote/RELIANCE`);
    const sRes = await fetch(`${BASE_URL}/api/research/snapshot/RELIANCE`);
    const q = await qRes.json();
    const s = await sRes.json();
    const qp = q?.price;
    const sp = s?.data?.quote?.price;
    if (qp && sp && Math.abs(qp - sp) / qp < 0.01) {
      console.log(`PASS (quote=${qp}, snapshot=${sp})`);
      passed++;
    } else {
      console.log(`FAIL: mismatch (quote=${qp}, snapshot=${sp})`);
      failed++;
    }
  } catch {
    console.log("FAIL: fetch error");
    failed++;
  }

  // Check no engine internals in public API
  process.stdout.write("  no_engine_internals_leaked... ");
  try {
    const res = await fetch(`${BASE_URL}/api/research/scanner?preset=Quality%20compounders&limit=3`);
    const data = await res.json();
    const items = data?.data || [];
    const allText = JSON.stringify(items);
    const forbidden = ["EngineInputs", "QualityEngine", "ValuationEngine", "StabilityEngine", "ROA activated", "dividendYieldScore", "marketCap factor"];
    const found = forbidden.filter((t) => allText.includes(t));
    if (found.length === 0) {
      console.log("PASS");
      passed++;
    } else {
      console.log(`FAIL: found ${found.join(", ")}`);
      failed++;
    }
  } catch {
    console.log("FAIL: fetch error");
    failed++;
  }

  // Check public-copy compliance
  process.stdout.write("  public_copy_compliance... ");
  try {
    const { execSync } = require("child_process");
    execSync("npx tsx scripts/audit-public-copy.ts", { stdio: ["ignore", "pipe", "pipe"], timeout: 15000 });
    console.log("PASS");
    passed++;
  } catch {
    console.log("FAIL");
    failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Engine depth audit failed:", err);
  process.exit(1);
});
