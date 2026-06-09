/**
 * TRACK-P4B-P3G — MigrationRunner Unit Tests
 *
 * Tests MigrationRunner using temporary directories and mock adapters.
 * No real database connections.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MigrationRunner } from '../MigrationRunner';
import type { MigrationExecutionAdapter } from '../MigrationRunner';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = path.join(os.tmpdir(), `migration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeMigration(dir: string, filename: string, sql: string): void {
  fs.writeFileSync(path.join(dir, filename), sql);
}

function createEmptyQueryMock() {
  return vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MigrationRunner', () => {
  let migrationsDir: string;

  beforeEach(() => {
    migrationsDir = makeTempDir();
  });

  // ---- executeScript called when adapter supports it ----
  it('executeScript called when adapter supports it', async () => {
    const executeScriptImpl = vi.fn().mockResolvedValue(undefined);
    const appliedRows: Array<{ id: string; checksum: string; applied_at: string }> = [];

    const queryImpl = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, checksum, applied_at')) {
        return { rows: appliedRows as unknown as Record<string, unknown>[], rowCount: appliedRows.length };
      }
      if (sql.includes('INSERT INTO schema_migrations')) {
        if (params) {
          appliedRows.push({
            id: params[0] as string,
            checksum: params[1] as string,
            applied_at: params[2] as string,
          });
        }
        return { rows: [], rowCount: 1 };
      }
      // ensureTable CREATE TABLE
      return { rows: [], rowCount: 0 };
    });

    const adapter: MigrationExecutionAdapter = { query: queryImpl, executeScript: executeScriptImpl };

    const sql = 'CREATE TABLE test_table (id INTEGER PRIMARY KEY);';
    writeMigration(migrationsDir, '001_create_test.sql', sql);

    const runner = new MigrationRunner(adapter, migrationsDir);
    await runner.runPending();

    // executeScript should have been called with the migration SQL
    expect(executeScriptImpl).toHaveBeenCalled();
    // At least one call should contain the migration SQL
    const calls = executeScriptImpl.mock.calls;
    const found = calls.some((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('CREATE TABLE test_table'));
    expect(found).toBe(true);
  });

  // ---- query fallback used only when executeScript is absent ----
  it('query fallback used only when executeScript is absent', async () => {
    const appliedRows: Array<{ id: string; checksum: string; applied_at: string }> = [];
    const migratedSqls: string[] = [];

    const queryImpl = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, checksum, applied_at')) {
        return { rows: appliedRows as unknown as Record<string, unknown>[], rowCount: appliedRows.length };
      }
      if (sql.includes('INSERT INTO schema_migrations')) {
        if (params) {
          appliedRows.push({
            id: params[0] as string,
            checksum: params[1] as string,
            applied_at: params[2] as string,
          });
        }
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('CREATE TABLE') || sql.includes('ALTER TABLE') || sql.includes('SELECT 1')) {
        migratedSqls.push(sql);
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    });

    // No executeScript — query fallback
    const adapter: MigrationExecutionAdapter = { query: queryImpl };

    const sql = 'CREATE TABLE test_table (id INTEGER PRIMARY KEY);';
    writeMigration(migrationsDir, '001_create_test.sql', sql);

    const runner = new MigrationRunner(adapter, migrationsDir);
    await runner.runPending();

    // At least one migrated SQL should contain the migration
    const migrationCall = migratedSqls.find(s => s.includes('CREATE TABLE test_table'));
    expect(migrationCall).toBeDefined();
  });

  // ---- first run applies pending migration ----
  it('first run applies pending migration', async () => {
    const appliedRows: Array<{ id: string; checksum: string; applied_at: string }> = [];

    const queryImpl = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, checksum, applied_at')) {
        return { rows: appliedRows as unknown as Record<string, unknown>[], rowCount: appliedRows.length };
      }
      if (sql.includes('INSERT INTO schema_migrations')) {
        if (params) {
          appliedRows.push({
            id: params[0] as string,
            checksum: params[1] as string,
            applied_at: params[2] as string,
          });
        }
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    const adapter: MigrationExecutionAdapter = { query: queryImpl };

    writeMigration(migrationsDir, '001_create_table.sql', 'CREATE TABLE test_t (id INTEGER PRIMARY KEY);');

    const runner = new MigrationRunner(adapter, migrationsDir);
    const result = await runner.runPending();

    expect(result.pendingCount).toBe(0);
    expect(appliedRows.length).toBe(1);
    expect(appliedRows[0].id).toBe('001_create_table.sql');
  });

  // ---- second run skips already-applied migration ----
  it('second run skips already-applied migration', async () => {
    const sql1 = 'CREATE TABLE t1 (id INTEGER);';
    writeMigration(migrationsDir, '001_first.sql', sql1);
    writeMigration(migrationsDir, '002_second.sql', 'CREATE TABLE t2 (id INTEGER);');

    // Compute the correct checksum for the first migration
    const crypto = await import('crypto');
    const correctChecksum = crypto.createHash('sha256').update(sql1).digest('hex').slice(0, 16);

    const appliedRows: Array<{ id: string; checksum: string; applied_at: string }> = [
      { id: '001_first.sql', checksum: correctChecksum, applied_at: '2025-01-01T00:00:00.000Z' },
    ];

    const migratedSqls: string[] = [];
    const queryImpl = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, checksum, applied_at')) {
        return { rows: appliedRows as unknown as Record<string, unknown>[], rowCount: appliedRows.length };
      }
      if (sql.includes('INSERT INTO schema_migrations')) {
        if (params) {
          appliedRows.push({
            id: params[0] as string,
            checksum: params[1] as string,
            applied_at: params[2] as string,
          });
        }
        return { rows: [], rowCount: 1 };
      }
      if (/CREATE TABLE/i.test(sql)) {
        migratedSqls.push(sql);
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    });

    const adapter: MigrationExecutionAdapter = { query: queryImpl };

    const runner = new MigrationRunner(adapter, migrationsDir);
    await runner.runPending();

    // Only 002 should have been migrated
    const migrated = migratedSqls.filter(s => s.includes('002') || s.includes('t2'));
    expect(migrated.length).toBe(1);
    expect(appliedRows.map(r => r.id)).toContain('001_first.sql');
    expect(appliedRows.map(r => r.id)).toContain('002_second.sql');
  });

  // ---- checksum mismatch throws ----
  it('checksum mismatch throws', async () => {
    writeMigration(migrationsDir, '001_init.sql', 'CREATE TABLE test_table (id INTEGER PRIMARY KEY);');

    const appliedRows: Array<{ id: string; checksum: string; applied_at: string }> = [
      { id: '001_init.sql', checksum: 'deadbeef_wrong', applied_at: '2025-01-01T00:00:00.000Z' },
    ];

    const queryImpl = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id, checksum, applied_at')) {
        return { rows: appliedRows as unknown as Record<string, unknown>[], rowCount: appliedRows.length };
      }
      return { rows: [], rowCount: 0 };
    });

    const adapter: MigrationExecutionAdapter = { query: queryImpl };
    const runner = new MigrationRunner(adapter, migrationsDir);

    await expect(runner.runPending()).rejects.toThrow(/checksum mismatch/i);
  });

  // ---- DB inspection failure throws ----
  it('DB inspection failure throws', async () => {
    const queryImpl = vi.fn().mockRejectedValue(new Error('Connection refused'));
    const adapter: MigrationExecutionAdapter = { query: queryImpl };
    const runner = new MigrationRunner(adapter, migrationsDir);

    // status() calls ensureTable() which calls query — should throw
    await expect(runner.status()).rejects.toThrow('Connection refused');
  });

  // ---- invalid SQL is not recorded as applied ----
  it('invalid SQL is not recorded as applied', async () => {
    writeMigration(migrationsDir, '001_bad_sql.sql', 'INVALID SQL SYNTAX !!!');

    const appliedMigrations: string[] = [];
    const queryImpl = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, checksum, applied_at')) {
        return {
          rows: appliedMigrations.map(id => ({ id, checksum: 'abc', applied_at: '2025-01-01' })),
          rowCount: appliedMigrations.length,
        };
      }
      if (sql.includes('INSERT INTO schema_migrations')) {
        if (params) appliedMigrations.push(params[0] as string);
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('INVALID')) {
        throw new Error('SQLite query failed: near "INVALID": syntax error');
      }
      return { rows: [], rowCount: 0 };
    });

    const adapter: MigrationExecutionAdapter = { query: queryImpl };

    const runner = new MigrationRunner(adapter, migrationsDir);
    await expect(runner.runPending()).rejects.toThrow(/001_bad_sql/);

    // The bad migration should NOT be recorded as applied
    expect(appliedMigrations).not.toContain('001_bad_sql.sql');
  });

  // ---- thrown error contains migration filename ----
  it('thrown error contains migration filename', async () => {
    writeMigration(migrationsDir, '005_complex.sql', 'CREATE TABLE; -- incomplete');

    const appliedRows: Array<{ id: string; checksum: string; applied_at: string }> = [];

    const queryImpl = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, checksum, applied_at')) {
        return { rows: appliedRows as unknown as Record<string, unknown>[], rowCount: appliedRows.length };
      }
      if (sql.includes('INSERT INTO schema_migrations')) {
        if (params) {
          appliedRows.push({
            id: params[0] as string,
            checksum: params[1] as string,
            applied_at: params[2] as string,
          });
        }
        return { rows: [], rowCount: 1 };
      }
      // The migration SQL itself is run via query (no executeScript)
      // It should throw because the SQL is bad
      if (sql.includes('CREATE TABLE') && sql.includes('incomplete')) {
        throw new Error('Incomplete SQL statement: expected column list after CREATE TABLE');
      }
      return { rows: [], rowCount: 0 };
    });

    const adapter: MigrationExecutionAdapter = { query: queryImpl };

    const runner = new MigrationRunner(adapter, migrationsDir);

    await expect(runner.runPending()).rejects.toThrow('005_complex.sql');
  });

  // ---- listApplied throws on DB failure (no silent empty array) ----
  it('listApplied throws on DB failure — P4B-P3D requirement', async () => {
    const queryImpl = vi.fn().mockRejectedValue(new Error('Disk I/O error'));
    const adapter: MigrationExecutionAdapter = { query: queryImpl };
    const runner = new MigrationRunner(adapter, migrationsDir);
    await expect(runner.listApplied()).rejects.toThrow('Disk I/O error');
  });

  // ---- status reports checksumMismatch correctly ----
  it('status reports checksumMismatch = false when checksums match', async () => {
    const sql = 'CREATE TABLE test (id INTEGER);';
    writeMigration(migrationsDir, '001_init.sql', sql);

    const crypto = await import('crypto');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);

    const queryImpl = vi.fn(async (querySql: string) => {
      if (querySql.includes('SELECT id, checksum, applied_at')) {
        return {
          rows: [{ id: '001_init.sql', checksum, applied_at: '2025-01-01' }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const adapter: MigrationExecutionAdapter = { query: queryImpl };
    const runner = new MigrationRunner(adapter, migrationsDir);
    const status = await runner.status();

    expect(status.checksumMismatch).toBe(false);
    expect(status.ready).toBe(true);
  });
});
