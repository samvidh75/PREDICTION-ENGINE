// src/backend/web/routes/investorState.ts
import type { FastifyPluginAsync } from "fastify";
import { loadAuthSession } from "../../../services/auth/sessionStore";

export const investorStateRoutes: FastifyPluginAsync = async (app) => {
  // Helper to resolve uid and ensure user exists in user_profiles to satisfy foreign key constraint
  const getUidAndEnsureUser = async (request: any): Promise<string> => {
    const uid = (request.headers["x-user-uid"] as string) || (request.query as any)?.uid || loadAuthSession().uid || "anonymous";
    if (app.postgres) {
      await app.postgres.query(
        `INSERT INTO user_profiles (uid, payload)
         VALUES ($1, '{}'::jsonb)
         ON CONFLICT (uid) DO NOTHING`,
        [uid]
      );
    }
    return uid;
  };

  // GET /api/investor-state
  app.get("/api/investor-state", async (request, reply) => {
    const uid = await getUidAndEnsureUser(request);
    if (!app.postgres) return { watchlists: [], alerts: [], memory: {}, dashboard_preferences: {} };

    const res = await app.postgres.query<any>(
      `SELECT watchlists, alerts, memory, dashboard_preferences FROM investor_state WHERE user_id = $1`,
      [uid]
    );

    if (res.rows.length === 0) {
      const defaultWatchlists = [
        { id: "1", name: "Long Term", tickers: ["RELIANCE", "INFY"], isArchived: false, isFavourite: true, order: 0 },
        { id: "2", name: "Defence", tickers: ["HAL"], isArchived: false, isFavourite: true, order: 1 },
        { id: "3", name: "High Conviction", tickers: ["HDFCBANK"], isArchived: false, isFavourite: false, order: 2 },
      ];
      await app.postgres.query(
        `INSERT INTO investor_state (user_id, watchlists, alerts, memory, dashboard_preferences)
         VALUES ($1, $2, $3, $4, $5)`,
        [uid, JSON.stringify(defaultWatchlists), "[]", "{}", "{}"]
      );
      return { watchlists: defaultWatchlists, alerts: [], memory: {}, dashboard_preferences: {} };
    }

    const row = res.rows[0];
    return {
      watchlists: typeof row.watchlists === "string" ? JSON.parse(row.watchlists) : row.watchlists,
      alerts: typeof row.alerts === "string" ? JSON.parse(row.alerts) : row.alerts,
      memory: typeof row.memory === "string" ? JSON.parse(row.memory) : row.memory,
      dashboard_preferences: typeof row.dashboard_preferences === "string" ? JSON.parse(row.dashboard_preferences) : row.dashboard_preferences,
    };
  });

  // POST /api/investor-state
  app.post("/api/investor-state", async (request, reply) => {
    const uid = await getUidAndEnsureUser(request);
    const body = (request.body as any) || {};

    if (!app.postgres) return { status: "ok" };

    const columns: string[] = [];
    const values: any[] = [];
    let paramIdx = 2;

    if (body.watchlists !== undefined) {
      columns.push(`watchlists = $${paramIdx++}`);
      values.push(JSON.stringify(body.watchlists));
    }
    if (body.alerts !== undefined) {
      columns.push(`alerts = $${paramIdx++}`);
      values.push(JSON.stringify(body.alerts));
    }
    if (body.memory !== undefined) {
      columns.push(`memory = $${paramIdx++}`);
      values.push(JSON.stringify(body.memory));
    }
    if (body.dashboard_preferences !== undefined) {
      columns.push(`dashboard_preferences = $${paramIdx++}`);
      values.push(JSON.stringify(body.dashboard_preferences));
    }

    if (columns.length === 0) {
      return { status: "ok" };
    }

    // Upsert using user_id conflict check
    await app.postgres.query(
      `INSERT INTO investor_state (user_id, watchlists, alerts, memory, dashboard_preferences)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET ${columns.join(", ")}, updated_at = CURRENT_TIMESTAMP`,
      [
        uid,
        JSON.stringify(body.watchlists || []),
        JSON.stringify(body.alerts || []),
        JSON.stringify(body.memory || {}),
        JSON.stringify(body.dashboard_preferences || {}),
        ...values
      ]
    );

    return { status: "ok" };
  });

};

export default investorStateRoutes;
