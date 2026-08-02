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
    const review = snapshot.review;

    // Concentration Insight
    const topSector = review.concentration?.sectorExposure?.[0];
    if (topSector && topSector.weightPct > 40) {
      insights.push({
        id: "in1",
        type: "warning",
        message: `Portfolio sector exposure is highly concentrated in ${topSector.sector} (${topSector.weightPct}%). Consider broad integrations.`,
      });
    }

    // Performance Insight
    if (review.totalGainLossPct != null && review.totalGainLossPct > 5) {
      const best = review.concentration?.largestPosition;
      insights.push({
        id: "in3",
        type: "positive",
        message: `Portfolio returns are compounding cleanly (+${review.totalGainLossPct}%)${best ? `, led by ${best.symbol}.` : '.'}`,
      });
    } else {
      insights.push({
        id: "in3",
        type: "info",
        message: `Portfolio performance is consolidating stable bases. Proximity is supported by key index zones.`,
      });
    }

    // Review-based insights
    const attentionItems = review.reviewQueue.filter(item => item.severity === 'attention');
    if (attentionItems.length > 0) {
      const item = attentionItems[0];
      insights.push({
        id: "in2",
        type: "warning",
        message: item.detail,
      });
    } else {
      insights.push({
        id: "in2",
        type: "positive",
        message: `Portfolio allocation is within acceptable concentration limits.`,
      });
    }

    // Capped at exactly 3 insights visible at once
    return insights.slice(0, 3);
  }
}
