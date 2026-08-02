// src/services/portfolio/PortfolioCoach.ts
import { PortfolioHealthEngine } from './PortfolioHealthEngine';
import { PortfolioRiskEngine } from './PortfolioRiskEngine';
import { UserHolding } from './PortfolioEngine';
import { SectorWeight } from './PortfolioAnalyticsEngine';

export interface PortfolioCoachFeedback {
  diversificationStatus: string;
  diversificationAdvice: string;
  riskStatus: string;
  riskAdvice: string;
  generalOutlook: string;
}

export class PortfolioCoach {
  public static generateFeedback(
    holdings: UserHolding[],
    sectorWeights: SectorWeight[],
    volatility: number, // 0..100
    drawdown: number // 0..100
  ): PortfolioCoachFeedback {
    const healthResult = PortfolioHealthEngine.evaluateHealth(sectorWeights, volatility, drawdown);
    const riskResult = PortfolioRiskEngine.analyzeRisk(holdings);

    // Diversification analysis
    const topWeight = sectorWeights[0]?.weightPct || 0;
    const topSector = sectorWeights[0]?.sector || 'None';
    
    let diversificationStatus = 'Optimal';
    let diversificationAdvice = 'Your capital is distributed harmoniously across major sectors.';
    
    if (topWeight > 50) {
      diversificationStatus = 'Highly Concentrated';
      diversificationAdvice = `You have over 50% exposure in ${topSector}. Consider trimming holdings to lower sector-specific downside risks.`;
    } else if (topWeight > 35) {
      diversificationStatus = 'Moderate Concentration';
      diversificationAdvice = `Your largest sector exposure is ${topSector} at ${topWeight.toFixed(1)}%. Keeping this under 35% is a healthy risk-hedging strategy.`;
    }

    // Volatility and Risk coaching
    let riskStatus = 'Defensive & Strong';
    let riskAdvice = 'Your holdings lean heavily towards stable, high-moat sectors.';

    if (riskResult.weakestHoldingSymbol !== 'None') {
      riskStatus = 'Dynamic / Growth';
      riskAdvice = `Weakest risk holding is identified as ${riskResult.weakestHoldingSymbol} due to ${riskResult.weakestHoldingReason.toLowerCase()}`;
    }

    let generalOutlook = 'Excellent portfolio architecture. Proceed with planned regular additions.';
    if (healthResult.score < 50) {
      generalOutlook = 'Action Required: Trim highly volatile midcaps and rebalance towards defensive sectors.';
    } else if (healthResult.score < 75) {
      generalOutlook = 'Moderate health: Rebalance occasionally to maintain a robust cash-to-equity ratio.';
    }

    return {
      diversificationStatus,
      diversificationAdvice,
      riskStatus,
      riskAdvice,
      generalOutlook,
    };
  }
}
