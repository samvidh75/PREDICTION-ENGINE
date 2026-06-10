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
    await dbAdapter.reset();
    for (const d of tempDirs) {
      try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    process.env = { ...originalEnv };
  });

  skipIfNoPg('upgrades from 011 to 012 without data loss', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    // 1. Clean up target tables and schema_migrations
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

    // 2. Create a temporary migration directory containing only 001 through 011
    const srcMigDir = path.join(process.cwd(), 'src', 'db', 'migrations');
    const tempMigDir = path.join(os.tmpdir(), `pg-upgrade-test-${Date.now()}`);
    fs.mkdirSync(tempMigDir, { recursive: true });
    tempDirs.push(tempMigDir);

    const files = fs.readdirSync(srcMigDir).filter(f => f.endsWith('.sql')).sort();
    const historicalFiles = files.filter(f => {
      const num = parseInt(f.split('_')[0], 10);
      return num <= 11;
    });

    for (const file of historicalFiles) {
      fs.copyFileSync(path.join(srcMigDir, file), path.join(tempMigDir, file));
    }

    // 3. Run migrations up to 011
    const runner = new MigrationRunner(dbAdapter, tempMigDir);
    const status1 = await runner.runPending();
    expect(status1.appliedCount).toBe(historicalFiles.length);

    // 4. Insert representative existing rows
    // User profile needed for foreign key constraints
    await dbAdapter.query(
      `INSERT INTO user_profiles (uid, payload, created_at)
       VALUES ($1, $2, NOW()) ON CONFLICT (uid) DO NOTHING`,
      ['test-uid', '{}']
    );

    // Symbol needed for financial_snapshots foreign key
    await dbAdapter.query(
      `INSERT INTO symbols (symbol, exchange, company_name, listing_status)
       VALUES ($1, $2, $3, $4) ON CONFLICT (symbol) DO NOTHING`,
      ['TESTUP', 'NSE', 'Test Upgrade Co', 'Active']
    );

    // Insert into financial_snapshots (V2 schema)
    await dbAdapter.query(
      `INSERT INTO financial_snapshots (symbol, period_end, snapshot_date, pe_ratio, pb_ratio, roe, roce, debt_to_equity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['TESTUP', '2026-06-10', '2026-06-10', 15.5, 2.5, 12.0, 14.5, 0.5]
    );

    // Insert into prediction_registry
    await dbAdapter.query(
      `INSERT INTO prediction_registry (symbol, prediction_date, ranking_score, classification, confidence_score, confidence_level, quality_score, growth_score, value_score, momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      ['TESTUP', '2026-06-10', 85.0, 'Exceptional', 90.0, 'Very High', 80.0, 85.0, 90.0, 75.0, 10.0, 85.0, 30]
    );

    // Insert into subscription_plans
    await dbAdapter.query(
      `INSERT INTO subscription_plans (id, name, tier, price_monthly_inr, features)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      ['plan_pro_upgrade', 'Pro Plan', 'pro', 299, '["feature_a"]']
    );

    // Record row counts and values before upgrade
    const fsBefore = await dbAdapter.query('SELECT * FROM financial_snapshots WHERE symbol = $1', ['TESTUP']);
    expect(fsBefore.rows.length).toBe(1);
    const rowBefore = fsBefore.rows[0];

    // 5. Copy migration 012 to temp directory
    const file012 = files.find(f => f.startsWith('012_'));
    if (!file012) throw new Error('Could not find migration 012 file in src/db/migrations');
    fs.copyFileSync(path.join(srcMigDir, file012), path.join(tempMigDir, file012));

    // 6. Run migration 012
    const status2 = await runner.runPending();
    expect(status2.appliedCount).toBe(historicalFiles.length + 1);

    // 7. Assert existing rows and values remain unchanged
    const fsAfter = await dbAdapter.query('SELECT * FROM financial_snapshots WHERE symbol = $1', ['TESTUP']);
    expect(fsAfter.rows.length).toBe(1);
    const rowAfter = fsAfter.rows[0];

    expect(rowAfter.symbol).toBe(rowBefore.symbol);
    expect(rowAfter.snapshot_date).toBe(rowBefore.snapshot_date);
    expect(Number(rowAfter.pe_ratio)).toBe(Number(rowBefore.pe_ratio));
    expect(Number(rowAfter.pb_ratio)).toBe(Number(rowBefore.pb_ratio));
    expect(Number(rowAfter.roe)).toBe(Number(rowBefore.roe));
    expect(Number(rowAfter.roce)).toBe(Number(rowBefore.roce));
    expect(Number(rowAfter.debt_to_equity)).toBe(Number(rowBefore.debt_to_equity));

    // 8. Assert new columns exist
    expect(rowAfter.period_end).toBe('2026-06-10'); // Backfilled from snapshot_date
    expect(rowAfter.eps).toBeNull(); // Default nullable

    // 9. Assert primary key changed
    // Rerunning insertion with duplicate snapshot_date but different period_end should succeed if primary key is (symbol, period_end)
    await dbAdapter.query(
      `INSERT INTO financial_snapshots (symbol, period_end, snapshot_date, pe_ratio)
       VALUES ($1, $2, $3, $4)`,
      ['TESTUP', '2026-06-11', '2026-06-10', 16.0]
    );
    const fsAfterInsert = await dbAdapter.query('SELECT * FROM financial_snapshots WHERE symbol = $1', ['TESTUP']);
    expect(fsAfterInsert.rows.length).toBe(2);

    // 10. Assert rerunning migration is idempotent
    const status3 = await runner.runPending();
    expect(status3.pendingCount).toBe(0);
  });
});
