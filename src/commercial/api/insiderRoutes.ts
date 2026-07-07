/**
 * commercial/api/insiderRoutes — Corporate Insider Disclosure API.
 *
 * Public endpoints that expose SEC regulatory filing data from the
 * corporate_insider_disclosures table.  All data is public regulatory
 * information — no authentication is required for reads.
 *
 * Routes:
 *   GET  /api/v1/corporate/insiders/:ticker  — Recent insider filings
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { dbAdapter } from "../../db/DatabaseAdapter";

// ── Type Contracts ──────────────────────────────────────────────────

interface InsiderFiling {
  id: string;
  ticker: string;
  disclosure_type: string;
  insider_name: string;
  shares_quantity: number;
  transaction_value_inr: number;
  filing_date: string;
  raw_announcement_text: string;
}

interface Params {
  ticker: string;
}

// ── Route Registration ──────────────────────────────────────────────

export async function registerInsiderRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/v1/corporate/insiders/:ticker ──────────────────────
  // Returns the 5 most recent insider filings for the given ticker.
  fastify.get<{ Params: Params }>(
    "/api/v1/corporate/insiders/:ticker",
    async (req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) => {
      const symbol = req.params.ticker.toUpperCase().trim();

      try {
        const result = await dbAdapter.query(
          `SELECT disclosure_type, insider_name, shares_quantity,
                  transaction_value_inr, filing_date, raw_announcement_text
           FROM corporate_insider_disclosures
           WHERE ticker LIKE $1
           ORDER BY filing_date DESC
           LIMIT 5`,
          [`${symbol}%`],
        );

        const rows = result.rows as InsiderFiling[];

        return reply.status(200).send({
          success: true,
          ticker: symbol,
          filings: Array.isArray(rows) ? rows : [],
        });
      } catch (err: any) {
        req.log.error({ err }, "Failed to query insider disclosures");
        return reply.status(500).send({
          success: false,
          error: "Failed to query insider trading database partitions.",
        });
      }
    },
  );
}
