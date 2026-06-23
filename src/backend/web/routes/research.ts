import type { FastifyPluginAsync } from "fastify";
import { query } from "../../../db/index";
import { MarketDataGateway } from "../../../services/data/MarketDataGateway";
import { buildCompanyResearch } from "../../../research/engine/companyResearchEngine";
import { runScanner, SCANNER_PRESETS, type ScannerPreset } from "../../../research/scanner/scannerEngine";
import { compareCompanies, type CompareInput } from "../../../research/compare/compareEngine";
import { trackThesis } from "../../../research/watchlist/watchlistEngine";
import { monitorPortfolio } from "../../../research/portfolio/portfolioEngine";
import { generateAlerts } from "../../../research/alerts/alertsEngine";
import type { NormalizedFundamentals, NormalizedCandle } from "../../../research/normalization/types";
import type { ThesisStatus, RiskLevel } from "../../../research/contracts/productContracts";
import type {
  CompanyProfileView, CompanyQuoteView, CompanyFundamentalsView,
  CompanyFactorScoresView, CompanyThesisView, CompanyRiskView,
  CompanyHistoryView, InvestReviewContextView,
} from "../../../research/contracts/productContracts";
import { healthometerEngine } from "../../../stockstory/healthometer/HealthometerEngine";
import { buildHealthometerInput } from "../../../stockstory/healthometer/inputBuilder";
import { algorithmicAnalysisEngine } from "../../../stockstory/analysis/AlgorithmicAnalysisEngine";
import { evaluatePredictionV2 } from "../../../stockstory/prediction/engine/PredictionEngineV2";
import { reconcileQuoteWithHistory } from "../../services/market/MarketQuoteReconciler";
import { isIndianTradingSessionDate } from "../../../shared/market/IndianTradingCalendar";

function normaliseSymbol(raw: string): string {
  return raw.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
}

