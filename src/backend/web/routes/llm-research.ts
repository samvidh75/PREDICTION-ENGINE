import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { freeLLMService } from '../../../services/AI/FreeLLMService';
import { freeVectorDBService } from '../../../services/AI/FreeVectorDBService';
import { freeMetricsService } from '../../../services/AI/FreeMetricsService';

const freeStackRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // ── Free Stack: Ollama LLM ──────────────────────────────────────────────────
  fastify.post<{ Body: { symbol: string; message: string } }>(
    '/api/free/chat',
    async (request, _reply) => {
      const { symbol, message } = request.body;
      const start = Date.now();
      const answer = await freeLLMService.askBot(symbol, message);
      freeMetricsService.trackLLMCall('ollama', Date.now() - start, true);
      return { answer, symbol };
    }
  );

  fastify.post<{ Body: { symbol: string; score: number } }>(
    '/api/free/explain-score',
    async (request, _reply) => {
      const { symbol, score } = request.body;
      const explanation = await freeLLMService.explainScore(symbol, score);
      return { explanation, symbol, score };
    }
  );

  // ── Free Stack: Ollama Health ─────────────────────────────────────────────
  fastify.get('/api/free/ollama/health', async (_request, _reply) => {
    const healthy = await freeLLMService.health();
    return {
      status: healthy ? 'ok' : 'down',
      url: process.env.OLLAMA_URL || 'http://localhost:11434',
    };
  });

  // ── Free Stack: Qdrant Vector Search ────────────────────────────────────
  fastify.post<{ Body: { query: string; vector: number[]; limit?: number } }>(
    '/api/free/search',
    async (request, _reply) => {
      const { vector, limit } = request.body;
      const results = await freeVectorDBService.searchStocks(vector, limit);
      freeMetricsService.trackVectorSearch('stocks');
      return { results };
    }
  );

  fastify.post<{ Body: { symbol: string; vector: number[]; payload?: Record<string, any> } }>(
    '/api/free/store',
    async (request, _reply) => {
      const { symbol, vector, payload } = request.body;
      await freeVectorDBService.storeStock(symbol, vector, payload);
      return { stored: true, symbol };
    }
  );

  // ── Free Stack: Qdrant Health ─────────────────────────────────────────────
  fastify.get('/api/free/qdrant/health', async (_request, _reply) => {
    const healthy = await freeVectorDBService.health();
    return {
      status: healthy ? 'ok' : 'down',
      url: process.env.QDRANT_URL || 'http://localhost:6333',
    };
  });

  // ── Free Stack: Prometheus Metrics ──────────────────────────────────────
  fastify.get('/api/free/metrics', async (_request, reply) => {
    const metrics = await freeMetricsService.getMetrics();
    reply.header('Content-Type', freeMetricsService.getContentType());
    return reply.send(metrics);
  });

  // ── Free Stack: Overall Health ───────────────────────────────────────────
  fastify.get('/api/free/health', async (_request, _reply) => {
    const [ollamaOk, qdrantOk] = await Promise.all([
      freeLLMService.health(),
      freeVectorDBService.health(),
    ]);
    return {
      status: ollamaOk && qdrantOk ? 'ok' : 'degraded',
      services: {
        ollama: { status: ollamaOk ? 'ok' : 'down' },
        qdrant: { status: qdrantOk ? 'ok' : 'down' },
      },
    };
  });

  fastify.post('/api/admin/pull-model', async (_request, reply) => {
    const model = process.env.OLLAMA_MODEL || 'llama3.1:7b-instruct-q4_K_M';
    const response = await fetch(`http://ollama:11434/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });
    const reader = response.body?.getReader();
    if (!reader) return reply.status(500).send({ error: 'no reader' });
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
    return { pulled: true, model, output: result };
  });
};

export default freeStackRoutes;
