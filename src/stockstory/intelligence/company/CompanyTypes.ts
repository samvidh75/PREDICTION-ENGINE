/**
 * Company Intelligence Types
 *
 * The Company Intelligence Profile is the canonical "about this company"
 * representation consumed by the thesis engine, peer graph, and explainability layer.
 */

import type { IntelligenceSignal } from '../signals/SignalTypes';

export interface CompanyIntelligenceProfile {
  symbol: string;
  exchange: string;
  generatedAt: string;

  /** Core identity */
  identity: CompanyIdentity;

  /** Financial fundamentals snapshot */
  fundamentals: FundamentalSnapshot;

  /** Quality & governance assessment */
  quality: QualityAssessment;

  /** Growth trajectory */
  growth: GrowthTrajectory;

  /** Competitive position */
  moat: MoatAssessment;

  /** All active signals for this company */
  signals: IntelligenceSignal[];

  /** Aggregate scores */
  aggregate: CompanyAggregateScores;

  /** Product-facing narrative */
  narrative: CompanyNarrative;
}

export interface CompanyIdentity {
  name: string | null;
  isin: string | null;
  sector: string;
  industry: string | null;
  marketCap: number | null;
  marketCapBucket: 'large_cap' | 'mid_cap' | 'small_cap' | 'micro_cap' | 'unknown';
  listedSince: string | null;
  headquarterState: string | null;
  employeeCount: number | null;
}

export interface FundamentalSnapshot {
  /** Return metrics */
  roe: number | null;
  roic: number | null;
  roa: number | null;

  /** Margin profile */
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;

  /** Balance sheet health */
  debtToEquity: number | null;
  interestCoverage: number | null;
  currentRatio: number | null;

  /** Valuation snapshot */
  peRatio: number | null;
  pbRatio: number | null;
  evToEbitda: number | null;
  dividendYield: number | null;
  freeCashFlowYield: number | null;

  /** Growth rates */
  revenueGrowth3y: number | null;
  profitGrowth3y: number | null;
  epsGrowth3y: number | null;
}

export interface QualityAssessment {
  qualityScore: number;         // 0-100
  earningsQuality: number;      // 0-100
  balanceSheetQuality: number;  // 0-100
  governanceScore: number | null;
  promoterHolding: number | null;
  institutionalHolding: number | null;
  pledgedShares: number | null;
  redFlags: string[];
}

export interface GrowthTrajectory {
  trajectoryScore: number;       // 0-100
  revenueCAGR: number | null;
  profitCAGR: number | null;
  trajectory: 'accelerating' | 'steady' | 'decelerating' | 'unclear';
  marginExpanding: boolean | null;
  capexIncreasing: boolean | null;
}

export interface MoatAssessment {
  moatScore: number;             // 0-100
  moatWidth: 'wide' | 'narrow' | 'none' | 'unclear';
  pricingPower: 'strong' | 'moderate' | 'weak' | 'unclear';
  switchingCosts: 'high' | 'moderate' | 'low' | 'unclear';
  networkEffects: boolean | null;
  costAdvantage: boolean | null;
  intangibleAssets: boolean | null;
}

export interface CompanyAggregateScores {
  overall: number;               // 0-100 weighted composite
  classification: 'excellent' | 'healthy' | 'stable' | 'weakening' | 'at_risk';
  confidence: number;            // 0-1
  dataCompleteness: number;      // 0-1
}

export interface CompanyNarrative {
  oneLiner: string;
  strengths: string[];
  concerns: string[];
  thesisContext: string;
  lastUpdated: string;
}
