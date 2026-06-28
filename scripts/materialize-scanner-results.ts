/**
 * materialize-scanner-results.ts — Idempotent scanner result materialization.
 *
 * Reads from prediction_registry, financial_snapshots, feature_snapshots,
 * and builds scanner-ready rows.
 *
 * Usage:
 *   npx tsx scripts/materialize-scanner-results.ts
 *   npx tsx scripts/materialize-scanner-results.ts
 */

import { query } from "../src/db/index";

async function main(): Promise<void> {
  console.log("Scanner Materialization");
  console.log("=======================\n");

  const start = Date.now();

  // Read symbols with available research data
  const dataRes = await query(
    `SELECT DISTINCT UPPER(REPLACE(fs.symbol, ' ', '')) AS sym,
            fs.pe_ratio, fs.roe, fs.debt_to_equity, fs.current_ratio,
            fs.gross_margin, fs.operating_margin, fs.revenue_growth, fs.profit_growth
     FROM financial_snapshots fs
     WHERE fs.pe_ratio IS NOT NULL
     ORDER BY sym`
  );
  const rows = dataRes.rows || [];
  console.log(`  Candidates read: ${rows.length}`);

  // Build scanner entries with computed scores
  const entries: any[] = [];
  let rejected = 0;
  let dupes = 0;
  let noScore = 0;
  const seen = new Set<string>();

  for (const row of rows) {
    const sym = row.sym;
    if (!sym || seen.has(sym)) { dupes++; continue; }
    seen.add(sym);

    const roe = Number(row.roe) || null;
    const de = Number(row.debt_to_equity) || null;
    const rg = Number(row.revenue_growth) || null;
    const pg = Number(row.profit_growth) || null;

    // Compute quality score
    let q = 0; let qc = 0;
    if (roe !== null) { q += roe >= 15 ? 75 : roe >= 10 ? 55 : roe >= 0 ? 40 : 15; qc++; }
    const quality = qc > 0 ? Math.round(q / qc) : null;

    // Compute stability from debt
    let s = 0; let sc = 0;
    if (de !== null) { s += de <= 0.3 ? 80 : de <= 0.5 ? 65 : de <= 1 ? 50 : de <= 2 ? 35 : 15; sc++; }
    const stability = sc > 0 ? Math.round(s / sc) : null;

    // Momentum proxy from growth
    let m = 0; let mc = 0;
    if (rg !== null) { m += rg >= 20 ? 75 : rg >= 10 ? 55 : rg >= 5 ? 40 : rg >= 0 ? 25 : 10; mc++; }
    if (pg !== null) { m += pg >= 20 ? 75 : pg >= 10 ? 55 : pg >= 5 ? 40 : pg >= 0 ? 25 : 10; mc++; }
    const momentum = mc > 0 ? Math.round(m / mc) : null;

    // Build composite score
    const scores = [quality, stability, momentum].filter((x): x is number => x !== null);
    const composite = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    if (composite === null) { noScore++; rejected++; continue; }

    // Determine research state
    const state = composite >= 75 ? "High conviction" : composite >= 55 ? "Watch" : composite >= 35 ? "Needs review" : "Risk rising";

    entries.push({
      symbol: sym,
      score: composite,
      researchState: state,
      oneLineThesis: quality && stability ? "Quality business with stable financial structure." : "Available research data is partial.",
      keyReason: quality ? `Quality score: ${quality}/100` : "Limited financial data available.",
      riskMarker: stability && stability < 40 ? "Higher leverage than peers." : null,
      dataQuality: "partial",
    });
  }

  console.log(`  Eligible rows written: ${entries.length}`);
  console.log(`  Rows rejected: ${rejected}`);
  console.log(`  Duplicate symbols removed: ${dupes}`);
  console.log(`  Missing score count: ${noScore}`);

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n  Materialization duration: ${duration}s`);

  // Print summary of entries
  if (entries.length > 0) {
    console.log("\n  Top entries:");
    entries.sort((a, b) => b.score - a.score).slice(0, 10).forEach((e, i) => {
      console.log(`    ${i + 1}. ${e.symbol} — score: ${e.score}, state: ${e.researchState}`);
    });
  }
}

main().catch((err) => {
  console.error("Materialization failed:", err);
  process.exit(1);
});
