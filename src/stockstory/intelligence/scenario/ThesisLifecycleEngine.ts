/**
 * Lensory Thesis Lifecycle Engine
 *
 * Assesses what a scenario means for the thesis lifecycle:
 * - Does it strengthen or weaken the thesis?
 * - What assumptions matter most?
 * - What events could trigger a thesis change?
 *
 * Deterministic, compliance-safe.
 */

import type {
  ScenarioOutput,
  ScenarioImpact,
  ScenarioKind,
} from "./ScenarioTypes";

export interface ThesisAssessment {
  direction: "strengthens" | "weakens" | "neutral";
  magnitude: "significant" | "moderate" | "minor" | "none";
  keyDrivers: string[];
  thesisIntegrity: "unchanged" | "under_question" | "needs_review";
  summaryText: string;
}

export class ThesisLifecycleEngine {
  /** Assess how a scenario affects the thesis */
  assess(scenario: ScenarioOutput): ThesisAssessment {
    const impact = scenario.impact;
    const drivers = this.identifyKeyDrivers(scenario);
    const magnitude = this.computeMagnitude(scenario);
    const direction = this.computeDirection(impact, scenario.scenarioKind);

    const thesisIntegrity =
      magnitude === "significant" && direction === "weakens"
        ? "needs_review"
        : magnitude === "moderate"
        ? "under_question"
        : "unchanged";

    const summaryText = this.buildSummary(
      direction,
      magnitude,
      drivers,
      scenario.scenarioKind
    );

    return {
      direction,
      magnitude,
      keyDrivers: drivers,
      thesisIntegrity,
      summaryText,
    };
  }

  /** Assess multiple scenarios together for a compound thesis view */
  assessMultiple(scenarios: ScenarioOutput[]): {
    netDirection: "strengthens" | "weakens" | "neutral" | "mixed";
    confidence: number;
    mostImpactful: string | null;
    summaryText: string;
  } {
    const assessments = scenarios.map((s) => this.assess(s));

    const strengths = assessments.filter((a) => a.direction === "strengthens").length;
    const weakens = assessments.filter((a) => a.direction === "weakens").length;
    const significant = assessments.filter(
      (a) => a.magnitude === "significant"
    ).length;

    const netDirection =
      strengths > weakens
        ? "strengthens"
        : weakens > strengths
        ? "weakens"
        : strengths === 0 && weakens === 0
        ? "neutral"
        : "mixed";

    // Find most impactful scenario
    let mostImpactful: ScenarioOutput | null = null;
    let maxDelta = 0;
    for (const s of scenarios) {
      const delta = Math.abs(s.impact.scoreDelta ?? 0);
      if (delta > maxDelta) {
        maxDelta = delta;
        mostImpactful = s;
      }
    }

    const confidence = Math.round(
      ((strengths + weakens + significant) / Math.max(scenarios.length * 2, 1)) * 100
    );

    return {
      netDirection,
      confidence: Math.min(confidence, 99),
      mostImpactful: mostImpactful?.id ?? null,
      summaryText: this.buildCompoundSummary(netDirection, assessments, mostImpactful),
    };
  }

  // ── Private helpers ────────────────────────────────────────

  private identifyKeyDrivers(scenario: ScenarioOutput): string[] {
    const drivers: string[] = [];
    const assumptions = scenario.assumptions;

    if (assumptions.revenueGrowthDeltaPct != null) {
      drivers.push(
        `Revenue growth ${assumptions.revenueGrowthDeltaPct > 0 ? "+" : ""}${assumptions.revenueGrowthDeltaPct}%`
      );
    }
    if (assumptions.profitGrowthDeltaPct != null) {
      drivers.push(
        `Profit growth ${assumptions.profitGrowthDeltaPct > 0 ? "+" : ""}${assumptions.profitGrowthDeltaPct}%`
      );
    }
    if (assumptions.operatingMarginDeltaPct != null) {
      drivers.push(
        `Operating margin ${assumptions.operatingMarginDeltaPct > 0 ? "+" : ""}${assumptions.operatingMarginDeltaPct}%`
      );
    }
    if (assumptions.peMultipleDeltaPct != null) {
      drivers.push(
        `PE multiple ${assumptions.peMultipleDeltaPct > 0 ? "+" : ""}${assumptions.peMultipleDeltaPct}%`
      );
    }
    if (assumptions.debtToEquityDelta != null && assumptions.debtToEquityDelta !== 0) {
      drivers.push(
        `Debt-to-equity ${assumptions.debtToEquityDelta > 0 ? "+" : ""}${assumptions.debtToEquityDelta}`
      );
    }
    if (assumptions.priceMomentumDeltaPct != null) {
      drivers.push(
        `Momentum ${assumptions.priceMomentumDeltaPct > 0 ? "+" : ""}${assumptions.priceMomentumDeltaPct}%`
      );
    }
    if (assumptions.sectorMedianPeDeltaPct != null) {
      drivers.push(
        `Sector PE ${assumptions.sectorMedianPeDeltaPct > 0 ? "+" : ""}${assumptions.sectorMedianPeDeltaPct}%`
      );
    }
    if (assumptions.riskShockScoreDelta != null) {
      drivers.push(
        `Risk score ${assumptions.riskShockScoreDelta > 0 ? "+" : ""}${assumptions.riskShockScoreDelta} pts`
      );
    }

    return drivers;
  }

