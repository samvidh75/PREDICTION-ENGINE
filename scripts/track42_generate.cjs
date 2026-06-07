/**
 * TRACK-42 — Fundamental Resurrection, Feature Generation & First Rankings
 * Pure Node.js. Reads from SQLite, computes features/factors/rankings, writes back.
 * No new engines. No new architecture. Math on existing data.
 * 
 * Usage: node scripts/track42_generate.cjs
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'stockstory.db');
const REPORT_DIR = path.join(__dirname, '..', 'reports', 'track-42');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// === AGENT A: FUNDAMENTALS (Screener web scrape via Yahoo) ===
console.log('[AGENT A] Fundamental Recovery...');

// Yahoo Finance HTTP fetch for fundamentals
const https = require('https');
function yahooFundamentals(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d&includePrePost=false`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const meta = json?.chart?.result?.[0]?.meta;
          if (!meta) return resolve(null);
          resolve({
            symbol,
            market_cap: meta.marketCap || null,
            pe_ratio: meta.trailingPE || null,
            pb_ratio: meta.priceToBook || null,
            eps: meta.trailingEps || null,
            dividend_yield: meta.dividendYield ? meta.dividendYield * 100 : null,
            beta: meta.beta || null,
            previous_close: meta.previousClose || null,
            regular_market_price: meta.regularMarketPrice || null,
            fifty_two_week_high: meta.fiftyTwoWeekHigh || null,
            fifty_two_week_low: meta.fiftyTwoWeekLow || null,
          });
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

// Drop and recreate financial_snapshots with correct schema
db.exec(`DROP TABLE IF EXISTS financial_snapshots`);
db.exec(`CREATE TABLE financial_snapshots (
  symbol TEXT NOT NULL, period_end TEXT NOT NULL,
  market_cap REAL, pe_ratio REAL, pb_ratio REAL, eps REAL,
  dividend_yield REAL, beta REAL, previous_close REAL,
  regular_market_price REAL, fifty_two_week_high REAL, fifty_two_week_low REAL,
  PRIMARY KEY (symbol, period_end)
)`);

const insertFund = db.prepare(`INSERT OR REPLACE INTO financial_snapshots
  (symbol, period_end, market_cap, pe_ratio, pb_ratio, eps, dividend_yield, beta, previous_close, regular_market_price, fifty_two_week_high, fifty_two_week_low)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const symbols = db.prepare('SELECT DISTINCT symbol FROM daily_prices').all().map(r => r.symbol);

async function populateFundamentals() {
  let fundCount = 0;
  const today = new Date().toISOString().split('T')[0];
  
  for (const sym of symbols) {
    const f = await yahooFundamentals(sym);
    if (f && (f.market_cap || f.pe_ratio)) {
      insertFund.run(sym, today, f.market_cap, f.pe_ratio, f.pb_ratio, f.eps, f.dividend_yield, f.beta, f.previous_close, f.regular_market_price, f.fifty_two_week_high, f.fifty_two_week_low);
      fundCount++;
    }
    if (fundCount % 5 === 0) process.stdout.write('.');
    await new Promise(r => setTimeout(r, 150)); // rate limit
  }
  console.log(`\n  Fundamentals: ${fundCount}/${symbols.length} symbols`);
  return fundCount;
}

// === AGENT C: FEATURES ===
console.log('[AGENT C] Feature Generation...');

db.exec(`DROP TABLE IF EXISTS feature_snapshots`);
db.exec(`CREATE TABLE feature_snapshots (
  symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
  rsi_14 REAL, macd REAL, macd_signal REAL, macd_histogram REAL,
  momentum_20 REAL, momentum_50 REAL, volatility_20 REAL,
  drawdown_20 REAL, relative_strength_20 REAL, volume_trend_20 REAL,
  price_strength_20 REAL, sma_20 REAL, sma_50 REAL, sma_200 REAL,
  PRIMARY KEY (symbol, trade_date)
)`);

function computeRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length - 1; i++) {
    const diff = closes[i + 1] - closes[i];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function computeMomentum(closes, period = 20) {
  if (closes.length < period + 1) return 0;
  return ((closes[closes.length - 1] - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]) * 100;
}

function computeVolatility(closes, period = 20) {
  if (closes.length < period) return 0;
  const returns = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    if (i > closes.length - period) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 100 * Math.sqrt(252);
}

function computeSMA(closes, period) {
  if (closes.length < period) return closes[closes.length - 1] || 0;
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function computeMACD(closes) {
  const ema12 = closes.length >= 12 ? computeEMA(closes, 12) : closes[closes.length - 1];
  const ema26 = closes.length >= 26 ? computeEMA(closes, 26) : closes[closes.length - 1];
  return ema12 - ema26;
}

function computeEMA(closes, period) {
  if (closes.length < period) return closes[closes.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return ema;
}

function computeDrawdown(closes, period = 20) {
  if (closes.length < period) return 0;
  const recent = closes.slice(-period);
  const peak = Math.max(...recent);
  const current = recent[recent.length - 1];
  return peak > 0 ? ((peak - current) / peak) * 100 : 0;
}

const insertFeature = db.prepare(`INSERT OR REPLACE INTO feature_snapshots
  (symbol, trade_date, rsi_14, macd, macd_signal, macd_histogram, momentum_20, momentum_50, volatility_20, drawdown_20, relative_strength_20, volume_trend_20, price_strength_20, sma_20, sma_50, sma_200)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

async function generateFeatures() {
  let featCount = 0;
  const insertTx = db.transaction((rows) => { for (const r of rows) insertFeature.run(...r); });

  for (const sym of symbols) {
    const prices = db.prepare('SELECT trade_date, close, volume FROM daily_prices WHERE symbol = ? ORDER BY trade_date').all(sym);
    if (prices.length < 50) continue;

    const closes = prices.map(p => p.close);
    const volumes = prices.map(p => p.volume);
    const batch = [];
    
    for (let i = 50; i < prices.length; i++) {
      const date = prices[i].trade_date;
      const windowCloses = closes.slice(0, i + 1);
      const windowVols = volumes.slice(0, i + 1);
      
      const rsi = computeRSI(windowCloses);
      const macd = computeMACD(windowCloses);
      const mom20 = computeMomentum(windowCloses, 20);
      const mom50 = computeMomentum(windowCloses, 50);
      const vol20 = computeVolatility(windowCloses, 20);
      const dd = computeDrawdown(windowCloses);
      const sma20 = computeSMA(windowCloses, 20);
      const sma50 = computeSMA(windowCloses, 50);
      const sma200 = computeSMA(windowCloses, 200);
      const relStrength = sma20 / (sma200 || 1);
      const volTrend = windowVols.slice(-20).reduce((a, b) => a + b, 0) / windowVols.slice(-40, -20).reduce((a, b) => a + b, 0);
      const priceStrength = closes[i] / (sma200 || 1);
      
      batch.push([sym, date, rsi, macd, null, null, mom20, mom50, vol20, dd, relStrength, volTrend, priceStrength, sma20, sma50, sma200]);
    }
    
    if (batch.length > 0) {
      insertTx(batch);
      featCount += batch.length;
    }
  }
  console.log(`  Features: ${featCount} rows`);
  return featCount;
}

// === AGENT D: FACTORS ===
console.log('[AGENT D] Factor Generation...');

db.exec(`DROP TABLE IF EXISTS factor_snapshots`);
db.exec(`CREATE TABLE factor_snapshots (
  symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
  quality_factor REAL DEFAULT 50, growth_factor REAL DEFAULT 50,
  value_factor REAL DEFAULT 50, momentum_factor REAL DEFAULT 50,
  risk_factor REAL DEFAULT 50, sector_strength_factor REAL DEFAULT 50,
  factor_score REAL DEFAULT 50,
  PRIMARY KEY (symbol, trade_date)
)`);

const insertFactor = db.prepare(`INSERT OR REPLACE INTO factor_snapshots
  (symbol, trade_date, quality_factor, growth_factor, value_factor, momentum_factor, risk_factor, factor_score)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

async function generateFactors() {
  let factCount = 0;
  const insertTx = db.transaction((rows) => { for (const r of rows) insertFactor.run(...r); });

  for (const sym of symbols) {
    const features = db.prepare('SELECT trade_date, rsi_14, macd, momentum_20, momentum_50, volatility_20, drawdown_20, sma_20, sma_50, sma_200, relative_strength_20 FROM feature_snapshots WHERE symbol = ? ORDER BY trade_date').all(sym);
    if (features.length === 0) continue;

    const batch = [];
    for (const f of features) {
      // Quality: inverse volatility (lower vol = higher quality)
      const quality = Math.max(0, Math.min(100, (f.volatility_20 !== null && f.volatility_20 > 0) ? Math.max(0, 100 - f.volatility_20 * 2) : 50));
      
      // Growth: momentum trending up, relative strength
      const growth = Math.max(0, Math.min(100, f.momentum_50 !== null ? 50 + f.momentum_50 * 2 : 50));
      
      // Value: inverse momentum (contrarian — strong momentum = overvalued, weak = undervalued)
      const value = Math.max(0, Math.min(100, f.momentum_20 !== null ? 50 - f.momentum_20 : 50));
      
      // Momentum: RSI + short-term momentum
      const momentum = Math.max(0, Math.min(100, (f.rsi_14 || 50) * 0.7 + (f.momentum_20 !== null ? 25 + f.momentum_20 : 25) * 0.3));
      
      // Risk: drawdown + volatility
      const risk = Math.max(0, Math.min(100, (f.drawdown_20 !== null ? f.drawdown_20 * 1.5 : 25) + (f.volatility_20 || 10) * 0.5));
      
      // Combined factor score (equal weight)
      const score = (quality + growth + value + momentum + (100 - risk)) / 5;
      
      batch.push([sym, f.trade_date, quality, growth, value, momentum, risk, Math.round(score * 10) / 10]);
    }
    
    if (batch.length > 0) {
      insertTx(batch);
      factCount += batch.length;
    }
  }
  console.log(`  Factors: ${factCount} rows`);
  return factCount;
}

// === AGENT E: RANKINGS ===
console.log('[AGENT E] Ranking Activation...');

db.exec(`CREATE TABLE IF NOT EXISTS ranking_snapshots (
  symbol TEXT NOT NULL, rank_date TEXT NOT NULL,
  ranking_score REAL, quality_score REAL, growth_score REAL,
  value_score REAL, momentum_score REAL, risk_score REAL,
  rank INTEGER,
  PRIMARY KEY (symbol, rank_date)
)`);

const insertRank = db.prepare(`INSERT OR REPLACE INTO ranking_snapshots
  (symbol, rank_date, ranking_score, quality_score, growth_score, value_score, momentum_score, risk_score, rank)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

async function generateRankings() {
  const latestDate = db.prepare('SELECT MAX(trade_date) as d FROM factor_snapshots').get()?.d;
  if (!latestDate) { console.log('  No factors — skipping rankings'); return 0; }

  const factors = db.prepare('SELECT symbol, quality_factor, growth_factor, value_factor, momentum_factor, risk_factor, factor_score FROM factor_snapshots WHERE trade_date = ? ORDER BY factor_score DESC').all(latestDate);

  let rankCount = 0;
  for (let i = 0; i < factors.length; i++) {
    const f = factors[i];
    insertRank.run(f.symbol, latestDate, f.factor_score, f.quality_factor, f.growth_factor, f.value_factor, f.momentum_factor, f.risk_factor, i + 1);
    rankCount++;
  }
  
  // Show top 10
  const top10 = db.prepare('SELECT symbol, ranking_score, quality_score, growth_score, value_score, momentum_score, risk_score, rank FROM ranking_snapshots ORDER BY rank LIMIT 10').all();
  console.log(`  Rankings: ${rankCount} symbols`);
  console.log('\n  === TOP 10 RANKINGS ===');
  console.log('  Rank  Symbol            Score  Quality Growth Value Momentum Risk');
  console.log('  ----  ---------------   -----  ------- ------ ----- -------- ----');
  for (const r of top10) {
    console.log(`  ${String(r.rank).padStart(4)}  ${(r.symbol || '').padEnd(18)} ${String(r.ranking_score?.toFixed(1) || 'N/A').padStart(5)}  ${String(r.quality_score?.toFixed(1) || 'N/A').padStart(7)} ${String(r.growth_score?.toFixed(1) || 'N/A').padStart(6)} ${String(r.value_score?.toFixed(1) || 'N/A').padStart(5)} ${String(r.momentum_score?.toFixed(1) || 'N/A').padStart(9)} ${String(r.risk_score?.toFixed(1) || 'N/A').padStart(4)}`);
  }
  return rankCount;
}

// === AGENT F: PREDICTIONS ===
console.log('[AGENT F] Prediction Registry Seeding...');

db.exec(`DROP TABLE IF EXISTS prediction_registry`);
db.exec(`CREATE TABLE prediction_registry (
  id TEXT PRIMARY KEY, symbol TEXT NOT NULL, prediction_date TEXT NOT NULL,
  ranking_score REAL, classification TEXT, confidence_score REAL,
  quality_score REAL, growth_score REAL, value_score REAL, momentum_score REAL, risk_score REAL, sector_score REAL,
  prediction_horizon INTEGER, created_by TEXT DEFAULT 'track42',
  validation_status TEXT DEFAULT 'pending'
)`);

const insertPred = db.prepare(`INSERT OR IGNORE INTO prediction_registry
  (id, symbol, prediction_date, ranking_score, classification, confidence_score, quality_score, growth_score, value_score, momentum_score, risk_score, sector_score, prediction_horizon)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

async function seedPredictions() {
  const rankings = db.prepare('SELECT * FROM ranking_snapshots ORDER BY rank LIMIT 30').all();
  if (rankings.length === 0) { console.log('  No rankings — skipping predictions'); return 0; }

  const horizons = [30, 90, 365];
  const today = new Date().toISOString().split('T')[0];
  let count = 0;
  
  for (const r of rankings) {
    for (const h of horizons) {
      const id = `${r.symbol}-${today}-${h}`;
      const cls = r.ranking_score >= 70 ? 'Excellent' : r.ranking_score >= 40 ? 'Good' : 'Weak';
      insertPred.run(id, r.symbol, today, r.ranking_score, cls, Math.round(r.ranking_score), r.quality_score, r.growth_score, r.value_score, r.momentum_score, r.risk_score, 50, h);
      count++;
    }
  }
  console.log(`  Predictions: ${count} rows (${rankings.length} symbols × 3 horizons)`);
  return count;
}

// === MAIN ===
async function main() {
  console.log('=== TRACK-42: FUNDAMENTALS → FEATURES → FACTORS → RANKINGS ===\n');

  // A: Fundamentals
  const fundCount = await populateFundamentals();

  // C: Features
  const featCount = await generateFeatures();

  // D: Factors
  const factCount = await generateFactors();

  // E: Rankings
  const rankCount = await generateRankings();

  // F: Predictions
  const predCount = await seedPredictions();

  // === FINAL COUNTS ===
  console.log('\n=== FINAL DATABASE COUNTS ===');
  const counts = {
    daily_prices: db.prepare('SELECT COUNT(*) as c FROM daily_prices').get().c,
    financial_snapshots: db.prepare('SELECT COUNT(*) as c FROM financial_snapshots').get().c,
    feature_snapshots: db.prepare('SELECT COUNT(*) as c FROM feature_snapshots').get().c,
    factor_snapshots: db.prepare('SELECT COUNT(*) as c FROM factor_snapshots').get().c,
    ranking_snapshots: db.prepare('SELECT COUNT(*) as c FROM ranking_snapshots').get().c,
    prediction_registry: db.prepare('SELECT COUNT(*) as c FROM prediction_registry').get().c,
  };

  console.log('| Table | Rows | Target | Status |');
  console.log('|-------|------|--------|--------|');
  const targets = { daily_prices: 37140, financial_snapshots: 300, feature_snapshots: 50000, factor_snapshots: 50000, ranking_snapshots: 1, prediction_registry: 500 };
  for (const [tbl, count] of Object.entries(counts)) {
    const target = targets[tbl] || 1;
    const status = count >= target ? '✅' : '❌';
    console.log(`| ${tbl} | ${count.toLocaleString()} | ${target.toLocaleString()} | ${status} |`);
  }

  const allMet = Object.entries(counts).every(([t, c]) => c >= (targets[t] || 1));
  const verdict = allMet ? 'TRACK-42 SUCCESS' : 'TRACK-42 PARTIAL';
  console.log(`\n## Verdict: ${verdict}`);

  // Write report
  let report = `# TRACK-42 — Generation Results\n**Generated:** ${new Date().toISOString()}\n\n`;
  report += '## Row Counts\n\n| Table | Rows | Target | Status |\n|-------|------|--------|--------|\n';
  for (const [tbl, count] of Object.entries(counts)) {
    const target = targets[tbl] || 1;
    report += `| ${tbl} | ${count.toLocaleString()} | ${target.toLocaleString()} | ${count >= target ? '✅' : '❌'} |\n`;
  }
  
  // Top 10 rankings
  const top10 = db.prepare('SELECT symbol, ranking_score, rank FROM ranking_snapshots ORDER BY rank LIMIT 10').all();
  if (top10.length > 0) {
    report += '\n## Top 10 Rankings\n\n| Rank | Symbol | Score |\n|------|--------|-------|\n';
    for (const r of top10) report += `| ${r.rank} | ${r.symbol} | ${r.ranking_score?.toFixed(1)} |\n`;
  }
  
  report += `\n## Verdict: **${verdict}**\n`;
  fs.writeFileSync(path.join(REPORT_DIR, '01-GenerationResults.md'), report);
  console.log(`\nReport: reports/track-42/01-GenerationResults.md`);

  db.close();
}

main().catch(e => { console.error(e); db.close(); process.exit(1); });
