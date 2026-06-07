/**
 * PortfolioIntelligenceEngine — Unified portfolio analytics engine.
 * 
 * TRACK-7H: Weighted multi-factor portfolio health model.
 * 
 * Calculates:
 *   - Weighted Health Score (0-100)
 *   - Risk Score (0-100)
 *   - Quality Score (0-100) 
 *   - Diversification Score (0-100)
 *   - Sector Concentration Warnings
 * 
 * All scores are 0-100, higher = better (except Risk where higher = riskier).
 */

import type { PortfolioSnapshot } from '../brokers/PortfolioTypes';

// ── Backward-compatible types for existing consumers ──
export type SectorId = string;

/** @deprecated Legacy portfolio holding used by neuralMarketSynthesisEngine and PracticeReplayPanel */
export interface LegacyPortfolioHolding {
  id?: string;
  symbol?: string;
  company?: string;
  ticker?: string;
  sector?: string;
  weight: number;
  exchange?: string;
  quantity?: number;
  averagePrice?: number;
  lastPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  marketCap?: number;
}
// Re-export for backward compat (old code imports PortfolioHolding from here)
export type PortfolioHolding = LegacyPortfolioHolding;

export interface PortfolioHealth {
  score: number;
  concentration: number;
  volatilitySensitivity: number;
}

export interface PortfolioIntelligence {
  portfolioHealth: PortfolioHealth;
  timeline?: Array<{ id: string; when?: string; whenLabel?: string; text: string }>;
}

/**
 * @deprecated Backward-compatible stub for neuralMarketSynthesisEngine.
 * Use PortfolioIntelligenceEngine.evaluate() for real portfolio analysis.
 */
export function buildPortfolioIntelligence(inputs: {
  holdings: LegacyPortfolioHolding[];
  confidenceState?: string;
  marketInputs?: Record<string, number>;
  narrativeKey?: number;
}): PortfolioIntelligence {
  const key = inputs.narrativeKey ?? 0;
  const holdings = inputs.holdings ?? [];
  const concentration = holdings.reduce((max, h) => Math.max(max, h.weight ?? 0), 0);
  const score = Math.max(20, Math.min(90, 65 + (0.5 - concentration) * 40));
  
  return {
    portfolioHealth: {
      score: Math.round(score),
      concentration: Math.round(concentration * 100),
      volatilitySensitivity: 55,
    },
    timeline: [
      { id: `pi_${key}_1`, whenLabel: 'Synthetic portfolio cue', text: 'Portfolio context remains educationally structured.' },
      { id: `pi_${key}_2`, whenLabel: 'Liquidity lens', text: 'Liquidity conditioning stays calm and structural.' },
    ],
  };
}

export interface PortfolioHealthResult {
  healthScore: number;
  riskScore: number;
  qualityScore: number;
  diversificationScore: number;
  sectorConcentrationWarnings: string[];
  healthClassification: 'Excellent' | 'Strong' | 'Healthy' | 'Stable' | 'Weakening' | 'At Risk';
}

