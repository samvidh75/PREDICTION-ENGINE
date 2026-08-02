/**
 * Portfolio — TRACK-34 Phase 5 & 6 barrel export.
 *
 * Exports portfolio construction and position sizing engines plus their
 * shared type contracts.
 */

export { PortfolioConstructionEngine, portfolioConstructionEngine } from './PortfolioConstructionEngine';
export { PositionSizingEngine, positionSizingEngine } from './PositionSizingEngine';

export type {
  PortfolioType,
  SizingMethod,
  PositionAllocation,
  ConstraintsReport,
  Portfolio,
} from './types';