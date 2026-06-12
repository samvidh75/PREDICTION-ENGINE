import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { setTokenVerifier, resetTokenVerifier, type TokenVerifier } from '../../../auth/firebaseAdmin';
import { dbAdapter } from '../../../../db/DatabaseAdapter';
import { retentionRoutes } from '../retention';

function verifierFor(validUid: string): TokenVerifier {
  return {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === `valid-token-${validUid}`) return { uid: validUid, email: `${validUid}@example.com` };
      throw new Error('Invalid token');
    }),
  };
}

describe('authenticated alert integration', () => {
  let app: FastifyInstance | null = null;

  beforeAll(async () => {
    process.env.DB_ADAPTER = 'sqlite';
    process.env.SQLITE_DB_PATH = ':memory:';
    await dbAdapter.reset();
    await dbAdapter.initialize();
    await dbAdapter.executeScript(`
      CREATE TABLE IF NOT EXISTS user_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT
      );
    `);
  });

  beforeEach(async () => {
    await dbAdapter.query('DELETE FROM user_alerts');
  });

  afterEach(async () => {
    resetTokenVerifier();
    if (app) await app.close();
    app = null;
  });

  async function openFor(uid: string): Promise<FastifyInstance> {
    setTokenVerifier(verifierFor(uid));
    app = Fastify({ logger: false });
    await app.register(retentionRoutes);
    await app.ready();
    return app;
  }

  async function insertAlert(uid: string, symbol: string): Promise<number> {
    await dbAdapter.query(
      `INSERT INTO user_alerts (user_id, symbol, alert_type, title, body, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uid, symbol, 'health_change', `${symbol} alert`, 'Body', '2026-06-11'],
    );
    const result = await dbAdapter.query('SELECT id FROM user_alerts WHERE user_id = $1 AND symbol = $2', [uid, symbol]);
    return Number((result.rows[0] as { id: number }).id);
  }

  it('lists only alerts owned by the verified user and returns their unread count', async () => {
    await insertAlert('user-a', 'RELIANCE');
    await insertAlert('user-b', 'TCS');
    const server = await openFor('user-a');

    const list = await server.inject({
      method: 'GET',
      url: '/api/alerts',
      headers: { authorization: 'Bearer valid-token-user-a' },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().alerts).toHaveLength(1);
    expect(list.json().alerts[0].symbol).toBe('RELIANCE');
    expect(list.json().unreadCount).toBe(1);

    const unread = await server.inject({
      method: 'GET',
      url: '/api/alerts/unread',
      headers: { authorization: 'Bearer valid-token-user-a' },
    });
    expect(unread.json()).toEqual({ unreadCount: 1 });
  });

  it('prevents one authenticated user from dismissing another users alert', async () => {
    const alertId = await insertAlert('user-a', 'RELIANCE');
    let server = await openFor('user-b');

    const forbidden = await server.inject({
      method: 'DELETE',
      url: `/api/alerts/${alertId}`,
      headers: { authorization: 'Bearer valid-token-user-b' },
    });
    expect(forbidden.statusCode).toBe(404);
    await server.close();
    app = null;

    server = await openFor('user-a');
    const removed = await server.inject({
      method: 'DELETE',
      url: `/api/alerts/${alertId}`,
      headers: { authorization: 'Bearer valid-token-user-a' },
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json()).toEqual({ success: true });
  });

  it('marks all alerts as read only for the verified user', async () => {
    await insertAlert('user-a', 'RELIANCE');
    await insertAlert('user-b', 'TCS');
    const server = await openFor('user-a');

    const response = await server.inject({
      method: 'POST',
      url: '/api/alerts/read-all',
      headers: { authorization: 'Bearer valid-token-user-a' },
    });
    expect(response.statusCode).toBe(200);

    const rows = await dbAdapter.query('SELECT user_id, is_read FROM user_alerts ORDER BY user_id');
    expect(rows.rows).toEqual([
      { user_id: 'user-a', is_read: 1 },
      { user_id: 'user-b', is_read: 0 },
    ]);
  });
});
