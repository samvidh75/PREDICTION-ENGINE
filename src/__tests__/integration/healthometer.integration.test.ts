/**
 * @vitest-environment node
 *
 * Healthometer PostgreSQL integration tests.
 * Requires: DATABASE_URL, DB_ADAPTER=postgres, ALLOW_SQLITE_FALLBACK=false.
 * Seeds test data into financial_snapshots, factor_snapshots, feature_snapshots,
 * and prediction_registry, then validates the complete HealthometerEngine pipeline.
 * Uses deterministic cleanup of inserted fixture rows.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dbAdapter } from '../../db/DatabaseAdapter';
import { buildHealthometerInput } from '../../stockstory/healthometer/inputBuilder';
import { healthometerEngine } from '../../stockstory/healthometer/HealthometerEngine';

const TEST_SYMBOL = 'HMTEST01';

function hasPostgres(): boolean {
  return !!process.env.DATABASE_URL;
}

const skipIfNoPg = hasPostgres() ? it : it.skip;

async function seedTestData(): Promise<void> {
  await dbAdapter.query(
    `INSERT INTO financial_snapshots
      (symbol, snapshot_date, pe_ratio, pb_ratio, ev_ebitda, roe, roce, roa,
       debt_to_equity, current_ratio, operating_margin, net_margin, gross_margin,
       revenue_growth, profit_growth, eps_growth, fcf_yield, market_cap, beta)
     VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [TEST_SYMBOL, 18, 3.0, 12, 18, 14, 10, 0.5, 2.0, 20, 14, 45, 0.12, 0.14, 0.13, 0.04, 500000, 1.0]
  );
  await dbAdapter.query(
    `INSERT INTO factor_snapshots
      (symbol, trade_date, quality_factor, value_factor, growth_factor,
       momentum_factor, risk_factor, sector_strength_factor)
     VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)`,
    [TEST_SYMBOL, 65, 55, 60, 58, 35, 50]
  );
  await dbAdapter.query(
    `INSERT INTO feature_snapshots
      (symbol, trade_date, volatility, momentum, rsi, trend_strength)
     VALUES ($1, NOW(), $2, $3, $4, $5)`,
    [TEST_SYMBOL, 0.18, 1.2, 62, 0.6]
  );
  await dbAdapter.query(
    `INSERT INTO prediction_registry
      (symbol, prediction_date, ranking_score, classification, confidence_score, confidence_level)
     VALUES ($1, NOW(), $2, $3, $4, $5)`,
    [TEST_SYMBOL, 72, 'Good', 75, 'High']
  );
}

async function cleanupTestData(): Promise<void> {
  for (const table of ['financial_snapshots', 'factor_snapshots', 'feature_snapshots', 'prediction_registry']) {
    try {
      await dbAdapter.query(`DELETE FROM ${table} WHERE symbol = $1`, [TEST_SYMBOL]);
    } catch { /* ignore */ }
  }
}

describe('Healthometer PostgreSQL integration', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('[healthometer integration] DATABASE_URL not set — skipping PostgreSQL tests');
      return;
    }
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'postgres';
    process.env.ALLOW_SQLITE_FALLBACK = 'false';

    await dbAdapter.initialize();
    await cleanupTestData();
    await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await dbAdapter.reset();
  });

  skipIfNoPg('buildHealthometerInput returns populated input from seeded data', async () => {
    const input = await buildHealthometerInput(TEST_SYMBOL);
    expect(input).not.toBeNull();
    expect(input!.symbol).toBe(TEST_SYMBOL);
    expect(input!.financials.peRatio).toBe(18);
    expect(input!.financials.roe).toBe(18);
    expect(input!.factors.qualityFactor).toBe(65);
    expect(input!.features.volatility).toBe(0.18);
    expect(input!.predictionRegistry.rankingScore).toBe(72);
  });

  skipIfNoPg('HealthometerEngine produces all 7 dimensions from seeded data', async () => {
    const input = await buildHealthometerInput(TEST_SYMBOL);
    expect(input).not.toBeNull();

    const result = healthometerEngine.evaluate(input!);
    expect(result.totalDimensionCount).toBe(7);
    expect(result.validDimensionCount).toBe(7);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);

    const dimNames = result.dimensions.map((d) => d.id);
    expect(dimNames).toContain('quality');
    expect(dimNames).toContain('financial_strength');
    expect(dimNames).toContain('growth');
    expect(dimNames).toContain('valuation');
    expect(dimNames).toContain('risk');
    expect(dimNames).toContain('momentum');
    expect(dimNames).toContain('stability');

    result.dimensions.forEach((d) => {
      expect(d.status).toBe('verified');
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
      expect(Number.isFinite(d.score)).toBe(true);
    });

    expect(result.label).toMatch(/Very healthy|Healthy|Stable/);
  });

  skipIfNoPg('buildHealthometerInput returns null for non-existent symbol', async () => {
    const input = await buildHealthometerInput('NONEXISTENT999');
    expect(input).toBeNull();
  });

  skipIfNoPg('input handles symbol case-insensitively', async () => {
    const input = await buildHealthometerInput('hmtest01');
    expect(input).not.toBeNull();
    expect(input!.symbol).toBe('HMTEST01');
  });
});
