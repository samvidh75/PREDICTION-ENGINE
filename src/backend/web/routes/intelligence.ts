// src/backend/web/routes/intelligence.ts
// TRACK-P2 Compliance: Rewritten intelligence routes with data integrity enforcement.
// Removes all synthetic claims, silent defaults, and fabricated analysis.
// Imports analytical envelope (realResponse, unavailableResponse, partialResponse, demoResponse, errorResponse).

import type { FastifyPluginAsync } from "fastify";
import { query, pool } from "../../../db/index";
import { CompanyIntelligenceEngine } from "../../../services/CompanyIntelligenceEngine";
import { PortfolioIntelligenceEngine } from "../../../services/PortfolioIntelligenceEngine";
import { NarrativeEngine } from "../../../services/NarrativeEngine";
import { InsightEngine, MarketInsight } from "../../../services/InsightEngine";
import { MarketIntelligenceEngine } from "../../../services/MarketIntelligenceEngine";
import { intelligenceCache } from "../../../services/intelligence/IntelligenceCache";
import { generateSignalFeed } from "../../../intelligence/SignalFeedEngine";

// ── TRACK-P2 Analytical Envelope imports ──────────────────────────────
import {
  AnalyticalResponse,
  DataFreshness,
  DataCompleteness,
  DataLineageEntry,
  buildDataState,
  realResponse,
  unavailableResponse,
  partialResponse,
  demoResponse,
  emptyResponse,
  errorResponse,
} from "../../../shared/data/AnalyticalResponse";

import { assessMarketSnapshotFreshness } from "../../../shared/data/DataFreshness";
import { assessCompleteness } from "../../../shared/data/DataCompleteness";

// ── StockStory scoring engine ────────────────────────────────────────
import { getStockScore } from "../../../stockstory";

const companyIntelligenceEngine = new CompanyIntelligenceEngine();
const portfolioIntelligenceEngine = new PortfolioIntelligenceEngine();
const narrativeEngine = new NarrativeEngine();
const insightEngine = new InsightEngine();
const marketIntelligenceEngine = new MarketIntelligenceEngine();

// ──────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────

/**
 * Build lineage entries from concrete source tables.
 * provider is null when the data source is internal / unknown.
 */
function companyLineage(symbol: string, featureDate: string | null, factorDate: string | null): DataLineageEntry[] {
  const entries: DataLineageEntry[] = [];
  if (featureDate) {
    entries.push({
      sourceTable: "feature_snapshots",
      sourceField: null,
      provider: null,
      asOf: featureDate,
      retrievedAt: new Date().toISOString(),
      isFallback: false,
      isSynthetic: false,
    });
  }
  if (factorDate) {
    entries.push({
      sourceTable: "factor_snapshots",
      sourceField: null,
      provider: null,
      asOf: factorDate,
      retrievedAt: new Date().toISOString(),
      isFallback: false,
      isSynthetic: false,
    });
  }
  return entries;
}

function marketLineage(featureDate: string | null, factorDate: string | null): DataLineageEntry[] {
  const entries: DataLineageEntry[] = [];
  if (featureDate) {
    entries.push({
      sourceTable: "feature_snapshots",
      sourceField: null,
      provider: null,
      asOf: featureDate,
      retrievedAt: new Date().toISOString(),
      isFallback: false,
      isSynthetic: false,
    });
  }
  if (factorDate) {
    entries.push({
      sourceTable: "factor_snapshots",
      sourceField: null,
      provider: null,
      asOf: factorDate,
      retrievedAt: new Date().toISOString(),
      isFallback: false,
      isSynthetic: false,
    });
  }
  return entries;
}

