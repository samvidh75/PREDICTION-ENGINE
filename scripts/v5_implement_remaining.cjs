/**
 * V5 IMPLEMENTATION: All remaining changes consolidated into one script.
 * 1. Add price_at_prediction column to prediction_registry (if missing)
 * 2. Backfill price_at_prediction from daily_prices.close on prediction_date
 * 3. Run cleanup (delete temp files + old root .md files)
 * 4. Run SEBI compliance scan (report only — no auto-replace to be safe)
 * 5. Generate Operations Command Centre dashboard (md + html)
 */

const Database = require('better-sqlite3');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
const REPORTS_DIR = path.join(ROOT, 'reports', 'v5');

if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const log = [];

function step(msg) { console.log(`\n=== ${msg} ===`); log.push(`## ${msg}`); }

// ============================================================
// PHASE 1: ADD price_at_prediction + BACKFILL
// ============================================================
function phase1_schema_fix() {
  step('PHASE 1: price_at_prediction column + backfill');
  
  const db = new Database(DB_PATH);
  
  // Check if column exists
  const cols = db.prepare("PRAGMA table_info('prediction_registry')").all();
  const existingCols = cols.map(c => c.name);
  console.log(`  Existing columns: ${existingCols.length}`);
  
  // Add missing columns
  const neededCols = ['price_at_prediction', 'confidence_level', 'classification'];
  for (const col of neededCols) {
    if (!existingCols.includes(col)) {
      try {
        const type = col === 'price_at_prediction' ? 'REAL' : 'TEXT';
        db.exec(`ALTER TABLE prediction_registry ADD COLUMN ${col} ${type} DEFAULT NULL;`);
        console.log(`  Added column: ${col}`);
        log.push(`- ✅ Added column \`${col}\` to prediction_registry`);
      } catch (e) {
        console.log(`  Column ${col} may exist: ${e.message}`);
      }
    } else {
      console.log(`  Column ${col} already exists`);
    }
  }
  
  // Backfill price_at_prediction from daily_prices.close
  const predCount = db.prepare('SELECT COUNT(*) as c FROM prediction_registry WHERE price_at_prediction IS NULL OR price_at_prediction = 0').get().c;
  console.log(`  Predictions needing backfill: ${predCount.toLocaleString()}`);
  
  if (predCount > 0) {
    const backfillSql = `
      UPDATE prediction_registry
      SET price_at_prediction = (
        SELECT COALESCE(
          (SELECT adjusted_close FROM daily_prices 
           WHERE symbol = prediction_registry.symbol AND trade_date = prediction_registry.prediction_date
           LIMIT 1),
          (SELECT close FROM daily_prices 
           WHERE symbol = prediction_registry.symbol AND trade_date = prediction_registry.prediction_date
           LIMIT 1),
          0
        )
      )
      WHERE price_at_prediction IS NULL OR price_at_prediction = 0
    `;
    const info = db.prepare(backfillSql).run();
    console.log(`  Backfilled: ${info.changes.toLocaleString()} predictions`);
    log.push(`- ✅ Backfilled ${info.changes.toLocaleString()} predictions with price_at_prediction`);
  }
  
  // Verify
  const now = db.prepare('SELECT COUNT(*) as c FROM prediction_registry WHERE price_at_prediction > 0').get().c;
  const still = db.prepare('SELECT COUNT(*) as c FROM prediction_registry WHERE price_at_prediction IS NULL OR price_at_prediction = 0').get().c;
  console.log(`  After backfill: ${now.toLocaleString()} with price, ${still.toLocaleString()} without`);
  log.push(`- After: ${now.toLocaleString()} have price_at_prediction > 0, ${still} still 0/NULL`);
  
  db.close();
  return { hasPrice: now, noPrice: still, total: predCount };
}

// ============================================================
// PHASE 2: CLEANUP (temp files + old .md)
// ============================================================
function phase2_cleanup() {
  step('PHASE 2: Cleanup');
  
  const deleted = [];
  const scriptsDir = path.join(ROOT, 'scripts');
  
  // Delete temp_ / tmp_ script files
  if (fs.existsSync(scriptsDir)) {
    const entries = fs.readdirSync(scriptsDir, { withFileTypes: true });
    for (const entry of entries) {
      const lower = entry.name.toLowerCase();
      if (entry.isFile() && (lower.startsWith('temp_') || lower.startsWith('tmp_') || lower.includes('_temp_') || lower.startsWith('temp-') || lower.startsWith('tmp-'))) {
        try {
          fs.unlinkSync(path.join(scriptsDir, entry.name));
          deleted.push(`scripts/${entry.name}`);
          console.log(`  DEL: scripts/${entry.name}`);
        } catch (e) {
          console.log(`  ERR: scripts/${entry.name}: ${e.message}`);
        }
      }
    }
  }
  
  // Delete old root .md files (NOT: README, DEPLOYMENT_GUIDE, BETA_TESTER_GUIDE, BETA_LAUNCH_CHECKLIST)
  const PROTECTED = new Set(['README.md', 'DEPLOYMENT_GUIDE.md', 'BETA_TESTER_GUIDE.md', 'BETA_LAUNCH_CHECKLIST.md']);
  const rootMdFiles = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.md') && !PROTECTED.has(e.name));
  
  for (const entry of rootMdFiles) {
    try {
      fs.unlinkSync(path.join(ROOT, entry.name));
      deleted.push(entry.name);
      console.log(`  DEL: ${entry.name}`);
    } catch (e) {
      console.log(`  ERR: ${entry.name}: ${e.message}`);
    }
  }
  
  log.push(`- ✅ Deleted ${deleted.length} files`);
  if (deleted.length > 0) {
    log.push(`- Files: ${deleted.slice(0, 20).join(', ')}${deleted.length > 20 ? ` ... and ${deleted.length - 20} more` : ''}`);
  }
  
  return deleted.length;
}

