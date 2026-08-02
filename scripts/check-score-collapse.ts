import { query } from "../src/db";

const maxIdentical = Number(process.env.MAX_IDENTICAL_VECTOR_RATIO ?? 0.10);
const minVariance = Number(process.env.MIN_FACTOR_VARIANCE ?? 1);
const maxFallback = Number(process.env.MAX_FALLBACK_FACTOR_RATIO ?? 0.50);
const universe = process.argv.find((arg) => arg.startsWith("--universe="))?.split("=")[1] ?? "all";
const dateRow = (await query(`SELECT MAX(prediction_date) AS d FROM prediction_registry WHERE prediction_horizon = 30`)).rows[0];
const date = String(dateRow?.d ?? "");
const rows = (await query(`SELECT symbol, quality_score, growth_score, value_score, momentum_score, risk_score, sector_score, ranking_score, confidence_score FROM prediction_registry WHERE prediction_horizon = 30 AND prediction_date = $1`, [date])).rows;
const groups = new Map<string, string[]>();
for (const row of rows) {
  const key = ["quality_score","growth_score","value_score","momentum_score","risk_score","sector_score","ranking_score","confidence_score"].map((f) => row[f]).join("|");
  groups.set(key, [...(groups.get(key) ?? []), String(row.symbol)]);
}
const largest = [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
function variance(field: string): number {
  const values = rows.map((r) => Number(r[field])).filter(Number.isFinite);
  const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(1, values.length);
}
const variances = Object.fromEntries(["quality_score","growth_score","value_score","momentum_score","risk_score","sector_score","ranking_score","confidence_score"].map((f) => [f, variance(f)]));
const fallbackCount = rows.reduce((count, row) => count + ["quality_score","growth_score","value_score","momentum_score","risk_score","sector_score"].filter((f) => Number(row[f]) === 50 || Number(row[f]) === 0).length, 0);
const fallbackRatio = fallbackCount / Math.max(1, rows.length * 6);
const sentinelCount = rows.filter((r) => Number(r.growth_score) <= -100).length;
const identicalRatio = largest.length / Math.max(1, rows.length);
const failed = identicalRatio > maxIdentical || Object.values(variances).some((v) => v < minVariance) || fallbackRatio > maxFallback || sentinelCount > 0;
console.log(JSON.stringify({ universe, date, rows: rows.length, identicalRatio, largestGroup: largest, variances, fallbackRatio, sentinelCount, thresholds: { maxIdentical, minVariance, maxFallback }, status: failed ? "fail" : "pass" }, null, 2));
if (failed) process.exit(1);

