/**
 * TRACK-45 — ALPHA RESEARCH PLATFORM
 * Answers: "Does StockStory's ranking engine generate statistically significant alpha?"
 * 
 * 12 Agents: A-L. Pure SQL. No new APIs. No new infrastructure.
 * Usage: node scripts/track45_alpha_research.cjs
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'stockstory.db');
const REPORT_DIR = path.join(__dirname, '..', 'reports', 'track-45');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function R(name, content) {
  fs.writeFileSync(path.join(REPORT_DIR, name), content, 'utf-8');
  console.log(`  ✓ ${name}`);
}

// ==================== HELPERS ====================
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

function computeReturn(entry, exit) {
  if (!entry || !exit || entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length);
}
function sharpe(returns, rf = 0) {
  const s = stddev(returns);
  return s > 0 ? (avg(returns) - rf) / s : 0;
}
function sortino(returns, rf = 0) {
  const negs = returns.filter(r => r < rf);
  if (negs.length === 0) return returns.length > 0 ? (avg(returns) - rf) / (stddev(returns) || 1) : 0;
  const downside = Math.sqrt(negs.reduce((a, r) => a + (r - rf) ** 2, 0) / returns.length);
  return downside > 0 ? (avg(returns) - rf) / downside : 0;
}
function maxDrawdown(equityCurve) {
  let peak = -Infinity, maxDD = 0;
  for (const v of equityCurve) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}
function calmar(returns, mdd) { return mdd > 0 ? avg(returns) / mdd : 0; }
function hitRate(results) { return results.filter(r => r > 0).length / results.length * 100; }
function winLossRatio(results) {
  const wins = results.filter(r => r > 0);
  const losses = results.filter(r => r <= 0);
  if (losses.length === 0) return wins.length > 0 ? Infinity : 0;
  if (wins.length === 0) return 0;
  return (avg(wins) / Math.abs(avg(losses))) * (wins.length / losses.length);
}

// ==================== AGENT A: ALPHA VALIDATION LAB ====================
function agentA_alphaValidation() {
  console.log('\n[AGENT A] Alpha Validation Lab...');
  
  const horizons = [7, 30, 90, 180, 365];
  
  // Build alpha_research_registry table
  db.exec(`DROP TABLE IF EXISTS alpha_research_registry`);
  db.exec(`CREATE TABLE alpha_research_registry (
    prediction_id TEXT, symbol TEXT NOT NULL, prediction_date TEXT NOT NULL,
    prediction_horizon INTEGER, ranking_score REAL, confidence_score REAL,
    entry_price REAL, exit_price REAL, exit_date TEXT,
    actual_return REAL, excess_return REAL, alpha REAL,
    hit INTEGER, benchmark_return REAL,
    quality_factor REAL, growth_factor REAL, value_factor REAL,
    momentum_factor REAL, risk_factor REAL,
    PRIMARY KEY (prediction_id, prediction_horizon)
  )`);
  
  const insert = db.prepare(`INSERT OR REPLACE INTO alpha_research_registry
    (prediction_id, symbol, prediction_date, prediction_horizon, ranking_score, confidence_score,
     entry_price, exit_price, exit_date, actual_return, excess_return, alpha, hit,
     benchmark_return, quality_factor, growth_factor, value_factor, momentum_factor, risk_factor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  // Get all predictions
  const preds = db.prepare('SELECT * FROM prediction_registry').all();
  const symbolDates = {};
  
  // Compute benchmark (equal-weight average of all symbols per date)
  console.log('  Computing benchmark returns...');
  const allDates = [...new Set(preds.map(p => p.prediction_date))].sort();
  const benchmarkCache = {};
  for (const date of allDates) {
    const prices = db.prepare('SELECT symbol, close FROM daily_prices WHERE trade_date = ?').all(date);
    if (prices.length === 0) { benchmarkCache[date] = null; continue; }
    benchmarkCache[date] = prices.reduce((a, p) => a + p.close, 0) / prices.length;
  }
  
  let processed = 0;
  const tx = db.transaction(() => {
    for (const p of preds) {
      if (!symbolDates[p.symbol]) {
        symbolDates[p.symbol] = db.prepare('SELECT trade_date, close FROM daily_prices WHERE symbol = ? ORDER BY trade_date').all(p.symbol);
      }
      
      const entry = getPrice(p.symbol, p.prediction_date);
      if (!entry) continue;
      
      const exit = getFuturePrice(p.symbol, p.prediction_date, p.prediction_horizon);
      if (!exit) continue;
      
      const ret = computeReturn(entry, exit);
      if (ret === null) continue;
      
      // Benchmark return: entry date benchmark → exit date
      const exitDate = db.prepare("SELECT MIN(trade_date) as d FROM daily_prices WHERE symbol = ? AND trade_date >= ? AND trade_date >= date(?, '+' || ? || ' days')").get(p.symbol, p.prediction_date, p.prediction_date, p.prediction_horizon)?.d;
      const benchEntry = benchmarkCache[p.prediction_date];
      const benchExit = exitDate ? benchmarkCache[exitDate] : null;
      const benchRet = (benchEntry && benchExit) ? ((benchExit - benchEntry) / benchEntry) * 100 : null;
      const excessRet = benchRet !== null ? ret - benchRet : null;
      
      const id = `${p.symbol}-${p.prediction_date}-${p.prediction_horizon}`;
      insert.run(id, p.symbol, p.prediction_date, p.prediction_horizon, p.ranking_score, p.confidence_score,
        entry, exit, exitDate || null, ret, excessRet, excessRet, ret > 0 ? 1 : 0,
        benchRet, p.quality_score, p.growth_score, p.value_score, p.momentum_score, p.risk_score);
      processed++;
    }
  });
  tx();
  
  const total = db.prepare('SELECT COUNT(*) as c FROM alpha_research_registry').get().c;
  
  // Compute stats per horizon
  let report = `# Agent A: Alpha Validation Lab\n**Date:** ${new Date().toISOString()}\n\n`;
  report += `## Horizon Analysis\n\n| Horizon | Predictions | Avg Return | Benchmark | Excess (α) | Hit Rate | Sharpe | Sortino | Max DD | W/L Ratio |\n`;
  report += `|---------|-------------|------------|-----------|------------|----------|--------|---------|--------|-----------|\n`;
  
  for (const h of horizons) {
    const rows = db.prepare('SELECT actual_return, excess_return, hit, entry_price FROM alpha_research_registry WHERE prediction_horizon = ? AND actual_return IS NOT NULL').all(h);
    if (rows.length === 0) { report += `| ${h}d | 0 | - | - | - | - | - | - | - | - |\n`; continue; }
    
