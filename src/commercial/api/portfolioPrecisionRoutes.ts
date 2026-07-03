import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

interface PrecisionParams {
  userId: string;
}

interface TransactionRow {
  ticker: string;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  average_price: number;
}

export async function registerPortfolioPrecisionRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/api/v1/portfolio/precision/:userId',
    async (req: FastifyRequest<{ Params: PrecisionParams }>, reply: FastifyReply) => {
      const { userId } = req.params;

      try {
        const { dbAdapter } = await import('../../db/DatabaseAdapter');
        const result = await dbAdapter.query(
          'SELECT ticker, transaction_type, quantity, average_price ' +
          'FROM user_portfolio_transactions WHERE user_id = $1',
          [userId],
        );

        const rows = result.rows as TransactionRow[];
        const portfolioMap: Record<string, { qty: number; investedCost: number }> = {};

        for (const row of rows) {
          if (!portfolioMap[row.ticker]) {
            portfolioMap[row.ticker] = { qty: 0, investedCost: 0 };
          }
          if (row.transaction_type === 'BUY') {
            portfolioMap[row.ticker].qty += row.quantity;
            portfolioMap[row.ticker].investedCost += row.quantity * row.average_price;
          } else if (row.transaction_type === 'SELL') {
            portfolioMap[row.ticker].qty -= row.quantity;
            portfolioMap[row.ticker].investedCost -= row.quantity * row.average_price;
          }
        }

        const activeHoldings = Object.entries(portfolioMap)
          .filter(([_, data]) => data.qty > 0)
          .map(([ticker, data]) => ({
            ticker,
            currentShares: data.qty,
            totalInvestedValue: Math.round(data.investedCost * 100) / 100,
            avgBuyPrice: Math.round((data.investedCost / data.qty) * 100) / 100,
          }));

        const liveMetrics: Record<string, any> = {};
        for (const holding of activeHoldings) {
          try {
            const { stdout } = await execPromise(
              `python3 scripts/python/slm_math_runtime.py --ticker ${holding.ticker}`,
            );
            const parsed = JSON.parse(stdout);
            if (parsed.success) {
              liveMetrics[holding.ticker] = parsed.metrics;
            }
          } catch {
            liveMetrics[holding.ticker] = null;
          }
        }

        const enrichedHoldings = activeHoldings.map((h) => {
          const live = liveMetrics[h.ticker];
          const currentPrice = live?.current_price ?? null;
          const currentValue = currentPrice !== null ? Math.round(currentPrice * h.currentShares * 100) / 100 : null;
          const unrealizedPnl = currentValue !== null ? Math.round((currentValue - h.totalInvestedValue) * 100) / 100 : null;
          const unrealizedPnlPct = currentValue !== null && h.totalInvestedValue > 0
            ? Math.round(((currentValue - h.totalInvestedValue) / h.totalInvestedValue) * 1000) / 10
            : null;

          return {
            ...h,
            currentPrice: currentPrice !== null ? Math.round(currentPrice * 1000) / 1000 : null,
            currentValue,
            unrealizedPnl,
            unrealizedPnlPct,
            peRatio: live?.pe_ratio ?? null,
            debtToEquity: live?.debt_to_equity ?? null,
            rsi14: live?.rsi_14 ?? null,
            sma50: live?.sma_50 ?? null,
            sma200: live?.sma_200 ?? null,
            sector: live?.sector ?? null,
            trendState: live?.trend_state ?? null,
            dataMode: live?.data_mode ?? null,
          };
        });

        const totalInvested = enrichedHoldings.reduce((s, h) => s + h.totalInvestedValue, 0);
        const totalCurrentValue = enrichedHoldings.reduce((s, h) => s + (h.currentValue ?? 0), 0);
        const totalPnl = enrichedHoldings.reduce((s, h) => s + (h.unrealizedPnl ?? 0), 0);
        const totalPnlPct = totalInvested > 0 ? Math.round((totalPnl / totalInvested) * 1000) / 10 : null;

        return reply.send({
          userId,
          generatedAt: new Date().toISOString(),
          summary: {
            holdingsCount: enrichedHoldings.length,
            totalInvested: Math.round(totalInvested * 100) / 100,
            totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
            totalUnrealizedPnl: Math.round(totalPnl * 100) / 100,
            totalUnrealizedPnlPct: totalPnlPct,
          },
          holdings: enrichedHoldings,
        });
      } catch (err) {
        req.log.error({ err }, 'Portfolio precision analysis failed');
        return reply.status(500).send({ error: 'Portfolio precision analysis failed' });
      }
    },
  );
}
