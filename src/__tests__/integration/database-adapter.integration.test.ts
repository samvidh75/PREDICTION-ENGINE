/**
 * TRACK-P4B-P3G — Database Adapter Integration Tests
 *
 * Uses unique temporary DB paths. Never mutates data/stockstory.db.
 * Cleans .db, .db-wal, .db-shm after each test.
 * Uses fresh module imports in each test to avoid singleton conflicts.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TIMESTAMP = Date.now();

function tempDbPath(name: string): string {
  return path.join(os.tmpdir(), `integration-${TIMESTAMP}-${name}-adapter.db`);
}

function cleanupDb(dbPath: string): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = dbPath + ext;
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

describe('DatabaseAdapter integration', () => {
  const dbPath = tempDbPath('database-adapter');

  beforeEach(async () => {
    // Reset module cache for fresh singleton
    vi.resetModules();
    cleanupDb(dbPath);
  });

  afterEach(async () => {
    vi.resetModules();
    try {
      // Clean up the adapter singleton
      const mod = await import('../../db/DatabaseAdapter');
      await mod.dbAdapter.reset();
    } catch { /* module may not be loaded */ }

    cleanupDb(dbPath);

    // Clean up env
    delete process.env.DB_ADAPTER;
    delete process.env.SQLITE_DB_PATH;
    delete process.env.NODE_ENV;
  });

  // ---- DB_ADAPTER=sqlite activates SQLite ----
  it('DB_ADAPTER=sqlite activates SQLite', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'sqlite';
    process.env.ALLOW_SQLITE_FALLBACK = 'true';
    process.env.SQLITE_DB_PATH = dbPath;
    delete process.env.DATABASE_URL;

    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    const diag = dbAdapter.diagnostics();
    expect(diag.kind).toBe('sqlite');

    await dbAdapter.reset();
  });

  // ---- diagnostics.kind === "sqlite" ----
  it('diagnostics.kind === "sqlite" when SQLite is active', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'sqlite';
    process.env.ALLOW_SQLITE_FALLBACK = 'true';
    process.env.SQLITE_DB_PATH = dbPath;
    delete process.env.DATABASE_URL;

    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    const diag = dbAdapter.diagnostics();
    expect(diag.kind).toBe('sqlite');
    expect(diag.ready).toBe(true);

    await dbAdapter.reset();
  });

  // ---- DatabaseAdapter.executeScript delegates to SQLitePool.executeScript ----
  it('DatabaseAdapter.executeScript delegates to SQLitePool.executeScript', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'sqlite';
    process.env.ALLOW_SQLITE_FALLBACK = 'true';
    process.env.SQLITE_DB_PATH = dbPath;
    delete process.env.DATABASE_URL;

    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    expect(dbAdapter.kind).toBe('sqlite');

    await dbAdapter.executeScript('CREATE TABLE IF NOT EXISTS test_exec_adapter (id INTEGER PRIMARY KEY, name TEXT);');

    const result = await dbAdapter.query("SELECT name FROM sqlite_master WHERE type='table' AND name='test_exec_adapter'");
    expect(result.rows.length).toBe(1);

    await dbAdapter.reset();
  });

  // ---- production SQLite rejected without explicit flags ----
  it('production SQLite rejected without explicit flags', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_ADAPTER = 'sqlite';
    process.env.ALLOW_SQLITE_IN_PRODUCTION = 'false';
    process.env.SQLITE_DB_PATH = dbPath;
    delete process.env.ALLOW_SQLITE_FALLBACK;
    delete process.env.DATABASE_URL;

    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    const diag = dbAdapter.diagnostics();
    expect(diag.kind).not.toBe('sqlite');

    await dbAdapter.reset();
  });
});
