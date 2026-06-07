import type { FastifyInstance, FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/healthz", async () => {
    const db = app.postgres ? await app.postgres.ping() : null;
    const cacheEngine = (await import("../../persistence/cache/cachePlugin")).getCacheEngine();
    const cache = cacheEngine ? cacheEngine.stats() : null;

    return {
      ok: true,
      service: "stockstory-backend",
      at: Date.now(),
      db,
      cache,
      _debug: {
        hasCache: cacheEngine != null,
        cacheType: cacheEngine ? "CacheHierarchyEngine" : "undefined",
        hasPostgres: app.postgres != null,
        postgresType: app.postgres ? "PostgresClient" : "undefined",
      },
    };
  });
};

export default healthRoutes;
