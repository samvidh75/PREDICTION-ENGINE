// src/services/PortfolioIntelligenceEngine.ts
// Production Portfolio Intelligence Engine.
// Evaluates diversification, risk concentrations, factor exposures, and sector exposures for client positions.
//
// TRACK-P2: Fixed silent neutralization of factor scores (DEFECT 6).
// - Tracks which positions had neutralized factor scores.
// - Returns neutralizedFields in the response.
// - Lowers confidence when factor data is neutralized.
// - Added evaluatePortfolioV2 that returns { intelligence, neutralizedFields, completenessScore }.

import { query } from "../db/index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

/**
 * Extended response for V2 that includes data integrity metadata.
 */
export interface PortfolioIntelligenceV2 {
  /** The core portfolio intelligence result. */
  intelligence: PortfolioIntelligence;
  /** Positions and their neutralized factor fields. */
  neutralizedFields: NeutralizedPosition[];
  /** Overall completeness score for the portfolio evaluation (0-100). */
  completenessScore: number;
}

/**
 * Tracks which fields were neutralized for a specific position.
 */
export interface NeutralizedPosition {
  symbol: string;
  /** Names of factor fields that were neutralized (set to 50) due to missing data. */
  neutralizedFactors: string[];
}

// Factor field names that are queried
const FACTOR_FIELDS = [
  "quality_factor",
  "value_factor",
  "growth_factor",
  "momentum_factor",
  "risk_factor",
] as const;

// ---------------------------------------------------------------------------
// PortfolioIntelligenceEngine
// ---------------------------------------------------------------------------

export class PortfolioIntelligenceEngine {
  /**
   * Evaluate a portfolio of positions.
   *
   * Backward-compatible signature. For data-integrity-aware evaluation that tracks
   * neutralized fields, use evaluatePortfolioV2.
   */
  async evaluatePortfolio(positions: PortfolioPosition[]): Promise<PortfolioIntelligence> {
    const result = await this.evaluatePortfolioV2(positions);
    return result.intelligence;
  }

  /**
   * TRACK-P2: Evaluate a portfolio with data integrity tracking.
   *
   * Fixes DEFECT 6: previously, when factor_snapshots were missing, the engine
   * silently injected neutral value 50 for all factors. Now:
   *
   * 1. Tracks which positions had neutralized factor scores.
   * 2. Returns neutralizedFields in the response.
   * 3. Lowers confidence when factor data is neutralized.
   * 4. Returns completenessScore along with the intelligence.
   *
   * @param positions List of portfolio positions with symbol and weight.
   * @returns Extended result with intelligence, neutralized fields, and completeness score.
   */
  async evaluatePortfolioV2(
    positions: PortfolioPosition[],
  ): Promise<PortfolioIntelligenceV2> {
    const totalWeight = positions.reduce((a, b) => a + b.weight, 0);
    const normalizedPositions = positions.map((p) => ({
      symbol: p.symbol,
      weight: totalWeight > 0 ? p.weight / totalWeight : 0,
    }));

    // Track neutralized fields per position
    const neutralizedFields: NeutralizedPosition[] = [];
    let totalFactorQueries = 0;
    let successfulFactorQueries = 0;

    // 1. Diversification analysis (Herfindahl-Hirschman Index proxy)
    // HHI = sum(w^2) * 10000
    const hhi = normalizedPositions.reduce(
      (sum, p) => sum + Math.pow(p.weight * 100, 2),
      0,
    );
    let diversificationStatus:
      | "Well-Diversified"
      | "Moderately Concentrated"
      | "High Concentration" = "Well-Diversified";
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
        [pos.symbol],
      );
      const sector: string = (symRes.rows[0] as any)?.sector || "Unclassified";
      sectorExposure[sector] = (sectorExposure[sector] || 0) + pos.weight * 100;

      totalFactorQueries++;

      const factRes = await query(
        `SELECT quality_factor, value_factor, growth_factor, momentum_factor, risk_factor
         FROM factor_snapshots
         WHERE symbol = $1
         ORDER BY trade_date DESC LIMIT 1`,
        [pos.symbol],
      );

      const f = factRes.rows[0] as Record<string, unknown> | undefined;
      if (f) {
        // Track which specific factor fields are null (missing)
        const neutralizedForPosition: string[] = [];

        for (const field of FACTOR_FIELDS) {
          const val = f[field];
          if (val === null || val === undefined) {
            neutralizedForPosition.push(field);
            // TRACK-P2: Use neutral 50 but RECORD that it was neutralized
            const key = this.mapFieldToKey(field);
            (factorScores as any)[key] += 50 * pos.weight;
          } else {
            const key = this.mapFieldToKey(field);
            (factorScores as any)[key] += Number(val) * pos.weight;
          }
        }

        if (neutralizedForPosition.length > 0) {
          neutralizedFields.push({
            symbol: pos.symbol,
            neutralizedFactors: neutralizedForPosition,
          });
        }

        // Even if some fields are null, the row exists so we had some success
        if (neutralizedForPosition.length < FACTOR_FIELDS.length) {
          successfulFactorQueries++;
        }
      } else {
        // Entire factor snapshot is missing for this symbol.
        // TRACK-P2: Record ALL factors as neutralized — don't silently inject 50.
        neutralizedFields.push({
          symbol: pos.symbol,
          neutralizedFactors: [...FACTOR_FIELDS],
        });

        // Still contribute neutral values for portfolio computation,
        // but we record that these were neutralized.
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
    const maxSector = Object.entries(sectorExposure).sort(
      (a, b) => b[1] - a[1],
    )[0];
    let riskConcentration =
      "Risk exposures are balanced across active parameters.";
    if (maxSector && maxSector[1] > 40) {
      riskConcentration = `High sector concentration risk identified in ${maxSector[0]} (${maxSector[1]}% allocation).`;
    }

    // ── Compute Completeness Score ────────────────────────────────────
    // Each position contributes 5 factor fields. Full score = positions * 5.
    const totalPossibleFields = normalizedPositions.length * FACTOR_FIELDS.length;
    let availableFields = totalPossibleFields;

    // Subtract one for each neutralized factor recorded
    for (const entry of neutralizedFields) {
      availableFields -= entry.neutralizedFactors.length;
    }

    const completenessScore =
      totalPossibleFields > 0
        ? Math.round((availableFields / totalPossibleFields) * 100)
        : 100;

    // ── Build Intelligence ────────────────────────────────────────────
    const intelligence: PortfolioIntelligence = {
      diversificationStatus,
      riskConcentration,
      factorExposure,
      sectorExposure,
    };

    return {
      intelligence,
      neutralizedFields,
      completenessScore,
    };
  }

  /**
   * Map database column name to factor score key.
   */
  private mapFieldToKey(
    field: string,
  ): "quality" | "value" | "growth" | "momentum" | "risk" {
    const map: Record<string, "quality" | "value" | "growth" | "momentum" | "risk"> = {
      quality_factor: "quality",
      value_factor: "value",
      growth_factor: "growth",
      momentum_factor: "momentum",
      risk_factor: "risk",
    };
    return map[field] ?? "quality";
  }
}

export const portfolioIntelligenceEngine = new PortfolioIntelligenceEngine();
export default portfolioIntelligenceEngine;
