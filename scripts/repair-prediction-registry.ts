import { query } from "../src/db";

const apply = process.argv.includes("--apply");
const symbolArg = process.argv.find((arg) => arg.startsWith("--symbols="))?.split("=")[1];
const from = process.argv.find((arg) => arg.startsWith("--from="))?.split("=")[1];
const to = process.argv.find((arg) => arg.startsWith("--to="))?.split("=")[1];
const symbols = symbolArg ? symbolArg.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : [];
const params: unknown[] = [];
const filters: string[] = [];
if (symbols.length > 0) {
  filters.push(`symbol IN (${symbols.map((_, i) => `$${params.length + i + 1}`).join(",")})`);
  params.push(...symbols);
}
if (from) { params.push(from); filters.push(`prediction_date >= $${params.length}`); }
if (to) { params.push(to); filters.push(`prediction_date <= $${params.length}`); }
const scope = filters.length ? `AND ${filters.join(" AND ")}` : "";
const invalidWhere = `(growth_score <= -100 OR quality_score NOT BETWEEN 0 AND 100 OR growth_score NOT BETWEEN 0 AND 100 OR value_score NOT BETWEEN 0 AND 100 OR momentum_score NOT BETWEEN 0 AND 100 OR risk_score NOT BETWEEN 0 AND 100 OR sector_score NOT BETWEEN 0 AND 100 OR ranking_score NOT BETWEEN 0 AND 100 OR confidence_score NOT BETWEEN 0 AND 100 OR (quality_score=55 AND growth_score=-250 AND value_score=50 AND momentum_score=50 AND sector_score=50))`;

const rows = (await query(`SELECT id, symbol, prediction_date, prediction_horizon, quality_score, growth_score, value_score, momentum_score, risk_score, sector_score, ranking_score, confidence_score FROM prediction_registry WHERE ${invalidWhere} ${scope} ORDER BY prediction_date DESC, symbol LIMIT 5000`, params)).rows;
const reasons = new Map<string, number>();
for (const row of rows) {
  const reason = Number(row.growth_score) <= -100 ? "sentinel growth_score" : "score outside valid domain or template vector";
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
}
console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", invalidPredictions: rows.length, byReason: Object.fromEntries(reasons), examples: rows.slice(0, 20) }, null, 2));

if (apply && rows.length > 0) {
  for (const row of rows) {
    await query(`INSERT INTO scoring_runs (id, run_date, model_version, universe, status, symbols_requested, symbols_scored, symbols_partial, symbols_unavailable, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [`repair-${row.id}`, String(row.prediction_date), "f1-data-quality-v1", "repair", "invalid_quarantined", 1, 0, 0, 1, new Date().toISOString()]);
  }
  console.log("audit markers written to scoring_runs; prediction rows preserved for traceability");
}

