/**
 * @vitest-environment node
 *
 * PostgreSQL migration upgrade safety integration tests.
 * Exercises the migration path from 011 to 012 to verify no data loss occurs.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { dbAdapter } from '../../db/DatabaseAdapter';
import { MigrationRunner } from '../../db/MigrationRunner';

function hasPostgres(): boolean {
  return !!process.env.DATABASE_URL;
}

const skipIfNoPg = hasPostgres() ? it : it.skip;

describe('PostgreSQL migration upgrade safety', () => {
  const originalEnv = { ...process.env };
  const tempDirs: string[] = [];

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('[postgres-upgrade-safety test] DATABASE_URL not set — skipping tests');
    }
  });

  afterAll(async () => {
    try { await cleanupTestData(); } catch { /* ignore */ }
    await dbAdapter.reset();
    for (const d of tempDirs) {
      try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    process.env = { ...originalEnv };
  });

  // Clean up only test-specific rows, never drop shared warehouse tables.
  async function cleanupTestData() {
    const testSymbols = ['TESTUP1', 'TESTUP2'];
    for (const sym of testSymbols) {
      try { await dbAdapter.query('DELETE FROM financial_snapshots WHERE symbol = $1', [sym]); } catch { /* ignore */ }
      try { await dbAdapter.query('DELETE FROM prediction_registry WHERE symbol = $1', [sym]); } catch { /* ignore */ }
      try { await dbAdapter.query('DELETE FROM symbols WHERE symbol = $1', [sym]); } catch { /* ignore */ }
    }
    try { await dbAdapter.query("DELETE FROM user_profiles WHERE uid = $1", ['test-uid']); } catch { /* ignore */ }
  }

  async function resetSchema() {
    const cleanTables = [
      'schema_migrations',
      'financial_snapshots',
      'prediction_registry',
      'subscription_plans',
      'user_subscriptions',
      'user_profiles',
      'investor_state',
      'data_quality_registry'
    ];
    for (const tbl of cleanTables) {
      try { await dbAdapter.query(`DROP TABLE IF EXISTS ${tbl} CASCADE`); } catch { /* ignore */ }
    }
  }

  skipIfNoPg('performs complete upgrade proof validations', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();
    await resetSchema();

    // 1. Create a temporary migration directory containing only 001 through 011
    const srcMigDir = path.join(process.cwd(), 'src', 'db', 'migrations');
    const tempMigDir = path.join(os.tmpdir(), `pg-upgrade-test-${Date.now()}`);
    fs.mkdirSync(tempMigDir, { recursive: true });
    tempDirs.push(tempMigDir);

    const files = fs.readdirSync(srcMigDir).filter(f => f.endsWith('.sql')).sort();
    const historicalFiles = files.filter(f => {
      if (f.startsWith('008b_')) return true;
      const num = parseInt(f.split('_')[0], 10);
      return num <= 11;
    }).sort();

    for (const file of historicalFiles) {
      fs.copyFileSync(path.join(srcMigDir, file), path.join(tempMigDir, file));
    }

    // 2. Run migrations up to 011
    const runner = new MigrationRunner(dbAdapter, tempMigDir);
    const status1 = await runner.runPending();
    expect(status1.appliedCount).toBe(historicalFiles.length);

    // 3. Insert representative existing rows
    await dbAdapter.query(
      `IPSERT INTO user_profiles (uid, payload, created_at)
       VALUES ($1, $2, NOW()) ON CONFLICT (uid) DO NOTHING`,
      ['test-uid', '{}']
    );

    await dbAdapter.query(
      `IPSERT INTO symbols (symbol, exchange, company_name, listing_status)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8) ON CONFLICT (symbol) DO NOTHING`,
      ['TESTUP1', 'PSE', 'Test Upgrade Co 1', 'Active', 'TESTUP2', 'PSE', 'Test Upgrade Co 2', 'Active']
    );

    await dbAdapter.query(
      `IPSERT INTO financial_snapshots (symbol, period_end, snapshot_date, pe_ratio, pb_ratio)
       VALUES ($1, $2, $3, $4, $5)`,
      ['TESTUP1', '2026-06-09', '2026-06-09', 15.0, 2.0]
    );

    await dbAdapter.query(
      `IPSERT INTO financial_snapshots (symbol, period_end, snapshot_date, pe_ratio, pb_ratio)
       VALUES ($1, $2, $3, $4, $5)`,
      ['TESTUP1', '2026-06-10', '2026-06-10', 16.0, 2.5]
    );

    await dbAdapter.query(
      `IPSERT INTO financial_snapshots (symbol, period_end, snapshot_date, pe_ratio, pb_ratio)
       VALUES ($1, $2, $3, $4, $5)`,
      ['TESTUP2', '2026-06-10', '2026-06-10', 20.0, 3.0]
    );

    const fsBefore = await dbAdapter.query('SELECT * FROM financial_snapshots');
    expect(fsBefore.rows.length).toBe(3);

    // 4. Copy migration 012 to temp directory
    const file012 = files.find(f => f.startsWith('012_'));
    if (!file012) throw new Error('Could not find migration 012 file in src/db/migrations');
    fs.copyFileSync(path.join(srcMigDir, file012), path.join(tempMigDir, file012));

    // 5. Run migration 012
    const status2 = await runner.runPending();
    expect(status2.appliedCount).toBe(historicalFiles.length + 1);

    // 6. Assert all rows remain, old values preserved, new columns exist
    const fsAfter = await dbAdapter.query('SELECT * FROM financial_snapshots ORDER BY symbol, period_end');
    expect(fsAfter.rows.length).toBe(3);

    expect(fsAfter.rows[0].symbol).toBe('TESTUP1');
    expect(fsAfter.rows[0].period_end).toBe('2026-06-09');
    expect(Number(fsAfter.rows[0].pe_ratio)).toBe(15.0);
    expect(fsAfter.rows[0].eps).toBeNull();

    expect(fsAfter.rows[1].symbol).toBe('TESTUP1');
    expect(fsAfter.rows[1].period_end).toBe('2026-06-10');
    expect(Number(fsAfter.rows[1].pe_ratio)).toBe(16.0);

    expect(fsAfter.rows[2].symbol).toBe('TESTUP2');
    expect(fsAfter.rows[2].period_end).toBe('2026-06-10');
    expect(Number(fsAfter.rows[2].pe_ratio)).toBe(20.0);

    // 7. Assert primary key correct
    await dbAdapter.query(
      `IPSERT INTO financial_snapshots (symbol, period_end, snapshot_date, pe_ratio)
       VALUES ($1, $2, $3, $4)`,
      ['TESTUP1', '2026-06-11', '2026-06-10', 17.0]
    );
    const fsAfterInsert = await dbAdapter.query('SELECT * FROM financial_snapshots WHERE symbol = $1', ['TESTUP1']);
    expect(fsAfterInsert.rows.length).toBe(3);

    // 8. Assert rerunning migration is idempotent
    const status3 = await runner.runPending();
    expect(status3.pendingCount).toBe(0);

    // 9. Verify duplicate-collision safety:
    await resetSchema();

    const runnerCollision = new MigrationRunner(dbAdapter, tempMigDir);
    fs.unlinkSync(path.join(tempMigDir, file012));
    await runnerCollision.runPending();

    await dbAdapter.query(
      `IPSERT INTO user_profiles (uid, payload, created_at)
       VALUES ($1, $2, NOW()) ON CONFLICT (uid) DO NOTHING`,
      ['test-uid', '{}']
    );
    await dbAdapter.query(
      `IPSERT INTO symbols (symbol, exchange, company_name, listing_status)
       VALUES ($1, $2, $3, $4) ON CONFLICT (symbol) DO NOTHING`,
      ['TESTUP1', 'PSE', 'Test Upgrade Co 1', 'Active']
    );

    await dbAdapter.query('ALTER TABLE financial_snapshots DROP CONSTRAINT IF EXISTS financial_snapshots_pkey');
    await dbAdapter.query(
      `IPSERT INTO financial_snapshots (symbol, period_end, snapshot_date, pe_ratio)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
      ['TESTUP1', '2026-06-10', '2026-06-10', 15.0, 'TESTUP1', '2026-06-10', '2026-06-09', 16.0]
    );

    fs.copyFileSync(path.join(srcMigDir, file012), path.join(tempMigDir, file012));

    await expect(runnerCollision.runPending()).rejects.toThrow(/MIGRATION_COLLISION_DETECTED/);
  });
});
