import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { createInMemoryRateLimitStoreForTests, rateLimiterPlugin } from '../../src/middleware/RateLimiter';

async function buildApp() {
  const app = Fastify();
  await app.register(rateLimiterPlugin, {
    store: createInMemoryRateLimitStoreForTests(),
    nodeEnv: 'test',
  });
  app.get('/api/market-data/quote', async () => ({ ok: true }));
  app.get('/api/admin/ingestion/run', async () => ({ ok: true }));
  app.get('/api/search/universal', async () => ({ ok: true }));
  app.get('/api/research/scanner', async () => ({ ok: true }));
  return app;
}

describe('rate limiter route family contract', () => {
  it('shares counters across query-string variants', async () => {
    const app = await buildApp();
    try {
      for (let index = 0; index < 30; index++) {
        const response = await app.inject(`/api/market-data/quote?symbol=RELIANCE&nonce=${index}`);
        expect(response.statusCode).toBe(200);
      }

      const limited = await app.inject('/api/market-data/quote?symbol=INFY');
      expect(limited.statusCode).toBe(429);
      expect(limited.headers['retry-after']).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it('enforces dedicated route families', async () => {
    const app = await buildApp();
    try {
      for (let index = 0; index < 10; index++) {
        const response = await app.inject('/api/admin/ingestion/run');
        expect(response.statusCode).toBe(200);
      }

      const limited = await app.inject('/api/admin/ingestion/run');
      expect(limited.statusCode).toBe(429);
      expect(JSON.parse(limited.body)).toMatchObject({ family: 'admin-ingestion' });
      expect(limited.headers['retry-after']).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it('keeps search and research reads in separate higher-capacity families', async () => {
    const app = await buildApp();
    try {
      for (let index = 0; index < 60; index++) {
        expect((await app.inject(`/api/research/scanner?nonce=${index}`)).statusCode).toBe(200);
      }
      expect((await app.inject('/api/research/scanner')).statusCode).toBe(429);
      const search = await app.inject('/api/search/universal?query=RELIANCE');
      expect(search.statusCode).toBe(200);
      expect(search.headers['x-ratelimit-limit']).toBe('90');
    } finally {
      await app.close();
    }
  });

  it('fails closed when Redis is explicitly required without single-instance allowance', async () => {
    const app = Fastify();
    await expect(app.register(rateLimiterPlugin, {
      nodeEnv: 'production',
      redisUrl: '',
      redisRequired: true,
      singleInstanceAllowed: false,
    }).ready()).rejects.toThrow(/REDIS_URL is required/);
    await app.close();
  });
});
