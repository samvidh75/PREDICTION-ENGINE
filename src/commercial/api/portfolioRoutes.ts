/**
 * commercial/api/portfolioRoutes — Fastify plugin for the Premium Portfolio Analyzer.
 *
 * Routes:
 *   GET /api/v1/portfolio/analyze/:userId — Aggregate holdings from transaction logs
 *
 * Schema: user_portfolio_transactions (id, user_id, ticker, transaction_type, quantity, average_price)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface TransactionRow {
  ticker: string;
  transaction_type: "BUY" | "SELL";
  quantity: number;
  average_price: number;
}

interface AnalyzeParams {
  userId: string;
}

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

export async function registerPortfolioRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/api/v1/portfolio/analyze/:userId",
    async (req: FastifyRequest<{ Params: AnalyzeParams }>, reply: FastifyReply) => {
      const { userId } = req.params;

      try {
        const { dbAdapter } = await import("../../db/DatabaseAdapter");

        const result = await dbAdapter.query(
          "SELECT ticker, transaction_type, quantity, average_price " +
          "FROM user_portfolio_transactions WHERE user_id = $1",
          [userId],
        );

        const rows = result.rows as TransactionRow[];

        const portfolioMap: Record<string, { qty: number; investedCost: number }> = {};

        for (const row of rows) {
          if (!portfolioMap[row.ticker]) {
            portfolioMap[row.ticker] = { qty: 0, investedCost: 0 };
          }

          if (row.transaction_type === "BUY") {
            portfolioMap[row.ticker].qty += row.quantity;
            portfolioMap[row.ticker].investedCost += row.quantity * row.average_price;
          } else if (row.transaction_type === "SELL") {
            portfolioMap[row.ticker].qty -= row.quantity;
            portfolioMap[row.ticker].investedCost -= row.quantity * row.average_price;
          }
        }

        const activeHoldings = Object.entries(portfolioMap)
          .filter(([_, data]) => data.qty > 0)
          .map(([ticker, data]) => ({
            ticker,
            currentShares: data.qty,
            totalInvestedValue: roundToTwo(data.investedCost),
            avgBuyPrice: roundToTwo(data.investedCost / data.qty),
          }));

        return reply.send({
          userId,
          holdingsCount: activeHoldings.length,
          summaryMatrix: activeHoldings,
        });
      } catch (err) {
        req.log.error({ err }, "Portfolio analysis failed");
        return reply.status(500).send({ error: "Portfolio analysis failed" });
      }
    },
  );
}
