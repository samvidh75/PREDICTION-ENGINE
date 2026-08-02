// src/commercial/api/optionsRoutes.ts
// Phase 34 — F&O Options Chain Scanner API routes.
// Serves derivative market indicators and highest OI strikes from Postgres.

import type { FastifyInstance } from "fastify";
import { dbAdapter } from "../../db/DatabaseAdapter";

/**
 * Register F&O options chain routes on the Fastify server.
 */
export async function registerOptionsRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/v1/fo/scanner/:ticker — relaxed limit (60/min)
  server.get("/api/v1/fo/scanner/:ticker", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    const { ticker } = request.params as { ticker: string };
    const queryLimit = Math.min(parseInt(String((request.query as any)?.limit || "20"), 10), 50);

    if (!ticker || typeof ticker !== "string") {
      return reply.status(400).send({ success: false, error: "ticker param required" });
    }

    const symbol = ticker.toUpperCase().trim();

    try {
      // Fetch derived market indicators (PCR, max pain, OI trend)
      const trendResult = await dbAdapter.query(
        `SELECT * FROM derivative_market_indicators WHERE ticker = $1`,
        [symbol]
      );

      // Fetch top N highest OI strikes with IV for Greeks calculation
      const highOiResult = await dbAdapter.query(
        `SELECT strike_price, option_type, open_interest, change_in_oi, implied_volatility
         FROM asset_options_chain
         WHERE underlying_ticker = $1
         ORDER BY open_interest DESC
         LIMIT $2`,
        [symbol, queryLimit]
      );

      if (trendResult.rows.length === 0) {
        return reply.status(200).send({ success: true, ticker: symbol, hasData: false });
      }

      return reply.status(200).send({
        success: true,
        hasData: true,
        summary: trendResult.rows[0],
        heavyStrikes: highOiResult.rows,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: "Failed to compile derivative metrics." });
    }
  });
}
