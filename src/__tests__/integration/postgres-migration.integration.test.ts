/**
 * @vitest-environment node
 *
 * PostgreSQL migration integration tests.
 * Requires: DATABASE_URL, DB_ADAPTER=postgres, ALLOW_SQLITE_FALLBACK=false.
 * Tests MigrationRunner with real PostgreSQL.
 * Uses deterministic cleanup — drops test tables/migrations, never drops the database.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { dbAdapter } from '../../db/DatabaseAdapter';
import { MigrationRunner } from '../../db/MigrationRunner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasPostgres(): boolean {
  return !!process.env.DATABASE_URL;
}

const skipIfNoPg = hasPostgres() ? it : it.skip;

/** Create a temporary directory with migration files */
function createTempMigDir(migrations: { id: string; sql: string }[]): string {
  const dir = path.join(os.tmpdir(), `pg-mig-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  fs.mkdirSync(dir, { recursive: true });
  for (const m of migrations) {
    fs.writeFileSync(path.join(dir, m.id), m.sql, 'utf-8');
  }
  return dir;
}

async function cleanupMigTable(): Promise<void> {
  try {
    await dbAdapter.query('DROP TABLE IF EXISTS schema_migrations');
  } catch { /* ignore */ }
}

async function cleanupTestTables(): Promise<void> {
  for (const tbl of ['mig_test_a', 'mig_test_b', 'mig_test_001']) {
    try {
      await dbAdapter.query(`DROP TABLE IF EXISTS ${tbl}`);
    } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PostgreSQL migration integration', () => {
  const originalEnv = { ...process.env };
  const tempDirs: string[] = [];

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('[postgres-migration test] DATABASE_URL not set — skipping PostgreSQL tests');
    }
  });

  beforeEach(async () => {
    process.env = { ...originalEnv };
    await cleanupTestTables();
  });

  afterAll(async () => {
    await cleanupTestTables();
    await cleanupMigTable();
    await dbAdapter.reset();
    // Clean up temp dirs
    for (const d of tempDirs) {
      try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    process.env = { ...originalEnv };
  });

  // ---- schema_migrations table exists ----
  skipIfNoPg('schema_migrations table exists after ensureTable', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    const migDir = createTempMigDir([]);
    tempDirs.push(migDir);

    const runner = new MigrationRunner(dbAdapter, migDir);
    await runner.ensureTable();

    const res = await dbAdapter.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'schema_migrations'"
    );
    expect(res.rows.length).toBe(1);
  });

  // ---- first migration run applies pending migrations ----
  skipIfNoPg('first migration run applies pending migrations', async () => {
    await cleanupMigTable();
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    const migDir = createTempMigDir([
      { id: '001_init.sql', sql: 'CREATE TABLE mig_test_001 (id SERIAL PRIMARY KEY, name TEXT);' },
    ]);
    tempDirs.push(migDir);

    const runner = new MigrationRunner(dbAdapter, migDir);
    const status = await runner.runPending();

    expect(status.appliedCount).toBe(1);
    expect(status.pendingCount).toBe(0);

    // Verify table exists
    const res = await dbAdapter.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'mig_test_001'"
    );
    expect(res.rows.length).toBe(1);
  });

  // ---- second migration run is idempotent ----
  skipIfNoPg('second migration run is idempotent', async () => {
    await cleanupMigTable();
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    const migDir = createTempMigDir([
      { id: '001_init.sql', sql: 'CREATE TABLE mig_test_a (id SERIAL PRIMARY KEY);' },
    ]);
    tempDirs.push(migDir);

    const runner = new MigrationRunner(dbAdapter, migDir);

    // First run
    const s1 = await runner.runPending();
    expect(s1.appliedCount).toBe(1);

    // Second run — same migration, should skip
    const s2 = await runner.runPending();
    expect(s2.appliedCount).toBe(1);
    expect(s2.pendingCount).toBe(0);
  });

  // ---- deterministic migration order ----
  skipIfNoPg('deterministic migration order', async () => {
    await cleanupMigTable();
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    const migDir = createTempMigDir([
      { id: '001_a.sql', sql: 'CREATE TABLE mig_test_a (id SERIAL PRIMARY KEY);' },
      { id: '002_b.sql', sql: 'CREATE TABLE mig_test_b (id SERIAL PRIMARY KEY);' },
    ]);
    tempDirs.push(migDir);

    const runner = new MigrationRunner(dbAdapter, migDir);
    const status = await runner.runPending();

    // Both should be applied
    expect(status.appliedCount).toBe(2);
    // Last applied should be 002
    expect(status.latestAppliedId).toBe('002_b.sql');
  });

  // ---- checksum mismatch fails loudly ----
  skipIfNoPg('checksum mismatch fails loudly', async () => {
    await cleanupMigTable();
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    // Create migration with one content
    const migDir = createTempMigDir([
      { id: '001_init.sql', sql: 'CREATE TABLE mig_test_a (id SERIAL PRIMARY KEY, col_a INTEGER);' },
    ]);
    tempDirs.push(migDir);

    // Apply it
    const runner1 = new MigrationRunner(dbAdapter, migDir);
    await runner1.runPending();

    // Now overwrite the file with different content (different checksum)
    fs.writeFileSync(
      path.join(migDir, '001_init.sql'),
      'CREATE TABLE mig_test_a (id SERIAL PRIMARY KEY, col_b TEXT);',
      'utf-8'
    );

    // Run again — should detect checksum mismatch
    const runner2 = new MigrationRunner(dbAdapter, migDir);
    await expect(runner2.runPending()).rejects.toThrow(/checksum mismatch/i);
  });

  // ---- failed SQL is never recorded as applied ----
  skipIfNoPg('failed SQL is never recorded as applied', async () => {
    await cleanupMigTable();
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    // Create a migration with invalid SQL after a valid one
    const migDir = createTempMigDir([
      { id: '001_valid.sql', sql: 'CREATE TABLE mig_test_a (id SERIAL PRIMARY KEY);' },
      { id: '002_broken.sql', sql: 'THIS IS NOT VALID SQL;' },
    ]);
    tempDirs.push(migDir);

    const runner = new MigrationRunner(dbAdapter, migDir);
    await expect(runner.runPending()).rejects.toThrow();

    // Only the first (valid) migration should be applied
    const runner2 = new MigrationRunner(dbAdapter, migDir);
    const status = await runner2.status();
    expect(status.appliedCount).toBe(1);
    expect(status.latestAppliedId).toBe('001_valid.sql');
    // 002_broken should NOT be recorded
    expect(status.pendingCount).toBe(1);
  });
});
