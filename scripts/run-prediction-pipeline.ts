/**
 * @deprecated Use `npx tsx src/scheduler/run-prediction-generation.ts` instead.
 *
 * This script uses the legacy scoreEngine (Pipeline B) which is being consolidated
 * into PredictionFactory (Pipeline A). It is kept for manual/exploratory use but
 * will be removed in a future track. Pipeline A is superior:
 *  - Uses StockStoryEngine which directly reads factor_snapshots
 *  - Writes to prediction_registry with created_by = 'PredictionFactory'
 *  - Integrates with the daily scheduler and CI
 */
import { DatabaseSnapshotProvider } from "../src/backend/data/providers/DatabaseSnapshotProvider";
import { scoreSnapshot, type PredictionSnapshot } from "../src/backend/data/scoring/scoreEngine";
import { validateMarketPriceRecords } from "../src/backend/data/validation/priceValidation";
import { query } from "../src/db";

console.warn(
  '[DEPRECATED] This script uses the legacy scoreEngine (Pipeline B).\n' +
  '  Use instead: npx tsx src/scheduler/run-prediction-generation.ts\n' +
  '  Pipeline A (PredictionFactory) is the canonical daily scoring path.\n'
);

const VALID_HORIZONS = [7, 30, 90, 180, 365] as const;
type Horizon = (typeof VALID_HORIZONS)[number];

const apply = process.argv.includes("--apply");
const symbolArg = process.argv.find((arg) => arg.startsWith("--symbols="))?.split("=")[1];
const universe = process.argv.find((arg) => arg.startsWith("--universe="))?.split("=")[1] ?? "nifty50";
const horizonRaw = Number(process.argv.find((arg) => arg.startsWith("--horizon="))?.split("=")[1] ?? 30);
if (!VALID_HORIZONS.includes(horizonRaw as Horizon)) throw new Error(`Unsupported horizon ${horizonRaw}. Allowed: ${VALID_HORIZONS.join(", ")}`);
const horizon = horizonRaw as Horizon;

if (apply && process.env.CONFIRM_F1_PIPELINE_APPLY !== "true") {
  throw new Error("Apply mode requires CONFIRM_F1_PIPELINE_APPLY=true");
}

const symbols = symbolArg
  ? symbolArg.split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)
  : (await query(`SELECT DISTINCT symbol FROM daily_prices ORDER BY symbol LIMIT 500`)).rows.map((row) => String(row.symbol).trim().toUpperCase());

const provider = new DatabaseSnapshotProvider();
const to = new Date().toISOString().slice(0, 10);
const from = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10);
const prices = await provider.fetchPrices(symbols, from, to);
const fundamentals = await provider.fetchFundamentals(symbols);
const bySymbolPrices = new Map<string, typeof prices>();
for (const price of prices) bySymbolPrices.set(price.symbol, [...(bySymbolPrices.get(price.symbol) ?? []), price]);
const bySymbolFundamental = new Map(fundamentals.map((snapshot) => [snapshot.symbol, snapshot]));

const sectorBySymbol = new Map<string, string>();
try {
  const placeholders = symbols.map((_, index) => `$${index + 1}`).join(",");
  if (placeholders) {
    const sectorRows = await query(`SELECT symbol, sector FROM master_security_registry WHERE symbol IN (${placeholders})`, symbols);
    for (const row of sectorRows.rows) {
      const sector = String(row.sector ?? "").trim();
      if (sector) sectorBySymbol.set(String(row.symbol).trim().toUpperCase(), sector);
    }
  }
} catch {
  // Missing peer metadata is handled honestly: sector_score remains unavailable.
}

const provisional = symbols.map((symbol) => scoreSnapshot({
  symbol,
  horizon,
  prices: bySymbolPrices.get(symbol) ?? [],
  fundamental: bySymbolFundamental.get(symbol) ?? null,
}));

