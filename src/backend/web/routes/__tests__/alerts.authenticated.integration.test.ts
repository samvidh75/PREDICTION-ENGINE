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

  // ── Auth middleware boundary tests ──────────────────────────────

  describe('auth middleware boundaries', () => {
    it('returns 401 when no Authorization header is present', async () => {
      const server = await openFor('user-a');
      const response = await server.inject({ method: 'GET', url: '/api/alerts' });
      expect(response.statusCode).toBe(401);
      expect(response.json().code).toBe('AUTH_MISSING');
    });

    it('returns 401 for malformed Bearer token (no token after Bearer)', async () => {
      const server = await openFor('user-a');
      const response = await server.inject({
        method: 'GET',
        url: '/api/alerts',
        headers: { authorization: 'Bearer ' },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().code).toBe('AUTH_EMPTY_TOKEN');
    });

    it('returns 401 for non-Bearer authorization scheme', async () => {
      const server = await openFor('user-a');
      const response = await server.inject({
        method: 'GET',
        url: '/api/alerts',
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().code).toBe('AUTH_INVALID_SCHEME');
    });

    it('returns 403 for an invalid/expired bearer token', async () => {
      const server = await openFor('user-a');
      const response = await server.inject({
        method: 'GET',
        url: '/api/alerts',
        headers: { authorization: 'Bearer invalid-token-that-will-fail' },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe('AUTH_INVALID_TOKEN');
    });

    it('returns 403 for a token that does not match any known uid', async () => {
      const server = await openFor('user-a');
      const response = await server.inject({
        method: 'GET',
        url: '/api/alerts',
        headers: { authorization: 'Bearer valid-token-unknown-user' },
      });
      // The mock rejects tokens that don't match the pattern — 403
      expect(response.statusCode).toBe(403);
    });
  });

  // ── Authorization for all alert operations ─────────────────────

  describe('all alert endpoints require auth', () => {
    it('POST /api/alerts/:id/read returns 401 without auth', async () => {
      const server = await openFor('user-a');
      const response = await server.inject({ method: 'POST', url: '/api/alerts/1/read' });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/alerts/read-all returns 401 without auth', async () => {
      const server = await openFor('user-a');
      const response = await server.inject({ method: 'POST', url: '/api/alerts/read-all' });
      expect(response.statusCode).toBe(401);
    });

    it('DELETE /api/alerts/:id returns 401 without auth', async () => {
      const server = await openFor('user-a');
      const response = await server.inject({ method: 'DELETE', url: '/api/alerts/1' });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/alerts/unread returns 401 without auth', async () => {
      const server = await openFor('user-a');
      const response = await server.inject({ method: 'GET', url: '/api/alerts/unread' });
      expect(response.statusCode).toBe(401);
    });
  });

  // ── Ownership and isolation ────────────────────────────────────

  describe('alert ownership and isolation', () => {
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

    it('prevents one authenticated user from dismissing another user\'s alert (404 invariant)', async () => {
      const alertId = await insertAlert('user-a', 'RELIANCE');
      let server = await openFor('user-b');

      // user-b tries to delete user-a's alert → 404 (same as alert not existing)
      const forbidden = await server.inject({
        method: 'DELETE',
        url: `/api/alerts/${alertId}`,
        headers: { authorization: 'Bearer valid-token-user-b' },
      });
      expect(forbidden.statusCode).toBe(404);
      await server.close();
      app = null;

      // user-a can still delete it
      server = await openFor('user-a');
      const removed = await server.inject({
        method: 'DELETE',
        url: `/api/alerts/${alertId}`,
        headers: { authorization: 'Bearer valid-token-user-a' },
      });
      expect(removed.statusCode).toBe(200);
      expect(removed.json()).toEqual({ success: true });
    });

    it('prevents one authenticated user from marking another user\'s individual alert as read (404 invariant)', async () => {
      const alertId = await insertAlert('user-a', 'RELIANCE');
      const server = await openFor('user-b');

      const response = await server.inject({
        method: 'POST',
        url: `/api/alerts/${alertId}/read`,
        headers: { authorization: 'Bearer valid-token-user-b' },
      });
      // Must return 404 — same response as if the alert never existed
      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe('alert not found');

      // Confirm the alert is still unread for user-a
      const rows = await dbAdapter.query('SELECT is_read FROM user_alerts WHERE id = $1', [alertId]);
      expect((rows.rows[0] as any).is_read).toBe(0);
    });

    it('read-all does not mark other users\' alerts as read', async () => {
      await insertAlert('user-a', 'RELIANCE');
      await insertAlert('user-b', 'TCS');
      await insertAlert('user-b', 'INFY');
      const server = await openFor('user-a');

      const response = await server.inject({
        method: 'POST',
        url: '/api/alerts/read-all',
        headers: { authorization: 'Bearer valid-token-user-a' },
      });
      expect(response.statusCode).toBe(200);

      const rows = await dbAdapter.query('SELECT user_id, is_read FROM user_alerts ORDER BY user_id, id');
      expect(rows.rows).toEqual([
        { user_id: 'user-a', is_read: 1 },
        { user_id: 'user-b', is_read: 0 },
        { user_id: 'user-b', is_read: 0 },
      ]);
    });

    it('unread count for user-a excludes user-b alerts', async () => {
      await insertAlert('user-a', 'RELIANCE');
      await insertAlert('user-b', 'TCS');
      const server = await openFor('user-a');

      const unread = await server.inject({
        method: 'GET',
        url: '/api/alerts/unread',
        headers: { authorization: 'Bearer valid-token-user-a' },
      });
      expect(unread.json()).toEqual({ unreadCount: 1 });

      // user-b's unread is independent
      const serverB = await openFor('user-b');
      const unreadB = await serverB.inject({
        method: 'GET',
        url: '/api/alerts/unread',
        headers: { authorization: 'Bearer valid-token-user-b' },
      });
      expect(unreadB.json()).toEqual({ unreadCount: 1 });
    });

    it('treats non-existent alert IDs the same as not-owned alert IDs (404 invariant)', async () => {
      const server = await openFor('user-a');
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/alerts/99999',
        headers: { authorization: 'Bearer valid-token-user-a' },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe('alert not found');
    });

    it('repeated delete of own alert returns 404 on second attempt (idempotent failure)', async () => {
      const alertId = await insertAlert('user-a', 'RELIANCE');
      const server = await openFor('user-a');

      // First delete — success
      const first = await server.inject({
        method: 'DELETE',
        url: `/api/alerts/${alertId}`,
        headers: { authorization: 'Bearer valid-token-user-a' },
      });
      expect(first.statusCode).toBe(200);

      // Second delete — 404 (already gone)
      const second = await server.inject({
        method: 'DELETE',
        url: `/api/alerts/${alertId}`,
        headers: { authorization: 'Bearer valid-token-user-a' },
      });
      expect(second.statusCode).toBe(404);
      expect(second.json().error).toBe('alert not found');
    });

    it('returns empty list and 0 unread when user has no alerts', async () => {
      const server = await openFor('user-a');

      const list = await server.inject({
        method: 'GET',
        url: '/api/alerts',
        headers: { authorization: 'Bearer valid-token-user-a' },
      });
      expect(list.statusCode).toBe(200);
      expect(list.json().alerts).toEqual([]);
      expect(list.json().unreadCount).toBe(0);

      const unread = await server.inject({
        method: 'GET',
        url: '/api/alerts/unread',
        headers: { authorization: 'Bearer valid-token-user-a' },
      });
      expect(unread.json()).toEqual({ unreadCount: 0 });
    });
  });
});
