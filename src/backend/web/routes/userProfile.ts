// src/backend/web/routes/userProfile.ts
import type { FastifyPluginAsync } from "fastify";
import { loadAuthSession } from "../../../services/auth/sessionStore"; // adjust import as needed

/**
 * Simple JSON blob storage for user-specific data (watchlists, alerts, memory).
 * Data is stored per UID in the PostgreSQL table `user_profiles` with a JSONB column `payload`.
 */
export const userProfileRoutes: FastifyPluginAsync = async (app) => {
  // GET profile data
  app.get("/api/user/profile", async (request, reply) => {
    const uid = (request.headers["x-user-uid"] as string) || (request.query as any)?.uid || loadAuthSession().uid || "anonymous";
    if (!app.postgres) return {};
    
    const res = await app.postgres.query<any>(
      `SELECT payload FROM user_profiles WHERE uid = $1`,
      [uid]
    );
    if (res.rows.length === 0) {
      // Return empty object if no profile yet
      return {};
    }
    return res.rows[0].payload;
  });

  // POST profile data (replace whole payload)
  app.post("/api/user/profile", async (request, reply) => {
    const uid = (request.headers["x-user-uid"] as string) || (request.query as any)?.uid || loadAuthSession().uid || "anonymous";
    const payload = (request.body as any) ?? {};
    if (!app.postgres) return { status: "ok" };

    await app.postgres.query(
      `INSERT INTO user_profiles (uid, payload)
       VALUES ($1, $2)
       ON CONFLICT (uid) DO UPDATE SET payload = EXCLUDED.payload`,
      [uid, payload]
    );
    return { status: "ok" };
  });
};

export default userProfileRoutes;
