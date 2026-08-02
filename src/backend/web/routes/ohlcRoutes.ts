/**
 * OHLC Data Routes
 * Provides candlestick data for charting
 */

import { FastifyInstance } from 'fastify';
import { providerAggregator } from '../../../clients/ProviderAggregator';
import { historicalDataAggregator } from '../../../services/data/HistoricalDataAggregator';

export async function registerOHLCRoutes(app: FastifyInstance) {
  /**
   * GET /api/ohlc/:symbol
   * Query params:
   *   - timeframe: '1D' | '5D' | '1M' | '3M' | '1Y' (default: '1M')
   */
  app.get<{ Params: { symbol: string }; Querystring: { timeframe?: string } }>(
    '/api/ohlc/:symbol',
    async (request, reply) => {
      try {
        const { symbol } = request.params;
        const timeframe = (request.query?.timeframe as string) || '1M';

        if (!symbol) {
          return reply.status(400).send({ error: 'Symbol required' });
        }

        // Fetch current quote to get base price
        const quote = await providerAggregator.getQuote(symbol);
        if (!quote) {
          return reply.status(404).send({ error: `No data for ${symbol}` });
        }

        // Generate OHLC data based on timeframe
        const daysMap: { [key: string]: number } = {
          '1D': 1,
          '5D': 5,
          '1M': 30,
          '3M': 90,
          '1Y': 365,
        };

        const days = daysMap[timeframe] || 30;
        const ohlcData = await historicalDataAggregator.fetchOHLCData(symbol, days);

        return reply.send({
          symbol,
          timeframe,
          data: ohlcData,
          exchange: quote.exchange,
          source: quote.source,
          fetchedAt: Date.now(),
        });
      } catch (error) {
        console.error('[OHLC] Error:', error);
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to fetch OHLC data',
        });
      }
    }
  );

  /**
   * GET /api/ohlc/batch
   * POST body: { symbols: string[], timeframe: string }
   */
  app.post<{ Body: { symbols: string[]; timeframe?: string } }>(
    '/api/ohlc/batch',
    async (request, reply) => {
      try {
        const { symbols, timeframe = '1M' } = request.body;

        if (!Array.isArray(symbols) || symbols.length === 0) {
          return reply.status(400).send({ error: 'Symbols array required' });
        }

        const daysMap: { [key: string]: number } = {
          '1D': 1,
          '5D': 5,
          '1M': 30,
          '3M': 90,
          '1Y': 365,
        };

        const days = daysMap[timeframe] || 30;

        // Fetch OHLC data for all symbols in parallel
        const results = await Promise.allSettled(
          symbols.map(async (sym) => {
            const quote = await providerAggregator.getQuote(sym);
            if (!quote) return null;

            const ohlcData = await historicalDataAggregator.fetchOHLCData(sym, days);
            return {
              symbol: sym,
              timeframe,
              data: ohlcData,
              exchange: quote.exchange,
              fetchedAt: Date.now(),
            };
          })
        );

        const data = results
          .filter((r) => r.status === 'fulfilled' && r.value)
          .map((r) => (r.status === 'fulfilled' ? r.value : null))
          .filter(Boolean);

        return reply.send({
          count: data.length,
          timeframe,
          data,
          fetchedAt: Date.now(),
        });
      } catch (error) {
        console.error('[OHLC Batch] Error:', error);
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to fetch OHLC data',
        });
      }
    }
  );
}
