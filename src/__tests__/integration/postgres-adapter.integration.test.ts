/**
 * @vitest-environment node
 *
 * PostgreSQL DatabaseAdapter integration tests.
 * Tests adapter policy enforcement for PostgreSQL.
 * Requires: DB_ADAPTER=postgres, DATABASE_URL set, PostgreSQL available.
 * Falls back gracefully if PostgreSQL is not available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dbAdapter } from '../../db/DatabaseAdapter';

const HAS_POSTGRES = process.env.DB_ADAPTER === 'postgres' && !!process.env.DATABASE_URL;

describe('PostgreSQL DatabaseAdapter integration', () => {
  beforeAll(async () => {
    if (!HAS_POSTGRES) return;
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';
    process.env.ALLOW_SQLITE_IN_PRODUCTION = 'false';
    await dbAdapter.reset();
  });

  afterAll(async () => {
    await dbAdapter.reset();
  });

  it.runIf(HAS_POSTGRES)('DB_ADAPTER=postgres activates PostgreSQL', async () => {
    await dbAdapter.initialize();
    expect(dbAdapter.kind).toBe('postgres');

    const ping = await dbAdapter.ping();
    expect(ping.ok).toBe(true);
  });

  it.runIf(HAS_POSTGRES)('diagnostics.kind === "postgres"', async () => {
    await dbAdapter.initialize();
    const diag = dbAdapter.diagnostics();
    expect(diag.kind).toBe('postgres');
    expect(diag.ready).toBe(true);
  });

  it.runIf(HAS_POSTGRES)('fallbackUsed === false when PostgreSQL is available', async () => {
    await dbAdapter.initialize();
    const diag = dbAdapter.diagnostics();
    expect(diag.fallbackUsed).toBe(false);
  });

  it.runIf(HAS_POSTGRES)('ping succeeds when PostgreSQL is available', async () => {
    await dbAdapter.initialize();
    const ping = await dbAdapter.ping();
    expect(ping.ok).toBe(true);
    expect(ping.detail).toBeUndefined();
  });

  it.runIf(HAS_POSTGRES)('query executes successfully against PostgreSQL', async () => {
    await dbAdapter.initialize();

    const result = await dbAdapter.query('SELECT 1 AS test_column');
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].test_column).toBe(1);
  });

  it.runIf(HAS_POSTGRES)('executeScript works with PostgreSQL', async () => {
    await dbAdapter.initialize();

    await dbAdapter.executeScript(
      'CREATE TABLE IF NOT EXISTS pg_exec_test (id SERIAL PRIMARY KEY, name TEXT);'
    );

    const result = await dbAdapter.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'pg_exec_test'"
    );
    expect(result.rows.length).toBe(1);

    // Cleanup
    await dbAdapter.executeScript('DROP TABLE IF EXISTS pg_exec_test;');
  });
});

describe('PostgreSQL adapter policy — negative cases', () => {
  beforeAll(async () => {
    await dbAdapter.reset();
  });

  afterAll(async () => {
    process.env.NODE_ENV = 'test';
    await dbAdapter.reset();
  });

  it.runIf(HAS_POSTGRES)('missing DATABASE_URL yields unavailable state when PG required', async () => {
    const origUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    try {
      process.env.NODE_ENV = 'test';
      process.env.DB_ADAPTER = 'postgres';
      process.env.ALLOW_SQLITE_FALLBACK = 'false';

      await dbAdapter.initialize();
      expect(dbAdapter.kind).toBe('unavailable');
      const diag = dbAdapter.diagnostics();
      expect(diag.ready).toBe(false);
    } finally {
      if (origUrl) process.env.DATABASE_URL = origUrl;
    }
  });

  it.runIf(HAS_POSTGRES)('PostgreSQL outage does not activate SQLite when fallback disabled', async () => {
    const origUrl = process.env.DATABASE_URL;
    // Set an invalid DATABASE_URL to simulate PostgreSQL outage
    process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:15432/nonexistent';

    try {
      process.env.NODE_ENV = 'test';
      process.env.DB_ADAPTER = 'postgres';
      process.env.ALLOW_SQLITE_FALLBACK = 'false';

      await dbAdapter.initialize();
      expect(dbAdapter.kind).toBe('unavailable');
      const diag = dbAdapter.diagnostics();
      expect(diag.fallbackUsed).toBe(false);
      expect(diag.ready).toBe(false);
    } finally {
      if (origUrl) process.env.DATABASE_URL = origUrl;
    }
  });
});
