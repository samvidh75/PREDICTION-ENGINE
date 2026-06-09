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

// ---------------------------------------------------------------------------
// Mock helpers for runPending call sequence
// ---------------------------------------------------------------------------

function makeRunPendingMocks(
  executeScript: ReturnType<typeof vi.fn>,
  appliedRows: Record<string, unknown>[] = [],
  finalRows: Record<string, unknown>[] = [],
): {
  query: ReturnType<typeof vi.fn>;
  executeScript: ReturnType<typeof vi.fn>;
} {
  const executeScriptFn = executeScript || vi.fn().mockResolvedValue(undefined);

  const query = vi.fn()
    .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 1. ensureTable
    .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 2. ensureTable (from status)
    .mockResolvedValueOnce({ rows: appliedRows, rowCount: appliedRows.length }) // 3. listApplied (status)
    .mockResolvedValueOnce({ rows: appliedRows, rowCount: appliedRows.length }) // 4. listApplied (appliedIds)
    .mockResolvedValueOnce({ rows: [], rowCount: 1 })   // 5. INSERT schema_migrations
    .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 6. ensureTable (final status)
    .mockResolvedValueOnce({ rows: finalRows, rowCount: finalRows.length }); // 7. listApplied (final status)

  return { query, executeScript: executeScriptFn };
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

  it('executeScript called when available', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE test1 (id INTEGER);');

    const executeScript = vi.fn().mockResolvedValueOnce(undefined);
    const { query } = makeRunPendingMocks(executeScript, [], [
      { id: '001_init.sql', checksum: 'abc123', applied_at: '2025-01-01' },
    ]);

    const adapter: MigrationExecutionAdapter = { query, executeScript };
    const runner = new MigrationRunner(adapter, tempDir);
    await runner.runPending();

    expect(executeScript).toHaveBeenCalledTimes(1);
    expect(executeScript).toHaveBeenCalledWith(
      'CREATE TABLE test1 (id INTEGER);'
    );
  });

  it('query fallback used only when executeScript is absent', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE test2 (id INTEGER);');

    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 1. ensureTable
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 2. ensureTable (status)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 3. listApplied (status)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 4. listApplied (appliedIds)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 5. migration query (no executeScript)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })   // 6. INSERT schema_migrations
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 7. ensureTable (final status)
      .mockResolvedValueOnce({  // 8. listApplied (final status)
        rows: [{ id: '001_init.sql', checksum: 'abc', applied_at: '2025-01-01' }],
        rowCount: 1,
      });

    const adapter: MigrationExecutionAdapter = { query };
    const runner = new MigrationRunner(adapter, tempDir);
    await runner.runPending();

    const sqlCalls = query.mock.calls as unknown[][];
    const migrationCall = sqlCalls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).includes('CREATE TABLE test2')
    );
    expect(migrationCall).toBeDefined();
  });

  it('first run applies pending migration', async () => {
    writeMigration(
      tempDir,
      '001_init.sql',
      'CREATE TABLE users (id INTEGER PRIMARY KEY);'
    );

    const executeScript = vi.fn().mockResolvedValueOnce(undefined);
    const { query } = makeRunPendingMocks(executeScript, [], [
      {
        id: '001_init.sql',
        checksum: expect.any(String) as unknown as string,
        applied_at: expect.any(String) as unknown as string,
      },
    ]);

    const adapter: MigrationExecutionAdapter = { query, executeScript };
    const runner = new MigrationRunner(adapter, tempDir);
    const result = await runner.runPending();

    expect(result.appliedCount).toBe(1);
    expect(result.pendingCount).toBe(0);
    expect(result.checksumMismatch).toBe(false);
    expect(result.ready).toBe(true);
  });

  it('second run skips applied migration', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE data (id INTEGER);');

    const appliedRows = [
      { id: '001_init.sql', checksum: 'abc', applied_at: '2025-01-01' },
    ];

    const executeScript = vi.fn();
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 1. ensureTable
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 2. ensureTable (status)
      .mockResolvedValueOnce({ rows: appliedRows, rowCount: 1 }) // 3. listApplied (status)
      .mockResolvedValueOnce({ rows: appliedRows, rowCount: 1 }) // 4. listApplied (appliedIds)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // 5. ensureTable (final status) — no INSERT / no exec
      .mockResolvedValueOnce({ rows: appliedRows, rowCount: 1 }); // 6. listApplied (final status)

    const adapter: MigrationExecutionAdapter = { query, executeScript };
    const runner = new MigrationRunner(adapter, tempDir);
    const result = await runner.runPending();

    expect(result.appliedCount).toBe(1);
    expect(result.pendingCount).toBe(0);
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('checksum mismatch throws', async () => {
    writeMigration(
      tempDir,
      '001_init.sql',
      'CREATE TABLE changed (id INTEGER);'
    );

    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // ensureTable (status)
      .mockResolvedValueOnce({
        rows: [
          {
            id: '001_init.sql',
            checksum: 'DIFFERENT_CHECKSUM',
            applied_at: '2025-01-01',
          },
        ],
        rowCount: 1,
      });

    const adapter: MigrationExecutionAdapter = { query };
    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow(/checksum mismatch/i);
  });

  it('DB inspection failure throws (listApplied fails)', async () => {
    writeMigration(tempDir, '001_init.sql', 'CREATE TABLE y (id INTEGER);');

    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // ensureTable
      .mockRejectedValueOnce(new Error('SQLITE_ERROR: no such table: schema_migrations'));

    const adapter: MigrationExecutionAdapter = { query };
    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow();
  });

  it('invalid SQL is not recorded as applied', async () => {
    writeMigration(tempDir, '001_bad.sql', 'NOT VALID SQL AT ALL;');

    const executeScript = vi.fn().mockRejectedValueOnce(
      new Error('SQLITE_ERROR: near "NOT": syntax error')
    );
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // ensureTable
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // ensureTable (status)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // listApplied (status)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // listApplied (appliedIds)

    const adapter: MigrationExecutionAdapter = { query, executeScript };
    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow(
      /Migration "001_bad.sql" failed/
    );

    const queryCalls = query.mock.calls as unknown[][];
    const insertCall = queryCalls.find(
      (c) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('INSERT INTO schema_migrations')
    );
    expect(insertCall).toBeUndefined();
  });

  it('thrown error includes migration filename', async () => {
    writeMigration(tempDir, '002_critical.sql', 'THIS IS BROKEN SQL;');

    const executeScript = vi.fn().mockRejectedValueOnce(
      new Error('syntax error near THIS')
    );
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // ensureTable
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // ensureTable (status)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })   // listApplied (status)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // listApplied (appliedIds)

    const adapter: MigrationExecutionAdapter = { query, executeScript };
    const runner = new MigrationRunner(adapter, tempDir);
    await expect(runner.runPending()).rejects.toThrow(/002_critical\.sql/);
  });
});
