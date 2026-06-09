/**
 * TRACK-P4B-P3D — Investor State Routes (userDb-migrated)
 *
 * UID comes ONLY from verified Firebase ID token via Authorization header.
 * Private user data uses app.userDb (PostgreSQL-only, never SQLite).
 * Missing app.userDb returns HTTP 503.
 */
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { requireAuthenticatedUser } from '../../auth/requireAuthenticatedUser';

export const investorStateRoutes: FastifyPluginAsync = async (app) => {
  const getUserDb = () => app.userDb;

  function checkPersistence(reply: FastifyReply): boolean {
    if (!getUserDb()) {
      reply.status(503).send({
        code: 'PERSISTENCE_UNAVAILABLE',
        error: 'Investor state persistence is currently unavailable.',
      });
      return false;
    }
    return true;
  }

  // GET /api/investor-state
  app.get('/api/investor-state', { preHandler: [requireAuthenticatedUser] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;
    if (!checkPersistence(reply)) return;

    const userDb = getUserDb()!;
    const res = await userDb.query(
      `SELECT watchlists, alerts, memory, dashboard_preferences FROM investor_state WHERE user_id = $1`,
      [uid]
    );

    if (res.rows.length === 0) {
      return { watchlists: [], alerts: [], memory: {}, dashboard_preferences: {} };
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
  app.post('/api/investor-state', { preHandler: [requireAuthenticatedUser] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;
    const body = (request.body as Record<string, unknown>) || {};
    if (!checkPersistence(reply)) return;

    const userDb = getUserDb()!;
    await userDb.query(
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
};

export default investorStateRoutes;
