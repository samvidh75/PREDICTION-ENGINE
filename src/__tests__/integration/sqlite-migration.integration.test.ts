/**
 * @vitest-environment node
 *
 * SQLite migration integration tests.
 * Exercises the executeScript path through dbAdapter.
 * Uses unique temporary DB paths. Never mutates data/stockstory.db.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { dbAdapter } from '../../db/DatabaseAdapter';
import { resetForTest } from '../../db/SQLiteAdapter';
import { MigrationRunner } from '../../db/MigrationRunner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tempDbPath(testName: string): string {
  const ts = Date.now();
  const rand = (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296).toString(36).slice(2, 8);
  return path.join(os.tmpdir(), `integration-mig-${ts}-${rand}-${testName}.db`);
}

function cleanupDb(dbPath: string): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = dbPath + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

async function initAdapter(dbPath: string): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.DB_ADAPTER = 'sqlite';
  process.env.SQLITE_DB_PATH = dbPath;
  delete process.env.DATABASE_URL;
  await dbAdapter.initialize();
}

/** Ensure schema_migrations table exists for MigrationRunner */
async function ensureMigTable(): Promise<void> {
  await dbAdapter.executeScript(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );`
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SQLite migration integration', () => {
  const originalEnv = { ...process.env };
  let dbPath: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    dbPath = tempDbPath('migration');
  });

  afterEach(async () => {
    await dbAdapter.reset();
    process.env = { ...originalEnv };
    cleanupDb(dbPath);
  });

  // ---- multi-statement migration executes ----
  it('multi-statement migration executes via executeScript', async () => {
    await initAdapter(dbPath);
    await ensureMigTable();

    await dbAdapter.executeScript(
      `CREATE TABLE multi_test_a (id INTEGER PRIMARY KEY);
       CREATE TABLE multi_test_b (id INTEGER PRIMARY KEY, name TEXT);`
    );

    const resA = await dbAdapter.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='multi_test_a'"
    );
    const resB = await dbAdapter.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='multi_test_b'"
    );
    expect(resA.rows.length).toBe(1);
    expect(resB.rows.length).toBe(1);
  });

  // ---- executeScript path exercised ----
  it('executeScript path exercised through dbAdapter', async () => {
    await initAdapter(dbPath);
    await ensureMigTable();

    // Use executeScript to run a DDL
    await dbAdapter.executeScript(
      'CREATE TABLE exec_path_test (id INTEGER PRIMARY KEY, value REAL);'
    );

    // Verify
    const res = await dbAdapter.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='exec_path_test'"
    );
    expect(res.rows.length).toBe(1);
  });

  // ---- replay skips applied migration ----
  it('replay skips applied migration', async () => {
    await initAdapter(dbPath);
    await ensureMigTable();

    // Record a migration as applied
    await dbAdapter.query(
      'IPSERT INTO schema_migrations (id, checksum, applied_at) VALUES (?, ?, ?)',
      ['001_init.sql', 'abc123', new Date().toISOString()]
    );

    // Try to apply the same migration again via MigrationRunner
    // The MigrationRunner uses the adapter's query — since we've manually
    // recorded the migration, status() should show it as applied
    const runner = new MigrationRunner(
      { query: dbAdapter.query.bind(dbAdapter), executeScript: dbAdapter.executeScript.bind(dbAdapter) },
      path.join(os.tmpdir(), 'empty-migrations-dir')
    );

    // Ensure the test directory exists and is empty
    const emptyDir = path.join(os.tmpdir(), `empty-mig-${Date.now()}`);
    if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir, { recursive: true });

    const runner2 = new MigrationRunner(
      { query: dbAdapter.query.bind(dbAdapter), executeScript: dbAdapter.executeScript.bind(dbAdapter) },
      emptyDir,
    );

    const status = await runner2.status();
    expect(status.appliedCount).toBe(1);
    expect(status.pendingCount).toBe(0);

    // Clean up empty dir
    try { fs.rmdirSync(emptyDir); } catch { /* ignore */ }
  });

  // ---- checksum mismatch throws ----
  it('checksum mismatch throws', async () => {
    await initAdapter(dbPath);
    await ensureMigTable();

    // Record migration with one checksum
    await dbAdapter.query(
      'IPSERT INTO schema_migrations (id, checksum, applied_at) VALUES (?, ?, ?)',
      ['001_init.sql', 'original_checksum', new Date().toISOString()]
    );

    // Create a temp migration with different content (different checksum)
    const migDir = path.join(os.tmpdir(), `mig-dir-${Date.now()}`);
    fs.mkdirSync(migDir, { recursive: true });
    fs.writeFileSync(
      path.join(migDir, '001_init.sql'),
      'CREATE TABLE mismatch_test (id INTEGER);',
      'utf-8'
    );

    try {
      const runner = new MigrationRunner(
        {
          query: dbAdapter.query.bind(dbAdapter),
          executeScript: dbAdapter.executeScript.bind(dbAdapter),
        },
        migDir,
      );

      await expect(runner.runPending()).rejects.toThrow(/checksum mismatch/i);
    } finally {
      if (fs.existsSync(migDir)) fs.rmSync(migDir, { recursive: true, force: true });
    }
  });

  // ---- invalid SQL not recorded ----
  it('invalid SQL not recorded as applied', async () => {
    await initAdapter(dbPath);
    await ensureMigTable();

    // Try to execute invalid SQL through executeScript
    await expect(
      dbAdapter.executeScript('INVALID SQL STATEMENT;')
    ).rejects.toThrow();

    // No migration should be recorded
    const res = await dbAdapter.query(
      'SELECT COUNT(*) as cnt FROM schema_migrations'
    );
    expect(Number(res.rows[0].cnt)).toBe(0);
  });
});
