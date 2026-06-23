import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { StockIntelligenceService } from '../../services/intelligence/StockIntelligenceService';
import { createStockIntelligenceRepository } from '../../services/intelligence/StockIntelligenceRepository';
import { SUPER_SCAN_DEFINITIONS } from '../../services/scanner/SuperScanService';

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

const superScanRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/api/scans/super', async (_request, reply) => {
    const service = await getService();
    if (!service) return reply.status(503).send({ ok: false, error: 'Service unavailable' });

    try {
      const scans = await service.getSuperScans();
      const definitions = SUPER_SCAN_DEFINITIONS.map(d => {
        const active = scans.find(s => s.scanKey === d.key);
        return { ...d, resultCount: active?.count || 0 };
      });
      return reply.send({ ok: true, data: definitions });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: 'Failed to fetch scans' });
    }
  });

  app.get('/api/scans/super/:scanKey', async (request, reply) => {
    const { scanKey } = request.params as { scanKey: string };
    const service = await getService();
    if (!service) return reply.status(503).send({ ok: false, error: 'Service unavailable' });

    const def = SUPER_SCAN_DEFINITIONS.find(d => d.key === scanKey);
    if (!def) return reply.status(404).send({ ok: false, error: 'Unknown scan key' });

    try {
      const results = await service.getSuperScan(scanKey);
      return reply.send({
        ok: true,
        data: {
          scanKey: def.key,
          scanLabel: def.label,
          description: def.description,
          results,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: 'Failed to fetch scan results' });
    }
  });
};

export default superScanRoutes;
