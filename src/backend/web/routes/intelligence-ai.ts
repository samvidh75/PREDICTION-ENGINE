import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { intelligenceService } from '../../../services/IntelligenceService';

const intelligenceAiRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post<{
    Body: {
      symbol: string;
      name: string;
      price: number;
      change: number;
      changePercent: number;
      pe: number;
      pb: number;
      roe: number;
      marketCap: string;
      sector: string;
      industry: string;
      revenueGrowth: number;
      profitMargin: number;
      debtToEquity: number;
      currentRatio: number;
      rsi: number;
      macd: number;
      bollingerWidth: number;
      high52w: number;
      low52w: number;
      depth?: 'quick' | 'detailed';
    };
  }>('/api/intelligence/analyze', async (request, reply) => {
    try {
      const { depth = 'quick', ...stockFields } = request.body;
      const stockData = stockFields as any;

      const analysis = await intelligenceService.analyzeStock(stockData, depth);
      const thesis = await intelligenceService.generateThesis(stockData, analysis);
      const recommendation = await intelligenceService.generateRecommendation(
        stockData,
        analysis,
        thesis
      );

      return reply.send({
        symbol: stockData.symbol,
        analysis,
        thesis,
        recommendation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Analysis error:', error);
      return reply.status(500).send({
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post<{ Body: { symbols: string[] } }>(
    '/api/intelligence/compare',
    async (request, reply) => {
      try {
        const { symbols } = request.body;

        if (symbols.length < 2) {
          return reply.status(400).send({ error: 'Need at least 2 symbols to compare' });
        }
        if (symbols.length > 5) {
          return reply.status(400).send({ error: 'Maximum 5 stocks to compare' });
        }

        return reply.status(400).send({
          error: 'Comparison requires full stock data',
          message: 'Use POST /api/intelligence/analyze for each stock, then POST /api/intelligence/compare-stocks with data',
        });
      } catch (error) {
        console.error('Comparison error:', error);
        return reply.status(500).send({
          error: 'Comparison failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.post<{ Body: { stocks: any[] } }>(
    '/api/intelligence/compare-stocks',
    async (request, reply) => {
      try {
        const { stocks } = request.body;

        if (!stocks || stocks.length < 2) {
          return reply.status(400).send({ error: 'Need at least 2 stocks to compare' });
        }
        if (stocks.length > 5) {
          return reply.status(400).send({ error: 'Maximum 5 stocks to compare' });
        }

        const comparison = await intelligenceService.compareStocks(stocks);
        return reply.send(comparison);
      } catch (error) {
        console.error('Comparison error:', error);
        return reply.status(500).send({
          error: 'Comparison failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.post<{
    Body: { symbol: string; question: string; context?: string };
  }>('/api/intelligence/chat', async (request, reply) => {
    try {
      const { symbol, question, context = '' } = request.body;

      if (!question || question.trim().length === 0) {
        return reply.status(400).send({ error: 'Question required' });
      }

      const response = await intelligenceService.chat(symbol, question, context);

      return reply.send({
        symbol,
        question,
        response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Chat error:', error);
      return reply.status(500).send({
        error: 'Chat failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post<{
    Body: {
      symbol: string;
      originalThesis: { bullCase: string; bearCase: string; keyRisks: string[] };
      currentData: any;
    };
  }>('/api/intelligence/thesis-check', async (request, reply) => {
    try {
      const { symbol, originalThesis, currentData } = request.body;

      const currentAnalysis = await intelligenceService.analyzeStock(
        currentData,
        'quick'
      );

      const result = await intelligenceService.checkThesisValidity(
        symbol,
        originalThesis as any,
        currentAnalysis
      );

      return reply.send(result);
    } catch (error) {
      console.error('Thesis check error:', error);
      return reply.status(500).send({
        error: 'Thesis check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post<{
    Body: { stocks: any[]; trend: 'bullish' | 'bearish' | 'neutral' };
  }>('/api/intelligence/commentary', async (request, reply) => {
    try {
      const { stocks, trend } = request.body;

      if (!stocks || stocks.length === 0) {
        return reply.status(400).send({ error: 'Need at least 1 stock' });
      }

      const commentary = await intelligenceService.generateMarketCommentary(
        stocks,
        trend
      );

      return reply.send({
        commentary,
        stockCount: stocks.length,
        trend,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Commentary error:', error);
      return reply.status(500).send({
        error: 'Commentary failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/api/intelligence/ai-health', async (_request, reply) => {
    try {
      const response = await intelligenceService.chat(
        'TEST',
        'Say OK',
        'Test prompt'
      );
      return reply.send({
        status: 'healthy',
        sglang: 'connected',
        response: response.substring(0, 50),
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        error: 'SGLang not responding',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

export default intelligenceAiRoutes;
