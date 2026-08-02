import type { FastifyInstance } from 'fastify';
import { dataWarehouseService, type OLAPQuery } from '../../../services/dataWarehouse/DataWarehouseService.js';
import type { OLAPQuery as OLAPQueryType } from '../../../services/dataWarehouse/DataWarehouseService.js';

export async function registerDataWarehouseRoutes(app: FastifyInstance) {
  app.get('/api/analytics/metrics', async (_request, _reply) => {
    return dataWarehouseService.getAvailableMetrics();
  });

  app.get('/api/analytics/dimensions', async (_request, _reply) => {
    return dataWarehouseService.getAvailableDimensions();
  });

  app.get('/api/analytics/views', async (_request, _reply) => {
    return dataWarehouseService.getMaterializedViews();
  });

  app.post('/api/analytics/query', async (request, reply) => {
    const body = request.body as OLAPQueryType | null;
    if (!body || !body.measures || !body.dimensions) {
      return reply.status(400).send({ error: 'measures and dimensions arrays required' });
    }
    return dataWarehouseService.executeQuery(body);
  });

  app.post('/api/screener/execute', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const filters = body.filters as OLAPQuery['filters'];
    if (!Array.isArray(filters) || filters.length === 0) {
      return reply.status(400).send({ error: 'filters array required' });
    }
    const sortBy = typeof body.sortBy === 'string' ? body.sortBy : undefined;
    const limit = typeof body.limit === 'number' ? body.limit : 50;
    return dataWarehouseService.runScreener(filters, sortBy, limit);
  });

  app.post('/api/screener/save', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const query = body.query as OLAPQuery;
    if (!name || !query) {
      return reply.status(400).send({ error: 'name and query required' });
    }
    const id = dataWarehouseService.saveScreener(name, query);
    return { id, name };
  });
}
