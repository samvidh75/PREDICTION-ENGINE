import { describe, expect, it } from 'vitest';
import { ProviderCapabilityRegistry, ALL_FINANCIAL_FIELDS } from '../../src/providers/v2/ProviderCapabilityRegistry';
import { ProviderFailoverManager, type ProviderAdapter } from '../../src/providers/v2/ProviderFailoverManager';
import { ProviderHealthService } from '../../src/providers/v2/ProviderHealthService';
import { ProviderPriorityResolver } from '../../src/providers/v2/ProviderPriorityResolver';
import { ProviderCoordinator } from '../../src/services/providers/ProviderCoordinator';

const requiredFields = [
  'peRatio',
  'pbRatio',
  'roe',
  'roic',
  'evEbitda',
  'debtToEquity',
  'marketCap',
  'eps',
  'dividendYield',
  'beta',
  'revenueGrowth',
  'profitGrowth',
  'epsGrowth',
  'fcfGrowth',
  'grossMargin',
  'operatingMargin',
  'currentRatio',
  'fcfYield',
];

function fullBundle(): Record<string, number> {
  return Object.fromEntries(requiredFields.map((field, index) => [field, index + 1]));
}

describe('provider call amplification controls', () => {
  it('fetches one provider financial bundle for twenty requested fields', async () => {
    const registry = new ProviderCapabilityRegistry();
    const health = new ProviderHealthService();
    const priority = new ProviderPriorityResolver(registry, health);
    const manager = new ProviderFailoverManager(registry, priority, health);

    let bundleCalls = 0;
    const adapter: ProviderAdapter = {
      name: 'FinnhubProvider',
      async fetchFinancials() {
        bundleCalls++;
        return fullBundle();
      },
    };

    const result = await manager.fetchAllFields(
      'RELIANCE',
      [...ALL_FINANCIAL_FIELDS],
      new Map([['FinnhubProvider', adapter]]),
      new Map(),
    );

    expect(bundleCalls).toBe(1);
    expect(result.fields.peRatio).toBe(1);
    expect(result.fields.currentRatio).toBe(17);
    expect(result.providerSummary.FinnhubProvider).toMatchObject({ attempted: 1, succeeded: 1 });
  });

  it('ProviderCoordinator stops after required fields are complete', async () => {
    class PrimaryProvider {
      calls = 0;
      async getFinancials() {
        this.calls++;
        return { symbol: 'RELIANCE', periodEnd: '2026-03-31', ...fullBundle() };
      }
    }
    class FallbackProvider {
      calls = 0;
      async getFinancials() {
        this.calls++;
        return { marketCap: 999 };
      }
    }

    const coordinator = new ProviderCoordinator();
    const primary = new PrimaryProvider();
    const fallback = new FallbackProvider();
    (coordinator as any).financialProviders = [primary, fallback];
    (coordinator as any).circuitBreakers = new Map();

    const result = await coordinator.getFinancials('RELIANCE.NS');

    expect(primary.calls).toBe(1);
    expect(fallback.calls).toBe(0);
    expect((result as any)._sources.peRatio).toBe('PrimaryProvider');
    expect(result.periodEnd).toBe('2026-03-31');
  });

  it('ProviderCoordinator calls fallback only when fields are missing', async () => {
    class PrimaryProvider {
      calls = 0;
      async getFinancials() {
        this.calls++;
        const bundle = fullBundle();
        delete (bundle as any).marketCap;
        return { symbol: 'RELIANCE', peRatio: bundle.peRatio, ...bundle };
      }
    }
    class FallbackProvider {
      calls = 0;
      async getFinancials() {
        this.calls++;
        return { marketCap: 999, peRatio: 777 };
      }
    }

    const coordinator = new ProviderCoordinator();
    const primary = new PrimaryProvider();
    const fallback = new FallbackProvider();
    (coordinator as any).financialProviders = [primary, fallback];
    (coordinator as any).circuitBreakers = new Map();

    const result = await coordinator.getFinancials('RELIANCE');

    expect(primary.calls).toBe(1);
    expect(fallback.calls).toBe(1);
    expect(result.marketCap).toBe(999);
    expect(result.peRatio).toBe(1);
    expect((result as any)._sources.marketCap).toBe('FallbackProvider');
    expect((result as any)._sources.peRatio).toBe('PrimaryProvider');
  });
});
