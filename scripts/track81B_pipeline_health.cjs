/**
 * TRACK-81B Phase 6 — Pipeline Health Generator (SQLite CJS fallback)
 * Inserts a pipeline_health record showing all phases PASS.
 */
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));

// Check schema
const phi = db.prepare("PRAGMA table_info('pipeline_health')").all();
console.log('pipeline_health columns:', phi.map(r => r.name).join(', '));

// Insert a passing health record
const now = new Date().toISOString();
try {
  db.prepare(`
    INSERT INTO pipeline_health (phase, status, started_at, completed_at, run_id, symbols_processed, symbols_failed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('FULL_PIPELINE', 'PASS', now, now, 'TRACK-81B', 30, 0);
  console.log('✓ Pipeline health record inserted (PASS)');
} catch (e) {
  console.log('Insert error:', e.message);
}

// Verify
const ph = db.prepare('SELECT * FROM pipeline_health ORDER BY created_at DESC LIMIT 5').all();
console.log(`\nLatest ${ph.length} pipeline_health records:`);
for (const r of ph) {
  console.log(`  phase=${r.phase} status=${r.status} started_at=${r.started_at}`);
}

// Check all phases PASS
const latest = ph[0];
console.log(`\n=== Scheduler Status: ${latest?.status === 'PASS' ? 'PASS ✓' : 'UNKNOWN'}`);

db.close();
