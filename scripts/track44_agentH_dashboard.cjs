/**
 * AGENT H — LIVE OPERATIONS DASHBOARD
 * 
 * Builds operational visibility. Single report showing:
 * - Provider Health: Yahoo Status, Screener Status
 * - Database Status: Rows per table, latest ingestion timestamp, failed symbols, coverage %
 * - Prediction Counts, Ranking Counts
 * 
 * This becomes the first screen you check every morning.
 * 
 * Produces: reports/track-44/08-LiveOperationsDashboard.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = process.env.TRACK44_REPORTS_DIR || path.join(ROOT, 'reports', 'track-44');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
const REPORT_PATH = path.join(REPORTS_DIR, '08-LiveOperationsDashboard.md');

function getDb() {
  const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
  if (!fs.existsSync(DB_PATH)) return null;
  const Database = require('better-sqlite3');
  return new Database(DB_PATH);
}

function getTableRowCounts(db) {
  const tables = [
    'daily_prices',
    'financial_snapshots',
    'prediction_registry',
    'master_security_registry',
    'daily_prediction_snapshots',
  ];
  
  const counts = {};
  for (const table of tables) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as cnt FROM "${table}"`).get();
      counts[table] = row ? row.cnt : 0;
    } catch (e) {
      counts[table] = `ERROR: ${e.message}`;
    }
  }
  return counts;
}

function getLatestIngestionTimestamp(db) {
  try {
    const row = db.prepare('SELECT MAX(trade_date) as latest FROM daily_prices').get();
    return row ? row.latest : 'N/A';
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

function getSymbolCoverage(db) {
  try {
    const total = db.prepare('SELECT COUNT(*) as cnt FROM master_security_registry WHERE listing_status = \'Active\'').get();
    const withPrices = db.prepare(`
      SELECT COUNT(DISTINCT symbol) as cnt FROM daily_prices
    `).get();
    const withFinancials = db.prepare(`
      SELECT COUNT(DISTINCT symbol) as cnt FROM financial_snapshots
    `).get();
    const withPredictions = db.prepare(`
      SELECT COUNT(DISTINCT symbol) as cnt FROM prediction_registry
    `).get();
    
    const totalCount = total ? total.cnt : 0;
    return {
      totalRegistered: totalCount,
      withPrices: withPrices ? withPrices.cnt : 0,
      withFinancials: withFinancials ? withFinancials.cnt : 0,
      withPredictions: withPredictions ? withPredictions.cnt : 0,
      priceCoveragePct: totalCount > 0 ? ((withPrices?.cnt || 0) / totalCount * 100).toFixed(1) : '0',
      financialCoveragePct: totalCount > 0 ? ((withFinancials?.cnt || 0) / totalCount * 100).toFixed(1) : '0',
      predictionCoveragePct: totalCount > 0 ? ((withPredictions?.cnt || 0) / totalCount * 100).toFixed(1) : '0',
    };
  } catch (e) {
    return { error: e.message };
  }
}

function getFailedSymbols(db) {
  try {
    // Symbols registered but without any price data
    const rows = db.prepare(`
      SELECT r.symbol, r.company_name
      FROM master_security_registry r
      WHERE r.listing_status = 'Active'
        AND r.symbol NOT IN (SELECT DISTINCT symbol FROM daily_prices)
      ORDER BY r.symbol
    `).all();
    return rows;
  } catch { return []; }
}

function getPredictionStats(db) {
  try {
    const total = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry').get();
    const validated = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE validation_status = \'validated\'').get();
    const pending = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE validation_status = \'pending\'').get();
    const byHorizon = db.prepare(`
      SELECT prediction_horizon, COUNT(*) as cnt 
      FROM prediction_registry 
      GROUP BY prediction_horizon
    `).all();
    const latestDate = db.prepare('SELECT MAX(prediction_date) as latest FROM prediction_registry').get();
    
    return {
      total: total?.cnt || 0,
      validated: validated?.cnt || 0,
      pending: pending?.cnt || 0,
      byHorizon,
      latestPrediction: latestDate?.latest || 'N/A',
    };
  } catch (e) { return { error: e.message }; }
}

function checkYahooProvider() {
  const YF_BRIDGE = path.join(ROOT, 'scripts', 'yfinance_bridge.py');
  if (!fs.existsSync(YF_BRIDGE)) {
    return { status: 'BRIDGE MISSING', details: 'yfinance_bridge.py not found' };
  }
  
  try {
    const result = execSync(`python "${YF_BRIDGE}" test`, {
      cwd: ROOT, timeout: 15000, encoding: 'utf-8'
    });
    return { status: 'ONLINE', details: result.trim().substring(0, 200) };
  } catch (e) {
    return { status: 'OFFLINE', details: e.message.substring(0, 200) };
  }
}

function checkScreenerProvider() {
  // Screener.in check — just verify network connectivity
  try {
    const https = require('https');
    return new Promise((resolve) => {
      const req = https.get('https://www.screener.in', { timeout: 10000 }, (res) => {
        resolve({ status: 'REACHABLE', details: `HTTP ${res.statusCode}` });
      });
      req.on('error', (e) => resolve({ status: 'UNREACHABLE', details: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', details: '10s timeout' }); });
    });
  } catch (e) {
    return Promise.resolve({ status: 'ERROR', details: e.message });
  }
}

function checkDatabaseFile() {
  const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
  if (!fs.existsSync(DB_PATH)) {
    return { exists: false, size: 0, sizeFormatted: '0 KB', lastModified: 'N/A' };
  }
  const stats = fs.statSync(DB_PATH);
  return {
    exists: true,
    size: stats.size,
    sizeFormatted: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
    lastModified: stats.mtime.toISOString(),
  };
}

async function generateReport() {
  console.log('Agent H: Live Operations Dashboard starting...');
  
  const db = getDb();
  const yahooStatus = checkYahooProvider();
  const screenerStatus = await checkScreenerProvider();
  const dbFile = checkDatabaseFile();
  
  let tableCounts = {};
  let latestIngestion = 'N/A';
  let coverage = {};
  let failedSymbols = [];
  let predictionStats = {};
  
  if (db) {
    tableCounts = getTableRowCounts(db);
    latestIngestion = getLatestIngestionTimestamp(db);
    coverage = getSymbolCoverage(db);
    failedSymbols = getFailedSymbols(db);
    predictionStats = getPredictionStats(db);
  }
  
  // Calculate totals
  const totalDataRows = Object.values(tableCounts).reduce((s, c) => typeof c === 'number' ? s + c : s, 0);
  
  const report = `# Live Operations Dashboard — TRACK-44 Agent H

**Generated:** ${new Date().toISOString()}
**Next Update:** Next morning check

---

## PROVIDER HEALTH

| Provider | Status | Details |
|----------|--------|---------|
| Yahoo Finance | ${yahooStatus.status === 'ONLINE' ? '🟢 ONLINE' : yahooStatus.status === 'OFFLINE' ? '🔴 OFFLINE' : '🟡 DEGRADED'} | ${yahooStatus.details} |
| Screener.in | ${screenerStatus.status === 'REACHABLE' ? '🟢 REACHABLE' : screenerStatus.status === 'TIMEOUT' ? '🟡 TIMEOUT' : '🔴 UNREACHABLE'} | ${screenerStatus.details} |
| SQLite Database | ${dbFile.exists ? '🟢 PRESENT' : '🔴 MISSING'} | ${dbFile.exists ? dbFile.sizeFormatted : 'N/A'} |

---

## DATABASE STATUS

| Table | Rows | Target | Status |
|-------|------|--------|--------|
| daily_prices | ${tableCounts.daily_prices ?? 'N/A'} | > 120,000 | ${(tableCounts.daily_prices || 0) > 120000 ? '✅ MET' : '⬜'} |
| financial_snapshots | ${tableCounts.financial_snapshots ?? 'N/A'} | > 500 | ${(tableCounts.financial_snapshots || 0) > 500 ? '✅ MET' : '⬜'} |
| prediction_registry | ${tableCounts.prediction_registry ?? 'N/A'} | > 1,000 | ${(tableCounts.prediction_registry || 0) > 1000 ? '✅ MET' : '⬜'} |
| master_security_registry | ${tableCounts.master_security_registry ?? 'N/A'} | 100+ | — |
| daily_prediction_snapshots | ${tableCounts.daily_prediction_snapshots ?? 'N/A'} | — | — |

**Total Data Rows:** ${totalDataRows.toLocaleString()}
**Database Size:** ${dbFile.sizeFormatted}
**Last Modified:** ${dbFile.lastModified}

---

## DATA FRESHNESS

| Metric | Value |
|--------|-------|
| Latest Daily Price | ${latestIngestion} |
| Days Since Last Price | ${latestIngestion !== 'N/A' ? computeDaysSince(latestIngestion) : 'N/A'} |
| Database Age | ${dbFile.lastModified} |

---

## COVERAGE

| Metric | Count | % |
|--------|-------|---|
| Registered Symbols | ${coverage.totalRegistered ?? 'N/A'} | 100% |
| With Price Data | ${coverage.withPrices ?? 'N/A'} | ${coverage.priceCoveragePct ?? '0'}% |
| With Financial Data | ${coverage.withFinancials ?? 'N/A'} | ${coverage.financialCoveragePct ?? '0'}% |
| With Predictions | ${coverage.withPredictions ?? 'N/A'} | ${coverage.predictionCoveragePct ?? '0'}% |

---

## FAILED SYMBOLS (no price data)

${failedSymbols.length > 0 ? failedSymbols.map(s => `- ${s.symbol} (${s.company_name || 'Unknown'})`).join('\n') : 'None — all registered symbols have price data ✅'}

${failedSymbols.length > 0 ? `\n**Total Failed:** ${failedSymbols.length}` : ''}

---

## PREDICTION STATS

| Metric | Value |
|--------|-------|
| Total Predictions | ${predictionStats.total ?? 'N/A'} |
| Validated | ${predictionStats.validated ?? 'N/A'} |
| Pending | ${predictionStats.pending ?? 'N/A'} |
| Latest Prediction Date | ${predictionStats.latestPrediction ?? 'N/A'} |

${predictionStats.byHorizon ? `### By Horizon\n\n| Horizon (days) | Count |\n|---------------|-------|\n${predictionStats.byHorizon.map(h => `| ${h.prediction_horizon} | ${h.cnt} |`).join('\n')}` : ''}

---

## MORNING CHECKLIST

- [ ] Provider Health: Yahoo ${yahooStatus.status === 'ONLINE' ? '✅' : '❌'} | Screener ${screenerStatus.status === 'REACHABLE' ? '✅' : '❌'}
- [ ] Database: ${dbFile.exists ? '✅ ' + dbFile.sizeFormatted : '❌'}
- [ ] Daily Prices: ${(tableCounts.daily_prices || 0) > 120000 ? '✅' : '⚠'} ${tableCounts.daily_prices?.toLocaleString() ?? 'N/A'} rows
- [ ] Financials: ${(tableCounts.financial_snapshots || 0) > 500 ? '✅' : '⚠'} ${tableCounts.financial_snapshots ?? 'N/A'} snapshots
- [ ] Predictions: ${(tableCounts.prediction_registry || 0) > 1000 ? '✅' : '⚠'} ${tableCounts.prediction_registry ?? 'N/A'} predictions
- [ ] Data Freshness: ${latestIngestion} ${latestIngestion !== 'N/A' ? (computeDaysSince(latestIngestion) <= 2 ? '✅' : '⚠') : ''}
- [ ] Failed Symbols: ${failedSymbols.length} ${failedSymbols.length === 0 ? '✅' : '⚠'}

---

## ALERTS

${yahooStatus.status !== 'ONLINE' ? '🔴 **YAHOO OFFLINE** — Data refresh will fail. Check yfinance_bridge.py.\n' : ''}
${screenerStatus.status !== 'REACHABLE' ? '🔴 **SCREENER UNREACHABLE** — Fundamental expansion will fail.\n' : ''}
${!dbFile.exists ? '🔴 **DATABASE MISSING** — Critical failure.\n' : ''}
${(tableCounts.daily_prices || 0) < 120000 ? '⚠ Daily prices below target (120K). Run Agent C expansion.\n' : ''}
${(tableCounts.financial_snapshots || 0) < 500 ? '⚠ Financial snapshots below target (500). Run Agent B expansion.\n' : ''}
${(tableCounts.prediction_registry || 0) < 1000 ? '⚠ Predictions below target (1K). Run Agent E backfill.\n' : ''}
${(tableCounts.daily_prices || 0) >= 120000 && (tableCounts.financial_snapshots || 0) >= 500 && (tableCounts.prediction_registry || 0) >= 1000 ? '✅ All numeric targets met!\n' : ''}
${yahooStatus.status === 'ONLINE' && screenerStatus.status === 'REACHABLE' && dbFile.exists ? '✅ All systems operational.\n' : ''}
`;
  
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`Agent H: Report written to ${REPORT_PATH}`);
  
  if (db) db.close();
}

function computeDaysSince(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  } catch { return 'N/A'; }
}

async function main() {
  await generateReport();
  console.log('Agent H: Complete.');
}

main().catch(e => {
  console.error('Agent H FAILED:', e.message);
  process.exit(1);
});
