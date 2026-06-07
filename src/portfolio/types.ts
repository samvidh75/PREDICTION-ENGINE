/**
 * Portfolio Engine — Shared Types
 * TRACK-34 Phase 5 & 6 type contracts.
 *
 * Defines the output shape of portfolio construction and position sizing engines,
 * including constraint violation reporting.
 */

/** Supported portfolio construction styles. */
export type PortfolioType = 'Conservative' | 'Balanced' | 'Growth' | 'Momentum' | 'Value';

/** Supported position sizing methodologies. */
export type SizingMethod = 'Equal Weight' | 'Confidence Weight' | 'Risk Adjusted' | 'Volatility Adjusted';

/** A single position allocation with sizing metadata. */
export interface PositionAllocation {
  /** Upper-case stock symbol. */
  symbol: string;
  /** Allocation weight as a decimal (e.g. 0.05 = 5%). */
  weight: number;
  /** The sizing methodology used to derive this weight. */
  sizing_method: SizingMethod;
  /** Latest confidence score from factor_snapshots (0-100). */
  confidence_score: number;
  /** Latest risk factor from factor_snapshots (0-100, higher = riskier). */
  risk_score: number;
}

/** Report detailing which constraints were applied and what was violated. */
export interface ConstraintsReport {
  /** Maximum exposure allowed per sector as a decimal (e.g. 0.15 = 15%). */
  max_sector_exposure: number;
  /** Per-position weight cap as a decimal (e.g. 0.05 = 5%). */
  per_position_cap: number;
  /** Minimum market cap in crores required for inclusion. */
  liquidity_min: number;
  /** Minimum confidence level threshold. */
  confidence_min: string;
  /** Human-readable descriptions of any constraint violations that occurred. */
  violations: string[];
}

/** Full portfolio result returned by PortfolioConstructionEngine.build(). */
export interface Portfolio {
  /** The portfolio style used for construction. */
  style: PortfolioType;
  /** Ordered list of position allocations. */
  positions: PositionAllocation[];
  /** Constraint application report. */
  constraints: ConstraintsReport;
}