  private computeMagnitude(scenario: ScenarioOutput): "significant" | "moderate" | "minor" | "none" {
    const delta = Math.abs(scenario.impact.scoreDelta ?? 0);
    if (delta > 10) return "significant";
    if (delta > 5) return "moderate";
    if (delta > 1) return "minor";
    return "none";
  }

  private computeDirection(impact: ScenarioImpact, kind: ScenarioKind): "strengthens" | "weakens" | "neutral" {
    const delta = impact.scoreDelta ?? 0;

    // For risk_scenario, higher risk = weakens
    if (kind === "risk_event") {
      return delta > 2 ? "weakens" : delta < -2 ? "strengthens" : "neutral";
    }

    // For most scenarios, higher score = strengthens
    if (Math.abs(delta) < 2) return "neutral";
    return delta > 0 ? "strengthens" : "weakens";
  }

  private buildSummary(
    direction: string,
    magnitude: string,
    drivers: string[],
    kind: ScenarioKind
  ): string {
    if (magnitude === "none") {
      return `The ${kind.replace(/_/g, " ")} scenario shows minimal impact on the thesis. Key metrics remain broadly stable.`;
    }

    const driverText = drivers.length > 0 ? ` Driven by changes in ${drivers.join(", ")}.` : "";

    const impactText =
      direction === "strengthens"
        ? "could strengthen the thesis"
        : direction === "weakens"
        ? "could weaken the thesis"
        : "does not materially change the thesis";

    const magnitudeText =
      magnitude === "significant" ? "significantly" :
      magnitude === "moderate" ? "moderately" : "slightly";

    return `This ${kind.replace(/_/g, " ")} scenario ${magnitudeText} ${impactText}.${driverText} This is a hypothetical scenario, not a forecast.`;
  }

  private buildCompoundSummary(
    netDirection: string,
    assessments: ThesisAssessment[],
    mostImpactful: ScenarioOutput | null
  ): string {
    const total = assessments.length;

    if (total === 0) return "No scenarios to assess.";

    const significantCount = assessments.filter(
      (a) => a.magnitude === "significant"
    ).length;

    const weakCount = assessments.filter(
      (a) => a.direction === "weakens"
    ).length;

    const strongCount = assessments.filter(
      (a) => a.direction === "strengthens"
    ).length;

    let summary = `Across ${total} scenarios: `;

    if (netDirection === "mixed") {
      summary += `${strongCount} scenarios could strengthen and ${weakCount} could weaken the thesis.`;
    } else if (netDirection === "strengthens") {
      summary += `the balance could strengthen the thesis (${strongCount} strengthening, ${weakCount} weakening).`;
    } else if (netDirection === "weakens") {
      summary += `the balance could weaken the thesis (${weakCount} weakening, ${strongCount} strengthening).`;
    } else {
      summary += `no clear directional impact — thesis appears resilient.`;
    }

    if (significantCount > 0) {
      summary += ` ${significantCount} scenarios show significant impact.`;
    }

    if (mostImpactful) {
      summary += ` The most impactful scenario involves ${mostImpactful.scenarioKind.replace(/_/g, " ")}.`;
    }

    summary += " This is a hypothetical assessment, not a forecast.";

    return summary;
  }
}
