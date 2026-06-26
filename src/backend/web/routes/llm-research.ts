import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { researchBotService } from '../../../services/AI/ResearchBotService';
import { scoreExplanationService } from '../../../services/AI/ScoreExplanationService';
import { stockSnapshotService } from '../../../services/AI/StockSnapshotService';
import { stockComparisonService } from '../../../services/AI/StockComparisonService';
import { scannerThesisService } from '../../../services/AI/ScannerThesisService';
import { thesisTrackingService } from '../../../services/AI/ThesisTrackingService';
import { sglangService } from '../../../services/AI/SGLangService';
import { llmResponsesQueries } from '../../../db/queries/llm-responses';
import type { ScoreExplanationInput } from '../../../services/AI/ScoreExplanationService';
import type { ScannerThesisInput } from '../../../services/AI/ScannerThesisService';

const llmResearchRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post<{ Body: { symbol: string; question: string; sessionId?: string } }>(
    '/api/research-bot/chat',
    async (request, _reply) => {
      const { symbol, question, sessionId } = request.body;
      const result = await researchBotService.chat(symbol, question, sessionId);
      return result;
    }
  );

  fastify.post<{
    Body: ScoreExplanationInput;
  }>('/api/research/explain-score', async (request, _reply) => {
    const result = await scoreExplanationService.generateScoreExplanation(request.body);
    return result;
  });

  fastify.post<{
    Body: {
      symbol: string;
      price: number;
      changePercent: number;
      peRatio?: number | null;
      pbRatio?: number | null;
      roe?: number | null;
      roic?: number | null;
      revenueGrowth?: number | null;
      debtEquity?: number | null;
      marketCap?: number | null;
    };
  }>('/api/research/snapshot', async (request, _reply) => {
    const input = {
      symbol: request.body.symbol,
      price: request.body.price,
      changePercent: request.body.changePercent,
      peRatio: request.body.peRatio ?? null,
      pbRatio: request.body.pbRatio ?? null,
      roe: request.body.roe ?? null,
      roic: request.body.roic ?? null,
      revenueGrowth: request.body.revenueGrowth ?? null,
      debtEquity: request.body.debtEquity ?? null,
      marketCap: request.body.marketCap ?? null,
    };
    const result = await stockSnapshotService.generateSnapshot(input);
    return result;
  });

  fastify.post<{
    Body: {
      stocks: Array<{
        symbol: string;
        companyName: string;
        score: number;
        quality: number;
        valuation: number;
        growth: number;
        stability: number;
        momentum: number;
        risk: number;
      }>;
    };
  }>('/api/research/compare', async (request, _reply) => {
    const result = await stockComparisonService.compare(request.body.stocks);
    return result;
  });

  fastify.post<{
    Body: { stocks: ScannerThesisInput[] };
  }>('/api/scanner/generate-theses', async (request, _reply) => {
    const results = await scannerThesisService.batchGenerate(request.body.stocks);
    for (const r of results) {
      if (r.thesis) {
        await scannerThesisService.cacheThesis(r.symbol, r.thesis);
      }
    }
    return { theses: results };
  });

  fastify.get<{ Params: { symbol: string } }>(
    '/api/scanner/thesis/:symbol',
    async (request, _reply) => {
      const thesis = await scannerThesisService.getCachedThesis(request.params.symbol);
      if (!thesis) {
        return { symbol: request.params.symbol, thesis: null };
      }
      return { symbol: request.params.symbol, thesis };
    }
  );

  fastify.post<{
    Body: {
      symbol: string;
      currentScore: number;
      previousScore: number;
      previousThesis: string;
    };
  }>('/api/research/check-thesis-change', async (request, _reply) => {
    const result = await thesisTrackingService.detectChange(
      request.body.symbol,
      request.body.currentScore,
      request.body.previousScore,
      request.body.previousThesis
    );
    return result;
  });

  fastify.post<{ Body: { symbol: string; thesis: string; score: number } }>(
    '/api/research/save-thesis',
    async (request, _reply) => {
      await thesisTrackingService.saveSnapshot(
        request.body.symbol,
        request.body.thesis,
        request.body.score
      );
      return { saved: true };
    }
  );

  fastify.get<{ Params: { symbol: string } }>(
    '/api/research/thesis/:symbol',
    async (request, _reply) => {
      const snapshot = await thesisTrackingService.getSnapshot(request.params.symbol);
      return snapshot || { symbol: request.params.symbol, thesis: null };
    }
  );

  fastify.get('/api/llm/metrics', async (_request, _reply) => {
    const [hourly, daily] = await Promise.all([
      llmResponsesQueries.getMetrics('1h'),
      llmResponsesQueries.getMetrics('24h'),
    ]);
    return {
      hourly: hourly.rows[0] || { total_queries: 0, avg_tokens: 0, total_cost: 0 },
      daily: daily.rows[0] || { total_queries: 0, avg_tokens: 0, total_cost: 0 },
    };
  });

  fastify.get('/api/llm/sglang/health', async (_request, _reply) => {
    const healthy = await sglangService.health();
    return {
      status: healthy ? 'ok' : 'down',
      url: process.env.SGLANG_URL || 'http://localhost:30000',
    };
  });
};

export default llmResearchRoutes;
