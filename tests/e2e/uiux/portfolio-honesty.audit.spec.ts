/**
 * @vitest-environment node
 *
 * UIUX-P0 portfolio honesty audit.
 */
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { intelligenceRoutes } from '../../../src/backend/web/routes/intelligence';

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(intelligenceRoutes);
  await app.ready();
  return app;
}

describe('UIUX-P0 portfolio honesty', () => {
  it('POST empty positions returns an honest empty state without injected real tickers', async () => {
    const app = await buildApp();
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/intelligence/portfolio',
        payload: { positions: [] },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe('empty');
      expect(body.reason).toBe('EMPTY_PORTFOLIO');
      expect(JSON.stringify(body)).not.toContain('RELIANCE');
      expect(JSON.stringify(body)).not.toContain('TCS');
      expect(JSON.stringify(body)).not.toContain('INFY');
    } finally {
      await app.close();
    }
  });

  it('sample portfolio requires explicit demo mode and is labelled demo', async () => {
    const app = await buildApp();
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/intelligence/portfolio',
        payload: { mode: 'demo', positions: [] },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe('demo');
      expect(body.mode).toBe('demo');
      expect(body.data.isDemo).toBe(true);
      expect(body.message).toContain('Demo portfolio');
      expect(body.data.positions.every((position: any) => position._demo === true)).toBe(true);
    } finally {
      await app.close();
    }
  });
});
