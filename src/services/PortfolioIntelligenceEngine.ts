// src/services/PortfolioIntelligenceEngine.ts
// Production Portfolio Intelligence Engine.
// Evaluates diversification, risk concentrations, factor exposures, and sector exposures for client positions.
//
// TRACK-P2: Fixed silent neutralization of factor scores (DEFECT 6).
// - Tracks which positions had neutralized factor scores.
// - Returns neutralizedFields in the response.
// - Lowers confidence when factor data is neutralized.
// - Added evaluatePortfolioV2 that returns data-integrity metadata.

import { query } from "../db/index";
import {
  validatePortfolioPositions,
  type RejectedPortfolioPosition,
} from "./portfolio/PortfolioPositionValidator";

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
  /** Direct API positions rejected before database access. */
  rejectedPositions: RejectedPortfolioPosition[];
}

/**
 * Tracks which fields were neutralized for a specific position.
 */
export interface NeutralizedPosition {
  symbol: string;
  /** Names of factor fields that were neutralized (set to 50) due to missing data. */
  neutralizedFactors: string[];
}

export class InvalidPortfolioPositionsError extends Error {
  readonly code = "INVALID_PORTFOLIO_POSITIONS";
  readonly rejectedPositions: RejectedPortfolioPosition[];

  constructor(rejectedPositions: RejectedPortfolioPosition[]) {
    super("Portfolio intelligence requires at least one valid symbol with a positive weight.");
    this.name = "InvalidPortfolioPositionsError";
    this.rejectedPositions = rejectedPositions;
  }
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
   * neutralized and rejected fields, use evaluatePortfolioV2.
   */
  async evaluatePortfolio(positions: PortfolioPosition[]): Promise<PortfolioIntelligence> {
    const result = await this.evaluatePortfolioV2(positions);
    return result.intelligence;
  }

  /**
   * TRACK-P2: Evaluate a portfolio with data integrity tracking.
   *
   * Invalid symbols and non-positive/non-finite weights are removed before any
   * database query executes. Duplicate symbols are merged and the remaining
   * weights are normalized to sum to one.
   */
  async evaluatePortfolioV2(
    positions: PortfolioPosition[],
  ): Promise<PortfolioIntelligenceV2> {
    const validated = validatePortfolioPositions(positions);
    const normalizedPositions = validated.positions;
    if (normalizedPositions.length === 0) {
      throw new InvalidPortfolioPositionsError(validated.rejected);
    }

    // Track neutralized fields per position
    const neutralizedFields: NeutralizedPosition[] = [];

    // 1. Diversification analysis (Herfindahl-Hirschman Index proxy)
    // HHI = sum(w^2) * 10000
    const hhi = normalizedPositions.reduce(
      (sum, position) => sum + Math.pow(position.weight * 100, 2),
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

    for (const position of normalizedPositions) {
      const symbolResult = await query(
        `SELECT sector FROM symbols WHERE symbol = $1`,
        [position.symbol],
      );
      const sectorValue = (symbolResult.rows[0] as any)?.sector;
      const sector = typeof sectorValue === "string" && sectorValue.trim()
        ? sectorValue.trim()
        : "Sector unavailable";
      sectorExposure[sector] = (sectorExposure[sector] || 0) + position.weight * 100;

      const factorResult = await query(
        `SELECT quality_factor, value_factor, growth_factor, momentum_factor, risk_factor
         FROM factor_snapshots
         WHERE symbol = $1
         ORDER BY trade_date DESC LIMIT 1`,
        [position.symbol],
      );

      const factors = factorResult.rows[0] as Record<string, unknown> | undefined;
      if (factors) {
        // Track which specific factor fields are null, missing or non-finite.
        const neutralizedForPosition: string[] = [];

        for (const field of FACTOR_FIELDS) {
          const parsed = Number(factors[field]);
          const key = this.mapFieldToKey(field);
          if (factors[field] === null || factors[field] === undefined || !Number.isFinite(parsed)) {
            neutralizedForPosition.push(field);
            // Use neutral 50 but RECORD that it was neutralized.
            factorScores[key] += 50 * position.weight;
          } else {
            factorScores[key] += parsed * position.weight;
          }
        }

        if (neutralizedForPosition.length > 0) {
          neutralizedFields.push({
            symbol: position.symbol,
            neutralizedFactors: neutralizedForPosition,
          });
        }
      } else {
        // Entire factor snapshot is missing for this symbol.
        // Record ALL factors as neutralized — don't silently inject 50.
        neutralizedFields.push({
          symbol: position.symbol,
          neutralizedFactors: [...FACTOR_FIELDS],
        });
        factorScores.quality += 50 * position.weight;
        factorScores.value += 50 * position.weight;
        factorScores.growth += 50 * position.weight;
        factorScores.momentum += 50 * position.weight;
        factorScores.risk += 50 * position.weight;
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

    // Compute completeness score. Each position contributes five factor fields.
    const totalPossibleFields = normalizedPositions.length * FACTOR_FIELDS.length;
    let availableFields = totalPossibleFields;
    for (const entry of neutralizedFields) {
      availableFields -= entry.neutralizedFactors.length;
    }
    const completenessScore = totalPossibleFields > 0
      ? Math.round((availableFields / totalPossibleFields) * 100)
      : 0;

    return {
      intelligence: {
        diversificationStatus,
        riskConcentration,
        factorExposure,
        sectorExposure,
      },
      neutralizedFields,
      completenessScore,
      rejectedPositions: validated.rejected,
    };
  }

  /** Map database column name to factor score key. */
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
