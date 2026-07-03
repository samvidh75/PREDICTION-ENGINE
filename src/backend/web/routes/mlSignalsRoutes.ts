import type { FastifyInstance } from 'fastify';
import { lstmForecaster } from '../../../engines/LSTMForecaster.js';
import { ensembleAggregator } from '../../../engines/EnsembleAggregator.js';
import type { LSTMFeatureSet } from '../../../engines/LSTMForecaster.js';
import type { SignalSource } from '../../../engines/EnsembleAggregator.js';

function parseFeatures(body: unknown): { symbol: string; features: LSTMFeatureSet }[] {
  const payload = (body ?? {}) as Record<string, unknown>;
  const stocks = payload.stocks;
  if (!Array.isArray(stocks) || stocks.length === 0) return [];
  return stocks.map((s: Record<string, unknown>) => ({
    symbol: String(s.symbol ?? ''),
    features: s.features as LSTMFeatureSet,
  })).filter(s => s.symbol && s.features);
}

function parseSignals(body: unknown): SignalSource[] {
  const payload = (body ?? {}) as Record<string, unknown>;
  const signals = payload.signals;
  if (!Array.isArray(signals)) return [];
  return signals.map((s: Record<string, unknown>) => ({
    name: String(s.name ?? ''),
    direction: s.direction as SignalSource['direction'],
    strength: Number(s.strength ?? 0),
    confidence: Number(s.confidence ?? 0),
    weight: s.weight !== undefined ? Number(s.weight) : undefined,
  })).filter(s => s.name && s.direction);
}

export async function registerMLSignalRoutes(app: FastifyInstance) {
  app.post('/api/signals/predict', async (request, reply) => {
    const stocks = parseFeatures(request.body);
    if (stocks.length === 0) {
      return reply.status(400).send({ error: 'stocks array with symbol and features required' });
    }
    const results = lstmForecaster.batchForecast(stocks);
    return { availability: 'real', predictions: results };
  });

  app.post('/api/signals/ensemble', async (request, reply) => {
    const signals = parseSignals(request.body);
    if (signals.length === 0) {
      return reply.status(400).send({ error: 'signals array required' });
    }
    const result = ensembleAggregator.aggregate(signals);
    return { availability: 'real', ensemble: result };
  });
}
