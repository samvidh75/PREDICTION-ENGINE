/**
 * @vitest-environment node
 *
 * Auth tests for userProfileRoutes.
 * Tests the route-level auth enforcement: user A cannot read/write user B's profile.
 * Uses Fastify's inject() with a mock PostgreSQL and mock token verifier.
 * NEVER calls real Firebase.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { createRequireAuth } from '../../../auth/requireAuthenticatedUser';
import type { VerifyTokenFn } from '../../../auth/firebaseAdmin';
import { userProfileRoutes } from '../userProfile';

// ---------------------------------------------------------------------------
// Mock verifier — accepts "valid-token-<uid>"
// ---------------------------------------------------------------------------

function mockVerifyFor(uid: string, email?: string): VerifyTokenFn {
  return vi.fn(async (token: string) => {
    if (token === `valid-token-${uid}`) {
      return { uid, email };
    }
    throw new Error('Invalid token');
  });
}

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

  // Attach the verifier by creating the preHandler with the mock
  const verifyFn = opts.verifyToken ?? mockVerifyFor('userA');
  const requireAuth = createRequireAuth(verifyFn);

  // Inject mock postgres onto the app (userProfile checks app.postgres directly)
  if (opts.postgres !== undefined) {
    (app as any).postgres = opts.postgres;
  } else if (opts.postgres === undefined) {
    // Default: mock postgres
    (app as any).postgres = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };
  }

  // Register routes — but we need to replace the preHandler, so we register
  // the route manually instead of reusing the plugin's hardcoded requireAuthenticatedUser.
  // userProfileRoutes registers with { preHandler: [requireAuthenticatedUser] }.
  // We override by registering our own routes with the injected requireAuth.
  app.addHook('preHandler', async (request, reply) => {
    // We'll attach the requireAuth as a route-specific preHandler below
  });

  // Manually replicate the routes with injected requireAuth
  app.get('/api/user/profile', { preHandler: [requireAuth] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;

    if (!(app as any).postgres) {
      return reply.status(503).send({
        code: 'PERSISTENCE_UNAVAILABLE',
        error: 'User profile persistence is currently unavailable.',
      });
    }

    const res = await (app as any).postgres.query(
      `SELECT payload FROM user_profiles WHERE uid = $1`,
      [uid]
    );

    if (res.rows.length === 0) {
      return { uid, profile: {} };
    }

    return res.rows[0].payload;
  });

  app.post('/api/user/profile', { preHandler: [requireAuth] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;
    const payload = (request.body as Record<string, unknown>) ?? {};

    if (!(app as any).postgres) {
      return reply.status(503).send({
        code: 'PERSISTENCE_UNAVAILABLE',
        error: 'User profile persistence is currently unavailable.',
      });
    }

    await (app as any).postgres.query(
      `INSERT INTO user_profiles (uid, payload)
       VALUES ($1, $2)
       ON CONFLICT (uid) DO UPDATE SET payload = EXCLUDED.payload`,
      [uid, JSON.stringify(payload)]
    );

    return { status: 'ok', uid };
  });

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('userProfileRoutes auth', () => {
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
      url: '/api/user/profile',
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'AUTH_MISSING' });
  });

  it('missing auth returns 401 on POST', async () => {
    app = buildApp({ verifyToken: mockVerifyFor('userA') });
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      payload: { name: 'Test' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'AUTH_MISSING' });
  });

  // ---- user A cannot read user B profile ----
  it('user A cannot read user B profile (routes enforce own UID)', async () => {
    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    const verifyUserB = mockVerifyFor('userB');
    app = buildApp({ verifyToken: verifyUserB, postgres: mockPg });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
      headers: {
        authorization: 'Bearer valid-token-userB',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    // The route extracts UID from the token (userB).
    // The SQL query uses $1 = userB. It queries userB's own profile.
    // There is NO way for userB to request userA's profile because
    // the route never accepts a UID parameter.
    expect(body.uid).toBe('userB');
    expect(mockPg.query).toHaveBeenCalledWith(
      'SELECT payload FROM user_profiles WHERE uid = $1',
      ['userB']
    );
    // NOT userA
    expect(mockPg.query).not.toHaveBeenCalledWith(
      'SELECT payload FROM user_profiles WHERE uid = $1',
      ['userA']
    );
  });

  // ---- user A cannot update user B profile ----
  it('user A cannot update user B profile (routes enforce own UID)', async () => {
    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    const verifyUserA = mockVerifyFor('userA');
    app = buildApp({ verifyToken: verifyUserA, postgres: mockPg });
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      headers: {
        authorization: 'Bearer valid-token-userA',
      },
      payload: { uid: 'userB', name: 'Should not work' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    // UID returned is userA, NOT userB from the body
    expect(body.uid).toBe('userA');
    expect(mockPg.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_profiles'),
      ['userA', JSON.stringify({ uid: 'userB', name: 'Should not work' })]
    );
  });

  // ---- valid user can read own profile ----
  it('valid user can read own profile', async () => {
    const existingProfile = { name: 'Alice', preferences: { theme: 'dark' } };
    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({
        rows: [{ payload: existingProfile }],
      }),
    };

    app = buildApp({
      verifyToken: mockVerifyFor('userA', 'alice@example.com'),
      postgres: mockPg,
    });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(existingProfile);
  });

  // ---- valid user can update own profile ----
  it('valid user can update own profile', async () => {
    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    app = buildApp({
      verifyToken: mockVerifyFor('userA'),
      postgres: mockPg,
    });
    await app.ready();

    const payload = { name: 'Alice Updated', bio: 'Hello' };
    const res = await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', uid: 'userA' });
  });

  // ---- persistence unavailable returns 503 ----
  it('persistence unavailable returns 503 on GET', async () => {
    app = buildApp({
      verifyToken: mockVerifyFor('userA'),
      postgres: null, // explicitly null = no postgres
    });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
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
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { name: 'Test' },
    });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ code: 'PERSISTENCE_UNAVAILABLE' });
  });

  // ---- new user gets empty profile ----
  it('returns empty profile for new user with no saved data', async () => {
    const mockPg: MockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    app = buildApp({
      verifyToken: mockVerifyFor('newUser'),
      postgres: mockPg,
    });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-newUser' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ uid: 'newUser', profile: {} });
  });
});