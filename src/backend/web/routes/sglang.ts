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

  fastify.get('/api/sglang/ollama-test', async (_request, reply) => {
    try {
      const { default: axios } = await import('axios');
      const ollamaUrl = process.env.SGLANG_INTELLIGENCE_URL || process.env.SGLANG_URL || process.env.OLLAMA_URL || 'http://ollama:11434';
      const model = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';

      const [tagsRes, genRes] = await Promise.allSettled([
        axios.get(`${ollamaUrl}/api/tags`, { timeout: 5000 }),
        axios.post(`${ollamaUrl}/api/generate`, {
          model,
          prompt: 'Say OK',
          options: { num_predict: 10 },
          stream: false,
        }, { timeout: 30000 }),
      ]);

      return reply.send({
        tagsStatus: tagsRes.status === 'fulfilled' ? (tagsRes.value.data?.models || []).map((m: any) => m.name) : tagsRes.reason?.message,
        genStatus: genRes.status === 'fulfilled' ? genRes.value.data : String(genRes.reason?.response?.data || genRes.reason?.message),
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Ollama test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

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

  fastify.post<{ Body: { symbol: string; fundamentals?: any } }>(
    '/api/sglang/risks',
    async (request, reply) => {
      try {
        const { symbol } = request.body;
        const risks = await sglangService.generateRiskFactors(symbol);
        return reply.send({ symbol, risks, timestamp: new Date().toISOString() });
      } catch (error) {
        return reply.status(500).send({
          error: 'Risk generation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  fastify.post<{ Body: { symbol: string; fundamentals?: any } }>(
    '/api/sglang/bullbear',
    async (request, reply) => {
      try {
        const { symbol, fundamentals = {} } = request.body;
        const result = await sglangService.generateBullBearCase(symbol, {
          peRatio: fundamentals.peRatio ?? null,
          roe: fundamentals.roe ?? null,
          revenueGrowth: fundamentals.revenueGrowth ?? null,
        });
        return reply.send({ symbol, ...result, timestamp: new Date().toISOString() });
      } catch (error) {
        return reply.status(500).send({
          error: 'Bull/bear generation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
};

export default sglangRoutes;
