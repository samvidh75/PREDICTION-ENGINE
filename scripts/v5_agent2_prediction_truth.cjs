/**
 * AGENT 2 — PREDICTION TRUTH LAYER
 * 
 * Tasks:
 * 1. Checks prediction_registry for price_at_prediction column; 
 *    counts predictions with price_at_prediction = 0 vs > 0
 * 2. Creates prediction_outcomes table if not exists
 * 3. Validates predictions against actual price movements across 
 *    horizons (7d/30d/90d/180d/365d)
 * 4. Generates alpha_dashboard report
 * 
 * Produces: reports/v5/02-PredictionTruthLayer.md
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
const REPORT_DIR = path.join(ROOT, 'reports', 'v5');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
const REPORT_PATH = path.join(REPORT_DIR, '02-PredictionTruthLayer.md');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ==================== HELPERS ====================
function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length);
}

function sharpe(returns, rf = 0) {
  const s = stddev(returns);
  return s > 0 ? (avg(returns) - rf) / s : 0;
}

function maxDrawdown(equityCurve) {
  let peak = -Infinity;
  let maxDD = 0;
  for (const v of equityCurve) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function hitRate(results) {
  return results.filter(r => r > 0).length / results.length * 100;
}

function computeReturn(entry, exit) {
  if (!entry || !exit || entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

function getPrice(symbol, date) {
  const r = db.prepare('SELECT close FROM daily_prices WHERE symbol = ? AND trade_date = ?').get(symbol, date);
  return r ? r.close : null;
}

function getFuturePrice(symbol, fromDate, daysAhead) {
  const r = db.prepare(`
    SELECT MIN(trade_date) as exit_date FROM daily_prices 
    WHERE symbol = ? AND trade_date >= ? AND trade_date >= date(?, '+' || ? || ' days')
  `).get(symbol, fromDate, fromDate, daysAhead);
  if (!r || !r.exit_date) return null;
  return getPrice(symbol, r.exit_date);
}

// ==================== TASK 1: AUDIT price_at_prediction ====================
function auditPriceAtPrediction() {
  console.log('\n[STEP 1] Auditing price_at_prediction column...');
  
  // Check if column exists
  let columnExists = false;
  try {
    const cols = db.prepare("PRAGMA table_info('prediction_registry')").all();
    columnExists = cols.some(c => c.name === 'price_at_prediction');
    
    if (!columnExists) {
      console.log('  WARNING: price_at_prediction column does NOT exist in prediction_registry');
      return {
        columnExists: false,
        zeroCount: 0,
        posCount: 0,
        nullCount: 0,
        total: 0
      };
    }
  } catch (e) {
    console.log(`  ERROR checking schema: ${e.message}`);
    return {
      columnExists: false,
      zeroCount: 0,
      posCount: 0,
      nullCount: 0,
      total: 0
    };
  }
  
  const zeroCount = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE price_at_prediction = 0').get().cnt;
  const posCount = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE price_at_prediction > 0').get().cnt;
  const nullCount = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE price_at_prediction IS NULL').get().cnt;
  const total = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry').get().cnt;
  
  console.log(`  Total predictions: ${total.toLocaleString()}`);
  console.log(`  price_at_prediction = 0:   ${zeroCount.toLocaleString()}`);
  console.log(`  price_at_prediction > 0:   ${posCount.toLocaleString()}`);
  console.log(`  price_at_prediction IS NULL: ${nullCount.toLocaleString()}`);
  
  return { columnExists: true, zeroCount, posCount, nullCount, total };
}

// ==================== TASK 2: CREATE prediction_outcomes TABLE ====================
function createPredictionOutcomesTable() {
  console.log('\n[STEP 2] Creating prediction_outcomes table...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS prediction_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prediction_id INTEGER NOT NULL,
      horizon_days INTEGER NOT NULL,
      actual_return REAL,
      benchmark_return REAL,
      alpha REAL,
      hit INTEGER DEFAULT 0,
      validated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (prediction_id) REFERENCES prediction_registry(id)
    )
  `);
  
  // Create index for faster lookups
  db.exec(`CREATE INDEX IF NOT EXISTS idx_po_prediction_id ON prediction_outcomes(prediction_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_po_horizon_days ON prediction_outcomes(horizon_days)`);
  
  console.log('  prediction_outcomes table ready (with indexes)');
}

// ==================== TASK 3: COMPUTE BENCHMARK RETURNS ====================
function computeBenchmarkReturns(predictionsByDate) {
  console.log('\n[STEP 3] Computing benchmark returns...');
  
  // Collect all prediction dates (only those that exist in daily_prices)
  const allDates = [...new Set(Object.keys(predictionsByDate))].sort();
  
  // Equal-weight benchmark: average close price across all symbols on each date
  const benchmarkLevels = {};
  for (const date of allDates) {
    const row = db.prepare('SELECT AVG(close) as avg_close FROM daily_prices WHERE trade_date = ?').get(date);
    if (row && row.avg_close) {
      benchmarkLevels[date] = row.avg_close;
    }
  }
  
  // For each date, compute benchmark forward returns to each horizon
  const benchmarkReturns = {};
  const horizons = [7, 30, 90, 180, 365];
  
  for (const date of allDates) {
    if (!benchmarkLevels[date]) continue;
    benchmarkReturns[date] = {};
    
    for (const h of horizons) {
      // Find the date h days after 'date' that has benchmark data
      const futureRow = db.prepare(`
        SELECT MIN(trade_date) as exit_date FROM daily_prices 
        WHERE trade_date >= date(?, '+' || ? || ' days')
      `).get(date, h);
      
      if (futureRow && futureRow.exit_date && benchmarkLevels[futureRow.exit_date]) {
        benchmarkReturns[date][h] = computeReturn(benchmarkLevels[date], benchmarkLevels[futureRow.exit_date]);
      } else {
        benchmarkReturns[date][h] = null;
      }
    }
  }
  
  console.log(`  Computed benchmark returns for ${Object.keys(benchmarkReturns).length} dates`);
  return benchmarkReturns;
}

// ==================== TASK 3: VALIDATE PREDICTIONS ====================
function validatePredictions(benchmarkReturns) {
  console.log('\n[STEP 3] Validating predictions against actual price movements...');
  
  const horizons = [7, 30, 90, 180, 365];
  
  // Get all predictions
  const predictions = db.prepare('SELECT * FROM prediction_registry ORDER BY prediction_date').all();
  console.log(`  Processing ${predictions.length.toLocaleString()} predictions...`);
  
  // Clear existing outcomes for fresh computation
  db.exec('DELETE FROM prediction_outcomes');
  
  const insertOutcome = db.prepare(`
    INSERT INTO prediction_outcomes 
    (prediction_id, horizon_days, actual_return, benchmark_return, alpha, hit, validated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  
  let totalInserted = 0;
  let totalSkippedNoPrice = 0;
  let totalSkippedNoExit = 0;
  
  const tx = db.transaction(() => {
    for (const p of predictions) {
      // Get entry price: prefer price_at_prediction, fall back to close on prediction_date
      let entryPrice = null;
      if (p.price_at_prediction && p.price_at_prediction > 0) {
        entryPrice = p.price_at_prediction;
      } else {
        entryPrice = getPrice(p.symbol, p.prediction_date);
      }
      
      if (!entryPrice) {
        totalSkippedNoPrice++;
        continue;
      }
      
      for (const h of horizons) {
        const exitPrice = getFuturePrice(p.symbol, p.prediction_date, h);
        if (!exitPrice) {
          totalSkippedNoExit++;
          continue;
        }
        
        const actualReturn = computeReturn(entryPrice, exitPrice);
        if (actualReturn === null) continue;
        
        // Get benchmark return for this prediction date and horizon
        let benchRet = null;
        if (benchmarkReturns[p.prediction_date] && benchmarkReturns[p.prediction_date][h] !== undefined) {
          benchRet = benchmarkReturns[p.prediction_date][h];
        }
        
        // Alpha = actual_return - benchmark_return
        const alpha = benchRet !== null ? actualReturn - benchRet : null;
        
        insertOutcome.run(
          p.id,           // prediction_id
          h,              // horizon_days
          actualReturn,   // actual_return
          benchRet,       // benchmark_return
          alpha,          // alpha
          actualReturn > 0 ? 1 : 0  // hit
        );
        totalInserted++;
      }
    }
  });
  
  tx();
  
  console.log(`  Inserted ${totalInserted.toLocaleString()} prediction outcomes`);
  console.log(`  Skipped (no entry price): ${totalSkippedNoPrice.toLocaleString()}`);
  console.log(`  Skipped (no exit price): ${totalSkippedNoExit.toLocaleString()}`);
  
  return totalInserted;
}

// ==================== TASK 4: GENERATE ALPHA DASHBOARD REPORT ====================
function generateAlphaDashboard(auditResult, totalOutcomes) {
  console.log('\n[STEP 4] Generating alpha dashboard report...');
  
  const horizons = [7, 30, 90, 180, 365];
  const horizonLabels = {
    7: '7 Days',
    30: '30 Days',
    90: '90 Days',
    180: '180 Days',
    365: '365 Days'
  };
  
  // Get stats per horizon
  const horizonStats = {};
  for (const h of horizons) {
    const outcomes = db.prepare(`
      SELECT actual_return, benchmark_return, alpha, hit
      FROM prediction_outcomes
      WHERE horizon_days = ? AND actual_return IS NOT NULL
    `).all(h);
    
    if (outcomes.length === 0) {
      horizonStats[h] = { count: 0, avgReturn: null, avgAlpha: null, hitRate: null, sharpe: null, maxDD: null };
      continue;
    }
    
    const returns = outcomes.map(o => o.actual_return);
    const alphas = outcomes.map(o => o.alpha).filter(a => a !== null);
    
    // Build equity curve for max drawdown
    const equity = [100];
    for (const r of returns) equity.push(equity[equity.length - 1] * (1 + r / 100));
    
    horizonStats[h] = {
      count: outcomes.length,
      avgReturn: avg(returns),
      avgAlpha: avg(alphas),
      hitRate: hitRate(returns),
      sharpe: sharpe(returns),
      maxDD: maxDrawdown(equity)
    };
  }
  
  // Get overall stats
  const totalPredictions = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry').get().cnt;
  const validatedPredictions = db.prepare('SELECT COUNT(DISTINCT prediction_id) as cnt FROM prediction_outcomes').get().cnt;
  const allReturns = db.prepare('SELECT actual_return FROM prediction_outcomes WHERE actual_return IS NOT NULL').all().map(r => r.actual_return);
  const allAlphas = db.prepare('SELECT alpha FROM prediction_outcomes WHERE alpha IS NOT NULL').all().map(r => r.alpha);
  
  // Overall equity curve
  const equity = [100];
  for (const r of allReturns) equity.push(equity[equity.length - 1] * (1 + r / 100));
  
  // Classification distribution
  const classificationDist = db.prepare(`
    SELECT classification, COUNT(*) as cnt 
    FROM prediction_registry 
    GROUP BY classification 
    ORDER BY cnt DESC
  `).all();
  
  // Confidence level distribution — skip if column doesn't exist
  let confidenceDist = [];
  try {
    confidenceDist = db.prepare(`
      SELECT confidence_level, COUNT(*) as cnt 
      FROM prediction_registry 
      GROUP BY confidence_level 
      ORDER BY cnt DESC
    `).all();
  } catch (e) {
    // confidence_level column may not exist in older backfilled tables
    confidenceDist = [];
  }
  
  // Date range
  const dateRange = db.prepare(`
    SELECT MIN(prediction_date) as first_date, MAX(prediction_date) as last_date
    FROM prediction_registry
  `).get();
  
  // Symbol coverage
  const symbolCount = db.prepare('SELECT COUNT(DISTINCT symbol) as cnt FROM prediction_registry').get().cnt;
  
  // Top/Bottom performers (30d)
  let top30d = [], bottom30d = [];
  try {
    top30d = db.prepare(`
      SELECT p.symbol, AVG(o.actual_return) as avg_ret, COUNT(*) as cnt
      FROM prediction_outcomes o
      JOIN prediction_registry p ON o.prediction_id = p.id
      WHERE o.horizon_days = 30 AND o.actual_return IS NOT NULL
      GROUP BY p.symbol
      HAVING cnt >= 5
      ORDER BY avg_ret DESC
      LIMIT 5
    `).all();
    
    bottom30d = db.prepare(`
      SELECT p.symbol, AVG(o.actual_return) as avg_ret, COUNT(*) as cnt
      FROM prediction_outcomes o
      JOIN prediction_registry p ON o.prediction_id = p.id
      WHERE o.horizon_days = 30 AND o.actual_return IS NOT NULL
      GROUP BY p.symbol
      HAVING cnt >= 5
      ORDER BY avg_ret ASC
      LIMIT 5
    `).all();
  } catch (e) {
    // Silently handle missing data
  }
  
  // Build report
  const report = `# Prediction Truth Layer — Agent 2 Alpha Dashboard

**Generated:** ${new Date().toISOString()}
**Database:** stockstory.db (SQLite)

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Total Predictions | ${totalPredictions.toLocaleString()} |
| Validated Predictions | ${validatedPredictions.toLocaleString()} |
| Validation Rate | ${totalPredictions > 0 ? (validatedPredictions / totalPredictions * 100).toFixed(1) : '0'}% |
| Total Outcomes | ${totalOutcomes.toLocaleString()} |
| Avg Alpha (all horizons) | ${allAlphas.length > 0 ? allAlphas.reduce((a,b) => a+b, 0) / allAlphas.length : 0 > 0 ? '+' : ''}${allAlphas.length > 0 ? (allAlphas.reduce((a,b) => a+b, 0) / allAlphas.length).toFixed(2) : 'N/A'}% |
| Overall Hit Rate | ${allReturns.length > 0 ? hitRate(allReturns).toFixed(1) : 'N/A'}% |
| Date Range | ${dateRange.first_date || 'N/A'} → ${dateRange.last_date || 'N/A'} |
| Symbols Covered | ${symbolCount} |

---

## TASK 1: PRICE AT PREDICTION AUDIT

| Status | Detail |
|--------|--------|
| Column Exists | ${auditResult.columnExists ? '✅ YES' : '❌ NO'} |
| price_at_prediction = 0 | ${auditResult.zeroCount.toLocaleString()} |
| price_at_prediction > 0 | ${auditResult.posCount.toLocaleString()} |
| price_at_prediction IS NULL | ${auditResult.nullCount.toLocaleString()} |
| Total Predictions | ${auditResult.total.toLocaleString()} |

${!auditResult.columnExists ? `
> ⚠️ **WARNING**: The \`price_at_prediction\` column does not exist in \`prediction_registry\`.
> All entry prices are sourced from \`daily_prices.close\` on \`prediction_date\` as fallback.
` : auditResult.zeroCount + auditResult.nullCount > auditResult.posCount ? `
> ⚠️ **WARNING**: ${((auditResult.zeroCount + auditResult.nullCount) / Math.max(auditResult.total, 1) * 100).toFixed(1)}% of predictions have zero or NULL price_at_prediction.
> This indicates the column may be under-populated or not being set during prediction generation.
> Falling back to daily_prices.close for entry prices.
` : `
> ✅ **GOOD**: ${(auditResult.posCount / Math.max(auditResult.total, 1) * 100).toFixed(1)}% of predictions have valid price_at_prediction values.
`}

---

## TASK 2: PREDICTION OUTCOMES TABLE

| Status |
|--------|
| ✅ \`prediction_outcomes\` created (or already exists) |
| ✅ Indexes on \`prediction_id\` and \`horizon_days\` |
| ✅ ${totalOutcomes.toLocaleString()} outcome records populated |

**Schema:**
\`\`\`sql
CREATE TABLE prediction_outcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prediction_id INTEGER NOT NULL,  -- FK → prediction_registry.id
  horizon_days INTEGER NOT NULL,   -- 7, 30, 90, 180, 365
  actual_return REAL,              -- % return from entry to exit
  benchmark_return REAL,           -- equal-weight index return
  alpha REAL,                      -- actual_return - benchmark_return
  hit INTEGER DEFAULT 0,           -- 1 if actual_return > 0
  validated_at TEXT DEFAULT (datetime('now'))
);
\`\`\`

---

## TASK 3 & 4: ALPHA DASHBOARD — HORIZON PERFORMANCE

### Performance by Horizon

| Horizon | Predictions | Avg Return | Avg Alpha (α) | Hit Rate | Sharpe | Max Drawdown |
|---------|-------------|------------|----------------|----------|--------|---------------|
${horizons.map(h => {
  const s = horizonStats[h];
  const retStr = s.avgReturn !== null ? `${s.avgReturn >= 0 ? '+' : ''}${s.avgReturn.toFixed(2)}%` : 'N/A';
  const alphaStr = s.avgAlpha !== null ? `${s.avgAlpha >= 0 ? '+' : ''}${s.avgAlpha.toFixed(2)}%` : 'N/A';
  const hrStr = s.hitRate !== null ? `${s.hitRate.toFixed(1)}%` : 'N/A';
  const sharpeStr = s.sharpe !== null ? s.sharpe.toFixed(3) : 'N/A';
  const ddStr = s.maxDD !== null ? `${s.maxDD.toFixed(1)}%` : 'N/A';
  return `| ${horizonLabels[h]} (${h}d) | ${s.count.toLocaleString()} | ${retStr} | ${alphaStr} | ${hrStr} | ${sharpeStr} | ${ddStr} |`;
}).join('\n')}

### Visual Signal (Hit Rate by Horizon)

\`\`\`
${horizons.map(h => {
  const s = horizonStats[h];
  const barLen = s.hitRate !== null ? Math.round(s.hitRate / 2) : 0;
  return `${horizonLabels[h].padEnd(10)} |${'█'.repeat(Math.min(barLen, 50))}${'░'.repeat(Math.max(50 - barLen, 0))}| ${s.hitRate !== null ? s.hitRate.toFixed(1) + '%' : 'N/A'}`;
}).join('\n')}
\`\`\`

---

## ALPHA QUALITY ASSESSMENT

| Horizon | Alpha Significance | Rating |
|---------|-------------------|--------|
${horizons.map(h => {
  const s = horizonStats[h];
  if (s.count < 50) return `| ${horizonLabels[h]} | Insufficient data (${s.count} outcomes) | ⬜ N/A |`;
  let rating = '🟡 NEUTRAL';
  if (s.avgAlpha !== null && s.sharpe !== null) {
    if (s.avgAlpha > 0 && s.sharpe > 0.5) rating = '🟢 STRONG';
    else if (s.avgAlpha > 0 && s.sharpe > 0.1) rating = '🟡 MODERATE';
    else if (s.avgAlpha < 0) rating = '🔴 NEGATIVE';
  }
  return `| ${horizonLabels[h]} | ${s.count >= 50 ? 'Sufficient data' : 'Small sample'} | ${rating} |`;
}).join('\n')}

---

## PREDICTION QUALITY METADATA

### Classification Distribution

| Classification | Count | % of Total |
|----------------|-------|------------|
${classificationDist.map(c => `| ${c.classification || '(null)'} | ${c.cnt.toLocaleString()} | ${(c.cnt / totalPredictions * 100).toFixed(1)}% |`).join('\n')}

### Confidence Level Distribution

| Confidence Level | Count | % of Total |
|------------------|-------|------------|
${confidenceDist.map(c => `| ${c.confidence_level || '(null)'} | ${c.cnt.toLocaleString()} | ${(c.cnt / totalPredictions * 100).toFixed(1)}% |`).join('\n')}

---

## TOP & BOTTOM PERFORMERS (30-Day Horizon)

### Top 5 by Avg Return
| Symbol | Avg Return (30d) | Outcomes | 
|--------|-----------------|----------|
${top30d.length > 0 ? top30d.map(r => `| ${r.symbol} | ${r.avg_ret >= 0 ? '+' : ''}${r.avg_ret.toFixed(2)}% | ${r.cnt} |`).join('\n') : '| — | No data | — |'}

### Bottom 5 by Avg Return
| Symbol | Avg Return (30d) | Outcomes |
|--------|-----------------|----------|
${bottom30d.length > 0 ? bottom30d.map(r => `| ${r.symbol} | ${r.avg_ret >= 0 ? '+' : ''}${r.avg_ret.toFixed(2)}% | ${r.cnt} |`).join('\n') : '| — | No data | — |'}

---

## OVERALL ALPHA SIGNAL

| Metric | Value |
|--------|-------|
| Total Validated Outcomes | ${totalOutcomes.toLocaleString()} |
| Average Alpha (all) | ${allAlphas.length > 0 ? (allAlphas.reduce((a,b) => a+b, 0) / allAlphas.length) >= 0 ? '+' : '' : ''}${allAlphas.length > 0 ? (allAlphas.reduce((a,b) => a+b, 0) / allAlphas.length).toFixed(2) : 'N/A'}% |
| Overall Hit Rate | ${allReturns.length > 0 ? hitRate(allReturns).toFixed(1) : 'N/A'}% |
| Overall Sharpe | ${allReturns.length > 1 ? sharpe(allReturns).toFixed(3) : 'N/A'} |
| Overall Max Drawdown | ${allReturns.length > 0 ? maxDrawdown(equity).toFixed(1) : 'N/A'}% |
| Prediction Coverage | ${symbolCount} symbols |
| Date Span | ${dateRange.first_date || 'N/A'} to ${dateRange.last_date || 'N/A'} |

### Verdict

${(() => {
  const validHorizons = horizons.filter(h => horizonStats[h].count >= 50);
  const positiveAlphaHorizons = validHorizons.filter(h => horizonStats[h].avgAlpha !== null && horizonStats[h].avgAlpha > 0);
  
  if (validHorizons.length === 0) {
    return '🔴 **INSUFFICIENT DATA** — Fewer than 50 validated outcomes at every horizon. Cannot assess alpha signal reliably.';
  } else if (positiveAlphaHorizons.length === validHorizons.length) {
    return '🟢 **POSITIVE ALPHA** — All horizons with sufficient data show positive alpha. The prediction engine outperforms an equal-weight benchmark.';
  } else if (positiveAlphaHorizons.length >= validHorizons.length / 2) {
    return '🟡 **MIXED SIGNAL** — Some horizons show positive alpha while others are neutral or negative. Short-term predictions (7d-30d) may differ from long-term (180d-365d).';
  } else {
    return '🔴 **NEGATIVE ALPHA** — Most horizons show zero or negative alpha vs. benchmark. The ranking engine may not be generating a reliable edge.';
  }
})()}

---

## METHODOLOGY NOTES

1. **Entry Price**: Uses \`price_at_prediction\` when available (> 0), falls back to \`daily_prices.close\` on \`prediction_date\`
2. **Exit Price**: Earliest available close at or after \`prediction_date + horizon_days\`
3. **Benchmark**: Equal-weight average close across all symbols in \`daily_prices\` for each date
4. **Alpha**: \`actual_return - benchmark_return\` for each prediction-horizon pair
5. **Hit**: 1 if actual_return > 0, else 0
6. **Sharpe**: Computed on raw returns (risk-free rate = 0)
7. **Max Drawdown**: Peak-to-trough decline in cumulative equity curve

---

## AGENT COMPLETION

- [x] Task 1: Audited \`price_at_prediction\` column
- [x] Task 2: Created \`prediction_outcomes\` table with indexes
- [x] Task 3: Validated predictions against 5 horizons (7d/30d/90d/180d/365d)
- [x] Task 4: Generated alpha dashboard report

**Report Path:** \`reports/v5/02-PredictionTruthLayer.md\`
`;

  fs.writeFileSync(REPORT_PATH, report, 'utf-8');
  console.log(`  Report written to ${REPORT_PATH}`);
}

// ==================== MAIN ====================
console.log('=== AGENT 2: PREDICTION TRUTH LAYER ===\n');
console.log('Objectives:');
console.log('  1. Audit price_at_prediction column');
console.log('  2. Create prediction_outcomes table');
console.log('  3. Validate predictions against real price data');
console.log('  4. Generate alpha dashboard report\n');

try {
  // TASK 1
  const auditResult = auditPriceAtPrediction();
  
  // TASK 2
  createPredictionOutcomesTable();
  
  // Build prediction-by-date index for benchmark computation
  console.log('\n  Indexing predictions by date...');
  const predictionsRaw = db.prepare('SELECT prediction_date FROM prediction_registry GROUP BY prediction_date ORDER BY prediction_date').all();
  const predictionsByDate = {};
  for (const p of predictionsRaw) {
    predictionsByDate[p.prediction_date] = true;
  }
  console.log(`  Found ${Object.keys(predictionsByDate).length} unique prediction dates`);
  
  // Compute benchmark
  const benchmarkReturns = computeBenchmarkReturns(predictionsByDate);
  
  // TASK 3
  const totalOutcomes = validatePredictions(benchmarkReturns);
  
  // TASK 4
  generateAlphaDashboard(auditResult, totalOutcomes);
  
  console.log('\n=== AGENT 2 COMPLETE ===');
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Outcomes: ${totalOutcomes.toLocaleString()} rows in prediction_outcomes`);
} catch (e) {
  console.error('AGENT 2 FAILED:', e.message);
  console.error(e.stack);
  process.exit(1);
} finally {
  try { db.close(); } catch (e) { /* ignore close errors */ }
}