function portfolioLineage(): DataLineageEntry[] {
  return [
    {
      sourceTable: "symbols",
      sourceField: null,
      provider: null,
      retrievedAt: new Date().toISOString(),
      isFallback: false,
      isSynthetic: false,
    },
    {
      sourceTable: "factor_snapshots",
      sourceField: null,
      provider: null,
      retrievedAt: new Date().toISOString(),
      isFallback: false,
      isSynthetic: false,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────
// PLUGIN
// ──────────────────────────────────────────────────────────────────────

export const intelligenceRoutes: FastifyPluginAsync = async (app) => {
  // ──────────────────────────────────────────────────────────────────
  // COMPANY INTELLIGENCE – GET /api/intelligence/company/:symbol
  // TRACK-P2: No synthetic fallback. Real/Partial/Unavailable envelope.
  // ──────────────────────────────────────────────────────────────────
  app.get<{ Params: { symbol: string } }>(
    "/api/intelligence/company/:symbol",
    async (request, reply) => {
      const { symbol } = request.params;
      const upperSymbol = symbol.toUpperCase();

      try {
        // ── Check cache first (real path) ──────────────────────────
        const cacheKeyReal = `intelligence:company:real:${upperSymbol}`;
        const cachedReal = intelligenceCache.get(cacheKeyReal);
        if (cachedReal) {
          return reply.send(cachedReal);
        }

        // ── Fetch required inputs ──────────────────────────────────
        const [[featureRow], [factorRow]] = await Promise.all([
          (async () => {
            const res = await query(
              `SELECT * FROM feature_snapshots
               WHERE symbol = $1
               ORDER BY trade_date DESC LIMIT 1`,
              [upperSymbol]
            );
            return res.rows;
          })(),
          (async () => {
            const res = await query(
              `SELECT * FROM factor_snapshots
               WHERE symbol = $1
               ORDER BY trade_date DESC LIMIT 1`,
              [upperSymbol]
            );
            return res.rows;
          })(),
        ]);

        const hasFeature = !!featureRow;
        const hasFactor = !!factorRow;

        const featureDate: string | null = hasFeature
          ? (featureRow.trade_date instanceof Date
              ? featureRow.trade_date.toISOString().split("T")[0]
              : String(featureRow.trade_date).split("T")[0])
          : null;
        const factorDate: string | null = hasFactor
          ? (factorRow.trade_date instanceof Date
              ? factorRow.trade_date.toISOString().split("T")[0]
              : String(factorRow.trade_date).split("T")[0])
          : null;

        // ── Both missing → Unavailable ─────────────────────────────
        if (!hasFeature && !hasFactor) {
          const resp = unavailableResponse(
            "FEATURE_OR_FACTOR_SNAPSHOT_MISSING",
            "Company intelligence is unavailable because required market snapshots have not been generated.",
            { symbol: upperSymbol, feature_snapshots: false, factor_snapshots: false }
          );
          intelligenceCache.set(`intelligence:company:unavailable:${upperSymbol}`, resp);
          return reply.send(resp);
        }

        // ── One missing → Partial ──────────────────────────────────
        if (!hasFeature || !hasFactor) {
          const reason = !hasFeature ? "FEATURE_SNAPSHOT_MISSING" : "FACTOR_SNAPSHOT_MISSING";
          const availableSections: string[] = [];
          const unavailableSections: string[] = [];
          if (hasFeature) availableSections.push("feature_analysis");
          else unavailableSections.push("feature_analysis");
          if (hasFactor) availableSections.push("factor_analysis");
          else unavailableSections.push("factor_analysis");

          // Try to build what we can
          const partialData: Record<string, unknown> = { symbol: upperSymbol };
          const lineage = companyLineage(upperSymbol, featureDate, factorDate);
          const freshness = assessMarketSnapshotFreshness(
            (featureDate || factorDate) ?? undefined
          );
          const requiredFields = ["feature_snapshots", "factor_snapshots"];
          const availableFields: string[] = [];
          const missingInputs: string[] = [];
          if (hasFeature) availableFields.push("feature_snapshots");
          else missingInputs.push("feature_snapshots");
          if (hasFactor) availableFields.push("factor_snapshots");
          else missingInputs.push("factor_snapshots");
          const completeness = assessCompleteness(requiredFields, availableFields);

          if (hasFeature && featureRow) {
            partialData.featureSnapshot = featureRow;
          }
          if (hasFactor && factorRow) {
            partialData.factorSnapshot = factorRow;
            partialData.factorScore = factorRow.factor_score;
          }

          const resp = partialResponse(
            reason,
            `Company intelligence is partially available. Missing: ${unavailableSections.join(", ")}.`,
            partialData,
            missingInputs,
            completeness.score,
            lineage,
            (featureDate || factorDate) ?? undefined
          );
          // Attach available/unavailable sections for consumer clarity
          (resp as any).availableSections = availableSections;
          (resp as any).unavailableSections = unavailableSections;
          intelligenceCache.set(`intelligence:company:partial:${upperSymbol}`, resp);
          return reply.send(resp);
        }

        // ── Both present → Real analytical response ────────────────
        const featureSnapshot = featureRow;
        const factorSnapshot = factorRow;

        // Build the real analysis using existing engines
        const insights: MarketInsight = insightEngine.generateInsight(
          upperSymbol,
          featureSnapshot,
          factorSnapshot
        );

        // Remove synthetic claims from insights - compute realistic values
        const realCoverage = `Feature snapshot from ${featureDate}, Factor snapshot from ${factorDate}`;
        const realFreshness = `Data as of ${factorDate || featureDate}`;
        const realDataQuality = `Source: feature_snapshots, factor_snapshots (internal pipeline)`;

        // Override the hardcoded claims from InsightEngine
        (insights as any).coverage = realCoverage;
        (insights as any).freshness = realFreshness;
        (insights as any).dataQuality = realDataQuality;

        // Narrative - if completeness low, prepend limitations
        const narrative = narrativeEngine.generateNarrative(
          upperSymbol,
          featureSnapshot,
          factorSnapshot,
          { title: insights.title, summary: insights.summary }
        );

        // Build completeness assessment
        const requiredFields = [
          "rsi", "macd", "adx", "atr", "momentum", "volatility",
          "moving_average_distance", "trend_strength",
          "quality_factor", "value_factor", "growth_factor",
          "momentum_factor", "risk_factor", "sector_strength_factor"
        ];
        const availableFields: string[] = [];
        const neutralizedFields: string[] = [];
        const fieldMap: Record<string, any> = {
          rsi: featureSnapshot.rsi,
          macd: featureSnapshot.macd,
          adx: featureSnapshot.adx,
          atr: featureSnapshot.atr,
          momentum: featureSnapshot.momentum,
          volatility: featureSnapshot.volatility,
          moving_average_distance: featureSnapshot.moving_average_distance,
          trend_strength: featureSnapshot.trend_strength,
          quality_factor: factorSnapshot.quality_factor,
          value_factor: factorSnapshot.value_factor,
          growth_factor: factorSnapshot.growth_factor,
          momentum_factor: factorSnapshot.momentum_factor,
          risk_factor: factorSnapshot.risk_factor,
          sector_strength_factor: factorSnapshot.sector_strength_factor,
        };
        for (const [key, val] of Object.entries(fieldMap)) {
          if (val !== null && val !== undefined) {
            availableFields.push(key);
          } else {
            neutralizedFields.push(key);
          }
        }
        const completeness = assessCompleteness(requiredFields, availableFields, neutralizedFields);

        const freshness = assessMarketSnapshotFreshness(factorDate ?? featureDate ?? undefined);
        const lineage = companyLineage(upperSymbol, featureDate, factorDate);

        // If completeness is low, narrative should start with limitations
        let finalNarrative = narrative;
        if (completeness.score < 70 && neutralizedFields.length > 0) {
          const limitationPrefix = `Note: ${neutralizedFields.length} of ${requiredFields.length} metrics are unavailable (${neutralizedFields.join(", ")}), so this analysis is based on partial data only. `;
          finalNarrative = {
            narrative50: limitationPrefix + narrative.narrative50,
            narrative100: limitationPrefix + narrative.narrative100,
            narrative250: limitationPrefix + narrative.narrative250,
          };
        }

        const dataState = buildDataState({
          freshness,
          completeness,
          lineage,
        });

        const report = {
          symbol: upperSymbol,
          featureSnapshot,
          factorSnapshot,
          insights,
          narrative: finalNarrative,
          stockScore: await getStockScore(upperSymbol),
        };

        const resp = realResponse(
          report,
          freshness,
          factorDate ?? featureDate ?? new Date().toISOString().split("T")[0],
          completeness.score,
          lineage,
          "Company intelligence generated from feature and factor snapshots."
        );

        intelligenceCache.set(cacheKeyReal, resp);
        return reply.send(resp);
      } catch (error: any) {
        if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
          return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable. Please try again later."));
        }
        return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred while generating company intelligence."));
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────
  // PORTFOLIO INTELLIGENCE – GET /api/intelligence/portfolio
  // TRACK-P2: No silent default holdings. Empty → empty. Demo → demo.
  // ──────────────────────────────────────────────────────────────────
  app.get("/api/intelligence/portfolio", async (request, reply) => {
    try {
      const queryParams = request.query as Record<string, string | undefined>;
      const mode = queryParams?.mode;
      const positionsRaw = queryParams?.positions;

      // If demo mode is explicitly requested
      if (mode === "demo") {
        const cacheKeyDemo = "intelligence:portfolio:demo:standard";
        const cachedDemo = intelligenceCache.get(cacheKeyDemo);
        if (cachedDemo) return reply.send(cachedDemo);

        const demoSymbols = [
          { symbol: "RELIANCE", weight: 0.25 },
          { symbol: "TCS", weight: 0.20 },
          { symbol: "INFY", weight: 0.20 },
          { symbol: "HDFCBANK", weight: 0.20 },
          { symbol: "HAL", weight: 0.15 },
        ];

        const demoPositions = demoSymbols.map(p => ({
          symbol: p.symbol,
          weight: p.weight,
          _demo: true,
        }));

        const demoReport = await portfolioIntelligenceEngine.generatePortfolioReport(demoPositions);
        const resp = demoResponse(
          { ...demoReport, isDemo: true, positions: demoPositions },
          "Demo portfolio intelligence with sample holdings."
        );
        (resp as any).holdingsCount = demoPositions.length;
        intelligenceCache.set(cacheKeyDemo, resp);
        return reply.send(resp);
      }

      // No positions provided → empty
      if (!positionsRaw) {
        const resp = emptyResponse(
          "EMPTY_PORTFOLIO",
          "No portfolio positions were supplied.",
          undefined,
          new Date().toISOString().split("T")[0],
          portfolioLineage()
        );
        (resp as any).status = "empty";
        return reply.send(resp);
      }

      // Parse positions from query string: "SYMBOL:weight,SYMBOL:weight"
      let positions: { symbol: string; weight: number }[];
      try {
        positions = positionsRaw.split(",").map((p: string) => {
          const [sym, wt] = p.split(":");
          return { symbol: sym.trim().toUpperCase(), weight: parseFloat(wt) };
        });
      } catch {
        return reply.send(errorResponse("INVALID_POSITIONS_FORMAT", "Positions must be in format: SYMBOL:weight,SYMBOL:weight"));
      }

      return handleRealPortfolio(positions, reply);
    } catch (error: any) {
      if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
        return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable. Please try again later."));
      }
      return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred while generating portfolio intelligence."));
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // PORTFOLIO INTELLIGENCE – POST /api/intelligence/portfolio
  // TRACK-P2: Body.positions required. Validate symbols/weights.
  // ──────────────────────────────────────────────────────────────────
  app.post("/api/intelligence/portfolio", async (request, reply) => {
    try {
      const body = request.body as Record<string, any>;
      const mode = body?.mode;

      // Demo mode via POST body
      if (mode === "demo") {
        const cacheKeyDemo = "intelligence:portfolio:demo:standard";
        const cachedDemo = intelligenceCache.get(cacheKeyDemo);
        if (cachedDemo) return reply.send(cachedDemo);

        const demoSymbols = [
          { symbol: "RELIANCE", weight: 0.25 },
          { symbol: "TCS", weight: 0.20 },
          { symbol: "INFY", weight: 0.20 },
          { symbol: "HDFCBANK", weight: 0.20 },
          { symbol: "HAL", weight: 0.15 },
        ];

        const demoPositions = demoSymbols.map(p => ({
          symbol: p.symbol,
          weight: p.weight,
          _demo: true,
        }));

        const demoReport = await portfolioIntelligenceEngine.generatePortfolioReport(demoPositions);
        const resp = demoResponse(
          { ...demoReport, isDemo: true, positions: demoPositions },
          "Demo portfolio intelligence with sample holdings."
        );
        (resp as any).holdingsCount = demoPositions.length;
        intelligenceCache.set(cacheKeyDemo, resp);
        return reply.send(resp);
      }

      // No positions → empty
      if (!body?.positions || !Array.isArray(body.positions) || body.positions.length === 0) {
        const resp = emptyResponse(
          "EMPTY_PORTFOLIO",
          "No portfolio positions were supplied.",
          undefined,
          new Date().toISOString().split("T")[0],
          portfolioLineage()
        );
        (resp as any).status = "empty";
        return reply.send(resp);
      }

      // Parse positions
      const rawPositions: any[] = body.positions;
      const validated: { symbol: string; weight: number }[] = [];
      const rejected: { symbol: string; reason: string }[] = [];

      for (const pos of rawPositions) {
        const sym = String(pos.symbol || "").trim().toUpperCase();
        const wt = parseFloat(pos.weight);
        if (!sym || sym.length === 0) {
          rejected.push({ symbol: sym || "(empty)", reason: "Empty symbol" });
          continue;
        }
        if (isNaN(wt) || wt <= 0 || wt > 1) {
          rejected.push({ symbol: sym, reason: `Invalid weight: ${pos.weight}` });
          continue;
        }
        validated.push({ symbol: sym, weight: wt });
      }

      if (validated.length === 0) {
        const resp = emptyResponse(
          "ALL_POSITIONS_REJECTED",
          `All ${rawPositions.length} positions were rejected. ${rejected.map(r => `${r.symbol}: ${r.reason}`).join("; ")}`,
          undefined,
          new Date().toISOString().split("T")[0],
          portfolioLineage()
        );
        (resp as any).status = "empty";
        (resp as any).rejectedPositions = rejected;
        return reply.send(resp);
      }

      return handleRealPortfolio(validated, reply, rejected);
    } catch (error: any) {
      if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
        return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable. Please try again later."));
      }
      return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred while generating portfolio intelligence."));
    }
  });

  /**
   * Shared handler for real portfolio intelligence (both GET and POST).
   */
  async function handleRealPortfolio(
    positions: { symbol: string; weight: number }[],
    reply: any,
    rejected?: { symbol: string; reason: string }[]
  ) {
    const posKey = positions.map(p => `${p.symbol}:${p.weight}`).join(",");
    // Simple hash for cache key
    const hashKey = Buffer.from(posKey).toString("base64").replace(/[+/=]/g, "").substring(0, 16);
    const cacheKey = `intelligence:portfolio:real:${hashKey}`;
    const cached = intelligenceCache.get(cacheKey);
    if (cached) return reply.send(cached);

    const report = await portfolioIntelligenceEngine.generatePortfolioReport(positions);
    const lineage = portfolioLineage();
    const freshness = assessMarketSnapshotFreshness(
      report.reportGeneratedAt ?? new Date().toISOString().split("T")[0]
    );

    // Build completeness from the report
    const requiredFields = ["positions", "factor_scores", "allocation"];
    const availableFields: string[] = ["positions"];
    if (report.factorScores) availableFields.push("factor_scores");
    if (report.allocation) availableFields.push("allocation");
    const completeness = assessCompleteness(requiredFields, availableFields);

    const resp = realResponse(
      {
        ...report,
        holdingsCount: positions.length,
        rejectedPositions: rejected || [],
      },
      freshness,
      report.reportGeneratedAt ?? new Date().toISOString().split("T")[0],
      completeness.score,
      lineage,
      "Portfolio intelligence generated from validated positions."
    );

    intelligenceCache.set(cacheKey, resp);
    return reply.send(resp);
  }

  // ──────────────────────────────────────────────────────────────────
  // MARKET INTELLIGENCE – GET /api/intelligence/market
  // TRACK-P2: Envelope with lineage, freshness. No synthetic fallback.
  // ──────────────────────────────────────────────────────────────────
  app.get("/api/intelligence/market", async (request, reply) => {
    try {
      const cacheKey = "intelligence:market:real";
      const cached = intelligenceCache.get(cacheKey);
      if (cached) return reply.send(cached);

      const marketReport = await marketIntelligenceEngine.generateMarketReport();

      // Fetch actual snapshot dates for lineage
      const [featureDateRes, factorDateRes] = await Promise.all([
        query(`SELECT MAX(trade_date) as max_date FROM feature_snapshots`),
        query(`SELECT MAX(trade_date) as max_date FROM factor_snapshots`),
      ]);
      const featureDate: string | null = featureDateRes.rows[0]?.max_date
        ? (featureDateRes.rows[0].max_date instanceof Date
            ? featureDateRes.rows[0].max_date.toISOString().split("T")[0]
            : String(featureDateRes.rows[0].max_date).split("T")[0])
        : null;
      const factorDate: string | null = factorDateRes.rows[0]?.max_date
        ? (factorDateRes.rows[0].max_date instanceof Date
            ? factorDateRes.rows[0].max_date.toISOString().split("T")[0]
            : String(factorDateRes.rows[0].max_date).split("T")[0])
        : null;

      const lineage = marketLineage(featureDate, factorDate);
      const freshness = assessMarketSnapshotFreshness(factorDate ?? featureDate ?? undefined);

      // Remove synthetic fallback leadership trend if it was injected
      if (
        marketReport.leadershipTrends.length === 1 &&
        marketReport.leadershipTrends[0] === "Technology sector leading active market flows"
      ) {
        // Check if this was synthetic — if the database didn't return any leaders
        const leadersCheck = await query(
          `SELECT s.sector, AVG(fs.factor_score) as avg_score
           FROM factor_snapshots fs
           JOIN symbols s ON fs.symbol = s.symbol
           WHERE fs.trade_date = (SELECT MAX(trade_date) FROM factor_snapshots)
           GROUP BY s.sector
           ORDER BY avg_score DESC
           LIMIT 1`
        );
        if (leadersCheck.rows.length === 0) {
          marketReport.leadershipTrends = [];
        }
      }

      // Build completeness
      const requiredFields = ["marketMood", "marketBreadth", "riskAppetite", "leadershipTrends"];
      const availableFields: string[] = [];
      if (marketReport.marketMood) availableFields.push("marketMood");
      if (marketReport.marketBreadth !== undefined) availableFields.push("marketBreadth");
      if (marketReport.riskAppetite) availableFields.push("riskAppetite");
      if (marketReport.leadershipTrends && marketReport.leadershipTrends.length > 0) availableFields.push("leadershipTrends");
      const completeness = assessCompleteness(requiredFields, availableFields);

      const resp = realResponse(
        marketReport,
        freshness,
        factorDate ?? featureDate ?? new Date().toISOString().split("T")[0],
        completeness.score,
        lineage,
        "Market intelligence generated from aggregate feature and factor snapshots."
      );

      intelligenceCache.set(cacheKey, resp);
      return reply.send(resp);
    } catch (error: any) {
      if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
        return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable. Please try again later."));
      }
      return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred while generating market intelligence."));
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // INSIGHT ROUTE – GET /api/intelligence/insight/:symbol
  // TRACK-P2: Remove fabricated coverage/freshness/dataQuality claims.
  // ──────────────────────────────────────────────────────────────────
  app.get<{ Params: { symbol: string } }>(
    "/api/intelligence/insight/:symbol",
    async (request, reply) => {
      const { symbol } = request.params;
      const upperSymbol = symbol.toUpperCase();

      try {
        const cacheKey = `intelligence:insight:${upperSymbol}`;
        const cached = intelligenceCache.get(cacheKey);
        if (cached) return reply.send(cached);

        const [[featureRow], [factorRow]] = await Promise.all([
          (async () => {
            const res = await query(
              `SELECT * FROM feature_snapshots
               WHERE symbol = $1
               ORDER BY trade_date DESC LIMIT 1`,
              [upperSymbol]
            );
            return res.rows;
          })(),
          (async () => {
            const res = await query(
              `SELECT * FROM factor_snapshots
               WHERE symbol = $1
               ORDER BY trade_date DESC LIMIT 1`,
              [upperSymbol]
            );
            return res.rows;
          })(),
        ]);

        if (!featureRow || !factorRow) {
          return reply.send(
            unavailableResponse(
              "FEATURE_OR_FACTOR_SNAPSHOT_MISSING",
              "Insight generation requires both feature and factor snapshots, which are not available for this symbol.",
              { symbol: upperSymbol }
            )
          );
        }

        const featureDate: string = featureRow.trade_date instanceof Date
          ? featureRow.trade_date.toISOString().split("T")[0]
          : String(featureRow.trade_date).split("T")[0];
        const factorDate: string = factorRow.trade_date instanceof Date
          ? factorRow.trade_date.toISOString().split("T")[0]
          : String(factorRow.trade_date).split("T")[0];

        // Generate insight from engine
        const rawInsight = insightEngine.generateInsight(upperSymbol, featureRow, factorRow);

        // Override synthetic claims with realistic computed values
        const insight: MarketInsight = {
          ...rawInsight,
          coverage: `Feature snapshot from ${featureDate}, Factor snapshot from ${factorDate}`,
          freshness: `Data as of ${factorDate}`,
          dataQuality: `Source: feature_snapshots (${featureDate}), factor_snapshots (${factorDate})`,
        };

        const lineage = companyLineage(upperSymbol, featureDate, factorDate);
        const freshness = assessMarketSnapshotFreshness(factorDate);

        // Build completeness for the insight
        const requiredFields = ["features", "factors"];
        const availableFields = ["features", "factors"];
        const completeness = assessCompleteness(requiredFields, availableFields);

        const resp = realResponse(
          insight,
          freshness,
          factorDate,
          completeness.score,
          lineage,
          "Insight derived from feature and factor snapshot data."
        );

        intelligenceCache.set(cacheKey, resp);
        return reply.send(resp);
      } catch (error: any) {
        if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
          return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable. Please try again later."));
        }
        return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred while generating insight."));
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────
  // SIGNAL FEED – GET /api/intelligence/signals
  // TRACK-P2: Distinguish NO_SIGNIFICANT_SIGNALS vs SNAPSHOT_NOT_GENERATED.
  // ──────────────────────────────────────────────────────────────────
  app.get("/api/intelligence/signals", async (request, reply) => {
    try {
      const feed = await generateSignalFeed();

      if (feed.dataSource === "unavailable") {
        return reply.send(
          unavailableResponse(
            "SNAPSHOT_NOT_GENERATED",
            "Signals cannot be generated because prediction snapshots are not available. Try running the prediction pipeline first.",
            { dataSource: feed.dataSource }
          )
        );
      }

      if (feed.signals.length === 0) {
        return reply.send(
          emptyResponse(
            "NO_SIGNIFICANT_SIGNALS",
            "No significant prediction changes were detected in the current snapshot window.",
            "current",
            feed.summary ? undefined : new Date().toISOString().split("T")[0],
            [
              {
                sourceTable: "prediction_registry",
                sourceField: null,
                provider: null,
                retrievedAt: new Date().toISOString(),
                isFallback: false,
                isSynthetic: false,
              },
            ]
          )
        );
      }

      const snapshotDate = feed.signals[0]?.snapshotDate ?? new Date().toISOString().split("T")[0];
      const lineage: DataLineageEntry[] = [
        {
          sourceTable: "prediction_registry",
          sourceField: null,
          provider: null,
          asOf: snapshotDate,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
        },
      ];

      const freshness = assessMarketSnapshotFreshness(snapshotDate);
      const requiredFields = ["signals", "summary"];
      const availableFields = ["signals", "summary"];
      const completeness = assessCompleteness(requiredFields, availableFields);

      const resp = realResponse(
        {
          signals: feed.signals,
          summary: feed.summary ?? null,
          snapshotDate,
          symbolsAnalyzed: feed.summary?.symbolsAnalyzed ?? 0,
        },
        freshness,
        snapshotDate,
        completeness.score,
        lineage,
        "Signal feed derived from prediction registry snapshot diffs."
      );

      return reply.send(resp);
    } catch (error: any) {
      if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
        return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable. Please try again later."));
      }
      return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred while generating signals."));
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // ATTENTION ROUTES (preserved unchanged)
  // ──────────────────────────────────────────────────────────────────
  app.get("/api/intelligence/attention/portfolio", async (request, reply) => {
    try {
      const watchlistRes = await query(`SELECT * FROM watchlists ORDER BY created_at DESC LIMIT 5`);
      const watchlists = watchlistRes.rows;

      const results = [];
      for (const wl of watchlists) {
        const tickers: string[] = Array.isArray(wl.tickers) ? wl.tickers : [];
        if (tickers.length > 0) {
          const factorRes = await query(
            `SELECT symbol, factor_score FROM factor_snapshots
             WHERE symbol = ANY($1::text[])
             AND trade_date = (SELECT MAX(trade_date) FROM factor_snapshots)`,
            [tickers]
          );
          const scores = factorRes.rows.map(r => ({
            symbol: r.symbol,
            factorScore: Number(r.factor_score),
          }));
          results.push({
            watchlistId: wl.id,
            watchlistName: wl.name,
            scores,
          });
        }
      }

      return reply.send({
        watchlists: results,
        asOf: new Date().toISOString(),
      });
    } catch (error: any) {
      return reply.send(errorResponse("INTERNAL_ERROR", "Failed to fetch attention feed."));
    }
  });

  app.get("/api/intelligence/attention/:symbol", async (request, reply) => {
    try {
      const { symbol } = request.params as { symbol: string };
      const upperSymbol = symbol.toUpperCase();

      const [featureRes, factorRes] = await Promise.all([
        query(
          `SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
          [upperSymbol]
        ),
        query(
          `SELECT * FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
          [upperSymbol]
        ),
      ]);

      const feature = featureRes.rows[0] || null;
      const factor = factorRes.rows[0] || null;

      return reply.send({
        symbol: upperSymbol,
        feature: feature
          ? {
              rsi: feature.rsi,
              macd: feature.macd,
              momentum: feature.momentum,
              volatility: feature.volatility,
              tradeDate: feature.trade_date,
            }
          : null,
        factor: factor
          ? {
              factorScore: factor.factor_score,
              qualityFactor: factor.quality_factor,
              valueFactor: factor.value_factor,
              growthFactor: factor.growth_factor,
              momentumFactor: factor.momentum_factor,
              riskFactor: factor.risk_factor,
              tradeDate: factor.trade_date,
            }
          : null,
        asOf: new Date().toISOString(),
      });
    } catch (error: any) {
      return reply.send(errorResponse("INTERNAL_ERROR", "Failed to fetch attention detail."));
    }
  });
};

export default intelligenceRoutes;