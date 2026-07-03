import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerPublicEngagementRoutes } from './publicEngagementRoutes';

describe('registerPublicEngagementRoutes', () => {
  it('validates waitlist email', async () => {
    const app = Fastify();
    await registerPublicEngagementRoutes(app, {
      dbQuery: async () => ({ rows: [], rowCount: 0 }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/waitlist',
      payload: { email: 'bad-email' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('accepts feedback payload', async () => {
    const app = Fastify();
    await registerPublicEngagementRoutes(app, {
      dbQuery: async () => ({ rows: [{ id: '1', category: 'bug', status: 'new', created_at: '2026-01-01' }], rowCount: 1 }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/feedback',
      payload: { title: 'Title', body: 'Body' },
    });

    expect(res.statusCode).toBe(201);
  });
});
