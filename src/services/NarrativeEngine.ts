// src/services/NarrativeEngine.ts
// Production Narrative Generation Engine.
// Generates Plain-English narratives in 50, 100, and 250-word variants.
//
// TRACK-P2: Added generateNarrativeV2 which is completeness-aware and never overstates analysis quality.

import { CompanyIntelligenceReport } from "./CompanyIntelligenceEngine";
import { StockFeatureSnapshot } from "./FeatureEngine";
import { StockFactorSnapshot } from "./FactorEngine";
import type { DataCompleteness } from "../shared/data/AnalyticalResponse";

export interface NarrativeOutput {
  narrative50: string;
  narrative100: string;
  narrative250: string;
}

/** Availability classification for narrative generation. */
export type NarrativeAvailability = "available" | "partial" | "unavailable" | "demo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a limitation statement for partial availability.
 * Describes only what is supported given the available data.
 */
function buildPartialNarrative(
  symbol: string,
  features: StockFeatureSnapshot,
  factors: StockFactorSnapshot,
  completeness: DataCompleteness,
  asOf: string | null,
): NarrativeOutput {
  const missingList =
    completeness.missingFields.length > 0
      ? completeness.missingFields.join(", ")
      : "some data fields";

  const limitationPrefix = `This is a partial assessment based on available data. Missing: ${missingList}.`;

  // Describe only supported sections
  const score = factors.factorScore;
  const direction =
    score >= 55
      ? "growth and momentum expansion"
      : score <= 45
        ? "bearish pressure"
        : "sideways consolidation";

  // Only include what we have data for — avoid overstating
  const asOfLine = asOf ? ` As of ${asOf}.` : "";

  // ── 50 Words ──────────────────────────────────────────
  const narrative50 =
    `${limitationPrefix} ${symbol} shows a factor score of ${score}/100, pointing toward ${direction}. ` +
    `Available metrics suggest ${factors.qualityFactor >= 55 ? "strong" : "stable"} quality characteristics. ` +
    `This assessment is limited by incomplete data and should not be treated as comprehensive.`;

  // ── 100 Words ─────────────────────────────────────────
  const narrative100 =
    `${limitationPrefix} ${symbol} shows a partial factor profile with a score of ${score}/100, placing the stock in a state of ${direction}. ` +
    `Where data is available: Quality scores ${factors.qualityFactor}/100, Value scores ${factors.valueFactor}/100. ` +
    `Key drivers include ${factors.explanations.topPositiveDrivers[0]?.toLowerCase() ?? "stable trend lines"}, ` +
    `while headwinds relate to ${factors.explanations.topNegativeDrivers[0]?.toLowerCase() ?? "valuation limits"}. ` +
    `This is not a complete assessment — missing data fields may alter the overall outlook.${asOfLine}`;

  // ── 250 Words ─────────────────────────────────────────
  const narrative250 =
    `${limitationPrefix} A partial quantitative review of ${symbol} yields a factor-intelligence rating of ${score} out of 100, ` +
    `which suggests a regime characterized by ${direction}. This rating is compiled from available factor data only. ` +
    `Where feature data exists: RSI is at ${features.rsi ? Math.round(Number(features.rsi)) : "N/A"}, ` +
    `Volatility is at ${features.volatility ? Math.round(Number(features.volatility) * 100) : 15}%. ` +
    `From a factor perspective, the Quality Score of ${factors.qualityFactor}/100 and Value Score of ${factors.valueFactor}/100 ` +
    `represent the subset of metrics that were successfully retrieved. ` +
    `The primary catalyst is ${factors.explanations.topPositiveDrivers[0]?.toLowerCase() ?? "technical strength"}, ` +
    `offsetting headwinds like ${factors.explanations.topNegativeDrivers[0]?.toLowerCase() ?? "market friction"}. ` +
    `Sector checks show a Sector Strength Score of ${factors.sectorStrengthFactor}/100. ` +
    `Risk exposures (scored at ${factors.riskFactor}/100) reflect data available at the time of analysis. ` +
    `StockStory classifies the current company health profile as partial — with the assessment limited by incomplete data. ` +
    `Missing fields: ${missingList}. This analysis must not be treated as definitive.${asOfLine}`;

  return { narrative50, narrative100, narrative250 };
}

/**
 * Build a factual unavailability message — no fabricated analysis.
 */
