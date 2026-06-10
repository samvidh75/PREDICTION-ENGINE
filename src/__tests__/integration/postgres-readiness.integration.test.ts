/**
 * @vitest-environment node
 *
 * PostgreSQL readiness integration tests.
 * Requires: DATABASE_URL, DB_ADAPTER=postgres, ALLOW_SQLITE_FALLBACK=false.
 * Tests /healthz and /readyz endpoints against a real PostgreSQL database.
 * Uses deterministic cleanup — never drops the entire database.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { dbAdapter } from '../../db/DatabaseAdapter';
import { MigrationRunner } from '../../db/MigrationRunner';
import healthRoutes from '../../backend/web/routes/health';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasPostgres(): boolean {
  return !!process.env.DATABASE_URL;
}

const skipIfNoPg = hasPostgres() ? it : it.skip;

function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PostgreSQL readiness integration', () => {
  const originalEnv = { ...process.env };
  let app: FastifyInstance;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('[postgres-readiness test] DATABASE_URL not set — skipping PostgreSQL tests');
    }
  });

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(async () => {
    await dbAdapter.reset();
    process.env = { ...originalEnv };
    if (app) {
      try { await app.close(); } catch { /* ignore */ }
    }
  });

  // ---- /healthz returns HTTP 200 ----
  skipIfNoPg('/healthz returns HTTP 200', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();
    app = buildApp();
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
  });

  // ---- /readyz returns HTTP 200 when DB and migrations are ready ----
  skipIfNoPg('/readyz returns HTTP 200 when DB and migrations are ready', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    // Run pending migrations so the status shows 0 pending
    const { join } = await import('path');
    const runner = new MigrationRunner(dbAdapter, join(process.cwd(), 'src', 'db', 'migrations'));
    await runner.runPending();

    app = buildApp();
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
  });

  // ---- /readyz reports postgres ----
  skipIfNoPg('/readyz reports postgres', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    app = buildApp();
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    const body = res.json();
    expect(body.database.kind).toBe('postgres');
  });

  // ---- /readyz reports fallbackUsed=false ----
  skipIfNoPg('/readyz reports fallbackUsed=false', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    app = buildApp();
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    const body = res.json();
    expect(body.database.fallbackUsed).toBe(false);
  });

  // ---- /readyz returns HTTP 503 when DB is unavailable ----
  it('/readyz returns HTTP 503 when DB is unavailable', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';
    // Set invalid URL to force unavailability
    process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:19999/nonexistent';

    await dbAdapter.initialize();

    app = buildApp();
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.ok).toBe(false);
  });

  // ---- readiness payload contains no credentials or connection strings ----
  skipIfNoPg('readiness payload contains no credentials or connection strings', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    app = buildApp();
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    const bodyStr = JSON.stringify(res.json());

    // Must not leak sensitive information
    expect(bodyStr).not.toContain('DATABASE_URL');
    expect(bodyStr).not.toContain('password');
    expect(bodyStr).not.toContain('PRIVATE_KEY');
    expect(bodyStr).not.toContain('-----BEGIN');
    // Should not contain the actual connection string
    if (process.env.DATABASE_URL) {
      expect(bodyStr).not.toContain(process.env.DATABASE_URL);
    }
  });
});
