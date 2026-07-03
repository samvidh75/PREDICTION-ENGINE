import type { FastifyInstance } from 'fastify';
import { financialEngine } from '../../../services/intelligence/engines/FinancialEngine/index.js';
import { technicalEngine } from '../../../services/intelligence/engines/TechnicalEngine/index.js';
import { riskEngine } from '../../../services/intelligence/engines/RiskEngine/index.js';
import { ragEngine } from '../../../services/intelligence/engines/RAGEngine/index.js';
import type { FinancialMetrics, RAGMetrics, RiskMetrics } from '../../../services/intelligence/types.js';

type QuoteResult = { price?: number | null; marketCap?: number | null } | null;
type PriceHistory = Record<string, { label: string; price: number }[]>;
type SymbolParseResult = { cleanSymbol: string; exchangeSuffix: string };

export interface IntelligenceCoreRouteDeps {
  parseSymbol: (raw: string) => SymbolParseResult;
  yahooQuote: (symbol: string, exchangeSuffix?: string) => Promise<QuoteResult>;
  yahooPriceHistory: (symbol: string, exchangeSuffix?: string) => Promise<PriceHistory>;
  indianApiFunds: (symbol: string) => Promise<Record<string, unknown>>;
  getPersistedStockResearch: (symbol: string) => Promise<unknown>;
  computeVolatility: (prices: number[]) => number;
  buildTechnicalMetrics: (symbol: string, price: number, priceHistory: PriceHistory) => any;
}

function n(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const p = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(p) ? p : undefined;
}