function peerBaseScore(snapshot: PredictionSnapshot): number | null {
  const values = ["quality_score", "growth_score", "value_score", "momentum_score", "risk_score"]
    .map((field) => snapshot.factors[field as keyof typeof snapshot.factors].value)
    .filter((value): value is number => value != null);
  return values.length >= 2 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

const sectorScores = new Map<string, number>();
const sectorGroups = new Map<string, Array<{ symbol: string; score: number }>>();
for (const snapshot of provisional) {
  const sector = sectorBySymbol.get(snapshot.symbol);
  const score = peerBaseScore(snapshot);
  if (!sector || score == null) continue;
  sectorGroups.set(sector, [...(sectorGroups.get(sector) ?? []), { symbol: snapshot.symbol, score }]);
}
for (const group of sectorGroups.values()) {
  const unique = [...new Set(group.map((entry) => entry.score))].sort((a, b) => a - b);
  if (unique.length < 2) continue;
  for (const entry of group) {
    const index = unique.indexOf(entry.score);
    sectorScores.set(entry.symbol, Math.round((index / (unique.length - 1)) * 100));
  }
}

const snapshots = symbols.map((symbol) => scoreSnapshot({
  symbol,
  horizon,
  prices: bySymbolPrices.get(symbol) ?? [],
  fundamental: bySymbolFundamental.get(symbol) ?? null,
  sectorScore: sectorScores.get(symbol) ?? null,
}));

const vectors = new Map<string, string[]>();
for (const snapshot of snapshots) {
  const key = Object.values(snapshot.factors).map((factor) => factor.value ?? "null").join("|");
  vectors.set(key, [...(vectors.get(key) ?? []), snapshot.symbol]);
}
const vectorGroups = [...vectors.values()].sort((a, b) => b.length - a.length);
const comparable = snapshots.filter((snapshot) => snapshot.rankingScore != null);
const largestGroup = vectorGroups[0] ?? [];
const identicalRatio = largestGroup.length / Math.max(1, comparable.length);
const fallbackCount = snapshots.reduce((count, snapshot) => count + Object.values(snapshot.factors).filter((factor) => factor.value === 0 || factor.value === 50).length, 0);
const fallbackRatio = fallbackCount / Math.max(1, snapshots.length * 6);
const sentinelCount = snapshots.filter((snapshot) => Object.values(snapshot.factors).some((factor) => factor.value != null && (factor.value < 0 || factor.value > 100))).length;
const maxIdentical = Number(process.env.MAX_IDENTICAL_VECTOR_RATIO ?? 0.10);
const maxFallback = Number(process.env.MAX_FALLBACK_FACTOR_RATIO ?? 0.50);
const collapseDetected = comparable.length >= 5 && (identicalRatio > maxIdentical || fallbackRatio > maxFallback);
const complete = snapshots.filter((snapshot) => snapshot.rankingScore != null && snapshot.classification != null && Object.values(snapshot.factors).every((factor) => factor.value != null));

const report = {
  mode: apply ? "apply" : "dry-run",
  provider: provider.id,
  universe,
  horizon,
  symbols: symbols.length,
  complete: complete.length,
  partial: snapshots.filter((snapshot) => snapshot.availability === "partial").length,
  unavailable: snapshots.filter((snapshot) => snapshot.availability === "unavailable").length,
  identicalRatio,
  fallbackRatio,
  sentinelCount,
  collapseDetected,
  largestIdenticalVectorGroup: largestGroup,
  examples: snapshots.slice(0, 10),
};
console.log(JSON.stringify(report, null, 2));

if (!apply) process.exit(0);
if (sentinelCount > 0) throw new Error("Refusing apply: calculated snapshots contain invalid factor scores");
if (collapseDetected) throw new Error(`Refusing apply: score collapse detected (identicalRatio=${identicalRatio}, fallbackRatio=${fallbackRatio})`);
if (complete.length === 0) throw new Error("Refusing apply: no complete snapshots are eligible for immutable registry promotion");

function confidenceLevel(score: number): "Very High" | "High" | "Medium" | "Low" {
  if (score >= 85) return "Very High";
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

async function nextId(table: "prediction_input_lineage" | "data_completeness_metrics"): Promise<number> {
  const row = (await query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${table}`)).rows[0];
  return Number(row?.max_id ?? 0) + 1;
}

const runId = `f1-${Date.now()}`;
const now = new Date().toISOString();
await query(`INSERT INTO ingestion_runs (id, provider, dataset_type, started_at, completed_at, status, accepted_count, rejected_count) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [runId, provider.id, "prices-and-fundamentals", now, now, "completed", prices.length + fundamentals.length, 0]);
await query(`INSERT INTO scoring_runs (id, run_date, model_version, universe, status, symbols_requested, symbols_scored, symbols_partial, symbols_unavailable, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [runId, now.slice(0, 10), "f1-data-quality-v2", universe, "completed", snapshots.length, complete.length, snapshots.filter((snapshot) => snapshot.availability === "partial").length, snapshots.filter((snapshot) => snapshot.availability === "unavailable").length, now]);

let completenessId = await nextId("data_completeness_metrics");
let lineageId = await nextId("prediction_input_lineage");
let appended = 0;
for (const snapshot of snapshots) {
  const availableFields = Object.entries(snapshot.factors).filter(([, factor]) => factor.value != null).map(([field]) => field);
  const missingFields = Object.entries(snapshot.factors).filter(([, factor]) => factor.value == null).map(([field]) => field);
  await query(`INSERT INTO data_completeness_metrics (id, run_id, symbol, dataset_type, completeness_score, available_fields, missing_fields, as_of, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [completenessId++, runId, snapshot.symbol, "prediction-factors", Math.round((availableFields.length / 6) * 100), JSON.stringify(availableFields), JSON.stringify(missingFields), now.slice(0, 10), now]);
  for (const entry of snapshot.lineage) {
    await query(`INSERT INTO prediction_input_lineage (id, prediction_run_id, symbol, metric, source_table, source_field, source_name, source_url, as_of, retrieved_at, freshness_days, availability, is_fallback, is_synthetic, rejection_reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [lineageId++, runId, entry.symbol, entry.metric, entry.sourceTable, entry.sourceField, entry.source, entry.sourceUrl ?? null, entry.asOf, entry.retrievedAt, entry.freshnessDays, entry.availability, entry.isFallback ? 1 : 0, entry.isSynthetic ? 1 : 0, entry.rejectionReason ?? null]);
  }
  if (!complete.includes(snapshot)) continue;
  const validPrices = validateMarketPriceRecords(bySymbolPrices.get(snapshot.symbol) ?? []).accepted.sort((a, b) => a.tradingDate.localeCompare(b.tradingDate));
  const latest = validPrices[validPrices.length - 1];
  if (!latest || snapshot.rankingScore == null || snapshot.classification == null) continue;
  const exists = await query(`SELECT id FROM prediction_registry WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = $3 LIMIT 1`, [snapshot.symbol, latest.tradingDate, horizon]);
  if (exists.rows.length > 0) continue;
  await query(`INSERT INTO prediction_registry (symbol, prediction_date, ranking_score, classification, confidence_score, confidence_level, quality_score, growth_score, value_score, momentum_score, risk_score, sector_score, price_at_prediction, benchmark_level, prediction_horizon, validation_status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`, [snapshot.symbol, latest.tradingDate, snapshot.rankingScore, snapshot.classification, snapshot.confidenceScore, confidenceLevel(snapshot.confidenceScore), snapshot.factors.quality_score.value, snapshot.factors.growth_score.value, snapshot.factors.value_score.value, snapshot.factors.momentum_score.value, snapshot.factors.risk_score.value, snapshot.factors.sector_score.value, latest.close, null, horizon, "pending", "ManualSnapshot"]);
  appended += 1;
}
console.log(JSON.stringify({ runId, appended, status: "completed" }, null, 2));
