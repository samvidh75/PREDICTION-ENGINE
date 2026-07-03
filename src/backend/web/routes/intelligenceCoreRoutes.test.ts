import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerIntelligenceCoreRoutes } from './intelligenceCoreRoutes';

const deps = {
  parseSymbol: (raw: string) => ({ cleanSymbol: raw, exchangeSuffix: 'NS' }),
  yahooQuote: async () => ({ price: 100, marketCap: 1_000_000_000 }),
  yahooPriceHistory: async () => ({ '1M': [{ label: 'a', price: 100 }, { label: 'b', price: 102 }], '1Y': [{ label: 'a', price: 80 }, { label: 'b', price: 100 }] }),
  indianApiFunds: async () => ({ pe_ratio: 20, roe: 18, revenue_growth: 10, eps_growth: 12, debt_to_equity: 0.2, current_ratio: 1.5 }),
  getPersistedStockResearch: async () => ({ patterns: [], knowledgeItems: [], macroSignals: [] }),
  computeVolatility: () => 0.2,
  buildTechnicalMetrics: (_symbol: string, price: number) => ({ currentPrice: price, lastUpdated: new Date(), period: '1D' }),
};

describe('registerIntelligenceCoreRoutes', () => {
  it('returns financial payload', async () => {
    const app = Fastify();
    await registerIntelligenceCoreRoutes(app, deps);
    const res = await app.inject({ method: 'GET', url: '/api/intelligence/financial?symbol=INFY' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ symbol: 'INFY', engine: 'financial' });
  });

  it('returns technical payload', async () => {
    const app = Fastify();
    await registerIntelligenceCoreRoutes(app, deps);
    const res = await app.inject({ method: 'GET', url: '/api/intelligence/technical?symbol=INFY' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ symbol: 'INFY', engine: 'technical' });
  });

  it('returns risk payload', async () => {
    const app = Fastify();
    await registerIntelligenceCoreRoutes(app, deps);
    const res = await app.inject({ method: 'GET', url: '/api/intelligence/risk?symbol=INFY' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ symbol: 'INFY', engine: 'risk' });
  });

  it('returns rag payload', async () => {
    const app = Fastify();
    await registerIntelligenceCoreRoutes(app, deps);
    const res = await app.inject({ method: 'GET', url: '/api/intelligence/rag?symbol=INFY' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ symbol: 'INFY', engine: 'rag' });
  });
});
