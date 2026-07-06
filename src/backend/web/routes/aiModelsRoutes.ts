import type { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AIModelsRouteDeps {}


/**
 * Load QWEN or GEMMA adapter from disk
 * In production, these will be loaded at server startup
 */
function getAdapterPath(modelType: 'qwen' | 'gemma'): string {
  const basePath = process.env.MODELS_PATH || '/app/models';

  if (modelType === 'qwen') {
    return path.join(basePath, 'qwen_conversational_adapter');
  } else {
    return path.join(basePath, 'gemma_analytical_adapter');
  }
}

/**
 * Determine if question is complex (needs GEMMA) or simple (can use QWEN)
 */
function isComplexQuestion(question: string): boolean {
  const complexKeywords = [
    'analyze', 'analyse', 'geopolitical', 'macro', 'scenario', 'recession',
    'fed', 'rbi', 'interest rate', 'inflation', 'volatility', 'breakdown',
    'comprehensive', 'detailed', 'health', 'rating', 'probability',
    'current affairs', 'news', 'impact', 'international', 'trade'
  ];

  const lowerQuestion = question.toLowerCase();
  return complexKeywords.some(keyword => lowerQuestion.includes(keyword));
}

/**
 * Format response with confidence score
 */
function formatResponse(
  model: 'qwen' | 'gemma',
  question: string,
  response: string,
  confidence: number = 0.85
) {
  return {
    question,
    response,
    model,
    modelDescription: model === 'qwen'
      ? 'QWEN 0.5B - Conversational (Beginner-friendly)'
      : 'GEMMA 2B - Analytical (Professional)',
    confidence,
    timestamp: new Date().toISOString(),
  };
}

export async function registerAIModelsRoutes(server: FastifyInstance, _deps: AIModelsRouteDeps) {

  /**
   * Ask a question - auto-routes to QWEN or GEMMA based on complexity
   */
  server.post<{ Body: { question: string; symbol?: string } }>('/api/ai/ask', async (req, reply) => {
    try {
      const { question, symbol } = req.body;

      if (!question || question.trim().length === 0) {
        return reply.status(400).send({ error: 'question is required' });
      }

      // Determine which model to use
      const isComplex = isComplexQuestion(question);
      const modelType = isComplex ? 'gemma' : 'qwen';

      // TODO: In production, load actual model and generate response
      // For now, return a placeholder that shows the routing works
      const adapterPath = getAdapterPath(modelType);
      const adapterExists = fs.existsSync(adapterPath);

      if (!adapterExists) {
        return reply.status(503).send({
          error: 'Model not available',
          message: `${modelType.toUpperCase()} adapter not found at ${adapterPath}`,
        });
      }

      // Placeholder response - in production this will be actual model inference
      const mockResponse = modelType === 'qwen'
        ? `Based on your question about ${symbol || 'the market'}, here's a simple explanation...`
        : `Here's a detailed analysis of ${symbol || 'the market'} considering geopolitical factors and macro trends...`;

      return formatResponse(modelType, question, mockResponse, 0.92);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || String(err) });
    }
  });

  /**
   * Simple Q&A endpoint - always uses QWEN
   */
  server.post<{ Body: { question: string } }>('/api/ai/simple-qa', async (req, reply) => {
    try {
      const { question } = req.body;

      if (!question || question.trim().length === 0) {
        return reply.status(400).send({ error: 'question is required' });
      }

      const adapterPath = getAdapterPath('qwen');
      const adapterExists = fs.existsSync(adapterPath);

      if (!adapterExists) {
        return reply.status(503).send({
          error: 'QWEN model not available',
          message: `QWEN adapter not found at ${adapterPath}`,
        });
      }

      // TODO: Load QWEN model and generate response
      const mockResponse = 'QWEN response with simple explanation...';

      return formatResponse('qwen', question, mockResponse, 0.90);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || String(err) });
    }
  });

  /**
   * Detailed analysis endpoint - always uses GEMMA
   */
  server.post<{ Body: { question: string; symbol?: string } }>('/api/ai/analyze', async (req, reply) => {
    try {
      const { question, symbol } = req.body;

      if (!question || question.trim().length === 0) {
        return reply.status(400).send({ error: 'question is required' });
      }

      const adapterPath = getAdapterPath('gemma');
      const adapterExists = fs.existsSync(adapterPath);

      if (!adapterExists) {
        return reply.status(503).send({
          error: 'GEMMA model not available',
          message: `GEMMA adapter not found at ${adapterPath}`,
        });
      }

      // TODO: Load GEMMA model and generate response
      const mockResponse = `Detailed analysis of ${symbol || 'the market'} with geopolitical factors, macro trends, health ratings, and probability-weighted scenarios...`;

      return formatResponse('gemma', question, mockResponse, 0.88);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || String(err) });
    }
  });

  /**
   * Health check - verify models are loaded
   */
  server.get('/api/ai/health', async (_req, reply) => {
    try {
      const qwenPath = getAdapterPath('qwen');
      const gemmaPath = getAdapterPath('gemma');

      const qwenReady = fs.existsSync(qwenPath);
      const gemmaReady = fs.existsSync(gemmaPath);

      return {
        status: qwenReady && gemmaReady ? 'healthy' : 'degraded',
        models: {
          qwen: {
            ready: qwenReady,
            path: qwenPath,
            description: 'QWEN 0.5B - Conversational (Beginner-friendly)',
          },
          gemma: {
            ready: gemmaReady,
            path: gemmaPath,
            description: 'GEMMA 2B - Analytical (Professional)',
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || String(err) });
    }
  });
}
