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

  // GET /api/watchlists
  app.get("/api/watchlists", async (request, reply) => {
    const uid = await getUidAndEnsureUser(request);
    if (!app.postgres) return [];

    const res = await app.postgres.query<any>(
      `SELECT watchlists FROM investor_state WHERE user_id = $1`,
      [uid]
    );
    if (res.rows.length === 0) return [];
    const watchlists = res.rows[0].watchlists;
    return typeof watchlists === "string" ? JSON.parse(watchlists) : watchlists;
  });

  // POST /api/watchlists
  app.post("/api/watchlists", async (request, reply) => {
    const uid = await getUidAndEnsureUser(request);
    const body = (request.body as any) || {};
    if (!app.postgres) return { id: "1", name: body.name || "Default", tickers: [] };

    const stateRes = await app.postgres.query<any>(
      `SELECT watchlists FROM investor_state WHERE user_id = $1`,
      [uid]
    );
    let watchlists: any[] = [];
    if (stateRes.rows.length > 0) {
      const w = stateRes.rows[0].watchlists;
      watchlists = typeof w === "string" ? JSON.parse(w) : (w as any[]);
    }

    const nextWatchlist = {
      id: Math.random().toString(36).substring(2, 9),
      name: body.name || "New Watchlist",
      tickers: body.tickers || [],
      isArchived: false,
      isFavourite: false,
      order: watchlists.length,
    };

    watchlists.push(nextWatchlist);

    await app.postgres.query(
      `INSERT INTO investor_state (user_id, watchlists)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET watchlists = EXCLUDED.watchlists, updated_at = CURRENT_TIMESTAMP`,
      [uid, JSON.stringify(watchlists)]
    );

    return nextWatchlist;
  });

  // PUT /api/watchlists/:id
  app.put("/api/watchlists/:id", async (request, reply) => {
    const uid = await getUidAndEnsureUser(request);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    if (!app.postgres) return { status: "ok" };

    const stateRes = await app.postgres.query<any>(
      `SELECT watchlists FROM investor_state WHERE user_id = $1`,
      [uid]
    );
    if (stateRes.rows.length === 0) return { status: "error", message: "Not found" };

    let watchlists = stateRes.rows[0].watchlists;
    watchlists = typeof watchlists === "string" ? JSON.parse(watchlists) : watchlists;

    const found = watchlists.find((w: any) => w.id === id);
    if (found) {
      if (body.name !== undefined) found.name = body.name;
      if (body.tickers !== undefined) found.tickers = body.tickers;
      if (body.isArchived !== undefined) found.isArchived = body.isArchived;
      if (body.isFavourite !== undefined) found.isFavourite = body.isFavourite;
      if (body.order !== undefined) found.order = body.order;
    }

    await app.postgres.query(
      `UPDATE investor_state SET watchlists = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [JSON.stringify(watchlists), uid]
    );

    return { status: "ok" };
  });

  // DELETE /api/watchlists/:id
  app.delete("/api/watchlists/:id", async (request, reply) => {
    const uid = await getUidAndEnsureUser(request);
    const { id } = request.params as { id: string };
    if (!app.postgres) return { status: "ok" };

    const stateRes = await app.postgres.query<any>(
      `SELECT watchlists FROM investor_state WHERE user_id = $1`,
      [uid]
    );
    if (stateRes.rows.length === 0) return { status: "ok" };

    let watchlists = stateRes.rows[0].watchlists;
    watchlists = typeof watchlists === "string" ? JSON.parse(watchlists) : watchlists;

    watchlists = watchlists.filter((w: any) => w.id !== id);

    await app.postgres.query(
      `UPDATE investor_state SET watchlists = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [JSON.stringify(watchlists), uid]
    );

    return { status: "ok" };
  });

  // GET /api/alerts
  app.get("/api/alerts", async (request, reply) => {
    const uid = await getUidAndEnsureUser(request);
    if (!app.postgres) return [];

    const res = await app.postgres.query<any>(
      `SELECT alerts FROM investor_state WHERE user_id = $1`,
      [uid]
    );
    if (res.rows.length === 0) return [];
    const alerts = res.rows[0].alerts;
    return typeof alerts === "string" ? JSON.parse(alerts) : alerts;
  });

  // POST /api/alerts
  app.post("/api/alerts", async (request, reply) => {
    const uid = await getUidAndEnsureUser(request);
    const body = (request.body as any) || {};
    if (!app.postgres) return { status: "ok" };

    const stateRes = await app.postgres.query<any>(
      `SELECT alerts FROM investor_state WHERE user_id = $1`,
      [uid]
    );
    let alerts: any[] = [];
    if (stateRes.rows.length > 0) {
      const a = stateRes.rows[0].alerts;
      alerts = typeof a === "string" ? JSON.parse(a) : (a as any[]);
    }

    const nextAlert = {
      id: Math.random().toString(36).substring(2, 9),
      category: body.category || "price",
      title: body.title || "Alert",
      body: body.body || "",
      isRead: false,
      isPinned: false,
      isArchived: false,
      timestamp: new Date().toISOString(),
    };

    alerts.push(nextAlert);

    await app.postgres.query(
      `INSERT INTO investor_state (user_id, alerts)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET alerts = EXCLUDED.alerts, updated_at = CURRENT_TIMESTAMP`,
      [uid, JSON.stringify(alerts)]
    );

    return nextAlert;
  });

  // PUT /api/alerts/:id
  app.put("/api/alerts/:id", async (request, reply) => {
    const uid = await getUidAndEnsureUser(request);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    if (!app.postgres) return { status: "ok" };

    const stateRes = await app.postgres.query<any>(
      `SELECT alerts FROM investor_state WHERE user_id = $1`,
      [uid]
    );
    if (stateRes.rows.length === 0) return { status: "error", message: "Not found" };

    let alerts = stateRes.rows[0].alerts;
    alerts = typeof alerts === "string" ? JSON.parse(alerts) : alerts;

    const found = alerts.find((a: any) => a.id === id);
    if (found) {
      if (body.isRead !== undefined) found.isRead = body.isRead;
      if (body.isPinned !== undefined) found.isPinned = body.isPinned;
      if (body.isArchived !== undefined) found.isArchived = body.isArchived;
    }

    await app.postgres.query(
      `UPDATE investor_state SET alerts = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [JSON.stringify(alerts), uid]
    );

    return { status: "ok" };
  });

  // DELETE /api/alerts/:id
  app.delete("/api/alerts/:id", async (request, reply) => {
    const uid = await getUidAndEnsureUser(request);
    const { id } = request.params as { id: string };
    if (!app.postgres) return { status: "ok" };

    const stateRes = await app.postgres.query<any>(
      `SELECT alerts FROM investor_state WHERE user_id = $1`,
      [uid]
    );
    if (stateRes.rows.length === 0) return { status: "ok" };

    let alerts = stateRes.rows[0].alerts;
    alerts = typeof alerts === "string" ? JSON.parse(alerts) : alerts;

    alerts = alerts.filter((a: any) => a.id !== id);

    await app.postgres.query(
      `UPDATE investor_state SET alerts = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [JSON.stringify(alerts), uid]
    );

    return { status: "ok" };
  });
};

export default investorStateRoutes;
