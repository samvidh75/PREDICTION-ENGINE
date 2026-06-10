/**
 * @vitest-environment node
 *
 * UIUX-P0 private state audit.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { setTokenVerifier, resetTokenVerifier, type TokenVerifier } from '../../../src/backend/auth/firebaseAdmin';
import { investorStateRoutes } from '../../../src/backend/web/routes/investorState';
import { userProfileRoutes } from '../../../src/backend/web/routes/userProfile';

function verifierFor(uid: string): TokenVerifier {
  return {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === `valid-token-${uid}`) return { uid, email: `${uid}@example.com` };
      throw new Error('Invalid token');
    }),
  };
}

function mockDb(rows: Record<string, unknown>[] = []) {
  return { query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }) };
}

describe('UIUX-P0 private state boundaries', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    resetTokenVerifier();
    if (app) await app.close();
  });

  it('investor state rejects missing and invalid tokens', async () => {
    setTokenVerifier(verifierFor('userA'));
    app = Fastify({ logger: false });
    app.decorate('userDb', mockDb());
    await app.register(investorStateRoutes);
    await app.ready();

    const missing = await app.inject({ method: 'GET', url: '/api/investor-state' });
    expect(missing.statusCode).toBe(401);

    const invalid = await app.inject({
      method: 'GET',
      url: '/api/investor-state',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(invalid.statusCode).toBe(403);
  });

  it('user profile uses token uid and ignores uid query/body overrides', async () => {
    const db = mockDb([{ payload: { uid: 'userA', displayName: 'A' } }]);
    setTokenVerifier(verifierFor('userA'));
    app = Fastify({ logger: false });
    app.decorate('userDb', db);
    await app.register(userProfileRoutes);
    await app.ready();

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/user/profile?uid=userB',
      headers: { authorization: 'Bearer valid-token-userA' },
    });
    expect(getRes.statusCode).toBe(200);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE uid = $1'), ['userA']);

    await app.inject({
      method: 'POST',
      url: '/api/user/profile',
      headers: { authorization: 'Bearer valid-token-userA' },
      payload: { uid: 'userB', displayName: 'Override Attempt' },
    });

    const postCall = db.query.mock.calls.find((call) => String(call[0]).includes('INSERT INTO user_profiles'));
    expect(postCall?.[1]?.[0]).toBe('userA');
  });
});
