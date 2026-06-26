import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sglangService } from '../../../services/AI/SGLangService';
import { marketConfigService } from '../../../services/MarketConfigService';
import { batchQueue } from '../../../services/BatchQueue';

const sglangRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/api/sglang/health', async (_request, reply) => {
    try {
      const ok = await sglangService.health();
      const marketStatus = await marketConfigService.getMarketStatus();
      return reply.send({
        status: ok ? 'healthy' : 'unhealthy',
        model: 'mistral',
        marketOpen: marketStatus.isOpen,
        dataSource: marketStatus.isOpen ? 'live' : 'snapshot',
        queueSize: batchQueue.getQueueSize(),
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post<{ Body: { symbol: string; fundamentals?: any } }>(
    '/api/sglang/analyze',
    async (request, reply) => {
      try {
        const { symbol, fundamentals = {} } = request.body;
        const analysis = await sglangService.analyzeStockParallel(symbol, {
          roe: fundamentals.roe ?? null,
          roic: fundamentals.roic ?? null,
          peRatio: fundamentals.peRatio ?? null,
          pbRatio: fundamentals.pbRatio ?? null,
          revenueGrowth: fundamentals.revenueGrowth ?? null,
          debtEquity: fundamentals.debtEquity ?? null,
        });
        return reply.send({ symbol, analysis, timestamp: new Date().toISOString() });
      } catch (error) {
        return reply.status(500).send({
          error: 'Analysis failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  fastify.post<{ Body: { symbol: string; fundamentals?: any } }>(
    '/api/sglang/thesis',
    async (request, reply) => {
      try {
        const { symbol, fundamentals = {} } = request.body;
        const thesis = await sglangService.generateThesis(symbol, {
          peRatio: fundamentals.peRatio ?? null,
          roe: fundamentals.roe ?? null,
          revenueGrowth: fundamentals.revenueGrowth ?? null,
        });
        return reply.send({ symbol, thesis, timestamp: new Date().toISOString() });
      } catch (error) {
        return reply.status(500).send({
          error: 'Thesis generation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
};

export default sglangRoutes;
