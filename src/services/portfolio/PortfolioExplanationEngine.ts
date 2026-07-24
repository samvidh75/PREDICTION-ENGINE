/**
 * PortfolioExplanationEngine — Natural language portfolio explainability.
 * 
 * TRACK-7H: Converts portfolio scores into actionable insights.
 * Outputs strongest/weakest holdings, risk drivers, concentration warnings.
 */

import type { PortfolioHolding, PortfolioSnapshot } from '../brokers/PortfolioTypes';
import type { PortfolioHealthResult } from './portfolioIntelligenceEngine';

export interface PortfolioExplanation {
  summary: string;
  strongestHoldings: string[];
  weakestHoldings: string[];
  topRisks: string[];
  sectorWarnings: string[];
  diversificationInsights: string[];
  healthDrivers: string[];
  recommendationCount: number;
}

export class PortfolioExplanationEngine {
  /** Generate a complete portfolio explanation */
  static explain(snapshot: PortfolioSnapshot, health: PortfolioHealthResult): PortfolioExplanation {
    const holdings = snapshot.holdings;

    const strongest = this.findStrongest(holdings, 3);
    const weakest = this.findWeakest(holdings, 3);
    const risks = this.identifyRisks(health, holdings);
    const sectorWarnings = health.sectorConcentrationWarnings;
    const diversification = this.diversificationInsights(health);
    const drivers = this.healthDrivers(health, holdings);

    const summary = this.generateSummary(health, holdings.length);

    return {
      summary,
      strongestHoldings: strongest,
      weakestHoldings: weakest,
      topRisks: risks,
      sectorWarnings,
      diversificationInsights: diversification,
      healthDrivers: drivers,
      recommendationCount: risks.length + sectorWarnings.length,
    };
  }

  /** Find strongest holdings (best PnL%) */
  private static findStrongest(holdings: PortfolioHolding[], count: number): string[] {
    return [...holdings]
      .filter(h => h.pnlPercent !== undefined)
      .sort((a, b) => (b.pnlPercent ?? 0) - (a.pnlPercent ?? 0))
      .slice(0, count)
      .map(h => `${h.symbol}: +${h.pnlPercent?.toFixed(1)}% (₱${((h.lastPrice ?? h.averagePrice) * h.quantity).toLocaleString('en-PH')})`);
  }

  /** Find weakest holdings (worst PnL%) */
  private static findWeakest(holdings: PortfolioHolding[], count: number): string[] {
    return [...holdings]
      .filter(h => h.pnlPercent !== undefined)
      .sort((a, b) => (a.pnlPercent ?? 0) - (b.pnlPercent ?? 0))
      .slice(0, count)
      .map(h => `${h.symbol}: ${h.pnlPercent?.toFixed(1)}% (₱${((h.lastPrice ?? h.averagePrice) * h.quantity).toLocaleString('en-PH')})`);
  }

  /** Identify top risks */
  private static identifyRisks(health: PortfolioHealthResult, holdings: PortfolioHolding[]): string[] {
    const risks: string[] = [];

    if (health.riskScore > 60) {
      risks.push('High portfolio risk — consider reducing position sizes in concentrated holdings');
    }
    if (health.diversificationScore < 40) {
      risks.push('Low diversification — add stocks from underrepresented sectors');
    }
    if (holdings.length < 5) {
      risks.push('Fewer than 5 holdings — individual stock risk is high');
    }
    if (health.qualityScore < 40) {
      risks.push('Low quality score — consider increasing allocation to large-cap stocks');
    }

    // Single stock domination
    let totalValue = 0;
    for (const h of holdings) {
      totalValue += (h.lastPrice ?? h.averagePrice) * h.quantity;
    }

    for (const h of holdings) {
      const value = (h.lastPrice ?? h.averagePrice) * h.quantity;
      const weight = totalValue > 0 ? value / totalValue : 0;
      if (weight > 0.35) {
        risks.push(`${h.symbol} dominates portfolio (${(weight * 100).toFixed(0)}%) — a 10% drop would significantly impact overall returns`);
      }
    }

    return risks;
  }

  /** Generate diversification insights */
  private static diversificationInsights(health: PortfolioHealthResult): string[] {
    const insights: string[] = [];

    if (health.diversificationScore >= 70) {
      insights.push('Portfolio is well-diversified across sectors and stocks');
    } else if (health.diversificationScore >= 50) {
      insights.push('Adequate diversification; consider adding exposure to underrepresented sectors');
    } else {
      insights.push('Portfolio needs better diversification — spread investments across 3+ sectors with ≥5 stocks');
    }

    return insights;
  }

  /** Identify health drivers */
  private static healthDrivers(health: PortfolioHealthResult, holdings: PortfolioHolding[]): string[] {
    const drivers: string[] = [];

    if (health.healthScore >= 70) drivers.push('Strong overall health driven by balanced allocation and positive performance');
    else if (health.healthScore >= 50) drivers.push('Moderate health — diversification and quality improvements would strengthen the portfolio');
    else drivers.push('Below-average health — address concentration and quality concerns');

    if (health.riskScore < 30) drivers.push('Low risk profile: well-distributed positions');
    if (health.qualityScore > 65) drivers.push('High quality: strong large-cap presence');

    return drivers;
  }

  /** Generate one-line summary */
  private static generateSummary(health: PortfolioHealthResult, holdingCount: number): string {
    const map: Record<string, string> = {
      'Excellent': `Exceptional portfolio with ${holdingCount} holdings — well-diversified, quality-focused, and showing strong performance.`,
      'Strong': `Strong portfolio of ${holdingCount} holdings with good diversification and quality.`,
      'Healthy': `Healthy ${holdingCount}-stock portfolio. Consider addressing mild concentration to strengthen further.`,
      'Stable': `Stable portfolio of ${holdingCount} holdings with room for diversification improvement.`,
      'Weakening': `Portfolio shows signs of concentration risk across ${holdingCount} holdings — diversification and quality improvements recommended.`,
      'At Risk': `Portfolio exhibits elevated risk across ${holdingCount} holdings — urgent diversification and quality review needed.`,
    };

    return map[health.healthClassification] || `Portfolio analysis for ${holdingCount} holdings.`;
  }
}
