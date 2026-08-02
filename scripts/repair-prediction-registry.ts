import { query } from "../src/db";

const apply = process.argv.includes("--apply");
const confirmed = process.env.CONFIRM_F1_REPAIR_APPLY === "true";
const symbolArg = process.argv.find((arg) => arg.startsWith("--symbols="))?.split("=")[1];
const from = process.argv.find((arg) => arg.startsWith("--from="))?.split("=")[1];
const to = process.argv.find((arg) => arg.startsWith("--to="))?.split("=")[1];
const symbols = symbolArg ? symbolArg.split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean) : [];

if (apply && !confirmed) throw new Error("Apply mode requires CONFIRM_F1_REPAIR_APPLY=true");

const params: unknown[] = [];
const filters: string[] = [];
if (symbols.length > 0) {
  filters.push(`symbol IN (${symbols.map((_, index) => `$${params.length + index + 1}`).join(",")})`);
  params.push(...symbols);
}
if (from) { params.push(from); filters.push(`prediction_date >= $${params.length}`); }
if (to) { params.push(to); filters.push(`prediction_date <= $${params.length}`); }
const scope = filters.length ? `AND ${filters.join(" AND ")}` : "";
const invalidWhere = `(
  growth_score <= -100 OR
  quality_score NOT BETWEEN 0 AND 100 OR
  growth_score NOT BETWEEN 0 AND 100 OR
  value_score NOT BETWEEN 0 AND 100 OR
  momentum_score NOT BETWEEN 0 AND 100 OR
  risk_score NOT BETWEEN 0 AND 100 OR
  sector_score NOT BETWEEN 0 AND 100 OR
  ranking_score NOT BETWEEN 0 AND 100 OR
  confidence_score NOT BETWEEN 0 AND 100 OR
  (quality_score = 55 AND growth_score = -250 AND value_score = 50 AND momentum_score = 50 AND sector_score = 50)
)`;

function reason(row: Record<string, unknown>): string {
  if (Number(row.growth_score) <= -100) return "sentinel growth_score";
  const fields = ["quality_score", "growth_score", "value_score", "momentum_score", "risk_score", "sector_score", "ranking_score", "confidence_score"];
  const invalid = fields.filter((field) => {
    const value = Number(row[field]);
    return !Number.isFinite(value) || value < 0 || value > 100;
  });
  if (invalid.length > 0) return `score outside valid domain: ${invalid.join(", ")}`;
  return "template vector";
}

const rows = (await query(`SELECT id, symbol, prediction_date, prediction_horizon, quality_score, growth_score, value_score, momentum_score, risk_score, sector_score, ranking_score, confidence_score, classification FROM prediction_registry WHERE ${invalidWhere} ${scope} ORDER BY prediction_date DESC, symbol LIMIT 5000`, params)).rows;
const byReason = new Map<string, number>();
for (const row of rows) {
  const currentReason = reason(row);
  byReason.set(currentReason, (byReason.get(currentReason) ?? 0) + 1);
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", invalidPredictions: rows.length, byReason: Object.fromEntries(byReason), examples: rows.slice(0, 20) }, null, 2));

if (apply && rows.length > 0) {
  let quarantined = 0;
  for (const row of rows) {
    const currentReason = reason(row);
    const quarantineId = `prediction-quarantine:${row.id}:${currentReason}`;
    const existing = await query(`SELECT id FROM prediction_registry_quarantine WHERE prediction_id = $1 AND rejection_reason = $2 LIMIT 1`, [row.id, currentReason]);
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO prediction_registry_quarantine (id, prediction_id, symbol, prediction_date, prediction_horizon, raw_payload, rejection_reason, quarantined_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [quarantineId, row.id, row.symbol, row.prediction_date, row.prediction_horizon, JSON.stringify(row), currentReason, new Date().toISOString()],
      );
      quarantined += 1;
    }
  }
  const now = new Date().toISOString();
  await query(
    `INSERT INTO scoring_runs (id, run_date, model_version, universe, status, symbols_requested, symbols_scored, symbols_partial, symbols_unavailable, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [`repair-${Date.now()}`, now.slice(0, 10), "f1-data-quality-v2", symbols.length ? symbols.join(",") : "all", "invalid_quarantined", rows.length, 0, 0, rows.length, now],
  );
  console.log(`quarantined ${quarantined} new prediction rows; immutable prediction_registry rows were preserved for traceability`);
}
