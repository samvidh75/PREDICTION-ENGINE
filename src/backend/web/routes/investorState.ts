/**
 * TRACK-P4B-P2 — Investor State Routes (HARDENED)
 * 
 * UID comes ONLY from verified Firebase ID token via Authorization header.
 * NEVER accepts x-user-uid, ?uid=, loadAuthSession(), or "anonymous".
 * NEVER shares state between users.
 */
import type { FastifyPluginAsync } from 'fastify';
import { requireAuthenticatedUser } from '../../auth/requireAuthenticatedUser';

export const investorStateRoutes: FastifyPluginAsync = async (app) => {
  // PERSISTENCE UNAVAILABLE CHECK
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
  app.get('/api/investor-state', { preHandler: [requireAuthenticatedUser] }, async (request, reply) => {
    const uid = request.authenticatedUser!.uid;
    if (!checkPersistence(reply)) return;

    const res = await (app as any).postgres.query(
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
};

export default investorStateRoutes;
