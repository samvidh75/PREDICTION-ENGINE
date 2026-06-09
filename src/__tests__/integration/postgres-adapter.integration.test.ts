/**
 * @vitest-environment node
 *
 * PostgreSQL DatabaseAdapter integration tests.
 * Requires: DATABASE_URL, DB_ADAPTER=postgres, ALLOW_SQLITE_FALLBACK=false.
 * Skips gracefully if DATABASE_URL is not set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dbAdapter } from '../../db/DatabaseAdapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasPostgres(): boolean {
  return !!process.env.DATABASE_URL;
}

const skipIfNoPg = hasPostgres() ? it : it.skip;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PostgreSQL adapter integration', () => {
  const originalEnv = { ...process.env };

  beforeAll(() => {
    // Ensure required env is set for postgres tests
    if (!process.env.DATABASE_URL) {
      console.warn('[postgres-adapter test] DATABASE_URL not set — skipping PostgreSQL tests');
    }
  });

  afterAll(async () => {
    await dbAdapter.reset();
    process.env = { ...originalEnv };
  });

  // ---- DB_ADAPTER=postgres activates PostgreSQL ----
  skipIfNoPg('DB_ADAPTER=postgres activates PostgreSQL', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';
    // DATABASE_URL should already be set from external env

    await dbAdapter.initialize();
    expect(dbAdapter.kind).toBe('postgres');
  });

  // ---- diagnostics.kind === "postgres" ----
  skipIfNoPg('diagnostics.kind === "postgres"', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();
    const diag = dbAdapter.diagnostics();
    expect(diag.kind).toBe('postgres');
    expect(diag.ready).toBe(true);
  });

  // ---- diagnostics.fallbackUsed === false ----
  skipIfNoPg('diagnostics.fallbackUsed === false', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();
    const diag = dbAdapter.diagnostics();
    expect(diag.fallbackUsed).toBe(false);
  });

  // ---- ping succeeds ----
  skipIfNoPg('ping succeeds', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();
    const ping = await dbAdapter.ping();
    expect(ping.ok).toBe(true);
  });

  // ---- missing DATABASE_URL produces unavailable state ----
  it('missing DATABASE_URL produces unavailable state', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';
    delete process.env.DATABASE_URL;

    await dbAdapter.initialize();
    expect(dbAdapter.kind).toBe('unavailable');
    const diag = dbAdapter.diagnostics();
    expect(diag.ready).toBe(false);
  });

  // ---- PostgreSQL outage does not silently activate SQLite ----
  it('PostgreSQL outage does not silently activate SQLite', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';
    // Set an obviously invalid URL — will fail to connect
    process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:19999/nonexistent';

    await dbAdapter.initialize();
    // Should NOT fall back to sqlite
    expect(dbAdapter.kind).not.toBe('sqlite');
    // Should be unavailable since fallback is disallowed
    expect(dbAdapter.kind).toBe('unavailable');
  });

  // ---- executeScript delegates to PostgreSQL pool.query() ----
  skipIfNoPg('executeScript delegates to PostgreSQL pool.query()', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    // Create a test table via executeScript
    await dbAdapter.executeScript(
      'CREATE TABLE IF NOT EXISTS pg_exec_test (id SERIAL PRIMARY KEY, name TEXT);'
    );

    // Verify table exists via query
    const res = await dbAdapter.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'pg_exec_test'"
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].table_name).toBe('pg_exec_test');

    // Clean up
    await dbAdapter.query('DROP TABLE IF EXISTS pg_exec_test');
  });
});
