/**
 * TRACK-38 — Population Script via Python yfinance Bridge
 * Calls yfinance_bridge.py for each symbol, inserts into SQLite.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { platform } = require('os');

const DB_PATH = path.join(__dirname, '..', 'data', 'stockstory.db');
const BRIDGE = path.join(__dirname, 'yfinance_bridge.py');
const PYTHON = process.env.PYTHON_BIN || 'python3';

const NIFTY50 = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'KOTAKBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS',
  'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'ASIANPAINT.NS', 'HCLTECH.NS',
  'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'WIPRO.NS', 'ULTRACEMCO.NS',
  'NTPC.NS', 'POWERGRID.NS', 'ONGC.NS', 'COALINDIA.NS', 'NESTLEIND.NS',
  'TECHM.NS', 'BAJAJFINSV.NS', 'JSWSTEEL.NS', 'TATASTEEL.NS', 'GRASIM.NS',
];

function runPython(command, args) {
  const result = execSync(`${PYTHON} "${BRIDGE}" ${command} ${args}`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    timeout: 60000,
  });
  return JSON.parse(result);
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('DB not found at:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  const insertPrice = db.prepare(`
    INSERT OR IGNORE INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFund = db.prepare(`
    INSERT OR IGNORE INTO financial_snapshots
      (symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta,
       debt_to_equity, current_ratio, roe, roa, pb_ratio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  console.log('=== TRACK-38 POPULATION (Python Bridge) ===\n');
  
  let totalPriceRows = 0;
  let totalFundamentals = 0;
  let success = 0;
  let failures = 0;

  const insertTx = db.transaction((rows) => {
    for (const r of rows) {
      insertPrice.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]);
    }
  });

  for (let i = 0; i < NIFTY50.length; i++) {
    const symbol = NIFTY50[i];
    process.stdout.write(`[${i+1}/${NIFTY50.length}] ${symbol}... `);

    try {
      // Fetch historical data via Python bridge
      const data = runPython('historical', `${symbol} 5y`);
      
      if (!Array.isArray(data)) {
        console.log(`ERROR: ${JSON.stringify(data)}`);
        failures++;
        continue;
      }

      if (data.length === 0) {
        console.log(`NO DATA`);
        failures++;
        continue;
      }

      const rows = data.map(row => {
        const date = row.date;
        const close = row.close || 0;
        return [
          symbol, date,
          row.open || close, row.high || close,
          row.low || close, close, close,
          row.volume || 0,
        ];
      });

      insertTx(rows);
      totalPriceRows += rows.length;
      
      // Fetch fundamentals
      try {
        const quotes = runPython('quotes', symbol);
        const q = quotes[symbol];
        if (q && !q.error && q.marketCap) {
          insertFund.run(
            symbol,
            new Date().toISOString().split('T')[0],
            q.marketCap || null,
            q.trailingPE || null,
            q.earningsPerShare || null,
            q.dividendYield ? q.dividendYield * 100 : null,
            q.beta || null,
            q.debtToEquity || null,
            q.currentRatio || null,
            q.returnOnEquity || null,
            q.returnOnAssets || null,
            q.priceToBook || null,
          );
          totalFundamentals++;
        }
      } catch (e) {
        // fundamentals optional
      }

      success++;
      console.log(`${data.length} rows ✓`);
      
      // Rate limit
      if (i < NIFTY50.length - 1) {
        execSync(`timeout /t 3 /nobreak > nul`, { timeout: 5000, encoding: 'utf-8' }).catch(() => {});
      }
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      failures++;
    }
  }

  // Verify
  const priceCount = db.prepare('SELECT COUNT(*) as c FROM daily_prices').get().c;
  const symCount = db.prepare('SELECT COUNT(DISTINCT symbol) FROM daily_prices').get()['COUNT(DISTINCT symbol)'];
  const fundCount = db.prepare('SELECT COUNT(*) as c FROM financial_snapshots').get().c;
  const dateRange = db.prepare('SELECT MIN(trade_date) as min, MAX(trade_date) as max FROM daily_prices').get();

  console.log('\n=== RESULTS ===');
  console.log(`Success: ${success}/${NIFTY50.length}`);
  console.log(`Failures: ${failures}`);
  console.log(`Price rows: ${totalPriceRows.toLocaleString()}`);
  console.log(`Fundamental snapshots: ${totalFundamentals}`);
  console.log(`DB daily_prices total: ${priceCount.toLocaleString()}`);
  console.log(`Distinct symbols: ${symCount}`);
  if (dateRange.min) console.log(`Date range: ${dateRange.min} → ${dateRange.max}`);

  db.close();
}

main();
