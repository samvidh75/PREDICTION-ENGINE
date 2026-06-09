/**
 * TRACK-P4B-P3G — Auth tests for userProfileRoutes using real plugin registration.
 *
 * Tests use:
 *   - app.register(userProfileRoutes) — the actual production plugin
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
import { userProfileRoutes } from '../userProfile';

// ---------------------------------------------------------------------------
// Mock verifier — accepts "valid-token-<uid>"
// ---------------------------------------------------------------------------
function mockVerifyFor(uid: string, email?: string): TokenVerifier {
  return {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === `valid-token-${uid}`) {
        return { uid, email };
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('userProfileRoutes auth (real plugin)', () => {
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
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/api/user/profile' });
    expect(res.statusCode).toBe(401);
  });

  // ---- POST without Authorization → 401 ----
  it('POST without Authorization → 401', async () => {
    app = Fastify({ logger: false });
    app.decorate('userDb', createMockUserDb());
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      payload: { name: 'Test' },
    });
    expect(res.statusCode).toBe(401);
  });

  // ---- invalid token → 403 ----
  it('invalid token → 403', async () => {
    app = Fastify({ logger: false });
    app.decorate('userDb', createMockUserDb());
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer bad-token' },
    });
    expect(res.statusCode).toBe(403);
  });

  // ---- own profile read → 200 ----
  it('own profile read → 200', async () => {
    const existingProfile = { name: 'Alice', preferences: { theme: 'dark' } };
    const mockDb = createMockUserDb([{ payload: existingProfile }]);
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(existingProfile);
  });

  // ---- own profile write → 200 ----
  it('own profile write → 200', async () => {
    const mockDb = createMockUserDb();
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { name: 'Alice Updated' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', uid: 'userA' });
  });

  // ---- spoofed x-user-uid ignored ----
  it('spoofed x-user-uid ignored', async () => {
    const mockDb = createMockUserDb([{ payload: { name: 'Alice' } }]);
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
      headers: {
        authorization: 'Bearer valid-token-userA',
        'x-user-uid': 'userB',
      },
    });
    expect(res.statusCode).toBe(200);
    // The route only uses request.authenticatedUser.uid — userA from token
    // x-user-uid is never read by requireAuthenticatedUser
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT payload FROM user_profiles WHERE uid = $1'),
      ['userA'],
    );
  });

  // ---- spoofed ?uid ignored ----
  it('spoofed ?uid ignored', async () => {
    const mockDb = createMockUserDb([{ payload: { name: 'Alice' } }]);
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile?uid=userB',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(res.statusCode).toBe(200);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE uid = $1'),
      ['userA'],
    );
  });

  // ---- body uid cannot override token uid ----
  it('body uid cannot override token uid', async () => {
    const mockDb = createMockUserDb();
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { uid: 'userB', name: 'Should not work' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.uid).toBe('userA');
    // The INSERT used userA, not userB from body
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_profiles'),
      ['userA', JSON.stringify({ uid: 'userB', name: 'Should not work' })],
    );
  });

  // ---- user A cannot read user B profile ----
  it('user A cannot read user B profile', async () => {
    const mockDb = createMockUserDb([{ payload: { name: 'Bob' } }]);
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userB'));
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userB' },
    });
    // userB gets their own profile, NOT userA's
    expect(res.statusCode).toBe(200);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE uid = $1'),
      ['userB'],
    );
    expect(mockDb.query).not.toHaveBeenCalledWith(
      expect.stringContaining('WHERE uid = $1'),
      ['userA'],
    );
  });

  // ---- user A cannot write user B profile ----
  it('user A cannot write user B profile', async () => {
    const mockDb = createMockUserDb();
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb);
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(userProfileRoutes);
    await app.ready();

    // Even if the body tries to reference userB, only the token UID matters
    const res = await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { target_uid: 'userB', data: 'malicious' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().uid).toBe('userA');
    const insertCall = mockDb.query.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO user_profiles'),
    );
    expect(insertCall[1][0]).toBe('userA');
  });

  // ---- missing userDb → 503 ----
  it('missing userDb → 503', async () => {
    app = Fastify({ logger: false });
    // Don't decorate userDb — it stays undefined
    setTokenVerifier(mockVerifyFor('userA'));
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ code: 'PERSISTENCE_UNAVAILABLE' });
  });
});
