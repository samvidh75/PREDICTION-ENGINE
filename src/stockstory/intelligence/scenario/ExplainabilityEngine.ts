/**
 * Lensory Scenario Explainability Engine
 *
 * Generates human-readable, compliance-safe explanations
 * for scenario results. Breaks down why a scenario produced
 * its results, how assumptions drove the outcome, and what
 * the key limitations are.
 */

import type {
  ScenarioAssumptions,
  ScenarioOutput,
  ScenarioImpact,
  SimulationTrait,
} from "./ScenarioTypes";
import { containsForbiddenLanguage } from "./ScenarioUtils";

export interface ExplanationSegment {
  label: string;
  text: string;
}

export interface ScenarioExplanation {
  id: string;
  symbol: string;
  scenarioLabel: string;
  segments: ExplanationSegment[];
  complianceStatus: "pass" | "fail" | "warning";
  complianceViolations: string[];
}

export class ExplainabilityEngine {
  /** Generate a full explanation for a scenario */
  explain(scenario: ScenarioOutput): ScenarioExplanation {
    const segments = this.buildExplanationSegments(scenario);
    const complianceStatus = this.validateCompliance(scenario);
    const violations: string[] = [];

    if (complianceStatus === "fail" || complianceStatus === "warning") {
      // Collect violation details
      for (const seg of segments) {
        if (containsForbiddenLanguage(seg.text)) {
          violations.push(`Forbidden language in "${seg.label}": ${seg.text.substring(0, 100)}`);
        }
      }
    }

    return {
      id: scenario.id,
      symbol: scenario.symbol,
      scenarioLabel: scenario.scenarioKind.replace(/_/g, " "),
      segments,
      complianceStatus: violations.length > 0 ? "fail" : "pass",
      complianceViolations: violations,
    };
  }

  /** Generate a user-facing summary (1-2 sentences) */
  summarize(scenario: ScenarioOutput): string {
    const delta = scenario.impact.scoreDelta;
    const direction =
      delta !== null && delta > 2
        ? "could improve"
        : delta !== null && delta < -2
        ? "could weaken"
        : "shows minimal change in";

    const band = scenario.impact.simulatedScoreBand ?? "the assessment";

    return `Under the ${scenario.scenarioKind.replace(/_/g, " ")} scenario, ${
      scenario.symbol
    }'s overall assessment ${direction} (${band} band). This is a hypothetical scenario, not a forecast.`;
  }

  /** Build the assumption chain — step-by-step how assumptions drive output */
  buildAssumptionChain(scenario: ScenarioOutput): string[] {
    const chain: string[] = [];
    const a = scenario.assumptions;

    if (a.revenueGrowthDeltaPct != null) {
      chain.push(
        `Revenue growth assumption (${a.revenueGrowthDeltaPct > 0 ? "+" : ""}${a.revenueGrowthDeltaPct}%) affects growth and earnings scores.`
      );
    }
    if (a.profitGrowthDeltaPct != null) {
      chain.push(
        `Profit growth assumption (${a.profitGrowthDeltaPct > 0 ? "+" : ""}${a.profitGrowthDeltaPct}%) affects growth and quality scores.`
      );
    }
    if (a.operatingMarginDeltaPct != null) {
      chain.push(
        `Operating margin assumption (${a.operatingMarginDeltaPct > 0 ? "+" : ""}${a.operatingMarginDeltaPct}%) affects quality and earnings scores.`
      );
    }
    if (a.debtToEquityDelta != null && a.debtToEquityDelta !== 0) {
      chain.push(
        `Debt-to-equity assumption (${a.debtToEquityDelta > 0 ? "+" : ""}${a.debtToEquityDelta}) affects leverage and risk scores.`
      );
    }
    if (a.peMultipleDeltaPct != null) {
      chain.push(
        `PE multiple assumption (${a.peMultipleDeltaPct > 0 ? "+" : ""}${a.peMultipleDeltaPct}%) affects valuation score.`
      );
    }
    if (a.riskShockScoreDelta != null && a.riskShockScoreDelta !== 0) {
      chain.push(
        `Risk shock assumption (${a.riskShockScoreDelta > 0 ? "+" : ""}${a.riskShockScoreDelta} pts) directly affects risk score.`
      );
    }
    if (a.priceMomentumDeltaPct != null) {
      chain.push(
        `Momentum assumption (${a.priceMomentumDeltaPct > 0 ? "+" : ""}${a.priceMomentumDeltaPct}%) affects technical score.`
      );
    }
    if (a.sectorMedianPeDeltaPct != null) {
      chain.push(
        `Sector PE assumption (${a.sectorMedianPeDeltaPct > 0 ? "+" : ""}${a.sectorMedianPeDeltaPct}%) affects sector-relative score.`
      );
    }

    return chain;
  }