export async function registerIntelligenceCoreRoutes(server: FastifyInstance, deps: IntelligenceCoreRouteDeps) {
  server.get('/api/intelligence/financial', async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? '').toUpperCase().trim();
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
      const marketCapCr = Math.round((((yahoo.marketCap ?? 0) as number) / 1e7) * 100) / 100;

      const metrics: FinancialMetrics = {
        roe: n(fundData.roe ?? fundData.return_on_equity) ?? undefined,
        netMargin: n(fundData.net_margin ?? fundData.net_profit_margin) ?? undefined,
        operatingMargin: n(fundData.operating_margin ?? fundData.ebitda_margin) ?? undefined,
        revenueGrowth: n(fundData.revenue_growth_3y ?? fundData.revenue_growth) ?? undefined,
        epsGrowth: n(fundData.eps_growth_3y ?? fundData.eps_growth) ?? undefined,
        debtToEquity: n(fundData.debt_to_equity) ?? undefined,
        interestCoverage: n(fundData.interest_coverage) ?? undefined,
        marketCap: marketCapCr,
        currentRatio: n(fundData.current_ratio) ?? undefined,
        lastUpdated: new Date(),
        fiscalYear: new Date().getFullYear(),
      };

      const result = await financialEngine.analyze(metrics);

      reply.header('Cache-Control', 'public, s-maxage=300');
      return {
        symbol,
        engine: 'financial',
        score: result.overall,
        confidence: result.confidence,
        direction: result.overall >= 60 ? 'strong' : result.overall >= 40 ? 'moderate' : 'weak',
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  server.get('/api/intelligence/technical', async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? '').toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: 'symbol required' });
    const { cleanSymbol, exchangeSuffix } = deps.parseSymbol(symbol);

    try {
      const [yahoo, priceHistory] = await Promise.all([
        deps.yahooQuote(cleanSymbol, exchangeSuffix),
        deps.yahooPriceHistory(cleanSymbol, exchangeSuffix),
      ]);

      const price = yahoo?.price ?? 0;
      if (!price) {
        return reply.status(502).send({ error: 'Unable to fetch price data', symbol });
      }

      const metrics = deps.buildTechnicalMetrics(symbol, price, priceHistory);
      const result = technicalEngine.analyze(metrics);

      reply.header('Cache-Control', 'public, s-maxage=300');
      return {
        symbol,
        engine: 'technical',
        score: result.overall,
        confidence: result.confidence,
        direction: result.direction,
        trend: result.trend,
        momentumStatus: result.momentumStatus,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  server.get('/api/intelligence/risk', async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? '').toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: 'symbol required' });
    const { cleanSymbol, exchangeSuffix } = deps.parseSymbol(symbol);

    try {
      const [yahoo, fund, priceHistory] = await Promise.all([
        deps.yahooQuote(cleanSymbol, exchangeSuffix).catch(() => null),
        deps.indianApiFunds(cleanSymbol).catch(() => null),
        deps.yahooPriceHistory(cleanSymbol, exchangeSuffix).catch(() => null as any),
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
      const dailyFrame = (priceHistory || {})['1M'] || (priceHistory || {})['3M'] || [];
      const dailyPrices = dailyFrame.map((p: { price: number }) => p.price).filter((p: number) => p > 0);
      const volatility = dailyPrices.length >= 5 ? deps.computeVolatility(dailyPrices) : undefined;

      const yearFrame = (priceHistory || {})['1Y'] || [];
      const yearPrices = yearFrame.map((p: { price: number }) => p.price).filter((p: number) => p > 0);
      let weeklyRange: number | undefined;
      if (yearPrices.length > 1 && price > 0) {
        const yearLow = Math.min(...yearPrices);
        if (yearLow > 0) {
          weeklyRange = Number((((price - yearLow) / yearLow) * 100).toFixed(1));
        }
      }

      const metrics: RiskMetrics = {
        volatility,
        beta: undefined,
        maxDrawdown: undefined,
        weeklyRange,
        debtToEquity: n(fundData.debt_to_equity) ?? undefined,
        currentRatio: n(fundData.current_ratio) ?? undefined,
        interestCoverage: n(fundData.interest_coverage) ?? undefined,
        cashReserves: undefined,
        customerConcentration: undefined,
        revenuePredictability: undefined,
        competitiveMoat: undefined,
        executionRisk: undefined,
        profitabilityAtMinus20Revenue: undefined,
        sharpeRatio: undefined,
        valueAtRisk: undefined,
        regulatoryRisk: undefined,
        litigationRisk: undefined,
        obsolescenceRisk: undefined,
        disruptionRisk: undefined,
        lastUpdated: new Date(),
        symbol,
      };

      const result = riskEngine.analyze(metrics);

      reply.header('Cache-Control', 'public, s-maxage=300');
      return {
        symbol,
        engine: 'risk',
        score: result.overall,
        riskProfile: result.riskProfile,
        confidence: result.confidence,
        volatility,
        debtToEquity: metrics.debtToEquity,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  server.get('/api/intelligence/rag', async (request, reply) => {
    const { symbol } = request.query as { symbol?: string };
    if (!symbol || typeof symbol !== 'string' || !/^[A-Z0-9&.-]{1,20}$/i.test(symbol.trim())) {
      return reply.status(400).send({ error: 'Valid ?symbol query parameter is required' });
    }
    const cleanSymbol = symbol.trim().toUpperCase();

    try {
      const synData = (await deps.getPersistedStockResearch(cleanSymbol).catch(() => null) || {}) as any;

      const metrics: RAGMetrics = {
        patterns: Array.isArray(synData.patterns) ? synData.patterns : [],
        knowledgeItems: Array.isArray(synData.knowledgeItems) ? synData.knowledgeItems : [],
        macroSignals: Array.isArray(synData.macroSignals) ? synData.macroSignals : [],
        sectorPhase: synData.sectorPhase ?? undefined,
        institutionalCoverage: n(synData.institutionalCoverage) ?? undefined,
        learningCount: n(synData.learningCount) ?? undefined,
        symbol: cleanSymbol,
        lastUpdated: new Date(),
      };

      const result = await ragEngine.analyze(metrics);

      reply.header('Cache-Control', 'public, s-maxage=600');
      return {
        symbol: cleanSymbol,
        engine: 'rag',
        score: result.overall,
        patternMatchScore: result.patternMatchScore,
        knowledgeCoverageScore: result.knowledgeCoverageScore,
        outcomeQualityScore: result.outcomeQualityScore,
        macroContextScore: result.macroContextScore,
        patternMatchCount: result.patternMatchCount,
        bestPattern: result.bestPattern,
        knowledgeConfidence: result.knowledgeConfidence,
        macroEnvironment: result.macroEnvironment,
        confidence: result.confidence,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });
}
