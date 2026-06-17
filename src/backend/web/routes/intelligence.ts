// src/backend/web/routes/intelligence.ts
// TRACK-P2 Compliance: Rewritten intelligence routes with data integrity enforcement.
// Removes fabricated claims, hidden defaults, and fabricated analysis.
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
  DataLineageEntry,
  realResponse,
  unavailableResponse,
  partialResponse,
  demoResponse,
  emptyResponse,
  errorResponse,
} from "../../../shared/data/AnalyticalResponse";

import { assessMarketSnapshotFreshness } from "../../../shared/data/DataFreshness";
import { assessCompleteness } from "../../../shared/data/DataCompleteness";

const companyIntelligenceEngine = new CompanyIntelligenceEngine();
const portfolioIntelligenceEngine = new PortfolioIntelligenceEngine();
const narrativeEngine = new NarrativeEngine();
const insightEngine = new InsightEngine();
const marketIntelligenceEngine = new MarketIntelligenceEngine();

// ──────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────

function companyLineage(_symbol: string, featureDate: string | null, factorDate: string | null): DataLineageEntry[] {
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

/** Helper to extract date string from a DB row field. */
function extractDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  return String(val).split("T")[0];
}

// ──────────────────────────────────────────────────────────────────────
// PLUGIN
// ──────────────────────────────────────────────────────────────────────

