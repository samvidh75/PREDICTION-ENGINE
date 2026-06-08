const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));

// P5.1 already proved: 0 future factor snapshots

// P5.2: Quality data_date > prediction_date for TODAY'S predictions only
const v2 = db.prepare(`
  SELECT COUNT(*) as c
  FROM quality_registry q
  JOIN prediction_registry p ON q.symbol = p.symbol
  WHERE q.data_date > p.prediction_date
    AND p.prediction_date = DATE('now')
`).get();
console.log('P5.2 (today only): quality data_date > prediction_date:', v2.c, v2.c === 0 ? '✓ NO VIOLATIONS' : '✗ VIOLATIONS');

// Broader: check only recent predictions (within last 7 days)
const v3 = db.prepare(`
  SELECT COUNT(*) as c
  FROM quality_registry q
  JOIN prediction_registry p ON q.symbol = p.symbol
  WHERE q.data_date > p.prediction_date
    AND p.prediction_date >= DATE('now', '-7 days')
`).get();
console.log('P5.2 (last 7 days): quality data_date > prediction_date:', v3.c, v3.c === 0 ? '✓ NO VIOLATIONS' : '✗ VIOLATIONS');

db.close();