// ============================================================
// PHASE 3: SEBI COMPLIANCE SCAN
// ============================================================
function phase3_sebi_scan() {
  step('PHASE 3: SEBI Compliance Scan');
  
  const terms = [
    /strong buy/gi, /strong sell/gi, /should buy/gi, /should sell/gi,
    /target price/gi, /recommended/gi, /outperform/gi, /undervalued/gi,
    /overvalued/gi, /multibagger/gi, /guaranteed/gi, /risk-free/gi,
  ];
  
  const srcDir = path.join(ROOT, 'src');
  const violations = [];
  
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) { scanDir(fullPath); continue; }
      if (!['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(entry.name))) continue;
      
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const regex of terms) {
          regex.lastIndex = 0;
          let match;
          while ((match = regex.exec(content)) !== null) {
            const line = content.substring(0, match.index).split('\n').length;
            violations.push({
              file: path.relative(ROOT, fullPath),
              line,
              term: match[0],
            });
          }
        }
      } catch (e) { /* skip unreadable files */ }
    }
  }
  
  scanDir(srcDir);
  
  console.log(`  Found ${violations.length} violations across ${new Set(violations.map(v => v.file)).size} files`);
  
  const byTerm = {};
  for (const v of violations) {
    const key = v.term.toLowerCase();
    byTerm[key] = (byTerm[key] || 0) + 1;
  }
  
  log.push(`- 🔍 Found ${violations.length} SEBI violations in ${new Set(violations.map(v => v.file)).size} files`);
  for (const [term, count] of Object.entries(byTerm).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    log.push(`  - \`${term}\`: ${count}`);
  }
  
  return violations.length;
}

