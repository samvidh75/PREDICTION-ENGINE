/**
 * Intelligence API — Fastify Routes
 *
 * Exposes the intelligence pipeline as Fastify routes.
 * Supports per-stock analysis, batch analysis, and cache control.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { IntelligenceInput, StockIntelligenceReport } from '../types';
import { orchestrator } from '../orchestrator/LensoryOrchestrator';
import { globalIntelligenceCache } from '../persistence/IntelligenceCache';
import { llmExplainer } from '../llm/LLMExplainer';

interface StockQuery {
  symbol: string;
  exchange?: string;
  tradeDate?: string;
}

interface BatchBody {
  stocks: Array<{
    symbol: string;
    exchange?: string;
    tradeDate?: string;
  }>;
}

export async function registerIntelligenceRoutes(app: FastifyInstance): Promise<void> {
  // ── Single stock analysis ──────────────────────────────────────

  app.get<{ Querystring: StockQuery }>(
    '/api/intelligence/stock',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['symbol'],
          properties: {
            symbol: { type: 'string' },
            exchange: { type: 'string', enum: ['PSE', 'PSE', 'PSE_EQ', 'PSE_EQ'] },
            tradeDate: { type: 'string' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Querystring: StockQuery }>, reply: FastifyReply) => {
      const { symbol, exchange, tradeDate } = req.query;
      const ex = (exchange ?? 'PSE_EQ') as IntelligenceInput['exchange'];

      // Check cache
      const cached = globalIntelligenceCache.get(symbol, tradeDate);
      if (cached) {
        return reply.send({ ok: true, cached: true, data: cached });
      }

      try {
        const input = buildInput(symbol, ex, tradeDate);
        const report = await orchestrator.analyze(input);
        globalIntelligenceCache.set(report);
        return reply.send({ ok: true, data: report });
      } catch (err) {
        req.log.error(err, 'Intelligence analysis failed');
        return reply.status(500).send({
          ok: false,
          error: err instanceof Error ? err.message : 'Intelligence analysis failed',
        });
      }
    }
  );

  // ── Intelligence by exchange ───────────────────────────────────

  app.get<{ Querystring: { exchange: string } }>(
    '/api/intelligence/exchange/:exchange',
    async (req: FastifyRequest<{ Querystring: { exchange: string } }>, reply: FastifyReply) => {
      const { exchange } = req.params as { exchange: string };
      // This would query the database for stocks on that exchange
      // and run batch analysis. Placeholder for now.
      return reply.send({
        ok: true,
        exchange,
        message: `Intelligence analysis for ${exchange} stocks — batch endpoint ready for integration`,
      });
    }
  );

  // ── Batch analysis ─────────────────────────────────────────────

  app.post<{ Body: BatchBody }>(
    '/api/intelligence/batch',
    {
      schema: {
        body: {
          type: 'object',
          required: ['stocks'],
          properties: {
            stocks: {
              type: 'array',
              items: {
                type: 'object',
                required: ['symbol'],
                properties: {
                  symbol: { type: 'string' },
                  exchange: { type: 'string' },
                  tradeDate: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: BatchBody }>, reply: FastifyReply) => {
      const { stocks } = req.body;
      const results: Array<{ symbol: string; ok: boolean; report?: StockIntelligenceReport; error?: string }> = [];

      // Process sequentially to avoid overwhelming external resources
      for (const s of stocks) {
        try {
          const ex = (s.exchange ?? 'PSE_EQ') as IntelligenceInput['exchange'];
          const input = buildInput(s.symbol, ex, s.tradeDate);
          const report = await orchestrator.analyze(input);
          globalIntelligenceCache.set(report);
          results.push({ symbol: s.symbol, ok: true, report });
        } catch (err) {
          results.push({
            symbol: s.symbol,
            ok: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      return reply.send({
        ok: true,
        total: stocks.length,
        succeeded: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        results,
      });
    }
  );

  // ── Cache management ───────────────────────────────────────────

  app.post('/api/intelligence/cache/invalidate', async (req, reply) => {
    const { symbol } = req.body as { symbol?: string };
    if (symbol) {
      globalIntelligenceCache.invalidate(symbol);
    } else {
      globalIntelligenceCache.clear();
    }
    return reply.send({
      ok: true,
      message: symbol ? `Cache invalidated for ${symbol}` : 'Full cache cleared',
    });
  });

  app.get('/api/intelligence/cache/status', async (req, reply) => {
    const evicted = globalIntelligenceCache.evictExpired();
    return reply.send({
      ok: true,
      cacheSize: globalIntelligenceCache.size,
      evicted,
    });
  });

  // ── Health ─────────────────────────────────────────────────────

  app.get('/api/intelligence/health', async (req, reply) => {
    return reply.send({
      ok: true,
      status: 'ready',
      engines: [
        'financial', 'technical', 'valuation',
        'risk', 'sector', 'news', 'earnings',
        'event', 'rag',
      ],
      explainer: llmExplainerName(),
      cacheSize: globalIntelligenceCache.size,
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────

function buildInput(symbol: string, exchange: IntelligenceInput['exchange'], tradeDate?: string): IntelligenceInput {
  return {
    symbol: symbol.toUpperCase(),
    exchange,
    tradeDate: tradeDate ?? new Date().toISOString().split('T')[0],
    financials: {},
    technicals: {},
    earnings: {},
    sentiment: { overallScore: null, recentHeadlines: null, avgRecentSentiment: null, mentionVolume: null, positiveRatio: null, negativeRatio: null, neutralRatio: null, trending: null, controversyScore: null },
    sector: { name: 'General', sectorStrength: null, sectorMomentum: null, sectorPe: null, sectorAvgGrowth: null, sectorAvgMargin: null },
    risks: { auditorChange: false, relatedPartyTransactions: false, pledgedShares: null, promoterHolding: null, institutionalHolding: null, outstandingWarrants: false, esopDilution: null, litigationRisk: null, governanceScore: null },
  } as IntelligenceInput;
}

function llmExplainerName(): string {
  try {
    return llmExplainer.activeProvider;
  } catch {
    return 'deterministic';
  }
}
