import Database from 'better-sqlite3';
const db = new Database('./data/stockstory.db', { readonly: true });

// Check today's symbols
const today = '2026-06-08';
const syms = db.prepare("SELECT DISTINCT symbol FROM prediction_registry WHERE prediction_date = ? LIMIT 50").all(today) as any[];
console.log('Symbols today:', syms.map((r: any) => r.symbol).join(', '));
console.log('Count:', syms.length);

// Check duplicates
const dupes = db.prepare(`
  SELECT symbol, prediction_date, prediction_horizon, COUNT(*) as cnt
  FROM prediction_registry
  WHERE prediction_date = ?
  GROUP BY symbol, prediction_date, prediction_horizon
  HAVING COUNT(*) > 1
`).all(today) as any[];
console.log('Duplicates today:', dupes.length);
if (dupes.length > 0) console.log(dupes);

// Check yesterday
const yesterday = '2026-06-07';
const yesterdaySyms = db.prepare("SELECT DISTINCT symbol FROM prediction_registry WHERE prediction_date = ? LIMIT 50").all(yesterday) as any[];
console.log('Symbols yesterday:', yesterdaySyms.map((r: any) => r.symbol).join(', '));
console.log('Count yesterday:', yesterdaySyms.length);

// Check total distinct
const totalDistinct = db.prepare("SELECT COUNT(DISTINCT symbol) as cnt FROM prediction_registry").get() as any;
console.log('Total distinct symbols:', totalDistinct?.cnt);

// Check for .NS suffix
const nsSyms = db.prepare("SELECT DISTINCT symbol FROM prediction_registry WHERE symbol LIKE '%.NS' LIMIT 20").all() as any[];
console.log('.NS symbols:', nsSyms.map((r: any) => r.symbol).join(', '));

// Check for ADANIENT specifically
const adani = db.prepare("SELECT COUNT(*) as cnt FROM prediction_registry WHERE symbol = 'ADANIENT'").get() as any;
console.log('ADANIENT count:', adani?.cnt);

db.close();
