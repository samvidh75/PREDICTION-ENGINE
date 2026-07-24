import type { FastifyInstance } from 'fastify';
import { newsEngine } from '../../../services/intelligence/engines/NewsEngine/index.js';
import { sectorEngine } from '../../../services/intelligence/engines/SectorEngine/index.js';
import { valuationEngine } from '../../../services/intelligence/engines/ValuationEngine/index.js';
import type { NewsMetrics, SectorMetrics, ValuationMetrics } from '../../../services/intelligence/types.js';

type QuoteResult = { price?: number | null } | null;

export interface IntelligenceContextRouteDeps {
  yahooQuote: (symbol: string, exchangeSuffix?: string) => Promise<QuoteResult>;
  indianApiFunds: (symbol: string) => Promise<Record<string, unknown>>;
  getPersistedStockResearch: (symbol: string) => Promise<unknown>;
}

function n(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const p = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(p) ? p : undefined;
}

export async function registerIntelligenceContextRoutes(
  server: FastifyInstance,
  deps: IntelligenceContextRouteDeps,
) {
  server.get('/api/intelligence/valuation', async (req, reply) => {
    const symbol = String((req.query as { symbol?: string } | undefined)?.symbol ?? '').toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: 'symbol required' });

    try {
      const [yahoo, fund] = await Promise.all([
        deps.yahooQuote(symbol),
        deps.indianApiFunds(symbol),
      ]);

      const fundData = fund || {};
      const _price = n(yahoo?.price) ?? 0;

      const metrics: ValuationMetrics = {
        peRatio: n(fundData.pe_ratio),
        pbRatio: n(fundData.pb_ratio),
        evEbitda: n(fundData.ev_ebitda ?? fundData.enterprise_value_ebitda),
        fcfYield: n(fundData.fcf_yield ?? fundData.free_cash_flow_yield),
        dividendYield: n(fundData.dividend_yield),
        lastUpdated: new Date(),
        symbol,
      };

      const result = await valuationEngine.analyze(metrics);

      reply.header('Cache-Control', 'public, s-maxage=600');
      return {
        symbol,
        engine: 'valuation',
        score: result.overall,
        valuation: result.valuation,
        peScore: result.peScore,
        pbScore: result.pbScore,
        evEbitdaScore: result.evEbitdaScore,
        fcfYieldScore: result.fcfYieldScore,
        dividendYieldScore: result.dividendYieldScore,
        confidence: result.confidence,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  server.get('/api/intelligence/news', async (req, reply) => {
    const symbol = String((req.query as { symbol?: string } | undefined)?.symbol ?? '').toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: 'symbol required' });

    try {
      const newsUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&lang=en-PH&region=IN&quotesCount=0&newsCount=8`;
      let articles: { headline: string; source: string; time: string; link?: string }[] = [];
      try {
        const resp = await fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await resp.json() as any;
        articles = ((data?.news ?? []) as any[]).slice(0, 8).map((item: any) => ({
          headline: String(item.title ?? item.headline ?? ''),
          source: String(item.publisher ?? item.source ?? 'Unknown'),
          time: String(item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString()
            : item.publishedAt ?? item.createdAt ?? new Date().toISOString()),
          link: item.link ?? undefined,
        }));
      } catch {
        articles = [];
      }

      const metrics: NewsMetrics = { articles, symbol, lastUpdated: new Date() };
      const result = await newsEngine.analyze(metrics);

      reply.header('Cache-Control', 'public, s-maxage=600');
      return {
        symbol,
        engine: 'news',
        score: result.overall,
        sentiment: result.sentiment,
        articleCount: result.articleCount,
        volumeScore: result.volumeScore,
        sentimentScore: result.sentimentScore,
        credibilityScore: result.credibilityScore,
        recencyScore: result.recencyScore,
        topKeywords: result.topKeywords,
        confidence: result.confidence,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  server.get('/api/intelligence/sector', async (req, reply) => {
    const symbol = String((req.query as { symbol?: string } | undefined)?.symbol ?? '').toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: 'symbol required' });

    try {
      const [fund, synthetic] = await Promise.all([
        deps.indianApiFunds(symbol),
        deps.getPersistedStockResearch(symbol),
      ]);

      const fundData = fund || {};
      const synData = (synthetic || {}) as any;
      const sectorName = String(synData.sector ?? fundData.sector ?? '');

      const metrics: SectorMetrics = {
        stockPE: n(fundData.pe_ratio),
        stockPB: n(fundData.pb_ratio),
        stockEVEbitda: n(fundData.ev_ebitda ?? fundData.enterprise_value_ebitda),
        stockROE: n(fundData.roe ?? fundData.return_on_equity),
        stockNetMargin: n(fundData.net_margin ?? fundData.net_profit_margin),
        stockRevGrowth: n(fundData.revenue_growth ?? fundData.rev_growth_1y),
        stockEPSGrowth: n(fundData.eps_growth ?? fundData.eps_growth_1y),
        peerPE: n(synData.sectorPe ?? synData.peerPE),
        peerPB: n(synData.sectorPb ?? synData.peerPB),
        peerEVEbitda: n(synData.sectorEvEbitda ?? synData.peerEVEbitda),
        peerROE: n(synData.sectorRoe ?? synData.peerROE),
        peerNetMargin: n(synData.sectorNetMargin ?? synData.peerNetMargin),
        peerRevGrowth: n(synData.sectorRevGrowth ?? synData.peerRevGrowth),
        peerEPSGrowth: n(synData.sectorEpsGrowth ?? synData.peerEPSGrowth),
        sectorReturn1M: n(synData.sectorReturn1M ?? fundData.sector_return_1m),
        sectorReturn3M: n(synData.sectorReturn3M ?? fundData.sector_return_3m),
        relativeStrength: n(synData.relativeStrength ?? synData.sectorRs),
        analystUpgrades: n(synData.analystUpgrades),
        analystDowngrades: n(synData.analystDowngrades),
        marketCapRank: n(synData.marketCapRank ?? synData.peerRank),
        sectorPeerCount: n(synData.sectorPeerCount ?? synData.peerCount),
        brandStrength: n(synData.brandStrength),
        customerStickiness: n(synData.customerStickiness),
        symbol,
        sectorName,
        lastUpdated: new Date(),
      };

      const result = await sectorEngine.analyze(metrics);

      reply.header('Cache-Control', 'public, s-maxage=600');
      return {
        symbol,
        engine: 'sector',
        sector: sectorName,
        score: result.overall,
        peerRank: result.peerRank,
        relativeValuation: result.relativeValuation,
        sectorMomentum: result.sectorMomentum,
        competitivePosition: result.competitivePosition,
        relativeValuationScore: result.relativeValuationScore,
        relativeQualityScore: result.relativeQualityScore,
        relativeGrowthScore: result.relativeGrowthScore,
        sectorMomentumScore: result.sectorMomentumScore,
        competitivePositionScore: result.competitivePositionScore,
        confidence: result.confidence,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });
}
