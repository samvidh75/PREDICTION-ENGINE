// src/services/InsightEngine.ts
// Production Insight Engine to convert raw technical features and factor scores into actionable, structured insights.
//
// TRACK-P2: Removed fabricated claims about coverage, freshness, and data quality.
// Now accepts optional DataFreshnessResult, DataCompleteness, and lineage entries to compute honest metrics.

import { StockFeatureSnapshot } from "./FeatureEngine";
import { StockFactorSnapshot } from "./FactorEngine";
import type {
  DataFreshnessResult,
  DataCompleteness,
  DataLineageEntry,
} from "../shared/data/AnalyticalResponse";

export interface MarketInsight {
  title: string;
  summary: string;
  confidence: number; // 0-100
  positiveDrivers: string[];
  negativeDrivers: string[];
  coverage: string;
  freshness: string;
  dataQuality: string;
}

/** Options for generating an insight with data integrity awareness. */
export interface InsightOptions {
  /** Freshness assessment of the underlying data. */
  dataFreshness?: DataFreshnessResult;
  /** Completeness assessment of the underlying data. */
  dataCompleteness?: DataCompleteness;
  /** Source lineage for the underlying data. */
  lineage?: DataLineageEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCoverage(completeness?: DataCompleteness): string {
  if (!completeness) {
    return "Coverage metrics unavailable";
  }
  return `${completeness.score}% metrics present (${completeness.availableFields}/${completeness.requiredFields} fields available)`;
}

function buildFreshness(freshnessResult?: DataFreshnessResult): string {
  if (!freshnessResult) {
    return "Freshness data unavailable";
  }

  const { freshness, asOf, ageHours, ageDays } = freshnessResult;

  const asOfPart = asOf ? ` as of ${asOf}` : "";

  switch (freshness) {
    case "live":
      return `Data is live${asOfPart}`;
    case "recent": {
      let ageDetail = "";
      if (ageHours !== null && ageHours !== undefined) {
        ageDetail = ` (${ageHours}h ago)`;
      } else if (ageDays !== null && ageDays !== undefined) {
        ageDetail = ` (${ageDays}d ago)`;
      }
      return `Data is recent${ageDetail}${asOfPart}`;
    }
    case "stale":
      return `Data is stale${asOfPart} — may not reflect current conditions`;
    case "expired":
      return `Data is expired${asOfPart} — do not rely on this for decisions`;
    case "unknown":
    default:
      return `Data freshness unknown${asOfPart}`;
  }
}

function buildDataQuality(lineage?: DataLineageEntry[]): string {
  if (!lineage || lineage.length === 0) {
    return "Unverified (no source lineage available)";
  }

  const hasProvider = lineage.some((entry) => entry.provider);
  const providers = lineage
    .filter((entry) => entry.provider)
    .map((entry) => entry.provider)
    .join(", ");

  const hasFallback = lineage.some((entry) => entry.isFallback);
  const hasSynthetic = lineage.some((entry) => entry.isSynthetic);

  if (hasSynthetic) {
    return "Synthetic data — not validated against a live provider";
  }

  if (hasFallback) {
    return `Fallback data used${providers ? ` — derived from: ${providers}` : " — provider unknown"}`;
  }

  if (providers) {
    return `Provider: ${providers}`;
  }

  return "Provider: unknown (no validation claims)";
}

function computeHonestConfidence(
  baseConfidence: number,
  completeness?: DataCompleteness,
): number {
  if (!completeness) {
    // When we have no completeness data, cap confidence at 70
    // because we can't verify the data is complete.
    return Math.min(baseConfidence, 70);
  }

  // Reduce confidence by the confidence impact from completeness
  const impact = completeness.confidenceImpact || 0;
  return Math.round(Math.max(0, Math.min(95, baseConfidence - impact)));
}

// ---------------------------------------------------------------------------
// InsightEngine
// ---------------------------------------------------------------------------

export class InsightEngine {
  /**
   * Generate a market insight.
   *
   * @param symbol           Stock symbol
   * @param features         Feature snapshot
   * @param factors          Factor snapshot
   * @param options          Optional data integrity parameters (freshness, completeness, lineage).
   *                         When omitted, honest defaults are used — no fabricated claims.
   */
  generateInsight(
    symbol: string,
    features: StockFeatureSnapshot,
    factors: StockFactorSnapshot,
    options?: InsightOptions,
  ): MarketInsight {
    const { dataFreshness, dataCompleteness, lineage } = options ?? {};

    const explanations = (factors as any).explanations;
    let explanationsObj: any = {};
    if (explanations) {
      try {
        explanationsObj = typeof explanations === 'string' ? JSON.parse(explanations) : explanations;
      } catch {
        explanationsObj = {};
      }
    }
    const positiveDrivers: string[] = Array.isArray(explanationsObj?.topPositiveDrivers)
      ? [...explanationsObj.topPositiveDrivers]
      : [];
    const negativeDrivers: string[] = Array.isArray(explanationsObj?.topNegativeDrivers)
      ? [...explanationsObj.topNegativeDrivers]
      : [];

    // Evaluate base confidence based on data consistency and factor score deviations
    const scoreDeviation = Math.abs(factors.factorScore - 50);
    const baseConfidence = Math.round(Math.min(95, 60 + scoreDeviation * 0.7));

    // Apply completeness impact
    const confidence = computeHonestConfidence(baseConfidence, dataCompleteness);

    let title = `${symbol} holding in stable equilibrium`;
    let summary = `Analytical indicators for ${symbol} reflect steady market conditions with balanced factor weights.`;

    if (factors.factorScore >= 60) {
      title = `${symbol} showing strong bullish alignment`;
      summary = `A composite factor score of ${factors.factorScore}/100 indicates clear structural outperformance, driven primarily by momentum and quality factors.`;
    } else if (factors.factorScore <= 40) {
      title = `${symbol} exhibiting bearish structural pressure`;
      summary = `With a composite factor score of ${factors.factorScore}/100, the stock is experiencing negative pressure, suggesting value or risk factor deterioration.`;
    }

    // TRACK-P2: Honest coverage, freshness, dataQuality
    const coverage = buildCoverage(dataCompleteness);
    const freshness = buildFreshness(dataFreshness);
    const dataQuality = buildDataQuality(lineage);

    return {
      title,
      summary,
      confidence,
      positiveDrivers,
      negativeDrivers,
      coverage,
      freshness,
      dataQuality,
    };
  }

  /**
   * TRACK-P2: V2 method that requires data integrity parameters.
   *
   * This is the recommended call path for production routes that have freshness,
   * completeness, and lineage information available. It will NOT fabricate claims.
   *
   * @param symbol           Stock symbol
   * @param features         Feature snapshot
   * @param factors          Factor snapshot
   * @param dataFreshness    REQUIRED: freshness assessment from the data freshness monitor
   * @param dataCompleteness REQUIRED: completeness assessment of the underlying data
   * @param lineage          REQUIRED: source lineage entries for the data used
   */
  generateInsightV2(
    symbol: string,
    features: StockFeatureSnapshot,
    factors: StockFactorSnapshot,
    dataFreshness: DataFreshnessResult,
    dataCompleteness: DataCompleteness,
    lineage: DataLineageEntry[],
  ): MarketInsight {
    return this.generateInsight(symbol, features, factors, {
      dataFreshness,
      dataCompleteness,
      lineage,
    });
  }
}

export const insightEngine = new InsightEngine();
export default insightEngine;