/**
 * Lensory Earnings Stress Simulator
 *
 * Simulates how changes in revenue and profit growth assumptions
 * affect earnings quality and trajectory assessment.
 */

import type { FinancialEngineOutput } from "../types";
import type { ScenarioAssumptions, ScenarioOutput, ScenarioImpact } from "./ScenarioTypes";
import {
  deriveDeltas,
  safeSimulatedScore,
  scoreDelta,
  computeScenarioConfidence,
} from "./ScenarioUtils";

export interface EarningsSimResult {
  growthScore: number | null;
  qualityScore: number | null;
  compositeScore: number | null;
}

export class EarningsStressSimulator {
  simulate(
    base: FinancialEngineOutput,
    assumptions: ScenarioAssumptions
  ): EarningsSimResult {
    const deltas = deriveDeltas(assumptions);
    let growthScore: number | null = base.growthScore;
    let qualityScore: number | null = base.qualityScore;

    if (growthScore !== null) {
      const revImpact =
        deltas.revenueGrowthDelta !== null
          ? growthScore * (deltas.revenueGrowthDelta / 100) * 0.5
          : 0;
      const profImpact =
        deltas.profitGrowthDelta !== null
          ? growthScore * (deltas.profitGrowthDelta / 100) * 0.5
          : 0;
      growthScore = safeSimulatedScore(growthScore + revImpact + profImpact);
    }

    if (qualityScore !== null && deltas.operatingMarginDelta !== null) {
      qualityScore = safeSimulatedScore(
        qualityScore + qualityScore * (deltas.operatingMarginDelta / 100) * 0.3
      );
    }

    const components = [growthScore, qualityScore];
    const valid = components.filter((c) => c !== null) as number[];
    const compositeScore =
      valid.length > 0
        ? safeSimulatedScore(valid.reduce((a, b) => a + b, 0) / valid.length)
        : base.score;

    return { growthScore, qualityScore, compositeScore };
  }

  buildScenarioOutput(
    symbol: string,
    assumptions: ScenarioAssumptions,
    base: FinancialEngineOutput,
    simulated: EarningsSimResult
  ): ScenarioOutput {
    const deltas = deriveDeltas(assumptions);
    const confidence = computeScenarioConfidence(
      [base.growthScore, base.qualityScore, base.score],
      [simulated.growthScore, simulated.qualityScore, simulated.compositeScore]
    );

    const overallDelta = scoreDelta(base.score, simulated.compositeScore);
    const impact = this.buildImpact(base, simulated, deltas, overallDelta);

    return {
      id: `scenario-earnings-${symbol}-${Date.now()}`,
      symbol,
      scenarioKind: "earnings_growth_change",
      severity: "moderate",
      createdAt: new Date().toISOString(),
      assumptions,
      impact,
      simulatedScores: {
        growth: simulated.growthScore,
        quality: simulated.qualityScore,
        earnings: simulated.compositeScore,
      },
      confidence,
      dataCompleteness: base.dataCompleteness,
      watchNext: this.buildWatchNext(deltas),
      reviewTriggers: this.buildReviewTriggers(base, simulated, overallDelta),
      limitations: [
        "Earnings simulation treats growth and margin changes independently.",
        "Real-world earnings are affected by macro, competitive, and operational factors.",
        "This is a simplified sensitivity model, not a forecast.",
        "Not a forecast. Not a guarantee. For research use only.",
      ],
    };
  }

  private buildImpact(
    base: FinancialEngineOutput,
    sim: EarningsSimResult,
    deltas: ReturnType<typeof deriveDeltas>,
    overallDelta: number | null
  ): ScenarioImpact {
    const direction =
      overallDelta !== null && overallDelta > 0 ? "strengthen" : "weaken";

    const thesisImpact =
      overallDelta !== null
        ? Math.abs(overallDelta) > 2
          ? `Under these assumptions, earnings quality could ${direction}. Changes in growth expectations and margin assumptions may affect the earnings thesis.`
          : "Earnings profile shows limited change under these assumptions."
        : "Insufficient data to assess earnings impact.";

    const parts: string[] = [];
    if (deltas.revenueGrowthDelta !== null) {
      parts.push(
        deltas.revenueGrowthDelta > 0
          ? `Revenue growth could accelerate by ${Math.abs(deltas.revenueGrowthDelta)}% under this scenario.`
          : `Revenue growth could decelerate by ${Math.abs(deltas.revenueGrowthDelta)}% under this scenario.`
      );
    }
    if (deltas.profitGrowthDelta !== null) {
      parts.push(
        deltas.profitGrowthDelta > 0
          ? `Profit growth could accelerate by ${Math.abs(deltas.profitGrowthDelta)}% under this scenario.`
          : `Profit growth could decelerate by ${Math.abs(deltas.profitGrowthDelta)}% under this scenario.`
      );
    }
    if (deltas.operatingMarginDelta !== null) {
      parts.push(
        deltas.operatingMarginDelta > 0
          ? `Operating margins could widen by ${Math.abs(deltas.operatingMarginDelta)}% under this scenario.`
          : `Operating margins could compress by ${Math.abs(deltas.operatingMarginDelta)}% under this scenario.`
      );
    }

    return {
      thesisImpact,
      financialImpact: "Earnings simulation focuses on growth and quality, not leverage.",
      valuationImpact: "Earnings changes may indirectly affect valuation multiples.",
      earningsImpact: parts.join(" "),
      riskImpact: "Higher growth may reduce perceived risk; lower growth may increase risk concern.",
      technicalImpact: "Earnings simulations do not directly affect technical context.",
      sectorImpact: "Earnings simulations are company-specific.",
      peerImpact: "Earnings simulations use company-specific assumptions.",
      simulatedScore: sim.compositeScore ?? base.score,
      scoreDelta: overallDelta,
      simulatedScoreBand: this.toBand(sim.compositeScore ?? base.score),
      baseScoreBand: this.toBand(base.score),
    };
  }

  private buildWatchNext(
    deltas: ReturnType<typeof deriveDeltas>
  ): string[] {
    const items: string[] = [];
    if (deltas.revenueGrowthDelta !== null) {
      items.push("Monitor next quarterly revenue report.");
    }
    if (deltas.profitGrowthDelta !== null) {
      items.push("Watch next EPS announcement vs. prior quarter.");
    }
    if (deltas.operatingMarginDelta !== null) {
      items.push("Check margin trend in next earnings filing.");
    }
    if (items.length === 0) items.push("Monitor regular earnings filings.");
    return items;
  }

  private buildReviewTriggers(
    base: FinancialEngineOutput,
    sim: EarningsSimResult,
    overallDelta: number | null
  ): string[] {
    const triggers: string[] = [];
    if (overallDelta !== null && Math.abs(overallDelta) > 10) {
      triggers.push("Earnings assessment changed > 10 points — review thesis.");
    }
    if (
      sim.growthScore !== null &&
      base.growthScore !== null &&
      sim.growthScore < base.growthScore - 15
    ) {
      triggers.push("Growth score dropped > 15 points — significant thesis change.");
    }
    return triggers;
  }

  private toBand(score: number): string {
    if (score >= 80) return "Strong earnings quality";
    if (score >= 60) return "Good earnings trajectory";
    if (score >= 40) return "Fair earnings quality";
    if (score >= 20) return "Weak earnings";
    return "Poor earnings quality";
  }
}
