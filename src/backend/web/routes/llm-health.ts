import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sglangService } from '../../../services/AI/SGLangService';

const llmHealthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/api/llm-health', async (_request, _reply) => {
    const sglangHealthy = await sglangService.health();
    const llmFeaturesEnabled = process.env.LLM_FEATURES_ENABLED === 'true';

    return {
      status: sglangHealthy ? 'ok' : 'degraded',
      llmFeaturesEnabled,
      services: {
        sglang: {
          status: sglangHealthy ? 'ok' : 'down',
          url: process.env.SGLANG_URL || 'http://localhost:30000',
        },
      },
      gateway: {
        ok: sglangHealthy && llmFeaturesEnabled,
      },
      timestamp: new Date().toISOString(),
    };
  });
};

export default llmHealthRoutes;
