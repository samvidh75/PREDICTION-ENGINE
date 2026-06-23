import type { FastifyPluginAsync } from "fastify";
import { getTechnicalSnapshot } from "../../services/technicals/TechnicalIndicatorService";

export const technicalRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/technicals/:symbol/latest", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol || typeof symbol !== "string") {
      return reply.status(400).send({ error: "A valid symbol is required." });
    }

    try {
      const snapshot = await getTechnicalSnapshot(symbol.toUpperCase().trim());
      return reply.send({
        symbol: snapshot.symbol,
        asOf: snapshot.asOf,
        indicators: snapshot.indicators,
        states: snapshot.states,
        computedAt: snapshot.computedAt,
      });
    } catch (error) {
      return reply.status(500).send({ error: "Technical indicators temporarily unavailable." });
    }
  });
};
