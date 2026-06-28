/**
 * StockStory Valuation Stress Simulator
 *
 * Simulates how changes in valuation multiples (PE, PB, EV/EBITDA)
 * affect the valuation context and thesis assessment.
 */

import type { ValuationEngineOutput } from "../types";
import type { ScenarioAssumptions, ScenarioOutput, ScenarioImpact } from "./ScenarioTypes";
import { deriveDeltas, safeSimulatedScore, scoreDelta, computeScenarioConfidence } from "./ScenarioUtils";

export interface ValuationSimResult {
  peScore: number | null;
  pbScore: number | null;
  evEbitdaScore: number | null;
  fcfYieldScore: number | null;
  compositeScore: number | null;
}

export class ValuationStressSimulator {
  simulate(
    base: ValuationEngineOutput,
    assumptions: ScenarioAssumptions
  ): ValuationSimResult {
    const deltas = deriveDeltas(assumptions);

    // Multiple compression/expansion directly affects valuation scores
    const peScore = applyDeltaToScore(base.peScore, deltas.peMultipleDelta);
    const pbScore = applyDeltaToScore(base.pbScore, deltas.pbMultipleDelta);
    const evEbitdaScore = applyDeltaToScore(base.evEbitdaScore, deltas.evEbitdaDelta);
    const fcfYieldScore = base.fcfYieldScore; // FCF yield not directly affected by multiple changes

    const components = [peScore, pbScore, evEbitdaScore, fcfYieldScore];
    const valid = components.filter((c) => c !== null) as number[];
    const composite = valid.length > 0
      ? safeSimulatedScore(valid.reduce((a, b) => a + b, 0) / valid.length)
      : base.score;

    return { peScore, pbScore, evEbitdaScore, fcfYieldScore, compositeScore: composite };
  }

  buildScenarioOutput(
    symbol: string,
    assumptions: ScenarioAssumptions,
    base: ValuationEngineOutput,
    simulated: ValuationSimResult
  ): ScenarioOutput {
    const deltas = deriveDeltas(assumptions);
    const confidence = computeScenarioConfidence(
      [base.score, base.peScore, base.pbScore, base.evEbitdaScore],
      [simulated.compositeScore, simulated.peScore, simulated.pbScore, simulated.evEbitdaScore]
    );

    const overallDelta = scoreDelta(base.score, simulated.compositeScore);
    const impact = this.buildImpact(base, simulated, deltas, overallDelta);

    return {
      id: `scenario-valuation-${symbol}-${Date.now()}`,
      symbol,
      scenarioKind: "valuation_multiple_change",
      severity: "moderate",
      createdAt: new Date().toISOString(),
      assumptions,
      impact,
      simulatedScores: {
        valuation: simulated.compositeScore,
      },
      confidence,
      dataCompleteness: base.confidence,
      watchNext: this.buildWatchNext(deltas),
      reviewTriggers: this.buildReviewTriggers(base, simulated, overallDelta),
      limitations: [
        "Valuation simulation uses simplified linear multiple-compression logic.",
        "Multiples interact with fundamentals; this treats them independently.",
        "Market sentiment and macro factors are not simulated.",
        "Not a forecast. Not a guarantee. For research use only.",
      ],
    };
  }

  private buildImpact(
    base: ValuationEngineOutput,
    sim: ValuationSimResult,
    deltas: ReturnType<typeof deriveDeltas>,
    overallDelta: number | null
  ): ScenarioImpact {
    const compressOrExpand =
      (deltas.peMultipleDelta ?? 0) < 0 ? "compressed" : "expanded";

    const thesisImpact =
      overallDelta !== null
        ? overallDelta > 2
          ? `Under these assumptions, valuation context could expand. Higher multiples may suggest market optimism, but could also signal limited margin of safety.`
          : overallDelta < -2
            ? `Under these assumptions, valuation context could become more conservative. Lower multiples may suggest a larger margin of safety, provided fundamentals are sound.`
            : `Valuation context shows limited change under these assumptions.`
        : "Insufficient data to assess valuation impact.";

    return {
      thesisImpact,
      valuationImpact: `Under these assumptions, valuation multiples may have ${compressOrExpand}. PE, PB, and EV/EBITDA could adjust by the assumed percentages. This is a hypothetical scenario, not a forecast.`,
      earningsImpact: "Valuation simulations focus on multiples, not earnings growth.",
      financialImpact: "Valuation simulations focus on multiples, not financial health.",
      riskImpact: "Lower multiples may suggest higher margin of safety; higher multiples may suggest increased valuation risk.",
      technicalImpact: "Valuation simulations do not directly affect technical context.",
      sectorImpact: "Valuation simulations are company-specific, not sector-driven.",
      peerImpact: "Valuation context may be assessed relative to peers in a separate analysis.",
      simulatedScore: sim.compositeScore ?? base.score,
      scoreDelta: overallDelta,
      simulatedScoreBand: this.toBand(sim.compositeScore ?? base.score),
      baseScoreBand: this.toBand(base.score),
    };
  }

  private buildWatchNext(deltas: ReturnType<typeof deriveDeltas>): string[] {
    const items: string[] = [];
    if (deltas.peMultipleDelta !== null) {
      items.push("Monitor PE multiple relative to sector and historical range.");
    }
    if (deltas.pbMultipleDelta !== null) {
      items.push("Watch PB multiple shifts relative to book value growth.");
    }
    if (deltas.evEbitdaDelta !== null) {
      items.push("Track EV/EBITDA for changes in enterprise valuation context.");
    }
    if (items.length === 0) items.push("Monitor valuation multiples regularly.");
    return items;
  }

  private buildReviewTriggers(
    base: ValuationEngineOutput,
    sim: ValuationSimResult,
    overallDelta: number | null
  ): string[] {
    const triggers: string[] = [];
    if (overallDelta !== null && Math.abs(overallDelta) > 15) {
      triggers.push("Valuation context shift > 15 points — review thesis.");
    }
    return triggers;
  }

  private toBand(score: number): string {
    if (score >= 80) return "Expensive relative to context";
    if (score >= 60) return "Above-average valuation";
    if (score >= 40) return "Fair valuation context";
    if (score >= 20) return "Below-average valuation";
    return "Attractive valuation context";
  }
}

function applyDeltaToScore(
  baseScore: number | null | undefined,
  delta: number | null | undefined
): number | null {
  if (baseScore == null || !Number.isFinite(baseScore)) return null;
  if (delta == null || !Number.isFinite(delta)) return baseScore;
  // Higher delta (expansion) = higher score (more expensive)
  // Lower delta (compression) = lower score (more attractive)
  return safeSimulatedScore(baseScore + baseScore * (delta / 100));
}
