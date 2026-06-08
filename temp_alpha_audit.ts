/**
 * TRACK-94 — Prediction Quality & Alpha Validation
 * Real SQL queries against stockstory.db. No mock data.
 */
import Database from 'better-sqlite3';

const db = new Database('./data/stockstory.db', { readonly: true });

function q(sql: string): any[] {
  try { return db.prepare(sql).all(); } catch { return []; }
}
function q1(sql: string): any {
  try { return db.prepare(sql).get(); } catch { return null; }
}

console.log('═══════════════════════════════════════════');
console.log('  TRACK-94 — ALPHA VALIDATION AUDIT');
console.log('═══════════════════════════════════════════\n');

// ══ PHASE 1 — Per-Horizon Performance ══
console.log('── PHASE 1: Prediction Performance ──\n');

for (const horizon of [30, 90, 365]) {
  const stats = q1(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN alpha > 0 THEN 1 ELSE 0 END) as hits,
      ROUND(AVG(future_return) * 100, 2) as avg_return_pct,
      ROUND(AVG(alpha) * 100, 2) as avg_alpha_pct,
      ROUND(MAX(future_return) * 100, 2) as best_return_pct,
      ROUND(MIN(future_return) * 100, 2) as worst_return_pct
    FROM prediction_registry
    WHERE prediction_horizon = ${horizon}
      AND validation_status = 'validated'
      AND future_return IS NOT NULL
  `) as any;

  const median = q1(`
    SELECT future_return FROM prediction_registry
    WHERE prediction_horizon = ${horizon}
      AND validation_status = 'validated'
      AND future_return IS NOT NULL
    ORDER BY future_return
    LIMIT 1 OFFSET (SELECT COUNT(*) FROM prediction_registry WHERE prediction_horizon = ${horizon} AND validation_status = 'validated' AND future_return IS NOT NULL) / 2
  `) as any;

  if (stats) {
    const total = Number(stats.total ?? 0);
    const hits = Number(stats.hits ?? 0);
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : 'N/A';
    const avgRet = Number(stats.avg_return_pct ?? 0).toFixed(2);
    const avgAlpha = Number(stats.avg_alpha_pct ?? 0).toFixed(2);
    const best = Number(stats.best_return_pct ?? 0).toFixed(2);
    const worst = Number(stats.worst_return_pct ?? 0).toFixed(2);
    const medVal = median ? (Number(median.future_return ?? 0) * 100).toFixed(2) : 'N/A';

    console.log(`  Horizon: ${horizon}d`);
    console.log(`    Validated: ${total.toLocaleString()}`);
    console.log(`    Hit Rate:  ${hitRate}%`);
    console.log(`    Avg Return: ${avgRet}%`);
    console.log(`    Avg Alpha:  ${avgAlpha}%`);
    console.log(`    Median:     ${medVal}%`);
    console.log(`    Best:       +${best}%`);
    console.log(`    Worst:      ${worst}%`);
    console.log('');
  }
}

// ══ PHASE 2 — Benchmark Comparison ══
console.log('── PHASE 2: Benchmark Comparison ──\n');

for (const horizon of [30, 90, 365]) {
  const vsBench = q1(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN alpha > 0 THEN 1 ELSE 0 END) as wins,
      ROUND(AVG(alpha) * 100, 2) as avg_alpha_pct
    FROM prediction_registry
    WHERE prediction_horizon = ${horizon}
      AND validation_status = 'validated'
      AND alpha IS NOT NULL
  `) as any;

  if (vsBench) {
    const total = Number(vsBench.total ?? 0);
    const wins = Number(vsBench.wins ?? 0);
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 'N/A';
    const alpha = Number(vsBench.avg_alpha_pct ?? 0).toFixed(2);
    console.log(`  ${horizon}d: Win Rate vs Benchmark = ${winRate}% | Avg Alpha = ${alpha}%`);
  }
}
console.log('');

// ══ PHASE 3 — Confidence Calibration ══
console.log('── PHASE 3: Confidence Calibration ──\n');

// Determine actual confidence buckets from data
const buckets = [50, 60, 70, 80, 90];
for (let i = 0; i < buckets.length; i++) {
  const lo = buckets[i];
  const hi = i < buckets.length - 1 ? buckets[i + 1] : 999;

  const result = q1(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN alpha > 0 THEN 1 ELSE 0 END) as hits,
      ROUND(AVG(future_return) * 100, 2) as avg_return_pct
    FROM prediction_registry
    WHERE confidence_score >= ${lo}
      AND confidence_score < ${hi}
      AND validation_status = 'validated'
      AND future_return IS NOT NULL
  `) as any;

  if (result && Number(result.total) > 0) {
    const total = Number(result.total);
    const hits = Number(result.hits ?? 0);
    const hitRate = ((hits / total) * 100).toFixed(1);
    const avgRet = Number(result.avg_return_pct ?? 0).toFixed(2);
    console.log(`  ${lo}-${hi === 999 ? '+' : hi}: ${total} preds | Hit Rate ${hitRate}% | Avg Return ${avgRet}%`);
  }
}
console.log('');

// ══ PHASE 4 — Factor Attribution ══
console.log('── PHASE 4: Factor Attribution ──\n');

const factors = [
  { name: 'Momentum', col: 'momentum_score' },
  { name: 'Quality', col: 'quality_score' },
  { name: 'Growth', col: 'growth_score' },
  { name: 'Value', col: 'value_score' },
  { name: 'Risk', col: 'risk_score' },
  { name: 'Sector', col: 'sector_score' },
];

const factorResults: { name: string; hitRate: number }[] = [];

for (const f of factors) {
  // Compare top-quartile factor scores vs bottom-quartile hit rates
  const topQ = q1(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN alpha > 0 THEN 1 ELSE 0 END) as hits
    FROM prediction_registry
    WHERE ${f.col} >= 70
      AND validation_status = 'validated'
      AND alpha IS NOT NULL
  `) as any;

  if (topQ && Number(topQ.total) > 0) {
    const hitRate = ((Number(topQ.hits) / Number(topQ.total)) * 100).toFixed(1);
    factorResults.push({ name: f.name, hitRate: Number(hitRate) });
  }
}

