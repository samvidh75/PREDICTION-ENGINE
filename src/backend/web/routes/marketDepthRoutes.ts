import type { FastifyInstance } from 'fastify';
import { l2OrderBookAggregator } from '../../../services/market/L2OrderBookAggregator.js';
import type { L2OrderBookUpdate } from '../../../services/market/L2OrderBookAggregator.js';

export async function registerMarketDepthRoutes(app: FastifyInstance) {
  // Renamed from /api/market/orderbook/L2/:symbol: that path collides with
  // liveQuotesWs.ts's route (registered earlier in startServer.ts), which
  // derives its order book live from quotes rather than from this
  // aggregator's externally-POSTed snapshots — two genuinely different data
  // flows sharing one URL. Fastify throws FST_ERR_DUPLICATED_ROUTE on the
  // real duplicate GET registration.
  app.get('/api/market/orderbook/L2-aggregated/:symbol', async (request, reply) => {
    const { symbol } = request.params as Record<string, string>;
    const snapshot = l2OrderBookAggregator.getSnapshot(symbol.toUpperCase());
    if (!snapshot) {
      return reply.status(404).send({ error: `No order book data for ${symbol}` });
    }
    const metrics = l2OrderBookAggregator.computeMetrics(symbol.toUpperCase());
    return { ...snapshot, metrics };
  });

  app.post('/api/market/orderbook/update', async (request, _reply) => {
    const body = request.body as L2OrderBookUpdate | L2OrderBookUpdate[];
    const updates = Array.isArray(body) ? body : [body];
    for (const update of updates) {
      l2OrderBookAggregator.applyUpdate(update);
    }
    return { applied: updates.length };
  });

  app.get('/api/market/microstructure/:symbol/metrics', async (request, _reply) => {
    const { symbol } = request.params as Record<string, string>;
    const metrics = l2OrderBookAggregator.computeMetrics(symbol.toUpperCase());
    if (!metrics) {
      return { availability: 'unavailable', symbol: symbol.toUpperCase() };
    }
    return { availability: 'real', symbol: symbol.toUpperCase(), ...metrics };
  });
}
