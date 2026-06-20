/**
 * TRACK-P4B-P3G — Auth tests for investorStateRoutes using real plugin registration.
 *
 * Auth tests for investorStateRoutes using actual production route plugins.
 * Uses setTokenVerifier() / resetTokenVerifier() for mock injection.
 * Deletes manually copied route implementations.
 * Never calls real Firebase.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { setTokenVerifier, resetTokenVerifier } from '../../../auth/firebaseAdmin';
import type { TokenVerifier } from '../../../auth/firebaseAdmin';
import { investorStateRoutes } from '../investorState';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function mockDb(rows: Record<string, unknown>[] = []) {
  return {
    query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }),
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

describe('investorStateRoutes auth (production plugins)', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    resetTokenVerifier();
    if (app) {
      await app.close();
    }
    resetTokenVerifier();
  });

  // ---- GET without Authorization → 401 ----
  it('GET without Authorization → 401', async () => {
    setTokenVerifier(mockVerifierFor('userA'));
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb());
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
    });
    expect(res.statusCode).toBe(401);
  });

  // ---- POST without Authorization → 401 ----
  it('POST without Authorization → 401', async () => {
    setTokenVerifier(mockVerifierFor('userA'));
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb());
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
    setTokenVerifier(mockVerifierFor('userA'));
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb());
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });

  // ---- own state read → 200 ----
  it('own state read → 200 (empty for new user)', async () => {
    const db = mockDb([]);
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
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

  // ---- own state write → 200 ----
  it('own state write → 200', async () => {
    const db = mockDb();
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
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
  it('spoofed x-user-uid ignored — route uses token UID only', async () => {
    const db = mockDb([]);
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
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
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['userA'],
    );
  });

  // ---- spoofed ?uid ignored ----
  it('spoofed ?uid ignored — route ignores query params', async () => {
    const db = mockDb([]);
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state?uid=userB',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(res.statusCode).toBe(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['userA'],
    );
  });

  // ---- body uid cannot override token uid ----
  it('body uid cannot override token uid', async () => {
    const db = mockDb();
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: {
        user_id: 'userB',
        watchlists: ['SHOULD_NOT_WORK'],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().uid).toBe('userA');

    const insertCall = (db.query as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('INSERT INTO investor_state'),
    );
    expect(insertCall).toBeDefined();
    if (insertCall) {
      const params = insertCall[1] as unknown[];
      expect(params[0]).toBe('userA');
    }
  });

  // ---- user A cannot read user B state ----
  it('user A cannot read user B state', async () => {
    const db = mockDb([]);
    setTokenVerifier(mockVerifierFor('userB'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userB' },
    });
    expect(res.statusCode).toBe(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['userB'],
    );
  });

  // ---- user A cannot write user B state ----
  it('user A cannot write user B state', async () => {
    const db = mockDb();
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: {
        user_id: 'userB',
        watchlists: ['HACK_ATTEMPT'],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().uid).toBe('userA');

    const insertCall: unknown[] | undefined = (
      db.query as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('INSERT INTO investor_state'),
    );
    expect(insertCall).toBeDefined();
    if (insertCall) {
      const params = insertCall[1] as unknown[];
      expect(params[0]).toBe('userA');
    }
  });

  // ---- missing userDb → safe empty 200 ----
  it('missing userDb → safe empty 200 on GET', async () => {
    setTokenVerifier(mockVerifierFor('userA'));
    app = Fastify({ logger: false });
    // Do NOT decorate userDb
    await app.register(investorStateRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ watchlists: [], alerts: [], memory: {}, dashboard_preferences: {} });
  });

  // ---- no shared anonymous mutable state ----
  it('no shared anonymous mutable state — each user is isolated', async () => {
    const dbA = mockDb([
      {
        watchlists: JSON.stringify(['NIFTY50']),
        alerts: JSON.stringify([]),
        memory: JSON.stringify({}),
        dashboard_preferences: JSON.stringify({}),
      },
    ]);
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', dbA);
    await app.register(investorStateRoutes);
    await app.ready();

    const resA = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(resA.statusCode).toBe(200);
    expect(resA.json().watchlists).toEqual(['NIFTY50']);

    await app.close();
    resetTokenVerifier();

    // Separate app for userB
    const dbB = mockDb([
      {
        watchlists: JSON.stringify(['BANKNIFTY']),
        alerts: JSON.stringify([{ symbol: 'TCS', threshold: 3500 }]),
        memory: JSON.stringify({}),
        dashboard_preferences: JSON.stringify({}),
      },
    ]);
    setTokenVerifier(mockVerifierFor('userB'));

    const appB = Fastify({ logger: false });
    appB.decorate('userDb', dbB);
    await appB.register(investorStateRoutes);
    await appB.ready();

    const resB = await appB.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userB' },
    });
    expect(resB.statusCode).toBe(200);
    expect(resB.json().watchlists).toEqual(['BANKNIFTY']);
    // userA's data NOT leaked to userB
    expect(resB.json().watchlists).not.toContain('NIFTY50');

    await appB.close();
  });
});
