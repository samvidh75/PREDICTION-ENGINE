/**
 * Lensory Risk Stress Simulator
 *
 * Simulates how a hypothetical risk event changes the risk assessment.
 * Models risk score propagation across risk dimensions.
 */

import type { RiskEngineOutput } from "../types";
import type { ScenarioAssumptions, ScenarioOutput, ScenarioImpact } from "./ScenarioTypes";
import { deriveDeltas, safeSimulatedScore, scoreDelta, computeScenarioConfidence } from "./ScenarioUtils";

export interface RiskSimResult {
  compositeScore: number | null;
}

export class RiskStressSimulator {
  simulate(
    base: RiskEngineOutput,
    assumptions: ScenarioAssumptions
  ): RiskSimResult {
    const deltas = deriveDeltas(assumptions);
    let riskScore: number | null = base.score;

    // Risk shock directly adjusts the score
    if (riskScore !== null && deltas.riskShockScoreDelta !== null) {
      riskScore = safeSimulatedScore(riskScore + deltas.riskShockScoreDelta);
    }

    // Debt changes also affect risk
    if (riskScore !== null && deltas.debtToEquityDelta !== null && deltas.debtToEquityDelta > 0) {
      riskScore = safeSimulatedScore(riskScore + deltas.debtToEquityDelta * 10);
    }

    return { compositeScore: riskScore };
  }

  buildScenarioOutput(
    symbol: string,
    assumptions: ScenarioAssumptions,
    base: RiskEngineOutput,
    simulated: RiskSimResult
  ): ScenarioOutput {
    const deltas = deriveDeltas(assumptions);
    const confidence = computeScenarioConfidence(
      [base.score],
      [simulated.compositeScore]
    );

    const overallDelta = scoreDelta(base.score, simulated.compositeScore);
    const impact = this.buildImpact(base, simulated, deltas, overallDelta);

    return {
      id: `scenario-risk-${symbol}-${Date.now()}`,
      symbol,
      scenarioKind: "risk_event",
      severity: "moderate",
      createdAt: new Date().toISOString(),
      assumptions,
      impact,
      simulatedScores: {
        risk: simulated.compositeScore,
      },
      confidence,
      dataCompleteness: base.confidence ?? 0.5,
      watchNext: this.buildWatchNext(deltas, simulated),
      reviewTriggers: this.buildReviewTriggers(base, simulated, overallDelta),
      limitations: [
        "Risk simulation models a hypothetical shock; real risk events are complex.",
        "Correlated risks are not modeled (e.g., debt + currency + sector risks).",
        "Risk scores are qualitative estimates, not precise measures.",
        "Not a forecast. Not a guarantee. For research use only.",
      ],
    };
  }

  private buildImpact(
    base: RiskEngineOutput,
    sim: RiskSimResult,
    _deltas: ReturnType<typeof deriveDeltas>,
    overallDelta: number | null
  ): ScenarioImpact {
    const severity =
      overallDelta !== null && overallDelta > 10 ? "significantly" :
      overallDelta !== null && overallDelta > 5 ? "moderately" : "slightly";

    const thesisImpact =
      overallDelta !== null
        ? Math.abs(overallDelta) > 2
          ? `Under this hypothetical scenario, risk could rise ${severity}. This may affect thesis confidence and review priority.`
          : "Risk assessment shows limited change under this scenario."
        : "Insufficient data to assess risk impact.";

    return {
      thesisImpact,
      financialImpact: "Risk events may affect financial stability, debt servicing, and capital allocation.",
      valuationImpact: "Higher perceived risk may compress valuation multiples.",
      earningsImpact: "Risk events may affect earnings confidence and growth sustainability.",
      riskImpact: `Under this scenario, risk score could change by ${overallDelta ?? 0 > 0 ? "+" : ""}${overallDelta?.toFixed(1) ?? "N/A"} points.${overallDelta !== null && overallDelta > 8 ? " This is a meaningful risk change that warrants attention." : ""}`,
      technicalImpact: "Risk events may affect price momentum and volatility.",
      sectorImpact: "Risk events may be sector-specific or company-specific.",
      peerImpact: "Risk assessment relative to peers should be reviewed separately.",
      simulatedScore: sim.compositeScore ?? base.score,
      scoreDelta: overallDelta,
      simulatedScoreBand: this.toRiskBand(sim.compositeScore ?? base.score),
      baseScoreBand: this.toRiskBand(base.score),
    };
  }

  private buildWatchNext(
    deltas: ReturnType<typeof deriveDeltas>,
    sim: RiskSimResult
  ): string[] {
    const items: string[] = [
      "Monitor company announcements and regulatory filings.",
    ];
    if (deltas.debtToEquityDelta !== null && deltas.debtToEquityDelta > 0) {
      items.push("Watch balance sheet debt levels in next filing.");
    }
    if (sim.compositeScore !== null && sim.compositeScore > 60) {
      items.push("Elevated risk — review management commentary and sector conditions.");
    }
    return items;
  }

  private buildReviewTriggers(
    base: RiskEngineOutput,
    sim: RiskSimResult,
    overallDelta: number | null
  ): string[] {
    const triggers: string[] = [];
    if (overallDelta !== null && Math.abs(overallDelta) > 8) {
      triggers.push("Risk score shift > 8 points — reassess thesis and watchlist priority.");
    }
    if (sim.compositeScore !== null && sim.compositeScore > 70) {
      triggers.push("Risk score above 70 under this scenario — may signal elevated concern.");
    }
    return triggers;
  }

  private toRiskBand(score: number): string {
    if (score >= 80) return "Elevated risk";
    if (score >= 60) return "Above-average risk";
    if (score >= 40) return "Moderate risk";
    if (score >= 20) return "Below-average risk";
    return "Low risk";
  }
}
