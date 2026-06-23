import type { FastifyPluginAsync } from "fastify";
import { getSnapshot, buildSnapshot } from "../../services/research/StockPageSnapshotService";
import { upsertSnapshot } from "../../services/research/StockPageSnapshotRepository";
import { setCachedSnapshot } from "../../services/research/StockPageSnapshotCache";

export const stockPageSnapshotRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/research/snapshot/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol || typeof symbol !== "string") {
      return reply.status(400).send({ ok: false, data: null, state: "missing", error: "Invalid symbol" });
    }

    const clean = symbol.toUpperCase().trim();
    const result = await getSnapshot(clean);

    reply.header("Cache-Control", "public, max-age=30, stale-while-revalidate=300");

    if (!result.snapshot) {
      return reply.send({ ok: true, data: null, state: "missing" });
    }

    return reply.send({ ok: true, data: result.snapshot, state: result.state });
  });

  app.get("/api/research/snapshot/:symbol/refresh", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol || typeof symbol !== "string") {
      return reply.status(400).send({ ok: false, data: null, state: "missing", error: "Invalid symbol" });
    }

    const clean = symbol.toUpperCase().trim();
    try {
      const snapshot = await buildSnapshot(clean);
      await upsertSnapshot(clean, snapshot);
      setCachedSnapshot(clean, snapshot);
      return reply.send({ ok: true, data: snapshot, state: snapshot.freshnessState });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Snapshot build failed";
      return reply.send({ ok: false, data: null, state: "missing", error: msg });
    }
  });
};
