/**
 * Lensory Financial Stress Simulator
 *
 * Simulates how changes in financial assumptions affect
 * financial quality, growth, and leverage scores.
 *
 * Deterministic, evidence-bound, compliance-safe.
 * Uses simplified but grounded linear approximations.
 */

import type {
  FinancialEngineOutput,
} from "../types";
import type {
  ScenarioAssumptions,
  ScenarioOutput,
  ScenarioImpact,
} from "./ScenarioTypes";
import { deriveDeltas, applyDelta, safeSimulatedScore, scoreDelta, computeScenarioConfidence } from "./ScenarioUtils";

export interface FinancialSimResult {
  qualityScore: number | null;
  growthScore: number | null;
  debtScore: number | null;
  compositeScore: number | null;
}

export class FinancialStressSimulator {
  /** Simulate financial scores under assumption changes */
  simulate(
    base: FinancialEngineOutput,
    assumptions: ScenarioAssumptions
  ): FinancialSimResult {
    const deltas = deriveDeltas(assumptions);

    // ── Quality simulation ────────────────────────────────────
    // Quality is driven primarily by margins (ROE, ROA, ROIC)
    // Margin compression directly reduces quality
    let qualityScore: number | null = base.qualityScore;
    if (deltas.operatingMarginDelta !== null && qualityScore !== null) {
      // ~40% of quality score is margin-driven in FinancialEngine
      const marginWeight = 0.4;
      const impact = qualityScore * (deltas.operatingMarginDelta / 100) * marginWeight;
      qualityScore = safeSimulatedScore(qualityScore + impact);
    }

    // ── Growth simulation ─────────────────────────────────────
    // Growth score is driven by revenue & profit growth rates
    let growthScore: number | null = base.growthScore;
    if (growthScore !== null) {
      const revenueImpact = deltas.revenueGrowthDelta !== null
        ? growthScore * (deltas.revenueGrowthDelta / 100) * 0.5
        : 0;
      const profitImpact = deltas.profitGrowthDelta !== null
        ? growthScore * (deltas.profitGrowthDelta / 100) * 0.5
        : 0;
      growthScore = safeSimulatedScore(growthScore + revenueImpact + profitImpact);
    }

    // ── Leverage (debt) simulation ────────────────────────────
    // Debt-to-equity delta affects leverage score
    let debtScore: number | null = base.debtScore;
    if (deltas.debtToEquityDelta !== null && debtScore !== null) {
      // Each 0.5 increase in D/E reduces debt score by ~10 points
      const impact = -1 * deltas.debtToEquityDelta * 20;
      debtScore = safeSimulatedScore(debtScore + impact);
    }

    // ── Composite recalculation ───────────────────────────────
    const components: (number | null)[] = [qualityScore, growthScore, debtScore];
    const valid = components.filter((c) => c !== null) as number[];
    const compositeScore = valid.length > 0
      ? safeSimulatedScore(
          (valid.reduce((a, b) => a + b, 0) / valid.length)
        )
      : base.score;

    return {
      qualityScore,
      growthScore,
      debtScore,
      compositeScore,
    };
  }

  /** Build a full scenario output with impact comparison */
  buildScenarioOutput(
    symbol: string,
    assumptions: ScenarioAssumptions,
    base: FinancialEngineOutput,
    simulated: FinancialSimResult
  ): ScenarioOutput {
    const deltas = deriveDeltas(assumptions);
    const confidence = computeScenarioConfidence(
      [base.qualityScore, base.growthScore, base.debtScore, base.score],
      [simulated.qualityScore, simulated.growthScore, simulated.debtScore, simulated.compositeScore]
    );

    const impact = this.buildImpact(base, simulated, deltas);
    const watchNext = this.buildWatchNext(simulated, deltas);
    const reviewTriggers = this.buildReviewTriggers(base, simulated);
    const limitations = this.buildLimitations();

    return {
      id: `scenario-financial-${symbol}-${Date.now()}`,
      symbol,
      scenarioKind: assumptions.revenueGrowthDeltaPct != null ? "earnings_growth_change" : "custom",
      severity: "moderate",
      createdAt: new Date().toISOString(),
      assumptions,
      impact,
      simulatedScores: {
        financial: simulated.compositeScore,
        quality: simulated.qualityScore,
        growth: simulated.growthScore,
        debt: simulated.debtScore,
      },
      confidence,
      dataCompleteness: base.dataCompleteness,
      watchNext,
      reviewTriggers,
      limitations,
    };
  }

  // ── Private helpers ───────────────────────────────────────────

  private buildImpact(
    base: FinancialEngineOutput,
    sim: FinancialSimResult,
    deltas: ReturnType<typeof deriveDeltas>
  ): ScenarioImpact {
    const overallDelta = scoreDelta(base.score, sim.compositeScore);

    const thesisImpact =
      overallDelta !== null
        ? overallDelta > 2
          ? `Under these assumptions, financial health could strengthen. Quality, growth, and leverage metrics may remain within acceptable ranges.`
          : overallDelta < -2
            ? `Under these assumptions, financial health could weaken. Margin pressure, growth deceleration, or higher leverage may reduce the quality assessment.`
            : `Financial profile shows limited change under these assumptions. Key metrics may remain broadly stable.`
        : "Insufficient data to assess financial thesis impact.";

    const financialImpact = this.buildFinancialImpactText(base, sim, deltas);

    return {
      thesisImpact,
      financialImpact,
      valuationImpact: "Financial simulations focus on fundamentals, not valuation multiples.",
      earningsImpact: this.buildEarningsImpactText(deltas),
      riskImpact: this.buildRiskImpactText(sim),
      technicalImpact: "Financial simulations do not directly affect technical context.",
      sectorImpact: "Financial simulations are company-specific, not sector-driven.",
      peerImpact: "Financial simulations use company-specific assumptions.",
      simulatedScore: sim.compositeScore ?? base.score,
      scoreDelta: overallDelta,
      simulatedScoreBand: this.toBand(sim.compositeScore ?? base.score),
      baseScoreBand: this.toBand(base.score),
    };
  }

