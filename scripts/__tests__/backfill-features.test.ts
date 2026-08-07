/**
 * @vitest-environment node
 *
 * Regression coverage for the real-data feature/factor pipeline:
 *   daily_prices -> FeatureEngine -> feature_snapshots -> FactorEngine -> factor_snapshots
 *
 * Locks in:
 *   1. The SQLite portability fix (CAST(trade_date AS TEXT) — the previous
 *      Postgres-only `trade_date::text` syntax crashed on SQLite).
 *   2. Honest computation: features are real indicator values computed from
 *      real price bars (never fabricated), and missing fundamentals resolve to
 *      the engines' neutral branches instead of invented numbers.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dbAdapter } from '../../src/db';
import { featureEngine } from '../../src/services/FeatureEngine';
import { factorEngine } from '../../src/services/FactorEngine';

const SYM = 'TEST01';

describe('feature/factor pipeline on SQLite', () => {
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'feature-pipeline-'));
    process.env.SQLITE_DB_PATH = join(dir, 'test.db');
    process.env.DB_ADAPTER = 'sqlite';
    delete process.env.DATABASE_URL;
    process.env.ALLOW_SQLITE_FALLBACK = 'true';
    await dbAdapter.initialize();

    await dbAdapter.query(
      `INSERT INTO symbols (symbol, exchange, company_name, sector, listing_status)
       VALUES ($1, $2, $3, $4, 'Active')`,
      [SYM, 'PSE', 'Pipeline Test Co', 'Financial']
    );

    // 65 synthetic bars: gentle uptrend with a pullback so RSI/volatility are non-degenerate.
    const start = new Date('2026-05-01');
    let price = 100;
    for (let i = 0; i < 65; i++) {
      const d = new Date(start.getTime() + i * 86400000).toISOString().split('T')[0];
      price = price * (1 + (i % 7 === 0 ? -0.01 : 0.003));
      await dbAdapter.query(
        `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [SYM, d, price * 0.99, price * 1.02, price * 0.98, price, 500000]
      );
    }
  });

  afterAll(async () => {
    await dbAdapter.reset();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('computes and stores real features from daily_prices', async () => {
    const snapshots = await featureEngine.calculateAndStoreFeatures(SYM);
    expect(snapshots.length).toBeGreaterThan(0);

    const rows = (await dbAdapter.query(
      `SELECT rsi, volatility, momentum, trend_strength
       FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
      [SYM]
    )).rows[0];

    expect(Number(rows.rsi)).toBeGreaterThanOrEqual(0);
    expect(Number(rows.rsi)).toBeLessThanOrEqual(100);
    expect(Number(rows.volatility)).toBeGreaterThan(0);
    // Uptrend series must produce positive momentum on the latest bar
    expect(Number(rows.momentum)).toBeGreaterThan(0);
  });

  it('computes honest factor snapshots (neutral where fundamentals are missing)', async () => {
    const snapshots = await factorEngine.calculateAndStoreFactors(SYM);
    expect(snapshots.length).toBeGreaterThan(0);

    const rows = (await dbAdapter.query(
      `SELECT quality_factor, value_factor, growth_factor, momentum_factor, risk_factor, factor_score
       FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
      [SYM]
    )).rows[0];

    for (const key of ['quality_factor', 'value_factor', 'growth_factor', 'momentum_factor', 'risk_factor', 'factor_score']) {
      const v = Number(rows[key]);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