function parseFinite(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function productSafeJson(data: unknown): string {
  return JSON.stringify(data, (key, value) => {
    if (typeof value === "number" && !Number.isFinite(value)) return null;
    return value;
  });
}

function productSafeParse<T>(data: string): T {
  return JSON.parse(data) as T;
}

export const researchRoutes: FastifyPluginAsync = async (app) => {
  // ── Existing: fundamentals-coverage ──────────────────────────────────
  app.get("/api/research/fundamentals-coverage", async (req, reply) => {
    try {
      const allSymbolsRes = await query(`SELECT symbol FROM symbols ORDER BY symbol`);
      const allSymbols: string[] = (allSymbolsRes.rows || []).map((r: any) => r.symbol);

      const fsSymbolsRes = await query(
        `SELECT DISTINCT symbol FROM financial_snapshots WHERE source_label IS NOT NULL ORDER BY symbol`
      );
      const fsSymbols = new Set((fsSymbolsRes.rows || []).map((r: any) => r.symbol));

      const covered = allSymbols.filter((s) => fsSymbols.has(s));
      const missing = allSymbols.filter((s) => !fsSymbols.has(s));

      const latestPerSymbol = await query(
        `SELECT symbol, MAX(snapshot_date) as latest_date, MAX(ingestion_timestamp) as latest_ingestion
         FROM financial_snapshots WHERE source_label IS NOT NULL GROUP BY symbol ORDER BY symbol`
      );

      return reply.send({
        total: allSymbols.length,
        covered: covered.length,
        missing: missing.length,
        coveredSymbols: covered,
        missingSymbols: missing,
        latestSnapshots: (latestPerSymbol.rows || []).reduce((acc: any, r: any) => {
          acc[r.symbol] = { latestDate: r.latest_date, latestIngestion: r.latest_ingestion };
          return acc;
        }, {}),
      });
    } catch (err: any) {
      return reply.send({ total: 0, covered: 0, missing: 0, coveredSymbols: [], missingSymbols: [], error: err.message });
    }
  });

  // ── Existing: lineage ────────────────────────────────────────────────
  app.get("/api/research/lineage/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol || typeof symbol !== "string") {
      return reply.status(400).send({ error: "A valid symbol is required.", code: "INVALID_SYMBOL" });
    }

    const sym = normaliseSymbol(symbol);

    try {
      const lineageRes = await query(
        `SELECT metric, source_table, source_field, source_name, source_url,
                as_of, retrieved_at, freshness_days, availability,
                is_fallback, is_synthetic, rejection_reason
         FROM prediction_input_lineage
         WHERE symbol = $1
         ORDER BY metric`,
        [sym]
      );
      const lineageRows: any[] = lineageRes.rows || [];

      const fsRes = await query(
        `SELECT source_label, source_url, ingestion_timestamp, snapshot_date
         FROM financial_snapshots
         WHERE symbol = $1 AND source_label IS NOT NULL
         ORDER BY snapshot_date DESC LIMIT 1`,
        [sym]
      );
      const fsRows: any[] = fsRes.rows || [];

      const dpRes = await query(
        `SELECT COUNT(*) as cnt, MAX(trade_date) as latest_date
         FROM daily_prices WHERE symbol = $1`,
        [sym]
      );
      const dpRow = dpRes.rows?.[0] || null;

      if (lineageRows.length === 0 && fsRows.length === 0) {
        return reply.send({
          symbol: sym, entries: [], modelRun: null, completeness: null,
          entryCount: 0, featureLineageCount: 0, factorLineageCount: 0,
          fundamentalsLineageCount: 0, priceCoverage: null,
          message: `No lineage records found for ${sym}.`,
        });
      }

      const entries = lineageRows.map((r: any) => ({
        sourceTable: r.source_table,
        sourceField: r.metric || r.source_field,
        provider: r.source_name,
        asOf: r.as_of,
        retrievedAt: r.retrieved_at,
        isFallback: !!r.is_fallback,
        isSynthetic: false,
        notes: r.availability === "unavailable" ? "Unavailable" : r.rejection_reason || undefined,
      }));

      fsRows.forEach((r: any) => {
        entries.push({
          sourceTable: "financial_snapshots",
          sourceField: r.source_label,
          provider: r.source_label,
          asOf: r.ingestion_timestamp || r.snapshot_date,
          retrievedAt: r.ingestion_timestamp,
          isFallback: false,
          isSynthetic: false,
          notes: undefined,
        });
      });

      const priceCoverage = dpRow ? { rowCount: Number(dpRow.cnt), latestDate: dpRow.latest_date } : null;

      return reply.send({
        symbol: sym, entries, modelRun: null, completeness: null,
        entryCount: entries.length, featureLineageCount: 0, factorLineageCount: 0,
        fundamentalsLineageCount: fsRows.length, priceCoverage,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message, code: "LINEAGE_QUERY_FAILED" });
    }
  });

  // ── Phase 4: Company Research API ──────────────────────────────────
  app.get("/api/research/company/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const sym = normaliseSymbol(symbol);

    if (!sym) {
      return reply.status(400).send({
        code: "INVALID_SYMBOL",
        message: "A valid symbol is required.",
      });
    }

    try {
      const [metaRes, fsRes, dpRes, quote, factorRes, featureRes, prRes] = await Promise.all([
        MarketDataGateway.getCompany(sym).catch(() => null),
        query(
          `SELECT pe_ratio, pb_ratio, ev_ebitda, roe, roce, roa,
                  debt_to_equity, current_ratio, operating_margin,
                  net_margin, gross_margin, revenue_growth, profit_growth,
                  eps_growth, fcf_yield, market_cap, beta
           FROM financial_snapshots
           WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
             AND pe_ratio IS NOT NULL
           ORDER BY snapshot_date DESC LIMIT 1`,
          [sym]
        ).catch(() => ({ rows: [] as Record<string, unknown>[], rowCount: 0 })),
        query(
          `SELECT trade_date, close, high, low, volume
           FROM daily_prices
           WHERE symbol = $1
           ORDER BY trade_date DESC LIMIT 252`,
          [sym]
        ).catch(() => ({ rows: [] as Record<string, unknown>[], rowCount: 0 })),
        MarketDataGateway.getQuote(sym).catch(() => null),
        query(
          `SELECT quality_factor, value_factor, growth_factor,
                  momentum_factor, risk_factor, sector_strength_factor
           FROM factor_snapshots
           WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
           ORDER BY trade_date DESC LIMIT 1`,
          [sym]
        ).catch(() => ({ rows: [] as Record<string, unknown>[], rowCount: 0 })),
        query(
          `SELECT volatility, momentum, rsi, trend_strength
           FROM feature_snapshots
           WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
           ORDER BY trade_date DESC LIMIT 1`,
          [sym]
        ).catch(() => ({ rows: [] as Record<string, unknown>[], rowCount: 0 })),
        query(
          `SELECT ranking_score, classification, confidence_score, confidence_level
           FROM prediction_registry
           WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
             AND ranking_score IS NOT NULL
           ORDER BY prediction_date DESC LIMIT 1`,
          [sym]
        ).catch(() => ({ rows: [] as Record<string, unknown>[], rowCount: 0 })),
      ]);

      const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
      const dpRows = (dpRes.rows || []) as Record<string, unknown>[];
      const factorRow = (factorRes.rows?.[0] || null) as Record<string, unknown> | null;
      const featureRow = (featureRes.rows?.[0] || null) as Record<string, unknown> | null;
      const prRow = (prRes.rows?.[0] || null) as Record<string, unknown> | null;

      const fundamentals: NormalizedFundamentals | null = fsRow ? {
        symbol: sym,
        peRatio: parseFinite(fsRow.pe_ratio),
        pbRatio: parseFinite(fsRow.pb_ratio),
        evEbitda: parseFinite(fsRow.ev_ebitda),
        dividendYield: null,
        eps: null,
        bookValue: null,
        roe: parseFinite(fsRow.roe),
        roa: parseFinite(fsRow.roa),
        roic: parseFinite(fsRow.roce),
        debtToEquity: parseFinite(fsRow.debt_to_equity),
        currentRatio: parseFinite(fsRow.current_ratio),
        grossMargin: parseFinite(fsRow.gross_margin),
        operatingMargin: parseFinite(fsRow.operating_margin),
        netMargin: parseFinite(fsRow.net_margin),
        revenueGrowth: parseFinite(fsRow.revenue_growth),
        profitGrowth: parseFinite(fsRow.profit_growth),
        epsGrowth: parseFinite(fsRow.eps_growth),
        sales: null,
        netProfit: null,
        operatingProfit: null,
        totalAssets: null,
        totalDebt: null,
        equity: null,
        cashFlow: null,
        freeCashFlow: null,
        timestamp: "",
        sourceSuccess: true,
      } : null;

      const candles: NormalizedCandle[] = dpRows.map((r) => ({
        date: String(r.trade_date),
        close: parseFinite(r.close) ?? 0,
        high: parseFinite(r.high),
        low: parseFinite(r.low),
        open: null,
        volume: parseFinite(r.volume),
      })).filter((c) => c.close > 0 && isIndianTradingSessionDate(c.date)).reverse();

      const companyName = (metaRes && typeof metaRes === "object" && "companyName" in metaRes)
        ? String((metaRes as any).companyName) : sym;
      const sector = (metaRes && typeof metaRes === "object" && "sector" in metaRes)
        ? String((metaRes as any).sector) : null;
      const industry = (metaRes && typeof metaRes === "object" && "industry" in metaRes)
        ? String((metaRes as any).industry) : null;
      const beta = parseFinite(fsRow?.beta) ?? null;

      const canonicalQuote = reconcileQuoteWithHistory(sym, quote as any, dpRows);
      const quoteData = canonicalQuote ? {
        lastPrice: parseFinite(canonicalQuote.price),
        change: parseFinite(canonicalQuote.change),
        changePercent: parseFinite(canonicalQuote.changePercent),
        open: parseFinite((quote as any).open),
        high: parseFinite((quote as any).high),
        low: parseFinite((quote as any).low),
        close: parseFinite(canonicalQuote.price),
        volume: parseFinite(canonicalQuote.volume),
        marketCap: fundamentals?.peRatio !== null && fundamentals?.sales !== null
          ? parseFinite(fsRow?.market_cap) : null,
        week52High: null,
        week52Low: null,
      } : null;

      // ── Healthometer v2 Engine ─────────────────────────────────────
      const healthInput = {
        symbol: sym,
        financials: {
          peRatio: parseFinite(fsRow?.pe_ratio),
          pbRatio: parseFinite(fsRow?.pb_ratio),
          evEbitda: parseFinite(fsRow?.ev_ebitda),
          roe: parseFinite(fsRow?.roe),
          roce: parseFinite(fsRow?.roic),
          roa: parseFinite(fsRow?.roa),
          debtToEquity: parseFinite(fsRow?.debt_to_equity),
          currentRatio: parseFinite(fsRow?.current_ratio),
          operatingMargin: parseFinite(fsRow?.operating_margin),
          netMargin: parseFinite(fsRow?.net_margin),
          grossMargin: parseFinite(fsRow?.gross_margin),
          revenueGrowth: parseFinite(fsRow?.revenue_growth),
          profitGrowth: parseFinite(fsRow?.profit_growth),
          epsGrowth: parseFinite(fsRow?.eps_growth),
          fcfYield: parseFinite(fsRow?.fcf_yield),
          marketCap: parseFinite(fsRow?.market_cap),
          beta: parseFinite(fsRow?.beta),
        },
        factors: {
          qualityFactor: parseFinite(factorRow?.quality_factor),
          valueFactor: parseFinite(factorRow?.value_factor),
          growthFactor: parseFinite(factorRow?.growth_factor),
          momentumFactor: parseFinite(factorRow?.momentum_factor),
          riskFactor: parseFinite(factorRow?.risk_factor),
          sectorStrengthFactor: parseFinite(factorRow?.sector_strength_factor),
        },
        features: {
          volatility: parseFinite(featureRow?.volatility),
          momentum: parseFinite(featureRow?.momentum),
          rsi: parseFinite(featureRow?.rsi),
          trendStrength: parseFinite(featureRow?.trend_strength),
        },
        predictionRegistry: {
          rankingScore: parseFinite(prRow?.ranking_score),
          classification: prRow?.classification ? String(prRow.classification) : null,
          confidenceScore: parseFinite(prRow?.confidence_score),
          confidenceLevel: prRow?.confidence_level ? String(prRow.confidence_level) : null,
        },
      };

      const healthScore = healthometerEngine.evaluate(healthInput);
      const analysis = algorithmicAnalysisEngine.evaluate(healthScore);

      // ── Build response (CompanyResearchOutput shape) ──────────────
      const profile: CompanyProfileView = {
        symbol: sym, companyName, sector, industry,
        description: null, website: null, listingDate: null, faceValue: null, isin: null,
      };

      const quoteView: CompanyQuoteView = quoteData ? {
        symbol: sym, ...quoteData, dayRange: null,
      } : {
        symbol: sym, lastPrice: null, change: null, changePercent: null,
        open: null, high: null, low: null, close: null, volume: null,
        marketCap: null, dayRange: null, week52High: null, week52Low: null,
      };

      const fundamentalsView: CompanyFundamentalsView = fundamentals ? {
        symbol: sym, peRatio: fundamentals.peRatio, pbRatio: fundamentals.pbRatio,
        evEbitda: fundamentals.evEbitda, dividendYield: fundamentals.dividendYield,
        eps: fundamentals.eps, bookValue: fundamentals.bookValue,
        roe: fundamentals.roe, roa: fundamentals.roa, roic: fundamentals.roic,
        debtToEquity: fundamentals.debtToEquity, currentRatio: fundamentals.currentRatio,
        grossMargin: fundamentals.grossMargin, operatingMargin: fundamentals.operatingMargin,
        netMargin: fundamentals.netMargin, revenueGrowth: fundamentals.revenueGrowth,
        profitGrowth: fundamentals.profitGrowth, epsGrowth: fundamentals.epsGrowth,
        sales: fundamentals.sales, netProfit: fundamentals.netProfit,
        operatingProfit: fundamentals.operatingProfit, totalAssets: fundamentals.totalAssets,
        totalDebt: fundamentals.totalDebt, equity: fundamentals.equity,
        cashFlow: fundamentals.cashFlow, freeCashFlow: fundamentals.freeCashFlow,
      } : {
        symbol: sym, peRatio: null, pbRatio: null, evEbitda: null, dividendYield: null,
        eps: null, bookValue: null, roe: null, roa: null, roic: null, debtToEquity: null,
        currentRatio: null, grossMargin: null, operatingMargin: null, netMargin: null,
        revenueGrowth: null, profitGrowth: null, epsGrowth: null, sales: null,
        netProfit: null, operatingProfit: null, totalAssets: null, totalDebt: null,
        equity: null, cashFlow: null, freeCashFlow: null,
      };

      const getDimScore = (id: string): number | null =>
        healthScore.dimensions.find((d) => d.id === id)?.score ?? null;

      const getDimExplanation = (id: string, label: string): string | null => {
        const s = getDimScore(id);
        return s !== null ? `${label} score of ${s}` : null;
      };

      const qScore = getDimScore('quality');
      const vScore = getDimScore('valuation');
      const gScore = getDimScore('growth');
      const rScore = getDimScore('risk');
      const mScore = getDimScore('momentum');
      const sScore = getDimScore('stability');

      const factorScores: CompanyFactorScoresView = {
        symbol: sym,
        qualityScore: qScore,
        valuationScore: vScore,
        growthScore: gScore,
        riskScore: rScore,
        momentumScore: mScore,
        stabilityScore: sScore,
        convictionScore: healthScore.overallScore,
        qualityExplanation: getDimExplanation('quality', 'Quality'),
        valuationExplanation: getDimExplanation('valuation', 'Valuation'),
        growthExplanation: getDimExplanation('growth', 'Growth'),
        riskExplanation: getDimExplanation('risk', 'Risk'),
        momentumExplanation: getDimExplanation('momentum', 'Momentum'),
        stabilityExplanation: getDimExplanation('stability', 'Stability'),
      };

      const strengths = analysis.narrative.strengths;
      const risks = analysis.narrative.risks;
      const thesisStatus: ThesisStatus = healthScore.overallScore !== null
        ? healthScore.overallScore >= 65 ? 'Strengthening'
          : healthScore.overallScore >= 40 ? 'Stable'
          : 'Weakening'
        : 'Research signals pending';

      const thesis: CompanyThesisView = {
        symbol: sym, status: thesisStatus,
        thesis: strengths.length > 0
          ? `Research case centered on ${strengths[0].toLowerCase()}.`
          : null,
        bullCase: analysis.bullCase,
        bearCase: analysis.bearCase,
        topStrengths: strengths,
        topRisks: risks,
        whatWouldChange: risks.length > 0
          ? ['Reduction in identified risk areas would improve the outlook.']
          : ['Monitor quarterly results for sustained performance.'],
        priorStatus: null,
      };

      const riskFlags: string[] = [];
      if (parseFinite(fsRow?.debt_to_equity) !== null && (parseFinite(fsRow?.debt_to_equity) ?? 0) > 2) {
        riskFlags.push('High leverage');
      }
      if (beta !== null && beta > 1.5) riskFlags.push('High volatility');
      if (rScore !== null && rScore < 40) riskFlags.push('Elevated risk indicators');

      const riskView: CompanyRiskView = {
        symbol: sym,
        overallRisk: riskFlags.length >= 2 ? 'High' : riskFlags.length === 1 ? 'Moderate' : healthScore.overallScore !== null ? 'Low' : 'Insufficient data',
        leverageRisk: parseFinite(fsRow?.debt_to_equity) !== null ? `Debt/Equity: ${parseFinite(fsRow?.debt_to_equity)?.toFixed(2)}` : null,
        volatilityRisk: beta !== null ? `Beta: ${beta.toFixed(2)}` : null,
        liquidityRisk: parseFinite(fsRow?.current_ratio) !== null ? `Current ratio: ${parseFinite(fsRow?.current_ratio)?.toFixed(2)}` : null,
        earningsRisk: parseFinite(fsRow?.net_profit) !== null ? (parseFinite(fsRow?.net_profit) ?? 0) > 0 ? 'Positive earnings' : 'Negative earnings' : null,
        sectorRisk: null,
        keyRiskFlags: riskFlags,
      };

      const history: CompanyHistoryView = candles.length > 0 ? {
        symbol: sym,
        priceHistory: candles.map((c) => ({ date: c.date, close: c.close, high: c.high, low: c.low, volume: c.volume })),
        earliestDate: candles.reduce((e, c) => c.date < e ? c.date : e, candles[0]?.date ?? null),
        latestDate: candles.reduce((l, c) => c.date > l ? c.date : l, candles[0]?.date ?? null),
        dataPoints: candles.length,
      } : { symbol: sym, priceHistory: [], earliestDate: null, latestDate: null, dataPoints: 0 };

      const investContext: InvestReviewContextView = {
        symbol: sym, companyName,
        conviction: healthScore.label,
        score: healthScore.overallScore,
        thesis: analysis.narrative.overall,
        keyRisks: risks,
        keyStrengths: strengths,
        whatToWatch: risks.length > 0
          ? ['Monitor identified risk areas in upcoming results.']
          : ['Monitor quarterly results for sustained performance.'],
        missingCriticalData: healthScore.overallScore === null ? ['Insufficient data for full research case'] : [],
      };

      let predictionV2: Record<string, unknown> | null = null;
      try {
        const fund = fundamentalsView;
        const pct = (v: number | null | undefined) => v !== null && v !== undefined ? v * 100 : null;
        const v2Input: Record<string, number | null | undefined> = {
          pe_ratio: fund?.peRatio ?? parseFinite(fsRow?.pe_ratio),
          pb_ratio: fund?.pbRatio ?? parseFinite(fsRow?.pb_ratio),
          return_on_equity: pct(fund?.roe ?? parseFinite(fsRow?.roe)),
          return_on_assets: pct(fund?.roa ?? null),
          debt_to_equity: fund?.debtToEquity ?? parseFinite(fsRow?.debt_to_equity),
          revenue_growth_1y: pct(fund?.revenueGrowth ?? parseFinite(fsRow?.revenue_growth)),
          eps_growth_1y: pct(fund?.epsGrowth ?? parseFinite(fsRow?.eps_growth)),
          operating_margin: pct(fund?.operatingMargin ?? parseFinite(fsRow?.operating_margin)),
          net_margin: pct(fund?.netMargin ?? parseFinite(fsRow?.net_margin)),
          gross_margin: pct(fund?.grossMargin ?? parseFinite(fsRow?.gross_margin)),
          return_1d: null, return_5d: null, return_1m: null, return_3m: null, return_6m: null, return_1y: null,
          ma_20d_position: null, ma_50d_position: null, ma_200d_position: null,
          distance_from_52w_high: null, distance_from_52w_low: null,
          price: parseFinite(quoteView?.lastPrice),
          market_cap: parseFinite(quoteView?.marketCap) ?? parseFinite(fsRow?.market_cap),
          volume: parseFinite(quoteView?.volume),
          beta_proxy: parseFinite(fsRow?.beta),
          current_ratio: parseFinite(fsRow?.current_ratio),
        };
        const v2Result = await evaluatePredictionV2({
          symbol: sym, sector: profile?.sector ?? null,
          financials: v2Input, prices: {}, metrics: {}, fundamentals: {},
        });
        predictionV2 = {
          score: v2Result.score,
          researchState: v2Result.researchState,
          confidence: v2Result.confidence,
          activeFactorCount: v2Result.activeFactorCount,
          totalFactorCount: v2Result.totalFactorCount,
          factorCoverageRatio: v2Result.factorCoverageRatio,
          dimensionScores: v2Result.dimensionScores,
          topPositiveDrivers: v2Result.topPositiveDrivers,
          topRiskDrivers: v2Result.topRiskDrivers,
          explanation: v2Result.explanation,
          modelVersion: v2Result.modelVersion,
        };
      } catch {
        predictionV2 = null;
      }

      const result = {
        profile, quote: quoteView, fundamentals: fundamentalsView,
        factorScores, thesis, risk: riskView, history, investContext,
        predictionV2,
        dataState: {
          quoteAsOf: canonicalQuote?.asOf ?? null,
          historyAsOf: history.latestDate,
          quoteSource: canonicalQuote?.source ?? null,
          freshness: canonicalQuote?.freshness ?? "unknown",
          delayed: canonicalQuote?.delayed ?? true,
        },
      };

      const safe = productSafeParse<typeof result>(productSafeJson(result));

      return reply.send({ ok: true, data: safe });
    } catch (err: any) {
      req.log.error({ err, symbol: sym }, "company research failed");
      return reply.status(502).send({
        code: "RESEARCH_UNAVAILABLE",
        message: "Research data is temporarily unavailable. Try again later.",
      });
    }
  });

  // ── Phase 5: Scanner/Rankings API ─────────────────────────────────
  app.get("/api/research/scanner", async (req, reply) => {
    const queryParams = req.query as Record<string, string>;
    const preset = (queryParams.preset || "Quality compounders") as ScannerPreset;
    const limit = Math.min(parseInt(queryParams.limit || "50", 10), 200);
    const symbolsParam = queryParams.symbols;

    if (!SCANNER_PRESETS[preset]) {
      return reply.status(400).send({
        code: "INVALID_PRESET",
        message: `Unknown preset: ${preset}. Available: ${Object.keys(SCANNER_PRESETS).join(", ")}`,
      });
    }

    try {
      let targetSymbols: string[] = [];

      if (symbolsParam) {
        targetSymbols = [...new Set(symbolsParam.split(",").map((s: string) => normaliseSymbol(s)).filter(Boolean))];
      } else {
        const topRes = await query(
          `SELECT symbol, MAX(ranking_score) AS ranking_score FROM prediction_registry
           WHERE ranking_score IS NOT NULL
           GROUP BY symbol
           ORDER BY ranking_score DESC LIMIT $1`,
          [limit]
        );
        targetSymbols = [...new Set(((topRes.rows || []) as any[]).map((r: any) => normaliseSymbol(r.symbol)).filter(Boolean))];

        // Fallback: if prediction_registry has no data, use financial_snapshots symbols
        if (targetSymbols.length === 0) {
          const fsRes = await query(
            `SELECT DISTINCT UPPER(REPLACE(symbol, ' ', '')) AS sym FROM financial_snapshots
             WHERE pe_ratio IS NOT NULL AND roe IS NOT NULL
             LIMIT $1`,
            [limit]
          );
          targetSymbols = ((fsRes.rows || []) as any[]).map((r: any) => r.sym).filter(Boolean);
        }
      }

      if (targetSymbols.length === 0) {
        return reply.send({ ok: true, data: [], preset, coverage: { requested: limit, evaluated: 0, returned: 0, complete: false }, message: "No companies currently have enough dated evidence for this scan." });
      }

      const companies = await Promise.all(targetSymbols.slice(0, limit).map(async (sym) => {
        try {
          const [fsRes, metaRes] = await Promise.all([
            query(
              `SELECT pe_ratio, pb_ratio, roe, roa, roce AS roic,
                      debt_to_equity, current_ratio, gross_margin,
                      operating_margin, revenue_growth, profit_growth,
                      eps_growth, beta
               FROM financial_snapshots
               WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
                 AND pe_ratio IS NOT NULL
               ORDER BY snapshot_date DESC LIMIT 1`,
              [sym]
            ),
            MarketDataGateway.getCompany(sym).catch(() => null),
          ]);

          const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
          const companyName = metaRes && typeof metaRes === "object"
            ? String((metaRes as any).companyName || sym) : sym;
          const sector = metaRes && typeof metaRes === "object"
            ? String((metaRes as any).sector || "") : "";

          if (!fsRow) {
            return { symbol: sym, companyName, sector: sector || null,
              scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null } };
          }

          const roe = parseFinite(fsRow.roe);
          const roa = parseFinite(fsRow.roa);
          const de = parseFinite(fsRow.debt_to_equity);
          const cr = parseFinite(fsRow.current_ratio);
          const gm = parseFinite(fsRow.gross_margin);
          const om = parseFinite(fsRow.operating_margin);
          const rg = parseFinite(fsRow.revenue_growth);
          const pg = parseFinite(fsRow.profit_growth);
          const pe = parseFinite(fsRow.pe_ratio);
          const pb = parseFinite(fsRow.pb_ratio);
          const ev = parseFinite(fsRow.ev_ebitda);

          let qualityScore: number | null = null;
          if (roe !== null || gm !== null || om !== null) {
            let scores = 0; let count = 0;
            if (roe !== null) { scores += roe >= 15 ? 75 : roe >= 10 ? 55 : roe >= 0 ? 40 : 15; count++; }
            if (gm !== null) { scores += gm >= 40 ? 75 : gm >= 20 ? 55 : 30; count++; }
            if (om !== null) { scores += om >= 15 ? 75 : om >= 8 ? 55 : 30; count++; }
            if (cr !== null) { scores += cr >= 1.5 ? 70 : cr >= 1 ? 50 : 25; count++; }
            if (de !== null) { scores += de <= 0.5 ? 80 : de <= 1 ? 60 : de <= 2 ? 40 : 20; count++; }
            qualityScore = count > 0 ? Math.round(scores / count) : null;
          }

          let valuationScore: number | null = null;
          if (pe !== null || pb !== null || ev !== null) {
            let scores = 0; let count = 0;
            if (pe !== null && pe > 0) { scores += pe <= 20 ? 75 : pe <= 35 ? 55 : pe <= 50 ? 35 : 20; count++; }
            if (pb !== null && pb > 0) { scores += pb <= 2 ? 75 : pb <= 4 ? 55 : pb <= 7 ? 35 : 20; count++; }
            valuationScore = count > 0 ? Math.round(scores / count) : null;
          }

          let growthScore: number | null = null;
          if (rg !== null || pg !== null) {
            let scores = 0; let count = 0;
            if (rg !== null) { scores += rg >= 15 ? 75 : rg >= 8 ? 55 : rg >= 0 ? 35 : 15; count++; }
            if (pg !== null) { scores += pg >= 15 ? 75 : pg >= 8 ? 55 : pg >= 0 ? 35 : 15; count++; }
            growthScore = count > 0 ? Math.round(scores / count) : null;
          }

          let riskScore: number | null = null;
          if (de !== null) {
            riskScore = de <= 0.5 ? 75 : de <= 1 ? 55 : de <= 2 ? 35 : 15;
          }

          return {
            symbol: sym, companyName, sector: sector || null,
            scores: { quality: qualityScore, valuation: valuationScore, growth: growthScore,
              risk: riskScore, momentum: null, stability: null },
          };
        } catch {
          return { symbol: sym, companyName: sym, sector: null,
            scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null } };
        }
      }));

      const results = runScanner(preset, companies);
      const safe = productSafeParse<typeof results>(productSafeJson(results));

      return reply.send({
        ok: true,
        data: safe,
        preset,
        coverage: {
          requested: limit,
          evaluated: companies.length,
          returned: safe.length,
          complete: safe.length >= Math.min(limit, targetSymbols.length),
        },
        message: safe.length < Math.min(limit, targetSymbols.length)
          ? `Showing ${safe.length} companies with enough evidence from ${companies.length} evaluated.`
          : null,
      });
    } catch (err: any) {
      req.log.error({ err, preset }, "scanner failed");
      return reply.status(502).send({
        code: "SCANNER_UNAVAILABLE",
        message: "Scanner is temporarily unavailable. Try again later.",
      });
    }
  });

  // ── Phase 6: Compare API ──────────────────────────────────────────
  app.post("/api/research/compare", async (req, reply) => {
    const body = req.body as { symbols: string[] } | null;
    if (!body || !body.symbols || !Array.isArray(body.symbols) || body.symbols.length < 2) {
      return reply.status(400).send({
        code: "INVALID_INPUT",
        message: "Provide at least two symbols to compare.",
      });
    }

    const symbols = body.symbols.map((s: string) => normaliseSymbol(s)).filter(Boolean);
    if (symbols.length < 2) {
      return reply.status(400).send({
        code: "INVALID_SYMBOLS",
        message: "Provide at least two valid symbols to compare.",
      });
    }

    try {
      const inputs = await Promise.all(symbols.map(async (sym) => {
        try {
          const [fsRes, metaRes] = await Promise.all([
            query(
              `SELECT pe_ratio, pb_ratio, roe, roa, roce AS roic,
                      debt_to_equity, current_ratio, gross_margin,
                      operating_margin, revenue_growth, profit_growth,
                      eps_growth, beta, sales, net_profit
               FROM financial_snapshots
               WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
               ORDER BY snapshot_date DESC LIMIT 1`,
              [sym]
            ),
            MarketDataGateway.getCompany(sym).catch(() => null),
          ]);

          const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
          const companyName = metaRes && typeof metaRes === "object"
            ? String((metaRes as any).companyName || sym) : sym;

          if (!fsRow) {
            return { symbol: sym, companyName,
              scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null } };
          }

          const roe = parseFinite(fsRow.roe);
          const de = parseFinite(fsRow.debt_to_equity);
          const gm = parseFinite(fsRow.gross_margin);
          const om = parseFinite(fsRow.operating_margin);
          const rg = parseFinite(fsRow.revenue_growth);
          const pg = parseFinite(fsRow.profit_growth);
          const pe = parseFinite(fsRow.pe_ratio);
          const pb = parseFinite(fsRow.pb_ratio);

          let qualityScore: number | null = null;
          if (roe !== null || gm !== null || om !== null) {
            let s = 0; let c = 0;
            if (roe !== null) { s += roe >= 15 ? 75 : roe >= 10 ? 55 : roe >= 0 ? 40 : 15; c++; }
            if (gm !== null) { s += gm >= 40 ? 75 : gm >= 20 ? 55 : 30; c++; }
            qualityScore = c > 0 ? Math.round(s / c) : null;
          }

          let valuationScore: number | null = null;
          if (pe !== null && pe > 0) {
            valuationScore = pe <= 20 ? 75 : pe <= 35 ? 55 : pe <= 50 ? 35 : 20;
          }

          let growthScore: number | null = null;
          if (rg !== null || pg !== null) {
            let s = 0; let c = 0;
            if (rg !== null) { s += rg >= 15 ? 75 : rg >= 8 ? 55 : rg >= 0 ? 35 : 15; c++; }
            if (pg !== null) { s += pg >= 15 ? 75 : pg >= 8 ? 55 : pg >= 0 ? 35 : 15; c++; }
            growthScore = c > 0 ? Math.round(s / c) : null;
          }

          let riskScore: number | null = null;
          if (de !== null) {
            riskScore = de <= 0.5 ? 75 : de <= 1 ? 55 : de <= 2 ? 35 : 15;
          }

          return { symbol: sym, companyName,
            scores: { quality: qualityScore, valuation: valuationScore, growth: growthScore,
              risk: riskScore, momentum: null, stability: null } };
        } catch {
          return { symbol: sym, companyName: sym,
            scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null } };
        }
      }));

      const result = compareCompanies(inputs as CompareInput[]);
      const safe = productSafeParse<typeof result>(productSafeJson(result));

      return reply.send({ ok: true, data: safe });
    } catch (err: any) {
      req.log.error({ err, symbols }, "compare failed");
      return reply.status(502).send({
        code: "COMPARE_UNAVAILABLE",
        message: "Compare is temporarily unavailable. Try again later.",
      });
    }
  });

  // ── Phase 7: Watchlist Thesis Tracking API ────────────────────────
  app.get("/api/research/watchlist/:symbol/thesis", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const sym = normaliseSymbol(symbol);

    if (!sym) {
      return reply.status(400).send({ code: "INVALID_SYMBOL", message: "A valid symbol is required." });
    }

    try {
      const prRes = await query(
        `SELECT ranking_score FROM prediction_registry
         WHERE symbol = $1 AND ranking_score IS NOT NULL
         ORDER BY prediction_date DESC LIMIT 1`,
        [sym]
      );
      const prRow = (prRes.rows?.[0] || null) as { ranking_score: number } | null;
      const currentScore = prRow ? parseFinite(prRow.ranking_score) : null;

      const metaRes = await MarketDataGateway.getCompany(sym).catch(() => null);
      const companyName = metaRes && typeof metaRes === "object"
        ? String((metaRes as any).companyName || sym) : sym;

      const result = trackThesis({
        symbol: sym, companyName,
        currentScore,
        previousScore: null,
        factorChanges: [],
        riskChanges: [],
        lastUpdated: null,
      });

      const safe = productSafeParse<typeof result>(productSafeJson(result));
      return reply.send({ ok: true, data: safe });
    } catch (err: any) {
      req.log.error({ err, symbol: sym }, "watchlist thesis failed");
      return reply.status(502).send({
        code: "THESIS_UNAVAILABLE",
        message: "Thesis data is temporarily unavailable.",
      });
    }
  });

  // ── Phase 8: Portfolio Thesis Monitor API ─────────────────────────
  app.post("/api/research/portfolio", async (req, reply) => {
    const body = req.body as { holdings?: Array<{ symbol: string; companyName?: string }> } | null;
    const holdings = body?.holdings;

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return reply.send({
        ok: true, data: { holdings: [], reviewPriority: [], summary: "Monitor companies after you decide to track an investment thesis." },
      });
    }

    try {
      const enriched = await Promise.all(holdings.slice(0, 20).map(async (h) => {
        const sym = normaliseSymbol(h.symbol);
        if (!sym) return null;

        try {
          const [fsRes, prRes, metaRes] = await Promise.all([
            query(
               `SELECT pe_ratio, pb_ratio, roe, debt_to_equity,
                       gross_margin, revenue_growth, profit_growth
                FROM financial_snapshots
                WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
                  AND pe_ratio IS NOT NULL
                ORDER BY snapshot_date DESC LIMIT 1`, [sym]
            ),
            query(
              `SELECT ranking_score FROM prediction_registry
               WHERE symbol = $1 AND ranking_score IS NOT NULL
               ORDER BY prediction_date DESC LIMIT 1`, [sym]
            ),
            MarketDataGateway.getCompany(sym).catch(() => null),
          ]);

          const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
          const prRow = (prRes.rows?.[0] || null) as { ranking_score: number } | null;
          const companyName = metaRes && typeof metaRes === "object"
            ? String((metaRes as any).companyName || sym) : (h.companyName || sym);
          const score = prRow ? parseFinite(prRow.ranking_score) : null;

          let conviction = "Research signals pending";
          if (score !== null) {
            conviction = score >= 75 ? "High conviction"
              : score >= 55 ? "Moderate conviction"
              : score >= 35 ? "Needs review" : "Track before investing";
          }

          const flags: string[] = [];
          if (fsRow) {
            const de = parseFinite(fsRow.debt_to_equity);
            if (de !== null && de > 2) flags.push("High leverage");
            if (parseFinite(fsRow.profit_growth) !== null && (parseFinite(fsRow.profit_growth) ?? 0) < 0) flags.push("Profit declining");
          }

          return {
            symbol: sym, companyName, currentScore: score,
            thesisStatus: score !== null ? "active" : "pending",
            conviction,
            keyRisks: flags,
            keyStrengths: [],
            whatToWatch: score !== null && score < 55 ? ["Monitor quarterly results"] : [],
          };
        } catch {
          return {
            symbol: sym, companyName: h.companyName || sym,
            currentScore: null, thesisStatus: "pending",
            conviction: "Research signals pending",
            keyRisks: [], keyStrengths: [], whatToWatch: [],
          };
        }
      }));

      const validHoldings = enriched.filter((h): h is NonNullable<typeof h> => h !== null);
      const result = monitorPortfolio(validHoldings);
      const safe = productSafeParse<typeof result>(productSafeJson(result));

      return reply.send({ ok: true, data: safe });
    } catch (err: any) {
      req.log.error({ err }, "portfolio monitor failed");
      return reply.status(502).send({
        code: "PORTFOLIO_UNAVAILABLE",
        message: "Portfolio monitor is temporarily unavailable.",
      });
    }
  });

  // ── Phase 9: Alerts / What Changed API ────────────────────────────
  app.get("/api/research/alerts/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const sym = normaliseSymbol(symbol);

    if (!sym) {
      return reply.status(400).send({ code: "INVALID_SYMBOL", message: "A valid symbol is required." });
    }

    try {
      const prRes = await query(
        `SELECT ranking_score, prediction_date FROM prediction_registry
         WHERE symbol = $1 AND ranking_score IS NOT NULL
         ORDER BY prediction_date DESC LIMIT 2`,
        [sym]
      );
      const prRows = (prRes.rows || []) as Array<{ ranking_score: number; prediction_date: string }>;

      const [quote, metaRes] = await Promise.all([
        MarketDataGateway.getQuote(sym).catch(() => null),
        MarketDataGateway.getCompany(sym).catch(() => null),
      ]);

      const companyName = metaRes && typeof metaRes === "object"
        ? String((metaRes as any).companyName || sym) : sym;

      let scoreChange: number | null = null;
      if (prRows.length >= 2) {
        scoreChange = parseFinite(prRows[0].ranking_score) !== null && parseFinite(prRows[1].ranking_score) !== null
          ? (parseFinite(prRows[0].ranking_score) ?? 0) - (parseFinite(prRows[1].ranking_score) ?? 0) : null;
      }

      const priceChange = quote && typeof quote === "object"
        ? parseFinite((quote as any).changePercent) : null;

      const alerts = generateAlerts({
        symbol: sym,
        previousThesisStatus: null,
        currentThesisStatus: "Tracking begins now",
        previousRiskLevel: null,
        currentRiskLevel: "Insufficient data",
        scoreChange,
        priceChangePercent: priceChange,
        peerBecameMoreAttractive: false,
        hasResultEvent: false,
      });

      const safe = productSafeParse<typeof alerts>(productSafeJson(alerts));
      return reply.send({ ok: true, data: safe, symbol: sym, companyName });
    } catch (err: any) {
      req.log.error({ err, symbol: sym }, "alerts failed");
      return reply.status(502).send({
        code: "ALERTS_UNAVAILABLE",
        message: "Alerts data is temporarily unavailable.",
      });
    }
  });

  // ── Phase 10: Invest Review Context API ───────────────────────────
  app.get("/api/research/invest/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const sym = normaliseSymbol(symbol);

    if (!sym) {
      return reply.status(400).send({ code: "INVALID_SYMBOL", message: "A valid symbol is required." });
    }

    try {
      const [metaRes, fsRes, prRes] = await Promise.all([
        MarketDataGateway.getCompany(sym).catch(() => null),
        query(
            `SELECT pe_ratio, pb_ratio, roe, roa, roce AS roic,
                    debt_to_equity, current_ratio, gross_margin,
                    operating_margin, revenue_growth, profit_growth,
                    eps_growth, beta
             FROM financial_snapshots
             WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
               AND pe_ratio IS NOT NULL
             ORDER BY snapshot_date DESC LIMIT 1`, [sym]
        ),
        query(
          `SELECT ranking_score FROM prediction_registry
           WHERE symbol = $1 AND ranking_score IS NOT NULL
           ORDER BY prediction_date DESC LIMIT 1`, [sym]
        ),
      ]);

      const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
      const prRow = (prRes.rows?.[0] || null) as { ranking_score: number } | null;
      const companyName = metaRes && typeof metaRes === "object"
        ? String((metaRes as any).companyName || sym) : sym;
      const score = prRow ? parseFinite(prRow.ranking_score) : null;

      let conviction = "Research signals pending";
      if (score !== null) {
        conviction = score >= 75 ? "High conviction research case"
          : score >= 55 ? "Moderate conviction"
          : score >= 35 ? "Needs review" : "Track before investing";
      }

      const risks: string[] = [];
      const strengths: string[] = [];
      const watchItems: string[] = [];
      const missingData: string[] = [];

      if (fsRow) {
        const de = parseFinite(fsRow.debt_to_equity);
        const rg = parseFinite(fsRow.revenue_growth);
        const roe = parseFinite(fsRow.roe);

        if (de !== null && de > 2) risks.push("High leverage");
        if (rg !== null && rg < 0) risks.push("Revenue declining");
        if (roe !== null && roe > 15) strengths.push("Strong return on equity");
        if (rg !== null && rg > 10) strengths.push("Strong revenue growth");
      } else {
        missingData.push("Fundamentals");
      }

      if (score === null) missingData.push("Research score");

      if (risks.length === 0 && strengths.length > 0) {
        watchItems.push("Monitor quarterly results for sustained performance.");
      } else if (risks.length > 0) {
        watchItems.push("Monitor identified risk areas in upcoming results.");
      }
      watchItems.push("Review thesis before making investment decisions.");
      watchItems.push("Final order placement is handled through your broker.");

      const result = {
        symbol: sym, companyName, conviction,
        score, thesis: score !== null
          ? `Research case with ${conviction.toLowerCase()}.`
          : "Research signals pending — track this company to review over time.",
        keyRisks: risks, keyStrengths: strengths,
        whatToWatch: watchItems, missingCriticalData: missingData,
      };

      const safe = productSafeParse<typeof result>(productSafeJson(result));
      return reply.send({ ok: true, data: safe });
    } catch (err: any) {
      req.log.error({ err, symbol: sym }, "invest context failed");
      return reply.status(502).send({
        code: "INVEST_CONTEXT_UNAVAILABLE",
        message: "Investment context is temporarily unavailable. Try again later.",
      });
    }
  });
};

export default researchRoutes;
