const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));

// Phase 5.1 - Future factor snapshots
const f1 = db.prepare("SELECT COUNT(*) as c FROM factor_snapshots WHERE trade_date > DATE('now')").get();
console.log('P5.1: Future factor_snapshots:', f1.c, f1.c === 0 ? '✓ NO VIOLATIONS' : '✗ VIOLATION');

// Phase 5.2 - Temporal violation: quality_registry.data_date > prediction_registry.prediction_date
try {
  const v2 = db.prepare(`
    SELECT COUNT(*) as c
    FROM quality_registry q
    JOIN prediction_registry p ON q.symbol = p.symbol
    WHERE q.data_date > p.prediction_date
  `).get();
  console.log('P5.2: quality/prediction temporal violations:', v2.c, v2.c === 0 ? '✓ NO VIOLATIONS' : '✗ VIOLATIONS');
} catch (e) {
  console.log('P5.2: Error:', e.message);
}

// Also check: symbol counts for prediction distinct
const pd = db.prepare('SELECT COUNT(DISTINCT symbol) as c FROM prediction_registry WHERE prediction_date >= DATE(\'now\', \'-1 day\')').get();
console.log('\nDistinct prediction symbols today:', pd.c);

db.close();
