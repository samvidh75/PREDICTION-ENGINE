import type { FastifyPluginAsync } from "fastify";
import { MarketDataGateway } from "../../../services/data/MarketDataGateway";

export const marketDataRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/market-data/company/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();

    try {
      const [quote, metadata] = await Promise.all([
        MarketDataGateway.getQuote(sym),
        MarketDataGateway.getCompany(sym),
      ]);

      return {
        quote,
        metadata,
      };
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });

  app.get("/api/market-data/quote/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();

    try {
      const quote = await MarketDataGateway.getQuote(sym);
      return quote;
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });

  app.get("/api/market-data/metadata/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();

    try {
      const metadata = await MarketDataGateway.getCompany(sym);
      return metadata;
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });
};

export default marketDataRoutes;
