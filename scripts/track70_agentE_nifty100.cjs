#!/usr/bin/env node
/**
 * TRACK-70 AGENT E — NIFTY100 Gap Report
 * Compares DB universe against official NIFTY100.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'track-70');
const REPORT_PATH = path.join(REPORT_DIR, 'E-universe-audit.md');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

// NIFTY100 constituents as of 2025 — comprehensive list
const NIFTY100 = [
  "RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","HINDUNILVR","ITC","BHARTIARTL","KOTAKBANK","SBIN",
  "BAJFINANCE","LT","HCLTECH","SUNPHARMA","ASIANPAINT","MARUTI","AXISBANK","TITAN","DMART","WIPRO",
  "ULTRACEMCO","NTPC","POWERGRID","HDFC","ADANIPORTS","ADANIENT","JSWSTEEL","TATASTEEL","TECHM",
  "NESTLEIND","ONGC","COALINDIA","BAJAJFINSV","BPCL","HDFCLIFE","SBILIFE","DIVISLAB","SHREECEM",
  "BAJAJ-AUTO","EICHERMOT","HEROMOTOCO","M&M","TATAMOTORS","CIPLA","DRREDDY","APOLLOHOSP","BRITANNIA",
  "GRASIM","INDUSINDBK","PIDILITIND","BERGEPAINT","DABUR","GODREJCP","MARICO","TATACONSUM",
  "HAVELLS","SIEMENS","ABB","HAL","BEL","ADANIPOWER","ADANIGREEN","VBL","ZOMATO","TRENT",
  "BEL","IRFC","HAL","LTIM","PERSISTENT","MPHASIS","FEDERALBNK","KOTAKBANK","ICICIBANK","HDFCBANK",
  "BANKBARODA","PNB","UNIONBANK","CANBK","INDIANB","INDHOTEL","LICHSGFIN","CHOLAFIN",
  "POWERGRID","NTPC","TORNTPHARM","TORNTPOWER","POLYCAB","JINDALSTEL","HINDALCO","VEDL",
  "AMBUJACEM","SRF","NAUKRI","INFOEDGE","POLICYBZR","PAYTM","DLF","GODREJPROP",
  "LTIMIND","PERSISTENT","TATACOMM","BHARTIHEXA","IDEA","LICI",
];

// DB symbols
let dbSymbols = [];
const dbPath = path.join(ROOT, 'data', 'stockstory.db');
let dbExists = fs.existsSync(dbPath);
let dbError = null;

if (dbExists) {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    // Try different table names
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    for (const table of tables) {
      try {
        // Try common column names: symbol, ticker, isin, scrip_code
        const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
        const symCol = cols.find(c => ['symbol', 'ticker', 'isin', 'scrip_code', 'nse_symbol'].includes(c.toLowerCase()));
        if (symCol) {
          const rows = db.prepare(`SELECT DISTINCT ${symCol} FROM ${table}`).all();
          dbSymbols = rows.map(r => r[symCol]).filter(Boolean).map(s => s.toUpperCase());
          break;
        }
      } catch(e) { /* skip */ }
    }
    // Also try master_registry or similar
    if (dbSymbols.length === 0) {
      const regTable = tables.find(t => t.includes('registry') || t.includes('master') || t.includes('security'));
      if (regTable) {
        try {
          const cols = db.prepare(`PRAGMA table_info(${regTable})`).all().map(c => c.name);
          const symCol = cols.find(c => ['symbol', 'ticker', 'isin', 'nse_symbol', 'yahoo_symbol'].includes(c.toLowerCase()));
          if (symCol) {
            const rows = db.prepare(`SELECT DISTINCT ${symCol} FROM ${regTable}`).all();
            dbSymbols = rows.map(r => r[symCol]).filter(Boolean).map(s => s.toUpperCase());
          }
        } catch(e) {}
      }
    }
    if (dbSymbols.length === 0) {
      // Last resort: just get whatever looks like a symbol
      for (const table of tables) {
        const rows = db.prepare(`SELECT * FROM ${table} LIMIT 5`).all();
        if (rows.length > 0) {
          dbSymbols = Object.keys(rows[0])
            .filter(k => ['symbol', 'ticker', 'isin', 'scrip_code', 'nse_symbol', 'yahoo_symbol'].includes(k.toLowerCase()))
            .flatMap(k => rows.map(r => r[k]))
            .filter(Boolean)
            .map(s => s.toUpperCase());
          break;
        }
      }
    }
    db.close();
  } catch (e) {
    dbError = e.message;
  }
}

