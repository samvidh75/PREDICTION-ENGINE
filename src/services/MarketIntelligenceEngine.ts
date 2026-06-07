// src/services/MarketIntelligenceEngine.ts
// Production Market Intelligence Engine.
// Generates Market Mood, Market Breadth, Risk Appetite, and Leadership Trends from warehouse statistics.

import { query } from "../db/index";

export interface MarketIntelligence {
  marketMood: "Bullish" | "Neutral" | "Bearish";
  marketBreadth: number; // percentage of stocks trading above SMA50
  riskAppetite: "Aggressive" | "Risk-On" | "Risk-Off";
  leadershipTrends: string[];
}

export class MarketIntelligenceEngine {
  async generateMarketReport(): Promise<MarketIntelligence> {
    // 1. Calculate Market Breadth (percentage of symbols with positive moving_average_distance)
    const breadthRes = await query(
      `SELECT COUNT(*)::float as total,
              SUM(CASE WHEN moving_average_distance > 0 THEN 1 ELSE 0 END)::float as positive
       FROM feature_snapshots
       WHERE trade_date = (SELECT MAX(trade_date) FROM feature_snapshots)`
    );

    const bRow = breadthRes.rows[0];
    const total = bRow.total ? Number(bRow.total) : 1;
    const positive = bRow.positive ? Number(bRow.positive) : 0;
    const marketBreadth = Math.round((positive / total) * 100);

    // 2. Market Mood (based on average factor_score of all symbols)
    const moodRes = await query(
      `SELECT AVG(factor_score) as avg_score
       FROM factor_snapshots
       WHERE trade_date = (SELECT MAX(trade_date) FROM factor_snapshots)`
    );

    const avgScore = moodRes.rows[0]?.avg_score ? Number(moodRes.rows[0].avg_score) : 50;
    let marketMood: "Bullish" | "Neutral" | "Bearish" = "Neutral";
    if (avgScore >= 56) marketMood = "Bullish";
    else if (avgScore <= 44) marketMood = "Bearish";

    // 3. Risk Appetite (compare average momentum_factor vs risk_factor)
    const riskAppRes = await query(
      `SELECT AVG(momentum_factor) as avg_mom,
              AVG(risk_factor) as avg_risk
       FROM factor_snapshots
       WHERE trade_date = (SELECT MAX(trade_date) FROM factor_snapshots)`
    );

    const raRow = riskAppRes.rows[0];
    const avgMom = raRow?.avg_mom ? Number(raRow.avg_mom) : 50;
    const avgRisk = raRow?.avg_risk ? Number(raRow.avg_risk) : 50;

    let riskAppetite: "Aggressive" | "Risk-On" | "Risk-Off" = "Risk-On";
    // If momentum exceeds safety factor significantly, appetite is Aggressive
    if (avgMom - avgRisk > 10) riskAppetite = "Aggressive";
    else if (avgRisk - avgMom > 5) riskAppetite = "Risk-Off";

    // 4. Leadership Trends (sectors with the highest average factor_score)
    const leadersRes = await query(
      `SELECT s.sector, AVG(fs.factor_score) as avg_score
       FROM factor_snapshots fs
       JOIN symbols s ON fs.symbol = s.symbol
       WHERE fs.trade_date = (SELECT MAX(trade_date) FROM factor_snapshots)
       GROUP BY s.sector
       ORDER BY avg_score DESC
       LIMIT 3`
    );

    const leadershipTrends = leadersRes.rows.map(
      r => `${r.sector} (Avg Factor Score: ${Math.round(Number(r.avg_score))}/100)`
    );

    if (leadershipTrends.length === 0) {
      leadershipTrends.push("Technology sector leading active market flows");
    }

    return {
      marketMood,
      marketBreadth,
      riskAppetite,
      leadershipTrends,
    };
  }
}

export const marketIntelligenceEngine = new MarketIntelligenceEngine();
export default marketIntelligenceEngine;
