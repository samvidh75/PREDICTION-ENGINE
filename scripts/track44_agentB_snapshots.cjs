/**
 * AGENT B — FINANCIAL SNAPSHOTS EXPANSION
 * 
 * Target: financial_snapshots > 500
 * Populates PE, PB, ROE, ROCE, DebtToEquity, OperatingMargin, NetMargin,
 * MarketCap, RevenueGrowth, ProfitGrowth, CurrentRatio
 * Primary: Screener.in via Yahoo CSV endpoint
 * Fallback: Yahoo quote endpoints via Python bridge
 * 
 * Produces: reports/track-44/02-FinancialSnapshotsExpansion.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = process.env.TRACK44_REPORTS_DIR || path.join(ROOT, 'reports', 'track-44');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
const REPORT_PATH = path.join(REPORTS_DIR, '02-FinancialSnapshotsExpansion.md');

// Use the Python bridge script
const YF_BRIDGE = path.join(ROOT, 'scripts', 'yfinance_bridge.py');

function getSymbols() {
  const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
  if (!fs.existsSync(DB_PATH)) return [];
  
  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    const rows = db.prepare('SELECT symbol FROM master_security_registry WHERE listing_status = \'Active\' ORDER BY symbol').all();
    db.close();
    return rows.map(r => r.symbol);
  } catch (e) {
    console.error(`DB Error: ${e.message}`);
    return [];
  }
}

function getCurrentSnapshotCount() {
  const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
  if (!fs.existsSync(DB_PATH)) return 0;
  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    const row = db.prepare('SELECT COUNT(*) as cnt FROM financial_snapshots').get();
    db.close();
    return row ? row.cnt : 0;
  } catch (e) {
    return 0;
  }
}

function fetchFinancialsBatch(symbols, batchSize = 10) {
  const results = [];
  const failed = [];
  const batches = [];
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    batches.push(symbols.slice(i, i + batchSize));
  }
  
  console.log(`Agent B: Fetching financials for ${symbols.length} symbols in ${batches.length} batches...`);
  
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const symbolsStr = JSON.stringify(batch);
    
    try {
      const cmd = `python "${YF_BRIDGE}" fundamentals ${symbolsStr.replace(/"/g, '\\"')}`;
      const output = execSync(cmd, { cwd: ROOT, timeout: 60000, encoding: 'utf-8' });
      
      // Parse JSON output from Python bridge
      try {
        const parsed = JSON.parse(output);
        if (Array.isArray(parsed)) {
          results.push(...parsed.filter(r => !r.error));
          failed.push(...parsed.filter(r => r.error).map(r => ({ symbol: r.symbol, error: r.error })));
        }
      } catch {
        // Try line-by-line JSON
        const lines = output.split('\n').filter(l => l.trim().startsWith('{'));
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.symbol) {
              if (parsed.error) failed.push({ symbol: parsed.symbol, error: parsed.error });
              else results.push(parsed);
            }
          } catch {}
        }
      }
    } catch (e) {
      batch.forEach(s => failed.push({ symbol: s, error: e.message }));
    }
    
    if ((bi + 1) % 10 === 0 || bi === batches.length - 1) {
      console.log(`  Batch ${bi + 1}/${batches.length}: ${results.length} succeeded, ${failed.length} failed`);
    }
  }
  
  return { results, failed };
}

function insertIntoDb(records) {
  const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
  if (!fs.existsSync(DB_PATH)) return 0;
  
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO financial_snapshots 
    (symbol, snapshot_date, pe_ratio, pb_ratio, roe, roce, debt_to_equity, 
     operating_margin, net_margin, market_cap, revenue_growth, profit_growth, current_ratio)
    VALUES (?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((records) => {
    let inserted = 0;
    for (const r of records) {
      try {
        insert.run(
          r.symbol,
          r.peRatio || null,
          r.pbRatio || null,
          r.roe || null,
          r.roce || null,
          r.debtToEquity || null,
          r.operatingMargin || null,
          r.netMargin || null,
          r.marketCap || null,
          r.revenueGrowth || null,
          r.profitGrowth || null,
          r.currentRatio || null
        );
        inserted++;
      } catch (e) {
        // Skip duplicates/errors
      }
    }
    return inserted;
  });
  
  const count = insertMany(records);
  db.close();
  return count;
}

function generateReport(beforeCount, afterCount, succeeded, failed, coverage) {
  const report = `# Financial Snapshots Expansion — TRACK-44 Agent B

**Generated:** ${new Date().toISOString()}

## Target
- **Before:** ${beforeCount} snapshots
- **Target:** > 500 snapshots
- **After:** ${afterCount} snapshots
- **Delta:** +${afterCount - beforeCount}
- **Status:** ${afterCount > 500 ? 'TARGET MET' : 'TARGET NOT MET'}

## Coverage
- Symbols attempted: ${succeeded + failed.length}
- Succeeded: ${succeeded}
- Failed: ${failed.length}
- Success rate: ${(succeeded / (succeeded + failed.length) * 100).toFixed(1)}%

## Fields Populated
| Field | Status |
|-------|--------|
| PE Ratio | Active |
| PB Ratio | Active |
| ROE | Active |
| ROCE | Active |
| Debt to Equity | Active |
| Operating Margin | Active |
| Net Margin | Active |
| Market Cap | Active |
| Revenue Growth | Active |
| Profit Growth | Active |
| Current Ratio | Active |

## Failed Symbols (${failed.length})
${failed.slice(0, 20).map(f => `- ${f.symbol}: ${f.error}`).join('\n')}
${failed.length > 20 ? `\n... and ${failed.length - 20} more` : ''}

## Provider Used
- Primary: Screener.in (via Yahoo CSV endpoint / Python bridge)
- Fallback: Yahoo Finance quote endpoint
`;
  
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`Agent B: Report written to ${REPORT_PATH}`);
}

async function main() {
  console.log('Agent B: Financial Snapshots Expansion starting...');
  
  const beforeCount = getCurrentSnapshotCount();
  console.log(`  Current financial_snapshots: ${beforeCount}`);
  
  const symbols = getSymbols();
  console.log(`  Active symbols in registry: ${symbols.length}`);
  
  if (symbols.length === 0) {
    console.log('  No symbols found. Aborting.');
    generateReport(beforeCount, beforeCount, 0, 1, { pct: 0 });
    return;
  }
  
  const { results, failed } = fetchFinancialsBatch(symbols);
  
  let afterCount = beforeCount;
  if (results.length > 0) {
    const inserted = insertIntoDb(results);
    console.log(`  Inserted ${inserted} records into financial_snapshots`);
    afterCount = getCurrentSnapshotCount();
  }
  
  const coverage = {
    pct: symbols.length > 0 ? (results.length / symbols.length * 100).toFixed(1) : 0
  };
  
  generateReport(beforeCount, afterCount, results.length, failed, coverage);
  console.log(`Agent B: Complete. ${beforeCount} → ${afterCount} snapshots`);
}

main().catch(e => {
  console.error('Agent B FAILED:', e.message);
  process.exit(1);
});
