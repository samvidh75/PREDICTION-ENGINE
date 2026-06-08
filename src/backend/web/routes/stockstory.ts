import type { FastifyPluginAsync } from "fastify";
import { normalizePredictionSymbol, predictionSymbolWhereExpression } from "./SymbolNormalizer";

type PredictionRegistryRow = {
  symbol: string;
  prediction_date: string | Date;
  ranking_score: string | number;
  classification: string;
  confidence_score: string | number;
  confidence_level: string;
  quality_score: string | number;
  growth_score: string | number;
  value_score: string | number;
  momentum_score: string | number;
  risk_score: string | number;
  sector_score: string | number;
};

type FactorLineage = {
  score: number;
  source: string;
  snapshotDate: string;
};

function toDateOnly(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toScore(value: string | number): number {
  return Number(Number(value).toFixed(2));
}

function factor(score: string | number, source: string, snapshotDate: string): FactorLineage {
  return {
    score: toScore(score),
    source,
    snapshotDate,
  };
}

function describeStrength(name: string, score: number): string {
  if (score >= 80) return `strong ${name}`;
  if (score >= 65) return `solid ${name}`;
  if (score >= 50) return `balanced ${name}`;
  if (score >= 35) return `soft ${name}`;
  return `weak ${name}`;
}

function generateNarrative(args: {
  classification: string;
  quality: number;
  growth: number;
  momentum: number;
  value: number;
  risk: number;
  stability: number;
}): string {
  const positiveFactors = [
    { name: "quality", score: args.quality },
    { name: "growth", score: args.growth },
    { name: "momentum", score: args.momentum },
    { name: "value", score: args.value },
    { name: "stability", score: args.stability },
  ]
    .filter((item) => item.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const support =
    positiveFactors.length > 0
      ? `${positiveFactors.map((item) => describeStrength(item.name, item.score)).join(" and ")} metrics support the current rating.`
      : `No factor is above the strong threshold, which supports the ${args.classification.toLowerCase()} rating.`;

  const risk =
    args.risk <= 35
      ? "Risk remains contained."
      : args.risk <= 60
        ? "Risk is moderate and should be monitored."
        : "Risk is elevated and weighs on the rating.";

  return `${support} ${risk}`;
}

export const stockstoryRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/stockstory/:ticker", async (request, reply) => {
    const startedAt = Date.now();
    const { ticker } = request.params as { ticker: string };
    const symbol = normalizePredictionSymbol(ticker);
    const normalizedExpression = predictionSymbolWhereExpression("symbol");

    try {
      const exists = await app.db!.query(
        `SELECT COUNT(*) AS symbol_count
         FROM prediction_registry
         WHERE ${normalizedExpression} = $1`,
        [symbol],
      );

      if (Number(exists.rows[0]?.symbol_count ?? 0) === 0) {
        return reply.status(404).send({
          code: "STOCKSTORY_SYMBOL_NOT_FOUND",
          symbol,
        });
      }

      const latest = await app.db!.query(
        `SELECT
           symbol,
           prediction_date,
           ranking_score,
           classification,
           confidence_score,
           confidence_level,
           quality_score,
           growth_score,
           value_score,
           momentum_score,
           risk_score,
           sector_score
         FROM prediction_registry
         WHERE ${normalizedExpression} = $1
         ORDER BY prediction_date DESC, prediction_horizon ASC
         LIMIT 1`,
        [symbol],
      );

      const row = latest.rows[0] as PredictionRegistryRow | undefined;
      if (!row) {
        return reply.send({
          status: "unavailable",
          symbol,
        });
      }

      const snapshotDate = toDateOnly(row.prediction_date);
      const quality = factor(row.quality_score, "prediction_registry.quality_score", snapshotDate);
      const growth = factor(row.growth_score, "prediction_registry.growth_score", snapshotDate);
      const momentum = factor(row.momentum_score, "prediction_registry.momentum_score", snapshotDate);
      const value = factor(row.value_score, "prediction_registry.value_score", snapshotDate);
      const risk = factor(row.risk_score, "prediction_registry.risk_score", snapshotDate);
      const stability = factor(row.sector_score, "prediction_registry.sector_score", snapshotDate);

      return reply.send({
        symbol,
        companyName: null,
        healthScore: toScore(row.ranking_score),
        classification: row.classification,
        confidence: {
          score: toScore(row.confidence_score),
          level: row.confidence_level,
          source: "prediction_registry.confidence_score",
          snapshotDate,
        },
        factors: {
          quality,
          growth,
          momentum,
          value,
          risk,
          stability,
        },
        narrative: generateNarrative({
          classification: row.classification,
          quality: quality.score,
          growth: growth.score,
          momentum: momentum.score,
          value: value.score,
          risk: risk.score,
          stability: stability.score,
        }),
        lastUpdated: snapshotDate,
        lineage: {
          sourceTable: "prediction_registry",
          rawSymbol: row.symbol,
          normalizedSymbol: symbol,
          responseTimeMs: Date.now() - startedAt,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "UNKNOWN_STOCKSTORY_ERROR";
      return reply.status(500).send({
        code: "STOCKSTORY_ENDPOINT_ERROR",
        symbol,
        message,
      });
    }
  });
};

export default stockstoryRoutes;
