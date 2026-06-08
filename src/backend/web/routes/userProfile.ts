/**
 * TRACK-P4B-P2 — User Profile Routes (HARDENED)
 * 
 * UID comes ONLY from verified Firebase ID token via Authorization header.
 * NEVER accepts x-user-uid, ?uid=, loadAuthSession(), or "anonymous".
 */
import type { FastifyPluginAsync } from 'fastify';
import { requireAuthenticatedUser } from '../../auth/requireAuthenticatedUser';

export const userProfileRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/user/profile
  app.get('/api/user/profile', { preHandler: [requireAuthenticatedUser] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;

    if (!(app as any).postgres) {
      return reply.status(503).send({
        code: 'PERSISTENCE_UNAVAILABLE',
        error: 'User profile persistence is currently unavailable.',
      });
    }

    const res = await app.postgres.query(
      `SELECT payload FROM user_profiles WHERE uid = $1`,
      [uid]
    );

    if (res.rows.length === 0) {
      // No profile yet — return documented empty state
      return { uid, profile: {} };
    }

    return res.rows[0].payload;
  });

  // POST /api/user/profile
  app.post('/api/user/profile', { preHandler: [requireAuthenticatedUser] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;
    const payload = (request.body as Record<string, unknown>) ?? {};

    if (!app.postgres) {
      return reply.status(503).send({
        code: 'PERSISTENCE_UNAVAILABLE',
        error: 'User profile persistence is currently unavailable.',
      });
    }

    // UID comes ONLY from the verified token — caller cannot select another UID
    await app.postgres.query(
      `INSERT INTO user_profiles (uid, payload)
       VALUES ($1, $2)
       ON CONFLICT (uid) DO UPDATE SET payload = EXCLUDED.payload`,
      [uid, JSON.stringify(payload)]
    );

    return { status: 'ok', uid };
  });
};

export default userProfileRoutes;
