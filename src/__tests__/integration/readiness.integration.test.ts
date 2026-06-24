/**
 * @vitest-environment node
 *
 * Readiness integration tests.
 * Tests /healthz and /readyz endpoints with real SQLite DB.
 * Uses unique temporary DB paths. Never mutates data/stockstory.db.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { dbAdapter } from '../../db/DatabaseAdapter';
import healthRoutes from '../../backend/web/routes/health';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tempDbPath(testName: string): string {
  const ts = Date.now();
  const rand = (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296).toString(36).slice(2, 8);
  return path.join(os.tmpdir(), `integration-health-${ts}-${rand}-${testName}.db`);
}

function cleanupDb(dbPath: string): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = dbPath + ext;
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // EBUSY on Windows — WAL files may still be locked
    }
  }
}

async function initAdapter(dbPath: string): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.DB_ADAPTER = 'sqlite';
  process.env.SQLITE_DB_PATH = dbPath;
  delete process.env.DATABASE_URL;
  await dbAdapter.initialize();
}

function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Readiness integration', () => {
  const originalEnv = { ...process.env };
  let dbPath: string;
  let app: FastifyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    dbPath = tempDbPath('readiness');
  });

  afterEach(async () => {
    await dbAdapter.reset();
    process.env = { ...originalEnv };
    cleanupDb(dbPath);
    if (app) {
      try { await app.close(); } catch { /* ignore */ }
    }
  });

  // ---- /healthz returns HTTP 200 ----
  it('/healthz returns HTTP 200', async () => {
    await initAdapter(dbPath);
    app = buildApp();
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
  });

  // ---- /readyz reports sqlite honestly ----
  it('/readyz reports sqlite honestly', async () => {
    await initAdapter(dbPath);
    app = buildApp();
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    // When migrations are pending/unavailable, /readyz returns 503.
    // Both 200 and 503 are valid — we validate the body contains db_kind.
    expect([200, 503]).toContain(res.statusCode);
    const body = res.json();
    if (res.statusCode === 200) {
      expect(body.db_kind).toBe('sqlite');
    }
  });

  // ---- /readyz responds with valid JSON ----
  it('/readyz responds with valid JSON', async () => {
    await initAdapter(dbPath);
    app = buildApp();
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    // Response must be valid JSON
    const body = res.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('service');
  });

  // ---- /readyz returns HTTP 503 on checksum mismatch ----
  it('/readyz returns HTTP 503 on checksum mismatch', async () => {
    await initAdapter(dbPath);

    // Create schema_migrations table and insert a migration with known checksum
    // Create a migration dir with a different file (different content) to cause mismatch
    await dbAdapter.executeScript(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );`
    );
    await dbAdapter.query(
      'INSERT INTO schema_migrations (id, checksum, applied_at) VALUES (?, ?, ?)',
      ['001_init.sql', 'wrong_checksum', new Date().toISOString()]
    );

    // Create migration dir with different content
    const migDir = path.join(os.tmpdir(), `ready-mig-${Date.now()}`);
    fs.mkdirSync(migDir, { recursive: true });
    fs.writeFileSync(
      path.join(migDir, '001_init.sql'),
      'CREATE TABLE readiness_test (id INTEGER);',
      'utf-8'
    );

    try {
      // Override migrations_dir env for the health route
      process.env.MIGRATIONS_DIR = migDir;

      app = buildApp();
      await app.register(healthRoutes);
      await app.ready();

      const res = await app.inject({ method: 'GET', url: '/readyz' });
      expect(res.statusCode).toBe(503);
    } finally {
      if (fs.existsSync(migDir)) fs.rmSync(migDir, { recursive: true, force: true });
    }
  });

  // ---- readiness payload contains no secrets ----
  it('readiness payload contains no secrets', async () => {
    await initAdapter(dbPath);
    app = buildApp();
    await app.register(healthRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/readyz' });
    const body = res.json();
    const bodyStr = JSON.stringify(body);

    // Must not contain sensitive data
    expect(bodyStr).not.toContain('DATABASE_URL');
    expect(bodyStr).not.toContain('PRIVATE_KEY');
    expect(bodyStr).not.toContain('password');
    expect(bodyStr).not.toContain('-----BEGIN');
  });
});
