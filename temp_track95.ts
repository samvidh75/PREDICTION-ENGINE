/**
 * TRACK-95 — DATA QUALITY CERTIFICATION
 * Audits: daily_prices, factor_snapshots, feature_snapshots,
 * prediction_registry, outcome_repository
 */
import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const db = new Database('data/stockstory.db');
const REPORT_DIR = './reports/track-95';
if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });

function count(sql: string, ...params: unknown[]): number {
  try { return Number((db.prepare(sql).get(...params) as any)?.cnt ?? 0); } catch { return 0; }
}
function queryAll(sql: string, ...params: unknown[]): any[] {
  try { return db.prepare(sql).all(...params) as any[]; } catch { return []; }
}

const today = new Date().toISOString().split('T')[0];
const issues: string[] = [];
let score = 0;
const maxScore = 100;

console.log('═══════════════════════════════════════');
console.log('  TRACK-95 — DATA QUALITY CERTIFICATION');
console.log(`  ${today}`);
console.log('═══════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════
// 1. daily_prices
// ═══════════════════════════════════════════════════════════════
console.log('── daily_prices ──');

const dpTotal = count('SELECT COUNT(*) as cnt FROM daily_prices');
const dpSymbols = count('SELECT COUNT(DISTINCT symbol) as cnt FROM daily_prices');
const dpNullClose = count('SELECT COUNT(*) as cnt FROM daily_prices WHERE close IS NULL');
const dpNullOpen = count('SELECT COUNT(*) as cnt FROM daily_prices WHERE open IS NULL');
const dpNullHigh = count('SELECT COUNT(*) as cnt FROM daily_prices WHERE high IS NULL');
const dpNullLow = count('SELECT COUNT(*) as cnt FROM daily_prices WHERE low IS NULL');
const dpDupes = count(
  'SELECT COUNT(*) as cnt FROM (SELECT symbol, trade_date, COUNT(*) as c FROM daily_prices GROUP BY symbol, trade_date HAVING c > 1)'
);
const dpAnomalies = queryAll(
  "SELECT symbol, trade_date, open, close, ABS((close - open) / NULLIF(open, 0)) as pct_change FROM daily_prices WHERE close IS NOT NULL AND open IS NOT NULL AND ABS((close - open) / NULLIF(open, 0)) > 0.5 ORDER BY pct_change DESC LIMIT 10"
);

// Staleness
const dpLatest = queryAll('SELECT MAX(trade_date) as latest FROM daily_prices')[0]?.latest;
const dpAge = dpLatest ? Math.floor((Date.now() - new Date(dpLatest).getTime()) / 86400000) : 999;

// Date range
const dpEarliest = queryAll('SELECT MIN(trade_date) as earliest FROM daily_prices')[0]?.earliest;
const dpSymsByRows = queryAll(
  'SELECT symbol, COUNT(*) as row_count, MIN(trade_date) as earliest, MAX(trade_date) as latest FROM daily_prices GROUP BY symbol ORDER BY row_count ASC LIMIT 10'
);

// Orphan checks
const dpOrphans = count('SELECT COUNT(DISTINCT dp.symbol) as cnt FROM daily_prices dp WHERE dp.symbol NOT IN (SELECT symbol FROM symbols)');

console.log(`  Total rows: ${dpTotal}`);
console.log(`  Symbols: ${dpSymbols}`);
console.log(`  NULL close: ${dpNullClose}`);
console.log(`  NULL open: ${dpNullOpen}`);
console.log(`  NULL high: ${dpNullHigh}`);
console.log(`  NULL low: ${dpNullLow}`);
console.log(`  Duplicate rows: ${dpDupes}`);
console.log(`  Orphan symbols: ${dpOrphans}`);
console.log(`  Latest date: ${dpLatest} (${dpAge}d ago)`);
console.log(`  Earliest date: ${dpEarliest}`);
console.log(`  Price anomalies (>50% daily move): ${dpAnomalies.length}`);

if (dpNullClose > 0) issues.push(`daily_prices: ${dpNullClose} rows with NULL close`);
if (dpDupes > 0) issues.push(`daily_prices: ${dpDupes} duplicate (symbol, date) rows`);
if (dpOrphans > 0) issues.push(`daily_prices: ${dpOrphans} orphan symbols`);
if (dpAnomalies.length > 0) issues.push(`daily_prices: ${dpAnomalies.length} price anomalies >50% daily move`);
if (dpAge > 5) issues.push(`daily_prices: latest data is ${dpAge}d old`);

if (dpAnomalies.length > 0) {
  console.log('  Anomaly samples:');
  for (const a of dpAnomalies.slice(0, 5)) {
    console.log(`    ${a.symbol} ${a.trade_date}: open=${a.open} close=${a.close} change=${((a.pct_change as number)*100).toFixed(1)}%`);
  }
}

let dpScore = 20;
if (dpNullClose > 0) dpScore -= 3;
if (dpOrphans > 0) dpScore -= 2;
if (dpDupes > 0) dpScore -= 2;
if (dpAge > 5) dpScore -= 3;
if (dpAnomalies.length > 5) dpScore -= 2;
score += dpScore;

// ═══════════════════════════════════════════════════════════════
// 2. factor_snapshots
// ═══════════════════════════════════════════════════════════════
console.log('\n── factor_snapshots ──');

const fsTotal = count('SELECT COUNT(*) as cnt FROM factor_snapshots');
const fsSymbols = count('SELECT COUNT(DISTINCT symbol) as cnt FROM factor_snapshots');
const fsNullScore = count('SELECT COUNT(*) as cnt FROM factor_snapshots WHERE factor_score IS NULL');
const fsNullColumns = ['quality_factor', 'value_factor', 'growth_factor', 'momentum_factor', 'risk_factor', 'sector_strength_factor'];
for (const col of fsNullColumns) {
  const nulls = count(`SELECT COUNT(*) as cnt FROM factor_snapshots WHERE ${col} IS NULL`);
  if (nulls > 0) console.log(`  NULL ${col}: ${nulls}`);
}
const fsDupes = count(
  'SELECT COUNT(*) as cnt FROM (SELECT symbol, trade_date, COUNT(*) as c FROM factor_snapshots GROUP BY symbol, trade_date HAVING c > 1)'
);
const fsOrphans = count('SELECT COUNT(DISTINCT fs.symbol) as cnt FROM factor_snapshots fs WHERE fs.symbol NOT IN (SELECT symbol FROM symbols)');
const fsLatest = queryAll('SELECT MAX(trade_date) as latest FROM factor_snapshots')[0]?.latest;
const fsAge = fsLatest ? Math.floor((Date.now() - new Date(fsLatest).getTime()) / 86400000) : 999;
const fsScores = queryAll('SELECT AVG(factor_score) as avg, MIN(factor_score) as min, MAX(factor_score) as max FROM factor_snapshots')[0];
const fsCorrelation = queryAll(
  `SELECT fs.symbol, fs.trade_date, fs.factor_score, dp.close FROM factor_snapshots fs
   JOIN daily_prices dp ON fs.symbol = dp.symbol AND fs.trade_date = dp.trade_date
   WHERE fs.factor_score IS NOT NULL AND dp.close IS NOT NULL
   ORDER BY fs.trade_date DESC LIMIT 1`
);

console.log(`  Total rows: ${fsTotal}`);
console.log(`  Symbols: ${fsSymbols}`);
console.log(`  NULL factor_score: ${fsNullScore}`);
console.log(`  Duplicates: ${fsDupes}`);
console.log(`  Orphan symbols: ${fsOrphans}`);
console.log(`  Latest date: ${fsLatest} (${fsAge}d ago)`);
console.log(`  Score range: ${Number(fsScores?.min).toFixed(1)} - ${Number(fsScores?.max).toFixed(1)} (avg ${Number(fsScores?.avg).toFixed(1)})`);

// Survivorship: check if symbols that exist in daily_prices have factors
const dpOnly = queryAll(
  `SELECT DISTINCT dp.symbol FROM daily_prices dp
   WHERE dp.symbol NOT IN (SELECT DISTINCT symbol FROM factor_snapshots)
   LIMIT 20`
).map((r: any) => r.symbol);
console.log(`  Survivorship gap (prices but no factors): ${dpOnly.length}`);
if (dpOnly.length > 0) console.log(`    ${dpOnly.join(', ')}`);

if (fsNullScore > 0) issues.push(`factor_snapshots: ${fsNullScore} rows with NULL factor_score`);
if (fsDupes > 0) issues.push(`factor_snapshots: ${fsDupes} duplicates`);
if (fsOrphans > 0) issues.push(`factor_snapshots: ${fsOrphans} orphan symbols`);
if (fsAge > 5) issues.push(`factor_snapshots: ${fsAge}d stale`);
if (dpOnly.length > 10) issues.push(`factor_snapshots: ${dpOnly.length} symbols with prices but no factors (survivorship)`);

let fsScore = 20;
if (fsNullScore > 0) fsScore -= 2;
if (fsDupes > 0) fsScore -= 2;
if (fsOrphans > 0) fsScore -= 2;
if (fsAge > 5) fsScore -= 3;
if (dpOnly.length > 10) fsScore -= 2;
score += fsScore;

// ═══════════════════════════════════════════════════════════════
// 3. feature_snapshots
// ═══════════════════════════════════════════════════════════════
console.log('\n── feature_snapshots ──');

const fesTotal = count('SELECT COUNT(*) as cnt FROM feature_snapshots');
const fesSymbols = count('SELECT COUNT(DISTINCT symbol) as cnt FROM feature_snapshots');
const fesNullColumns = ['rsi', 'macd', 'macd_signal', 'macd_histogram', 'adx', 'atr', 'bollinger_width', 'momentum', 'volatility', 'relative_strength', 'moving_average_distance', 'trend_strength'];
for (const col of fesNullColumns) {
  const nulls = count(`SELECT COUNT(*) as cnt FROM feature_snapshots WHERE ${col} IS NULL`);
  if (nulls > 0) console.log(`  NULL ${col}: ${nulls} / ${fesTotal} (${((nulls / fesTotal) * 100).toFixed(1)}%)`);
}
const fesDupes = count(
  'SELECT COUNT(*) as cnt FROM (SELECT symbol, trade_date, COUNT(*) as c FROM feature_snapshots GROUP BY symbol, trade_date HAVING c > 1)'
);
const fesOrphans = count('SELECT COUNT(DISTINCT fs.symbol) as cnt FROM feature_snapshots fs WHERE fs.symbol NOT IN (SELECT symbol FROM symbols)');
const fesLatest = queryAll('SELECT MAX(trade_date) as latest FROM feature_snapshots')[0]?.latest;
const fesAge = fesLatest ? Math.floor((Date.now() - new Date(fesLatest).getTime()) / 86400000) : 999;
const fesPerSymbol = queryAll(
  'SELECT symbol, COUNT(*) as cnt FROM feature_snapshots GROUP BY symbol ORDER BY cnt ASC LIMIT 5'
);

console.log(`  Total rows: ${fesTotal}`);
console.log(`  Symbols: ${fesSymbols}`);
console.log(`  Duplicates: ${fesDupes}`);
console.log(`  Orphan symbols: ${fesOrphans}`);
console.log(`  Latest date: ${fesLatest} (${fesAge}d ago)`);
console.log(`  Sparse symbols: ${fesPerSymbol.map((r: any) => `${r.symbol}=${r.cnt}`).join(', ')}`);

let nullFeatureCount = 0;
for (const col of fesNullColumns) {
  nullFeatureCount += count(`SELECT COUNT(*) as cnt FROM feature_snapshots WHERE ${col} IS NULL`);
}
if (nullFeatureCount > 0) issues.push(`feature_snapshots: ${nullFeatureCount} NULL values across columns`);
if (fesDupes > 0) issues.push(`feature_snapshots: ${fesDupes} duplicates`);
if (fesOrphans > 0) issues.push(`feature_snapshots: ${fesOrphans} orphans`);
if (fesAge > 5) issues.push(`feature_snapshots: ${fesAge}d stale`);

let fesScore = 20;
if (nullFeatureCount > fesTotal) fesScore -= 5;
else if (nullFeatureCount > 0) fesScore -= 2;
if (fesDupes > 0) fesScore -= 2;
if (fesOrphans > 0) fesScore -= 2;
if (fesAge > 5) fesScore -= 3;
score += fesScore;

// ═══════════════════════════════════════════════════════════════
// 4. prediction_registry
// ═══════════════════════════════════════════════════════════════
console.log('\n── prediction_registry ──');

const prTotal = count('SELECT COUNT(*) as cnt FROM prediction_registry');
const prSymbols = count('SELECT COUNT(DISTINCT symbol) as cnt FROM prediction_registry');
const prNullScore = count('SELECT COUNT(*) as cnt FROM prediction_registry WHERE ranking_score IS NULL');
const prDupes = count(
  'SELECT COUNT(*) as cnt FROM (SELECT symbol, prediction_date, prediction_horizon, COUNT(*) as c FROM prediction_registry GROUP BY symbol, prediction_date, prediction_horizon HAVING c > 1)'
);
const prOrphans = count('SELECT COUNT(DISTINCT pr.symbol) as cnt FROM prediction_registry pr WHERE pr.symbol NOT IN (SELECT symbol FROM symbols)');
const prLatest = queryAll('SELECT MAX(prediction_date) as latest FROM prediction_registry')[0]?.latest;
const prAge = prLatest ? Math.floor((Date.now() - new Date(prLatest).getTime()) / 86400000) : 999;
const prByHorizon = queryAll(
  'SELECT prediction_horizon, COUNT(*) as cnt, COUNT(DISTINCT symbol) as syms FROM prediction_registry GROUP BY prediction_horizon'
);
const prClassificationDist = queryAll(
  'SELECT classification, COUNT(*) as cnt FROM prediction_registry GROUP BY classification ORDER BY cnt DESC'
);
const prAllScoresSame = queryAll(
  'SELECT symbol, prediction_date, prediction_horizon, ranking_score, quality_score, growth_score, value_score, momentum_score, risk_score, sector_score FROM prediction_registry WHERE ranking_score = quality_score AND quality_score = growth_score AND growth_score = value_score AND value_score = momentum_score AND momentum_score = risk_score AND risk_score = sector_score LIMIT 10'
);
const prDefault50 = count(
  'SELECT COUNT(*) as cnt FROM prediction_registry WHERE ranking_score = 50 AND quality_score = 50 AND growth_score = 50 AND value_score = 50 AND momentum_score = 50 AND risk_score = 50 AND sector_score = 50'
);

console.log(`  Total rows: ${prTotal}`);
console.log(`  Symbols: ${prSymbols}`);
console.log(`  NULL ranking_score: ${prNullScore}`);
console.log(`  Duplicates: ${prDupes}`);
console.log(`  Orphan symbols: ${prOrphans}`);
console.log(`  Latest date: ${prLatest} (${prAge}d ago)`);
console.log(`  Horizon distribution:`);
for (const h of prByHorizon) console.log(`    ${h.prediction_horizon}d: ${h.cnt} predictions (${h.syms} symbols)`);
console.log(`  Classification distribution:`);
for (const c of prClassificationDist) console.log(`    ${c.classification}: ${c.cnt}`);
console.log(`  Default 50-score predictions: ${prDefault50} (${((prDefault50/prTotal)*100).toFixed(1)}%)`);

if (prNullScore > 0) issues.push(`prediction_registry: ${prNullScore} NULL scores`);
if (prDupes > 0) issues.push(`prediction_registry: ${prDupes} duplicates`);
if (prOrphans > 0) issues.push(`prediction_registry: ${prOrphans} orphans`);
if (prAge > 2) issues.push(`prediction_registry: ${prAge}d stale (should be daily)`);
if (prDefault50 > prTotal * 0.3) issues.push(`prediction_registry: ${((prDefault50/prTotal)*100).toFixed(1)}% default 50-score (placeholder data)`);

let prScore = 20;
if (prNullScore > 0) prScore -= 3;
if (prDupes > 0) prScore -= 3;
if (prOrphans > 0) prScore -= 2;
if (prAge > 2) prScore -= 4;
if (prDefault50 > prTotal * 0.3) prScore -= 5;
score += prScore;

// ═══════════════════════════════════════════════════════════════
// 5. outcome_repository (or prediction_registry validated rows)
// ═══════════════════════════════════════════════════════════════
console.log('\n── outcome_repository ──');

const orTable = queryAll("SELECT name FROM sqlite_master WHERE type='table' AND name='outcome_repository'");
const hasOutcomeTable = orTable.length > 0;

if (hasOutcomeTable) {
  console.log('  outcome_repository table exists');
  const orTotal = count('SELECT COUNT(*) as cnt FROM outcome_repository');
  console.log(`  Total rows: ${orTotal}`);
} else {
  console.log('  outcome_repository table DOES NOT EXIST');
  console.log('  Using prediction_registry validated rows as outcome proxy');
  const validated = count("SELECT COUNT(*) as cnt FROM prediction_registry WHERE validation_status = 'validated'");
  const pending = count("SELECT COUNT(*) as cnt FROM prediction_registry WHERE validation_status = 'pending'");
  const past30d = count("SELECT COUNT(*) as cnt FROM prediction_registry WHERE prediction_date <= ?", new Date(Date.now() - 30*86400000).toISOString().split('T')[0]);
  const expired = count("SELECT COUNT(*) as cnt FROM prediction_registry WHERE validation_status = 'expired'");
  console.log(`  Validated: ${validated}`);
  console.log(`  Pending: ${pending}`);
  console.log(`  Past 30d horizon (should be validated): ${past30d}`);
  console.log(`  Expired: ${expired}`);

  if (validated === 0 && pending > 0) issues.push('outcome_repository: 0 validated outcomes — validation pipeline not running');
  if (past30d > validated * 2) issues.push(`outcome_repository: ${past30d} past-horizon predictions not validated`);

  let orScore = 20;
  if (validated === 0) orScore -= 8;
  if (pending > past30d) orScore -= 3;
  score += orScore;
}

// ═══════════════════════════════════════════════════════════════
// CLASSIFICATION
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════');

let classification = 'POOR';
if (score >= 60) classification = 'ACCEPTABLE';
if (score >= 75) classification = 'GOOD';
if (score >= 90) classification = 'INSTITUTIONAL';

console.log(`  Total Score: ${score}/${maxScore}`);
console.log(`  Classification: ${classification}`);
console.log(`  Issues Found: ${issues.length}`);
if (issues.length > 0) {
  for (const issue of issues) console.log(`    • ${issue}`);
}

// Write report
const report = {
  track: 'TRACK-95',
  date: today,
  total_score: score,
  max_score: maxScore,
  classification,
  issues,
  tables: {
    daily_prices: {
      total_rows: dpTotal, symbols: dpSymbols,
      null_close: dpNullClose, null_open: dpNullOpen, null_high: dpNullHigh, null_low: dpNullLow,
      duplicates: dpDupes, orphans: dpOrphans, price_anomalies_gt50pct: dpAnomalies.length,
      latest_date: dpLatest, age_days: dpAge, earliest_date: dpEarliest,
      sparse_symbols: dpSymsByRows.slice(0, 5).map((r: any) => ({ symbol: r.symbol, rows: r.row_count, earliest: r.earliest, latest: r.latest })),
      score: dpScore
    },
    factor_snapshots: {
      total_rows: fsTotal, symbols: fsSymbols,
      null_score: fsNullScore, duplicates: fsDupes, orphans: fsOrphans,
      latest_date: fsLatest, age_days: fsAge,
      score_range: { min: Number(fsScores?.min), max: Number(fsScores?.max), avg: Number(fsScores?.avg) },
      survivorship_gap_symbols: dpOnly.length,
      score: fsScore
    },
    feature_snapshots: {
      total_rows: fesTotal, symbols: fesSymbols,
      null_columns: fesNullColumns.map(col => ({ column: col, nulls: count(`SELECT COUNT(*) FROM feature_snapshots WHERE ${col} IS NULL`) })),
      duplicates: fesDupes, orphans: fesOrphans,
      latest_date: fesLatest, age_days: fesAge,
      score: fesScore
    },
    prediction_registry: {
      total_rows: prTotal, symbols: prSymbols,
      null_score: prNullScore, duplicates: prDupes, orphans: prOrphans,
      latest_date: prLatest, age_days: prAge,
      horizon_distribution: prByHorizon.map((r: any) => ({ horizon: r.prediction_horizon, count: r.cnt, symbols: r.syms })),
      classification_distribution: prClassificationDist,
      default_50_score_count: prDefault50, default_50_pct: ((prDefault50/prTotal)*100).toFixed(1),
      score: prScore
    },
    outcome_repository: {
      table_exists: hasOutcomeTable,
      proxy_using_prediction_registry: !hasOutcomeTable,
      validated: count("SELECT COUNT(*) FROM prediction_registry WHERE validation_status='validated'"),
      pending: count("SELECT COUNT(*) FROM prediction_registry WHERE validation_status='pending'"),
      past_30d_pending: count(`SELECT COUNT(*) FROM prediction_registry WHERE prediction_date <= '${new Date(Date.now()-30*86400000).toISOString().split('T')[0]}'`)
    }
  }
};

const reportPath = join(REPORT_DIR, 'DATA_QUALITY_REPORT.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n  Report: ${reportPath}`);

db.close();
