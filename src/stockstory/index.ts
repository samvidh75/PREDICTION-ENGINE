/**
 * StockStory Engine — Barrel Export
 * 
 * Usage:
 *   import { stockStoryEngine } from '../stockstory';
 *   const result = stockStoryEngine.evaluate(inputs);
 */

// Types
export {
  type EngineInputs,
  type StockStoryOutput,
  type CompanyClassification,
  type ConfidenceLevel,
  type GrowthEngineOutput,
  type QualityEngineOutput,
  type StabilityEngineOutput,
  type MomentumEngineOutput,
  type ValuationEngineOutput,
  type RiskEngineOutput,
  type ConfidenceEngineOutput,
  clampScore,
  weightedAverage,
} from './types';

// Orchestrator
export { StockStoryEngine, stockStoryEngine } from './StockStoryEngine';

// Individual engines (for direct use if needed)
export { GrowthEngine, growthEngine } from './engines/GrowthEngine';
export { QualityEngine, qualityEngine } from './engines/QualityEngine';
export { StabilityEngine, stabilityEngine } from './engines/StabilityEngine';
export { MomentumEngine, momentumEngine } from './engines/MomentumEngine';
export { ValuationEngine, valuationEngine } from './engines/ValuationEngine';
export { RiskEngine, riskEngine } from './engines/RiskEngine';
export { ConfidenceEngine, confidenceEngine } from './engines/ConfidenceEngine';
export { AccountingEngine, accountingEngine } from './engines/AccountingEngine';
export type { AccountingEngineOutput } from './engines/AccountingEngine';

// Sector adapter
export { getSectorProfile, listSectorProfiles } from './SectorAdapter';
export type { SectorProfile } from './SectorAdapter';