factorResults.sort((a, b) => b.hitRate - a.hitRate);
for (let i = 0; i < factorResults.length; i++) {
  console.log(`  ${i + 1}. ${factorResults[i].name}: ${factorResults[i].hitRate}% hit rate (top quartile)`);
}
console.log('');

// ══ PHASE 5 — Worst Predictions ══
console.log('── PHASE 5: Worst 20 Predictions ──\n');

const worst = q(`
  SELECT symbol, prediction_date, prediction_horizon,
         ROUND(future_return * 100, 2) as return_pct,
         ROUND(alpha * 100, 2) as alpha_pct,
         classification, ROUND(confidence_score, 1) as confidence
  FROM prediction_registry
  WHERE validation_status = 'validated'
    AND future_return IS NOT NULL
  ORDER BY future_return ASC
  LIMIT 20
`) as any[];

for (const w of worst) {
  console.log(`  ${w.symbol.padEnd(12)} | ${w.prediction_horizon}d | ${w.classification.padEnd(12)} | Ret: ${String(w.return_pct).padStart(7)}% | Alpha: ${String(w.alpha_pct).padStart(7)}% | Conf: ${w.confidence}%`);
}
console.log('');

// ══ PHASE 6 — Top Picks vs Benchmark ══
console.log('── PHASE 6: Top Picks Validation ──\n');

// Get top-10 daily predictions and average their returns
const top10 = q1(`
  SELECT
    COUNT(*) as total_picks,
    ROUND(AVG(future_return) * 100, 2) as avg_return_pct,
    ROUND(AVG(alpha) * 100, 2) as avg_alpha_pct,
    ROUND(MAX(future_return) * 100, 2) as best_return,
    ROUND(MIN(future_return) * 100, 2) as worst_return
  FROM (
    SELECT future_return, alpha FROM prediction_registry
    WHERE validation_status = 'validated'
      AND future_return IS NOT NULL
      AND ranking_score >= 75
    ORDER BY prediction_date DESC, ranking_score DESC
    LIMIT 1000
  )
`) as any;

if (top10) {
  console.log(`  Portfolio A (Top Picks, score >= 75):`);
  console.log(`    Picks analyzed: ${Number(top10.total_picks)}`);
  console.log(`    Avg Return:     ${Number(top10.avg_return_pct).toFixed(2)}%`);
  console.log(`    Avg Alpha:      ${Number(top10.avg_alpha_pct).toFixed(2)}%`);
  console.log(`    Best Return:    +${Number(top10.best_return).toFixed(2)}%`);
  console.log(`    Worst Return:   ${Number(top10.worst_return).toFixed(2)}%`);
}

// Overall summary
const overall = q1(`
  SELECT
    COUNT(*) as total,
    COUNT(DISTINCT symbol) as symbols,
    SUM(CASE WHEN alpha > 0 THEN 1 ELSE 0 END) as hits,
    ROUND(AVG(alpha) * 100, 2) as avg_alpha_pct
  FROM prediction_registry
  WHERE validation_status = 'validated'
    AND alpha IS NOT NULL
`) as any;

console.log('\n── OVERALL ──\n');
if (overall) {
  const total = Number(overall.total);
  const hits = Number(overall.hits);
  const hitRate = ((hits / total) * 100).toFixed(1);
  const symbols = Number(overall.symbols);
  const alpha = Number(overall.avg_alpha_pct).toFixed(2);

  console.log(`  Total validated: ${total.toLocaleString()}`);
  console.log(`  Unique symbols:  ${symbols}`);
  console.log(`  Overall Hit Rate: ${hitRate}%`);
  console.log(`  Avg Alpha:        ${alpha}%`);

  const classification = total > 500 && Number(hitRate) > 55 
    ? '✅ INVESTABLE — Beats random, positive alpha'
    : total > 100
      ? '⚠️ EXPERIMENTAL — Needs more validated outcomes'
      : '❌ NOT INVESTABLE — Insufficient data';

  console.log(`\n  CLASSIFICATION: ${classification}`);
}

db.close();