  /** Extract key takeaways */
  extractKeyTakeaways(scenario: ScenarioOutput): string[] {
    const takeaways: string[] = [];

    // Primary impact
    if (scenario.impact.thesisImpact) {
      takeaways.push(scenario.impact.thesisImpact);
    }

    // Score delta
    const delta = scenario.impact.scoreDelta;
    if (delta !== null && Math.abs(delta) > 5) {
      takeaways.push(
        `The overall assessment score could shift by ${Math.abs(delta).toFixed(1)} points — a ${
          Math.abs(delta) > 10 ? "meaningful" : "moderate"
        } change.`
      );
    }

    // Key limitation
    if (scenario.limitations.length > 0) {
      takeaways.push(`Key limitation: ${scenario.limitations[0]}`);
    }

    return takeaways;
  }

  // ── Private ────────────────────────────────────────────────

  private buildExplanationSegments(
    scenario: ScenarioOutput
  ): ExplanationSegment[] {
    return [
      {
        label: "Scenario Overview",
        text: this.summarize(scenario),
      },
      {
        label: "Input Assumptions",
        text: this.describeAssumptions(scenario.assumptions),
      },
      {
        label: "Assumption Chain",
        text: this.buildAssumptionChain(scenario).join(" "),
      },
      {
        label: "Thesis Impact",
        text: scenario.impact.thesisImpact,
      },
      {
        label: "Financial Impact",
        text: scenario.impact.financialImpact,
      },
      {
        label: "Valuation Impact",
        text: scenario.impact.valuationImpact,
      },
      {
        label: "Earnings Impact",
        text: scenario.impact.earningsImpact,
      },
      {
        label: "Risk Impact",
        text: scenario.impact.riskImpact,
      },
      {
        label: "Technical Impact",
        text: scenario.impact.technicalImpact,
      },
      {
        label: "Sector Impact",
        text: scenario.impact.sectorImpact,
      },
      {
        label: "Peer Impact",
        text: scenario.impact.peerImpact,
      },
      {
        label: "Key Takeaways",
        text: this.extractKeyTakeaways(scenario).join(" "),
      },
      {
        label: "Confidence",
        text: `Confidence: ${scenario.confidence}% based on ${scenario.dataCompleteness > 0.7 ? "good" : scenario.dataCompleteness > 0.4 ? "partial" : "limited"} data.`,
      },
      {
        label: "Limitations",
        text: scenario.limitations.join(" "),
      },
    ];
  }

  private describeAssumptions(assumptions: ScenarioAssumptions): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(assumptions)) {
      if (value == null) continue;
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/Delta Pct/, " change (%)")
        .replace(/Delta/, " change")
        .toLowerCase()
        .trim();
      parts.push(`${label}: ${value > 0 ? "+" : ""}${value}`);
    }

    if (parts.length === 0) return "No assumption changes applied (base case).";
    return parts.join("; ");
  }

  private validateCompliance(scenario: ScenarioOutput): "pass" | "fail" | "warning" {
    const allText = [
      scenario.impact.thesisImpact,
      scenario.impact.financialImpact,
      scenario.impact.valuationImpact,
      scenario.impact.earningsImpact,
      scenario.impact.riskImpact,
      scenario.impact.technicalImpact,
      scenario.impact.sectorImpact,
      scenario.impact.peerImpact,
      ...scenario.watchNext,
      ...scenario.reviewTriggers,
      ...scenario.limitations,
      this.summarize(scenario),
      this.describeAssumptions(scenario.assumptions),
      ...this.buildAssumptionChain(scenario),
      ...this.extractKeyTakeaways(scenario),
    ].join(" ");

    if (containsForbiddenLanguage(allText)) return "fail";

    // Check for required disclaimers
    const hasDisclaimer = allText.toLowerCase().includes("not a forecast") ||
      allText.toLowerCase().includes("hypothetical");
    if (!hasDisclaimer) return "warning";

    return "pass";
  }
}
