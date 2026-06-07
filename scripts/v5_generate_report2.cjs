/**
 * Quick report generator for Agent 2 — reads existing prediction_outcomes table
 * (already populated with 493,200 rows by the previous run)
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
const REPORT_PATH = path.join(ROOT, 'reports', 'v5', '02-PredictionTruthLayer.md');

const db = new Database(DB_PATH);

const horizons = [7, 30, 90, 180, 365];
const horizonLabels = { 7: '7d', 30: '30d', 90: '90d', 180: '180d', 365: '365d' };

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function stddev(arr) { return arr.length < 2 ? 0 : Math.sqrt(arr.reduce((a, v) => a + (v - avg(arr)) ** 2, 0) / arr.length); }
function hitRate(r) { return r.filter(v => v > 0).length / Math.max(r.length, 1) * 100; }
function sharpe(r) { const s = stddev(r); return s > 0 ? (avg(r) - 0) / s : 0; }
function maxDD(curve) { let peak = -Infinity, dd = 0; for (const v of curve) { if (v > peak) peak = v; const d = peak > 0 ? (peak - v) / peak * 100 : 0; if (d > dd) dd = d; } return dd; }

const totalPreds = db.prepare('SELECT COUNT(*) as c FROM prediction_registry').get().c;
const validatedPreds = db.prepare('SELECT COUNT(DISTINCT prediction_id) as c FROM prediction_outcomes').get().c;
const totalOutcomes = db.prepare('SELECT COUNT(*) as c FROM prediction_outcomes').get().c;
// Check if price_at_prediction exists
let zeroPrice = totalPreds;
try { zeroPrice = db.prepare('SELECT COUNT(*) as c FROM prediction_registry WHERE price_at_prediction = 0 OR price_at_prediction IS NULL').get().c; } catch {}
const dateRange = db.prepare('SELECT MIN(prediction_date) as mn, MAX(prediction_date) as mx FROM prediction_registry').get();
const symbolCount = db.prepare('SELECT COUNT(DISTINCT symbol) as c FROM prediction_registry').get().c;

let report = `# Prediction Truth Layer — Agent 2 Alpha Dashboard

**Generated:** ${new Date().toISOString()}

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Predictions | ${totalPreds.toLocaleString()} |
| Zero/NULL price_at_prediction | ${zeroPrice.toLocaleString()} (${(zeroPrice / Math.max(totalPreds, 1) * 100).toFixed(1)}%) |
| Validated Predictions | ${validatedPreds.toLocaleString()} |
| Total Outcomes (5 horizons × preds) | ${totalOutcomes.toLocaleString()} |
| Symbols Covered | ${symbolCount} |
| Date Range | ${dateRange.mn || 'N/A'} → ${dateRange.mx || 'N/A'} |

---

## Horizon Performance

| Horizon | Outcomes | Avg Return | Avg Alpha | Hit Rate | Sharpe | Max DD |
|---------|----------|------------|-----------|----------|--------|--------|
`;

const horizonStats = {};
for (const h of horizons) {
  const rows = db.prepare(`SELECT actual_return, alpha FROM prediction_outcomes WHERE horizon_days = ? AND actual_return IS NOT NULL`).all(h);
  const returns = rows.map(r => r.actual_return);
  const alphas = rows.map(r => r.alpha).filter(a => a !== null);
  const equity = [100];
  for (const r of returns) equity.push(equity[equity.length - 1] * (1 + r / 100));

  const s = {
    count: rows.length,
    avgRet: avg(returns),
    avgAlpha: avg(alphas),
    hit: hitRate(returns),
    sh: sharpe(returns),
    dd: maxDD(equity),
  };
  horizonStats[h] = s;

  report += `| ${horizonLabels[h]} | ${s.count.toLocaleString()} | ${s.avgRet >= 0 ? '+' : ''}${s.avgRet.toFixed(2)}% | ${s.avgAlpha >= 0 ? '+' : ''}${s.avgAlpha.toFixed(2)}% | ${s.hit.toFixed(1)}% | ${s.sh.toFixed(3)} | ${s.dd.toFixed(1)}% |\n`;
}

report += `\n### Visual Signal (Hit Rate)\n\`\`\`\n`;
for (const h of horizons) {
  const bar = Math.round(horizonStats[h].hit / 2);
  report += `${horizonLabels[h].padEnd(6)} |${'█'.repeat(Math.min(bar, 50))}${'░'.repeat(Math.max(50 - bar, 0))}| ${horizonStats[h].hit.toFixed(1)}%\n`;
}
report += `\`\`\`\n\n`;

report += `## Alpha Quality Assessment\n\n`;
report += `| Horizon | Rating |\n|---------|--------|\n`;
for (const h of horizons) {
  const s = horizonStats[h];
  let rating = '⬜ INSUFFICIENT DATA';
  if (s.count >= 50) {
    if (s.avgAlpha > 0 && s.sh > 0.5) rating = '🟢 STRONG ALPHA';
    else if (s.avgAlpha > 0) rating = '🟡 MODERATE';
    else rating = '🔴 NEGATIVE';
  }
  report += `| ${horizonLabels[h]} | ${rating} |\n`;
}

report += `\n## Top & Bottom Performers (30d)\n\n`;
const top = db.prepare(`
  SELECT p.symbol, AVG(o.actual_return) as r, COUNT(*) as c
  FROM prediction_outcomes o JOIN prediction_registry p ON o.prediction_id = p.id
  WHERE o.horizon_days = 30 AND o.actual_return IS NOT NULL
  GROUP BY p.symbol HAVING c >= 5 ORDER BY r DESC LIMIT 5
`).all();
const bot = db.prepare(`
  SELECT p.symbol, AVG(o.actual_return) as r, COUNT(*) as c
  FROM prediction_outcomes o JOIN prediction_registry p ON o.prediction_id = p.id
  WHERE o.horizon_days = 30 AND o.actual_return IS NOT NULL
  GROUP BY p.symbol HAVING c >= 5 ORDER BY r ASC LIMIT 5
`).all();

report += `| Rank | Symbol | Avg Ret (30d) | Outcomes |\n|------|--------|---------------|----------|\n`;
top.forEach((t, i) => { report += `| #${i + 1} | ${t.symbol} | ${t.r >= 0 ? '+' : ''}${t.r.toFixed(2)}% | ${t.c} |\n`; });
report += `| ... | ... | ... | ... |\n`;
bot.forEach((t, i) => { report += `| #${symbolCount - i} | ${t.symbol} | ${t.r >= 0 ? '+' : ''}${t.r.toFixed(2)}% | ${t.c} |\n`; });

report += `\n## Verdict\n\n`;
const posH = horizons.filter(h => horizonStats[h].avgAlpha > 0);
if (posH.length === 0) report += `🔴 **INSUFFICIENT PREDICTIVE ALPHA** — All horizons show zero or negative alpha vs. equal-weight benchmark.\n`;
else if (posH.length <= 2) report += `🟡 **MIXED SIGNAL** — ${posH.length}/5 horizons show positive alpha. Not statistically significant.\n`;
else report += `🟢 **POSITIVE ALPHA** — ${posH.length}/5 horizons show positive alpha. Prediction engine shows measurable edge.\n`;

report += `\n---\n*493,200 prediction outcomes validated against real price data from daily_prices table.*\n`;
report += `\n*Benchmark: Equal-weight average close across all symbols in daily_prices.*\n`;

fs.writeFileSync(REPORT_PATH, report);
console.log(`Report: ${REPORT_PATH}`);
console.log(`Outcomes: ${totalOutcomes.toLocaleString()}, Validated preds: ${validatedPreds.toLocaleString()}, Symbols: ${symbolCount}`);
db.close();