// ============================================================
// PHASE 4: GENERATE DASHBOARD
// ============================================================
function phase4_dashboard() {
  step('PHASE 4: Generate Operations Dashboard');
  
  const db = new Database(DB_PATH);
  
  function cnt(table) { try { return db.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get().c; } catch { return -1; } }
  function latest(table, col) { try { return db.prepare(`SELECT MAX(${col}) as v FROM "${table}"`).get().v; } catch { return null; } }
  
  const tables = ['daily_prices','financial_snapshots','prediction_registry','prediction_outcomes','factor_snapshots','feature_snapshots','data_quality_registry','master_security_registry'];
  const counts = {};
  for (const t of tables) counts[t] = cnt(t);
  
  const latestPrice = latest('daily_prices', 'trade_date');
  const predsWithPrice = cnt('prediction_registry') > 0 ? 
    db.prepare('SELECT COUNT(*) as c FROM prediction_registry WHERE price_at_prediction > 0').get().c : 0;
  const symWithPrices = cnt('daily_prices') > 0 ?
    db.prepare('SELECT COUNT(DISTINCT symbol) as c FROM daily_prices').get().c : 0;
  const symWithPreds = cnt('prediction_registry') > 0 ?
    db.prepare('SELECT COUNT(DISTINCT symbol) as c FROM prediction_registry').get().c : 0;
  const predHorizons = cnt('prediction_registry') > 0 ?
    db.prepare('SELECT prediction_horizon as h, COUNT(*) as c FROM prediction_registry GROUP BY prediction_horizon').all() : [];
  
  const dbStats = fs.statSync(DB_PATH);
  
  // Generate markdown report
  const now = new Date().toISOString();
  let md = `# Operations Command Centre — V5

**Generated:** ${now} | **DB:** ${(dbStats.size / (1024 * 1024)).toFixed(1)} MB

---

## Database Status

| Table | Rows |
|-------|------|
`;
  for (const [t, c] of Object.entries(counts)) {
    md += `| \`${t}\` | ${c === -1 ? 'MISSING' : c.toLocaleString()} |\n`;
  }
  md += `
## Data Freshness
- Latest price: **${latestPrice || 'N/A'}**
- Predictions with price_at_prediction: **${predsWithPrice.toLocaleString()}** / ${cnt('prediction_registry').toLocaleString()}

## Coverage
| Metric | Count |
|--------|-------|
| Symbols with prices | ${symWithPrices} |
| Symbols with predictions | ${symWithPreds} |

## Prediction Horizons
| Horizon | Count |
|---------|-------|
${predHorizons.map(h => `| ${h.h} days | ${h.c.toLocaleString()} |`).join('\n')}

## Morning Checklist
- [ ] Daily prices fresh: ${latestPrice || 'N/A'}
- [ ] Price data populated: ${predsWithPrice.toLocaleString()} rows
- [ ] All tables present: ${Object.values(counts).filter(c => c >= 0).length}/${tables.length}
`;

  fs.writeFileSync(path.join(REPORTS_DIR, '05-OperationsCommandCentre.md'), md);
  console.log(`  MD report: reports/v5/05-OperationsCommandCentre.md`);

  // Generate HTML dashboard
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>StockStory V5 — Ops Centre</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;background:#FFFBE6;color:#111;padding:20px;}
.container{max-width:1000px;margin:0 auto;}
.header{background:#FFE600;border:5px solid #000;padding:30px;margin-bottom:25px;box-shadow:10px 10px 0 #000;text-align:center;}
.header h1{font-size:2.5rem;text-transform:uppercase;line-height:1.1;}
.card{background:#FFF;border:4px solid #000;padding:20px;margin-bottom:20px;box-shadow:8px 8px 0 #000;}
.card h2{border-bottom:3px solid #000;padding-bottom:8px;margin-bottom:15px;text-transform:uppercase;}
table{width:100%;border-collapse:collapse;font-size:0.85rem;}
th{background:#000;color:#FFF;padding:10px 14px;text-align:left;text-transform:uppercase;font-size:0.8rem;}
td{padding:10px 14px;border-bottom:2px solid #000;}
.badge-green{background:#00E676;color:#000;padding:4px 12px;border:3px solid #000;font-weight:bold;}
.badge-red{background:#FF1744;color:#FFF;padding:4px 12px;border:3px solid #000;font-weight:bold;}
.checklist{list-style:none;}.checklist li{padding:10px;margin:5px 0;border:3px solid #000;background:#C8E6C9;}
</style></head><body><div class="container">
<div class="header"><h1>Operations Command Centre</h1><p>StockStory India V5 | ${now}</p></div>
<div class="card"><h2>Database Status</h2><table><tr><th>Table</th><th>Rows</th></tr>
${Object.entries(counts).map(([t,c]) => `<tr><td><code>${t}</code></td><td>${c===-1?'<span class="badge-red">MISSING</span>':c.toLocaleString()}</td></tr>`).join('')}
</table></div>
<div class="card"><h2>Data Freshness</h2><p>Latest Price: <strong>${latestPrice||'N/A'}</strong></p>
<p>Predictions with price_at_prediction: <strong>${predsWithPrice.toLocaleString()} / ${cnt('prediction_registry').toLocaleString()}</strong></p></div>
<div class="card"><h2>Morning Checklist</h2><ul class="checklist">
<li>✅ Daily prices: ${latestPrice||'N/A'}</li>
<li>${predsWithPrice>0?'✅':'⚠'} Price data populated: ${predsWithPrice.toLocaleString()}</li>
<li>✅ Tables: ${Object.values(counts).filter(c=>c>=0).length}/${tables.length} present</li>
</ul></div>
</div></body></html>`;

  fs.writeFileSync(path.join(REPORTS_DIR, 'dashboard.html'), html);
  console.log(`  HTML dashboard: reports/v5/dashboard.html`);

  db.close();
}

// ============================================================
// MAIN
// ============================================================
console.log('=== V5 IMPLEMENTATION ===\n');

const priceResult = phase1_schema_fix();
const cleanupCount = phase2_cleanup();
const sebiCount = phase3_sebi_scan();
phase4_dashboard();

// Final report
const report = `# V5 Implementation Summary

**Generated:** ${new Date().toISOString()}

## Actions Completed

${log.join('\n')}

## Summary

| Action | Result |
|--------|--------|
| price_at_prediction column | Added + ${priceResult.hasPrice.toLocaleString()} backfilled |
| Cleanup (temp files + old .md) | ${cleanupCount} files deleted |
| SEBI violations found | ${sebiCount} |
| Dashboard generated | reports/v5/05-OperationsCommandCentre.md + dashboard.html |

## Next Steps
1. Install Python 3.9+ and \`pip install yfinance\`
2. Run \`node scripts/track44_agentC_nifty100.cjs\` to expand price data
3. Run \`node scripts/track44_agentB_snapshots.cjs\` to populate financial snapshots
4. Run DailyPredictionCapture daily for 30+ days to get real prediction prices
5. Re-validate alpha after 30 days of live predictions
`;

fs.writeFileSync(path.join(REPORTS_DIR, '00-V5ImplementationSummary.md'), report);
console.log('\n=== ALL PHASES COMPLETE ===');
console.log(`Report: reports/v5/00-V5ImplementationSummary.md`);
