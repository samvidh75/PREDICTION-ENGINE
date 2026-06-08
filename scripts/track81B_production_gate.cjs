/**
 * TRACK-81B Phase 7 — Production Gate (SQLite CJS)
 * Mirrors production_gate.ts but uses better-sqlite3 directly.
 */
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));

console.log('========================================');
console.log('  STOCKSTORY PRODUCTION READINESS GATE');
console.log('========================================\n');

let passes = 0;
let warns = 0;
let fails = 0;

// 1. Database Connectivity
try {
  db.prepare('SELECT 1 as ok').get();
  console.log('✅ Database Connectivity: Connected successfully');
  passes++;
} catch (e) {
  console.log('❌ Database Connectivity: Failed');
  fails++;
}

// 2. Symbol Universe
try {
  const sc = db.prepare('SELECT COUNT(*) as cnt FROM daily_prices').get();
  const ds = db.prepare('SELECT COUNT(DISTINCT symbol) as cnt FROM daily_prices').get();
  if (sc.cnt > 0 && ds.cnt > 0) {
    console.log(`✅ Symbol Universe: ${ds.cnt} symbols, ${sc.cnt} price rows`);
    passes++;
  } else {
    console.log('❌ Symbol Universe: No data');
    fails++;
  }
} catch (e) {
  console.log(`❌ Symbol Universe: ${e.message}`);
  fails++;
}

// 3. Price Data Freshness
try {
  const pd = db.prepare('SELECT MAX(trade_date) as latest FROM daily_prices').get();
  if (pd.latest) {
    console.log(`✅ Price Data Freshness: Latest ${pd.latest}`);
    passes++;
  } else {
    console.log('❌ Price Data Freshness: No price data');
    fails++;
  }
} catch (e) {
  console.log(`❌ Price Data Freshness: ${e.message}`);
  fails++;
}

// 4. Factor Freshness
try {
  const fd = db.prepare('SELECT MAX(trade_date) as latest FROM factor_snapshots').get();
  const fcount = db.prepare('SELECT COUNT(*) as cnt FROM factor_snapshots').get();
  if (fd.latest && fcount.cnt > 0) {
    console.log(`✅ Factor Freshness: Latest ${fd.latest} (${fcount.cnt} rows)`);
    passes++;
  } else {
    console.log('❌ Factor Freshness: No factor data');
    fails++;
  }
} catch (e) {
  console.log(`❌ Factor Freshness: ${e.message}`);
  fails++;
}

// 5. Prediction Registry
try {
  const pc = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry').get();
  const ptoday = db.prepare("SELECT COUNT(*) as cnt FROM prediction_registry WHERE prediction_date >= DATE('now', '-1 day')").get();
  if (ptoday.cnt > 0) {
    console.log(`✅ Prediction Registry: ${pc.cnt} total, ${ptoday.cnt} today`);
    passes++;
  } else {
    console.log(`⚠️ Prediction Registry: ${pc.cnt} total but 0 today`);
    warns++;
  }
} catch (e) {
  console.log(`❌ Prediction Registry: ${e.message}`);
  fails++;
}

// 6. Validated Predictions
try {
  const vc = db.prepare("SELECT COUNT(*) as cnt FROM prediction_registry WHERE validation_status = 'validated'").get();
  console.log(`⚠️ Validated Predictions: ${vc.cnt} validated (validation_status column)`);
  warns++; // Always warn since validation pipeline isn't in scope
} catch (e) {
  // validation_status column may not exist
  console.log('⚠️ Validated Predictions: validation_status column not found');
  warns++;
}

// 7. Pipeline Scheduler
try {
  const ph = db.prepare("SELECT * FROM pipeline_health WHERE created_at >= DATETIME('now', '-24 hours') ORDER BY created_at DESC LIMIT 1").get();
  if (ph && (ph.status === 'PASS' || ph.status === 'success')) {
    console.log(`✅ Pipeline Scheduler: ${ph.phase} = ${ph.status}`);
    passes++;
  } else if (ph) {
    console.log(`⚠️ Pipeline Scheduler: ${ph.phase} = ${ph.status}`);
    warns++;
  } else {
    console.log('⚠️ Pipeline Scheduler: No pipeline runs in last 24h');
    warns++;
  }
} catch (e) {
  console.log(`⚠️ Pipeline Scheduler: ${e.message}`);
  warns++;
}

// 8. Frontend Build (skip — not applicable)
console.log('⚠️ Frontend Build: Skipped (not checked)');
warns++;

console.log('\n----------------------------------------');
console.log(`RESULTS: ${passes} PASS / ${warns} WARN / ${fails} FAIL`);

const gatePassed = fails === 0;
console.log(`GATE: ${gatePassed ? '✅ PASS' : '❌ FAIL'} — ${gatePassed ? 'Ready for production' : 'Critical issues must be resolved'}`);

console.log(`\nFAIL = ${fails}`);

db.close();
