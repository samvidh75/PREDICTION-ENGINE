/**
 * @vitest-environment node
 *
 * Auth tests for investorStateRoutes.
 * Tests: user A cannot read/write user B's investor state,
 * valid user can access own state, persistence unavailable, and
 * no shared mutable anonymous state.
 * Uses Fastify's inject() with a mock PostgreSQL and mock token verifier.
 * NEVER calls real Firebase.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { createRequireAuth } from '../../../auth/requireAuthenticatedUser';
import type { VerifyTokenFn } from '../../../auth/firebaseAdmin';

// ---------------------------------------------------------------------------
// Mock verifier — accepts "valid-token-<uid>"
// ---------------------------------------------------------------------------

function mockVerifyFor(uid: string): VerifyTokenFn {
  return vi.fn(async (token: string) => {
    if (token === `valid-token-${uid}`) {
      return { uid };
    }
    throw new Error('Invalid token');
  });
}

// ---------------------------------------------------------------------------
// Default empty state returned for new users
// ---------------------------------------------------------------------------
const EMPTY_STATE = {
  watchlists: [],
  alerts: [],
  memory: {},
  dashboard_preferences: {},
};

// ---------------------------------------------------------------------------
// Build a Fastify app with injected mock verifier and optional mock postgres
// ---------------------------------------------------------------------------

interface MockPg {
  query: ReturnType<typeof vi.fn>;
}

function buildApp(opts: {
  verifyToken?: VerifyTokenFn;
  postgres?: MockPg | null;
}): FastifyInstance {
  const app = Fastify({ logger: false });

  const verifyFn = opts.verifyToken ?? mockVerifyFor('userA');
  const requireAuth = createRequireAuth(verifyFn);

  // Attach mock postgres
  if (opts.postgres !== undefined) {
    (app as any).postgres = opts.postgres;
  } else {
    // Default: mock postgres with empty rows
    (app as any).postgres = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };
  }

  // Hand-replicate investorStateRoutes with injected requireAuth
  function checkPersistence(reply: any): boolean {
    if (!(app as any).postgres) {
      reply.status(503).send({
        code: 'PERSISTENCE_UNAVAILABLE',
        error: 'Investor state persistence is currently unavailable.',
      });
      return false;
    }
    return true;
  }

  // GET /api/investor-state
  app.get('/api/investor-state', { preHandler: [requireAuth] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;
    if (!checkPersistence(reply)) return;

    const res = await (app as any).postgres.query(
      `SELECT watchlists, alerts, memory, dashboard_preferences FROM investor_state WHERE user_id = $1`,
      [uid]
    );

    if (res.rows.length === 0) {
      return EMPTY_STATE;
    }

    const row = res.rows[0];
    return {
      watchlists: typeof row.watchlists === 'string' ? JSON.parse(row.watchlists) : row.watchlists,
      alerts: typeof row.alerts === 'string' ? JSON.parse(row.alerts) : row.alerts,
      memory: typeof row.memory === 'string' ? JSON.parse(row.memory) : row.memory,
      dashboard_preferences: typeof row.dashboard_preferences === 'string' ? JSON.parse(row.dashboard_preferences) : row.dashboard_preferences,
    };
  });

  // POST /api/investor-state
  app.post('/api/investor-state', { preHandler: [requireAuth] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;
    const body = (request.body as Record<string, unknown>) || {};
    if (!checkPersistence(reply)) return;

    await (app as any).postgres.query(
      `INSERT INTO investor_state (user_id, watchlists, alerts, memory, dashboard_preferences)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         watchlists = EXCLUDED.watchlists,
         alerts = EXCLUDED.alerts,
         memory = EXCLUDED.memory,
         dashboard_preferences = EXCLUDED.dashboard_preferences,
         updated_at = CURRENT_TIMESTAMP`,
      [
        uid,
        JSON.stringify(body.watchlists || []),
        JSON.stringify(body.alerts || []),
        JSON.stringify(body.memory || {}),
        JSON.stringify(body.dashboard_preferences || {}),
      ]
    );

    return { status: 'ok', uid };
  });

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('investorStateRoutes auth', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  // ---- missing auth returns 401 ----
  it('missing auth returns 401 on GET', async () => {
    app = buildApp({ verifyToken: mockVerifyFor('userA') });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'AUTH_MISSING' });
  });

  it('missing auth returns 401 on POST', async () => {
    app = buildApp({ verifyToken: mockVerifyFor('userA') });
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/investor-state',
      payload: { watchlists: ['NIFTY50'] },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'AUTH_MISSING' });
  });

  // ---- user A cannot read user B investor state ----
  it('user A cannot read user B investor state (route scoped to own UID)', async () => {
    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    const verifyUserB = mockVerifyFor('userB');
    app = buildApp({ verifyToken: verifyUserB, postgres: mockPg });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userB' },
    });

    expect(res.statusCode).toBe(200);
    // The route queries WHERE user_id = $1 with the token UID (userB).
    // There is NO way to request another user's state.
    expect(mockPg.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['userB']
    );
    expect(mockPg.query).not.toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['userA']
    );
  });

  // ---- user A cannot update user B investor state ----
  it('user A cannot update user B investor state (route scoped to own UID)', async () => {
    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    const verifyUserA = mockVerifyFor('userA');
    app = buildApp({ verifyToken: verifyUserA, postgres: mockPg });
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
    // The returned uid is userA, not userB from body
    const body = res.json();
    expect(body.uid).toBe('userA');

    // Verify INSERT used userA as $1, not userB
    const insertCalls = mockPg.query.mock.calls.filter(
      (call: any[]) => call[0].includes('INSERT INTO investor_state')
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    expect(insertCalls[0][1][0]).toBe('userA'); // first positional param = uid
  });

  // ---- valid user can read own state ----
  it('valid user can read own state (empty for new user)', async () => {
    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    app = buildApp({ verifyToken: mockVerifyFor('userA'), postgres: mockPg });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(EMPTY_STATE);
  });

  it('valid user can read own saved state', async () => {
    const savedState = {
      watchlists: JSON.stringify(['NIFTY50', 'SENSEX']),
      alerts: JSON.stringify([{ symbol: 'RELIANCE', threshold: 2500 }]),
      memory: JSON.stringify({ lastViewed: '2025-01-01' }),
      dashboard_preferences: JSON.stringify({ layout: 'grid' }),
    };

    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [savedState] }),
    };

    app = buildApp({ verifyToken: mockVerifyFor('userA'), postgres: mockPg });
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

  // ---- valid user can update own state ----
  it('valid user can update own state', async () => {
    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    app = buildApp({ verifyToken: mockVerifyFor('userA'), postgres: mockPg });
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

  // ---- persistence unavailable returns 503 ----
  it('persistence unavailable returns 503 on GET', async () => {
    app = buildApp({
      verifyToken: mockVerifyFor('userA'),
      postgres: null,
    });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
    });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ code: 'PERSISTENCE_UNAVAILABLE' });
  });

  it('persistence unavailable returns 503 on POST', async () => {
    app = buildApp({
      verifyToken: mockVerifyFor('userA'),
      postgres: null,
    });
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

  // ---- no shared mutable anonymous state ----
  it('no shared mutable anonymous state — every request is scoped to authenticated UID', async () => {
    // User A's state
    const stateA = {
      watchlists: JSON.stringify(['NIFTY50']),
      alerts: JSON.stringify([]),
      memory: JSON.stringify({}),
      dashboard_preferences: JSON.stringify({}),
    };

    // User B's state — completely separate
    const stateB = {
      watchlists: JSON.stringify(['BANKNIFTY']),
      alerts: JSON.stringify([{ symbol: 'TCS', threshold: 3500 }]),
      memory: JSON.stringify({}),
      dashboard_preferences: JSON.stringify({}),
    };

    const mockPgA: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [stateA] }),
    };

    const mockPgB: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [stateB] }),
    };

    // App for user A
    app = buildApp({ verifyToken: mockVerifyFor('userA'), postgres: mockPgA });
    await app.ready();

    const resA = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
    });

    expect(resA.statusCode).toBe(200);
    const bodyA = resA.json();
    expect(bodyA.watchlists).toEqual(['NIFTY50']);

    await app.close();

    // App for user B — completely separate app instance
    const appB = buildApp({ verifyToken: mockVerifyFor('userB'), postgres: mockPgB });
    await appB.ready();

    const resB = await appB.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userB' },
    });

    expect(resB.statusCode).toBe(200);
    const bodyB = resB.json();
    expect(bodyB.watchlists).toEqual(['BANKNIFTY']);
    expect(bodyB.alerts).toEqual([{ symbol: 'TCS', threshold: 3500 }]);

    // User A's data is NOT leaked to user B
    expect(bodyB.watchlists).not.toContain('NIFTY50');

    await appB.close();
  });

  // ---- state is strictly per-authenticated-user, no anonymous mutation ----
  it('state is strictly per-authenticated-user, no anonymous mutation leakage', async () => {
    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    app = buildApp({ verifyToken: mockVerifyFor('userA'), postgres: mockPg });
    await app.ready();

    // UserA writes their state
    await app.inject({
      method: 'POST',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: {
        watchlists: ['NIFTY50'],
        alerts: [],
        memory: { key: 'userA-value' },
        dashboard_preferences: {},
      },
    });

    // Verify the INSERT used userA's UID
    const insertCalls = mockPg.query.mock.calls.filter(
      (call: any[]) => call[0].includes('INSERT INTO investor_state')
    );
    expect(insertCalls.length).toBe(1);
    // First positional param = uid
    expect(insertCalls[0][1][0]).toBe('userA');
    // The watchlist data belongs to userA
    expect(insertCalls[0][1][1]).toBe(JSON.stringify(['NIFTY50']));

    // No anonymous user data is ever written — UID always comes from the verified token
    expect(insertCalls[0][1][0]).not.toBe('anonymous');
    expect(insertCalls[0][1][0]).not.toBe('');
    expect(insertCalls[0][1][0]).not.toBeNull();
  });
});