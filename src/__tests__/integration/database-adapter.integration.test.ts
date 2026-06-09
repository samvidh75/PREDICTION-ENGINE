/**
 * @vitest-environment node
 *
 * SQLite DatabaseAdapter integration tests.
 * Uses unique temporary DB paths. Never mutates data/stockstory.db.
 * Cleans up .db, .db-wal, .db-shm after each test.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { dbAdapter } from '../../db/DatabaseAdapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tempDbPath(testName: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return path.join(os.tmpdir(), `integration-${ts}-${rand}-${testName}.db`);
}

function cleanupDb(dbPath: string): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = dbPath + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DatabaseAdapter SQLite integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    await dbAdapter.reset();
    process.env = { ...originalEnv };
  });

  // ---- NODE_ENV=test requires explicit DB_ADAPTER ----
  it('NODE_ENV=test requires explicit DB_ADAPTER', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DB_ADAPTER;
    delete process.env.DATABASE_URL;

    await expect(dbAdapter.initialize()).rejects.toThrow(
      /DB_ADAPTER must be explicitly set/
    );
  });

  // ---- DB_ADAPTER=sqlite activates SQLite ----
  it('DB_ADAPTER=sqlite activates SQLite', async () => {
    const dbPath = tempDbPath('adapter-sqlite-activates');
    try {
      process.env.NODE_ENV = 'test';
      process.env.DB_ADAPTER = 'sqlite';
      process.env.SQLITE_DB_PATH = dbPath;
      delete process.env.DATABASE_URL;

      await dbAdapter.initialize();
      expect(dbAdapter.kind).toBe('sqlite');

      const ping = await dbAdapter.ping();
      expect(ping.ok).toBe(true);
    } finally {
      await dbAdapter.reset();
      cleanupDb(dbPath);
    }
  });

  // ---- diagnostics.kind === "sqlite" ----
  it('diagnostics.kind === "sqlite"', async () => {
    const dbPath = tempDbPath('adapter-diag');
    try {
      process.env.NODE_ENV = 'test';
      process.env.DB_ADAPTER = 'sqlite';
      process.env.SQLITE_DB_PATH = dbPath;
      delete process.env.DATABASE_URL;

      await dbAdapter.initialize();
      const diag = dbAdapter.diagnostics();
      expect(diag.kind).toBe('sqlite');
      expect(diag.ready).toBe(true);
    } finally {
      cleanupDb(dbPath);
    }
  });

  // ---- DatabaseAdapter.executeScript delegates correctly ----
  it('DatabaseAdapter.executeScript delegates correctly', async () => {
    const dbPath = tempDbPath('adapter-exec-script');
    try {
      process.env.NODE_ENV = 'test';
      process.env.DB_ADAPTER = 'sqlite';
      process.env.SQLITE_DB_PATH = dbPath;
      delete process.env.DATABASE_URL;

      await dbAdapter.initialize();
      expect(dbAdapter.kind).toBe('sqlite');

      // executeScript should work
      await dbAdapter.executeScript(
        'CREATE TABLE exec_test (id INTEGER PRIMARY KEY, name TEXT);'
      );

      // Verify table was created
      const result = await dbAdapter.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='exec_test'"
      );
      expect(result.rows.length).toBe(1);
    } finally {
      await dbAdapter.reset();
      cleanupDb(dbPath);
    }
  });

  // ---- production SQLite rejected without explicit flags ----
  it('production SQLite rejected without explicit flags', async () => {
    const dbPath = tempDbPath('adapter-prod-reject');
    try {
      process.env.NODE_ENV = 'production';
      process.env.DB_ADAPTER = 'sqlite';
      process.env.SQLITE_DB_PATH = dbPath;
      process.env.ALLOW_SQLITE_IN_PRODUCTION = 'false';
      delete process.env.DATABASE_URL;

      await dbAdapter.initialize();
      expect(dbAdapter.kind).toBe('unavailable');
      const diag = dbAdapter.diagnostics();
      expect(diag.ready).toBe(false);
    } finally {
      cleanupDb(dbPath);
    }
  });
});
