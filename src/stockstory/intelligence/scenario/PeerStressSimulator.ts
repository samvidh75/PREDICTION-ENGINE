/**
 * Lensory Peer Stress Simulator
 *
 * Simulates how peer-relative assessment could change
 * under different sector or market conditions.
 */

import type { IntelligenceInput, StockIntelligenceReport } from "../types";
import type { ScenarioAssumptions, ScenarioOutput, ScenarioImpact, PeerScenarioResult } from "./ScenarioTypes";
import { deriveDeltas, safeSimulatedScore, scoreDelta, computeScenarioConfidence } from "./ScenarioUtils";
import { mean } from "@/utils/statisticalUtils.ts";

export class PeerStressSimulator {
  /**
   * Compare the target company's simulated output against peer reports.
   * This is a lightweight, deterministic peer context operation.
   */
  simulate(
    targetReport: StockIntelligenceReport,
    peerReports: StockIntelligenceReport[],
    assumptions: ScenarioAssumptions
  ): PeerScenarioResult[] {
    const results: PeerScenarioResult[] = [];

    for (const peer of peerReports) {
      const baseScore = this.extractCompositeScore(peer);
      // Apply broad sector assumptions to peer scores for comparison
      const simulatedScore = this.applyPeerAssumptions(baseScore, assumptions);

      results.push({
        symbol: peer.symbol,
        baseScore,
        simulatedScore,
        scoreDelta: scoreDelta(baseScore, simulatedScore),
        relativeRankChange: simulatedScore !== null && baseScore !== null
          ? Math.round(simulatedScore - baseScore)
          : null,
      });
    }

    return results;
  }

  buildScenarioOutput(
    symbol: string,
    assumptions: ScenarioAssumptions,
    targetReport: StockIntelligenceReport,
    peerResults: PeerScenarioResult[]
  ): ScenarioOutput {
    const deltas = deriveDeltas(assumptions);
    const targetBaseScore = this.extractCompositeScore(targetReport);
    const targetSimScore = safeSimulatedScore(targetBaseScore);
    const confidence = computeScenarioConfidence(
      [targetBaseScore],
      [targetSimScore]
    );

    const overallDelta = scoreDelta(targetBaseScore, targetSimScore);
    const impact = this.buildImpact(symbol, peerResults, deltas, overallDelta);

    return {
      id: `scenario-peer-${symbol}-${Date.now()}`,
      symbol,
      scenarioKind: "sector_shock",
      severity: "moderate",
      createdAt: new Date().toISOString(),
      assumptions,
      impact,
      simulatedScores: {
        composite: targetSimScore,
      },
      confidence,
      dataCompleteness: 0.8,
      watchNext: this.buildWatchNext(peerResults),
      reviewTriggers: this.buildReviewTriggers(peerResults),
      limitations: [
        "Peer simulation applies sector-level assumptions to peer scores.",
        "Company-specific factors for each peer are not individually modeled.",
        "Peer comparison is directional, not precise.",
        "Not a forecast. Not a guarantee. For research use only.",
      ],
    };
  }

  private extractCompositeScore(report: StockIntelligenceReport): number | null {
    // Extract the overall composite score from the report
    // Uses the orchestrator-computed composite or average of available engine scores
    if (report.compositeScore != null) return report.compositeScore;

    const scores = [
      report.financial?.score,
      report.technical?.score,
      report.valuation?.score,
      report.risk?.score,
      report.sector?.score,
    ].filter((s) => s != null) as number[];

    return scores.length > 0
      ? mean(scores) ?? 0
      : null;
  }

  private applyPeerAssumptions(
    baseScore: number | null,
    assumptions: ScenarioAssumptions
  ): number | null {
    if (baseScore == null) return null;
    const deltas = deriveDeltas(assumptions);

    let adjusted = baseScore;
    if (deltas.sectorMedianPeDelta !== null) {
      adjusted -= adjusted * (deltas.sectorMedianPeDelta / 100) * 0.3;
    }
    if (deltas.sectorGrowthDelta !== null) {
      adjusted -= adjusted * (deltas.sectorGrowthDelta / 100) * 0.2;
    }

    return safeSimulatedScore(adjusted);
  }

  private buildImpact(
    symbol: string,
    peers: PeerScenarioResult[],
    _deltas: ReturnType<typeof deriveDeltas>,
    overallDelta: number | null
  ): ScenarioImpact {
    const relRankInfo = this.computeRelativeRankChange(symbol, peers);

    const thesisImpact =
      overallDelta !== null
        ? Math.abs(overallDelta) > 2
          ? `Under this peer scenario, ${symbol}'s relative position compared to peers could shift. ${relRankInfo}`
          : `Peer comparison shows limited change under these assumptions.`
        : "Insufficient data for peer assessment.";

    return {
      thesisImpact,
      financialImpact: "Peer simulations compare relative positioning; individual financials are unchanged.",
      valuationImpact: "Peer comparisons may affect relative valuation assessment.",
      earningsImpact: "Peer comparisons may highlight relative earnings quality.",
      riskImpact: "Peer comparisons may reveal relative risk positioning.",
      technicalImpact: "Peer simulations do not affect technical context.",
      sectorImpact: "Peer simulations leverage sector-level assumptions for comparison.",
      peerImpact: `Under these assumptions, ${peers.length} peers analyzed. ${relRankInfo}`,
      simulatedScore: peers.find(p => p.symbol === symbol)?.simulatedScore ?? null,
      scoreDelta: overallDelta,
      simulatedScoreBand: overallDelta !== null ? (overallDelta > 0 ? "Improved" : "Weakened") : "Stable",
      baseScoreBand: "Baseline",
    };
  }

  private computeRelativeRankChange(
    targetSymbol: string,
    peers: PeerScenarioResult[]
  ): string {
    const sorted = [...peers]
      .filter(p => p.simulatedScore != null)
      .sort((a, b) => (b.simulatedScore ?? 0) - (a.simulatedScore ?? 0));

    const idx = sorted.findIndex(p => p.symbol === targetSymbol);
    if (idx < 0) return "";

    if (idx <= sorted.length / 3) return "The company could rank in the top tier of peers.";
    if (idx <= (sorted.length * 2) / 3) return "The company could rank in the middle tier of peers.";
    return "The company could rank in the lower tier of peers.";
  }

  private buildWatchNext(peers: PeerScenarioResult[]): string[] {
    const items: string[] = ["Monitor peer company results and sector developments."];
    const significant = peers.filter(
      p => p.scoreDelta !== null && Math.abs(p.scoreDelta) > 5
    );
    if (significant.length > 0) {
      items.push(
        `${significant.length} peers show significant score changes — watch their next results.`
      );
    }
    return items;
  }

  private buildReviewTriggers(peers: PeerScenarioResult[]): string[] {
    const triggers: string[] = [];
    const largeChanges = peers.filter(
      p => p.scoreDelta !== null && Math.abs(p.scoreDelta) > 10
    );
    if (largeChanges.length > 0) {
      triggers.push(
        `${largeChanges.length} peers show >10 point shifts — review sector thesis.`
      );
    }
    return triggers;
  }
}
