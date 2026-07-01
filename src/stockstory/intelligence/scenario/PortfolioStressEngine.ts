/**
 * Lensory Portfolio Stress Engine
 *
 * Aggregates scenario results across a portfolio of stocks.
 * Shows concentration risk, net portfolio direction,
 * and cross-scenario patterns.
 */

import type {
  ScenarioOutput,
  TrackedCompanyStress,
  PortfolioStressOutput,
} from "./ScenarioTypes";
import { ThesisLifecycleEngine, type ThesisAssessment } from "./ThesisLifecycleEngine";

export class PortfolioStressEngine {
  private thesis = new ThesisLifecycleEngine();

  /** Aggregate stress results across a portfolio */
  aggregate(
    portfolioName: string,
    positions: TrackedCompanyStress[],
    scenarios: ScenarioOutput[]
  ): PortfolioStressOutput {
    const thesisAssessments: ThesisAssessment[] = [];

    // Aggregate score deltas
    const allScoreDeltas: number[] = [];
    for (const pos of positions) {
      for (const result of pos.scenarioResults) {
        const delta = result.impact.scoreDelta;
        if (delta != null) allScoreDeltas.push(delta);
      }
      if (pos.thesisAssessment) {
        thesisAssessments.push(pos.thesisAssessment);
      }
    }

    const netDirection = this.computeNetDirection(allScoreDeltas);
    const averageDelta =
      allScoreDeltas.length > 0
        ? Math.round(
            (allScoreDeltas.reduce((a, b) => a + b, 0) / allScoreDeltas.length) * 100
          ) / 100
        : 0;

    // Concentration: which scenario kind had the most impact
    const concentration = this.computeConcentration(positions);

    // Thesis summary
    const thesisStrengths = thesisAssessments.filter(
      (a) => a.direction === "strengthens"
    ).length;
    const thesisWeakens = thesisAssessments.filter(
      (a) => a.direction === "weakens"
    ).length;
    const thesisNeedsReview = thesisAssessments.filter(
      (a) => a.thesisIntegrity === "needs_review"
    ).length;

    // Top affected positions
    const topAffected = this.computeTopAffected(positions);

    // Cross-cutting patterns
    const crossCuttingPatterns = this.identifyCrossCuttingPatterns(positions, scenarios);

    return {
      portfolioName,
      generatedAt: new Date().toISOString(),
      positionCount: positions.length,
      scenarioCount: scenarios.length,
      netDirection,
      averageDelta,
      concentration,
      thesisSummary: {
        strengthCount: thesisStrengths,
        weakenCount: thesisWeakens,
        needsReviewCount: thesisNeedsReview,
        strongestPosition:
          positions.find(
            (p) =>
              p.thesisAssessment?.direction === "strengthens" &&
              p.thesisAssessment?.magnitude === "significant"
          )?.symbol ?? null,
        weakestPosition:
          positions.find(
            (p) =>
              p.thesisAssessment?.direction === "weakens" &&
              p.thesisAssessment?.magnitude === "significant"
          )?.symbol ?? null,
      },
      topAffectedPositions: topAffected,
      crossCuttingPatterns,
      limitations: [
        "Portfolio stress is directional only — not a risk model.",
        "Cross-asset correlations are not modeled.",
        "Each position is simulated independently.",
        "Not a forecast. Not a guarantee. For research use only.",
      ],
    };
  }

  // ── Private ────────────────────────────────────────────────

  private computeNetDirection(
    deltas: number[]
  ): "positive" | "negative" | "neutral" {
    if (deltas.length === 0) return "neutral";
    const net = deltas.reduce((a, b) => a + b, 0);
    if (Math.abs(net) < 0.5) return "neutral";
    return net > 0 ? "positive" : "negative";
  }

  private computeConcentration(
    positions: TrackedCompanyStress[]
  ): {
    largestSingleImpact: string | null;
    scenarioKindWithMostImpact: string | null;
  } {
    let largestSingleImpact: string | null = null;
    let maxDelta = 0;
    const kindCounts: Record<string, number> = {};

    for (const pos of positions) {
      for (const result of pos.scenarioResults) {
        const delta = Math.abs(result.impact.scoreDelta ?? 0);
        if (delta > maxDelta) {
          maxDelta = delta;
          largestSingleImpact = `${pos.symbol}:${result.scenarioKind}`;
        }
        kindCounts[result.scenarioKind] =
          (kindCounts[result.scenarioKind] || 0) + 1;
      }
    }

    const sortedKinds = Object.entries(kindCounts).sort(
      (a, b) => b[1] - a[1]
    );
    const scenarioKindWithMostImpact =
      sortedKinds.length > 0 ? sortedKinds[0][0] : null;

    return { largestSingleImpact, scenarioKindWithMostImpact };
  }

  private computeTopAffected(
    positions: TrackedCompanyStress[]
  ): { symbol: string; averageDelta: number }[] {
    const results: { symbol: string; averageDelta: number }[] = [];

    for (const pos of positions) {
      const deltas = pos.scenarioResults
        .map((r) => r.impact.scoreDelta)
        .filter((d): d is number => d != null);

      if (deltas.length > 0) {
        const avgDelta =
          Math.round(
            (deltas.reduce((a, b) => a + Math.abs(b), 0) / deltas.length) * 100
          ) / 100;
        results.push({ symbol: pos.symbol, averageDelta: avgDelta });
      }
    }

    results.sort((a, b) => b.averageDelta - a.averageDelta);
    return results.slice(0, 10);
  }

  private identifyCrossCuttingPatterns(
    _positions: TrackedCompanyStress[],
    scenarios: ScenarioOutput[]
  ): string[] {
    const patterns: string[] = [];

    // Check if a specific scenario kind dominates
    const kindCounts: Record<string, number> = {};
    for (const s of scenarios) {
      kindCounts[s.scenarioKind] = (kindCounts[s.scenarioKind] || 0) + 1;
    }
    const dominantKind = Object.entries(kindCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];

    if (dominantKind && dominantKind[1] >= 3) {
      patterns.push(
        `${dominantKind[0].replace(/_/g, " ")} scenarios appear across multiple positions. This may suggest a broad theme worth monitoring.`
      );
    }

    // Check if most scenarios show similar direction
    const deteriorations = scenarios.filter(
      (s) => (s.impact.scoreDelta ?? 0) < -3
    ).length;
    const improvements = scenarios.filter(
      (s) => (s.impact.scoreDelta ?? 0) > 3
    ).length;

    if (deteriorations > scenarios.length * 0.6) {
      patterns.push(
        "Majority of scenarios point to potential deterioration — portfolio-wide thesis review may be warranted."
      );
    } else if (improvements > scenarios.length * 0.6) {
      patterns.push(
        "Majority of scenarios point to potential improvement — this is a hypothetical pattern, not a prediction."
      );
    }

    if (patterns.length === 0) {
      patterns.push(
        "No dominant cross-cutting pattern detected. Scenario impacts appear company-specific."
      );
    }

    return patterns;
  }
}