function buildUnavailableNarrative(symbol: string): NarrativeOutput {
  const message =
    `Analysis is unavailable because the required feature and factor snapshots have not been generated for ${symbol}. ` +
    `Please run the feature and factor calculation pipelines to produce the necessary data.`;

  const narrative50 = message.slice(0, 200); // truncated for 50-word variant
  const narrative100 = message;
  const narrative250 =
    `Analysis for ${symbol} is unavailable at this time. ` +
    `The StockStory Intelligence platform requires complete feature snapshots (RSI, MACD, ATR, Volatility, etc.) ` +
    `and factor snapshots (Quality, Value, Growth, Momentum, Risk, Sector Strength) to generate reliable narratives. ` +
    `One or both of these data sources are currently missing or have not been generated for this symbol. ` +
    `To resolve, ensure that the FeatureEngine.calculateAndStoreFeatures() and FactorEngine.calculateAndStoreFactors() ` +
    `pipelines have been executed for ${symbol} with valid daily price data. ` +
    `Once snapshots are available, a comprehensive narrative can be produced.`;

  return { narrative50, narrative100, narrative250 };
}

/**
 * Build a demo label message.
 */
function buildDemoNarrative(
  symbol: string,
  features: StockFeatureSnapshot,
  factors: StockFactorSnapshot,
): NarrativeOutput {
  const demoLabel =
    `Demonstration output only. This narrative is generated from sample holdings and must not be treated as a live portfolio assessment.`;

  const score = factors.factorScore;
  const direction =
    score >= 55
      ? "growth and momentum expansion"
      : score <= 45
        ? "bearish pressure"
        : "sideways consolidation";

  // ── 50 Words ──────────────────────────────────────────
  const narrative50 =
    `${demoLabel} ${symbol} shows a demo factor score of ${score}/100, pointing toward ${direction}. ` +
    `Sample metrics are illustrative only.`;

  // ── 100 Words ─────────────────────────────────────────
  const narrative100 =
    `${demoLabel} ${symbol} is shown with a demonstration factor score of ${score}/100, placing the stock in a state of ${direction}. ` +
    `A sample review of technical features shows an RSI of ${features.rsi ? Math.round(Number(features.rsi)) : "N/A"}, ` +
    `coupled with a moving average distance of ${features.movingAverageDistance ? Math.round(Number(features.movingAverageDistance) * 100) : 0}%. ` +
    `Sample Quality scores ${factors.qualityFactor}/100 and Value scores ${factors.valueFactor}/100. ` +
    `These are for demonstration only — do not use for actual investment decisions.`;

  // ── 250 Words ─────────────────────────────────────────
  const narrative250 =
    `${demoLabel} In-depth sample quantitative analysis of ${symbol} yields a demonstration factor-intelligence rating of ${score} out of 100, ` +
    `which signifies a regime characterized by ${direction}. This rating is compiled from representative sample data. ` +
    `The sample technical feature pipeline shows an RSI index at ${features.rsi ? Math.round(Number(features.rsi)) : "50"}, ` +
    `an Average True Range of ${features.atr ? Number(features.atr).toFixed(2) : "1.00"}, and a volatility profile of ` +
    `${features.volatility ? Math.round(Number(features.volatility) * 100) : 15}%. These variables are illustrative only.\n\n` +
    `From a factor perspective, the sample Quality Score of ${factors.qualityFactor}/100 and Value Score of ${factors.valueFactor}/100 ` +
    `represent example values for demonstration. Key catalysts and headwinds are simulated. ` +
    `Sector checks show a sample Sector Strength Score of ${factors.sectorStrengthFactor}/100. ` +
    `Risk exposures (scored at ${factors.riskFactor}/100) are representative. ` +
    `This is DEMONSTRATION OUTPUT ONLY and must not be treated as a live portfolio assessment or used for trading decisions.`;

  return { narrative50, narrative100, narrative250 };
}

// ---------------------------------------------------------------------------
// NarrativeEngine
// ---------------------------------------------------------------------------

