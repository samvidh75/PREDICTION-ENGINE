/**
 * V5 AGENT 5 — OPERATIONS COMMAND CENTRE DASHBOARD
 * 
 * Generates a comprehensive operations report covering:
 * - Provider Health: Yahoo (yfinance_bridge.py existence + test), Screener (HTTP check)
 * - Database: rows per table
 * - Data Freshness: latest trade_date from daily_prices, days since last update
 * - Prediction Stats: total, validated, pending, by horizon
 * - Coverage: symbols with prices, financials, predictions
 * - Failed symbols: registered but no price data
 * - Morning checklist with checkboxes
 * 
 * Produces:
 *   - reports/v5/05-OperationsCommandCentre.md
 *   - reports/v5/dashboard.html (cartoon brutalist styled HTML)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
const REPORTS_DIR = path.join(ROOT, 'reports', 'v5');

if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const REPORT_MD_PATH = path.join(REPORTS_DIR, '05-OperationsCommandCentre.md');
const REPORT_HTML_PATH = path.join(REPORTS_DIR, 'dashboard.html');

// =============================================================================
// DB HELPERS
// =============================================================================

function getDb() {
  if (!fs.existsSync(DB_PATH)) return null;
  const Database = require('better-sqlite3');
  return new Database(DB_PATH);
}

function get1(db, sql, ...params) {
  try { return db.prepare(sql).get(...params) || null; } catch { return null; }
}

function getAll(db, sql, ...params) {
  try { return db.prepare(sql).all(...params) || []; } catch { return []; }
}

function safeCount(db, table) {
  try {
    const r = db.prepare('SELECT COUNT(*) as cnt FROM "' + table + '"').get();
    return r ? r.cnt : 0;
  } catch { return -1; }
}

function computeDaysSince(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  } catch { return null; }
}

// =============================================================================
// PROVIDER CHECKS
// =============================================================================

function checkYahooProvider() {
  const YF_BRIDGE = path.join(ROOT, 'scripts', 'yfinance_bridge.py');
  const bridgeExists = fs.existsSync(YF_BRIDGE);

  if (!bridgeExists) {
    return { status: 'MISSING', emoji: '🔴', details: 'yfinance_bridge.py not found at ' + YF_BRIDGE };
  }

  try {
    const result = execSync('python "' + YF_BRIDGE + '" test', {
      cwd: ROOT, timeout: 15000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']
    });
    return { status: 'ONLINE', emoji: '🟢', details: result.trim().substring(0, 200) || 'Bridge responded (no data)' };
  } catch (e) {
    const stderr = (e.stderr || e.message || '').toString();
    return { status: 'OFFLINE', emoji: '🔴', details: stderr.substring(0, 200) };
  }
}

function checkScreenerProvider() {
  return new Promise((resolve) => {
    try {
      const req = https.get('https://www.screener.in', { timeout: 12000 }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          resolve({ status: 'REACHABLE', emoji: '🟢', details: 'HTTP ' + res.statusCode, bodySnippet: body.substring(0, 100) });
        });
      });
      req.on('error', (e) => resolve({ status: 'UNREACHABLE', emoji: '🔴', details: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', emoji: '🟡', details: '12s timeout' }); });
    } catch (e) {
      resolve({ status: 'ERROR', emoji: '🔴', details: e.message });
    }
  });
}

// =============================================================================
// DATA COLLECTION
// =============================================================================

function collectData(db) {
  const data = {};

  // --- Table row counts ---
  const tables = [
    'daily_prices',
    'financial_snapshots',
    'prediction_registry',
    'prediction_outcomes',
    'factor_scores_v3',
    'data_quality_registry',
    'master_security_registry'
  ];
  data.tableCounts = {};
  for (const t of tables) {
    data.tableCounts[t] = safeCount(db, t);
  }

  // --- Data freshness ---
  const latestPrice = get1(db, 'SELECT MAX(trade_date) as latest FROM daily_prices');
  data.latestTradeDate = latestPrice ? latestPrice.latest : null;
  data.daysSinceLastUpdate = data.latestTradeDate ? computeDaysSince(data.latestTradeDate) : null;

  const priceDateRange = get1(db, 'SELECT MIN(trade_date) as mn, MAX(trade_date) as mx, COUNT(DISTINCT trade_date) as days, COUNT(DISTINCT symbol) as symbols FROM daily_prices');
  data.priceDateRange = priceDateRange || { mn: null, mx: null, days: 0, symbols: 0 };

  // --- Prediction stats ---
  data.predTotal = safeCount(db, 'prediction_registry');
  const vStatus = getAll(db, "SELECT validation_status, COUNT(*) as cnt FROM prediction_registry GROUP BY validation_status");
  data.predStatuses = {};
  for (const s of vStatus) data.predStatuses[s.validation_status] = s.cnt;
  data.predByHorizon = getAll(db, "SELECT prediction_horizon, COUNT(*) as cnt FROM prediction_registry GROUP BY prediction_horizon ORDER BY prediction_horizon");
  const predLatest = get1(db, 'SELECT MAX(prediction_date) as latest FROM prediction_registry');
  data.predLatestDate = predLatest ? predLatest.latest : null;

  // --- Coverage ---
  const totalReg = get1(db, "SELECT COUNT(*) as cnt FROM master_security_registry WHERE listing_status = 'Active'");
  const totalRegAll = get1(db, "SELECT COUNT(*) as cnt FROM master_security_registry");
  data.totalRegistered = totalReg ? totalReg.cnt : (totalRegAll ? totalRegAll.cnt : 0);
  data.symbolsWithPrices = get1(db, 'SELECT COUNT(DISTINCT symbol) as cnt FROM daily_prices');
  data.symbolsWithPrices = data.symbolsWithPrices ? data.symbolsWithPrices.cnt : 0;
  const symFin = get1(db, 'SELECT COUNT(DISTINCT symbol) as cnt FROM financial_snapshots');
  data.symbolsWithFinancials = symFin ? symFin.cnt : 0;
  const symPred = get1(db, 'SELECT COUNT(DISTINCT symbol) as cnt FROM prediction_registry');
  data.symbolsWithPredictions = symPred ? symPred.cnt : 0;

  // --- Failed symbols (registered but no price data) ---
  data.failedSymbols = getAll(db, `
    SELECT r.symbol, r.company_name
    FROM master_security_registry r
    WHERE r.symbol NOT IN (SELECT DISTINCT symbol FROM daily_prices)
    ORDER BY r.symbol
  `);

  // --- DB file info ---
  if (fs.existsSync(DB_PATH)) {
    const st = fs.statSync(DB_PATH);
    data.dbSizeMB = (st.size / (1024 * 1024)).toFixed(2);
    data.dbLastModified = st.mtime.toISOString();
  } else {
    data.dbSizeMB = '0';
    data.dbLastModified = 'N/A';
  }

  return data;
}

// =============================================================================
// MARKDOWN REPORT
// =============================================================================

function generateMarkdown(yahoo, screener, data) {
  const genTime = new Date().toISOString();
  const totalRows = Object.values(data.tableCounts).reduce((s, c) => (c > 0 ? s + c : s), 0);

  let md = '';
  md += '# OPERATIONS COMMAND CENTRE — V5\n\n';
  md += `**Generated:** ${genTime}  \n`;
  md += `**Next Update:** Next morning check  \n`;
  md += `**Report ID:** 05-OperationsCommandCentre  \n\n`;
  md += '---\n\n';

  // --- PROVIDER HEALTH ---
  md += '## 🏥 PROVIDER HEALTH\n\n';
  md += '| Provider | Status | Details |\n';
  md += '|----------|--------|----------|\n';
  md += `| Yahoo Finance (yfinance_bridge.py) | ${yahoo.emoji} ${yahoo.status} | ${escapeMd(yahoo.details)} |\n`;
  md += `| Screener.in | ${screener.emoji} ${screener.status} | ${escapeMd(screener.details)} |\n`;
  md += `| SQLite Database | ${fs.existsSync(DB_PATH) ? '🟢 PRESENT' : '🔴 MISSING'} | ${data.dbSizeMB} MB, modified ${data.dbLastModified} |\n`;
  md += '\n---\n\n';

  // --- DATABASE STATUS ---
  md += '## 🗄️ DATABASE STATUS\n\n';
  md += '| Table | Rows |\n';
  md += '|-------|------|\n';
  for (const [table, cnt] of Object.entries(data.tableCounts)) {
    const display = cnt === -1 ? 'TABLE MISSING' : cnt.toLocaleString();
    md += `| \`${table}\` | ${display} |\n`;
  }
  md += '\n';
  md += `**Total Data Rows:** ${totalRows.toLocaleString()}  \n`;
  md += `**Database Size:** ${data.dbSizeMB} MB  \n`;
  md += `**Database Last Modified:** ${data.dbLastModified}  \n`;
  md += '\n---\n\n';

  // --- DATA FRESHNESS ---
  md += '## 📅 DATA FRESHNESS\n\n';
  md += '| Metric | Value |\n';
  md += '|--------|-------|\n';
  md += `| Latest Trade Date (daily_prices) | ${data.latestTradeDate || 'N/A'} |\n`;
  md += `| Days Since Last Price Update | ${data.daysSinceLastUpdate !== null ? data.daysSinceLastUpdate + ' days' : 'N/A'} |\n`;
  md += `| Earliest Trade Date | ${data.priceDateRange.mn || 'N/A'} |\n`;
  md += `| Unique Trading Days | ${data.priceDateRange.days ? data.priceDateRange.days.toLocaleString() : 'N/A'} |\n`;
  md += '\n---\n\n';

  // --- PREDICTION STATS ---
  md += '## 📊 PREDICTION STATS\n\n';
  md += '| Metric | Value |\n';
  md += '|--------|-------|\n';
  md += `| Total Predictions | ${data.predTotal.toLocaleString()} |\n`;

  const validated = data.predStatuses['validated'] || 0;
  const pending = data.predStatuses['pending'] || 0;
  const failed = data.predStatuses['failed'] || 0;
  const other = Object.entries(data.predStatuses)
    .filter(([k]) => !['validated', 'pending', 'failed'].includes(k))
    .reduce((s, [, v]) => s + v, 0);

  md += `| Validated | ${validated.toLocaleString()} |\n`;
  md += `| Pending | ${pending.toLocaleString()} |\n`;
  md += `| Failed | ${failed.toLocaleString()} |\n`;
  if (other > 0) md += `| Other | ${other.toLocaleString()} |\n`;
  md += `| Latest Prediction Date | ${data.predLatestDate || 'N/A'} |\n`;
  md += '\n';

  if (data.predByHorizon.length > 0) {
    md += '### By Prediction Horizon\n\n';
    md += '| Horizon (days) | Count |\n';
    md += '|----------------|-------|\n';
    for (const h of data.predByHorizon) {
      md += `| ${h.prediction_horizon} | ${h.cnt.toLocaleString()} |\n`;
    }
    md += '\n';
  }
  md += '---\n\n';

  // --- COVERAGE ---
  md += '## 📈 COVERAGE\n\n';
  md += '| Metric | Count | % of Registered |\n';
  md += '|--------|-------|-----------------|\n';
  const reg = data.totalRegistered || 1;
  md += `| Registered Symbols (Active) | ${data.totalRegistered} | 100% |\n`;
  md += `| With Price Data | ${data.symbolsWithPrices} | ${((data.symbolsWithPrices / reg) * 100).toFixed(1)}% |\n`;
  md += `| With Financial Data | ${data.symbolsWithFinancials} | ${((data.symbolsWithFinancials / reg) * 100).toFixed(1)}% |\n`;
  md += `| With Predictions | ${data.symbolsWithPredictions} | ${((data.symbolsWithPredictions / reg) * 100).toFixed(1)}% |\n`;
  md += '\n---\n\n';

  // --- FAILED SYMBOLS ---
  md += '## ⚠️ FAILED SYMBOLS (registered but no price data)\n\n';
  if (data.failedSymbols.length === 0) {
    md += '**None — all registered symbols have price data** ✅\n\n';
  } else {
    md += '| Symbol | Company |\n';
    md += '|--------|----------|\n';
    for (const s of data.failedSymbols) {
      md += `| ${s.symbol} | ${s.company_name || 'Unknown'} |\n`;
    }
    md += `\n**Total Failed:** ${data.failedSymbols.length}\n\n`;
  }
  md += '---\n\n';

  // --- MORNING CHECKLIST ---
  md += '## ☀️ MORNING CHECKLIST\n\n';

  const yahooOk = yahoo.status === 'ONLINE';
  const screenerOk = screener.status === 'REACHABLE';
  const dbOk = fs.existsSync(DB_PATH);
  const pricesFresh = data.daysSinceLastUpdate !== null && data.daysSinceLastUpdate <= 2;
  const noFailed = data.failedSymbols.length === 0;

  md += `- [ ] Yahoo Finance Provider: ${yahooOk ? '✅ ONLINE' : '❌ ' + yahoo.status}\n`;
  md += `- [ ] Screener.in Provider: ${screenerOk ? '✅ REACHABLE' : '❌ ' + screener.status}\n`;
  md += `- [ ] Database File: ${dbOk ? '✅ Present (' + data.dbSizeMB + ' MB)' : '❌ MISSING'}\n`;
  md += `- [ ] Daily Prices Table: ${(data.tableCounts.daily_prices || 0) > 0 ? '✅ ' + data.tableCounts.daily_prices.toLocaleString() + ' rows' : '❌ EMPTY'}\n`;
  md += `- [ ] Financial Snapshots: ${(data.tableCounts.financial_snapshots || 0) > 0 ? '✅ ' + data.tableCounts.financial_snapshots.toLocaleString() + ' rows' : '⚠ ' + (data.tableCounts.financial_snapshots === -1 ? 'TABLE MISSING' : '0 rows')}\n`;
  md += `- [ ] Prediction Registry: ${data.predTotal > 0 ? '✅ ' + data.predTotal.toLocaleString() + ' predictions' : '⚠ 0 predictions'}\n`;
  md += `- [ ] Data Freshness: ${pricesFresh ? '✅ ' + data.latestTradeDate : '⚠ ' + (data.latestTradeDate || 'N/A') + ' (' + (data.daysSinceLastUpdate !== null ? data.daysSinceLastUpdate + ' days ago' : 'N/A') + ')'}\n`;
  md += `- [ ] Failed Symbols: ${noFailed ? '✅ None' : '⚠ ' + data.failedSymbols.length + ' symbols'}\n`;
  md += `- [ ] All Systems Operational: ${yahooOk && screenerOk && dbOk && pricesFresh ? '✅ YES' : '⚠ ISSUES DETECTED'}\n`;
  md += '\n---\n\n';

  // --- ALERTS ---
  md += '## 🚨 ALERTS\n\n';
  if (!yahooOk) md += '- 🔴 **YAHOO OFFLINE** — Price data refresh will fail. Check `yfinance_bridge.py`.\n';
  if (!screenerOk) md += '- 🔴 **SCREENER UNREACHABLE** — Fundamental expansion blocked.\n';
  if (!dbOk) md += '- 🔴 **DATABASE MISSING** — Critical failure. Run data population scripts.\n';
  if ((data.tableCounts.daily_prices || 0) <= 0) md += '- ⚠ `daily_prices` table is empty. Run price ingestion.\n';
  if (data.tableCounts.financial_snapshots === -1) md += '- ⚠ `financial_snapshots` table does not exist. Run migration.\n';
  if (data.tableCounts.prediction_registry <= 0) md += '- ⚠ `prediction_registry` is empty. Run prediction backfill.\n';
  if (data.tableCounts.factor_scores_v3 === -1) md += '- ⚠ `factor_scores_v3` table does not exist. Run factor computation (Agent 3).\n';
  if (data.tableCounts.data_quality_registry === -1) md += '- ⚠ `data_quality_registry` table does not exist. Run data truth agent (Agent 1).\n';
  if (data.tableCounts.prediction_outcomes === -1) md += '- ⚠ `prediction_outcomes` table does not exist. Run prediction truth agent (Agent 2).\n';
  md += '\n';
  if (yahooOk && screenerOk && dbOk && pricesFresh && noFailed && data.predTotal > 0) {
    md += '✅ **ALL SYSTEMS GREEN — No alerts.**\n\n';
  }
  md += '---\n\n';
  md += `*Report generated by v5_agent5_dashboard.cjs at ${genTime}*  \n`;
  md += `*StockStory India V5 — Financial Intelligence Platform*  \n`;

  return md;
}

function escapeMd(s) {
  return String(s).replace(/[|*_`]/g, '\\$&');
}

// =============================================================================
// HTML DASHBOARD (Cartoon Brutalist)
// =============================================================================

function generateHTML(yahoo, screener, data) {
  const genTime = new Date().toISOString();
  const yahooOk = yahoo.status === 'ONLINE';
  const screenerOk = screener.status === 'REACHABLE';
  const dbOk = fs.existsSync(DB_PATH);
  const pricesFresh = data.daysSinceLastUpdate !== null && data.daysSinceLastUpdate <= 2;
  const reg = data.totalRegistered || 1;
  const validated = data.predStatuses['validated'] || 0;
  const pending = data.predStatuses['pending'] || 0;

  const statusBadge = (ok, label) => ok
    ? '<span class="badge badge-green">' + label + '</span>'
    : '<span class="badge badge-red">' + label + '</span>';

  const tableRow = (tableName, cnt) => {
    const display = cnt === -1 ? 'MISSING' : Number(cnt).toLocaleString();
    const cls = cnt === -1 ? 'status-bad' : cnt === 0 ? 'status-warn' : 'status-good';
    return '<tr><td><code>' + tableName + '</code></td><td class="' + cls + '">' + display + '</td></tr>';
  };

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StockStory V5 — Operations Command Centre</title>
  <style>
    /* === CARTOON BRUTALIST DESIGN === */
    @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Space+Mono:wght@400;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Space Mono', 'Courier New', monospace;
      background: #FFFBE6;
      color: #111;
      padding: 20px;
      min-height: 100vh;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
    }

    /* === HEADER === */
    .header {
      background: #FFE600;
      border: 5px solid #000;
      padding: 30px 40px;
      margin-bottom: 25px;
      box-shadow: 10px 10px 0 #000;
      text-align: center;
    }
    .header h1 {
      font-family: 'Fredoka One', cursive;
      font-size: 3rem;
      line-height: 1.1;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #000;
    }
    .header .subtitle {
      font-size: 0.9rem;
      margin-top: 8px;
      color: #333;
    }
    .header .gen-time {
      font-size: 0.75rem;
      color: #555;
      margin-top: 10px;
    }

    /* === CARDS (Brutalist) === */
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      margin-bottom: 25px;
    }
    .grid-3 { grid-template-columns: 1fr 1fr 1fr; }

    .card {
      background: #FFF;
      border: 4px solid #000;
      padding: 24px;
      box-shadow: 8px 8px 0 #000;
      transition: box-shadow 0.15s;
    }
    .card:hover { box-shadow: 12px 12px 0 #000; }
    .card h2 {
      font-family: 'Fredoka One', cursive;
      font-size: 1.4rem;
      text-transform: uppercase;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 3px solid #000;
      letter-spacing: 1px;
    }
    .card-full {
      grid-column: 1 / -1;
    }

    /* === TABLES === */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    th {
      background: #000;
      color: #FFF;
      padding: 10px 14px;
      text-align: left;
      font-family: 'Fredoka One', cursive;
      font-weight: normal;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 0.8rem;
    }
    td {
      padding: 10px 14px;
      border-bottom: 2px solid #000;
    }
    tr:last-child td { border-bottom: 3px solid #000; }
    tr:nth-child(even) td { background: #FFF9C4; }

    /* === BADGES === */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border: 3px solid #000;
      font-size: 0.8rem;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-green { background: #00E676; color: #000; }
    .badge-red { background: #FF1744; color: #FFF; }
    .badge-yellow { background: #FFEA00; color: #000; }

    .status-good { color: #1B5E20; font-weight: bold; }
    .status-warn { color: #E65100; font-weight: bold; }
    .status-bad { color: #B71C1C; font-weight: bold; }

    /* === CHECKLIST === */
    .checklist { list-style: none; }
    .checklist li {
      padding: 10px 14px;
      margin-bottom: 8px;
      border: 3px solid #000;
      background: #FFF;
      font-size: 0.85rem;
    }
    .checklist .check-ok { background: #C8E6C9; }
    .checklist .check-warn { background: #FFF9C4; }
    .checklist .check-bad { background: #FFCDD2; }
    .checklist .icon { margin-right: 10px; font-size: 1.2rem; }

    /* === ALERTS === */
    .alert-box {
      background: #FFCDD2;
      border: 4px solid #B71C1C;
      padding: 16px 20px;
      margin-top: 10px;
    }
    .alert-box.green {
      background: #C8E6C9;
      border-color: #1B5E20;
    }
    .alert-item { padding: 6px 0; font-weight: bold; }

    /* === METRIC HIGHLIGHTS === */
    .metric-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .metric-chip {
      background: #000;
      color: #FFF;
      padding: 8px 16px;
      border: 3px solid #000;
      font-size: 0.85rem;
    }
    .metric-chip .num {
      font-family: 'Fredoka One', cursive;
      font-size: 1.6rem;
      display: block;
      line-height: 1;
    }

    /* === RESPONSIVE === */
    @media (max-width: 768px) {
      .grid, .grid-3 { grid-template-columns: 1fr; }
      .header h1 { font-size: 2rem; }
    }

    /* === FOOTER === */
    .footer {
      margin-top: 30px;
      padding: 20px;
      text-align: center;
      border-top: 3px dashed #000;
      font-size: 0.75rem;
      color: #555;
    }

    code {
      background: #EEE;
      padding: 2px 6px;
      border: 1px solid #999;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- HEADER -->
    <div class="header">
      <h1>📡 Operations<br>Command Centre</h1>
      <div class="subtitle">StockStory India V5 — Morning Dashboard</div>
      <div class="gen-time">Generated: ${genTime}</div>
    </div>

    <!-- PROVIDER HEALTH -->
    <div class="grid">
      <div class="card">
        <h2>🏥 Provider Health</h2>
        <table>
          <tr><th>Provider</th><th>Status</th></tr>
          <tr>
            <td>Yahoo Finance</td>
            <td>${statusBadge(yahooOk, yahoo.status)}</td>
          </tr>
          <tr>
            <td>Screener.in</td>
            <td>${statusBadge(screenerOk, screener.status)}</td>
          </tr>
          <tr>
            <td>SQLite DB</td>
            <td>${statusBadge(dbOk, dbOk ? data.dbSizeMB + ' MB' : 'MISSING')}</td>
          </tr>
        </table>
      </div>

      <!-- DATA FRESHNESS -->
      <div class="card">
        <h2>📅 Data Freshness</h2>
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Latest Trade Date</td><td>${data.latestTradeDate || 'N/A'}</td></tr>
          <tr><td>Days Since Update</td><td class="${pricesFresh ? 'status-good' : 'status-warn'}">${data.daysSinceLastUpdate !== null ? data.daysSinceLastUpdate + ' days' : 'N/A'}</td></tr>
          <tr><td>Earliest Trade Date</td><td>${data.priceDateRange.mn || 'N/A'}</td></tr>
          <tr><td>Unique Trading Days</td><td>${data.priceDateRange.days ? data.priceDateRange.days.toLocaleString() : 'N/A'}</td></tr>
        </table>
      </div>
    </div>

    <!-- DATABASE STATUS -->
    <div class="card card-full">
      <h2>🗄️ Database Status</h2>
      <table>
        <tr><th>Table</th><th>Rows</th></tr>
        ${Object.entries(data.tableCounts).map(([t, c]) => tableRow(t, c)).join('\n        ')}
      </table>
      <div style="margin-top:16px;font-size:0.85rem;">
        <strong>Total Data Rows:</strong> ${Object.values(data.tableCounts).reduce((s, c) => (c > 0 ? s + c : s), 0).toLocaleString()}
        &nbsp;|&nbsp;
        <strong>DB Size:</strong> ${data.dbSizeMB} MB
        &nbsp;|&nbsp;
        <strong>Last Modified:</strong> ${data.dbLastModified}
      </div>
    </div>

    <!-- PREDICTION STATS + COVERAGE -->
    <div class="grid">
      <div class="card">
        <h2>📊 Prediction Stats</h2>
        <div class="metric-row" style="margin-bottom:16px;">
          <div class="metric-chip"><span class="num">${data.predTotal.toLocaleString()}</span> Total</div>
          <div class="metric-chip"><span class="num">${validated.toLocaleString()}</span> Validated</div>
          <div class="metric-chip"><span class="num">${pending.toLocaleString()}</span> Pending</div>
        </div>
        ${data.predLatestDate ? '<p style="font-size:0.8rem;">Latest Prediction: <strong>' + data.predLatestDate + '</strong></p>' : ''}
        ${data.predByHorizon.length > 0 ? `
        <table style="margin-top:12px;">
          <tr><th>Horizon (days)</th><th>Count</th></tr>
          ${data.predByHorizon.map(h => '<tr><td>' + h.prediction_horizon + '</td><td>' + h.cnt.toLocaleString() + '</td></tr>').join('\n          ')}
        </table>` : ''}
      </div>

      <div class="card">
        <h2>📈 Coverage</h2>
        <table>
          <tr><th>Metric</th><th>Count</th><th>%</th></tr>
          <tr><td>Registered Symbols</td><td>${data.totalRegistered}</td><td>100%</td></tr>
          <tr><td>With Price Data</td><td>${data.symbolsWithPrices}</td><td>${((data.symbolsWithPrices / reg) * 100).toFixed(1)}%</td></tr>
          <tr><td>With Financial Data</td><td>${data.symbolsWithFinancials}</td><td>${((data.symbolsWithFinancials / reg) * 100).toFixed(1)}%</td></tr>
          <tr><td>With Predictions</td><td>${data.symbolsWithPredictions}</td><td>${((data.symbolsWithPredictions / reg) * 100).toFixed(1)}%</td></tr>
        </table>
      </div>
    </div>

    <!-- FAILED SYMBOLS -->
    <div class="card card-full">
      <h2>⚠️ Failed Symbols (no price data)</h2>
      ${data.failedSymbols.length === 0
        ? '<p style="font-size:1rem;">✅ <strong>None — all registered symbols have price data</strong></p>'
        : `<p style="margin-bottom:12px;"><strong>${data.failedSymbols.length} symbols</strong> registered but missing price data:</p>
        <table>
          <tr><th>Symbol</th><th>Company</th></tr>
          ${data.failedSymbols.map(s => '<tr><td>' + s.symbol + '</td><td>' + (s.company_name || 'Unknown') + '</td></tr>').join('\n          ')}
        </table>`
      }
    </div>

    <!-- MORNING CHECKLIST -->
    <div class="card card-full">
      <h2>☀️ Morning Checklist</h2>
      <ul class="checklist">
        <li class="${yahooOk ? 'check-ok' : 'check-bad'}"><span class="icon">${yahooOk ? '✅' : '❌'}</span> Yahoo Finance Provider: ${yahoo.status}</li>
        <li class="${screenerOk ? 'check-ok' : 'check-bad'}"><span class="icon">${screenerOk ? '✅' : '❌'}</span> Screener.in: ${screener.status}</li>
        <li class="${dbOk ? 'check-ok' : 'check-bad'}"><span class="icon">${dbOk ? '✅' : '❌'}</span> Database File: ${dbOk ? data.dbSizeMB + ' MB' : 'MISSING'}</li>
        <li class="${(data.tableCounts.daily_prices || 0) > 0 ? 'check-ok' : 'check-bad'}"><span class="icon">${(data.tableCounts.daily_prices || 0) > 0 ? '✅' : '❌'}</span> Daily Prices: ${data.tableCounts.daily_prices > 0 ? data.tableCounts.daily_prices.toLocaleString() + ' rows' : 'EMPTY'}</li>
        <li class="${(data.tableCounts.financial_snapshots || 0) > 0 ? 'check-ok' : 'check-warn'}"><span class="icon">${(data.tableCounts.financial_snapshots || 0) > 0 ? '✅' : '⚠'}</span> Financial Snapshots: ${data.tableCounts.financial_snapshots === -1 ? 'TABLE MISSING' : data.tableCounts.financial_snapshots.toLocaleString() + ' rows'}</li>
        <li class="${data.predTotal > 0 ? 'check-ok' : 'check-warn'}"><span class="icon">${data.predTotal > 0 ? '✅' : '⚠'}</span> Prediction Registry: ${data.predTotal.toLocaleString()} predictions</li>
        <li class="${pricesFresh ? 'check-ok' : 'check-warn'}"><span class="icon">${pricesFresh ? '✅' : '⚠'}</span> Data Freshness: ${data.latestTradeDate || 'N/A'} (${data.daysSinceLastUpdate !== null ? data.daysSinceLastUpdate + ' days' : 'N/A'})</li>
        <li class="${data.failedSymbols.length === 0 ? 'check-ok' : 'check-warn'}"><span class="icon">${data.failedSymbols.length === 0 ? '✅' : '⚠'}</span> Failed Symbols: ${data.failedSymbols.length}</li>
      </ul>
    </div>

    <!-- ALERTS -->
    ${!yahooOk || !screenerOk || !dbOk || !pricesFresh || data.failedSymbols.length > 0 || data.predTotal === 0
      ? `<div class="alert-box">
          <strong>🚨 ALERTS</strong>
          ${!yahooOk ? '<div class="alert-item">🔴 Yahoo Finance OFFLINE — Check yfinance_bridge.py</div>' : ''}
          ${!screenerOk ? '<div class="alert-item">🔴 Screener.in UNREACHABLE — Fundamental expansion blocked</div>' : ''}
          ${!dbOk ? '<div class="alert-item">🔴 Database MISSING — Critical failure</div>' : ''}
          ${(data.tableCounts.daily_prices || 0) <= 0 ? '<div class="alert-item">⚠ daily_prices is empty</div>' : ''}
          ${data.tableCounts.financial_snapshots === -1 ? '<div class="alert-item">⚠ financial_snapshots table does not exist</div>' : ''}
          ${data.tableCounts.factor_scores_v3 === -1 ? '<div class="alert-item">⚠ factor_scores_v3 table does not exist</div>' : ''}
          ${data.tableCounts.data_quality_registry === -1 ? '<div class="alert-item">⚠ data_quality_registry table does not exist</div>' : ''}
          ${data.tableCounts.prediction_outcomes === -1 ? '<div class="alert-item">⚠ prediction_outcomes table does not exist</div>' : ''}
          ${data.tableCounts.prediction_registry <= 0 ? '<div class="alert-item">⚠ prediction_registry is empty</div>' : ''}
          ${data.failedSymbols.length > 0 ? '<div class="alert-item">⚠ ' + data.failedSymbols.length + ' symbols without price data</div>' : ''}
        </div>`
      : `<div class="alert-box green">
          <strong>✅ ALL SYSTEMS GREEN</strong>
          <div class="alert-item">No alerts — everything is operational.</div>
        </div>`
    }

    <!-- FOOTER -->
    <div class="footer">
      StockStory India V5 — Financial Intelligence Platform<br>
      Report generated by v5_agent5_dashboard.cjs at ${genTime}
    </div>

  </div>
</body>
</html>`;

  return html;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('=== V5 AGENT 5: OPERATIONS COMMAND CENTRE DASHBOARD ===\n');

  // 1. Provider health checks
  console.log('[1/5] Checking provider health...');
  const yahoo = checkYahooProvider();
  console.log('  Yahoo:', yahoo.status, '-', yahoo.details.substring(0, 80));
  const screener = await checkScreenerProvider();
  console.log('  Screener:', screener.status, '-', screener.details);

  // 2. Database connection
  console.log('\n[2/5] Connecting to database...');
  const db = getDb();
  if (!db) {
    console.log('  DATABASE NOT FOUND at', DB_PATH);
    // Generate a minimal report even without DB
    const data = {
      tableCounts: {},
      latestTradeDate: null,
      daysSinceLastUpdate: null,
      priceDateRange: { mn: null, mx: null, days: 0, symbols: 0 },
      predTotal: 0,
      predStatuses: {},
      predByHorizon: [],
      predLatestDate: null,
      totalRegistered: 0,
      symbolsWithPrices: 0,
      symbolsWithFinancials: 0,
      symbolsWithPredictions: 0,
      failedSymbols: [],
      dbSizeMB: '0',
      dbLastModified: 'N/A'
    };
    ['daily_prices','financial_snapshots','prediction_registry','prediction_outcomes','factor_scores_v3','data_quality_registry','master_security_registry'].forEach(t => data.tableCounts[t] = -1);

    const md = generateMarkdown(yahoo, screener, data);
    fs.writeFileSync(REPORT_MD_PATH, md, 'utf-8');
    console.log('[3/5] Markdown report written to', REPORT_MD_PATH);

    const html = generateHTML(yahoo, screener, data);
    fs.writeFileSync(REPORT_HTML_PATH, html, 'utf-8');
    console.log('[5/5] HTML dashboard written to', REPORT_HTML_PATH);

    console.log('\n=== V5 AGENT 5 COMPLETE (degraded — no database) ===');
    return;
  }

  console.log('  Database connected successfully.');

  // 3. Collect data
  console.log('\n[3/5] Collecting data from database...');
  const data = collectData(db);
  console.log('  Tables checked:', Object.keys(data.tableCounts).length);
  console.log('  Latest trade date:', data.latestTradeDate);
  console.log('  Total predictions:', data.predTotal);
  console.log('  Failed symbols:', data.failedSymbols.length);

  // 4. Generate Markdown
  console.log('\n[4/5] Generating Markdown report...');
  const md = generateMarkdown(yahoo, screener, data);
  fs.writeFileSync(REPORT_MD_PATH, md, 'utf-8');
  console.log('  Written to', REPORT_MD_PATH);

  // 5. Generate HTML
  console.log('\n[5/5] Generating HTML dashboard...');
  const html = generateHTML(yahoo, screener, data);
  fs.writeFileSync(REPORT_HTML_PATH, html, 'utf-8');
  console.log('  Written to', REPORT_HTML_PATH);

  db.close();
  console.log('\n=== V5 AGENT 5 COMPLETE ===');
  console.log('  Markdown:', REPORT_MD_PATH);
  console.log('  HTML:    ', REPORT_HTML_PATH);
}

main().catch(e => {
  console.error('V5 AGENT 5 FAILED:', e.message);
  console.error(e.stack);
  process.exit(1);
});