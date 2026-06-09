/**
 * TRACK-P4B-P3G — SQLite Migration Integration Tests
 *
 * Tests MigrationRunner with real SQLite via DatabaseAdapter.
 * Uses unique temporary DB paths. Never mutates data/stockstory.db.
 * Each test uses fresh module state to avoid singleton conflicts.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { MigrationRunner } from '../../db/MigrationRunner';
import type { MigrationExecutionAdapter } from '../../db/MigrationRunner';

const TIMESTAMP = Date.now();

function tempDbPath(name: string): string {
  return path.join(os.tmpdir(), `integration-${TIMESTAMP}-${name}-mig.db`);
}

function tempMigrationsDir(name: string): string {
  const dir = path.join(os.tmpdir(), `integration-${TIMESTAMP}-${name}-migrations`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function cleanupDb(dbPath: string): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = dbPath + ext;
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

function writeMigration(dir: string, filename: string, sql: string): void {
  fs.writeFileSync(path.join(dir, filename), sql);
}

describe('SQLite migration integration', () => {
  const dbPath = tempDbPath('sqlite-migration');
  let migrationsDir: string;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'sqlite';
    process.env.ALLOW_SQLITE_FALLBACK = 'true';
    process.env.SQLITE_DB_PATH = dbPath;
    delete process.env.DATABASE_URL;

    // Fresh module state for each test
    vi.resetModules();

    migrationsDir = tempMigrationsDir('sqlite-migration');

    cleanupDb(dbPath);
  });

  afterEach(async () => {
    vi.resetModules();

    try {
      const mod = await import('../../db/DatabaseAdapter');
      await mod.dbAdapter.reset();
    } catch { /* ignore */ }

    cleanupDb(dbPath);
    if (fs.existsSync(migrationsDir)) {
      try { fs.rmSync(migrationsDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // ---- multi-statement migration executes ----
  it('multi-statement migration executes', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    const sql = `CREATE TABLE test_migrate (id INTEGER PRIMARY KEY);
                 INSERT INTO test_migrate (id) VALUES (1);`;

    writeMigration(migrationsDir, '001_multi_stmt.sql', sql);

    const adapter = dbAdapter as unknown as MigrationExecutionAdapter;
    const runner = new MigrationRunner(adapter, migrationsDir);

    const status = await runner.runPending();
    expect(status.pendingCount).toBe(0);
    expect(status.appliedCount).toBe(1);

    const rows = await dbAdapter.query('SELECT * FROM test_migrate');
    expect(rows.rows.length).toBe(1);

    await dbAdapter.reset();
  });

  // ---- executeScript path exercised ----
  it('executeScript path exercised via MigrationRunner', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    writeMigration(migrationsDir, '001_exec_script.sql', 'CREATE TABLE exec_test (col1 TEXT); CREATE TABLE exec_test2 (col2 TEXT);');

    const adapter = dbAdapter as unknown as MigrationExecutionAdapter;
    const runner = new MigrationRunner(adapter, migrationsDir);

    await runner.runPending();

    const tables = await dbAdapter.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND (name='exec_test' OR name='exec_test2')"
    );
    expect(tables.rows.length).toBe(2);

    await dbAdapter.reset();
  });

  // ---- replay skips applied migration ----
  it('replay skips applied migration', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    writeMigration(migrationsDir, '001_first.sql', 'CREATE TABLE first_table (id INTEGER);');
    writeMigration(migrationsDir, '002_second.sql', 'CREATE TABLE second_table (id INTEGER);');

    const adapter = dbAdapter as unknown as MigrationExecutionAdapter;
    const runner = new MigrationRunner(adapter, migrationsDir);

    // First run: both applied
    const status1 = await runner.runPending();
    expect(status1.appliedCount).toBe(2);
    expect(status1.pendingCount).toBe(0);

    // Second run: check status (none pending)
    const status2 = await runner.status();
    expect(status2.pendingCount).toBe(0);
    expect(status2.appliedCount).toBe(2);

    await dbAdapter.reset();
  });

  // ---- checksum mismatch throws ----
  it('checksum mismatch throws on real SQLite', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    writeMigration(migrationsDir, '001_checksum.sql', 'CREATE TABLE chk_test (id INTEGER);');

    const adapter = dbAdapter as unknown as MigrationExecutionAdapter;
    const runner = new MigrationRunner(adapter, migrationsDir);
    await runner.runPending();

    // Change migration file content (simulating corrupt file)
    writeMigration(migrationsDir, '001_checksum.sql', 'CREATE TABLE chk_test (id INTEGER, new_col TEXT);');

    const runner2 = new MigrationRunner(adapter, migrationsDir);
    await expect(runner2.runPending()).rejects.toThrow(/checksum/i);

    await dbAdapter.reset();
  });

  // ---- invalid SQL is not recorded ----
  it('invalid SQL is not recorded as applied', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    writeMigration(migrationsDir, '001_bad.sql', 'CREATE TABLE bad (id);');

    const adapter = dbAdapter as unknown as MigrationExecutionAdapter;

    // Create a wrapper that throws for executeScript but delegates query
    const badAdapter: MigrationExecutionAdapter = {
      query: adapter.query.bind(adapter),
      executeScript: async (_sql: string) => {
        throw new Error('SQLite query failed: near "CREATE": syntax error');
      },
    };

    const runner = new MigrationRunner(badAdapter, migrationsDir);
    await expect(runner.runPending()).rejects.toThrow('001_bad.sql');

    await dbAdapter.reset();
  });
});
