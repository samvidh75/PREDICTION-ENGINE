import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { stockUniverseService } from '../../../services/StockUniverseService';
import { StockUniverseSyncJob } from '../../../jobs/StockUniverseSyncJob';

const stockUniverseRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get<{ Querystring: { q?: string; limit?: string } }>(
    '/api/stocks/search',
    async (request, reply) => {
      try {
        const q = (request.query.q || '').trim();
        const limit = Math.min(Number(request.query.limit) || 50, 200);
        const results = await stockUniverseService.searchStocks(q, limit);
        return reply.send({ results, total: results.length });
      } catch (error) {
        return reply.status(500).send({
          error: 'Search failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  fastify.get<{ Params: { symbol: string } }>(
    '/api/stocks/:symbol',
    async (request, reply) => {
      try {
        const stock = await stockUniverseService.getStock(request.params.symbol);
        if (!stock) return reply.status(404).send({ error: 'Stock not found' });
        return reply.send(stock);
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get stock',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  fastify.get<{ Params: { sector: string }; Querystring: { limit?: string } }>(
    '/api/stocks/sector/:sector',
    async (request, reply) => {
      try {
        const limit = Math.min(Number(request.query.limit) || 50, 200);
        const stocks = await stockUniverseService.getStocksBySector(request.params.sector, limit);
        return reply.send({ sector: request.params.sector, stocks, count: stocks.length });
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get stocks by sector',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  fastify.get('/api/stocks/sectors', async (_request, reply) => {
    try {
      const sectors = await stockUniverseService.getAllSectors();
      return reply.send({ sectors });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get sectors',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/api/stocks/stats', async (_request, reply) => {
    try {
      const stats = await stockUniverseService.getUniverseStats();
      return reply.send(stats);
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post('/api/stocks/sync', async (_request, reply) => {
    try {
      const result = await StockUniverseSyncJob.syncAll();
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get<{ Querystring: { exchange?: string; limit?: string } }>(
    '/api/stocks/top',
    async (request, reply) => {
      try {
        const exchange = (request.query.exchange || 'NSE') as 'NSE' | 'BSE';
        const limit = Math.min(Number(request.query.limit) || 100, 500);
        const stocks = await stockUniverseService.getTopStocks(exchange, limit);
        return reply.send({ stocks, total: stocks.length });
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get top stocks',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
};

export default stockUniverseRoutes;
