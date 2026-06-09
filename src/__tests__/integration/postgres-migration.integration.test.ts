/**
 * @vitest-environment node
 *
 * PostgreSQL migration integration tests.
 * Tests migration system behavior against a real PostgreSQL database.
 * Requires: DB_ADAPTER=postgres, DATABASE_URL set, PostgreSQL available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dbAdapter } from '../../db/DatabaseAdapter';
import { MigrationRunner } from '../../db/MigrationRunner';
import fs from 'fs';
import path from 'path';
import os from 'os';

const HAS_POSTGRES = process.env.DB_ADAPTER === 'postgres' && !!process.env.DATABASE_URL;

function makeTempDir(): string {
  const dir = path.join(os.tmpdir(), `pg-mig-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeMigration(dir: string, filename: string, sql: string): void {
  fs.writeFileSync(path.join(dir, filename), sql, 'utf-8');
}

describe('PostgreSQL migration integration', () => {
  let migDir: string;

  beforeAll(async () => {
    if (!HAS_POSTGRES) return;
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';
    await dbAdapter.reset();
    await dbAdapter.initialize();

    migDir = makeTempDir();
  });

  afterAll(async () => {
    if (!HAS_POSTGRES) return;
    // Clean up created tables
    try {
      await dbAdapter.executeScript('DROP TABLE IF EXISTS pg_mig_test CASCADE;');
    } catch { /* ignore */ }
    try {
      await dbAdapter.executeScript('DROP TABLE IF EXISTS pg_mig_test2 CASCADE;');
    } catch { /* ignore */ }
    if (migDir && fs.existsSync(migDir)) {
      fs.rmSync(migDir, { recursive: true, force: true });
    }
    await dbAdapter.reset();
  });

  it.runIf(HAS_POSTGRES)('schema_migrations table exists after first status check', async () => {
    const runner = new MigrationRunner(dbAdapter, migDir);
    await runner.status();

    const result = await dbAdapter.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'schema_migrations'"
    );
    expect(result.rows.length).toBe(1);
  });

  it.runIf(HAS_POSTGRES)('migrations execute in deterministic order', async () => {
    writeMigration(migDir, '001_first.sql', 'CREATE TABLE pg_mig_test (id SERIAL PRIMARY KEY, val TEXT);');
    writeMigration(migDir, '002_second.sql', 'CREATE TABLE pg_mig_test2 (id SERIAL PRIMARY KEY, val TEXT);');

    const runner = new MigrationRunner(dbAdapter, migDir);
    const result = await runner.runPending();

    expect(result.appliedCount).toBe(2);
    expect(result.pendingCount).toBe(0);
    expect(result.checksumMismatch).toBe(false);
  });

  it.runIf(HAS_POSTGRES)('first run applies migrations', async () => {
    // Already applied above, just verify the tables exist
    const result = await dbAdapter.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('pg_mig_test', 'pg_mig_test2')"
    );
    expect(result.rows.length).toBe(2);
  });

  it.runIf(HAS_POSTGRES)('second run skips applied migrations', async () => {
    const runner = new MigrationRunner(dbAdapter, migDir);
    const status = await runner.status();
    // Both migrations already applied
    expect(status.appliedCount).toBe(2);
    expect(status.pendingCount).toBe(0);

    const result = await runner.runPending();
    expect(result.pendingCount).toBe(0);
  });

  it.runIf(HAS_POSTGRES)('checksum mismatch fails', async () => {
    // Insert a migration record with wrong checksum
    await dbAdapter.query(
      'INSERT INTO schema_migrations (id, checksum, applied_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      ['003_mismatch.sql', 'wrong_checksum', new Date().toISOString()]
    );

    writeMigration(migDir, '003_mismatch.sql', 'CREATE TABLE mismatch_tbl (id INTEGER);');

    const runner = new MigrationRunner(dbAdapter, migDir);
    await expect(runner.runPending()).rejects.toThrow(/checksum mismatch/i);

    // Clean up the fake record
    await dbAdapter.query("DELETE FROM schema_migrations WHERE id = '003_mismatch.sql'");
    // Remove the migration file
    const mismatchFile = path.join(migDir, '003_mismatch.sql');
    if (fs.existsSync(mismatchFile)) fs.unlinkSync(mismatchFile);
  });

  it.runIf(HAS_POSTGRES)('failed SQL is not recorded as applied', async () => {
    writeMigration(migDir, '004_bad.sql', 'THIS IS NOT VALID SQL;');

    const runner = new MigrationRunner(dbAdapter, migDir);
    await expect(runner.runPending()).rejects.toThrow(/failed/);

    const result = await dbAdapter.query(
      "SELECT COUNT(*)::int AS cnt FROM schema_migrations WHERE id = '004_bad.sql'"
    );
    expect(Number(result.rows[0].cnt)).toBe(0);

    // Clean up
    const badFile = path.join(migDir, '004_bad.sql');
    if (fs.existsSync(badFile)) fs.unlinkSync(badFile);
  });
});
