import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerIntelligenceContextRoutes } from './intelligenceContextRoutes';

describe('registerIntelligenceContextRoutes', () => {
  it('returns valuation payload', async () => {
    const app = Fastify();
    await registerIntelligenceContextRoutes(app, {
      yahooQuote: async () => ({ price: 100 }),
      indianApiFunds: async () => ({ pe_ratio: 20, pb_ratio: 4 }),
      getPersistedStockResearch: async () => ({}),
    });

    const res = await app.inject({ method: 'GET', url: '/api/intelligence/valuation?symbol=INFY' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ symbol: 'INFY', engine: 'valuation' });
  });

  it('returns news payload', async () => {
    const app = Fastify();
    await registerIntelligenceContextRoutes(app, {
      yahooQuote: async () => ({ price: 100 }),
      indianApiFunds: async () => ({}),
      getPersistedStockResearch: async () => ({}),
    });

    const res = await app.inject({ method: 'GET', url: '/api/intelligence/news?symbol=TCS' });
    expect([200, 502]).toContain(res.statusCode);
  });

  it('returns sector payload', async () => {
    const app = Fastify();
    await registerIntelligenceContextRoutes(app, {
      yahooQuote: async () => ({ price: 100 }),
      indianApiFunds: async () => ({ pe_ratio: 18, sector: 'Technology' }),
      getPersistedStockResearch: async () => ({ sector: 'Technology', sectorPe: 22 }),
    });

    const res = await app.inject({ method: 'GET', url: '/api/intelligence/sector?symbol=INFY' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ symbol: 'INFY', engine: 'sector' });
  });
});