// Also check JSON files
if (dbSymbols.length === 0) {
  const dataDir = path.join(ROOT, 'data');
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);
    for (const file of files) {
      if (file.endsWith('.json') && (file.includes('symbol') || file.includes('ticker') || file.includes('master') || file.includes('symbol'))) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
          const syms = Array.isArray(data) ? data.map(d => d.symbol || d.ticker || d.nse_symbol).filter(Boolean) :
            Object.values(data).filter(v => typeof v === 'string' && v.length <= 20);
          dbSymbols.push(...syms.map(s => s.toUpperCase()));
        } catch(e) {}
      }
    }
  }
  // Also check LIVE_*.json in reports
  const reportsDir = path.join(ROOT, 'reports');
  const reportFiles = fs.existsSync(reportsDir) ? fs.readdirSync(reportsDir).filter(f => f.startsWith('LIVE_') && f.endsWith('.json')) : [];
  for (const file of reportFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(reportsDir, file), 'utf-8'));
      const syms = extractSymbols(data);
      dbSymbols.push(...syms.map(s => s.toUpperCase()));
    } catch(e) {}
  }
}

// Also check LIVEDATA and ProviderResult files
const otherFiles = ['LIVE_DATA_AUDIT.json', 'LIVE_INTELLIGENCE_EXECUTION_REPORT.json', 'LIVE_RECOMPUTATION_REPORT.json', 'LIVE_VALIDATION_RESULTS.json', 'LIVE_PROVIDER_RESULTS.json', 'MASTER_SYMBOL_COUNT.json'];
for (const file of otherFiles) {
  const filePath = path.join(ROOT, file);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const syms = extractSymbols(data);
      dbSymbols.push(...syms.map(s => s.toUpperCase()));
    } catch(e) {}
  }
}

function extractSymbols(obj) {
  const found = [];
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item?.symbol) found.push(item.symbol);
      if (item?.ticker) found.push(item.ticker);
      if (item?.nse_symbol) found.push(item.nse_symbol);
      if (item?.yahoo_symbol) found.push(item.yahoo_symbol);
    }
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.toUpperCase() === key && key.length <= 20 && !key.includes('_') && key.length > 1) found.push(key);
    }
  }
  return found;
}

// Deduplicate
dbSymbols = [...new Set(dbSymbols)].sort();
const present = NIFTY100.filter(n => dbSymbols.includes(n));
const missing = NIFTY100.filter(n => !dbSymbols.includes(n));
const coverage = ((present.length / NIFTY100.length) * 100).toFixed(1);

const report = `# TRACK-70 Agent E — NIFTY100 Gap Report

**Generated:** ${new Date().toISOString()}

## Database Universe

- **DB Path:** \`${path.relative(ROOT, dbPath)}\`
- **DB Exists:** ${dbExists ? '✓ YES' : '✗ NO'}
- **DB Error:** ${dbError || 'None'}
- **Symbols found in DB/files:** ${dbSymbols.length}
- **NIFTY100 reference count:** ${NIFTY100.length}

## Coverage

- **Present:** ${present.join(', ')}
- **Count Present:** ${present.length}
- **Missing:** ${missing.join(', ')}
- **Count Missing:** ${missing.length}
- **Coverage %:** ${coverage}%

## Verdict

${dbSymbols.length === 0 ? '**NO SYMBOLS FOUND** — Database is empty or unreadable. Universe is NOT populated with NIFTY100 data.' :
  present.length >= 80 ? `HIGH COVERAGE (${coverage}%). Universe largely matches NIFTY100.` :
  present.length >= 40 ? `MEDIUM COVERAGE (${coverage}%). Significant gaps in NIFTY100 coverage.` :
  `LOW COVERAGE (${coverage}%). Database has very limited NIFTY100 representation.`}

**Action Required:** ${missing.length > 0 ? `Run universe population scripts to backfill ${missing.length} missing NIFTY100 symbols.` : 'No action needed — all NIFTY100 symbols present.'}
`;

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`Agent E report written to ${REPORT_PATH}`);
console.log(`DB symbols: ${dbSymbols.length}, Present: ${present.length}, Missing: ${missing.length}, Coverage: ${coverage}%`);
