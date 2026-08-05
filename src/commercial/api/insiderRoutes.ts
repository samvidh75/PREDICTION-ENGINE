/**
 * commercial/api/insiderRoutes — Corporate Insider Disclosure API.
 *
 * Serves real form 17-7 "Statement of Changes in Beneficial Ownership of
 * Securities" filings scraped from PSE Edge — see
 * src/services/scrapers/PSEInsiderFilingsData.ts. Previously this queried
 * a corporate_insider_disclosures Postgres table seeded entirely by
 * scripts/python/insider_vectorizer.py's MOCK_FILINGS (three hardcoded
 * fake entries) — that fabrication has been removed in favor of this real
 * feed. A symbol with no scraped filings returns an empty array, not a
 * fabricated placeholder.
 *
 * Routes:
 *   GET  /api/v1/corporate/insiders/:ticker  — Recent real insider filings
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { loadPseInsiderFilings } from "../../services/scrapers/PSEInsiderFilingsData.js";

interface Params {
  ticker: string;
}

export async function registerInsiderRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/v1/corporate/insiders/:ticker ──────────────────────
  fastify.get<{ Params: Params }>(
    "/api/v1/corporate/insiders/:ticker",
    async (req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) => {
      const symbol = req.params.ticker.toUpperCase().trim();

      try {
        const filings = loadPseInsiderFilings(symbol);
        return reply.status(200).send({
          success: true,
          ticker: symbol,
          filings,
        });
      } catch (err: any) {
        req.log.error({ err }, "Failed to load insider filings");
        return reply.status(500).send({
          success: false,
          error: "Failed to load insider filings.",
        });
      }
    },
  );
}
