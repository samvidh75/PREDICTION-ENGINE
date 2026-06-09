/**
 * TRACK-P4B-P3G — SQLite Registry Integration Tests
 *
 * Validates prediction_registry schema contract against real SQLite.
 * Uses unique temporary DB paths. Never mutates data/stockstory.db.
 * Each test uses a fresh SQLite adapter + unique DB path to avoid singleton conflicts.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TIMESTAMP = Date.now();

function tempDbPath(name: string): string {
  return path.join(os.tmpdir(), `integration-${TIMESTAMP}-${name}-reg.db`);
}

function cleanupDb(dbPath: string): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = dbPath + ext;
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

const ORIGINAL_ENV = { ...process.env };

describe('SQLite prediction_registry integration', () => {
  const dbPath = tempDbPath('sqlite-registry');

  beforeEach(async () => {
    // Reset env to known state
    delete process.env.DB_ADAPTER;
    delete process.env.SQLITE_DB_PATH;
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'sqlite';
    process.env.ALLOW_SQLITE_FALLBACK = 'true';
    process.env.SQLITE_DB_PATH = dbPath;
    process.env.DATABASE_URL = '';

    // Reset module state for fresh singleton
    vi.resetModules();

    // Clear any existing temp DB
    cleanupDb(dbPath);
  });

  afterEach(async () => {
    // Reset module and cleanup
    vi.resetModules();

    try {
      // Also reset dbAdapter if module is loaded
      const mod = await import('../../db/DatabaseAdapter');
      await mod.dbAdapter.reset();
    } catch { /* ignore */ }

    cleanupDb(dbPath);
  });

  // ---- complete registry columns exist ----
  it('complete registry columns exist', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    const cols = await dbAdapter.query("PRAGMA table_info('prediction_registry')");
    const colNames = cols.rows.map((r: Record<string, unknown>) => String(r.name));

    const required = [
      'id', 'symbol', 'prediction_date', 'ranking_score', 'classification',
      'confidence_score', 'confidence_level', 'quality_score', 'growth_score',
      'value_score', 'momentum_score', 'risk_score', 'sector_score',
      'price_at_prediction', 'benchmark_level', 'prediction_horizon',
      'validation_status', 'validated_at', 'future_return', 'benchmark_return',
      'alpha', 'created_at', 'created_by',
    ];

    for (const col of required) {
      expect(colNames, `Missing column: ${col}`).toContain(col);
    }

    await dbAdapter.reset();
  });

  // ---- created_at populated by default ----
  it('created_at populated by default', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    await dbAdapter.query(
      `INSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification,
        confidence_score, confidence_level, quality_score, growth_score,
        value_score, momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES ('TEST_CAT', '2025-01-01', 80, 'Good', 0.75, 'Medium',
       70, 60, 80, 50, 40, 65, 30)`
    );

    const rows = await dbAdapter.query(
      "SELECT created_at FROM prediction_registry WHERE symbol = 'TEST_CAT'"
    );
    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0].created_at).toBeTruthy();
    expect(typeof rows.rows[0].created_at).toBe('string');
    expect((rows.rows[0].created_at as string).length).toBeGreaterThan(0);

    await dbAdapter.reset();
  });

  // ---- created_by defaults to DailyPredictionCapture ----
  it('created_by defaults to DailyPredictionCapture', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    await dbAdapter.query(
      `INSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification,
        confidence_score, confidence_level, quality_score, growth_score,
        value_score, momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES ('TEST_CB', '2025-01-02', 70, 'Fair', 0.6, 'Low',
       60, 50, 70, 40, 30, 55, 7)`
    );

    const rows = await dbAdapter.query(
      "SELECT created_by FROM prediction_registry WHERE symbol = 'TEST_CB'"
    );
    expect(rows.rows[0].created_by).toBe('DailyPredictionCapture');

    await dbAdapter.reset();
  });

  // ---- UNIQUE(symbol, prediction_date, prediction_horizon) enforced ----
  it('UNIQUE(symbol, prediction_date, prediction_horizon) enforced', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    const insert = (sym: string) =>
      dbAdapter.query(
        `INSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification,
          confidence_score, confidence_level, quality_score, growth_score,
          value_score, momentum_score, risk_score, sector_score, prediction_horizon)
         VALUES ($1, '2025-01-03', 80, 'Good', 0.75, 'Medium',
         70, 60, 80, 50, 40, 65, 30)`,
        [sym]
      );

    await insert('UNIQUE_TEST');

    await expect(insert('UNIQUE_TEST')).rejects.toThrow();

    await dbAdapter.reset();
  });

  // ---- valid insert succeeds ----
  it('valid insert succeeds', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    await expect(
      dbAdapter.query(
        `INSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification,
          confidence_score, confidence_level, quality_score, growth_score,
          value_score, momentum_score, risk_score, sector_score, prediction_horizon)
         VALUES ('VALID_TEST', '2025-06-01', 85, 'Exceptional', 0.9, 'Very High',
         90, 85, 75, 70, 20, 80, 365)`
      )
    ).resolves.toBeDefined();

    await dbAdapter.reset();
  });

  // ---- duplicate insert deterministic ----
  it('duplicate insert throws deterministically', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    const doInsert = () =>
      dbAdapter.query(
        `INSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification,
          confidence_score, confidence_level, quality_score, growth_score,
          value_score, momentum_score, risk_score, sector_score, prediction_horizon)
         VALUES ('DUP_TEST', '2025-07-01', 75, 'Excellent', 0.8, 'High',
         80, 70, 65, 60, 30, 70, 90)`
      );

    await doInsert();
    await expect(doInsert()).rejects.toThrow();

    await dbAdapter.reset();
  });

  // ---- invalid classification rejected ----
  it('invalid classification rejected', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    await expect(
      dbAdapter.query(
        `INSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification,
          confidence_score, confidence_level, quality_score, growth_score,
          value_score, momentum_score, risk_score, sector_score, prediction_horizon)
         VALUES ('CLASS_TEST', '2025-08-01', 75, 'InvalidClass', 0.8, 'High',
         80, 70, 65, 60, 30, 70, 7)`
      )
    ).rejects.toThrow();

    await dbAdapter.reset();
  });

  // ---- invalid horizon rejected ----
  it('invalid horizon rejected', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    await expect(
      dbAdapter.query(
        `INSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification,
          confidence_score, confidence_level, quality_score, growth_score,
          value_score, momentum_score, risk_score, sector_score, prediction_horizon)
         VALUES ('HZN_TEST', '2025-09-01', 75, 'Good', 0.8, 'High',
         80, 70, 65, 60, 30, 70, 999)`
      )
    ).rejects.toThrow();

    await dbAdapter.reset();
  });

  // ---- invalid created_by rejected ----
  it('invalid created_by rejected', async () => {
    const { dbAdapter } = await import('../../db/DatabaseAdapter');
    await dbAdapter.initialize();

    await expect(
      dbAdapter.query(
        `INSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification,
          confidence_score, confidence_level, quality_score, growth_score,
          value_score, momentum_score, risk_score, sector_score, prediction_horizon, created_by)
         VALUES ('CB_TEST', '2025-10-01', 75, 'Good', 0.8, 'High',
         80, 70, 65, 60, 30, 70, 7, 'InvalidSource')`
      )
    ).rejects.toThrow();

    await dbAdapter.reset();
  });
});
