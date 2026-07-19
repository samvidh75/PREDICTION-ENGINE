import type { FastifyInstance } from 'fastify';
import { earningsSentimentService } from '../../../services/market/EarningsSentimentService.js';

export async function registerEarningsSentimentRoutes(app: FastifyInstance) {
  app.get('/api/earnings/calendar', async (request, reply) => {
    const query = request.query as { symbols?: string } | undefined;
    const rawSymbols = typeof query?.symbols === 'string'
      ? query.symbols
      : '';
    const symbols = rawSymbols.split(',').map((symbol) => symbol.trim()).filter(Boolean);
    if (symbols.length === 0) {
      return reply.status(400).send({ error: 'symbols query param is required' });
    }

    return {
      success: true,
      availability: 'derived',
      entries: earningsSentimentService.buildEstimatedEarningsCalendar(symbols),
    };
  });

  app.get('/api/news/:symbol/sentiment', async (request, reply) => {
    const symbol = String((request.params as { symbol: string }).symbol ?? '').trim().toUpperCase();
    if (!symbol) {
      return reply.status(400).send({ error: 'symbol is required' });
    }

    try {
      const summary = await earningsSentimentService.summarizeHeadlineSentiment(symbol);
      return {
        success: true,
        summary,
        earningsNarrativePreview: earningsSentimentService.buildEarningsNarrativePreview(symbol, summary),
      };
    } catch (error) {
      request.log.error({ err: error }, 'Failed to build sentiment summary');
      return reply.status(500).send({ success: false, error: 'Failed to build sentiment summary' });
    }
  });
}
