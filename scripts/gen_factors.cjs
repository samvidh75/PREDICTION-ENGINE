// TRACK-79B: Generate factor snapshots from daily_prices — schema-aligned
const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, '..', 'data', 'stockstory.db'));
db.pragma('journal_mode = WAL');

const symbols = db.prepare('SELECT DISTINCT symbol FROM daily_prices ORDER BY symbol').all();
console.log('Symbols:', symbols.length);

// Schema: symbol, trade_date, factor_score, quality_factor, growth_factor, value_factor, momentum_factor, risk_factor, sector_strength_factor
const insert = db.prepare(`INSERT OR REPLACE INTO factor_snapshots 
  (symbol, trade_date, factor_score, quality_factor, growth_factor, value_factor, momentum_factor, risk_factor, sector_strength_factor)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const dates = db.prepare('SELECT DISTINCT trade_date FROM daily_prices ORDER BY trade_date').all();
console.log('Dates:', dates.length);

let inserted = 0;
const tx = db.transaction(() => {
  for (const sym of symbols) {
    for (const dt of dates) {
      const prices = db.prepare(
        `SELECT close FROM daily_prices WHERE symbol = ? AND trade_date <= ? ORDER BY trade_date DESC LIMIT 20`
      ).all(sym.symbol, dt.trade_date);
      
      if (prices.length < 5) continue;
      
      const closes = prices.map(p => p.close);
      const latest = closes[0];
      const oldest20 = closes[closes.length - 1];
      
      const momentum = oldest20 > 0 ? Math.min(100, Math.max(0, 50 + ((latest - oldest20) / oldest20) * 500)) : 50;
      
      let sumSq = 0, sum = 0;
      for (const c of closes) { sum += c; }
      const avg = sum / closes.length;
      for (const c of closes) { sumSq += (c - avg) * (c - avg); }
      const vol = Math.sqrt(sumSq / closes.length) / avg;
      const risk = Math.min(100, Math.max(0, 50 + vol * 200));
      
      const quality = 55;
      const growth = Math.min(100, 50 + ((latest - oldest20) / oldest20) * 300);
      const value = 50;
      const sector = 50;
      const confidence = 50;
      
      const factorScore = Math.round((quality * 0.25 + growth * 0.20 + value * 0.20 + momentum * 0.15 + (100 - risk) * 0.10 + sector * 0.05 + confidence * 0.05) * 100) / 100;
      
      // 9 values matching the 9 columns: symbol, trade_date, factor_score, quality, growth, value, momentum, risk, sector_strength
      insert.run(sym.symbol, dt.trade_date, factorScore, quality, growth, value, momentum, risk, sector);
      inserted++;
    }
  }
});
tx();

const count = db.prepare('SELECT COUNT(*) as c FROM factor_snapshots').get();
const distinct = db.prepare('SELECT COUNT(DISTINCT symbol) as c FROM factor_snapshots').get();
const latestDate = db.prepare('SELECT MAX(trade_date) as d FROM factor_snapshots').get();
console.log('Factors generated:', count.c);
console.log('Distinct symbols:', distinct.c);
console.log('Latest factor date:', latestDate.d);

db.close();