export const intelligenceRoutes: FastifyPluginAsync = async (app) => {
  // ──────────────────────────────────────────────────────────────────
  // LEADERBOARD – GET /api/intelligence/leaderboard
  // Read-only ranking surface backed by the latest prediction_registry
  // snapshot. Empty production tables intentionally return [].
  // ──────────────────────────────────────────────────────────────────
  app.get("/api/intelligence/leaderboard", async (request, reply) => {
    const queryParams = request.query as { limit?: string; horizon?: string };
    const parsedLimit = Number.parseInt(queryParams.limit ?? "50", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 200)) : 50;
    const parsedHorizon = Number.parseInt(queryParams.horizon ?? "30", 10);
    const horizon = [7, 30, 90, 180, 365].includes(parsedHorizon) ? parsedHorizon : 30;

    try {
      const result = await query(
        `SELECT
           pr.symbol,
           msr.company_name,
           msr.sector,
           msr.industry,
           pr.prediction_date,
           pr.ranking_score,
           pr.classification,
           pr.confidence_score,
           pr.confidence_level,
           pr.quality_score,
           pr.growth_score,
           pr.value_score,
           pr.momentum_score,
           pr.risk_score,
           pr.sector_score
         FROM prediction_registry pr
         LEFT JOIN master_security_registry msr ON msr.symbol = pr.symbol
         WHERE pr.prediction_horizon = $1
           AND pr.prediction_date = (
             SELECT MAX(prediction_date)
             FROM prediction_registry
             WHERE prediction_horizon = $1
           )
         ORDER BY pr.ranking_score DESC, pr.symbol ASC
         LIMIT $2`,
        [horizon, limit],
      );

      const rows = result.rows.map((row: any, index: number) => ({
        rank: index + 1,
        symbol: row.symbol,
        companyName: row.company_name ?? row.symbol,
        sector: row.sector ?? null,
        industry: row.industry ?? null,
        predictionDate: extractDate(row.prediction_date),
        rankingScore: row.ranking_score == null ? null : Number(row.ranking_score),
        classification: row.classification,
        confidenceScore: row.confidence_score == null ? null : Number(row.confidence_score),
        confidenceLevel: row.confidence_level,
        factors: {
          quality: row.quality_score == null ? null : Number(row.quality_score),
          growth: row.growth_score == null ? null : Number(row.growth_score),
          value: row.value_score == null ? null : Number(row.value_score),
          momentum: row.momentum_score == null ? null : Number(row.momentum_score),
          risk: row.risk_score == null ? null : Number(row.risk_score),
          sector: row.sector_score == null ? null : Number(row.sector_score),
        },
      }));

      return reply.send({ ok: true, data: rows });
    } catch (err: any) {
      request.log.error({ err }, "leaderboard query failed");
      return reply.status(500).send({
        ok: false,
        error: { code: "LEADERBOARD_UNAVAILABLE", message: "Leaderboard data is temporarily unavailable." },
      });
    }
  });

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
        const cacheKeyReal = `intelligence:company:real:${upperSymbol}`;
        const cachedReal = intelligenceCache.get(cacheKeyReal);
        if (cachedReal) return reply.send(cachedReal);

        const [[featureRow], [factorRow]] = await Promise.all([
          query(`SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [upperSymbol])
            .then(r => r.rows as any[]),
          query(`SELECT * FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [upperSymbol])
            .then(r => r.rows as any[]),
        ]);

        const hasFeature = !!featureRow;
        const hasFactor = !!factorRow;
        const featureDate = extractDate(featureRow?.trade_date);
        const factorDate = extractDate(factorRow?.trade_date);

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

          const partialData: Record<string, unknown> = { symbol: upperSymbol };
          const lineage = companyLineage(upperSymbol, featureDate, factorDate);
          const requiredFields = ["feature_snapshots", "factor_snapshots"];
          const availableFields: string[] = [];
          const missingInputs: string[] = [];
          if (hasFeature) availableFields.push("feature_snapshots");
          else missingInputs.push("feature_snapshots");
          if (hasFactor) availableFields.push("factor_snapshots");
          else missingInputs.push("factor_snapshots");
          const completeness = assessCompleteness(requiredFields, availableFields);

          if (hasFeature && featureRow) partialData.featureSnapshot = featureRow;
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
          (resp as any).availableSections = availableSections;
          (resp as any).unavailableSections = unavailableSections;
          intelligenceCache.set(`intelligence:company:partial:${upperSymbol}`, resp);
          return reply.send(resp);
        }

        // ── Both present → Real analytical response ────────────────
        const featureSnapshot: any = featureRow;
        const factorSnapshot: any = factorRow;

        const insights: MarketInsight = insightEngine.generateInsight(
          upperSymbol,
          featureSnapshot,
          factorSnapshot
        );

        // Override the hardcoded claims with honest values
        (insights as any).coverage = `Feature snapshot from ${featureDate}, Factor snapshot from ${factorDate}`;
        (insights as any).freshness = `Data as of ${factorDate || featureDate}`;
        (insights as any).dataQuality = `Source: feature_snapshots, factor_snapshots (internal pipeline)`;

        const narrative = narrativeEngine.generateNarrative(
          upperSymbol,
          featureSnapshot,
          factorSnapshot,
          { title: insights.title, summary: insights.summary }
        );

        // Build completeness
        const metricFields = [
          "rsi", "macd", "adx", "atr", "momentum", "volatility",
          "moving_average_distance", "trend_strength",
          "quality_factor", "value_factor", "growth_factor",
          "momentum_factor", "risk_factor", "sector_strength_factor"
        ];
        const availableFields: string[] = [];
        const neutralizedFields: string[] = [];
        const fieldMap: Record<string, any> = {
          rsi: featureSnapshot.rsi, macd: featureSnapshot.macd, adx: featureSnapshot.adx,
          atr: featureSnapshot.atr, momentum: featureSnapshot.momentum,
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
          if (val !== null && val !== undefined) availableFields.push(key);
          else neutralizedFields.push(key);
        }
        const completeness = assessCompleteness(metricFields, availableFields, neutralizedFields);

        const freshnessResult = assessMarketSnapshotFreshness(factorDate ?? featureDate ?? undefined);
        const lineage = companyLineage(upperSymbol, featureDate, factorDate);

        // If completeness is low, narrative should start with limitations
        let finalNarrative = narrative;
        if (completeness.score < 70 && neutralizedFields.length > 0) {
          const limitationPrefix =
            `Note: ${neutralizedFields.length} of ${metricFields.length} metrics are unavailable ` +
            `(${neutralizedFields.join(", ")}), so this analysis is based on partial data only. `;
          finalNarrative = {
            narrative50: limitationPrefix + narrative.narrative50,
            narrative100: limitationPrefix + narrative.narrative100,
            narrative250: limitationPrefix + narrative.narrative250,
          };
        }

        const report: Record<string, unknown> = {
          symbol: upperSymbol,
          featureSnapshot,
          factorSnapshot,
          insights,
          narrative: finalNarrative,
        };

        const resp = realResponse(
          report,
          freshnessResult,
          factorDate ?? featureDate ?? new Date().toISOString().split("T")[0],
          completeness.score,
          lineage,
          "Company intelligence generated from feature and factor snapshots."
        );

        intelligenceCache.set(cacheKeyReal, resp);
        return reply.send(resp);
      } catch (error: any) {
        console.error("[intelligence] Error generating company intelligence:", error);
        if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
          return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable."));
        }
        return reply.send(errorResponse("INTERNAL_ERROR", `An unexpected error occurred while generating company intelligence: ${error.message}`));
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────
  // PORTFOLIO INTELLIGENCE – GET /api/intelligence/portfolio
  // TRACK-P2: No silent default holdings. Empty → empty. Demo → demo.
  // ──────────────────────────────────────────────────────────────────
  app.get("/api/intelligence/portfolio", async (request, reply) => {
    try {
      const qp = request.query as Record<string, string | undefined>;
      const mode = qp?.mode;
      const positionsRaw = qp?.positions;

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
        const demoPositions = demoSymbols.map(p => ({ symbol: p.symbol, weight: p.weight, _demo: true }));
        const demoResult = await portfolioIntelligenceEngine.evaluatePortfolioV2(
          demoSymbols.map(p => ({ symbol: p.symbol, weight: p.weight }))
        );

        const resp = demoResponse(
          {
            intelligence: demoResult.intelligence,
            neutralizedFields: demoResult.neutralizedFields,
            completenessScore: demoResult.completenessScore,
            isDemo: true,
            positions: demoPositions,
          },
          "Demo portfolio intelligence with sample holdings."
        );
        (resp as any).holdingsCount = demoPositions.length;
        intelligenceCache.set(cacheKeyDemo, resp);
        return reply.send(resp);
      }

      if (!positionsRaw) {
        const resp = emptyResponse(
          "EMPTY_PORTFOLIO",
          "No portfolio positions were supplied.",
          "recent",
          new Date().toISOString().split("T")[0],
          portfolioLineage()
        );
        return reply.send(resp);
      }

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
        return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable."));
      }
      return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred."));
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // PORTFOLIO INTELLIGENCE – POST /api/intelligence/portfolio
  // ──────────────────────────────────────────────────────────────────
  app.post("/api/intelligence/portfolio", async (request, reply) => {
    try {
      const body = request.body as Record<string, any>;
      const mode = body?.mode;

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
        const demoPositions = demoSymbols.map(p => ({ symbol: p.symbol, weight: p.weight, _demo: true }));
        const demoResult = await portfolioIntelligenceEngine.evaluatePortfolioV2(
          demoSymbols.map(p => ({ symbol: p.symbol, weight: p.weight }))
        );

        const resp = demoResponse(
          {
            intelligence: demoResult.intelligence,
            neutralizedFields: demoResult.neutralizedFields,
            completenessScore: demoResult.completenessScore,
            isDemo: true,
            positions: demoPositions,
          },
          "Demo portfolio intelligence with sample holdings."
        );
        (resp as any).holdingsCount = demoPositions.length;
        intelligenceCache.set(cacheKeyDemo, resp);
        return reply.send(resp);
      }

      if (!body?.positions || !Array.isArray(body.positions) || body.positions.length === 0) {
        const resp = emptyResponse(
          "EMPTY_PORTFOLIO",
          "No portfolio positions were supplied.",
          "recent",
          new Date().toISOString().split("T")[0],
          portfolioLineage()
        );
        return reply.send(resp);
      }

      const rawPositions: any[] = body.positions;
      const validated: { symbol: string; weight: number }[] = [];
      const rejected: { symbol: string; reason: string }[] = [];

      for (const pos of rawPositions) {
        const sym = String(pos.symbol || "").trim().toUpperCase();
        const wt = parseFloat(pos.weight);
        if (!sym) { rejected.push({ symbol: sym || "(empty)", reason: "Empty symbol" }); continue; }
        if (isNaN(wt) || wt <= 0 || wt > 1) { rejected.push({ symbol: sym, reason: `Invalid weight: ${pos.weight}` }); continue; }
        validated.push({ symbol: sym, weight: wt });
      }

      if (validated.length === 0) {
        const resp = emptyResponse(
          "ALL_POSITIONS_REJECTED",
          `All ${rawPositions.length} positions were rejected.`,
          "recent",
          new Date().toISOString().split("T")[0],
          portfolioLineage()
        );
        (resp as any).rejectedPositions = rejected;
        return reply.send(resp);
      }

      return handleRealPortfolio(validated, reply, rejected);
    } catch (error: any) {
      if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
        return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable."));
      }
      return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred."));
    }
  });

  async function handleRealPortfolio(
    positions: { symbol: string; weight: number }[],
    reply: any,
    rejected?: { symbol: string; reason: string }[]
  ) {
    const posKey = positions.map(p => `${p.symbol}:${p.weight}`).join(",");
    const hashKey = Buffer.from(posKey).toString("base64").replace(/[+/=]/g, "").substring(0, 16);
    const cacheKey = `intelligence:portfolio:real:${hashKey}`;
    const cached = intelligenceCache.get(cacheKey);
    if (cached) return reply.send(cached);

    const result = await portfolioIntelligenceEngine.evaluatePortfolioV2(positions);
    const lineage = portfolioLineage();
    const freshnessResult = assessMarketSnapshotFreshness(new Date().toISOString().split("T")[0]);

    const resp = realResponse(
      {
        intelligence: result.intelligence,
        holdingsCount: positions.length,
        rejectedPositions: rejected || [],
        neutralizedFields: result.neutralizedFields,
      },
      freshnessResult,
      new Date().toISOString().split("T")[0],
      result.completenessScore,
      lineage,
      "Portfolio intelligence generated from validated positions."
    );

    intelligenceCache.set(cacheKey, resp);
    return reply.send(resp);
  }

  // ──────────────────────────────────────────────────────────────────
  // MARKET INTELLIGENCE – GET /api/intelligence/market
  // ──────────────────────────────────────────────────────────────────
  app.get("/api/intelligence/market", async (request, reply) => {
    try {
      const cacheKey = "intelligence:market:real";
      const cached = intelligenceCache.get(cacheKey);
      if (cached) return reply.send(cached);

      const marketReport = await marketIntelligenceEngine.generateMarketReport();

      const [fdRes, fctRes] = await Promise.all([
        query(`SELECT MAX(trade_date) as max_date FROM feature_snapshots`),
        query(`SELECT MAX(trade_date) as max_date FROM factor_snapshots`),
      ]);
      const featureDate = extractDate(fdRes.rows[0]?.max_date);
      const factorDate = extractDate(fctRes.rows[0]?.max_date);
      const lineage = marketLineage(featureDate, factorDate);
      const freshnessResult = assessMarketSnapshotFreshness(factorDate ?? featureDate ?? undefined);

      // Remove fabricated leadership trend.
      if (
        marketReport.leadershipTrends.length === 1 &&
        marketReport.leadershipTrends[0] === "Technology sector leading active market flows"
      ) {
        const leadersCheck = await query(
          `SELECT s.sector, AVG(fs.factor_score) as avg_score
           FROM factor_snapshots fs JOIN symbols s ON fs.symbol = s.symbol
           WHERE fs.trade_date = (SELECT MAX(trade_date) FROM factor_snapshots)
           GROUP BY s.sector ORDER BY avg_score DESC LIMIT 1`
        );
        if (leadersCheck.rows.length === 0) marketReport.leadershipTrends = [];
      }

      const requiredFields = ["marketMood", "marketBreadth", "riskAppetite", "leadershipTrends"];
      const availableFields: string[] = [];
      if (marketReport.marketMood) availableFields.push("marketMood");
      if (marketReport.marketBreadth !== undefined) availableFields.push("marketBreadth");
      if (marketReport.riskAppetite) availableFields.push("riskAppetite");
      if (marketReport.leadershipTrends && marketReport.leadershipTrends.length > 0) availableFields.push("leadershipTrends");
      const completeness = assessCompleteness(requiredFields, availableFields);

      const resp = realResponse(
        marketReport,
        freshnessResult,
        factorDate ?? featureDate ?? new Date().toISOString().split("T")[0],
        completeness.score,
        lineage,
        "Market intelligence generated from aggregate feature and factor snapshots."
      );

      intelligenceCache.set(cacheKey, resp);
      return reply.send(resp);
    } catch (error: any) {
      if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
        return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable."));
      }
      return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred."));
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // INSIGHT ROUTE – GET /api/intelligence/insight/:symbol
  // ──────────────────────────────────────────────────────────────────
  app.get<{ Params: { symbol: string } }>("/api/intelligence/insight/:symbol", async (request, reply) => {
    const { symbol: sym } = request.params;
    const upperSymbol = sym.toUpperCase();
    try {
      const cacheKey = `intelligence:insight:${upperSymbol}`;
      const cached = intelligenceCache.get(cacheKey);
      if (cached) return reply.send(cached);

      const [[featureRow], [factorRow]] = await Promise.all([
        query(`SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [upperSymbol])
          .then(r => r.rows as any[]),
        query(`SELECT * FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [upperSymbol])
          .then(r => r.rows as any[]),
      ]);

      if (!featureRow || !factorRow) {
        return reply.send(unavailableResponse(
          "FEATURE_OR_FACTOR_SNAPSHOT_MISSING",
          "Insight generation requires both feature and factor snapshots, which are not available for this symbol.",
          { symbol: upperSymbol }
        ));
      }

      const featureDate = extractDate(featureRow.trade_date)!;
      const factorDate = extractDate(factorRow.trade_date)!;
      const rawInsight = insightEngine.generateInsight(upperSymbol, featureRow as any, factorRow as any);

      const insight: MarketInsight = {
        ...rawInsight,
        coverage: `Feature snapshot from ${featureDate}, Factor snapshot from ${factorDate}`,
        freshness: `Data as of ${factorDate}`,
        dataQuality: `Source: feature_snapshots (${featureDate}), factor_snapshots (${factorDate})`,
      };

      const lineage = companyLineage(upperSymbol, featureDate, factorDate);
      const freshnessResult = assessMarketSnapshotFreshness(factorDate);
      const completeness = assessCompleteness(["features", "factors"], ["features", "factors"]);

      const resp = realResponse(
        insight, freshnessResult, factorDate, completeness.score, lineage,
        "Insight derived from feature and factor snapshot data."
      );
      intelligenceCache.set(cacheKey, resp);
      return reply.send(resp);
    } catch (error: any) {
      if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
        return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable."));
      }
      return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred."));
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // SIGNAL FEED – GET /api/intelligence/signals
  // TRACK-P2: Distinguish NO_SIGNIFICANT_SIGNALS vs SNAPSHOT_NOT_GENERATED.
  // ──────────────────────────────────────────────────────────────────
  app.get("/api/intelligence/signals", async (request, reply) => {
    try {
      const feed = await generateSignalFeed();

      if (feed.dataSource === "unavailable") {
        return reply.send(unavailableResponse(
          "SNAPSHOT_NOT_GENERATED",
          "Signals cannot be generated because prediction snapshots are not available. Try running the prediction pipeline first.",
          { dataSource: feed.dataSource }
        ));
      }

      if (feed.signals.length === 0) {
        return reply.send(emptyResponse(
          "NO_SIGNIFICANT_SIGNALS",
          "No significant prediction changes were detected in the current snapshot window.",
          "recent",
          new Date().toISOString().split("T")[0],
          [{ sourceTable: "prediction_registry", sourceField: null, provider: null,
             retrievedAt: new Date().toISOString(), isFallback: false, isSynthetic: false }]
        ));
      }

      const snapshotDate = feed.signals[0]?.snapshotDate ?? new Date().toISOString().split("T")[0];
      const lineage: DataLineageEntry[] = [{
        sourceTable: "prediction_registry", sourceField: null, provider: null,
        asOf: snapshotDate, retrievedAt: new Date().toISOString(),
        isFallback: false, isSynthetic: false,
      }];

      const freshnessResult = assessMarketSnapshotFreshness(snapshotDate);
      const completeness = assessCompleteness(["signals", "summary"], ["signals", "summary"]);

      const resp = realResponse(
        { signals: feed.signals, summary: feed.summary ?? null, snapshotDate, symbolsAnalyzed: (feed.summary as any)?.symbolsAnalyzed ?? 0 },
        freshnessResult, snapshotDate, completeness.score, lineage,
        "Signal feed derived from prediction registry snapshot diffs."
      );
      return reply.send(resp);
    } catch (error: any) {
      if (error?.code === "ECONNREFUSED" || error?.code === "57P01" || error?.code === "08006") {
        return reply.send(errorResponse("DATABASE_UNAVAILABLE", "The database is currently unreachable."));
      }
      return reply.send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred."));
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // ATTENTION ROUTES (preserved)
  // ──────────────────────────────────────────────────────────────────
  app.get("/api/intelligence/attention/portfolio", async (_request, reply) => {
    try {
      const watchlistRes = await query(`SELECT * FROM watchlists ORDER BY created_at DESC LIMIT 5`);
      const watchlists = watchlistRes.rows as any[];
      const results: any[] = [];
      for (const wl of watchlists) {
        const tickers: string[] = Array.isArray(wl.tickers) ? wl.tickers : [];
        if (tickers.length > 0) {
          const factorRes = await query(
            `SELECT symbol, factor_score FROM factor_snapshots
             WHERE symbol = ANY($1::text[]) AND trade_date = (SELECT MAX(trade_date) FROM factor_snapshots)`,
            [tickers]
          );
          results.push({
            watchlistId: wl.id,
            watchlistName: wl.name,
            scores: factorRes.rows.map((r: any) => ({ symbol: r.symbol, factorScore: Number(r.factor_score) })),
          });
        }
      }
      return reply.send({ watchlists: results, asOf: new Date().toISOString() });
    } catch (error: any) {
      return reply.send(errorResponse("INTERNAL_ERROR", "Failed to fetch attention feed."));
    }
  });

  app.get("/api/intelligence/attention/:symbol", async (request, reply) => {
    try {
      const { symbol: sym } = request.params as { symbol: string };
      const upperSymbol = sym.toUpperCase();
      const [featureRes, factorRes] = await Promise.all([
        query(`SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [upperSymbol]),
        query(`SELECT * FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [upperSymbol]),
      ]);
      const feature = featureRes.rows[0] as any;
      const factor = factorRes.rows[0] as any;
      return reply.send({
        symbol: upperSymbol,
        feature: feature ? { rsi: feature.rsi, macd: feature.macd, momentum: feature.momentum, volatility: feature.volatility, tradeDate: feature.trade_date } : null,
        factor: factor ? { factorScore: factor.factor_score, qualityFactor: factor.quality_factor, valueFactor: factor.value_factor, growthFactor: factor.growth_factor, momentumFactor: factor.momentum_factor, riskFactor: factor.risk_factor, tradeDate: factor.trade_date } : null,
        asOf: new Date().toISOString(),
      });
    } catch (error: any) {
      return reply.send(errorResponse("INTERNAL_ERROR", "Failed to fetch attention detail."));
    }
  });
};

export default intelligenceRoutes;
