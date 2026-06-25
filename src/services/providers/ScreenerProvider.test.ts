import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { ScreenerProvider } from './ScreenerProvider';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('./broker/createProviderRequestBroker', () => ({
  getSharedProviderRequestBroker: vi.fn(),
}));

vi.mock('../acquisition/IngestionRunContext', () => ({
  getCurrentIngestionRunId: vi.fn(() => 'test-run-001'),
}));

function loadFixture(name: string): string {
  const fixtureDir = path.resolve(process.cwd(), 'tests/fixtures/providers/screener');
  return fs.readFileSync(path.join(fixtureDir, name), 'utf-8');
}

const fixtureHtml = loadFixture('screener-ratios-page.html');

describe('ScreenerProvider', () => {
  let mockExecute: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute = vi.fn();
    (getSharedProviderRequestBroker as unknown as Mock).mockResolvedValue({
      execute: mockExecute,
    });
  });

  it('successfully parses a valid ratios page and returns typed FinancialData', async () => {
    mockExecute.mockResolvedValue({
      success: true,
      data: fixtureHtml,
      statusClass: 'success',
      cached: false,
      cacheState: 'miss',
      coalesced: false,
      attemptCount: 1,
      latencyMs: 200,
      provider: 'screener',
      operation: 'financials',
      symbol: 'TESTCORP',
      retrievedAt: new Date().toISOString(),
    });

    const provider = new ScreenerProvider();
    const result = await provider.getFinancials('TESTCORP') as Record<string, unknown>;

    expect(result.symbol).toBe('TESTCORP');
    expect(result.companyName).toBe('Test Corp Ltd');
    expect(result.sector).toBe('Technology');
    expect(result.isin).toBe('INE123A00012');

    expect(result.peRatio).toBe(15.2);
    expect(result.pbRatio).toBe(3.1);
    expect(result.eps).toBe(42.5);
    expect(result.dividendYield).toBe(1.2);
    expect(result.beta).toBe(0.85);
    expect(result.marketCap).toBe(1_234_560_000_000);
    expect(result.freeFloat).toBe(45.0);
    expect(result.fcfYield).toBe(3.5);
    expect(result.evEbitda).toBe(8.9);
    expect(result.roa).toBe(6.7);
    expect(result.roe).toBe(12.3);
    expect(result.roic).toBe(14.2);
    expect(result.roce).toBe(15.1);
    expect(result.debtToEquity).toBe(0.45);
    expect(result.currentRatio).toBe(1.8);
    expect(result.revenueGrowth).toBe(10.5);
    expect(result.profitGrowth).toBe(8.3);
    expect(result.epsGrowth).toBe(9.1);
    expect(result.fcfGrowth).toBe(7.6);
    expect(result.grossMargin).toBe(45.2);
    expect(result.operatingMargin).toBe(22.8);
    expect(result.netMargin).toBe(15.6);
  });

  it('throws PROVIDER_SCHEMA_DRIFT when HTML contains no known ratio anchors', async () => {
    mockExecute.mockResolvedValue({
      success: true,
      data: '<html><body><p>No ratios here</p></body></html>',
      statusClass: 'success',
      cached: false,
      cacheState: 'miss',
      coalesced: false,
      attemptCount: 1,
      latencyMs: 100,
      provider: 'screener',
      operation: 'financials',
      symbol: 'UNKNOWN',
      retrievedAt: new Date().toISOString(),
    });

    const provider = new ScreenerProvider();
    await expect(provider.getFinancials('UNKNOWN')).rejects.toThrow(/PROVIDER_SCHEMA_DRIFT/i);
  });

  it('throws PROVIDER_DISABLED when authConfig is present but ingestion is disabled', async () => {
    const provider = new ScreenerProvider({
      enabled: false,
      authorizationRecordId: '',
      authorizationScope: '',
      requestsPerMinute: 6,
      requestsPerDay: 500,
      concurrencyLimit: 1,
      userAgent: '',
    });

    await expect(provider.getFinancials('TESTCORP')).rejects.toThrow(/PROVIDER_DISABLED/i);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('normalizes exchange suffixes before calling the broker', async () => {
    mockExecute.mockImplementation(async (_p: string, _o: string, symbol: string) => ({
      success: true,
      data: '<html><table><tr><td>P/E</td><td>10.0</td></tr></table></html>',
      statusClass: 'success',
      cached: false,
      cacheState: 'miss',
      coalesced: false,
      attemptCount: 1,
      latencyMs: 100,
      provider: 'screener',
      operation: 'financials',
      symbol,
      retrievedAt: new Date().toISOString(),
    }));

    const provider = new ScreenerProvider();
    try {
      await provider.getFinancials('RELIANCE.NS');
    } catch {
      // Schema drift expected with minimal HTML; symbol normalization verified below
    }

    const executeCalls = mockExecute.mock.calls;
    expect(executeCalls.length).toBe(1);
    const passedSymbol = executeCalls[0][2];
    expect(passedSymbol).toBe('RELIANCE');
  });

  it('throws PROVIDER_NETWORK_ERROR when the broker returns a failure', async () => {
    mockExecute.mockResolvedValue({
      success: false,
      data: null,
      error: { code: 'NETWORK_ERROR', message: 'Connection refused', category: 'retryable_network', retryable: true },
      statusClass: 'network_error',
      cached: false,
      cacheState: 'miss',
      coalesced: false,
      attemptCount: 3,
      latencyMs: 5000,
      provider: 'screener',
      operation: 'financials',
      symbol: 'FAILCORP',
      retrievedAt: new Date().toISOString(),
    });

    const provider = new ScreenerProvider();
    await expect(provider.getFinancials('FAILCORP')).rejects.toThrow(/PROVIDER_NETWORK_ERROR/i);
  });
});
