import type { FastifyPluginAsync } from "fastify";
import { MarketDataGateway } from "../../../services/data/MarketDataGateway";
import { query } from "../../../db/index";
import { reconcileQuoteWithHistory } from "../../services/market/MarketQuoteReconciler";

async function canonicalQuoteFor(symbol: string) {
  const [quote, history] = await Promise.all([
    MarketDataGateway.getQuote(symbol).catch(() => null),
    query(`SELECT trade_date, close, volume FROM daily_prices WHERE UPPER(REPLACE(symbol, ' ', '')) = $1 AND close > 0 ORDER BY trade_date DESC LIMIT 10`, [symbol]),
  ]);
  return reconcileQuoteWithHistory(symbol, quote, history.rows || []);
}
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
        canonicalQuoteFor(sym),
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
      const canonical = await canonicalQuoteFor(sym);
      if (!canonical) return reply.status(503).send({ error: "Quote data is temporarily unavailable.", code: "QUOTE_DATA_UNAVAILABLE" });
      return canonical;
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
