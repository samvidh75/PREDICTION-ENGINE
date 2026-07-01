/**
 * Lensory Sector Stress Simulator
 *
 * Simulates how sector-wide valuation and growth changes
 * affect the sector-relative assessment of a company.
 */

import type { SectorEngineOutput } from "../types";
import type { ScenarioAssumptions, ScenarioOutput, ScenarioImpact } from "./ScenarioTypes";
import { deriveDeltas, safeSimulatedScore, scoreDelta, computeScenarioConfidence } from "./ScenarioUtils";

export interface SectorSimResult {
  compositeScore: number | null;
}

export class SectorStressSimulator {
  simulate(
    base: SectorEngineOutput,
    assumptions: ScenarioAssumptions
  ): SectorSimResult {
    const deltas = deriveDeltas(assumptions);
    let score: number | null = base.score;

    // Sector PE compression or expansion affects relative positioning
    if (score !== null && deltas.sectorMedianPeDelta !== null) {
      // Sector PE expansion = company looks relatively cheaper (score improvement)
      // Sector PE compression = company looks relatively more expensive (score decline)
      score = safeSimulatedScore(
        score - score * (deltas.sectorMedianPeDelta / 100) * 0.5
      );
    }

    // Sector growth changes affect growth comparison
    if (score !== null && deltas.sectorGrowthDelta !== null) {
      score = safeSimulatedScore(
        score - score * (deltas.sectorGrowthDelta / 100) * 0.3
      );
    }

    return { compositeScore: score };
  }

  buildScenarioOutput(
    symbol: string,
    assumptions: ScenarioAssumptions,
    base: SectorEngineOutput,
    simulated: SectorSimResult
  ): ScenarioOutput {
    const deltas = deriveDeltas(assumptions);
    const confidence = computeScenarioConfidence(
      [base.score],
      [simulated.compositeScore]
    );

    const overallDelta = scoreDelta(base.score, simulated.compositeScore);
    const impact = this.buildImpact(base, simulated, deltas, overallDelta);

    return {
      id: `scenario-sector-${symbol}-${Date.now()}`,
      symbol,
      scenarioKind: "sector_shock",
      severity: "moderate",
      createdAt: new Date().toISOString(),
      assumptions,
      impact,
      simulatedScores: {
        sector: simulated.compositeScore,
      },
      confidence,
      dataCompleteness: base.confidence ?? 0.5,
      watchNext: this.buildWatchNext(deltas),
      reviewTriggers: this.buildReviewTriggers(base, simulated, overallDelta),
      limitations: [
        "Sector simulations use simplified sector-wide assumptions.",
        "Company-specific factors may override sector trends.",
        "Sector composition changes are not modeled.",
        "Not a forecast. Not a guarantee. For research use only.",
      ],
    };
  }

  private buildImpact(
    base: SectorEngineOutput,
    _sim: SectorSimResult,
    deltas: ReturnType<typeof deriveDeltas>,
    overallDelta: number | null
  ): ScenarioImpact {
    const headwindOrTailwind =
      overallDelta !== null && overallDelta < 0 ? "headwind" : "tailwind";

    const thesisImpact =
      overallDelta !== null
        ? Math.abs(overallDelta) > 2
          ? `Under this sector scenario, sector ${headwindOrTailwind}s could affect the company's relative positioning. Company-specific fundamentals may show resilience or vulnerability.`
          : "Sector context shows limited change under these assumptions."
        : "Insufficient data to assess sector impact.";

    const parts: string[] = [];
    if (deltas.sectorMedianPeDelta !== null) {
      const action = deltas.sectorMedianPeDelta > 0 ? "expand" : "compress";
      parts.push(`Sector median PE could ${action} by ${Math.abs(deltas.sectorMedianPeDelta)}%.`);
    }
    if (deltas.sectorGrowthDelta !== null) {
      const action = deltas.sectorGrowthDelta > 0 ? "accelerate" : "decelerate";
      parts.push(`Sector growth could ${action} by ${Math.abs(deltas.sectorGrowthDelta)}%.`);
    }

    return {
      thesisImpact,
      financialImpact: "Sector changes do not directly change company financials.",
      valuationImpact: "Sector-wide multiple shifts may affect relative valuation context.",
      earningsImpact: "Sector growth changes may influence earnings expectations.",
      riskImpact: "Sector headwinds or tailwinds may affect perceived risk.",
      technicalImpact: "Sector changes may influence sector-level technical indicators.",
      sectorImpact: parts.join(" "),
      peerImpact: "Sector-wide assumptions affect peer comparisons indirectly.",
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
    if (deltas.sectorMedianPeDelta !== null) {
      items.push("Monitor sector PE trends and re-rating catalysts.");
    }
    if (deltas.sectorGrowthDelta !== null) {
      items.push("Watch sector-level growth indicators and industry reports.");
    }
    if (items.length === 0) items.push("Monitor sector developments regularly.");
    return items;
  }

  private buildReviewTriggers(
    base: SectorEngineOutput,
    sim: SectorSimResult,
    overallDelta: number | null
  ): string[] {
    const triggers: string[] = [];
    if (overallDelta !== null && Math.abs(overallDelta) > 8) {
      triggers.push("Sector context shift > 8 points — review thesis.");
    }
    return triggers;
  }

  private toBand(score: number): string {
    if (score >= 80) return "Favorable sector position";
    if (score >= 60) return "Above-average sector context";
    if (score >= 40) return "Neutral sector context";
    if (score >= 20) return "Below-average sector context";
    return "Unfavorable sector position";
  }
}