export class PortfolioIntelligenceEngine {
  static evaluate(snapshot: PortfolioSnapshot): PortfolioHealthResult {
    const holdings = snapshot.holdings;

    const healthScore = holdings.length === 0 ? 50 : this.weightedHealthScore(holdings);
    const riskScore = this.calculateRisk(holdings);
    const qualityScore = this.calculateQuality(holdings);
    const { diversificationScore, warnings } = this.calculateDiversification(holdings);

    const composite = (healthScore * 0.35) + (qualityScore * 0.30) + (diversificationScore * 0.20) - (riskScore * 0.15);
    const classification = this.classify(composite);

    return {
      healthScore: Math.round(healthScore),
      riskScore: Math.round(riskScore),
      qualityScore: Math.round(qualityScore),
      diversificationScore: Math.round(diversificationScore),
      sectorConcentrationWarnings: warnings,
      healthClassification: classification,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static weightedHealthScore(holdings: any[]): number {
    let totalValue = 0;
    let weightedScore = 0;

    for (const h of holdings) {
      const value = ((h.lastPrice ?? h.averagePrice) ?? 0) * (h.quantity ?? 0);
      totalValue += value;
      const holdingScore = this.individualHoldingScore(h);
      weightedScore += holdingScore * value;
    }

    return totalValue > 0 ? weightedScore / totalValue : 50;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static individualHoldingScore(holding: any): number {
    let score = 60;

    if (holding.pnlPercent !== undefined) {
      if (holding.pnlPercent > 20) score += 20;
      else if (holding.pnlPercent > 10) score += 15;
      else if (holding.pnlPercent > 0) score += 10;
      else if (holding.pnlPercent > -10) score -= 10;
      else if (holding.pnlPercent > -20) score -= 20;
      else score -= 30;
    }

    const defensiveSectors = ['FMCG', 'Pharma', 'IT', 'Insurance', 'Banking'];
    const cyclicalSectors = ['Realty', 'Metals', 'Mining', 'Oil & Gas'];
    
    if (defensiveSectors.some(s => holding.sector?.includes(s))) score += 10;
    if (cyclicalSectors.some(s => holding.sector?.includes(s))) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static calculateRisk(holdings: any[]): number {
    if (holdings.length === 0) return 50;

    let totalValue = 0;
    for (const h of holdings) {
      totalValue += ((h.lastPrice ?? h.averagePrice) ?? 0) * (h.quantity ?? 0);
    }

    const weights = holdings.map(h => {
      const value = ((h.lastPrice ?? h.averagePrice) ?? 0) * (h.quantity ?? 0);
      return totalValue > 0 ? value / totalValue : 0;
    });
    const maxWeight = Math.max(...weights);

    let riskScore = 30;
    if (maxWeight > 0.4) riskScore += 30;
    else if (maxWeight > 0.25) riskScore += 20;
    else if (maxWeight > 0.15) riskScore += 10;
    else riskScore -= 10;

    const sectorWeights = new Map<string, number>();
    for (let i = 0; i < holdings.length; i++) {
      const sector = holdings[i].sector || 'General';
      sectorWeights.set(sector, (sectorWeights.get(sector) || 0) + weights[i]);
    }

    const maxSectorWeight = Math.max(...sectorWeights.values());
    if (maxSectorWeight > 0.6) riskScore += 25;
    else if (maxSectorWeight > 0.4) riskScore += 15;
    else if (maxSectorWeight > 0.25) riskScore += 5;

    return Math.min(100, Math.max(5, riskScore));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static calculateQuality(holdings: any[]): number {
    if (holdings.length === 0) return 50;

    let largeCapCount = 0;
    let knownSectorCount = 0;

    for (const h of holdings) {
      const mc = h.marketCap;
      if (mc && mc > 200_000_000_000) largeCapCount++;
      const sector = h.sector;
      if (sector && sector !== 'General') knownSectorCount++;
    }

    const largeCapRatio = largeCapCount / holdings.length;
    const knownSectorRatio = knownSectorCount / holdings.length;

    let score = 50;
    score += largeCapRatio * 20;
    score += knownSectorRatio * 15;
    score += Math.min(holdings.length * 2, 15);

    return Math.min(100, Math.max(20, score));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static calculateDiversification(holdings: any[]): {
    diversificationScore: number;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (holdings.length === 0) {
      return { diversificationScore: 0, warnings: ['Portfolio is empty'] };
    }

    const sectors = new Set(holdings.map(h => h.sector || 'General'));
    const sectorCount = sectors.size;
    const uniqueStocks = new Set(holdings.map(h => h.symbol));
    const stockCount = uniqueStocks.size;

    let score = 30;

    if (sectorCount >= 5) score += 30;
    else if (sectorCount >= 3) score += 20;
    else if (sectorCount >= 2) score += 10;
    else { score -= 10; warnings.push('Single sector concentration — diversify across sectors'); }

    if (stockCount >= 15) score += 25;
    else if (stockCount >= 10) score += 15;
    else if (stockCount >= 5) score += 10;
    else { score -= 10; warnings.push('Fewer than 5 unique stocks — consider adding positions'); }

    let totalValue = 0;
    for (const h of holdings) totalValue += ((h.lastPrice ?? h.averagePrice) ?? 0) * (h.quantity ?? 0);

    for (const h of holdings) {
      const value = ((h.lastPrice ?? h.averagePrice) ?? 0) * (h.quantity ?? 0);
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
      if (weight > 40) {
        warnings.push(`${h.symbol} represents ${weight.toFixed(0)}% of portfolio — concentration risk`);
      }
    }

    const sectorValues = new Map<string, number>();
    for (const h of holdings) {
      const value = ((h.lastPrice ?? h.averagePrice) ?? 0) * (h.quantity ?? 0);
      const sector = h.sector || 'General';
      sectorValues.set(sector, (sectorValues.get(sector) || 0) + value);
    }

    for (const [sector, value] of sectorValues) {
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
      if (weight > 50) {
        warnings.push(`${sector} sector: ${weight.toFixed(0)}% allocation — excessive concentration`);
      }
    }

    return { diversificationScore: Math.min(100, Math.max(10, score)), warnings };
  }

  private static classify(score: number): PortfolioHealthResult['healthClassification'] {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Strong';
    if (score >= 55) return 'Healthy';
    if (score >= 40) return 'Stable';
    if (score >= 25) return 'Weakening';
    return 'At Risk';
  }
}
