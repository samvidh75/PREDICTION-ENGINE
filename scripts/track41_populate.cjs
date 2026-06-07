/**
 * TRACK-41 — DATA ACTIVATION: Pure Node.js Population
 * Uses Yahoo Finance HTTP API (same as YahooProvider.ts), no Python needed.
 * Inserts directly into SQLite via better-sqlite3.
 * 
 * Usage: node scripts/track41_populate.cjs [NIFTY50|NIFTY100|RELIANCE]
 */
const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'stockstory.db');

// === SYMBOL UNIVERSE ===
const NIFTY50 = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'KOTAKBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS',
  'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'ASIANPAINT.NS', 'HCLTECH.NS',
  'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'WIPRO.NS', 'ULTRACEMCO.NS',
  'NTPC.NS', 'POWERGRID.NS', 'ONGC.NS', 'COALINDIA.NS', 'NESTLEIND.NS',
  'TECHM.NS', 'BAJAJFINSV.NS', 'JSWSTEEL.NS', 'TATASTEEL.NS', 'GRASIM.NS',
  'ADANIPORTS.NS', 'ADANIENT.NS', 'APOLLOHOSP.NS', 'BAJAJ-AUTO.NS', 'BEL.NS',
  'BPCL.NS', 'BRITANNIA.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'DRREDDY.NS',
  'EICHERMOT.NS', 'HDFCLIFE.NS', 'HEROMOTOCO.NS', 'HINDALCO.NS', 'INDUSINDBK.NS',
  'M&M.NS', 'SBILIFE.NS', 'SHRIRAMFIN.NS', 'TATAMOTORS.NS', 'TRENT.NS',
];

// === YAHOO FINANCE FETCH ===
function yahooFetch(path, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${path}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = json?.chart?.result?.[0];
          if (!result) return resolve({ error: 'No result', raw: json?.chart?.error?.description || '' });
          const timestamps = result.timestamp || [];
          const quote = result.indicators?.quote?.[0] || {};
          const adj = result.indicators?.adjclose?.[0]?.adjclose || [];
          const opens = quote.open || [];
          const highs = quote.high || [];
          const lows = quote.low || [];
          const closes = quote.close || [];
          const volumes = quote.volume || [];
          const rows = [];
          for (let i = 0; i < timestamps.length; i++) {
            const close = closes[i];
            if (close === null || close === undefined) continue;
            rows.push({
              date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
              open: opens[i] || close,
              high: highs[i] || close,
              low: lows[i] || close,
              close: close,
              adjusted_close: adj[i] || close,
              volume: volumes[i] || 0,
            });
          }
          resolve(rows);
        } catch (e) {
          resolve({ error: 'Parse failed: ' + e.message });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ error: 'Timeout' }); });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// === MAIN ===
async function main() {
  const arg = process.argv[2] || 'RELIANCE';
  let symbols = [];

  if (arg.toUpperCase() === 'NIFTY50') symbols = NIFTY50.slice(0, 30);
  else if (arg.toUpperCase() === 'NIFTY100') symbols = NIFTY50.concat(NIFTY50.slice(0, 20));
  else symbols = [arg.includes('.NS') ? arg : arg + '.NS'];

  if (!fs.existsSync(DB_PATH)) {
    console.error('DB not found:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create tables if not exist
  db.exec(`CREATE TABLE IF NOT EXISTS daily_prices (
    symbol TEXT NOT NULL, trade_date TEXT NOT NULL, open REAL, high REAL, low REAL, close REAL,
    adjusted_close REAL, volume INTEGER, provider TEXT DEFAULT 'YahooFinance',
    PRIMARY KEY (symbol, trade_date)
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS symbols (
    symbol TEXT PRIMARY KEY, exchange TEXT DEFAULT 'NSE', company_name TEXT, sector TEXT
  )`);

  const insertPrice = db.prepare(
    `INSERT OR IGNORE INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertSymbol = db.prepare(`INSERT OR IGNORE INTO symbols (symbol, exchange) VALUES (?, 'NSE')`);

  console.log(`=== TRACK-41: POPULATING ${symbols.length} SYMBOL(S) ===\n`);

  let totalRows = 0;
  let success = 0;
  let failures = 0;

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    process.stdout.write(`[${i + 1}/${symbols.length}] ${sym}... `);

    try {
      const data = await yahooFetch(`${sym}?range=5y&interval=1d`);

      if (!Array.isArray(data) || data.error) {
        console.log(`FAILED: ${data.error || 'Invalid data'}`);
        failures++;
        continue;
      }

      if (data.length === 0) {
        console.log('NO DATA');
        failures++;
        continue;
      }

      // Insert symbol
      insertSymbol.run(sym);

      // Insert all price rows
      const insertTx = db.transaction((rows) => {
        for (const r of rows) {
          insertPrice.run(sym, r.date, r.open, r.high, r.low, r.close, r.adjusted_close, r.volume);
        }
      });
      insertTx(data);
      totalRows += data.length;
      success++;
      console.log(`${data.length} rows ✓`);

      // Rate limit: 200ms between symbols
      if (i < symbols.length - 1) await sleep(200);
    } catch (e) {
      console.log(`CRASHED: ${e.message}`);
      failures++;
    }
  }

  // Verify
  const priceCount = db.prepare('SELECT COUNT(*) as c FROM daily_prices').get().c;
  const symCount = db.prepare('SELECT COUNT(DISTINCT symbol) as c FROM daily_prices').get().c;
  const dateRange = db.prepare('SELECT MIN(trade_date) as mn, MAX(trade_date) as mx FROM daily_prices').get();

  console.log('\n=== RESULTS ===');
  console.log(`Symbols processed: ${success}/${symbols.length} succeeded, ${failures} failed`);
  console.log(`Total price rows inserted: ${totalRows.toLocaleString()}`);
  console.log(`DB daily_prices total: ${priceCount.toLocaleString()}`);
  console.log(`Distinct symbols: ${symCount}`);
  if (dateRange.mn) console.log(`Date range: ${dateRange.mn} → ${dateRange.mx}`);

  // Quick row check for RELIANCE
  const relCount = db.prepare("SELECT COUNT(*) as c FROM daily_prices WHERE symbol = 'RELIANCE.NS'").get().c;
  console.log(`RELIANCE rows: ${relCount}`);

  db.close();
  console.log('\n=== TRACK-41 POPULATION COMPLETE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
