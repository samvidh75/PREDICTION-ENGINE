import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { HuggingFaceService } from '../../../services/client/HuggingFaceService';

const llmHealthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/api/llm-health', async (_request, _reply) => {
    const healthy = await HuggingFaceService.generateText('ping', 5)
      .then(() => true)
      .catch(() => false);
    const llmFeaturesEnabled = process.env.LLM_FEATURES_ENABLED === 'true';

    return {
      status: healthy ? 'ok' : 'degraded',
      llmFeaturesEnabled,
      provider: 'huggingface',
      gateway: {
        ok: healthy && llmFeaturesEnabled,
      },
      timestamp: new Date().toISOString(),
    };
  });
};

export default llmHealthRoutes;
