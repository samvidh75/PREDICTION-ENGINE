/**
 * @vitest-environment node
 *
 * PostgreSQL readiness integration tests.
 * Tests /healthz and /readyz endpoints with real PostgreSQL.
 * Requires: DB_ADAPTER=postgres, DATABASE_URL set, PostgreSQL available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { dbAdapter } from '../../db/DatabaseAdapter';
import healthRoutes from '../../backend/web/routes/health';

const HAS_POSTGRES = process.env.DB_ADAPTER === 'postgres' && !!process.env.DATABASE_URL;

describe('PostgreSQL readiness integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    if (!HAS_POSTGRES) return;
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';
    await dbAdapter.reset();
    await dbAdapter.initialize();
  });

  afterAll(async () => {
    if (app) {
      try { await app.close(); } catch { /* ignore */ }
    }
    await dbAdapter.reset();
  });

  it.runIf(HAS_POSTGRES)('/healthz returns HTTP 200 with PostgreSQL', async () => {
    app = Fastify({ logger: false });
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBeTruthy();
    expect(body.at).toBeTruthy();
  });

  it.runIf(HAS_POSTGRES)('/readyz reports postgres', async () => {
    app = Fastify({ logger: false });
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBeTruthy();
    expect(body.database).toBeTruthy();
    expect(body.db_kind).toBe('postgres');
    expect(body.migrations).toBeTruthy();
    expect(body.configuration).toBeTruthy();
    expect(body.at).toBeTruthy();
  });

  it.runIf(HAS_POSTGRES)('/readyz returns HTTP 200 when DB and migrations are ready', async () => {
    app = Fastify({ logger: false });
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(200);
  });

  it.runIf(HAS_POSTGRES)('/readyz returns HTTP 503 on DB outage', async () => {
    // Close the database adapter to simulate outage
    await dbAdapter.shutdown();

    app = Fastify({ logger: false });
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    // On DB outage, should return 503
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.ok).toBe(false);
  });

  it.runIf(HAS_POSTGRES)('no secret values appear in readiness payload', async () => {
    // Re-initialize for this test
    await dbAdapter.reset();
    await dbAdapter.initialize();

    app = Fastify({ logger: false });
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    const body = res.json();
    const bodyStr = JSON.stringify(body);

    // Must not leak secrets
    expect(bodyStr).not.toContain('DATABASE_URL');
    expect(bodyStr).not.toContain('PRIVATE_KEY');
    expect(bodyStr).not.toContain('password');
    expect(bodyStr).not.toContain('secret');
    expect(bodyStr).not.toContain('-----BEGIN');
  });
});
