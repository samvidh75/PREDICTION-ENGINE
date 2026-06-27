import type { FastifyPluginAsync } from "fastify";
import { MarketDataGateway } from "../../../services/data/MarketDataGateway";
import { query } from "../../../db/index";

function canonicalQuoteFor(symbol: string) {
  return MarketDataGateway.getQuote(symbol).catch(() => null);
}

function computeRsi(closes: number[]): number | null {
  if (closes.length < 14) return null;
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

const legacyCompatRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/market-hours", async (_request, reply) => {
    return reply.redirect("/api/market/status");
  });

  app.get("/api/quote/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();
    try {
      const quote = await canonicalQuoteFor(sym);
      if (!quote) {
        return reply.status(404).send({ success: false, error: { code: "QUOTE_NOT_FOUND", message: `No quote found for ${sym}` }, timestamp: new Date() });
      }
      return { success: true, data: quote, timestamp: new Date() };
    } catch (error: unknown) {
      return reply.status(404).send({ success: false, error: { code: "QUOTE_NOT_FOUND", message: error instanceof Error ? error.message : "Unknown error" }, timestamp: new Date() });
    }
  });

  app.get("/api/history/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();
    const range = ((request.query as Record<string, string>).range || "1Y").toUpperCase();
    const rangeDays: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "2Y": 730, "5Y": 1825 };
    const daysBack = rangeDays[range] || 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    try {
      const result = await query(
        `SELECT trade_date, open, high, low, close, volume FROM daily_prices WHERE UPPER(REPLACE(symbol, ' ', '')) = $1 AND trade_date >= $2 ORDER BY trade_date ASC`,
        [sym, cutoff.toISOString().split("T")[0]]
      );
      const data = (result.rows || []).map((r: Record<string, unknown>) => ({
        date: r.trade_date,
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        volume: Number(r.volume),
      }));
      return { success: true, data, timestamp: new Date() };
    } catch (error: unknown) {
      return reply.status(404).send({ success: false, error: { code: "HISTORY_NOT_FOUND", message: error instanceof Error ? error.message : "Unknown error" }, timestamp: new Date() });
    }
  });

  app.get("/api/snapshot/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();
    try {
      const [quote, fundamentals, candles] = await Promise.all([
        canonicalQuoteFor(sym),
        query(`SELECT * FROM financial_snapshots WHERE UPPER(REPLACE(symbol, ' ', '')) = $1 ORDER BY period_end DESC LIMIT 1`, [sym]),
        query(`SELECT trade_date, close FROM daily_prices WHERE UPPER(REPLACE(symbol, ' ', '')) = $1 AND close > 0 ORDER BY trade_date DESC LIMIT 365`, [sym]),
      ]);
      const priceRows = (candles.rows || []) as Array<{ trade_date: string; close: number }>;
      const closes = priceRows.map((r) => Number(r.close)).reverse();
      const rsi = computeRsi(closes);
      const fundamentalsData = (fundamentals.rows?.[0] || null) as Record<string, unknown> | null;
      return {
        success: true,
        data: {
          symbol: sym,
          quote,
          fundamentals: fundamentalsData,
          score: 50,
          scoreState: "neutral",
          factors: {},
          confidence: rsi ? Math.min(100, Math.max(0, Math.round((rsi / 100) * 50 + 25))) : null,
        },
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      return reply.status(500).send({ success: false, error: { code: "SNAPSHOT_ERROR", message: error instanceof Error ? error.message : "Unknown error" }, timestamp: new Date() });
    }
  });
};

export default legacyCompatRoutes;
