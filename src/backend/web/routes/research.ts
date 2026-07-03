/**
 * Research Engine HTTP Router
 *
 * Endpoints:
 * - GET /api/research/snapshot/:symbol
 *   Returns: Scores, health, conviction, fundamentals
 *
 * - GET /api/research/rag-context/:symbol
 *   Returns: Structured data for LLM grounding (no inference)
 *
 * - GET /api/research/scanner
 *   Returns: Scored universe, top N by conviction
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { runEngines } from '../../../research/engine/engineRunner.js';
import { fetchFundamentals } from '../../../research/data/fundamentalsProvider.js';
import { queryRAGContext } from '../../../research/db/ragQuery.js';
import { MasterCompanyRegistry } from '../../../services/data/MasterCompanyRegistry.js';

export async function registerResearchRoutes(app: FastifyInstance) {

  app.get<{ Params: { symbol: string } }>(
    '/api/research/snapshot/:symbol',
    async (request: FastifyRequest<{ Params: { symbol: string } }>, reply: FastifyReply) => {
      const { symbol } = request.params;

      try {
        const fundamentals = await fetchFundamentals(symbol);
        if (!fundamentals) {
          return reply.status(404).send({ error: 'Symbol not found' });
        }

        const scores = await runEngines(fundamentals);
        const health = classifyHealth(scores);
        const conviction = calculateConviction(scores);

        return reply.status(200).send({
          symbol,
          timestamp: Date.now(),
          fundamentals: {
            pe: fundamentals.pe,
            pb: fundamentals.pb,
            roe: fundamentals.roe,
            roic: fundamentals.roic,
            debtToEquity: fundamentals.debtToEquity,
            evEbitda: fundamentals.evEbitda,
            fcfYield: fundamentals.fcfYield,
            dividendYield: fundamentals.dividendYield,
            marketCap: fundamentals.marketCap,
            sector: fundamentals.sector
          },
          scores: {
            quality: scores.quality,
            valuation: scores.valuation,
            growth: scores.growth,
            risk: scores.risk,
            momentum: scores.momentum,
            stability: scores.stability
          },
          health,
          conviction,
          state: determineState(health, conviction)
        });
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Failed to generate snapshot' });
      }
    }
  );

  app.get<{ Params: { symbol: string } }>(
    '/api/research/rag-context/:symbol',
    async (request: FastifyRequest<{ Params: { symbol: string } }>, reply: FastifyReply) => {
      const { symbol } = request.params;

      try {
        const context = await queryRAGContext(symbol);

        if (!context) {
          return reply.status(404).send({ error: 'No context available' });
        }

        return reply.status(200).send({
          symbol,
          timestamp: Date.now(),
          metrics: {
            pe: context.pe,
            pb: context.pb,
            roe: context.roe,
            roic: context.roic,
            debtToEquity: context.debtToEquity,
            currentRatio: context.currentRatio,
            fcfYield: context.fcfYield,
            operatingMargin: context.operatingMargin
          },
          growth: {
            revenueCAGR_3y: context.revenueCAGR_3y,
            profitCAGR_3y: context.profitCAGR_3y,
            revenueGrowth_YoY: context.revenueGrowth_YoY,
            profitGrowth_YoY: context.profitGrowth_YoY
          },
          risk: {
            volatility_30d: context.volatility_30d,
            maxDrawdown_52w: context.maxDrawdown_52w,
            beta: context.beta,
            sharpeRatio: context.sharpeRatio
          },
          recentNews: (context.recentNews || []).slice(0, 3).map((n: any) => ({
            headline: n.headline,
            date: n.date,
            sentiment: n.sentiment
          })),
          company: {
            name: context.companyName,
            sector: context.sector,
            foundedYear: context.foundedYear,
            marketCap: context.marketCap,
            promoterHolding: context.promoterHolding,
            pledgedPercentage: context.pledgedPercentage
          }
        });
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Failed to fetch RAG context' });
      }
    }
  );

  app.get<{ Querystring: { preset: string; limit: number } }>(
    '/api/research/scanner',
    async (request: FastifyRequest<{ Querystring: { preset: string; limit: number } }>, reply: FastifyReply) => {
      const { preset = 'Quality Compounders', limit = 10 } = request.query;

      try {
        const symbols = await getAllSymbols();

        const scored = await Promise.all(
          symbols.map(async (sym: string) => {
            const fundamentals = await fetchFundamentals(sym);
            if (!fundamentals) return null;

            const scores = await runEngines(fundamentals);
            const conviction = calculateConviction(scores);

            return {
              symbol: sym,
              scores,
              conviction,
              price: fundamentals.price,
              pe: fundamentals.pe,
              roe: fundamentals.roe
            };
          })
        );

        let filtered = scored.filter((s: any) => s !== null);

        if (preset === 'Quality Compounders') {
          filtered = filtered.filter((s: any) =>
            s.scores.quality > 70 && s.scores.stability > 65 && s.scores.risk < 40
          );
        } else if (preset === 'Growth') {
          filtered = filtered.filter((s: any) =>
            s.scores.growth > 70 && s.scores.risk < 50
          );
        } else if (preset === 'Value') {
          filtered = filtered.filter((s: any) =>
            s.scores.valuation > 70 && s.pe < 20
          );
        }

        const results = filtered
          .sort((a: any, b: any) => b.conviction - a.conviction)
          .slice(0, limit)
          .map((r: any) => ({
            symbol: r.symbol,
            conviction: r.conviction,
            quality: r.scores.quality,
            valuation: r.scores.valuation,
            growth: r.scores.growth,
            risk: r.scores.risk,
            pe: r.pe,
            roe: r.roe,
            price: r.price
          }));

        return reply.status(200).send({
          preset,
          count: results.length,
          results
        });
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Scanner failed' });
      }
    }
  );
}

function classifyHealth(scores: any): string {
  const overallScore = (
    scores.quality * 0.25 +
    scores.valuation * 0.20 +
    scores.growth * 0.20 +
    scores.stability * 0.20 +
    (100 - scores.risk) * 0.15
  );

  if (overallScore >= 75) return 'Healthy';
  if (overallScore >= 60) return 'Watch';
  if (scores.risk > 70) return 'Risk Rising';
  return 'Needs Review';
}

function calculateConviction(scores: any): number {
  const conviction = (
    (scores.quality / 100) * 0.35 +
    (scores.growth / 100) * 0.25 +
    ((100 - scores.risk) / 100) * 0.25 +
    (scores.valuation / 100) * 0.15
  ) * 100;

  return Math.round(conviction);
}

function determineState(health: string, conviction: number): string {
  if (conviction >= 70) return 'High Conviction';
  if (conviction >= 50) return 'Watch';
  if (health === 'Risk Rising') return 'Risk Rising';
  return 'Needs Review';
}

async function getAllSymbols(): Promise<string[]> {
  return MasterCompanyRegistry.getInstance().getAllSymbols();
}
