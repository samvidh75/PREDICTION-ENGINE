/**
 * RiskCalibrator — Phase 7
 * Calibrates risk scores against Indian market realities,
 * adjusting for sector-specific risk profiles, market cap
 * risk premia, and concentration risk.
 *
 * Part of the intelligence calibration pipeline.
 */
import { DEFAULT_CALIBRATION, type CalibrationConfig } from './CalibrationTypes';
import { MarketCapCalibrator } from './MarketCapCalibrator';
import { SectorCalibrationEngine } from './SectorCalibrationEngine';

export interface RiskProfile {
  /** Overall risk score (0–1, higher = riskier) */
  overallRisk: number;
  /** Decomposed risk components */
  financialRisk: number;
  marketRisk: number;
  concentrationRisk: number;
  governanceRisk: number;
  /** Risk category */
  category: 'low' | 'moderate' | 'high' | 'severe';
}

export interface RiskAdjustment {
  sectorMultiplier: number;
  marketCapMultiplier: number;
  concentrationPenalty: number;
  adjustedRisk: number;
  explanation: string;
}

export class RiskCalibrator {
  private config: CalibrationConfig;
  private sectorEngine: SectorCalibrationEngine;
  private marketCapCalibrator: MarketCapCalibrator;

  constructor(config?: CalibrationConfig) {
    this.config = config ?? DEFAULT_CALIBRATION;
    this.sectorEngine = new SectorCalibrationEngine(this.config);
    this.marketCapCalibrator = new MarketCapCalibrator(this.config);
  }

  /** Compute a comprehensive risk profile */
  computeRiskProfile(params: {
    symbol: string;
    sector: string;
    marketCapCr: number;
    debtToEquity?: number;
    beta?: number;
    promoterHolding?: number;
    fiiHolding?: number;
    customerConcentration?: number;
    pledgePercent?: number;
  }): RiskProfile {
    const finRisk = this.computeFinancialRisk(params.debtToEquity);
    const mktRisk = this.computeMarketRisk(params.beta);
    const concRisk = this.computeConcentrationRisk(
      params.customerConcentration,
      params.promoterHolding,
      params.fiiHolding,
    );
    const govRisk = this.computeGovernanceRisk(params.pledgePercent, params.promoterHolding);

    const overall = (finRisk * 0.30) + (mktRisk * 0.25) + (concRisk * 0.25) + (govRisk * 0.20);

    let category: RiskProfile['category'] = 'low';
    if (overall > 0.7) category = 'severe';
    else if (overall > 0.5) category = 'high';
    else if (overall > 0.3) category = 'moderate';

    return {
      overallRisk: Math.min(1, Math.max(0, overall)),
      financialRisk: finRisk,
      marketRisk: mktRisk,
      concentrationRisk: concRisk,
      governanceRisk: govRisk,
      category,
    };
  }

  /** Adjust risk score using sector and market-cap calibration */
  adjustRisk(rawRisk: number, sector: string, marketCapCr: number): RiskAdjustment {
    const secCal = this.sectorEngine.getSectorCalibration(sector);
    const capBucket = this.marketCapCalibrator.getBucket(marketCapCr);

    // Sector risk multiplier from factor weights
    const sectorMultiplier = secCal.factorWeights.risk || 1.0;

    // Market cap risk multiplier: smaller caps get higher risk adjustment
    const marketCapMultiplier = 1.0 / capBucket.liquidityFactor;

    // Concentration penalty based on sector + market cap combo
    const concentrationPenalty = (sectorMultiplier - 1.0) * 0.3;

    const adjustedRisk = rawRisk * sectorMultiplier * marketCapMultiplier + concentrationPenalty;

    return {
      sectorMultiplier,
      marketCapMultiplier,
      concentrationPenalty,
      adjustedRisk: Math.min(1, Math.max(0, adjustedRisk)),
      explanation: this.buildExplanation(sector, marketCapCr, sectorMultiplier, marketCapMultiplier),
    };
  }

  /** Get sector risk classification for radar visualization */
  getRiskCategory(sector: string, marketCapCr: number, riskScore: number): string {
    const adjusted = this.adjustRisk(riskScore, sector, marketCapCr);
    if (adjusted.adjustedRisk > 0.7) return 'High Risk';
    if (adjusted.adjustedRisk > 0.5) return 'Elevated Risk';
    if (adjusted.adjustedRisk > 0.3) return 'Moderate Risk';
    return 'Low Risk';
  }

  /** Check if risk is within acceptable bounds for a given opportunity class */
  isRiskAcceptable(riskScore: number, opportunityClass: string): boolean {
    const thresholds: Record<string, number> = {
      compounder: 0.4,
      growth_at_reasonable_price: 0.55,
      turnaround: 0.75,
      dividend_yield: 0.35,
      momentum: 0.65,
      value_play: 0.70,
      special_situation: 0.80,
      defensive: 0.30,
      cyclical_play: 0.70,
      emerging_leader: 0.65,
    };
    const threshold = thresholds[opportunityClass] ?? 0.5;
    return riskScore <= threshold;
  }

  private computeFinancialRisk(dte?: number): number {
    if (dte == null) return 0.5; // Unknown = moderate
    if (dte <= 0.5) return 0.1;
    if (dte <= 1.0) return 0.25;
    if (dte <= 1.5) return 0.4;
    if (dte <= 2.0) return 0.6;
    if (dte <= 3.0) return 0.8;
    return 1.0;
  }

  private computeMarketRisk(beta?: number): number {
    if (beta == null) return 0.5;
    if (beta <= 0.5) return 0.1;
    if (beta <= 0.8) return 0.2;
    if (beta <= 1.1) return 0.35;
    if (beta <= 1.3) return 0.5;
    if (beta <= 1.5) return 0.7;
    return 0.9;
  }

  private computeConcentrationRisk(
    customerConc?: number,
    promoterHolding?: number,
    fiiHolding?: number,
  ): number {
    let score = 0;
    let count = 0;

    if (customerConc != null) {
      score += customerConc > 50 ? 1.0 : customerConc > 30 ? 0.6 : 0.2;
      count++;
    }
    if (promoterHolding != null) {
      score += promoterHolding < 25 ? 0.7 : promoterHolding > 75 ? 0.6 : 0.2;
      count++;
    }
    if (fiiHolding != null) {
      score += fiiHolding > 40 ? 0.7 : fiiHolding > 25 ? 0.4 : 0.1;
      count++;
    }

    return count > 0 ? score / count : 0.5;
  }

  private computeGovernanceRisk(pledgePercent?: number, promoterHolding?: number): number {
    let score = 0;
    let count = 0;

    if (pledgePercent != null) {
      score += pledgePercent > 50 ? 1.0 : pledgePercent > 20 ? 0.6 : pledgePercent > 5 ? 0.2 : 0;
      count++;
    }
    if (promoterHolding != null) {
      // Very low promoter holding can be a governance concern
      score += promoterHolding < 10 ? 0.8 : promoterHolding < 20 ? 0.4 : 0.1;
      count++;
    }

    return count > 0 ? score / count : 0.3;
  }

  private buildExplanation(
    sector: string,
    marketCapCr: number,
    sectorMult: number,
    capMult: number,
  ): string {
    const parts: string[] = [];
    if (sectorMult !== 1.0) parts.push(`${sector} sector factor: ${sectorMult.toFixed(2)}x`);
    if (capMult !== 1.0) parts.push(`market cap factor: ${capMult.toFixed(2)}x`);
    return parts.join('; ') || 'No adjustments applied';
  }
}
