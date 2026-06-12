import type { FastifyPluginAsync } from "fastify";
import { MarketDataGateway } from "../../../services/data/MarketDataGateway";
import {
  loadMarketActionSnapshot,
  unavailableMarketActionResponse,
} from "../../../services/market/MarketActionService";

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
      request.log.error({ err, symbol: sym }, "market data company request failed");
      reply.status(502).send({ error: "Market data is temporarily unavailable.", code: "MARKET_DATA_UNAVAILABLE" });
    }
  });

  app.get("/api/market-data/quote/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();

    try {
      const quote = await MarketDataGateway.getQuote(sym);
      return quote;
    } catch (err: any) {
      request.log.error({ err, symbol: sym }, "market data quote request failed");
      reply.status(502).send({ error: "Quote data is temporarily unavailable.", code: "QUOTE_DATA_UNAVAILABLE" });
    }
  });

  app.get("/api/market-data/metadata/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();

    try {
      const metadata = await MarketDataGateway.getCompany(sym);
      return metadata;
    } catch (err: any) {
      request.log.error({ err, symbol: sym }, "market data metadata request failed");
      reply.status(502).send({ error: "Company metadata is temporarily unavailable.", code: "METADATA_UNAVAILABLE" });
    }
  });

  app.get("/api/market-data/market-action", async (request, reply) => {
    try {
      return await loadMarketActionSnapshot();
    } catch (err: any) {
      request.log.error({ err }, "market action request failed");
      reply.status(503).send(
        unavailableMarketActionResponse("Market action is temporarily unavailable because the snapshot store could not be read."),
      );
    }
  });
};

export default marketDataRoutes;
