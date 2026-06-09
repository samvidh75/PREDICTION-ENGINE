/**
 * @vitest-environment node
 *
 * Auth tests for userProfileRoutes using actual production route plugins.
 * Uses setTokenVerifier() / resetTokenVerifier() for mock injection.
 * Deletes manually copied route implementations.
 * Never calls real Firebase.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { setTokenVerifier, resetTokenVerifier } from '../../../auth/firebaseAdmin';
import type { TokenVerifier } from '../../../auth/firebaseAdmin';
import { userProfileRoutes } from '../userProfile';

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('userProfileRoutes auth (production plugins)', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    resetTokenVerifier();
    if (app) {
      await app.close();
    }
  });

  // ---- GET without Authorization → 401 ----
  it('GET without Authorization → 401', async () => {
    setTokenVerifier(mockVerifierFor('userA'));
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb());
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/api/user/profile' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'AUTH_MISSING' });
  });

  // ---- POST without Authorization → 401 ----
  it('POST without Authorization → 401', async () => {
    setTokenVerifier(mockVerifierFor('userA'));
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb());
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      payload: { name: 'Test' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'AUTH_MISSING' });
  });

  // ---- invalid token → 403 ----
  it('invalid token → 403', async () => {
    setTokenVerifier(mockVerifierFor('userA'));
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb());
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
  });

  // ---- own profile read → 200 ----
  it('own profile read → 200', async () => {
    const existingProfile = { name: 'Alice', theme: 'dark' };
    const db = mockDb([{ payload: existingProfile }]);
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
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
    const db = mockDb();
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
    await app.register(userProfileRoutes);
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

  // ---- spoofed x-user-uid ignored ----
  it('spoofed x-user-uid ignored — route uses token UID only', async () => {
    const db = mockDb([{ payload: {} }]);
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
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
    // The query should be for userA (from token), not userB
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE uid = $1'),
      ['userA'],
    );
  });

  // ---- spoofed ?uid ignored ----
  it('spoofed ?uid ignored — route ignores query params', async () => {
    const db = mockDb([{ payload: {} }]);
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile?uid=userB',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(res.statusCode).toBe(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE uid = $1'),
      ['userA'],
    );
  });

  // ---- body uid cannot override token uid ----
  it('body uid cannot override token uid', async () => {
    const db = mockDb();
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { uid: 'userB', name: 'Should NOT work' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.uid).toBe('userA');
  });

  // ---- user A cannot read user B profile ----
  it('user A cannot read user B profile', async () => {
    const db = mockDb([]);
    setTokenVerifier(mockVerifierFor('userB'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userB' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.uid).toBe('userB');
    // Query uses userB's token UID, not userA
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE uid = $1'),
      ['userB'],
    );
  });

  // ---- user A cannot write user B profile ----
  it('user A cannot write user B profile', async () => {
    const db = mockDb();
    setTokenVerifier(mockVerifierFor('userA'));

    app = Fastify({ logger: false });
    app.decorate('userDb', db);
    await app.register(userProfileRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { uid: 'userB', name: 'Hijack attempt' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().uid).toBe('userA');
    const insertCall = (db.query as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO user_profiles'),
    );
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall[1][0]).toBe('userA');
    }
  });

  // ---- missing userDb → 503 ----
  it('missing userDb → 503 on GET', async () => {
    setTokenVerifier(mockVerifierFor('userA'));
    app = Fastify({ logger: false });
    // Do NOT decorate userDb
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
