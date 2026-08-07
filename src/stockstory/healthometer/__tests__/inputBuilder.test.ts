/**
 * @vitest-environment node
 *
 * Unit tests for buildHealthometerInput against a temp SQLite DB.
 * Regression coverage for two honest-data contracts:
 *   1. The healthometer query no longer gates on `pe_ratio IS NOT NULL` —
 *      the PSE loader deliberately stores NULL valuation ratios (no source
 *      data), so gating on pe_ratio made financials vanish for real data.
 *   2. `net_margin` and `roce` columns exist in the SQLite schema and are
 *      surfaced through the input financials.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dbAdapter } from '../../../db';
import { buildHealthometerInput } from '../inputBuilder';

const SYM = 'HMTEST02';

describe('buildHealthometerInput (SQLite)', () => {
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'healthometer-input-'));
    process.env.SQLITE_DB_PATH = join(dir, 'test.db');
    process.env.DB_ADAPTER = 'sqlite';
    delete process.env.DATABASE_URL;
    process.env.ALLOW_SQLITE_FALLBACK = 'true';
    await dbAdapter.initialize();

    // Honest-loader style row: valuation ratios NULL, real fundamentals present.
    await dbAdapter.query(
      `INSERT INTO financial_snapshots
        (symbol, period_end, snapshot_date, pe_ratio, roe, roa, net_margin,
         operating_margin, eps, revenue_growth, profit_growth, roce)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [SYM, '2026-03-31', '2026-05-13', null, 12, 5, 15, 18, 0.41, 8, 6, null]
    );
  });

  afterAll(async () => {
    await dbAdapter.reset();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('surfaces financials from a snapshot with NULL valuation ratios', async () => {
    const input = await buildHealthometerInput(SYM);
    expect(input).not.toBeNull();
    expect(input!.symbol).toBe(SYM);
    expect(input!.financials.netMargin).toBe(15);
    expect(input!.financials.operatingMargin).toBe(18);
    expect(input!.financials.roe).toBe(12);
    expect(input!.financials.peRatio).toBeNull();
    expect(input!.financials.roce).toBeNull();
  });

  it('prefers the newest snapshot by snapshot_date', async () => {
    await dbAdapter.query(
      `INSERT INTO financial_snapshots
        (symbol, period_end, snapshot_date, pe_ratio, roe, roa, net_margin,
         operating_margin, eps, revenue_growth, profit_growth)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [SYM, '2025-12-31', '2026-02-10', null, 10, 4, 12, 16, 0.38, 7, 5]
    );
    const input = await buildHealthometerInput(SYM);
    expect(input!.financials.netMargin).toBe(15); // newest row (older row has 12)
    expect(input!.financials.roe).toBe(12);
  });

  it('returns null for a symbol with no rows', async () => {
    const input = await buildHealthometerInput('NOPE12345');
    expect(input).toBeNull();
  });

  it('is case-insensitive on symbol input', async () => {
    const input = await buildHealthometerInput('hmtest02');
    expect(input).not.toBeNull();
    expect(input!.symbol).toBe(SYM);
  });
});
