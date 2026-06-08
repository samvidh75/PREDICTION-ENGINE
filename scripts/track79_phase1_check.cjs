#!/usr/bin/env node
/**
 * TRACK-79 Phase 1: Inspect factor_snapshots schema and verify gen_factors.cjs alignment.
 * Prints actual schema, then compares against the INSERT statement in gen_factors.cjs.
 */
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'stockstory.db');
const db = new Database(DB_PATH, { readonly: true });

// 1. Actual schema
console.log('=== ACTUAL factor_snapshots SCHEMA ===');
const cols = db.prepare("PRAGMA table_info('factor_snapshots')").all();
for (const c of cols) {
  console.log(`  ${c.cid} | ${c.name} | ${c.type} | notnull=${c.notnull} | default=${c.dflt_value} | pk=${c.pk}`);
}

// 2. Check table exists
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='factor_snapshots'").get();
console.log(`\nTable exists: ${!!tableExists}`);

// 3. Row count
const count = db.prepare("SELECT COUNT(*) as c FROM factor_snapshots").get();
const distinct = db.prepare("SELECT COUNT(DISTINCT symbol) as c FROM factor_snapshots").get();
console.log(`\nCurrent rows: ${count.c}`);
console.log(`Distinct symbols: ${distinct.c}`);

// 4. Recent entry
try {
  const latest = db.prepare("SELECT MAX(trade_date) as d FROM factor_snapshots").get();
  console.log(`Latest trade_date: ${latest.d}`);
} catch(e) {
  console.log('trade_date column not found:', e.message);
  try {
    const latest = db.prepare("SELECT MAX(snapshot_date) as d FROM factor_snapshots").get();
    console.log(`Latest snapshot_date: ${latest.d}`);
  } catch(e2) {
    console.log('Neither trade_date nor snapshot_date found');
  }
}

// 5. Sample row
console.log('\n=== SAMPLE ROW ===');
const sample = db.prepare("SELECT * FROM factor_snapshots LIMIT 1").get();
if (sample) {
  console.log(JSON.stringify(sample, null, 2));
} else {
  console.log('Table is empty');
}

// 6. Read gen_factors.cjs INSERT statement
console.log('\n=== gen_factors.cjs INSERT COLUMNS ===');
const scriptPath = path.join(__dirname, 'gen_factors.cjs');
if (fs.existsSync(scriptPath)) {
  const content = fs.readFileSync(scriptPath, 'utf-8');
  const insertMatch = content.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+factor_snapshots\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const insertCols = insertMatch[1].split(',').map(s => s.trim());
    console.log('  Script columns:');
    for (const c of insertCols) console.log(`    ${c}`);
    console.log('\n  Schema columns:');
    for (const c of cols) console.log(`    ${c.name}`);
    console.log('\n  Mismatches:');
    const schemaNames = cols.map(c => c.name);
    for (const c of insertCols) {
      if (!schemaNames.includes(c)) console.log(`    SCRIPT has '${c}' but SCHEMA does NOT (MISSING)`);
    }
    for (const c of schemaNames) {
      if (!insertCols.includes(c)) console.log(`    SCHEMA has '${c}' but SCRIPT does NOT (UNSET)`);
    }
  } else {
    console.log('  Could not parse INSERT statement');
  }
} else {
  console.log(`  Script not found: ${scriptPath}`);
}

db.close();
console.log('\nDone.');
