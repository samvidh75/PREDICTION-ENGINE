import type { FastifyInstance, FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/healthz", async () => {
    const ping = app.db
      ? await app.db.ping()
      : { ok: false, detail: "DATABASE_ADAPTER_UNREGISTERED" };
    const cacheEngine = (await import("../../persistence/cache/cachePlugin")).getCacheEngine();
    const cache = cacheEngine ? cacheEngine.stats() : null;
    const database = {
      kind: app.db?.kind ?? "unavailable",
      ok: ping.ok,
      detail: ping.detail ?? null,
    };

    return {
      ok: database.ok,
      service: "stockstory-backend",
      database,
      cache,
      at: Date.now(),
    };
  });
};

export default healthRoutes;
