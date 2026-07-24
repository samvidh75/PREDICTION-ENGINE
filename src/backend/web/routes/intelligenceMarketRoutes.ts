import type { FastifyInstance } from 'fastify';
import { earningsEngine } from '../../../services/intelligence/engines/EarningsEngine/index.js';
import { eventEngine } from '../../../services/intelligence/engines/EventEngine/index.js';
import type { EarningsMetrics, EventMetrics } from '../../../services/intelligence/types.js';

type SymbolParseResult = { cleanSymbol: string; exchangeSuffix: string };
type QuoteResult = { price?: number | null } | null;

export interface IntelligenceMarketRouteDeps {
  parseSymbol: (raw: string) => SymbolParseResult;
  yahooQuote: (symbol: string, exchangeSuffix?: string) => Promise<QuoteResult>;
  indianApiFunds: (symbol: string) => Promise<Record<string, unknown>>;
}

function n(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const p = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(p) ? p : undefined;
}

export async function registerIntelligenceMarketRoutes(
  server: FastifyInstance,
  deps: IntelligenceMarketRouteDeps,
) {
  server.get('/api/intelligence/earnings', async (req, reply) => {
    const symbol = String((req.query as { symbol?: string } | undefined)?.symbol ?? '').toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: 'symbol required' });
    const { cleanSymbol, exchangeSuffix } = deps.parseSymbol(symbol);

    try {
      const [yahoo, fund] = await Promise.all([
        deps.yahooQuote(cleanSymbol, exchangeSuffix).catch(() => null),
        deps.indianApiFunds(cleanSymbol).catch(() => null),
      ]);

      if (!yahoo?.price) {
        return reply.status(503).send({
          error: 'Data temporarily unavailable',
          message: 'Market data providers are not responding. Please try again in a moment.',
          retryAfter: 30,
        });
      }

      const fundData = fund || {};
      const price = yahoo.price;
      const eps = n(fundData.eps) ?? 0;
      const revenueGrowthYoY = n(fundData.revenue_growth_1y ?? fundData.revenue_growth) ?? 0;
      const profitGrowth = n(fundData.profit_growth) ?? 0;
      const netMargin = n(fundData.net_margin ?? fundData.net_profit_margin) ?? undefined;
      const forwardPE = n(fundData.forward_pe ?? fundData.pe_ratio) ?? undefined;
      const peg = n(fundData.peg_ratio) ?? undefined;
      const fcfMargin = n(fundData.fcf_margin ?? fundData.free_cash_flow_margin) ?? undefined;

      const history = price > 0 && eps > 0
        ? [
            { quarter: `Q2${new Date().getFullYear()}`, eps, epsYoY: profitGrowth, revenue: 0, revenueYoY: revenueGrowthYoY, margin: netMargin ?? 0, surprise: 0, guidanceHit: true },
          ]
        : [];

      const metrics: EarningsMetrics = {
        history,
        currentGuidance: {
          epsGrowth: profitGrowth > 0 ? profitGrowth : 0,
          revenueGrowth: revenueGrowthYoY > 0 ? revenueGrowthYoY : 0,
        },
        forwardPE,
        peg,
        fcfMargin,
        oneTimeItems: undefined,
        capexToRevenue: undefined,
        lastUpdated: new Date(),
        fiscalYear: new Date().getFullYear(),
      };

      const result = await earningsEngine.analyze(metrics);

      reply.header('Cache-Control', 'public, s-maxage=300');
      return {
        symbol,
        engine: 'earnings',
        score: result.overall,
        confidence: result.confidence,
        epsGrowth5Y: result.epsGrowth5Y,
        epsGrowthTrend: result.epsGrowthTrend,
        beatStreak: result.beatStreak,
        earningsQuality: result.earningsQuality,
        revenueQuality: result.revenueQuality,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  server.get('/api/intelligence/events', async (req, reply) => {
    const symbol = String((req.query as { symbol?: string } | undefined)?.symbol ?? '').toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: 'symbol required' });

    try {
      const [, fund] = await Promise.all([
        deps.yahooQuote(symbol).catch(() => null),
        deps.indianApiFunds(symbol).catch(() => null),
      ]);

      const fundData = fund || {};
      const events: Array<{
        type: 'earnings' | 'dividend' | 'deal' | 'approval' | 'product' | 'strategic' | 'other';
        description: string;
        expectedDate?: Date;
        probability?: number;
        expectedImpact: 'high' | 'medium' | 'low';
        direction: 'bullish' | 'bearish' | 'neutral';
      }> = [];

      const now = new Date();
      const quarterMs = 90 * 24 * 60 * 60 * 1000;
      const nextEarningsDate = new Date(now.getTime() + quarterMs);

      events.push({
        type: 'earnings',
        description: `Next quarterly earnings (est. ${nextEarningsDate.toLocaleDateString('en-PH')})`,
        expectedDate: nextEarningsDate,
        probability: 0.95,
        expectedImpact: 'high',
        direction: 'neutral',
      });

      const revenueGrowth = n(fundData.revenue_growth_1y ?? fundData.revenue_growth) ?? 0;

      const metrics: EventMetrics = {
        events,
        nextEarningsDate,
        eventCount90Days: 1,
        bullishEventCount: revenueGrowth > 10 ? 1 : 0,
        bearishEventCount: revenueGrowth < 0 ? 1 : 0,
        lastUpdated: new Date(),
        fiscalYear: new Date().getFullYear(),
        currency: 'PKR',
      };

      const result = await eventEngine.analyze(metrics);

      reply.header('Cache-Control', 'public, s-maxage=300');
      return {
        symbol,
        engine: 'events',
        score: result.overall,
        nextCatalyst: result.nextCatalyst,
        daysToCatalyst: result.daysToCatalyst,
        catalystDirection: result.catalystDirection,
        opportunityWindow: result.opportunityWindow,
        catalystRichness: result.catalystRichness,
        upcomingEvents: result.upcomingEvents,
        confidence: result.confidence,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });
}
