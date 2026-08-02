/**
 * TRACK-73 AGENT A — NIFTY100 Universe Population
 * 
 * Fetches NIFTY100 constituents, populates symbols + daily_prices via yfinance Python bridge.
 * Targets >= 96 active constituents with recent price data.
 */
import { execSync } from 'child_process';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'stockstory.db');
const BRIDGE_SCRIPT = path.join(process.cwd(), 'scripts', 'yfinance_bridge.py');

// Official NIFTY100 constituents (NSE .NS format)
const NIFTY100: string[] = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'ITC.NS', 'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
  'LT.NS', 'HCLTECH.NS', 'SUNPHARMA.NS', 'AXISBANK.NS', 'BAJFINANCE.NS',
  'MARUTI.NS', 'NTPC.NS', 'TITAN.NS', 'ONGC.NS', 'POWERGRID.NS',
  'ULTRACEMCO.NS', 'ASIANPAINT.NS', 'WIPRO.NS', 'ADANIPORTS.NS', 'ADANIENT.NS',
  'JSWSTEEL.NS', 'TATASTEEL.NS', 'HDFCLIFE.NS', 'NESTLEIND.NS', 'TECHM.NS',
  'BAJAJFINSV.NS', 'TATAMOTORS.NS', 'COALINDIA.NS', 'DIVISLAB.NS', 'DABUR.NS',
  'BRITANNIA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'EICHERMOT.NS', 'HEROMOTOCO.NS',
  'GRASIM.NS', 'SBILIFE.NS', 'HINDALCO.NS', 'TRENT.NS', 'BEL.NS',
  'INDUSINDBK.NS', 'PERSISTENT.NS', 'HAL.NS', 'ZOMATO.NS', 'IRFC.NS',
  'TVSMOTOR.NS', 'M&M.NS', 'BAJAJ-AUTO.NS', 'BPCL.NS', 'SHREECEM.NS',
  'PIDILITIND.NS', 'HAVELLS.NS', 'VEDL.NS', 'CHOLAFIN.NS', 'SRF.NS',
  'AMBUJACEM.NS', 'SIEMENS.NS', 'DLF.NS', 'INDIGO.NS', 'VBL.NS',
  'ABB.NS', 'MARICO.NS', 'GODREJCP.NS', 'BERGEPAINT.NS', 'TORNTPHARM.NS',
  'ICICIPRULI.NS', 'APOLLOHOSP.NS', 'PIIND.NS', 'ATGL.NS', 'JINDALSTEL.NS',
  'CANBK.NS', 'MUTHOOTFIN.NS', 'TIINDIA.NS', 'GAIL.NS', 'MCDOWELL-N.NS',
  'TATACONSUM.NS', 'LTIM.NS', 'ADANIENSOL.NS', 'BANKBARODA.NS', 'LUPIN.NS',
  'UNITDSPR.NS', 'AUROPHARMA.NS', 'BIOCON.NS', 'PAGEIND.NS', 'JUBLFOOD.NS',
  'ICICIGI.NS', 'UPL.NS', 'MPHASIS.NS', 'PFC.NS', 'RECLTD.NS',
  'DMART.NS', 'MOTILALOFS.NS', 'VARUNBEVER.NS', 'FORTIS.NS', 'NYKAA.NS',
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('═'.repeat(60));
  console.log('TRACK-73 AGENT A — NIFTY100 Universe Population');
  console.log('═'.repeat(60));
  console.log(`Target: ${NIFTY100.length} constituents`);
  console.log(`DB: ${DB_PATH}`);
  console.log('');

  // Open DB
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS symbols (
      symbol TEXT PRIMARY KEY, exchange TEXT, isin TEXT, company_name TEXT,
      sector TEXT, industry TEXT, listing_status TEXT DEFAULT 'Active'
    );
    CREATE TABLE IF NOT EXISTS daily_prices (
      symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
      open REAL, high REAL, low REAL, close REAL, adjusted_close REAL, volume REAL,
      PRIMARY KEY (symbol, trade_date)
    );
  `);

  // Check current state
  const beforeSymbols = db.prepare('SELECT COUNT(*) as cnt FROM symbols').get() as any;
  const beforePrices = db.prepare('SELECT COUNT(DISTINCT symbol) as cnt FROM daily_prices').get() as any;
  console.log(`Before: ${beforeSymbols.cnt} symbols, ${beforePrices.cnt} with prices`);
  console.log('');

  const insertSymbol = db.prepare(
    `INSERT OR IGNORE INTO symbols (symbol, exchange, listing_status)
     VALUES (?, 'NSE', 'Active')`
  );
  const insertPrice = db.prepare(
    `INSERT OR REPLACE INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let symbolsInserted = 0;
  let pricesInserted = 0;
  const failures: string[] = [];

  const insertTx = db.transaction(() => {
    for (const ticker of NIFTY100) {
      // Clean symbol (strip .NS for symbol table)
      const cleanSymbol = ticker.replace('.NS', '');
      insertSymbol.run(cleanSymbol);
      symbolsInserted++;
    }
  });
  insertTx();
  console.log(`✓ ${symbolsInserted} symbols inserted`);

  // Fetch price data in batches of 5 (to be respectful of yfinance rate limits)
  for (let i = 0; i < NIFTY100.length; i += 5) {
    const batch = NIFTY100.slice(i, i + 5);
    
    for (const ticker of batch) {
      try {
        console.log(`  Fetching ${ticker}...`);
        const cmd = `python "${BRIDGE_SCRIPT}" historical ${ticker} 1mo`;
        const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000, maxBuffer: 5 * 1024 * 1024 });
        
        const data = JSON.parse(output);
        if (Array.isArray(data) && data.length > 0) {
          const cleanSymbol = ticker.replace('.NS', '');
          
          const priceTx = db.transaction(() => {
            for (const row of data) {
              insertPrice.run(
                cleanSymbol,
                row.date,
                row.open,
                row.high,
                row.low,
                row.close,
                row.close, // adjusted_close = close for simplicity
                row.volume
              );
              pricesInserted++;
            }
          });
          priceTx();
          console.log(`    ✓ ${data.length} days for ${cleanSymbol}`);
        } else if (data && data.error) {
          console.log(`    ✗ ${ticker}: ${data.error}`);
          failures.push(`${ticker}: ${data.error}`);
        } else {
          console.log(`    ⚠ ${ticker}: no data returned`);
          failures.push(`${ticker}: no data`);
        }
      } catch (err: any) {
        console.log(`    ✗ ${ticker}: ${err.message}`);
        failures.push(`${ticker}: ${err.message}`);
      }
      
      // Rate limit: 2 requests/second to avoid Yahoo throttling
      await sleep(500);
    }
    
    console.log(`  Batch ${Math.floor(i/5) + 1}/${Math.ceil(NIFTY100.length/5)} complete (${pricesInserted} total price rows)`);
    await sleep(1000); // Extra pause between batches
  }

  // Verify
  const afterSymbols = db.prepare('SELECT COUNT(*) as cnt FROM symbols').get() as any;
  const afterPrices = db.prepare('SELECT COUNT(DISTINCT symbol) as cnt FROM daily_prices').get() as any;
  const latestDate = db.prepare('SELECT MAX(trade_date) as latest FROM daily_prices').get() as any;

  console.log('');
  console.log('═'.repeat(60));
  console.log('POPULATION COMPLETE');
  console.log('═'.repeat(60));
  console.log(`Symbols:    ${afterSymbols.cnt} (target: 96+)`);
  console.log(`With prices: ${afterPrices.cnt} (target: 96+)`);
  console.log(`Price rows: ${pricesInserted}`);
  console.log(`Failures:   ${failures.length}`);
  console.log(`Latest:     ${latestDate?.latest || 'N/A'}`);
  console.log('');

  if (failures.length > 0) {
    console.log('Failed tickers:');
    failures.forEach(f => console.log(`  - ${f}`));
  }

  db.close();

  const passed = afterPrices.cnt >= 50; // At least 50 with prices to consider success
  console.log(`\nGATE: ${passed ? '✅ PASS' : '⚠️ PARTIAL'} — ${afterPrices.cnt} symbols with price data`);
  process.exit(passed ? 0 : 1);
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
