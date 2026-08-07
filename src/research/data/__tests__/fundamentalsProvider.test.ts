/**
 * @vitest-environment node
 *
 * Regression coverage for the honest-data research provider:
 *   fetchFundamentals must prefer the LIVE DB (real PSE EDGE disclosures +
 *   real prices + real features) over the persisted universe, leave missing
 *   valuation ratios null (never guessed), and return null for symbols that
 *   exist nowhere.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dbAdapter } from '../../../db';
import { fetchFundamentals } from '../fundamentalsProvider';

const SYM = 'HMTEST03';

describe('fetchFundamentals (SQLite, live DB path)', () => {
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'fundamentals-provider-'));
    process.env.SQLITE_DB_PATH = join(dir, 'test.db');
    process.env.DB_ADAPTER = 'sqlite';
    delete process.env.DATABASE_URL;
    process.env.ALLOW_SQLITE_FALLBACK = 'true';
    await dbAdapter.initialize();

    await dbAdapter.query(
      `INSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
       VALUES ($1, 'PSE', $2, $3, $4, 'Active')`,
      [SYM, 'Fundamentals Test Co', 'Financials', 'Banks']
    );
    await dbAdapter.query(
      `INSERT INTO financial_snapshots
        (symbol, period_end, snapshot_date, eps, roe, roa, net_margin,
         operating_margin, debt_to_equity, revenue_growth, profit_growth, market_cap)
       VALUES ($1, '2026-03-31', '2026-05-13', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [SYM, 0.41, 12.5, 5.2, 35.16, 1.39, 1.32, -6.1, -8.78, 500000]
    );
    await dbAdapter.query(
      `INSERT INTO feature_snapshots (symbol, trade_date, volatility, momentum, rsi)
       VALUES ($1, '2026-08-06', 0.23, 0.02, 48)`,
      [SYM]
    );
    await dbAdapter.query(
      `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
       VALUES ($1, '2026-08-06', 18.0, 18.5, 17.9, 18.26, 1200000)`,
      [SYM]
    );
  });

  afterAll(async () => {
    await dbAdapter.reset();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('serves real DB fundamentals with honest nulls for missing valuation ratios', async () => {
    const f = await fetchFundamentals('hmtest03');
    expect(f).not.toBeNull();
    expect(f!.symbol).toBe(SYM);
    expect(f!.eps).toBe(0.41);
    expect(f!.roe).toBe(12.5);
    expect(f!.dataSource).toContain('PSE EDGE');
    expect(f!.sector).toBe('Financials');
    expect(f!.industry).toBe('Banks');
    expect(f!.price).toBe(18.26);
    expect(f!.volatility).toBe(0.23);
    // PSE EDGE does not disclose these — they must stay null, not guessed.
    expect(f!.pe).toBeNull();
    expect(f!.pb).toBeNull();
    expect(f!.evEbitda).toBeNull();
    expect(f!.dividendYield).toBeNull();
    expect(f!.marketCap).toBe(500000);
  });

  it('returns null for a symbol in neither the DB nor the persisted universe', async () => {
    const f = await fetchFundamentals('ZZZZ.UNKNOWN');
    expect(f).toBeNull();
  });
});
