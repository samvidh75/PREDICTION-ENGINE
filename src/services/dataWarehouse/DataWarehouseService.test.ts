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

  it('screener filters on real factor scores within their documented 0-100 range', () => {
    const result = service.runScreener([
      { dimension: 'quality_score', operator: 'gte', value: 50 },
    ], 'quality_score', 10);
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      const qualityScore = (row[0] as Record<string, unknown>).quality_score as number;
      expect(qualityScore).toBeGreaterThanOrEqual(50);
      expect(qualityScore).toBeLessThanOrEqual(100);
    }
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