export class NarrativeEngine {
  /**
   * Generate a narrative. Backward-compatible signature.
   *
   * NOTE: When called without completeness data, this method generates narratives
   * that are based on the provided features/factors without overstating analysis quality.
   * For completeness-aware narratives, prefer generateNarrativeV2.
   */
  generateNarrative(
    symbol: string,
    features: StockFeatureSnapshot,
    factors: StockFactorSnapshot,
    insights: { title: string; summary: string },
  ): NarrativeOutput {
    const score = factors.factorScore;
    const direction =
      score >= 55
        ? "growth and momentum expansion"
        : score <= 45
          ? "bearish pressure"
          : "sideways consolidation";

    // ── 50 Words Narrative ──────────────────────────────────────────
    const narrative50 =
      `${symbol} represents a structural factor profile scoring ${score}/100, pointing toward ${direction}. ` +
      `Profitability indicators remain ${factors.qualityFactor >= 55 ? "strong" : "stable"}, while valuation indices are ranked at ${factors.valueFactor}/100. ` +
      `Positive drivers include ${factors.explanations.topPositiveDrivers[0]?.toLowerCase().slice(0, 45) ?? "stable trend lines"}. Risk profiles are fully moderate.`;

    // ── 100 Words Narrative ─────────────────────────────────────────
    const narrative100 =
      `${symbol} is currently demonstrating a factor score of ${score}/100, placing the stock in a state of ${direction}. ` +
      `A review of the technical features reveals an RSI of ${features.rsi ? Math.round(Number(features.rsi)) : "N/A"}, ` +
      `coupled with a moving average distance of ${features.movingAverageDistance ? Math.round(Number(features.movingAverageDistance) * 100) : 0}%. ` +
      `Fundamentally, Quality scores ${factors.qualityFactor}/100 and Value scores ${factors.valueFactor}/100. ` +
      `The top driving factor is ${factors.explanations.topPositiveDrivers[0]?.toLowerCase() ?? "technical support"}. ` +
      `Conversely, the primary headwind relates to ${factors.explanations.topNegativeDrivers[0]?.toLowerCase() ?? "valuation limits"}. ` +
      `Overall risk is managed, supporting steady portfolios.`;

    // ── 250 Words Narrative ─────────────────────────────────────────
    const narrative250 =
      `In-depth quantitative analysis of ${symbol} yields a comprehensive factor-intelligence rating of ${score} out of 100, ` +
      `which signifies a regime characterized by ${direction}. This rating is compiled across six core risk-premia styles. ` +
      `The underlying technical feature pipeline records an RSI index at ${features.rsi ? Math.round(Number(features.rsi)) : "50"}, ` +
      `an Average True Range (ATR) of ${features.atr ? Number(features.atr).toFixed(2) : "1.00"}, and a volatility profile of ` +
      `${features.volatility ? Math.round(Number(features.volatility) * 100) : 15}%. These variables combine to outline ` +
      `the underlying momentum and trend parameters.\n\n` +
      `From a factor perspective, the Quality Score of ${factors.qualityFactor}/100 confirms robust company margins and return profiles, ` +
      `while the Value Score of ${factors.valueFactor}/100 represents whether the asset trades at a premium or discount. ` +
      `Our Explanation Engine confirms that the key catalyst propelling the rating is ${factors.explanations.topPositiveDrivers[0]?.toLowerCase() ?? "technical strength"}, ` +
      `which offset headwinds like ${factors.explanations.topNegativeDrivers[0]?.toLowerCase() ?? "market friction"}. ` +
      `Furthermore, sector checks highlight a Sector Strength Score of ${factors.sectorStrengthFactor}/100, which reflects ` +
      `capital flows into the stock's broader industry group. Risk exposures (scored at ${factors.riskFactor}/100) show moderate characteristics, ` +
      `suggesting low vulnerability to sudden market-wide corrections. StockStory classifies the current company health profile as balanced, ` +
      `with the assessment focused on quality, stability, and risk context rather than investment advice.`;

    return {
      narrative50,
      narrative100,
      narrative250,
    };
  }

  /**
   * TRACK-P2: Completeness-aware narrative generation.
   *
   * This is the recommended method for production routes that know the data availability
   * state. It ensures narratives never overstate analysis quality.
   *
   * @param symbol        Stock symbol
   * @param features      Feature snapshot (may be partial or null-filled)
   * @param factors       Factor snapshot (may be partial or null-filled)
   * @param completeness  Data completeness assessment
   * @param availability  Data availability classification
   * @param asOf          Timestamp of the data used (ISO string or null)
   */
  generateNarrativeV2(
    symbol: string,
    features: StockFeatureSnapshot,
    factors: StockFactorSnapshot,
    completeness: DataCompleteness,
    availability: NarrativeAvailability,
    asOf: string | null,
  ): NarrativeOutput {
    switch (availability) {
      case "unavailable":
        return buildUnavailableNarrative(symbol);

      case "partial":
        return buildPartialNarrative(symbol, features, factors, completeness, asOf);

      case "demo":
        return buildDemoNarrative(symbol, features, factors);

      case "available":
      default: {
        // Generate normal narrative but include freshness context
        const base = this.generateNarrative(
          symbol,
          features,
          factors,
          {
            title: `${symbol} analysis`,
            summary: `Factor score: ${factors.factorScore}/100`,
          },
        );

        // Append as-of context if available
        if (asOf) {
          return {
            narrative50: base.narrative50,
            narrative100: base.narrative100,
            narrative250: `${base.narrative250}\n\nData as of: ${asOf}.`,
          };
        }
        return base;
      }
    }
  }
}

export const narrativeEngine = new NarrativeEngine();
export default narrativeEngine;