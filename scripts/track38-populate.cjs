/**
 * TRACK-38 — Data Population Script
 * Populates daily_prices and financial_snapshots from yfinance + Screener.
 * Runs in Node.js CJS mode for direct SQLite access.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'stockstory.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ─── NIFTY50 Symbols ───
const NIFTY50 = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'KOTAKBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS',
  'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'ASIANPAINT.NS', 'HCLTECH.NS',
  'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'WIPRO.NS', 'ULTRACEMCO.NS',
  'NTPC.NS', 'POWERGRID.NS', 'ONGC.NS', 'COALINDIA.NS', 'NESTLEIND.NS',
  'TECHM.NS', 'BAJAJFINSV.NS', 'JSWSTEEL.NS', 'TATASTEEL.NS', 'GRASIM.NS',
  'HDFCLIFE.NS', 'SBILIFE.NS', 'ADANIPORTS.NS', 'ADANIENT.NS', 'BRITANNIA.NS',
  'BPCL.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'DRREDDY.NS', 'EICHERMOT.NS',
  'HEROMOTOCO.NS', 'HINDALCO.NS', 'INDUSINDBK.NS', 'M&M.NS', 'TATAMOTORS.NS',
  'TATACONSUM.NS', 'UPL.NS', 'BAJAJ-AUTO.NS', 'HDFC.NS', 'APOLLOHOSP.NS',
];

// ─── INSERT helpers ───
const insertPrice = db.prepare(`
  INSERT OR IGNORE INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertFundamental = db.prepare(`
  INSERT OR IGNORE INTO financial_snapshots
    (symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta,
     debt_to_equity, current_ratio, roe, roa, pb_ratio,
     revenue_growth, profit_growth, gross_margin, operating_margin)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// ─── YFinance fetch via ESM import ───
async function fetchHistoricalData(symbol, period = '5y') {
  try {
    const yf = await import('yfinance');
    const ticker = yf.default.Ticker(symbol);
    const hist = await ticker.history(period);
    return hist || [];
  } catch (e) {
    console.error(`  Failed ${symbol}: ${e.message}`);
    return null;
  }
}

async function fetchInfo(symbol) {
  try {
    const yf = await import('yfinance');
    const ticker = yf.default.Ticker(symbol);
    const info = await ticker.info;
    return info || null;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('=== TRACK-38 DATA POPULATION ===\n');
  console.log(`Target: ${NIFTY50.length} NIFTY50 symbols\n`);

  let totalPriceRows = 0;
  let totalFundamentals = 0;
  let successCount = 0;
  let failCount = 0;

  const insertPriceTx = db.transaction((rows) => {
    for (const r of rows) {
      insertPrice.run(r.symbol, r.date, r.open, r.high, r.low, r.close, r.adj_close, r.volume);
    }
  });

  for (let i = 0; i < NIFTY50.length; i++) {
    const symbol = NIFTY50[i];
    const progress = `[${i + 1}/${NIFTY50.length}]`;
    
    // Rate limiting — 1 symbol per 2 seconds
    if (i > 0) await sleep(2000);

    try {
      const data = await fetchHistoricalData(symbol, '5y');
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log(`${progress} ${symbol}: NO DATA returned`);
        failCount++;
        continue;
      }

      const rows = Array.isArray(data) ? data : [data];
      const priceRows = [];
      
      for (const row of rows) {
        const date = row.Date || row.date;
        if (!date) continue;
        
        priceRows.push({
          symbol,
          date: typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0],
          open: Number(row.Open ?? row.open ?? 0),
          high: Number(row.High ?? row.high ?? 0),
          low: Number(row.Low ?? row.low ?? 0),
          close: Number(row.Close ?? row.close ?? 0),
          adj_close: Number(row['Adj Close'] ?? row.adjClose ?? row.close ?? 0),
          volume: Number(row.Volume ?? row.volume ?? 0),
        });
      }

      if (priceRows.length > 0) {
        insertPriceTx(priceRows);
        totalPriceRows += priceRows.length;
      }

      // Fetch fundamentals
      try {
        const info = await fetchInfo(symbol);
        if (info && info.symbol) {
          insertFundamental.run(
            symbol,
            new Date().toISOString().split('T')[0],
            info.marketCap || null,
            info.trailingPE || null,
            info.earningsPerShare || null,
            info.dividendYield ? info.dividendYield * 100 : null,
            info.beta || null,
            info.debtToEquity || null,
            info.currentRatio || null,
            info.returnOnEquity || null,
            info.returnOnAssets || null,
            info.priceToBook || null,
            info.revenueGrowth || null,
            info.earningsGrowth || null,
            info.grossMargins || null,
            info.operatingMargins || null,
          );
          totalFundamentals++;
        }
      } catch (e) {
        // Fundamentals optional
      }

      successCount++;
      console.log(`${progress} ${symbol}: ${priceRows.length} price rows stored`);
    } catch (e) {
      console.log(`${progress} ${symbol}: ERROR — ${e.message}`);
      failCount++;
    }
  }

  // ─── Final Report ───
  console.log('\n=== POPULATION COMPLETE ===');
  console.log(`Symbols attempted: ${NIFTY50.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Price rows stored: ${totalPriceRows.toLocaleString()}`);
  console.log(`Fundamental snapshots: ${totalFundamentals}`);

  // Verify counts
  const priceCount = db.prepare('SELECT COUNT(*) as c FROM daily_prices').get().c;
  const symbolCount = db.prepare('SELECT COUNT(DISTINCT symbol) FROM daily_prices').get()['COUNT(DISTINCT symbol)'];
  const fundCount = db.prepare('SELECT COUNT(*) as c FROM financial_snapshots').get().c;
  const dateRange = db.prepare('SELECT MIN(trade_date) as min, MAX(trade_date) as max FROM daily_prices').get();

  console.log('\n--- VERIFICATION ---');
  console.log(`daily_prices: ${priceCount.toLocaleString()} rows, ${symbolCount} symbols`);
  console.log(`financial_snapshots: ${fundCount} rows`);
  if (dateRange.min) console.log(`Date range: ${dateRange.min} → ${dateRange.max}`);

  db.close();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
