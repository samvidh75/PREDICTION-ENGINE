const Database = require('better-sqlite3');
const path = require('path');
const DB = path.resolve(__dirname, '..', 'data', 'stockstory.db');
const d = new Database(DB);
d.pragma('journal_mode = WAL');

// Drop old tables with wrong schema
d.prepare('DROP TABLE IF EXISTS quality_registry_v4').run();
d.prepare('DROP TABLE IF EXISTS risk_registry').run();

// Recreate Quality V4 with correct columns
d.prepare(`CREATE TABLE quality_registry_v4 (
  id TEXT PRIMARY KEY, symbol TEXT, report_date TEXT,
  profitability REAL, capital_efficiency REAL, valuation_score REAL, income_quality REAL,
  quality_score REAL, quality_grade TEXT, drivers TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(symbol, report_date)
)`).run();

// Recreate Risk with correct columns
d.prepare(`CREATE TABLE risk_registry (
  id TEXT PRIMARY KEY, symbol TEXT, report_date TEXT,
  leverage_risk REAL, volatility_risk REAL, factor_risk REAL, prediction_stability_risk REAL,
  risk_score REAL, risk_grade TEXT, risk_drivers TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(symbol, report_date)
)`).run();

console.log('Tables recreated with correct schema');

// Now populate Quality V4
const syms = d.prepare('SELECT DISTINCT symbol FROM factor_snapshots LIMIT 30').all();
const today = new Date().toISOString().split('T')[0];
const insQ = d.prepare('INSERT OR REPLACE INTO quality_registry_v4 (id,symbol,report_date,profitability,capital_efficiency,valuation_score,income_quality,quality_score,quality_grade,drivers) VALUES (?,?,?,?,?,?,?,?,?,?)');
let cntQ = 0;
for (const s of syms) {
  const f = d.prepare('SELECT quality_factor,growth_factor,value_factor,momentum_factor,risk_factor FROM factor_snapshots WHERE symbol=? ORDER BY trade_date DESC LIMIT 1').get(s.symbol);
  if (!f) continue;
  const prof = Math.min(1,Math.max(0,(f.quality_factor||0.5)*0.7+(f.risk_factor||0.5)*0.3));
  const cap = Math.min(1,Math.max(0,(f.value_factor||0.5)*0.6+(f.quality_factor||0.5)*0.4));
  const val = Math.min(1,Math.max(0,(f.value_factor||0.5)*0.8+(f.momentum_factor||0.5)*0.2));
  const inc = Math.min(1,Math.max(0,(f.quality_factor||0.5)*0.6+(f.momentum_factor||0.5)*0.4));
  const qs = (prof+cap+val+inc)/4;
  const grade = qs>=0.85?'A+':qs>=0.75?'A':qs>=0.65?'B+':qs>=0.55?'B':qs>=0.4?'C':'D';
  const dr = `Profit:${(prof*100).toFixed(0)}%, Capital:${(cap*100).toFixed(0)}%, Val:${(val*100).toFixed(0)}%`;
  try { insQ.run(`${s.symbol}_${today}`,s.symbol,today,Math.round(prof*100)/100,Math.round(cap*100)/100,Math.round(val*100)/100,Math.round(inc*100)/100,Math.round(qs*100)/100,grade,dr); cntQ++; } catch(e) {}
}
console.log(`Quality V4: ${cntQ} records`);

// Populate Risk
const insR = d.prepare('INSERT OR REPLACE INTO risk_registry (id,symbol,report_date,leverage_risk,volatility_risk,factor_risk,prediction_stability_risk,risk_score,risk_grade,risk_drivers) VALUES (?,?,?,?,?,?,?,?,?,?)');
let cntR = 0;
for (const s of syms) {
  const f = d.prepare('SELECT quality_factor,growth_factor,value_factor,momentum_factor,risk_factor FROM factor_snapshots WHERE symbol=? ORDER BY trade_date DESC LIMIT 1').get(s.symbol);
  if (!f) continue;
  const lr = 1-Math.min(1,Math.max(0,(f.value_factor||0.5)));
  const vr = 1-Math.min(1,Math.max(0,(f.momentum_factor||0.5)));
  const fr = 1-Math.min(1,Math.max(0,(f.risk_factor||0.5)));
  const ps = 1-Math.min(1,Math.max(0,(f.quality_factor||0.5)*0.7+(f.growth_factor||0.5)*0.3));
  const rs = (lr+vr+fr+ps)/4;
  const rg = rs<=0.3?'LOW':rs<=0.5?'MODERATE':rs<=0.7?'HIGH':'VERY_HIGH';
  const rd = [lr>0.5?'Leverage':'',vr>0.5?'Volatility':'',fr>0.5?'Factor risk':''].filter(Boolean).join('; ');
  try { insR.run(`${s.symbol}_${today}`,s.symbol,today,Math.round(lr*100)/100,Math.round(vr*100)/100,Math.round(fr*100)/100,Math.round(ps*100)/100,Math.round(rs*100)/100,rg,rd); cntR++; } catch(e) {}
}
console.log(`Risk: ${cntR} records`);

// Verify
console.log('quality_registry_v4:', d.prepare('SELECT COUNT(*) as c FROM quality_registry_v4').get().c, 'rows');
console.log('risk_registry:', d.prepare('SELECT COUNT(*) as c FROM risk_registry').get().c, 'rows');
d.close();
