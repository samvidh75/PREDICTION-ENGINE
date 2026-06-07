// src/services/portfolio/PersonalInsightsEngine.ts
import { PortfolioSnapshot } from "./PortfolioSnapshotFactory";

export interface PersonalInsight {
  id: string;
  type: "warning" | "positive" | "info";
  message: string;
}

export class PersonalInsightsEngine {
  public static generateInsights(snapshot: PortfolioSnapshot): PersonalInsight[] {
    const insights: PersonalInsight[] = [];

    // Concentration Insight
    const topSector = snapshot.sectorExposure[0];
    if (topSector && topSector.weightPct > 40) {
      insights.push({
        id: "in1",
        type: "warning",
        message: `Portfolio sector exposure is highly concentrated in ${topSector.sector} (${topSector.weightPct}%). Consider broad integrations.`,
      });
    }

    // Health Insight
    if (snapshot.health.score > 75) {
      insights.push({
        id: "in2",
        type: "positive",
        message: `Overall portfolio health is strong (${snapshot.health.score}/100), backed by resilient legacy assets.`,
      });
    } else {
      insights.push({
        id: "in2",
        type: "warning",
        message: `Portfolio health is stabilizing near structural limits. Volatility sensitivity is elevated.`,
      });
    }

    // Performance Insight
    if (snapshot.performance.totalGainPct > 5) {
      insights.push({
        id: "in3",
        type: "positive",
        message: `Portfolio returns are compounding cleanly (+${snapshot.performance.totalGainPct}%), led by ${snapshot.performance.bestPerformerSymbol}.`,
      });
    } else {
      insights.push({
        id: "in3",
        type: "info",
        message: `Portfolio performance is consolidating stable bases. Proximity is supported by key index zones.`,
      });
    }

    // Capped at exactly 3 insights visible at once
    return insights.slice(0, 3);
  }
}
