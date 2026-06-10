import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { setTokenVerifier, resetTokenVerifier } from '../../../auth/firebaseAdmin';
import type { TokenVerifier } from '../../../auth/firebaseAdmin';
import { retentionRoutes } from '../retention';
import { dbAdapter } from '../../../../db/DatabaseAdapter';

function mockVerifierFor(validUid: string): TokenVerifier {
  return {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === `valid-token-${validUid}`) {
        return { uid: validUid, email: `${validUid}@example.com` };
      }
      throw new Error('Invalid token');
    }),
  };
}

describe('retentionRoutes authz & IDOR tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Initialize dbAdapter in SQLite mode for tests
    process.env.DB_ADAPTER = 'sqlite';
    process.env.SQLITE_DB_PATH = ':memory:';
    await dbAdapter.reset();
    await dbAdapter.initialize();

    // Create required tables
    await dbAdapter.executeScript(`
      CREATE TABLE IF NOT EXISTS user_watchlists (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        tickers TEXT NOT NULL DEFAULT '[]',
        is_archived INTEGER NOT NULL DEFAULT 0,
        is_favourite INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );

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
    // Clear data from tables before each test
    await dbAdapter.query('DELETE FROM user_watchlists');
    await dbAdapter.query('DELETE FROM user_alerts');
  });

  afterEach(async () => {
    resetTokenVerifier();
    if (app) {
      await app.close();
    }
  });

  // ---- unauthenticated watchlist request returns 401 AUTH_MISSING ----
  it('unauthenticated watchlist request returns 401 AUTH_MISSING', async () => {
    app = Fastify({ logger: false });
    await app.register(retentionRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/watchlists',
    });
    expect(res.statusCode).toBe(401);
  });

  // ---- unauthenticated alert request returns 401 AUTH_MISSING ----
  it('unauthenticated alert request returns 401 AUTH_MISSING', async () => {
    app = Fastify({ logger: false });
    await app.register(retentionRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/alerts',
    });
    expect(res.statusCode).toBe(401);
  });

  // ---- user A creates watchlist ----
  it('user A creates watchlist and reads own watchlist', async () => {
    setTokenVerifier(mockVerifierFor('user-a'));
    app = Fastify({ logger: false });
    await app.register(retentionRoutes);
    await app.ready();

    // Create watchlist
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/watchlists',
      headers: { authorization: 'Bearer valid-token-user-a' },
      payload: { name: 'My Tech Watchlist', tickers: ['AAPL', 'GOOGL'] }
    });
    expect(createRes.statusCode).toBe(200);
    const createdWl = createRes.json();
    expect(createdWl.name).toBe('My Tech Watchlist');
    expect(createdWl.tickers).toEqual(['AAPL', 'GOOGL']);
    expect(createdWl.user_id).toBe('user-a');

    // Read watchlists
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/watchlists',
      headers: { authorization: 'Bearer valid-token-user-a' },
    });
    expect(getRes.statusCode).toBe(200);
    const list = getRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(createdWl.id);
  });

  // ---- user B cannot read, update, delete, or mutate user A watchlist ----
  it('user B cannot read, update, delete, or mutate user A watchlist', async () => {
    // 1. Create a watchlist as user A
    setTokenVerifier(mockVerifierFor('user-a'));
    app = Fastify({ logger: false });
    await app.register(retentionRoutes);
    await app.ready();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/watchlists',
      headers: { authorization: 'Bearer valid-token-user-a' },
      payload: { name: 'User A Watchlist', tickers: ['AAPL'] }
    });
    const wl = createRes.json();
    await app.close();

    // 2. Try to access as user B
    setTokenVerifier(mockVerifierFor('user-b'));
    app = Fastify({ logger: false });
    await app.register(retentionRoutes);
    await app.ready();

    // User B cannot update User A's watchlist
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/watchlists/${wl.id}`,
      headers: { authorization: 'Bearer valid-token-user-b' },
      payload: { name: 'Hacked name', tickers: ['MSFT'] }
    });
    expect(updateRes.statusCode).toBe(404);

    // User B cannot delete User A's watchlist
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/watchlists/${wl.id}`,
      headers: { authorization: 'Bearer valid-token-user-b' },
    });
    expect(deleteRes.statusCode).toBe(404);

    // User B cannot add ticker to User A's watchlist
    const addTickerRes = await app.inject({
      method: 'POST',
      url: `/api/watchlists/${wl.id}/tickers`,
      headers: { authorization: 'Bearer valid-token-user-b' },
      payload: { ticker: 'NFLX' }
    });
    expect(addTickerRes.statusCode).toBe(404);

    // User B cannot remove ticker from User A's watchlist
    const removeTickerRes = await app.inject({
      method: 'DELETE',
      url: `/api/watchlists/${wl.id}/tickers/AAPL`,
      headers: { authorization: 'Bearer valid-token-user-b' },
    });
    expect(removeTickerRes.statusCode).toBe(404);
  });

  // ---- user A can update/delete own watchlist ----
  it('user A can update and delete own watchlist', async () => {
    setTokenVerifier(mockVerifierFor('user-a'));
    app = Fastify({ logger: false });
    await app.register(retentionRoutes);
    await app.ready();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/watchlists',
      headers: { authorization: 'Bearer valid-token-user-a' },
      payload: { name: 'User A Watchlist', tickers: ['AAPL'] }
    });
    const wl = createRes.json();

    // Update own
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/watchlists/${wl.id}`,
      headers: { authorization: 'Bearer valid-token-user-a' },
      payload: { name: 'Updated name', tickers: ['AAPL', 'MSFT'] }
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().name).toBe('Updated name');
    expect(updateRes.json().tickers).toEqual(['AAPL', 'MSFT']);

    // Delete own
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/watchlists/${wl.id}`,
      headers: { authorization: 'Bearer valid-token-user-a' },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json()).toEqual({ success: true });
  });

  // ---- alert ownership tests ----
  it('user B cannot mark user A alert as read, but user A can', async () => {
    // Insert an alert for user-a directly into the DB
    await dbAdapter.query(
      `INSERT INTO user_alerts (user_id, symbol, alert_type, title, body, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['user-a', 'AAPL', 'health_change', 'AAPL Alert', 'Body', '2026-06-11']
    );

    // Get the alert ID
    const alertRes = await dbAdapter.query('SELECT id FROM user_alerts WHERE user_id = $1', ['user-a']);
    const alertId = (alertRes.rows[0] as any).id;

    // User B tries to mark it as read
    setTokenVerifier(mockVerifierFor('user-b'));
    app = Fastify({ logger: false });
    await app.register(retentionRoutes);
    await app.ready();

    const readResB = await app.inject({
      method: 'POST',
      url: `/api/alerts/${alertId}/read`,
      headers: { authorization: 'Bearer valid-token-user-b' },
    });
    expect(readResB.statusCode).toBe(404);

    await app.close();

    // User A marks it as read
    setTokenVerifier(mockVerifierFor('user-a'));
    app = Fastify({ logger: false });
    await app.register(retentionRoutes);
    await app.ready();

    const readResA = await app.inject({
      method: 'POST',
      url: `/api/alerts/${alertId}/read`,
      headers: { authorization: 'Bearer valid-token-user-a' },
    });
    expect(readResA.statusCode).toBe(200);
    expect(readResA.json()).toEqual({ success: true });
  });

  // ---- spoofing protection tests ----
  it('spoofed identity headers/params are ignored', async () => {
    setTokenVerifier(mockVerifierFor('user-a'));
    app = Fastify({ logger: false });
    await app.register(retentionRoutes);
    await app.ready();

    // Spoofed ?uid=
    const resParam = await app.inject({
      method: 'GET',
      url: '/api/watchlists?uid=user-b',
      headers: { authorization: 'Bearer valid-token-user-a' },
    });
    expect(resParam.statusCode).toBe(200);

    // Spoofed x-user-uid
    const resHeader = await app.inject({
      method: 'GET',
      url: '/api/watchlists',
      headers: {
        authorization: 'Bearer valid-token-user-a',
        'x-user-uid': 'user-b'
      },
    });
    expect(resHeader.statusCode).toBe(200);

    // Spoofed body.user_id on create
    const resBody = await app.inject({
      method: 'POST',
      url: '/api/watchlists',
      headers: { authorization: 'Bearer valid-token-user-a' },
      payload: { name: 'Watchlist', user_id: 'user-b' }
    });
    expect(resBody.statusCode).toBe(200);
    expect(resBody.json().user_id).toBe('user-a');
  });
});
