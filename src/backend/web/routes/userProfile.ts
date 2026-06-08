/**
 * TRACK-P4B-P3D — User Profile Routes (userDb-migrated)
 *
 * UID comes ONLY from verified Firebase ID token via Authorization header.
 * Private user data uses app.userDb (PostgreSQL-only, never SQLite).
 * Missing app.userDb returns HTTP 503.
 */
import type { FastifyPluginAsync } from 'fastify';
import { requireAuthenticatedUser } from '../../auth/requireAuthenticatedUser';

export const userProfileRoutes: FastifyPluginAsync = async (app) => {
  const getUserDb = () => (app as any).userDb as { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } | undefined;

  // GET /api/user/profile
  app.get('/api/user/profile', { preHandler: [requireAuthenticatedUser] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;
    const userDb = getUserDb();

    if (!userDb) {
      return reply.status(503).send({
        code: 'PERSISTENCE_UNAVAILABLE',
        error: 'User profile persistence is currently unavailable.',
      });
    }

    const res = await userDb.query(
      `SELECT payload FROM user_profiles WHERE uid = $1`,
      [uid]
    );

    if (res.rows.length === 0) {
      return { uid, profile: {} };
    }

    return res.rows[0].payload;
  });

  // POST /api/user/profile
  app.post('/api/user/profile', { preHandler: [requireAuthenticatedUser] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;
    const payload = (request.body as Record<string, unknown>) ?? {};
    const userDb = getUserDb();

    if (!userDb) {
      return reply.status(503).send({
        code: 'PERSISTENCE_UNAVAILABLE',
        error: 'User profile persistence is currently unavailable.',
      });
    }

    await userDb.query(
      `INSERT INTO user_profiles (uid, payload)
       VALUES ($1, $2)
       ON CONFLICT (uid) DO UPDATE SET payload = EXCLUDED.payload`,
      [uid, JSON.stringify(payload)]
    );

    return { status: 'ok', uid };
  });
};

export default userProfileRoutes;
