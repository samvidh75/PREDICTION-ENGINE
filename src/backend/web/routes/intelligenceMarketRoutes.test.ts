import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerIntelligenceMarketRoutes } from './intelligenceMarketRoutes';

describe('registerIntelligenceMarketRoutes', () => {
  it('returns earnings analysis payload', async () => {
    const app = Fastify();
    await registerIntelligenceMarketRoutes(app, {
      parseSymbol: (raw) => ({ cleanSymbol: raw, exchangeSuffix: 'NS' }),
      yahooQuote: async () => ({ price: 100 }),
      indianApiFunds: async () => ({ eps: 5, revenue_growth: 12, profit_growth: 15, pe_ratio: 20 }),
    });

    const res = await app.inject({ method: 'GET', url: '/api/intelligence/earnings?symbol=INFY' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ symbol: 'INFY', engine: 'earnings' });
  });

  it('returns events analysis payload', async () => {
    const app = Fastify();
    await registerIntelligenceMarketRoutes(app, {
      parseSymbol: (raw) => ({ cleanSymbol: raw, exchangeSuffix: 'NS' }),
      yahooQuote: async () => ({ price: 100 }),
      indianApiFunds: async () => ({ revenue_growth: 14 }),
    });

    const res = await app.inject({ method: 'GET', url: '/api/intelligence/events?symbol=TCS' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ symbol: 'TCS', engine: 'events' });
  });
});
