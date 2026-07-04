/**
 * OHLC Data Routes
 * Provides candlestick data for charting
 */

import { FastifyInstance } from 'fastify';
import { providerAggregator } from '../../../clients/ProviderAggregator';
import type { OHLC } from '../../../components/StockChart';

/**
 * Generate mock OHLC data from historical quotes
 * In production, this would fetch from a time-series database
 */
function generateMockOHLCData(basePrice: number, days: number = 30): OHLC[] {
  const data: OHLC[] = [];
  const now = Date.now();
  const dayMs = 86400000; // 24 hours

  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now - i * dayMs);
    const dateStr = timestamp.toISOString().split('T')[0];

    // Simulate realistic price movements
    const volatility = 0.02 + Math.random() * 0.03;
    const trend = Math.sin(i / days) * 0.05;
    const random = (Math.random() - 0.5) * volatility;
    const dayChange = trend + random;

    const open = basePrice * (1 + dayChange * 0.3);
    const close = basePrice * (1 + dayChange);
    const high = Math.max(open, close) * (1 + Math.abs(Math.random() * 0.01));
    const low = Math.min(open, close) * (1 - Math.abs(Math.random() * 0.01));
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    data.push({
      time: dateStr,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    basePrice = close;
  }

  return data;
}

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
        const ohlcData = generateMockOHLCData(quote.price, days);

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

        // Fetch quotes for all symbols in parallel
        const results = await Promise.allSettled(
          symbols.map(async (sym) => {
            const quote = await providerAggregator.getQuote(sym);
            if (!quote) return null;

            const ohlcData = generateMockOHLCData(quote.price, days);
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
