import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../broker/createProviderRequestBroker', () => ({
  getSharedProviderRequestBroker: vi.fn().mockResolvedValue({
    execute: vi.fn(),
  }),
}));

vi.mock('../../acquisition/IngestionRunContext', () => ({
  getCurrentIngestionRunId: vi.fn().mockReturnValue(undefined),
}));

import { IndianApiFinancialProvider } from '../IndianApiFinancialProvider';
import { getSharedProviderRequestBroker } from '../broker/createProviderRequestBroker';

function makeBrokerMock(impl: (provider: string, operation: string, symbol: string) => any) {
  return vi.fn().mockImplementation(async (provider: string, operation: string, symbol: string, _params: any, fetcher: any) => {
    return impl(provider, operation, symbol);
  });
}

describe('IndianApiFinancialProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws with missing_key error class when INDIANAPI_KEY is not set', async () => {
    delete process.env.INDIANAPI_KEY;
    const provider = new IndianApiFinancialProvider();
    try {
      await provider.getFinancials('RELIANCE');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('INDIANAPI_KEY');
      expect(err.errorClass).toBe('missing_key');
    }
  });

  it('normalizes successful financial response with percentage conversions', async () => {
    process.env.INDIANAPI_KEY = 'test-key';
    const provider = new IndianApiFinancialProvider('test-key');

    const mockBroker = {
      execute: makeBrokerMock(async (prov: string, op: string) => {
        if (op === 'financials') {
          return {
            success: true,
            data: {
              fundamentals: {
                pe_ratio: 25.5,
                pb_ratio: 3.2,
                roe: 15.0,
                roce: 18.0,
                debt_to_equity: 0.45,
                revenue_growth_3y: 12.0,
                eps_growth_3y: 15.0,
                operating_margin: 22.0,
                net_profit_margin: 10.0,
                gross_margin: 35.0,
                market_cap: 150000,
                dividend_yield: 1.5,
                current_ratio: 1.8,
                beta: 0.85,
                eps: 120,
                ev_ebitda: 14.5,
              },
            },
            statusClass: 'success',
            error: null,
          };
        }
        if (op === 'metadata') {
          return {
            success: true,
            data: {
              stockDetailsReusableData: { marketCap: 150000 },
              keyMetrics: {},
            },
            statusClass: 'success',
            error: null,
          };
        }
        return { success: false, data: null, statusClass: 'error', error: { message: 'unknown op' } };
      }),
    };
    vi.mocked(getSharedProviderRequestBroker).mockResolvedValue(mockBroker as any);

    const result = await provider.getFinancials('RELIANCE') as Record<string, any>;

    expect(result.symbol).toBe('RELIANCE');
    expect(result.peRatio).toBe(25.5);
    expect(result.pbRatio).toBe(3.2);
    expect(result.roe).toBeCloseTo(0.15);
    expect(result.roic).toBeCloseTo(0.18);
    expect(result.debtToEquity).toBe(0.45);
    expect(result.revenueGrowth).toBeCloseTo(0.12);
    expect(result.epsGrowth).toBeCloseTo(0.15);
    expect(result.operatingMargin).toBeCloseTo(0.22);
    expect(result.netMargin).toBeCloseTo(0.10);
    expect(result.grossMargin).toBeCloseTo(0.35);
    expect(result.marketCap).toBe(150000 * 10_000_000);
    expect(result.dividendYield).toBeCloseTo(0.015);
    expect(result.currentRatio).toBe(1.8);
    expect(result.beta).toBe(0.85);
    expect(result.eps).toBe(120);
    expect(result.evEbitda).toBe(14.5);
    expect(result.source).toBe('indianapi');
  });

  it('handles partial financial response gracefully', async () => {
    process.env.INDIANAPI_KEY = 'test-key';
    const provider = new IndianApiFinancialProvider('test-key');

    const mockBroker = {
      execute: makeBrokerMock(async (prov: string, op: string) => {
        if (op === 'financials') {
          return {
            success: true,
            data: {
              fundamentals: {
                pe_ratio: 25.5,
                roe: 15.0,
              },
            },
            statusClass: 'success',
            error: null,
          };
        }
        if (op === 'metadata') {
          return {
            success: false,
            data: null,
            statusClass: 'error',
            error: { message: 'unavailable', statusCode: 500 },
          };
        }
        return { success: false, data: null, statusClass: 'error', error: { message: 'unknown op' } };
      }),
    };
    vi.mocked(getSharedProviderRequestBroker).mockResolvedValue(mockBroker as any);

    const result = await provider.getFinancials('TCS') as Record<string, any>;

    expect(result.symbol).toBe('TCS');
    expect(result.peRatio).toBe(25.5);
    expect(result.roe).toBeCloseTo(0.15);
    expect(result.pbRatio).toBeUndefined();
    expect(result.marketCap).toBeUndefined();
  });

  it('throws unsupported_symbol when both endpoints return not_found', async () => {
    process.env.INDIANAPI_KEY = 'test-key';
    const provider = new IndianApiFinancialProvider('test-key');

    const mockBroker = {
      execute: makeBrokerMock(async () => ({
        success: false,
        data: null,
        statusClass: 'not_found',
        error: { message: 'not found', statusCode: 404 },
      })),
    };
    vi.mocked(getSharedProviderRequestBroker).mockResolvedValue(mockBroker as any);

    try {
      await provider.getFinancials('INVALID_SYMBOL');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('all endpoints failed');
      expect(err.errorClass).toBe('unsupported_symbol');
    }
  });

  it('throws subscription_blocked when fundamentals returns 403', async () => {
    process.env.INDIANAPI_KEY = 'test-key';
    const provider = new IndianApiFinancialProvider('test-key');

    const mockBroker = {
      execute: makeBrokerMock(async (prov: string, op: string) => {
        if (op === 'financials') {
          return {
            success: false,
            data: null,
            statusClass: 'error',
            error: { message: 'subscription required', statusCode: 403 },
          };
        }
        if (op === 'metadata') {
          return {
            success: false,
            data: null,
            statusClass: 'error',
            error: { message: 'subscription required', statusCode: 403 },
          };
        }
        return { success: false, data: null, statusClass: 'error', error: { message: 'unknown op' } };
      }),
    };
    vi.mocked(getSharedProviderRequestBroker).mockResolvedValue(mockBroker as any);

    try {
      await provider.getFinancials('RELIANCE');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.errorClass).toBe('subscription_blocked');
    }
  });

  it('throws rate_limited when both endpoints return 429', async () => {
    process.env.INDIANAPI_KEY = 'test-key';
    const provider = new IndianApiFinancialProvider('test-key');

    const mockBroker = {
      execute: makeBrokerMock(async () => ({
        success: false,
        data: null,
        statusClass: 'rate_limited',
        error: { message: 'rate limited', statusCode: 429 },
      })),
    };
    vi.mocked(getSharedProviderRequestBroker).mockResolvedValue(mockBroker as any);

    try {
      await provider.getFinancials('RELIANCE');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.errorClass).toBe('rate_limited');
    }
  });

  it('does not include secrets in error messages or raw data', async () => {
    process.env.INDIANAPI_KEY = 'test-key-sec';
    const provider = new IndianApiFinancialProvider('test-key-sec');

    const mockBroker = {
      execute: makeBrokerMock(async () => ({
        success: false,
        data: null,
        statusClass: 'unauthorized',
        error: { message: 'Invalid API key provided', statusCode: 401 },
      })),
    };
    vi.mocked(getSharedProviderRequestBroker).mockResolvedValue(mockBroker as any);

    try {
      await provider.getFinancials('RELIANCE');
      expect.fail('should have thrown');
    } catch (err: any) {
      const fullText = JSON.stringify({
        message: err.message,
        errorClass: err.errorClass,
        raw: err._raw,
      });
      expect(fullText).not.toContain('test-key-sec');
    }
  });

  it('extracts financial fields from stock endpoint keyMetrics when fundamentals returns 404', async () => {
    process.env.INDIANAPI_KEY = 'test-key';
    const provider = new IndianApiFinancialProvider('test-key');

    const mockBroker = {
      execute: makeBrokerMock(async (prov: string, op: string) => {
        if (op === 'financials') {
          return {
            success: false,
            data: null,
            statusClass: 'not_found',
            error: { message: 'Endpoint not allowed', statusCode: 404 },
          };
        }
        if (op === 'metadata') {
          return {
            success: true,
            data: {
              stockDetailsReusableData: { marketCap: 1749418.94 },
              keyMetrics: {
                valuation: [
                  { key: 'pPerEExcludingExtraordinaryItemsMostRecentFiscalYear', value: '21.16' },
                  { key: 'priceToBookMostRecentFiscalYear', value: '1.89' },
                  { key: 'currentDividendYieldCommonStockPrimaryIssueLTM', value: '0.48' },
                ],
                mgmtEffectiveness: [
                  { key: 'returnOnAverageEquity5YearAverage', value: '8.78' },
                  { key: 'returnOnInvestmentMostRecentFiscalYear', value: '6.87' },
                  { key: 'returnOnAverageAssetsMostRecenFiscalYear', value: '4.63' },
                ],
                margins: [
                  { key: 'operatingMarginTrailing12Month', value: '11.27' },
                  { key: 'grossMargin5YearAverage', value: '29.96' },
                  { key: 'netProfitMarginPercent1stHistoricalFiscalYear', value: '8.89' },
                ],
                growth: [
                  { key: 'revenueGrowthRate5Year', value: '17.21' },
                  { key: 'ePSChangePercentTTMOverTTM', value: '15.99' },
                ],
                financialstrength: [
                  { key: 'totalDebtPerTotalEquityMostRecentQuarter', value: '0.44' },
                  { key: 'freeCashFlowtrailing12Month', value: '617540' },
                ],
              },
            },
            statusClass: 'success',
            error: null,
          };
        }
        return { success: false, data: null, statusClass: 'error', error: { message: 'unknown' } };
      }),
    };
    vi.mocked(getSharedProviderRequestBroker).mockResolvedValue(mockBroker as any);

    const result = await provider.getFinancials('RELIANCE') as Record<string, any>;

    expect(result.symbol).toBe('RELIANCE');
    expect(result.source).toBe('indianapi');
    expect(result.peRatio).toBe(21.16);
    expect(result.pbRatio).toBe(1.89);
    expect(result.roe).toBeCloseTo(0.0878);
    expect(result.roic).toBeCloseTo(0.0687);
    expect(result.roa).toBeCloseTo(0.0463);
    expect(result.operatingMargin).toBeCloseTo(0.1127);
    expect(result.grossMargin).toBeCloseTo(0.2996);
    expect(result.netMargin).toBeCloseTo(0.0889);
    expect(result.revenueGrowth).toBeCloseTo(0.1721);
    expect(result.epsGrowth).toBeCloseTo(0.1599);
    expect(result.debtToEquity).toBe(0.44);
    expect(result.dividendYield).toBeCloseTo(0.0048);
    expect(result.marketCap).toBe(1749418.94 * 10_000_000);
    expect(result._sources?.fundamentalsAvailable).toBe(false);
    expect(result._sources?.stockMetricsAvailable).toBe(true);
  });

  it('throws unsupported_field when response has no usable fields', async () => {
    process.env.INDIANAPI_KEY = 'test-key';
    const provider = new IndianApiFinancialProvider('test-key');

    const mockBroker = {
      execute: makeBrokerMock(async (prov: string, op: string) => {
        if (op === 'financials') {
          return {
            success: true,
            data: { fundamentals: {} },
            statusClass: 'success',
            error: null,
          };
        }
        if (op === 'metadata') {
          return {
            success: true,
            data: { stockDetailsReusableData: {}, keyMetrics: {} },
            statusClass: 'success',
            error: null,
          };
        }
        return { success: false, data: null, statusClass: 'error', error: { message: 'unknown' } };
      }),
    };
    vi.mocked(getSharedProviderRequestBroker).mockResolvedValue(mockBroker as any);

    try {
      await provider.getFinancials('RELIANCE');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('no financial fields');
      expect(err.errorClass).toBe('unsupported_field');
    }
  });
});
