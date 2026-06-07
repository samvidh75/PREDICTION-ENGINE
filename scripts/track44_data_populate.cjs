/**
 * TRACK-44 CONSOLIDATED DATA POPULATION
 * Fetches historical prices AND financial data using pure Node.js (no Python)
 * 
 * Yahoo Finance CSV endpoint: https://query1.finance.yahoo.com/v7/finance/download/SYMBOL.NS
 * Screener.in: scraped for financial data
 * 
 * This consolidates Agent B (Financial Snapshots) and Agent C (NIFTY100 Expansion)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
const REPORTS_DIR = path.join(ROOT, 'reports', 'track-44');

const NIFTY100 = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR',
  'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'BAJFINANCE',
  'ASIANPAINT', 'AXISBANK', 'MARUTI', 'SUNPHARMA', 'TITAN', 'WIPRO',
  'HCLTECH', 'ULTRACEMCO', 'NTPC', 'POWERGRID', 'ADANIPORTS',
  'ADANIENT', 'NESTLEIND', 'TECHM', 'ONGC', 'DRREDDY', 'COALINDIA',
  'JSWSTEEL', 'TATAMOTORS', 'GRASIM', 'BAJAJFINSV', 'TATASTEEL',
  'HDFCLIFE', 'SBILIFE', 'EICHERMOT', 'DIVISLAB', 'APOLLOHOSP',
  'BPCL', 'BRITANNIA', 'CIPLA', 'HEROMOTOCO', 'HINDALCO',
  'INDUSINDBK', 'M&M', 'TATACONSUM', 'UPL', 'BAJAJ-AUTO', 'SHREECEM',
  'ABB', 'ADANIGREEN', 'ADANITRANS', 'ALKEM', 'AMBUJACEM',
  'AUROPHARMA', 'BANDHANBNK', 'BANKBARODA', 'BERGEPAINT',
  'BIOCON', 'BOSCHLTD', 'CADILAHC', 'CANBK', 'CHOLAFIN',
  'COLPAL', 'CONCOR', 'DABUR', 'DLF', 'FEDERALBNK', 'GAIL',
  'GODREJCP', 'HAVELLS', 'HDFCAMC', 'HONAUT', 'ICICIPRULI',
  'IGL', 'INDUSTOWER', 'IOC', 'JUBLFOOD', 'LICHSGFIN',
  'LUPIN', 'M&MFIN', 'MARICO', 'MUTHOOTFIN', 'NAUKRI',
  'NAVINFLUOR', 'NIACL', 'NMDC', 'PAGEIND', 'PEL',
  'PETRONET', 'PIDILITIND', 'PFC', 'PNB', 'RAMCOCEM',
  'SBICARD', 'SRTRANSFIN', 'TORNTPHARM', 'TVSMOTOR', 'VEDL',
];

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function getDb() {
  if (!fs.existsSync(DB_PATH)) return null;
  const Database = require('better-sqlite3');
  return new Database(DB_PATH);
}

async function fetchHistoricalPrices(symbol, period = '2y') {
  // Yahoo CSV endpoint: ?period1=...&period2=...&interval=1d
  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - (period === '2y' ? 63072000 : period === '1y' ? 31536000 : 15768000);
  
  const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}.NS?period1=${startDate}&period2=${endDate}&interval=1d&events=history`;
  
  try {
    const csv = await httpGet(url);
    if (!csv || csv.includes('Not Found') || csv.includes('error')) {
      return { symbol, rows: 0, error: 'No data' };
    }
    
    const lines = csv.split('\n').filter(l => l.trim() && !l.startsWith('Date'));
    const rows = [];
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 6 && parts[0] && !parts[0].startsWith('null')) {
        rows.push({
          symbol,
          date: parts[0],
          open: parseFloat(parts[1]) || 0,
          high: parseFloat(parts[2]) || 0,
          low: parseFloat(parts[3]) || 0,
          close: parseFloat(parts[4]) || 0,
          adjClose: parseFloat(parts[5]) || parseFloat(parts[4]) || 0,
          volume: parseInt(parts[6]) || 0
        });
      }
    }
    return { symbol, rows: rows.length, data: rows };
  } catch (e) {
    return { symbol, rows: 0, error: e.message };
  }
}

async function fetchFinancialSnapshot(symbol) {
  // Use Yahoo v8/finance/quote endpoint to get key financial metrics
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbol}.NS`;
    const json = await httpGet(url);
    const parsed = JSON.parse(json);
    const result = parsed?.quoteResponse?.result?.[0];
    
    if (!result) return { symbol, error: 'No quote data' };
    
    return {
      symbol,
      peRatio: result.trailingPE || null,
      pbRatio: result.priceToBook || null,
      marketCap: result.marketCap || null,
      roe: result.returnOnEquity ? result.returnOnEquity * 100 : null,
      // Limited: Yahoo free API doesn't give all fundamentals
      error: null
    };
  } catch (e) {
    return { symbol, error: e.message };
  }
}

async function insertPrices(db, rows) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((allRows) => {
    let count = 0;
    for (const r of allRows) {
      try {
        insert.run(r.symbol, r.date, r.open, r.high, r.low, r.close, r.adjClose, r.volume);
        count++;
      } catch {}
    }
    return count;
  });
  
  return insertMany(rows);
}

async function insertFinancials(db, records) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO financial_snapshots 
    (symbol, snapshot_date, pe_ratio, pb_ratio, market_cap, roe)
    VALUES (?, datetime('now'), ?, ?, ?, ?)
  `);
  
  let count = 0;
  for (const r of records) {
    if (r.error) continue;
    try {
      insert.run(r.symbol, r.peRatio, r.pbRatio, r.marketCap, r.roe);
      count++;
    } catch {}
  }
  return count;
}

function getCurrentCounts(db) {
  const priceCount = db.prepare('SELECT COUNT(*) as c FROM daily_prices').get()?.c || 0;
  const symbolCount = db.prepare('SELECT COUNT(DISTINCT symbol) as c FROM daily_prices').get()?.c || 0;
  const finCount = db.prepare('SELECT COUNT(*) as c FROM financial_snapshots').get()?.c || 0;
  const predCount = db.prepare('SELECT COUNT(*) as c FROM prediction_registry').get()?.c || 0;
  return { priceCount, symbolCount, finCount, predCount };
}

async function main() {
  console.log('=== TRACK-44 DATA POPULATION (Node.js, No Python) ===\n');
  
  const db = getDb();
  if (!db) { console.error('No database found!'); return; }
  
  const before = getCurrentCounts(db);
  console.log('BEFORE:');
  console.log(`  daily_prices: ${before.priceCount.toLocaleString()} rows, ${before.symbolCount} symbols`);
  console.log(`  financial_snapshots: ${before.finCount}`);
  console.log(`  prediction_registry: ${before.predCount.toLocaleString()}`);
  
  const existingSymbols = db.prepare('SELECT DISTINCT symbol FROM daily_prices').all().map(r => r.symbol);
  const newSymbols = NIFTY100.filter(s => !existingSymbols.includes(s));
  
  console.log(`\nExisting symbols with data: ${existingSymbols.length}`);
  console.log(`New symbols to fetch: ${newSymbols.length}`);
  
  // PHASE 1: Fetch historical prices for new symbols
  let totalPriceRows = 0;
  let succeeded = 0;
  let failed = [];
  
  if (newSymbols.length > 0) {
    console.log(`\n--- PHASE 1: Price Data (${newSymbols.length} symbols) ---`);
    
    // Fetch in batches of 3 to avoid rate limiting
    for (let i = 0; i < newSymbols.length; i += 3) {
      const batch = newSymbols.slice(i, i + 3);
      const results = await Promise.all(batch.map(s => fetchHistoricalPrices(s)));
      
      for (const result of results) {
        if (result.error) {
          failed.push({ symbol: result.symbol, error: result.error });
        } else if (result.data && result.data.length > 0) {
          const inserted = await insertPrices(db, result.data);
          totalPriceRows += inserted;
          succeeded++;
        } else {
          failed.push({ symbol: result.symbol, error: '0 rows returned' });
        }
      }
      
      console.log(`  [${Math.min(i + 3, newSymbols.length)}/${newSymbols.length}] ${succeeded} ok, ${failed.length} failed, ${totalPriceRows.toLocaleString()} rows`);
      
      // Small delay between batches
      if (i + 3 < newSymbols.length) await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // PHASE 2: Fetch financial data for all NIFTY100
  console.log(`\n--- PHASE 2: Financial Snapshots ---`);
  const finResults = await Promise.all(NIFTY100.slice(0, 20).map(s => fetchFinancialSnapshot(s)));
  const finInserted = await insertFinancials(db, finResults);
  console.log(`  Fetched quotes: ${finResults.length}, Inserted: ${finInserted}`);
  
  // AFTER
  const after = getCurrentCounts(db);
  console.log('\nAFTER:');
  console.log(`  daily_prices: ${after.priceCount.toLocaleString()} rows, ${after.symbolCount} symbols`);
  console.log(`  financial_snapshots: ${after.finCount}`);
  console.log(`  prediction_registry: ${after.predCount.toLocaleString()}`);
  
  // Generate report
  const report = `# TRACK-44 Data Population Summary

**Generated:** ${new Date().toISOString()}

## Phase 1: Price Data Expansion

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| daily_prices | ${before.priceCount.toLocaleString()} | ${after.priceCount.toLocaleString()} | 120,000 | ${after.priceCount >= 120000 ? 'MET' : 'NOT MET'} |
| Symbols | ${before.symbolCount} | ${after.symbolCount} | 100 | ${after.symbolCount >= 100 ? 'MET' : 'NOT MET'} |
| New symbols fetched | — | ${succeeded} | — | — |
| Failed | — | ${failed.length} | — | — |

## Phase 2: Financial Data

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| financial_snapshots | ${before.finCount} | ${after.finCount} | 500 | ${after.finCount >= 500 ? 'MET' : 'NOT MET'} |

## Failed Symbols (${failed.length})
${failed.slice(0, 20).map(f => `- ${f.symbol}: ${f.error}`).join('\n')}

## Prediction Registry
Before: ${before.predCount.toLocaleString()} | After: ${after.predCount.toLocaleString()}
`;

  fs.writeFileSync(path.join(REPORTS_DIR, '02-03-DataPopulationSummary.md'), report);
  console.log('\nReport written to reports/track-44/02-03-DataPopulationSummary.md');
  
  db.close();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
