/**
 * @vitest-environment node
 *
 * SQLite prediction_registry integration tests.
 * Validates the complete registry schema contract.
 * Uses unique temporary DB paths. Never mutates data/stockstory.db.
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
  const rand = (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296).toString(36).slice(2, 8);
  return path.join(os.tmpdir(), `integration-registry-${ts}-${rand}-${testName}.db`);
}

function cleanupDb(dbPath: string): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = dbPath + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

async function initAdapter(dbPath: string): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.DB_ADAPTER = 'sqlite';
  process.env.SQLITE_DB_PATH = dbPath;
  delete process.env.DATABASE_URL;
  await dbAdapter.initialize();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SQLite prediction_registry integration', () => {
  const originalEnv = { ...process.env };
  let dbPath: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    dbPath = tempDbPath('registry');
  });

  afterEach(async () => {
    await dbAdapter.reset();
    process.env = { ...originalEnv };
    cleanupDb(dbPath);
  });

  // ---- complete registry columns exist ----
  it('complete registry columns exist', async () => {
    await initAdapter(dbPath);

    const res = await dbAdapter.query("SELECT * FROM prediction_registry LIMIT 0");

    // All canonical columns
    const expectedColumns = [
      'id', 'symbol', 'prediction_date', 'ranking_score', 'classification',
      'confidence_score', 'confidence_level', 'quality_score', 'growth_score',
      'value_score', 'momentum_score', 'risk_score', 'sector_score',
      'price_at_prediction', 'benchmark_level', 'prediction_horizon',
      'validation_status', 'validated_at', 'future_return', 'benchmark_return',
      'alpha', 'created_at', 'created_by',
    ];

    for (const col of expectedColumns) {
      // The query returns rows with these columns if the table exists correctly
      // We verify by checking that the table definition includes each column
      // Since we can't introspect columnar output from empty result,
      // we check pragma_table_info
      const infoRes = await dbAdapter.query(
        `SELECT name FROM pragma_table_info('prediction_registry') WHERE name = ?`,
        [col],
      );
      expect(infoRes.rows.length).toBe(1);
    }
  });

  // ---- created_at populated by default ----
  it('created_at populated by default', async () => {
    await initAdapter(dbPath);

    await dbAdapter.query(
      `IPSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification, confidence_score,
        confidence_level, quality_score, growth_score, value_score,
        momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['RELIANCE', '2025-06-09', 85, 'Excellent', 90, 'Very High',
       80, 75, 70, 85, 15, 65, 30],
    );

    const res = await dbAdapter.query(
      "SELECT created_at FROM prediction_registry WHERE symbol = 'RELIANCE'"
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].created_at).toBeTruthy();
  });

  // ---- created_by defaults to DailyPredictionCapture ----
  it('created_by defaults to DailyPredictionCapture', async () => {
    await initAdapter(dbPath);

    await dbAdapter.query(
      `IPSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification, confidence_score,
        confidence_level, quality_score, growth_score, value_score,
        momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['TATASTEEL', '2025-06-09', 70, 'Good', 75, 'High',
       65, 60, 55, 70, 25, 50, 30],
    );

    const res = await dbAdapter.query(
      "SELECT created_by FROM prediction_registry WHERE symbol = 'TATASTEEL'"
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].created_by).toBe('DailyPredictionCapture');
  });

  // ---- UNIQUE(symbol, prediction_date, prediction_horizon) enforced ----
  it('UNIQUE(symbol, prediction_date, prediction_horizon) enforced', async () => {
    await initAdapter(dbPath);

    const insertRow = () =>
      dbAdapter.query(
        `IPSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification, confidence_score,
          confidence_level, quality_score, growth_score, value_score,
          momentum_score, risk_score, sector_score, prediction_horizon)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['HDFC', '2025-06-09', 92, 'Exceptional', 95, 'Very High',
         90, 85, 80, 60, 10, 75, 30],
      );

    // First insert should succeed
    await insertRow();

    // Second insert with same (symbol, date, horizon) should fail
    await expect(insertRow()).rejects.toThrow(
      /UNIQUE constraint failed/
    );
  });

  // ---- valid insert succeeds ----
  it('valid insert succeeds', async () => {
    await initAdapter(dbPath);

    await dbAdapter.query(
      `IPSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification, confidence_score,
        confidence_level, quality_score, growth_score, value_score,
        momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['INFY', '2025-06-09', 88, 'Excellent', 92, 'Very High',
       82, 78, 72, 80, 12, 68, 90],
    );

    const res = await dbAdapter.query(
      "SELECT * FROM prediction_registry WHERE symbol = 'INFY'"
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].symbol).toBe('INFY');
    expect(res.rows[0].classification).toBe('Excellent');
  });

  // ---- duplicate insert deterministic ----
  it('duplicate insert deterministic — fails predictably', async () => {
    await initAdapter(dbPath);

    const params = ['TCS', '2025-06-09', 90, 'Exceptional', 93, 'Very High',
      85, 80, 75, 65, 10, 70, 30];

    // First insert succeeds
    await dbAdapter.query(
      `IPSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification, confidence_score,
        confidence_level, quality_score, growth_score, value_score,
        momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params,
    );

    // Duplicate insert fails with UNIQUE constraint
    await expect(
      dbAdapter.query(
        `IPSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification, confidence_score,
          confidence_level, quality_score, growth_score, value_score,
          momentum_score, risk_score, sector_score, prediction_horizon)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params,
      )
    ).rejects.toThrow(/UNIQUE constraint failed/);
  });

  // ---- invalid classification rejected ----
  it('invalid classification rejected', async () => {
    await initAdapter(dbPath);

    await expect(
      dbAdapter.query(
        `IPSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification, confidence_score,
          confidence_level, quality_score, growth_score, value_score,
          momentum_score, risk_score, sector_score, prediction_horizon)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['WIPRO', '2025-06-09', 50, 'INVALID_CLASS', 60, 'Medium',
         45, 40, 35, 30, 50, 25, 30],
      )
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  // ---- invalid horizon rejected ----
  it('invalid horizon rejected', async () => {
    await initAdapter(dbPath);

    await expect(
      dbAdapter.query(
        `IPSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification, confidence_score,
          confidence_level, quality_score, growth_score, value_score,
          momentum_score, risk_score, sector_score, prediction_horizon)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['WIPRO', '2025-06-09', 50, 'Good', 60, 'Medium',
         45, 40, 35, 30, 50, 25, 999],
      )
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  // ---- invalid created_by rejected ----
  it('invalid created_by rejected', async () => {
    await initAdapter(dbPath);

    await expect(
      dbAdapter.query(
        `IPSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification, confidence_score,
          confidence_level, quality_score, growth_score, value_score,
          momentum_score, risk_score, sector_score, prediction_horizon, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['WIPRO', '2025-06-10', 50, 'Good', 60, 'Medium',
         45, 40, 35, 30, 50, 25, 30, 'InvalidSource'],
      )
    ).rejects.toThrow(/CHECK constraint failed/);
  });
});
