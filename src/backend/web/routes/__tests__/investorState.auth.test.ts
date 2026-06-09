/**
 * TRACK-P4B-P3G — Auth tests for investorStateRoutes using real plugin registration.
 *
 * Tests use:
 *   - app.register(investorStateRoutes) — the actual production plugin
 *   - setTokenVerifier() / resetTokenVerifier() — mock token injection
 *   - app.decorate("userDb", mockDb) — mock userDb
 *
 * NEVER calls live Firebase. No hand-replicated route handlers.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { setTokenVerifier, resetTokenVerifier } from '../../../auth/firebaseAdmin';
import type { TokenVerifier } from '../../../auth/firebaseAdmin';
import { investorStateRoutes } from '../investorState';

// ---------------------------------------------------------------------------
// Mock verifier — accepts "valid-token-<uid>"
// ---------------------------------------------------------------------------
function mockVerifyFor(uid: string): TokenVerifier {
  return {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === `valid-token-${uid}`) {
        return { uid };
      }
      throw new Error('Invalid token');
    }),
  };
}

// ---------------------------------------------------------------------------
// Mock userDb — matches fastify.d.ts userDb type
// ---------------------------------------------------------------------------
function createMockUserDb(rows: Record<string, unknown>[] = []) {
  return {
    query: vi.fn<[string, unknown[]?], Promise<{ rows: Record<string, unknown>[]; rowCount?: number }>>()
      .mockResolvedValue({ rows }),
  };
}

const EMPTY_STATE = {
  watchlists: [],
  alerts: [],
  memory: {},
  dashboard_preferences: {},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('investorStateRoutes auth (real plugin)', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    resetTokenVerifier();
  });

  // ---- GET without Authorization → 401 ----
  it('GET without Authorization → 401', async () => {
    app = Fastify({ logger: false });
    app.decorate('userDb', createMockUserDb());
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/api/investor-state' });
    expect(res.statusCode).toBe(401);
  });

  // ---- POST without Authorization → 401 ----
  it('POST without Authorization → 401', async () => {
    app = Fastify({ logger: false });
    app.decorate('userDb', createMockUserDb());
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/investor-state',
      payload: { watchlists: ['NIFTY50'] },
    });
    expect(res.statusCode).toBe(401);
  });

  // ---- invalid token → 403 ----
  it('invalid token → 403', async () => {
    app = Fastify({ logger: false });
    app.decorate('userDb', createMockUserDb());
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer bad-token' },
    });
    expect(res.statusCode).toBe(403);
  });

  // ---- own state read → 200 ----
  it('own state read → 200 (empty for new user)', async () => {
    const mockDb = createMockUserDb([]);
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(EMPTY_STATE);
  });

  it('own state read → 200 (with saved data)', async () => {
    const savedState = {
      watchlists: JSON.stringify(['NIFTY50', 'SENSEX']),
      alerts: JSON.stringify([{ symbol: 'RELIANCE', threshold: 2500 }]),
      memory: JSON.stringify({ lastViewed: '2025-01-01' }),
      dashboard_preferences: JSON.stringify({ layout: 'grid' }),
    };

    const mockDb = createMockUserDb([savedState]);
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.watchlists).toEqual(['NIFTY50', 'SENSEX']);
    expect(body.alerts).toEqual([{ symbol: 'RELIANCE', threshold: 2500 }]);
    expect(body.memory).toEqual({ lastViewed: '2025-01-01' });
    expect(body.dashboard_preferences).toEqual({ layout: 'grid' });
  });

  // ---- own state write → 200 ----
  it('own state write → 200', async () => {
    const mockDb = createMockUserDb();
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: {
        watchlists: ['BANKNIFTY'],
        alerts: [],
        memory: { lastSearch: 'HDFC' },
        dashboard_preferences: { theme: 'light' },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', uid: 'userA' });
  });

  // ---- spoofed x-user-uid ignored ----
  it('spoofed x-user-uid ignored', async () => {
    const mockDb = createMockUserDb([]);
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: {
        authorization: 'Bearer valid-token-userA',
        'x-user-uid': 'userB',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['userA'],
    );
  });

  // ---- spoofed ?uid ignored ----
  it('spoofed ?uid ignored', async () => {
    const mockDb = createMockUserDb([]);
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state?uid=userB',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(res.statusCode).toBe(200);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['userA'],
    );
  });

  // ---- body uid cannot override token uid ----
  it('body user_id cannot override token uid', async () => {
    const mockDb = createMockUserDb();
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { user_id: 'userB', watchlists: ['SHOULD_NOT_WORK'] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.uid).toBe('userA');

    const insertCall = mockDb.query.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO investor_state'),
    );
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall[1][0]).toBe('userA');
    }
  });

  // ---- user A cannot read user B state ----
  it('user A cannot read user B state', async () => {
    const mockDb = createMockUserDb([]);
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userB'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userB' },
    });
    expect(res.statusCode).toBe(200);
    // Query uses userB, NOT userA
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['userB'],
    );
    expect(mockDb.query).not.toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['userA'],
    );
  });

  // ---- user A cannot write user B state ----
  it('user A cannot write user B state', async () => {
    const mockDb = createMockUserDb();
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { target_user: 'userB', secret_data: 'malicious' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().uid).toBe('userA');
  });

  // ---- missing userDb → 503 (GET) ----
  it('missing userDb → 503 on GET', async () => {
    app = Fastify({ logger: false });
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ code: 'PERSISTENCE_UNAVAILABLE' });
  });

  // ---- missing userDb → 503 (POST) ----
  it('missing userDb → 503 on POST', async () => {
    app = Fastify({ logger: false });
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { watchlists: ['NIFTY50'] },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ code: 'PERSISTENCE_UNAVAILABLE' });
  });

  // ---- no shared anonymous mutable state ----
  it('no shared anonymous mutable state — every request scoped to authenticated UID', async () => {
    const mockDb = createMockUserDb([]);
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(investorStateRoutes);
    await app.ready();

    await app.inject({
      method: 'POST',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { watchlists: ['NIFTY50'], alerts: [], memory: { key: 'userA' }, dashboard_preferences: {} },
    });

    const insertCalls = mockDb.query.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO investor_state'),
    );
    expect(insertCalls.length).toBe(1);
    // UID must be from the authenticated token, not anonymous or empty
    expect(insertCalls[0][1][0]).toBe('userA');
    expect(insertCalls[0][1][0]).not.toBe('anonymous');
    expect(insertCalls[0][1][0]).not.toBe('');
    expect(insertCalls[0][1][0]).not.toBeNull();
  });
});