  private buildFinancialImpactText(
    base: FinancialEngineOutput,
    sim: FinancialSimResult,
    deltas: ReturnType<typeof deriveDeltas>
  ): string {
    const parts: string[] = [];

    const qDelta = scoreDelta(base.qualityScore, sim.qualityScore);
    if (qDelta !== null && Math.abs(qDelta) > 1) {
      parts.push(
        qDelta > 0
          ? `Quality score could improve by ${Math.abs(qDelta).toFixed(1)} points.`
          : `Quality score could decline by ${Math.abs(qDelta).toFixed(1)} points.`
      );
    }

    const gDelta = scoreDelta(base.growthScore, sim.growthScore);
    if (gDelta !== null && Math.abs(gDelta) > 1) {
      parts.push(
        gDelta > 0
          ? `Growth score could improve by ${Math.abs(gDelta).toFixed(1)} points.`
          : `Growth score could decline by ${Math.abs(gDelta).toFixed(1)} points.`
      );
    }

    const dDelta = scoreDelta(base.debtScore, sim.debtScore);
    if (dDelta !== null && Math.abs(dDelta) > 1) {
      parts.push(
        dDelta > 0
          ? `Leverage score could improve by ${Math.abs(dDelta).toFixed(1)} points.`
          : `Leverage score could decline by ${Math.abs(dDelta).toFixed(1)} points.`
      );
    }

    if (parts.length === 0) {
      parts.push("Financial metrics show minimal change under these assumptions.");
    }

    return parts.join(" ");
  }

  private buildEarningsImpactText(
    deltas: ReturnType<typeof deriveDeltas>
  ): string {
    const parts: string[] = [];
    if (deltas.revenueGrowthDelta !== null) {
      const dir = deltas.revenueGrowthDelta > 0 ? "could improve" : "could weaken";
      parts.push(`Revenue growth ${dir} under these assumptions.`);
    }
    if (deltas.profitGrowthDelta !== null) {
      const dir = deltas.profitGrowthDelta > 0 ? "could improve" : "could weaken";
      parts.push(`Profit growth ${dir} under these assumptions.`);
    }
    if (deltas.operatingMarginDelta !== null) {
      const dir = deltas.operatingMarginDelta > 0 ? "could widen" : "could compress";
      parts.push(`Operating margins ${dir} under these assumptions.`);
    }
    return parts.length > 0 ? parts.join(" ") : "Earnings profile may remain stable.";
  }

  private buildRiskImpactText(sim: FinancialSimResult): string {
    if (sim.debtScore !== null && sim.debtScore < 40) {
      return "Under this scenario, higher leverage could raise balance sheet risk. Debt servicing ability may weaken.";
    }
    return "Financial risk profile may remain within reasonable bounds under these assumptions.";
  }

  private buildWatchNext(
    sim: FinancialSimResult,
    deltas: ReturnType<typeof deriveDeltas>
  ): string[] {
    const items: string[] = [];

    if (deltas.revenueGrowthDelta !== null) {
      items.push(`Monitor next reported revenue growth.`);
    }
    if (deltas.profitGrowthDelta !== null) {
      items.push(`Watch next quarterly profit announcement.`);
    }
    if (deltas.operatingMarginDelta !== null) {
      items.push(`Check next filing for operating margin trend.`);
    }
    if (deltas.debtToEquityDelta !== null && deltas.debtToEquityDelta > 0) {
      items.push(`Review latest balance sheet for debt changes.`);
    }
    if (sim.compositeScore !== null && sim.compositeScore < 30) {
      items.push(`Financial health could weaken significantly; review quarterly results.`);
    }

    if (items.length === 0) {
      items.push(`Monitor regular financial filings for any changes.`);
    }

    return items;
  }

  private buildReviewTriggers(
    base: FinancialEngineOutput,
    sim: FinancialSimResult
  ): string[] {
    const triggers: string[] = [];
    const overallDelta = scoreDelta(base.score, sim.compositeScore);

    if (overallDelta !== null && Math.abs(overallDelta) > 10) {
      triggers.push(`Financial health change > 10 points — review thesis.`);
    }
    if (sim.debtScore !== null && sim.debtScore < 30 && base.debtScore > 50) {
      triggers.push(`Debt score severe decline — check balance sheet.`);
    }
    if (sim.growthScore !== null && base.growthScore !== null && sim.growthScore < base.growthScore - 15) {
      triggers.push(`Growth score dropped > 15 points — review earnings trajectory.`);
    }

    return triggers;
  }

  private buildLimitations(): string[] {
    return [
      "Financial simulation uses simplified linear approximations.",
      "Actual outcomes depend on many factors beyond the assumptions tested.",
      "Margin and growth impacts interact; this simulation treats them independently.",
      "Not a forecast. Not a guarantee. For research use only.",
    ];
  }

  private toBand(score: number): string {
    if (score >= 80) return "Strong";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    if (score >= 20) return "Weak";
    return "Poor";
  }
}
