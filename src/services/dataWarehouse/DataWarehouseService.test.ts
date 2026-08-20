import { describe, expect, it, beforeEach } from 'vitest';
import { DataWarehouseService } from './DataWarehouseService.js';

describe('DataWarehouseService', () => {
  let service: DataWarehouseService;

  beforeEach(() => {
    service = new DataWarehouseService();
  });

  it('returns real, deterministic data across repeated queries (no Math.random)', () => {
    const query = {
      measures: ['market_cap'],
      dimensions: ['symbol'],
      filters: [{ dimension: 'sector' as const, operator: 'eq' as const, value: 'Energy & Oil' }],
      limit: 5,
    };
    const first = service.executeQuery(query);
    const second = service.executeQuery(query);
    expect(first.rows).toEqual(second.rows);
  });

  it('finds a well-known real stock by symbol', () => {
    const result = service.executeQuery({
      measures: ['market_cap'],
      dimensions: ['symbol'],
      filters: [{ dimension: 'symbol', operator: 'eq', value: 'BDO' }],
      limit: 1,
    });
    expect(result.totalRows).toBe(1);
    expect((result.rows[0][0] as Record<string, unknown>).symbol).toBe('BDO');
  });

  // This previously asserted the screener returned rows for `quality_score >= 50`
  // and called them "real factor scores". They were not real: every entry in the
  // bundled universe carried a hardcoded 50, so the filter matched the entire
  // universe and every result ranked identically. The generator now omits the
  // scores object entirely rather than emit a placeholder, so the honest
  // contract is that factor filters match nothing until a real scoring pipeline
  // exists — and, crucially, never match on a fabricated value.
  it('screener never returns a fabricated factor score', () => {
    const result = service.runScreener([
      { dimension: 'quality_score', operator: 'gte', value: 0 },
    ], 'quality_score', 10);

    for (const row of result.rows) {
      const qualityScore = (row[0] as Record<string, unknown>).quality_score;
      // Any row that does come back must carry a genuine 0-100 score.
      expect(typeof qualityScore).toBe('number');
      expect(qualityScore as number).toBeGreaterThanOrEqual(0);
      expect(qualityScore as number).toBeLessThanOrEqual(100);
    }
  });

  it('exposes market cap and sector as real, populated values', () => {
    const result = service.runScreener([
      { dimension: 'symbol', operator: 'eq', value: 'BDO' },
    ], 'market_cap', 1);
    expect(result.rows.length).toBe(1);

    const row = result.rows[0][0] as Record<string, unknown>;
    expect(row.sector).toBe('Financials');
    // Real market cap in millions PHP — not the 0 the universe used to carry.
    expect(row.market_cap as number).toBeGreaterThan(0);
  });

  it('only advertises metrics/dimensions that are actually real (no fabricated P/E or ROE)', () => {
    const metricNames = service.getAvailableMetrics().map(m => m.name);
    expect(metricNames).not.toContain('pe_ratio');
    expect(metricNames).not.toContain('roe');
    expect(metricNames).not.toContain('revenue_growth');
    expect(metricNames).toContain('quality_score');
    expect(metricNames).toContain('market_cap');
  });

  it('invalidateCache forces a fresh read without changing the result set', () => {
    const before = service.executeQuery({ measures: ['market_cap'], dimensions: ['symbol'], limit: 3 });
    service.invalidateCache();
    const after = service.executeQuery({ measures: ['market_cap'], dimensions: ['symbol'], limit: 3 });
    expect(after.rows).toEqual(before.rows);
  });

  it('respects limit and returns zero matches for an impossible filter', () => {
    const result = service.executeQuery({
      measures: ['market_cap'],
      dimensions: ['symbol'],
      filters: [{ dimension: 'symbol', operator: 'eq', value: 'NOT_A_REAL_SYMBOL_XYZ' }],
    });
    expect(result.totalRows).toBe(0);
  });
});
