const fs = require('fs');
const path = require('path');
const d = path.join(__dirname, '..', 'reports', 'track-35');
if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });

require('dotenv').config();

// Use the project's db module which has SQLite fallback
let pool;
try {
  const dbModule = require('../src/db/SQLiteAdapter.ts');
  pool = dbModule.pool;
} catch {
  // Fallback: require the compiled version or direct SQLite
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '..', 'data', 'stockstory.db');
    const db = new Database(dbPath);
    pool = {
      query: async (text, params) => {
        const sql = text.replace(/\$\d+/g, '?');
        const stmt = db.prepare(sql);
        const rows = params ? stmt.all(...params) : stmt.all();
        return { rows, rowCount: rows.length };
      },
      end: async () => db.close(),
    };
  } catch (e) {
    console.error('DATABASE_UNREACHABLE');
    const md = '# TRACK-35 Dataset Certification\n\n## Classification: **DATABASE_UNREACHABLE**\n\nNo database module available.\n';
    fs.writeFileSync(path.join(d, '15-DatasetCertification.md'), md);
    process.exit(0);
  }
}

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('DB: REACHABLE');

    const tables = ['symbols', 'daily_prices', 'financial_snapshots', 'feature_snapshots', 'factor_snapshots', 'prediction_registry'];
    const counts = {};
    for (const tbl of tables) {
      try {
        const r = await pool.query('SELECT count(*) AS c FROM ' + tbl);
        counts[tbl] = Number(r.rows[0].c ?? r.rows[0].C ?? 0);
        console.log(tbl + ': ' + counts[tbl].toLocaleString());
      } catch (e) {
        counts[tbl] = 0;
        console.log(tbl + ': 0 (new table)');
      }
    }

    const targets = {
      symbols_500: counts.symbols >= 500,
      daily_prices_1M: counts.daily_prices >= 1000000,
      financial_snapshots_5K: counts.financial_snapshots >= 5000,
      feature_snapshots_500K: counts.feature_snapshots >= 500000,
      factor_snapshots_500K: counts.factor_snapshots >= 500000,
      predictions_populated: counts.prediction_registry > 0,
    };

    const met = Object.values(targets).filter(Boolean).length;
    const total = 6;
    let classification = 'EMPTY';
    if (met === 6) classification = 'PRODUCTION_READY';
    else if (met >= 5) classification = 'BETA_READY';
    else if (met >= 3) classification = 'USABLE';
    else if (met >= 1) classification = 'PARTIAL';
    else classification = 'EMPTY';

    const md = '# TRACK-35 Production Dataset Certification\n**' + new Date().toISOString() + '**\n\n' +
      '## Dataset Row Counts\n\n' +
      '| Table | Rows | Target | Status |\n|-------|------|--------|--------|\n' +
      '| symbols | ' + (counts.symbols || 0).toLocaleString() + ' | 500+ | ' + (targets.symbols_500 ? 'OK' : 'FAIL') + ' |\n' +
      '| daily_prices | ' + (counts.daily_prices || 0).toLocaleString() + ' | 1,000,000+ | ' + (targets.daily_prices_1M ? 'OK' : 'FAIL') + ' |\n' +
      '| financial_snapshots | ' + (counts.financial_snapshots || 0).toLocaleString() + ' | 5,000+ | ' + (targets.financial_snapshots_5K ? 'OK' : 'FAIL') + ' |\n' +
      '| feature_snapshots | ' + (counts.feature_snapshots || 0).toLocaleString() + ' | 500,000+ | ' + (targets.feature_snapshots_500K ? 'OK' : 'FAIL') + ' |\n' +
      '| factor_snapshots | ' + (counts.factor_snapshots || 0).toLocaleString() + ' | 500,000+ | ' + (targets.factor_snapshots_500K ? 'OK' : 'FAIL') + ' |\n' +
      '| prediction_registry | ' + (counts.prediction_registry || 0).toLocaleString() + ' | >0 | ' + (targets.predictions_populated ? 'OK' : 'FAIL') + ' |\n' +
      '\n**Progress:** ' + met + '/' + total + ' targets met (' + Math.round(met / total * 100) + '%)\n\n' +
      '## Final Classification: **' + classification + '**\n';

    fs.writeFileSync(path.join(d, '15-DatasetCertification.md'), md);
    console.log('\nReport written to 15-DatasetCertification.md');
    console.log('Classification: ' + classification + ' (' + met + '/' + total + ')');

  } catch (err) {
    console.error('DATABASE_UNREACHABLE:', err.message);
    const md = '# TRACK-35 Dataset Certification\n\n## Classification: **DATABASE_UNREACHABLE**\n\n**Error:** ' + err.message + '\n';
    fs.writeFileSync(path.join(d, '15-DatasetCertification.md'), md);
  } finally {
    if (pool.end) await pool.end();
    process.exit(0);
  }
})();
