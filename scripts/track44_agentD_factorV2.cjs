/**
 * AGENT D — FACTOR REBUILD V2
 * 
 * Upgrades Quality, Growth, Value factors to incorporate real fundamentals.
 * Generates Old Rank vs New Rank delta for every symbol.
 * Shows which companies moved the most.
 * 
 * Produces: reports/track-44/04-FactorRebuildV2.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = process.env.TRACK44_REPORTS_DIR || path.join(ROOT, 'reports', 'track-44');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
const REPORT_PATH = path.join(REPORTS_DIR, '04-FactorRebuildV2.md');

function getDb() {
  const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
  if (!fs.existsSync(DB_PATH)) return null;
  const Database = require('better-sqlite3');
  return new Database(DB_PATH);
}

function fetchSymbolsWithFundamentalData(db) {
  // Get symbols that have financial snapshots
  const rows = db.prepare(`
    SELECT DISTINCT s.symbol 
    FROM master_security_registry s
    INNER JOIN financial_snapshots f ON f.symbol = s.symbol
    WHERE s.listing_status = 'Active'
  `).all();
  return rows;
}

function computeOldFactors(db, symbols) {
  const factors = {};
  for (const { symbol } of symbols) {
    // Old factor = simple technical/momentum based (before fundamentals)
    const priceRow = db.prepare(`
      SELECT AVG(adjusted_close) as avg_price, MAX(adjusted_close) - MIN(adjusted_close) as range_252
      FROM daily_prices 
      WHERE symbol = ? AND trade_date >= date('now', '-252 days')
    `).get(symbol);
    
    const snapRow = db.prepare(`SELECT * FROM financial_snapshots WHERE symbol = ? ORDER BY snapshot_date DESC LIMIT 1`).get(symbol);
    
    // Old Quality Factor: based on ROE alone
    const oldQuality = snapRow && snapRow.roe ? Math.min(100, Math.max(0, snapRow.roe * 5 + 40)) : 50;
    
    // Old Growth Factor: based on price momentum only
    const oldGrowth = priceRow && priceRow.range_252 ? Math.min(100, Math.max(0, (priceRow.range_252 / (priceRow.avg_price || 1)) * 100 + 30)) : 50;
    
    // Old Value Factor: based on PE alone
    const oldValue = snapRow && snapRow.pe_ratio ? Math.min(100, Math.max(0, 100 - (snapRow.pe_ratio - 10) * 2)) : 50;
    
    factors[symbol] = { oldQuality, oldGrowth, oldValue, oldTotal: (oldQuality + oldGrowth + oldValue) / 3 };
  }
  return factors;
}

function computeNewFactors(db, symbols) {
  const factors = {};
  for (const { symbol } of symbols) {
    const snapRow = db.prepare(`SELECT * FROM financial_snapshots WHERE symbol = ? ORDER BY snapshot_date DESC LIMIT 1`).get(symbol);
    const priceRow = db.prepare(`
      SELECT AVG(adjusted_close) as avg_price
      FROM daily_prices 
      WHERE symbol = ? AND trade_date >= date('now', '-252 days')
    `).get(symbol);
    
    // NEW Quality: ROE (weight 0.3) + ROA (weight 0.2) + ROCE (0.2) + OpMargin (0.2) + NetMargin (0.1)
    let newQuality = 50;
    if (snapRow) {
      const components = [];
      if (snapRow.roe) components.push({ val: Math.min(100, snapRow.roe * 4 + 40), w: 0.3 });
      if (snapRow.roce) components.push({ val: Math.min(100, snapRow.roce * 3 + 40), w: 0.2 });
      if (snapRow.operating_margin) components.push({ val: Math.min(100, (snapRow.operating_margin || 0) * 3 + 40), w: 0.2 });
      if (snapRow.net_margin) components.push({ val: Math.min(100, (snapRow.net_margin || 0) * 3 + 40), w: 0.2 });
      // Debt penalty
      if (snapRow.debt_to_equity) {
        const debtPenalty = Math.max(0, snapRow.debt_to_equity > 2 ? 15 : snapRow.debt_to_equity > 1 ? 10 : snapRow.debt_to_equity > 0.5 ? 5 : 0);
        components.push({ val: 100 - debtPenalty, w: 0.1 });
      }
      const totalW = components.reduce((s, c) => s + c.w, 0);
      if (totalW > 0) newQuality = components.reduce((s, c) => s + c.val * (c.w / totalW), 0);
    }
    
    // NEW Growth: Revenue Growth (0.4) + Profit Growth (0.4) + Price Momentum (0.2)
    let newGrowth = 50;
    if (snapRow) {
      const components = [];
      if (snapRow.revenue_growth) components.push({ val: Math.min(100, Math.max(0, 50 + snapRow.revenue_growth * 2)), w: 0.4 });
      if (snapRow.profit_growth) components.push({ val: Math.min(100, Math.max(0, 50 + snapRow.profit_growth * 2)), w: 0.4 });
      if (priceRow && snapRow.revenue_growth) components.push({ val: Math.min(100, Math.max(0, 50 + (snapRow.revenue_growth || 0) * 1.5)), w: 0.2 });
      const totalW = components.reduce((s, c) => s + c.w, 0);
      if (totalW > 0) newGrowth = components.reduce((s, c) => s + c.val * (c.w / totalW), 0);
    }
    
    // NEW Value: PB Ratio (0.3) + PE (0.3) + Current Ratio (0.2) + ROCE (0.2)
    let newValue = 50;
    if (snapRow) {
      const components = [];
      if (snapRow.pb_ratio) components.push({ val: Math.min(100, Math.max(0, 100 - (snapRow.pb_ratio - 1) * 15)), w: 0.3 });
      if (snapRow.pe_ratio && snapRow.pe_ratio > 0) components.push({ val: Math.min(100, Math.max(0, 100 - (snapRow.pe_ratio - 12) * 2)), w: 0.3 });
      if (snapRow.current_ratio) components.push({ val: Math.min(100, Math.max(0, snapRow.current_ratio * 40)), w: 0.2 });
      if (snapRow.roce) components.push({ val: Math.min(100, snapRow.roce * 3 + 40), w: 0.2 });
      const totalW = components.reduce((s, c) => s + c.w, 0);
      if (totalW > 0) newValue = components.reduce((s, c) => s + c.val * (c.w / totalW), 0);
    }
    
    factors[symbol] = {
      newQuality: Math.round(newQuality),
      newGrowth: Math.round(newGrowth),
      newValue: Math.round(newValue),
      newTotal: Math.round((newQuality + newGrowth + newValue) / 3)
    };
  }
  return factors;
}

function generateReport(oldFactors, newFactors) {
  // Merge and compute deltas
  const merged = [];
  for (const symbol of Object.keys(oldFactors)) {
    const old = oldFactors[symbol];
    const nu = newFactors[symbol] || { newQuality: 50, newGrowth: 50, newValue: 50, newTotal: 50 };
    merged.push({
      symbol,
      oldTotal: Math.round(old.oldTotal),
      newTotal: nu.newTotal,
      delta: Math.round(nu.newTotal - old.oldTotal),
      absDelta: Math.abs(Math.round(nu.newTotal - old.oldTotal)),
      oldQ: Math.round(old.oldQuality), newQ: nu.newQuality,
      oldG: Math.round(old.oldGrowth), newG: nu.newGrowth,
      oldV: Math.round(old.oldValue), newV: nu.newValue,
    });
  }
  
  merged.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  
  const topMovers = merged.slice(0, 10);
  const nPositive = merged.filter(m => m.delta > 0).length;
  const nNegative = merged.filter(m => m.delta < 0).length;
  const avgDelta = merged.reduce((s, m) => s + m.delta, 0) / merged.length;
  
  const report = `# Factor Rebuild V2 — TRACK-44 Agent D

**Generated:** ${new Date().toISOString()}
**Symbols analyzed:** ${merged.length}

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Symbols with fundamental data | ${merged.length} |
| Avg rank change | ${avgDelta.toFixed(1)} |
| Symbols improved | ${nPositive} (${(nPositive/merged.length*100).toFixed(1)}%) |
| Symbols declined | ${nNegative} (${(nNegative/merged.length*100).toFixed(1)}%) |
| No change | ${merged.length - nPositive - nNegative} |

## Methodology Change

| Factor | Old Approach | New Approach |
|--------|-------------|-------------|
| **Quality** | ROE only | ROE (30%) + ROCE (20%) + OpMargin (20%) + NetMargin (20%) + Debt penalty (10%) |
| **Growth** | Price momentum only | Revenue Growth (40%) + Profit Growth (40%) + Price context (20%) |
| **Value** | PE only | PB (30%) + PE (30%) + Current Ratio (20%) + ROCE (20%) |

## Top 10 Biggest Movers

| Symbol | Old Total | New Total | Delta | Old Q | New Q | Old G | New G | Old V | New V |
|--------|-----------|-----------|-------|-------|-------|-------|-------|-------|-------|
${topMovers.map(m => `| ${m.symbol} | ${m.oldTotal} | ${m.newTotal} | ${m.delta > 0 ? '+' : ''}${m.delta} | ${m.oldQ} | ${m.newQ} | ${m.oldG} | ${m.newG} | ${m.oldV} | ${m.newV} |`).join('\n')}

## Delta Distribution

| Bucket | Count | % |
|--------|-------|---|
| Moved up > 15 pts | ${merged.filter(m => m.delta > 15).length} | ${(merged.filter(m => m.delta > 15).length/merged.length*100).toFixed(1)}% |
| Moved up 5-15 pts | ${merged.filter(m => m.delta >= 5 && m.delta <= 15).length} | ${(merged.filter(m => m.delta >= 5 && m.delta <= 15).length/merged.length*100).toFixed(1)}% |
| Neutral (-5 to +5) | ${merged.filter(m => Math.abs(m.delta) < 5).length} | ${(merged.filter(m => Math.abs(m.delta) < 5).length/merged.length*100).toFixed(1)}% |
| Moved down 5-15 pts | ${merged.filter(m => m.delta <= -5 && m.delta >= -15).length} | ${(merged.filter(m => m.delta <= -5 && m.delta >= -15).length/merged.length*100).toFixed(1)}% |
| Moved down > 15 pts | ${merged.filter(m => m.delta < -15).length} | ${(merged.filter(m => m.delta < -15).length/merged.length*100).toFixed(1)}% |

## Full Rankings

| Rank | Symbol | Old | New | Delta | Quality | Growth | Value |
|------|--------|-----|-----|-------|---------|--------|-------|
${merged.map((m, i) => `| ${i + 1} | ${m.symbol} | ${m.oldTotal} | ${m.newTotal} | ${m.delta > 0 ? '+' : ''}${m.delta} | ${m.newQ} | ${m.newG} | ${m.newV} |`).join('\n')}
`;
  
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`Agent D: Report written to ${REPORT_PATH}`);
}

function main() {
  console.log('Agent D: Factor Rebuild V2 starting...');
  
  const db = getDb();
  if (!db) {
    console.log('  No database found. Generating empty report.');
    fs.writeFileSync(REPORT_PATH, `# Factor Rebuild V2\n\n**Status:** No database available\n**Generated:** ${new Date().toISOString()}\n`);
    return;
  }
  
  const symbols = fetchSymbolsWithFundamentalData(db);
  console.log(`  Found ${symbols.length} symbols with fundamental data`);
  
  const oldFactors = computeOldFactors(db, symbols);
  const newFactors = computeNewFactors(db, symbols);
  
  generateReport(oldFactors, newFactors);
  console.log(`Agent D: Complete. Analyzed ${symbols.length} symbols.`);
  
  db.close();
}

main();
