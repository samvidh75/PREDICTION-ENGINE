import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sglangService } from '../../../services/AI/SGLangService';
import { routellmService } from '../../../services/AI/RouteLLMService';
import { llmGateway } from '../../../services/AI/LLMGateway';

const llmHealthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/api/llm-health', async (_request, _reply) => {
    const sglangHealthy = await sglangService.health();
    const routellmHealthy = await routellmService.health();

    const allHealthy = sglangHealthy && routellmHealthy;
    const llmFeaturesEnabled = process.env.LLM_FEATURES_ENABLED === 'true';

    return {
      status: allHealthy ? 'ok' : 'degraded',
      llmFeaturesEnabled,
      services: {
        sglang: {
          status: sglangHealthy ? 'ok' : 'down',
          url: process.env.SGLANG_URL || 'http://localhost:30000',
        },
        routellm: {
          status: routellmHealthy ? 'ok' : 'down',
          url: process.env.ROUTELLM_URL || 'http://localhost:8000',
        },
      },
      gateway: {
        ok: allHealthy && llmFeaturesEnabled,
      },
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/api/llm-gateway', async (_request, _reply) => {
    const health = await llmGateway.health();
    return {
      sglang: health.sglang,
      routellm: health.routellm,
      features: {
        askBot: process.env.LLM_FEATURES_ENABLED === 'true',
        analyzeStock: process.env.ENABLE_SGLANG === 'true',
        generateThesis: process.env.ENABLE_ROUTELLM === 'true',
      },
    };
  });
};

export default llmHealthRoutes;
