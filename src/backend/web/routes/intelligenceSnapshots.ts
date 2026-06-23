import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { StockIntelligenceService } from '../../services/intelligence/StockIntelligenceService';
import { createStockIntelligenceRepository } from '../../services/intelligence/StockIntelligenceRepository';

let serviceInstance: StockIntelligenceService | null = null;

async function getService(): Promise<StockIntelligenceService | null> {
  if (serviceInstance) return serviceInstance;
  try {
    const { dbAdapter } = await import('../../../db/DatabaseAdapter');
    const repo = createStockIntelligenceRepository(dbAdapter);
    serviceInstance = new StockIntelligenceService(repo);
    return serviceInstance;
  } catch {
    return null;
  }
}

const intelligenceRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/api/intelligence/snapshot/:symbol', async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const service = await getService();
    if (!service) return reply.status(503).send({ ok: false, error: 'Service unavailable' });

    try {
      const snapshot = await service.getLiveSnapshot(symbol);
      if (!snapshot) return reply.status(404).send({ ok: false, error: 'Snapshot not found' });
      return reply.send({ ok: true, data: service.formatSnapshotForPublic(snapshot) });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: 'Failed to fetch snapshot' });
    }
  });

  app.get('/api/intelligence/dashboard', async (_request, reply) => {
    const service = await getService();
    if (!service) return reply.status(503).send({ ok: false, error: 'Service unavailable' });

    try {
      const dashboard = await service.getDashboard(50);
      return reply.send({ ok: true, data: dashboard });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: 'Failed to fetch dashboard' });
    }
  });

  app.get('/api/intelligence/history/:symbol', async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const service = await getService();
    if (!service) return reply.status(503).send({ ok: false, error: 'Service unavailable' });

    try {
      const history = await service.getSnapshots(symbol);
      return reply.send({ ok: true, data: history.map(h => service.formatSnapshotForPublic(h)) });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: 'Failed to fetch history' });
    }
  });

  app.get('/api/intelligence/ingestion/status', async (_request, reply) => {
    const service = await getService();
    if (!service) return reply.status(503).send({ ok: false, error: 'Service unavailable' });

    try {
      const status = await service.getIngestionStatus();
      return reply.send({ ok: true, data: status });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: 'Failed to fetch ingestion status' });
    }
  });
};

export default intelligenceRoutes;
