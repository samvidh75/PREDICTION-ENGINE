/**
 * @vitest-environment node
 *
 * Unit tests for MigrationRunner.
 * Uses temporary migration directories and mock adapters.
 * Never touches a real database.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { MigrationRunner } from '../MigrationRunner';
import type { MigrationExecutionAdapter } from '../MigrationRunner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = path.join(
    os.tmpdir(),
    `migration-test-${Date.now()}-${(globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296).toString(36).slice(2)}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeMigration(dir: string, filename: string, sql: string): void {
  fs.writeFileSync(path.join(dir, filename), sql, 'utf-8');
}

/**
 * Creates a mock adapter that tracks applied migrations in-memory.
 */
function mockAdapterTracked(
  preApplied: Array<{ id: string; checksum: string; applied_at: string }> = [],
  execScriptImpl?: (sql: string) => Promise<void>,
): MigrationExecutionAdapter {
  const applied = [...preApplied];
  const queryFn = vi.fn((text: string, params?: unknown[]) => {
    const sql = text as string;
    // listApplied SELECT
    if (sql.includes('SELECT id, checksum, applied_at')) {
      return Promise.resolve({
        rows: applied.map((r) => ({ ...r })),
        rowCount: applied.length,
      });
    }
    // Track INSERTs
    if (sql.includes('INSERT INTO schema_migrations') && Array.isArray(params) && params.length >= 3) {
      applied.push({
        id: String(params[0]),
        checksum: String(params[1]),
        applied_at: String(params[2]),
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  }) as MigrationExecutionAdapter['query'];

  return { query: queryFn, executeScript: execScriptImpl };
}

function mockAdapter(execScriptImpl?: (sql: string) => Promise<void>): MigrationExecutionAdapter {
  return mockAdapterTracked([], execScriptImpl);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MigrationRunner', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tempDir);
  });

  // ---- executeScript called when available ----
  it('executeScript called when available', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE test1 (id INTEGER);');

    const executeScript = vi.fn().mockResolvedValue(undefined);
    const adapter = mockAdapter(executeScript);
    const runner = new MigrationRunner(adapter, tempDir);

    await runner.runPending();

    expect(executeScript).toHaveBeenCalledTimes(1);
    expect(executeScript).toHaveBeenCalledWith('CREATE TABLE test1 (id INTEGER);');
  });

  // ---- query fallback used only when executeScript is absent ----
  it('query fallback used only when executeScript is absent', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE test2 (id INTEGER);');

    const adapter = mockAdapter(undefined);
    const runner = new MigrationRunner(adapter, tempDir);

    await runner.runPending();

    const calls = (adapter.query as ReturnType<typeof vi.fn>).mock.calls;
    const migrationCall = calls.find(
      (c: unknown[]) => c[0] === 'CREATE TABLE test2 (id INTEGER);',
    );
    expect(migrationCall).toBeDefined();
  });

  // ---- first run applies pending migration ----
  it('first run applies pending migration', async () => {
    const sql = 'CREATE TABLE users (id INTEGER PRIMARY KEY);';
    writeMigration(tempDir, '001_init.sql', sql);

    const executeScript = vi.fn().mockResolvedValue(undefined);
    const adapter = mockAdapter(executeScript);
    const runner = new MigrationRunner(adapter, tempDir);

    const result = await runner.runPending();

    // Verify the migration was applied by querying directly
    const applied = await runner.listApplied();
    expect(applied.length).toBe(1);
    expect(applied[0].id).toBe('001_init.sql');
    expect(result.appliedCount).toBe(1);
    expect(result.pendingCount).toBe(0);
    expect(result.checksumMismatch).toBe(false);
    expect(result.ready).toBe(true);
  });

  // ---- second run skips applied migration ----
  it('second run skips applied migration', async () => {
    const sql = 'CREATE TABLE data (id INTEGER);';
    writeMigration(tempDir, '001_init.sql', sql);

    const checksum = createHash('sha256').update(sql).digest('hex').slice(0, 16);

    const executeScript = vi.fn().mockResolvedValue(undefined);
    const adapter = mockAdapterTracked(
      [{ id: '001_init.sql', checksum, applied_at: '2025-01-01T00:00:00.000Z' }],
      executeScript,
    );
    const runner = new MigrationRunner(adapter, tempDir);

    const result = await runner.runPending();

    expect(result.appliedCount).toBe(1);
    expect(result.pendingCount).toBe(0);
    expect(executeScript).not.toHaveBeenCalled();
  });

  // ---- checksum mismatch throws ----
  it('checksum mismatch throws', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE changed (id INTEGER);');

    const executeScript = vi.fn().mockResolvedValue(undefined);
    const adapter = mockAdapterTracked(
      [{ id: '001_init.sql', checksum: 'WRONG_CHECKSUM', applied_at: '2025-01-01T00:00:00.000Z' }],
      executeScript,
    );
    const runner = new MigrationRunner(adapter, tempDir);

    await expect(runner.runPending()).rejects.toThrow(/checksum mismatch/i);
  });

  // ---- DB inspection failure throws ----
  it('DB inspection failure throws (listApplied fails)', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE y (id INTEGER);');

    const adapter: MigrationExecutionAdapter = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ensureTable
        .mockRejectedValueOnce(new Error('SQLITE_ERROR: no such table: schema_migrations')),
    };

    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow();
  });

  // ---- invalid SQL is not recorded as applied ----
  it('invalid SQL is not recorded as applied', async () => {
    writeMigration(tempDir, '001_bad.sql', 'NOT VALID SQL AT ALL;');

    const adapter = mockAdapter(
      vi.fn().mockRejectedValue(new Error('SQLITE_ERROR: near "NOT": syntax error')),
    );

    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow(/Migration "001_bad.sql" failed/);

    const calls = (adapter.query as ReturnType<typeof vi.fn>).mock.calls;
    const insertCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO schema_migrations'),
    );
    expect(insertCall).toBeUndefined();
  });

  // ---- thrown error includes migration filename ----
  it('thrown error includes migration filename', async () => {
    writeMigration(tempDir, '002_critical.sql', 'THIS IS BROKEN SQL;');

    const adapter = mockAdapter(
      vi.fn().mockRejectedValue(new Error('syntax error near THIS')),
    );

    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow(/002_critical\.sql/);
  });
});
