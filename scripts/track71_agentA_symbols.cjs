#!/usr/bin/env node
/**
 * TRACK-71 AGENT A — Symbol Universe Truth
 * Queries ALL DB tables for distinct symbols. Resolves the 5 vs 30 vs 100 contradiction.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
const REPORT_DIR = path.join(ROOT, 'reports', 'track-71');
const REPORT_PATH = path.join(REPORT_DIR, 'A-symbol-universe.md');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const results = { tables: {}, totalDistinctSymbols: [], errors: [] };

if (!fs.existsSync(DB_PATH)) {
  const report = `# TRACK-71 Agent A — Symbol Universe Truth\n\n**DB not found at ${DB_PATH}**\n`;
  fs.writeFileSync(REPORT_PATH, report, 'utf-8');
  console.log('DB not found');
  process.exit(1);
}

try {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH, { readonly: true });

  // Find all tables that might have symbol columns
  const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name);

  const symbolColNames = ['symbol', 'ticker', 'isin', 'scrip_code', 'nse_symbol', 'yahoo_symbol', 'security_id'];

  for (const table of allTables) {
    try {
      const cols = db.prepare(`PRAGMA table_info(\`${table}\`)`).all().map(c => c.name);
      const symCol = cols.find(c => symbolColNames.includes(c.toLowerCase()));
      if (symCol) {
        const rows = db.prepare(`SELECT DISTINCT \`${symCol}\` as sym FROM \`${table}\` WHERE \`${symCol}\` IS NOT NULL AND \`${symCol}\` != ''`).all();
        const symbols = rows.map(r => String(r.sym).trim().toUpperCase()).filter(s => s.length > 0 && s.length <= 20);
        results.tables[table] = { column: symCol, count: symbols.length, symbols: symbols.sort() };
        results.totalDistinctSymbols.push(...symbols);
      }
    } catch (e) {
      results.errors.push(`${table}: ${e.message}`);
    }
  }

  // Also check if there's a symbols table specifically
  const symbolTables = allTables.filter(t => t.toLowerCase().includes('symbol') || t.toLowerCase().includes('ticker') || t.toLowerCase().includes('security'));
  for (const st of symbolTables) {
    if (!results.tables[st]) {
      try {
        const rows = db.prepare(`SELECT * FROM \`${st}\` LIMIT 5`).all();
        if (rows.length > 0) {
          const potentialSymCols = Object.keys(rows[0]).filter(k => k.toLowerCase().includes('symbol') || k.toLowerCase().includes('ticker') || k.toLowerCase().includes('isin'));
          if (potentialSymCols.length > 0) {
            for (const col of potentialSymCols) {
              const allRows = db.prepare(`SELECT DISTINCT \`${col}\` as sym FROM \`${st}\``).all();
              const symbols = allRows.map(r => String(r.sym).trim().toUpperCase()).filter(s => s.length > 0 && s.length <= 20);
              results.tables[`${st}.${col}`] = { column: col, count: symbols.length, symbols: symbols.sort() };
              results.totalDistinctSymbols.push(...symbols);
            }
          }
        }
      } catch(e) {}
    }
  }

  db.close();
} catch (e) {
  results.errors.push(`DB open: ${e.message}`);
}

// Deduplicate total symbols
const uniqueSymbols = [...new Set(results.totalDistinctSymbols)].sort();
const totalUnique = uniqueSymbols.length;

// NIFTY100 reference list
const NIFTY100 = [
  "RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","HINDUNILVR","ITC","BHARTIARTL","KOTAKBANK","SBIN",
  "BAJFINANCE","LT","HCLTECH","SUNPHARMA","ASIANPAINT","MARUTI","AXISBANK","TITAN","DMART","WIPRO",
  "ULTRACEMCO","NTPC","POWERGRID","ADANIPORTS","ADANIENT","JSWSTEEL","TATASTEEL","TECHM",
  "NESTLEIND","ONGC","COALINDIA","BAJAJFINSV","BPCL","HDFCLIFE","SBILIFE","DIVISLAB","SHREECEM",
  "BAJAJ-AUTO","EICHERMOT","HEROMOTOCO","M&M","TATAMOTORS","CIPLA","DRREDDY","APOLLOHOSP","BRITANNIA",
  "GRASIM","INDUSINDBK","PIDILITIND","BERGEPAINT","DABUR","GODREJCP","MARICO","TATACONSUM",
  "HAVELLS","SIEMENS","ABB","HAL","BEL","VBL","ZOMATO","TRENT",
  "IRFC","LTIM","PERSISTENT","MPHASIS","FEDERALBNK","BANKBARODA","PNB","UNIONBANK","CANBK","INDIANB",
  "INDHOTEL","LICHSGFIN","CHOLAFIN","TORNTPHARM","TORNTPOWER","POLYCAB","JINDALSTEL","HINDALCO","VEDL",
  "AMBUJACEM","SRF","NAUKRI","INFOEDGE","POLICYBZR","PAYTM","DLF","GODREJPROP",
  "TATACOMM","BHARTIHEXA","IDEA","LICI","ADANIGREEN","ADANIPOWER","MAXHEALTH",
];

const niftyPresent = NIFTY100.filter(n => uniqueSymbols.includes(n));
const niftyMissing = NIFTY100.filter(n => !uniqueSymbols.includes(n));
const niftyCoverage = ((niftyPresent.length / NIFTY100.length) * 100).toFixed(1);

let report = `# TRACK-71 Agent A — Symbol Universe Truth

**Generated:** ${new Date().toISOString()}
**DB:** \`${DB_PATH}\`

## Actual Symbols — Table by Table

| Table | Column | Distinct Symbols |
|-------|--------|-----------------|
`;
for (const [table, data] of Object.entries(results.tables)) {
  report += `| ${table} | ${data.column} | ${data.count} |\n`;
}
report += `
## Total Unique Symbols Across All Tables: **${totalUnique}**

### Symbol List
\`\`\`
${uniqueSymbols.join(', ')}
\`\`\`

## NIFTY100 Coverage

- **NIFTY100 reference count:** ${NIFTY100.length}
- **Present:** ${niftyPresent.length} — ${niftyPresent.join(', ')}
- **Missing:** ${niftyMissing.length} — ${niftyMissing.join(', ')}
- **Coverage:** ${niftyCoverage}%

## Contradiction Resolution

| Source | Claim | TRACK-71 Reality |
|--------|-------|------------------|
| symbols table | 5 symbols | **${results.tables['symbols']?.count || 'N/A'}** |
| prediction_registry | varies | **${results.tables['prediction_registry']?.count || 'N/A'}** — actual distinct symbols used in predictions |
| factor_snapshots | 30+ symbols | **${results.tables['factor_snapshots']?.count || 'N/A'}** — actual distinct symbols with factor data |
| All tables combined | — | **${totalUnique}** unique symbols total |

## Verdict

**Actual NIFTY100 coverage: ${niftyCoverage}%** (${niftyPresent.length}/${NIFTY100.length})

${niftyCoverage >= 80 ? 'NIFTY100 coverage is sufficient for public beta.' : niftyCoverage >= 40 ? 'Moderate coverage — need to backfill remaining NIFTY100 symbols.' : 'CRITICAL: NIFTY100 coverage is very low. Data population required.'}
`;

if (results.errors.length > 0) {
  report += `\n## Errors\n${results.errors.map(e => `- ${e}`).join('\n')}\n`;
}

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`Agent A: ${totalUnique} unique symbols across ${Object.keys(results.tables).length} tables`);
console.log(`NIFTY100 coverage: ${niftyCoverage}% (${niftyPresent.length}/${NIFTY100.length})`);
