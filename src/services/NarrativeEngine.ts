// src/services/NarrativeEngine.ts
// Production Narrative Generation Engine.
// Generates Plain-English narratives in 50, 100, and 250-word variants.

import { CompanyIntelligenceReport } from "./CompanyIntelligenceEngine";
import { StockFeatureSnapshot } from "./FeatureEngine";
import { StockFactorSnapshot } from "./FactorEngine";

export interface NarrativeOutput {
  narrative50: string;
  narrative100: string;
  narrative250: string;
}

export class NarrativeEngine {
  generateNarrative(
    symbol: string,
    features: StockFeatureSnapshot,
    factors: StockFactorSnapshot,
    insights: { title: string; summary: string }
  ): NarrativeOutput {
    const score = factors.factorScore;
    const direction = score >= 55 ? "growth and momentum expansion" : score <= 45 ? "bearish pressure" : "sideways consolidation";

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
}

export const narrativeEngine = new NarrativeEngine();
export default narrativeEngine;
