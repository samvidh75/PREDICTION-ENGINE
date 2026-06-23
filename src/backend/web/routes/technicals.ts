import type { FastifyPluginAsync } from "fastify";
import { getTechnicalSnapshot } from "../../services/technicals/TechnicalIndicatorService";

export const technicalRoutes: FastifyPluginAsync = async (app) => {
  async function handleTechnicalRequest(symbol: string) {
    if (!symbol || typeof symbol !== "string") {
      return { error: "A valid symbol is required." };
    }
    try {
      const snapshot = await getTechnicalSnapshot(symbol.toUpperCase().trim());
      return {
        symbol: snapshot.symbol,
        asOf: snapshot.asOf,
        indicators: snapshot.indicators,
        states: snapshot.states,
        computedAt: snapshot.computedAt,
      };
    } catch {
      return { error: "Technical indicators temporarily unavailable." };
    }
  }

  app.get("/api/technicals/:symbol/latest", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const result = await handleTechnicalRequest(symbol);
    if ("error" in result && !("symbol" in result)) {
      return reply.status(400).send(result);
    }
    return reply.send(result);
  });

  app.get("/api/technicals/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const result = await handleTechnicalRequest(symbol);
    if ("error" in result && !("symbol" in result)) {
      return reply.status(400).send(result);
    }
    return reply.send(result);
  });
};
