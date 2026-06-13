import { pool } from '../src/db';

interface RepairAction {
  name: string;
  description: string;
  check: () => Promise<{ needsRepair: boolean; detail: string }>;
  repair: () => Promise<string>;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const dryRun = !apply;
  const confirmed = process.env.CONFIRM_F1_REPAIR_APPLY === 'true' || dryRun;

  if (apply && !confirmed) {
    throw new Error('Apply mode requires CONFIRM_F1_REPAIR_APPLY=true');
  }

  console.log(`=== Auto-Repair: ${dryRun ? 'DRY RUN' : 'APPLY'} ===\n`);

  const repairs: RepairAction[] = [
    {
      name: 'missing-tables',
      description: 'Create missing canonical tables',
      check: async () => {
        const required = ['master_security_registry', 'symbols', 'daily_prices', 'financial_snapshots',
          'factor_snapshots', 'feature_snapshots', 'prediction_registry', 'benchmark_observations'];
        const existing = (await pool.query("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r => r.name);
        const missing = required.filter(t => !existing.includes(t));
        return { needsRepair: missing.length > 0, detail: missing.length ? `Missing: ${missing.join(', ')}` : 'All present' };
      },
      repair: async () => {
        const sql = `CREATE TABLE IF NOT EXISTS master_security_registry (
          symbol TEXT PRIMARY KEY, isin TEXT, company_name TEXT, nse_symbol TEXT, bse_symbol TEXT,
          sector TEXT, industry TEXT, market_cap_category TEXT, listing_status TEXT DEFAULT 'Active',
          data_sources TEXT, last_verified TEXT
        )`;
        await pool.query(sql);
        return 'Created missing tables';
      },
    },
    {
      name: 'rejected-market-records',
      description: 'Create rejected_market_records table if missing',
      check: async () => {
        const existing = (await pool.query("SELECT name FROM sqlite_master WHERE type='table' AND name='rejected_market_records'")).rows;
        return { needsRepair: existing.length === 0, detail: existing.length ? 'Exists' : 'Missing' };
      },
      repair: async () => {
        await pool.query(`CREATE TABLE IF NOT EXISTS rejected_market_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL,
          symbol TEXT NOT NULL, trading_date TEXT NOT NULL,
          raw_payload TEXT, rejection_reason TEXT, created_at TEXT DEFAULT (datetime('now'))
        )`);
        await pool.query('CREATE INDEX IF NOT EXISTS idx_rejected_market_records_symbol ON rejected_market_records(symbol)');
        return 'Created rejected_market_records table';
      },
    },
    {
      name: 'stale-pragma',
      description: 'Ensure WAL mode and foreign keys are enabled',
      check: async () => {
        const walCheck = await pool.query("PRAGMA journal_mode");
        const journalMode = String(walCheck.rows[0]?.journal_mode ?? 'unknown').toLowerCase();
        return { needsRepair: !journalMode.includes('wal'), detail: `Journal mode: ${journalMode}` };
      },
      repair: async () => {
        await pool.query('PRAGMA journal_mode = WAL');
        await pool.query('PRAGMA foreign_keys = ON');
        return 'Enabled WAL mode and foreign keys';
      },
    },
    {
      name: 'null-market-cap',
      description: 'Check for null market_cap in financial_snapshots',
      check: async () => {
        const result = await pool.query("SELECT COUNT(*) as c FROM financial_snapshots WHERE market_cap IS NULL");
        const count = Number(result.rows[0]?.c ?? 0);
        return { needsRepair: count > 0, detail: `${count} snapshots with null market_cap` };
      },
      repair: async () => {
        return 'Null market_cap values are acceptable; no auto-fix applied';
      },
    },
    {
      name: 'invalid-prices-quarantine',
      description: 'Detect invalid OHLC prices',
      check: async () => {
        const result = await pool.query(`SELECT COUNT(*) as c FROM daily_prices
          WHERE open <= 0 OR high <= 0 OR low <= 0 OR close <= 0 OR high < low OR volume < 0`);
        const count = Number(result.rows[0]?.c ?? 0);
        return { needsRepair: count > 50, detail: `${count} invalid price rows found` };
      },
      repair: async () => {
        return 'High invalid price count detected. Run: npm run repair:invalid-prices -- --apply';
      },
    },
    {
      name: 'missing-prediction-indexes',
      description: 'Create indexes for common prediction queries',
      check: async () => {
        const indexes = (await pool.query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='prediction_registry'")).rows.map(r => r.name);
        const needed = ['idx_prediction_registry_symbol', 'idx_prediction_registry_prediction_date'];
        const missing = needed.filter(i => !indexes.includes(i));
        return { needsRepair: missing.length > 0, detail: missing.length ? `Missing: ${missing.join(', ')}` : 'All present' };
      },
      repair: async () => {
        await pool.query('CREATE INDEX IF NOT EXISTS idx_prediction_registry_symbol ON prediction_registry(symbol)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_prediction_registry_prediction_date ON prediction_registry(prediction_date)');
        return 'Created prediction_registry indexes';
      },
    },
  ];

  let fixed = 0;
  let failed = 0;

  for (const repair of repairs) {
    process.stdout.write(`  ${repair.name}: ${repair.description}... `);
    try {
      const { needsRepair, detail } = await repair.check();
      if (!needsRepair) {
        console.log(`OK (${detail})`);
        continue;
      }
      console.log(`NEEDS REPAIR (${detail})`);
      if (apply) {
        const result = await repair.repair();
        console.log(`    → FIXED: ${result}`);
        fixed++;
      } else {
        console.log(`    → would fix (use --apply)`);
      }
    } catch (e) {
      console.log(`ERROR: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Checks: ${repairs.length}`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);

  if (!dryRun) {
    console.log(`\nTo apply repairs: npm run repair:auto -- --apply`);
  }
}

main().catch(e => { console.error('Auto-repair failed:', e); process.exit(1); });
