// src/services/PortfolioIntelligenceEngine.ts
// Production Portfolio Intelligence Engine.
// Evaluates diversification, risk concentrations, factor exposures, and sector exposures for client positions.

import { query } from "../db/index";

export interface PortfolioPosition {
  symbol: string;
  weight: number; // e.g. 0.20 for 20%
}

export interface PortfolioIntelligence {
  diversificationStatus: "Well-Diversified" | "Moderately Concentrated" | "High Concentration";
  riskConcentration: string;
  factorExposure: Record<string, number>;
  sectorExposure: Record<string, number>;
}

export class PortfolioIntelligenceEngine {
  async evaluatePortfolio(positions: PortfolioPosition[]): Promise<PortfolioIntelligence> {
    const totalWeight = positions.reduce((a, b) => a + b.weight, 0);
    const normalizedPositions = positions.map(p => ({
      symbol: p.symbol,
      weight: totalWeight > 0 ? p.weight / totalWeight : 0,
    }));

    // 1. Diversification analysis (Herfindahl-Hirschman Index proxy)
    // HHI = sum(w^2) * 10000
    const hhi = normalizedPositions.reduce((sum, p) => sum + Math.pow(p.weight * 100, 2), 0);
    let diversificationStatus: "Well-Diversified" | "Moderately Concentrated" | "High Concentration" = "Well-Diversified";
    if (hhi > 2500) diversificationStatus = "High Concentration";
    else if (hhi > 1500) diversificationStatus = "Moderately Concentrated";

    // 2. Query Sector and Factor exposures
    const sectorExposure: Record<string, number> = {};
    const factorScores: Record<string, number> = {
      quality: 0,
      value: 0,
      growth: 0,
      momentum: 0,
      risk: 0,
    };

    for (const pos of normalizedPositions) {
      const symRes = await query(
        `SELECT sector FROM symbols WHERE symbol = $1`,
        [pos.symbol]
      );
      const sector = symRes.rows[0]?.sector || "Unclassified";
      sectorExposure[sector] = (sectorExposure[sector] || 0) + pos.weight * 100;

      const factRes = await query(
        `SELECT quality_factor, value_factor, growth_factor, momentum_factor, risk_factor
         FROM factor_snapshots
         WHERE symbol = $1
         ORDER BY trade_date DESC LIMIT 1`,
        [pos.symbol]
      );

      const f = factRes.rows[0];
      if (f) {
        factorScores.quality += Number(f.quality_factor) * pos.weight;
        factorScores.value += Number(f.value_factor) * pos.weight;
        factorScores.growth += Number(f.growth_factor) * pos.weight;
        factorScores.momentum += Number(f.momentum_factor) * pos.weight;
        factorScores.risk += Number(f.risk_factor) * pos.weight;
      } else {
        factorScores.quality += 50 * pos.weight;
        factorScores.value += 50 * pos.weight;
        factorScores.growth += 50 * pos.weight;
        factorScores.momentum += 50 * pos.weight;
        factorScores.risk += 50 * pos.weight;
      }
    }

    // Round values
    for (const key of Object.keys(sectorExposure)) {
      sectorExposure[key] = Math.round(sectorExposure[key] * 100) / 100;
    }
    const factorExposure = {
      quality: Math.round(factorScores.quality),
      value: Math.round(factorScores.value),
      growth: Math.round(factorScores.growth),
      momentum: Math.round(factorScores.momentum),
      risk: Math.round(factorScores.risk),
    };

    // Determine risk concentration
    const maxSector = Object.entries(sectorExposure).sort((a, b) => b[1] - a[1])[0];
    let riskConcentration = "Risk exposures are balanced across active parameters.";
    if (maxSector && maxSector[1] > 40) {
      riskConcentration = `High sector concentration risk identified in ${maxSector[0]} (${maxSector[1]}% allocation).`;
    }

    return {
      diversificationStatus,
      riskConcentration,
      factorExposure,
      sectorExposure,
    };
  }
}

export const portfolioIntelligenceEngine = new PortfolioIntelligenceEngine();
export default portfolioIntelligenceEngine;
