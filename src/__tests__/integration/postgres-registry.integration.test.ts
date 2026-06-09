/**
 * @vitest-environment node
 *
 * PostgreSQL prediction_registry integration tests.
 * Requires: DATABASE_URL, DB_ADAPTER=postgres, ALLOW_SQLITE_FALLBACK=false.
 * Validates the complete registry schema contract against PostgreSQL.
 * Uses deterministic cleanup of inserted fixture rows — never drops the entire DB.
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

const TEST_SYMBOL = 'REGPTEST';

async function cleanupTestRows(): Promise<void> {
  try {
    await dbAdapter.query('DELETE FROM prediction_registry WHERE symbol = $1', [TEST_SYMBOL]);
  } catch { /* ignore */ }
}

const CANONICAL_COLUMNS = [
  'id', 'symbol', 'prediction_date', 'ranking_score', 'classification',
  'confidence_score', 'confidence_level', 'quality_score', 'growth_score',
  'value_score', 'momentum_score', 'risk_score', 'sector_score',
  'price_at_prediction', 'benchmark_level', 'prediction_horizon',
  'validation_status', 'validated_at', 'future_return', 'benchmark_return',
  'alpha', 'created_at', 'created_by',
];

const VALID_INSERT_SQL = `
  INSERT INTO prediction_registry
    (symbol, prediction_date, ranking_score, classification, confidence_score,
     confidence_level, quality_score, growth_score, value_score,
     momentum_score, risk_score, sector_score, prediction_horizon)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PostgreSQL prediction_registry integration', () => {
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('[postgres-registry test] DATABASE_URL not set — skipping PostgreSQL tests');
    }
  });

  afterAll(async () => {
    await cleanupTestRows();
    await dbAdapter.reset();
    process.env = { ...originalEnv };
  });

  // ---- canonical prediction_registry table exists ----
  skipIfNoPg('canonical prediction_registry table exists', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    const res = await dbAdapter.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'prediction_registry'"
    );
    expect(res.rows.length).toBe(1);
  });

  // ---- all canonical columns exist ----
  skipIfNoPg('all canonical columns exist', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    const res = await dbAdapter.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'prediction_registry'
       ORDER BY ordinal_position`
    );

    const actualColumns = res.rows.map(r => String(r.column_name));
    for (const col of CANONICAL_COLUMNS) {
      expect(actualColumns).toContain(col);
    }
  });

  // ---- valid insert succeeds ----
  skipIfNoPg('valid insert succeeds', async () => {
    await cleanupTestRows();
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    await dbAdapter.query(VALID_INSERT_SQL, [
      TEST_SYMBOL, '2025-06-01', 88.5, 'Excellent', 92.0,
      'Very High', 82.0, 78.0, 72.0,
      80.0, 12.0, 68.0, 90,
    ]);

    const res = await dbAdapter.query(
      'SELECT * FROM prediction_registry WHERE symbol = $1',
      [TEST_SYMBOL]
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].symbol).toBe(TEST_SYMBOL);
    expect(res.rows[0].classification).toBe('Excellent');
  });

  // ---- duplicate symbol/date/horizon is deterministic ----
  skipIfNoPg('duplicate symbol/date/horizon is deterministic', async () => {
    await cleanupTestRows();
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    const params = [TEST_SYMBOL, '2025-06-02', 90, 'Exceptional', 93, 'Very High',
      85, 80, 75, 65, 10, 70, 30];

    // First insert succeeds
    await dbAdapter.query(VALID_INSERT_SQL, params);

    // Second insert with same (symbol, date, horizon) should fail
    await expect(
      dbAdapter.query(VALID_INSERT_SQL, params)
    ).rejects.toThrow();
  });

  // ---- invalid classification rejected ----
  skipIfNoPg('invalid classification rejected', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    await expect(
      dbAdapter.query(VALID_INSERT_SQL, [
        TEST_SYMBOL, '2025-06-03', 50, 'INVALID_CLASS', 60,
        'Medium', 45, 40, 35, 30, 50, 25, 30,
      ])
    ).rejects.toThrow();
  });

  // ---- invalid confidence_level rejected ----
  skipIfNoPg('invalid confidence_level rejected', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    await expect(
      dbAdapter.query(VALID_INSERT_SQL, [
        TEST_SYMBOL, '2025-06-04', 60, 'Good', 70,
        'IMPOSSIBLE_LEVEL', 50, 45, 40, 35, 50, 30, 30,
      ])
    ).rejects.toThrow();
  });

  // ---- invalid horizon rejected ----
  skipIfNoPg('invalid horizon rejected', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    await expect(
      dbAdapter.query(VALID_INSERT_SQL, [
        TEST_SYMBOL, '2025-06-05', 50, 'Good', 60,
        'Medium', 45, 40, 35, 30, 50, 25, 999,
      ])
    ).rejects.toThrow();
  });

  // ---- invalid created_by rejected ----
  skipIfNoPg('invalid created_by rejected', async () => {
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    await expect(
      dbAdapter.query(
        `INSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification, confidence_score,
          confidence_level, quality_score, growth_score, value_score,
          momentum_score, risk_score, sector_score, prediction_horizon, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [TEST_SYMBOL, '2025-06-06', 50, 'Good', 60, 'Medium',
         45, 40, 35, 30, 50, 25, 30, 'InvalidSource']
      )
    ).rejects.toThrow();
  });

  // ---- latest stored prediction query succeeds ----
  skipIfNoPg('latest stored prediction query succeeds', async () => {
    await cleanupTestRows();
    await dbAdapter.reset();
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();

    // Insert two predictions with different dates
    await dbAdapter.query(VALID_INSERT_SQL, [
      TEST_SYMBOL, '2025-06-01', 88.5, 'Excellent', 92.0,
      'Very High', 82.0, 78.0, 72.0, 80.0, 12.0, 68.0, 90,
    ]);
    await dbAdapter.query(VALID_INSERT_SQL, [
      TEST_SYMBOL, '2025-06-08', 91.0, 'Exceptional', 95.0,
      'Very High', 87.0, 83.0, 77.0, 75.0, 10.0, 72.0, 30,
    ]);

    // Query latest by symbol and horizon
    const res = await dbAdapter.query(
      `SELECT * FROM prediction_registry
       WHERE symbol = $1 AND prediction_horizon = $2
       ORDER BY prediction_date DESC
       LIMIT 1`,
      [TEST_SYMBOL, 30]
    );

    expect(res.rows.length).toBe(1);
    expect(res.rows[0].prediction_date).toBe('2025-06-08');
    expect(Number(res.rows[0].ranking_score)).toBe(91.0);
  });
});
