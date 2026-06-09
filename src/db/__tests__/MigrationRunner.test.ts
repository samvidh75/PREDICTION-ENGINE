/**
 * @vitest-environment node
 *
 * Unit tests for MigrationRunner.
 * Uses temporary migration directories and mock adapters.
 * Never touches a real database.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    `migration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
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

function makeMockAdapter(
  overrides: Partial<MigrationExecutionAdapter> = {}
): MigrationExecutionAdapter {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    ...overrides,
  };
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
    const adapter = makeMockAdapter({
      executeScript,
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ id: '001_init.sql', checksum: 'abc', applied_at: 'now' }],
          rowCount: 1,
        }),
    });

    const runner = new MigrationRunner(adapter, tempDir);
    await runner.runPending();

    expect(executeScript).toHaveBeenCalledTimes(1);
    expect(executeScript).toHaveBeenCalledWith(
      'CREATE TABLE test1 (id INTEGER);'
    );
  });

  // ---- query fallback used only when executeScript is absent ----
  it('query fallback used only when executeScript is absent', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE test2 (id INTEGER);');

    const adapter = makeMockAdapter({
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ id: '001_init.sql', checksum: 'abc', applied_at: 'now' }],
          rowCount: 1,
        }),
    });

    const runner = new MigrationRunner(adapter, tempDir);
    await runner.runPending();

    const sqlCalls = (adapter.query as ReturnType<typeof vi.fn>).mock.calls;
    const migrationCall = sqlCalls.find(
      (c: unknown[]) => c[0] === 'CREATE TABLE test2 (id INTEGER);'
    );
    expect(migrationCall).toBeDefined();
  });

  // ---- first run applies pending migration ----
  it('first run applies pending migration', async () => {
    writeMigration(
      tempDir,
      '001_init.sql',
      'CREATE TABLE users (id INTEGER PRIMARY KEY);'
    );

    const adapter = makeMockAdapter({
      executeScript: vi.fn().mockResolvedValue(undefined),
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '001_init.sql',
              checksum: 'test-checksum',
              applied_at: '2025-01-01',
            },
          ],
          rowCount: 1,
        }),
    });

    const runner = new MigrationRunner(adapter, tempDir);
    const result = await runner.runPending();

    expect(result.latestAppliedId).toBe('001_init.sql');
    expect(result.appliedCount).toBe(1);
    expect(result.pendingCount).toBe(0);
    expect(result.checksumMismatch).toBe(false);
    expect(result.ready).toBe(true);
  });

  // ---- second run skips applied migration ----
  it('second run skips applied migration', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE data (id INTEGER);');

    const adapter = makeMockAdapter({
      executeScript: vi.fn().mockResolvedValue(undefined),
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: '001_init.sql',
              checksum: 'abc123',
              applied_at: '2025-01-01',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '001_init.sql',
              checksum: 'abc123',
              applied_at: '2025-01-01',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '001_init.sql',
              checksum: 'abc123',
              applied_at: '2025-01-01',
            },
          ],
          rowCount: 1,
        }),
    });

    const runner = new MigrationRunner(adapter, tempDir);
    const result = await runner.runPending();

    expect(result.appliedCount).toBe(1);
    expect(result.pendingCount).toBe(0);
    expect(adapter.executeScript).not.toHaveBeenCalled();
  });

  // ---- checksum mismatch throws ----
  it('checksum mismatch throws', async () => {
    writeMigration(
      tempDir,
      '001_init.sql',
      'CREATE TABLE changed (id INTEGER);'
    );

    const adapter = makeMockAdapter({
      query: vi.fn().mockResolvedValueOnce({
        rows: [
          {
            id: '001_init.sql',
            checksum: 'DIFFERENT_CHECKSUM',
            applied_at: '2025-01-01',
          },
        ],
        rowCount: 1,
      }),
    });

    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow(/checksum mismatch/i);
  });

  // ---- DB inspection failure throws ----
  it('DB inspection failure throws (listApplied fails)', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE y (id INTEGER);');

    const adapter = makeMockAdapter({
      query: vi
        .fn()
        .mockRejectedValueOnce(
          new Error('SQLITE_ERROR: no such table: schema_migrations')
        ),
    });

    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow();
  });

  // ---- invalid SQL is not recorded as applied ----
  it('invalid SQL is not recorded as applied', async () => {
    writeMigration(tempDir, '001_bad.sql', 'NOT VALID SQL AT ALL;');

    const adapter = makeMockAdapter({
      executeScript: vi
        .fn()
        .mockRejectedValueOnce(
          new Error('SQLITE_ERROR: near "NOT": syntax error')
        ),
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }),
    });

    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow(
      /Migration "001_bad.sql" failed/
    );

    const queryCalls = (adapter.query as ReturnType<typeof vi.fn>).mock.calls;
    const insertCall = queryCalls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('INSERT INTO schema_migrations')
    );
    expect(insertCall).toBeUndefined();
  });

  // ---- thrown error includes migration filename ----
  it('thrown error includes migration filename', async () => {
    writeMigration(tempDir, '002_critical.sql', 'THIS IS BROKEN SQL;');

    const adapter = makeMockAdapter({
      executeScript: vi
        .fn()
        .mockRejectedValue(new Error('syntax error near THIS')),
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }),
    });

    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow(/002_critical\.sql/);
  });
});
