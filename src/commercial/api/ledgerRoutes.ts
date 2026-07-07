/**
 * commercial/api/ledgerRoutes — Trading Journal Ledger API.
 *
 * Premium-user endpoints for logging trades and computing performance
 * statistics.  Row-Level Security is enforced by queryWithTenantContext
 * which sets app.current_user_id before every transaction.
 *
 * Routes:
 *   POST   /api/v1/ledger/log            — Record a completed trade
 *   GET    /api/v1/ledger                 — List own trades (paginated)
 *   GET    /api/v1/ledger/performance    — Aggregated stats for current user
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { dbAdapter } from "../../db/DatabaseAdapter";

// ── Type Contracts ──────────────────────────────────────────────────

interface LogTradeBody {
  symbol: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryDate?: string;
  exitDate?: string;
  notes?: string;
}

interface LedgerRow {
  id: string;
  symbol: string;
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  pnl: number | null;
  pnl_percentage: number | null;
  entry_date: string;
  exit_date: string | null;
  notes: string | null;
  created_at: string;
}

// ── Route Registration ──────────────────────────────────────────────

export async function registerLedgerRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /api/v1/ledger/log ────────────────────────────────────
  // Records a trade entry.  Requires exitPrice to compute P&L.
  fastify.post<{ Body: LogTradeBody }>(
    "/api/v1/ledger/log",
    async (req: FastifyRequest<{ Body: LogTradeBody }>, reply: FastifyReply) => {
      const uid = (req as any).uid;
      if (!uid) {
        return reply.status(401).send({ error: "Authentication required" });
      }

      const { symbol, direction, entryPrice, exitPrice, quantity, entryDate, exitDate, notes } = req.body;

      if (!symbol || !direction || !entryPrice || !quantity) {
        return reply.status(400).send({ error: "Missing required fields: symbol, direction, entryPrice, quantity" });
      }

      if (quantity <= 0) {
        return reply.status(400).send({ error: "Quantity must be positive" });
      }

      try {
        // Compute P&L if exit price is provided
        let pnl: number | null = null;
        let pnlPct: number | null = null;

        if (exitPrice != null && exitPrice > 0) {
          const multiplier = direction === "long" ? 1 : -1;
          pnl = Number((multiplier * (exitPrice - entryPrice) * quantity).toFixed(2));
          pnlPct = Number((((exitPrice - entryPrice) / entryPrice) * 100 * multiplier).toFixed(2));
        }

        const result = await dbAdapter.queryWithTenantContext(
          `IPSERT INTO trading_ledger
             (user_id, symbol, direction, entry_price, exit_price, quantity,
              pnl, pnl_percentage, entry_date, exit_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            uid,
            symbol.toUpperCase(),
            direction,
            entryPrice,
            exitPrice ?? null,
            quantity,
            pnl,
            pnlPct,
            entryDate ?? new Date().toISOString().slice(0, 10),
            exitDate ?? null,
            notes ?? null,
          ],
          uid,
        );

        return reply.status(201).send({
          success: true,
          tradeId: (result.rows[0] as { id: string })?.id ?? null,
          pnl,
          pnlPercentage: pnlPct,
        });
      } catch (err: any) {
        req.log.error({ err }, "Failed to log trade");
        return reply.status(500).send({ error: "Failed to log trade" });
      }
    },
  );

  // ── GET /api/v1/ledger ─────────────────────────────────────────
  // Returns paginated trades for the authenticated user.
  fastify.get(
    "/api/v1/ledger",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const uid = (req as any).uid;
      if (!uid) {
        return reply.status(401).send({ error: "Authentication required" });
      }

      const query = req.query as { limit?: string; offset?: string };
      const limit = Math.min(parseInt(query.limit ?? "50", 10), 200);
      const offset = Math.max(parseInt(query.offset ?? "0", 10), 0);

      try {
        const [tradesResult, countResult] = await Promise.all([
          dbAdapter.queryWithTenantContext(
            `SELECT id, symbol, direction, entry_price, exit_price, quantity,
                    pnl, pnl_percentage, entry_date, exit_date, notes, created_at
             FROM trading_ledger
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset],
            uid,
          ),
          dbAdapter.queryWithTenantContext(
            "SELECT COUNT(*)::int AS total FROM trading_ledger",
            [],
            uid,
          ),
        ]);

        return reply.send({
          trades: tradesResult.rows as LedgerRow[],
          total: (countResult.rows[0] as { total: number })?.total ?? 0,
          limit,
          offset,
        });
      } catch (err: any) {
        req.log.error({ err }, "Failed to fetch ledger");
        return reply.status(500).send({ error: "Failed to fetch ledger" });
      }
    },
  );

  // ── GET /api/v1/ledger/performance ──────────────────────────────
  // Returns aggregated trading stats: win rate, trade count, deployed capital, P&L.
  fastify.get(
    "/api/v1/ledger/performance",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const uid = (req as any).uid;
      if (!uid) {
        return reply.status(401).send({ error: "Authentication required" });
      }

      try {
        const result = await dbAdapter.queryWithTenantContext(
          `SELECT
             COUNT(*)::int                                        AS total_trades,
             COUNT(*) FILTER (WHERE exit_price IS NOT NULL)::int  AS closed_trades,
             COUNT(*) FILTER (WHERE pnl > 0)::int                 AS winning_trades,
             COUNT(*) FILTER (WHERE pnl < 0)::int                 AS losing_trades,
             COALESCE(SUM(pnl), 0)::numeric(14,2)                 AS total_pnl,
             COALESCE(AVG(pnl_percentage), 0)::numeric(8,2)       AS avg_return_pct,
             COALESCE(SUM(entry_price * quantity), 0)::numeric(14,2) AS deployed_capital
           FROM trading_ledger`,
          [],
          uid,
        );

        const stats = (result.rows[0] as Record<string, number>) ?? {};
        const closed = stats.closed_trades ?? 0;
        const winRate = closed > 0 ? Number(((stats.winning_trades / closed) * 100).toFixed(1)) : 0;

        return reply.send({
          totalTrades: stats.total_trades ?? 0,
          closedTrades: closed,
          winningTrades: stats.winning_trades ?? 0,
          losingTrades: stats.losing_trades ?? 0,
          winRate,
          totalPnl: Number(stats.total_pnl ?? 0),
          avgReturnPct: Number(stats.avg_return_pct ?? 0),
          deployedCapital: Number(stats.deployed_capital ?? 0),
        });
      } catch (err: any) {
        req.log.error({ err }, "Failed to compute trading performance");
        return reply.status(500).send({ error: "Failed to compute performance" });
      }
    },
  );
}
