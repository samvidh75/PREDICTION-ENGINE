/**
 * @vitest-environment node
 *
 * PostgreSQL prediction_registry integration tests.
 * Validates registry behavior against PostgreSQL.
 * Requires: DB_ADAPTER=postgres, DATABASE_URL set, PostgreSQL available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dbAdapter } from '../../db/DatabaseAdapter';

const HAS_POSTGRES = process.env.DB_ADAPTER === 'postgres' && !!process.env.DATABASE_URL;

describe('PostgreSQL prediction_registry integration', () => {
  beforeAll(async () => {
    if (!HAS_POSTGRES) return;
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';
    await dbAdapter.reset();
    await dbAdapter.initialize();
  });

  afterAll(async () => {
    if (!HAS_POSTGRES) return;
    // Clean up test data
    try {
      await dbAdapter.query("DELETE FROM prediction_registry WHERE symbol LIKE 'PGTEST%'");
    } catch { /* ignore */ }
    await dbAdapter.reset();
  });

  it.runIf(HAS_POSTGRES)('canonical registry table exists', async () => {
    const result = await dbAdapter.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'prediction_registry'"
    );
    expect(result.rows.length).toBe(1);
  });

  it.runIf(HAS_POSTGRES)('canonical columns exist (PostgreSQL)', async () => {
    const result = await dbAdapter.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'prediction_registry'
       ORDER BY ordinal_position`
    );

    const columns = result.rows.map(r => String(r.column_name));
    const required = [
      'id', 'symbol', 'prediction_date', 'ranking_score', 'classification',
      'confidence_score', 'confidence_level', 'quality_score', 'growth_score',
      'value_score', 'momentum_score', 'risk_score', 'sector_score',
      'price_at_prediction', 'benchmark_level', 'prediction_horizon',
      'validation_status', 'validated_at', 'future_return', 'benchmark_return',
      'alpha', 'created_at', 'created_by',
    ];

    for (const col of required) {
      expect(columns).toContain(col);
    }
  });

  it.runIf(HAS_POSTGRES)('valid prediction insert succeeds', async () => {
    await dbAdapter.query(
      `INSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification, confidence_score,
        confidence_level, quality_score, growth_score, value_score,
        momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      ['PGTEST1', '2025-06-09', 88, 'Excellent', 92, 'Very High',
       82, 78, 72, 80, 12, 68, 90],
    );

    const result = await dbAdapter.query(
      "SELECT * FROM prediction_registry WHERE symbol = 'PGTEST1'"
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].classification).toBe('Excellent');
  });

  it.runIf(HAS_POSTGRES)('duplicate symbol/date/horizon handled deterministically', async () => {
    // Insert first
    await dbAdapter.query(
      `INSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification, confidence_score,
        confidence_level, quality_score, growth_score, value_score,
        momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (symbol, prediction_date, prediction_horizon) DO NOTHING`,
      ['PGTEST2', '2025-06-09', 75, 'Good', 80, 'High',
       70, 65, 60, 55, 20, 45, 30],
    );

    // Attempt duplicate — should be a no-op with ON CONFLICT DO NOTHING
    await dbAdapter.query(
      `INSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification, confidence_score,
        confidence_level, quality_score, growth_score, value_score,
        momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (symbol, prediction_date, prediction_horizon) DO NOTHING`,
      ['PGTEST2', '2025-06-09', 99, 'Exceptional', 99, 'Very High',
       95, 90, 85, 70, 5, 80, 30],
    );

    const result = await dbAdapter.query(
      "SELECT * FROM prediction_registry WHERE symbol = 'PGTEST2'"
    );
    expect(result.rows.length).toBe(1);
    // The first insert's values should still be present
    expect(result.rows[0].ranking_score).toBe(75);
  });

  it.runIf(HAS_POSTGRES)('classification constraint enforced', async () => {
    await expect(
      dbAdapter.query(
        `INSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification, confidence_score,
          confidence_level, quality_score, growth_score, value_score,
          momentum_score, risk_score, sector_score, prediction_horizon)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        ['PGTEST3', '2025-06-09', 50, 'INVALID', 60, 'Medium',
         45, 40, 35, 30, 50, 25, 30],
      )
    ).rejects.toThrow();
  });

  it.runIf(HAS_POSTGRES)('created_by constraint enforced', async () => {
    await expect(
      dbAdapter.query(
        `INSERT INTO prediction_registry
         (symbol, prediction_date, ranking_score, classification, confidence_score,
          confidence_level, quality_score, growth_score, value_score,
          momentum_score, risk_score, sector_score, prediction_horizon, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        ['PGTEST4', '2025-06-10', 50, 'Good', 60, 'Medium',
         45, 40, 35, 30, 50, 25, 30, 'BadSource'],
      )
    ).rejects.toThrow();
  });

  it.runIf(HAS_POSTGRES)('latest prediction query succeeds', async () => {
    // Insert two predictions for same symbol with different dates
    await dbAdapter.query(
      `INSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification, confidence_score,
        confidence_level, quality_score, growth_score, value_score,
        momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (symbol, prediction_date, prediction_horizon) DO NOTHING`,
      ['PGTEST5', '2025-01-01', 60, 'Good', 65, 'High',
       55, 50, 45, 40, 35, 30, 30],
    );
    await dbAdapter.query(
      `INSERT INTO prediction_registry
       (symbol, prediction_date, ranking_score, classification, confidence_score,
        confidence_level, quality_score, growth_score, value_score,
        momentum_score, risk_score, sector_score, prediction_horizon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (symbol, prediction_date, prediction_horizon) DO NOTHING`,
      ['PGTEST5', '2025-06-09', 85, 'Excellent', 90, 'Very High',
       80, 75, 70, 85, 15, 65, 30],
    );

    const result = await dbAdapter.query(
      `SELECT * FROM prediction_registry
       WHERE symbol = 'PGTEST5' AND prediction_horizon = 30
       ORDER BY prediction_date DESC
       LIMIT 1`
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].prediction_date).toBe('2025-06-09');
    expect(Number(result.rows[0].ranking_score)).toBe(85);
  });
});
