import type { FastifyInstance, FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/healthz", async () => {
    // Use the canonical database adapter that all routes use
    const dbAdapter = (app as unknown as { db?: { ping: () => Promise<{ ok: boolean; detail?: string }>; kind: string } }).db;
    const dbPing = dbAdapter ? await dbAdapter.ping() : { ok: false, detail: "ADAPTER_NOT_INITIALIZED" };

    const cacheEngine = (await import("../../persistence/cache/cachePlugin")).getCacheEngine();
    const cache = cacheEngine ? cacheEngine.stats() : null;

    return {
      ok: true,
      service: "stockstory-backend",
      database: {
        kind: dbAdapter?.kind ?? "unavailable",
        ok: dbPing.ok,
        detail: dbPing.detail ?? null,
      },
      cache,
      at: Date.now(),
    };
  });
};

export default healthRoutes;
