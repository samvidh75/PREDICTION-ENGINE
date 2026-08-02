/**
 * Lensory Technical Stress Simulator
 *
 * Simulates how changes in price momentum or volatility
 * affect technical context and thesis timing.
 */

import type { TechnicalEngineOutput } from "../types";
import type { ScenarioAssumptions, ScenarioOutput, ScenarioImpact } from "./ScenarioTypes";
import { deriveDeltas, safeSimulatedScore, scoreDelta, computeScenarioConfidence } from "./ScenarioUtils";

export interface TechnicalSimResult {
  trendScore: number | null;
  momentumScore: number | null;
  volatilityScore: number | null;
  volumeScore: number | null;
  compositeScore: number | null;
}

export class TechnicalStressSimulator {
  simulate(
    base: TechnicalEngineOutput,
    assumptions: ScenarioAssumptions
  ): TechnicalSimResult {
    const deltas = deriveDeltas(assumptions);

    let momentumScore: number | null = base.momentumScore;
    let volatilityScore: number | null = base.volatilityScore;
    const trendScore: number | null = base.trendScore;
    const volumeScore: number | null = base.volumeScore;

    // Momentum delta directly affects momentum score
    if (momentumScore !== null && deltas.priceMomentumDelta !== null) {
      momentumScore = safeSimulatedScore(
        momentumScore + momentumScore * (deltas.priceMomentumDelta / 100)
      );
    }

    // Volatility delta — higher vol = lower score (more uncertain)
    if (volatilityScore !== null && deltas.volatilityDelta !== null) {
      // Higher volatility reduces the volatility score
      volatilityScore = safeSimulatedScore(
        volatilityScore - volatilityScore * (deltas.volatilityDelta / 100)
      );
    }

    const components = [trendScore, momentumScore, volatilityScore, volumeScore];
    const valid = components.filter((c) => c !== null) as number[];
    const composite = valid.length > 0
      ? safeSimulatedScore(valid.reduce((a, b) => a + b, 0) / valid.length)
      : base.score;

    return { trendScore, momentumScore, volatilityScore, volumeScore, compositeScore: composite };
  }

  buildScenarioOutput(
    symbol: string,
    assumptions: ScenarioAssumptions,
    base: TechnicalEngineOutput,
    simulated: TechnicalSimResult
  ): ScenarioOutput {
    const deltas = deriveDeltas(assumptions);
    const confidence = computeScenarioConfidence(
      [base.score, base.momentumScore, base.volatilityScore, base.trendScore, base.volumeScore],
      [simulated.compositeScore, simulated.momentumScore, simulated.volatilityScore, simulated.trendScore, simulated.volumeScore]
    );

    const overallDelta = scoreDelta(base.score, simulated.compositeScore);
    const impact = this.buildImpact(base, simulated, deltas, overallDelta);

    return {
      id: `scenario-technical-${symbol}-${Date.now()}`,
      symbol,
      scenarioKind: "technical_regime_change",
      severity: "moderate",
      createdAt: new Date().toISOString(),
      assumptions,
      impact,
      simulatedScores: {
        technical: simulated.compositeScore,
      },
      confidence,
      dataCompleteness: base.confidence ?? 0.5,
      watchNext: this.buildWatchNext(deltas),
      reviewTriggers: this.buildReviewTriggers(base, simulated, overallDelta),
      limitations: [
        "Technical simulations are based on simplified momentum/volatility models.",
        "Technical context is supplementary to fundamental analysis.",
        "Price patterns and market psychology are not modeled.",
        "Not a forecast. Not a guarantee. For research use only.",
      ],
    };
  }

  private buildImpact(
    base: TechnicalEngineOutput,
    _sim: TechnicalSimResult,
    deltas: ReturnType<typeof deriveDeltas>,
    overallDelta: number | null
  ): ScenarioImpact {
    const thesisImpact =
      overallDelta !== null
        ? Math.abs(overallDelta) > 2
          ? `Under this technical scenario, price momentum and volatility could shift. This may affect timing context and short-term thesis confidence. Business fundamentals are unchanged by technical movements.`
          : "Technical context shows limited change under these assumptions."
        : "Insufficient data to assess technical impact.";

    const parts: string[] = [];
    if (deltas.priceMomentumDelta !== null) {
      parts.push(
        deltas.priceMomentumDelta > 0
          ? "Momentum could improve under this scenario."
          : "Momentum could weaken under this scenario."
      );
    }
    if (deltas.volatilityDelta !== null) {
      parts.push(
        deltas.volatilityDelta > 0
          ? "Volatility could increase, adding uncertainty."
          : "Volatility could decrease, suggesting calmer conditions."
      );
    }

    return {
      thesisImpact,
      financialImpact: "Technical movements do not change financial fundamentals.",
      valuationImpact: "Technical context may influence timing but not intrinsic value.",
      earningsImpact: "Technical movements do not change earnings fundamentals.",
      riskImpact: "Higher volatility may raise short-term risk; lower volatility may reduce it.",
      technicalImpact: parts.join(" "),
      sectorImpact: "Technical simulations are company-specific.",
      peerImpact: "Technical simulations use company-specific assumptions.",
      simulatedScore: _sim.compositeScore ?? base.score,
      scoreDelta: overallDelta,
      simulatedScoreBand: this.toBand(_sim.compositeScore ?? base.score),
      baseScoreBand: this.toBand(base.score),
    };
  }

  private buildWatchNext(
    deltas: ReturnType<typeof deriveDeltas>
  ): string[] {
    const items: string[] = [];
    if (deltas.priceMomentumDelta !== null) {
      items.push("Watch price trend and moving average crossovers.");
    }
    if (deltas.volatilityDelta !== null) {
      items.push("Monitor volatility indicators (ATR, Bollinger Band width).");
    }
    if (items.length === 0) items.push("Monitor regular price and volume data.");
    return items;
  }

  private buildReviewTriggers(
    base: TechnicalEngineOutput,
    sim: TechnicalSimResult,
    overallDelta: number | null
  ): string[] {
    const triggers: string[] = [];
    if (overallDelta !== null && Math.abs(overallDelta) > 12) {
      triggers.push("Technical regime shift > 12 points — reassess thesis timing.");
    }
    return triggers;
  }

  private toBand(score: number): string {
    if (score >= 80) return "Favorable technical context";
    if (score >= 60) return "Positive technical setup";
    if (score >= 40) return "Neutral technical context";
    if (score >= 20) return "Concerning technical pattern";
    return "Bearish technical context";
  }
}
