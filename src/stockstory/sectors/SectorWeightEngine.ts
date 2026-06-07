/**
 * Sector Weight Engine
 * 
 * Dynamically adjusts factor contributions based on sector.
 * No engine duplication — weights are applied at the orchestrator level.
 */

export type SectorType = 'BANKING' | 'IT' | 'FMCG' | 'PHARMA' | 'AUTO' | 'ENERGY' | 'GENERAL';

export interface SectorWeights {
  growth: number;
  quality: number;
  stability: number;
  valuation: number;
  momentum: number;
}

const SECTOR_WEIGHT_MAP: Record<SectorType, SectorWeights> = {
  BANKING: {
    growth: 15,
    quality: 35,
    stability: 25,
    valuation: 15,
    momentum: 10,
  },
  IT: {
    growth: 30,
    quality: 25,
    stability: 15,
    valuation: 15,
    momentum: 15,
  },
  FMCG: {
    growth: 20,
    quality: 30,
    stability: 25,
    valuation: 15,
    momentum: 10,
  },
  PHARMA: {
    growth: 25,
    quality: 25,
    stability: 20,
    valuation: 15,
    momentum: 15,
  },
  AUTO: {
    growth: 20,
    quality: 20,
    stability: 25,
    valuation: 20,
    momentum: 15,
  },
  ENERGY: {
    growth: 15,
    quality: 20,
    stability: 30,
    valuation: 25,
    momentum: 10,
  },
  GENERAL: {
    growth: 25,
    quality: 25,
    stability: 20,
    valuation: 15,
    momentum: 15,
  },
};

/**
 * Map a sector name string to SectorType.
 */
export function mapSectorToType(sectorName: string): SectorType {
  const key = sectorName.toLowerCase().trim();

  if (key.includes('bank') || key.includes('financial') || key.includes('nbfc')) return 'BANKING';
  if (key.includes('it') || key === 'technology' || key.includes('software')) return 'IT';
  if (key.includes('fmcg') || key.includes('consumer')) return 'FMCG';
  if (key.includes('pharma') || key.includes('drug') || key.includes('healthcare')) return 'PHARMA';
  if (key.includes('auto') || key.includes('automobile')) return 'AUTO';
  if (key.includes('energy') || key.includes('power') || key.includes('oil') || key.includes('gas') || key.includes('utilities')) return 'ENERGY';

  return 'GENERAL';
}

/**
 * Get sector weights for a given sector name.
 */
export function getSectorWeights(sectorName: string): SectorWeights {
  const type = mapSectorToType(sectorName);
  return SECTOR_WEIGHT_MAP[type];
}

/**
 * Compute weighted health score using sector-specific weights.
 */
export function computeSectorWeightedHealth(
  scores: {
    growth: number;
    quality: number;
    stability: number;
    valuation: number;
    momentum: number;
  },
  sectorName: string
): number {
  const weights = getSectorWeights(sectorName);
  const total =
    scores.growth * weights.growth +
    scores.quality * weights.quality +
    scores.stability * weights.stability +
    scores.valuation * weights.valuation +
    scores.momentum * weights.momentum;

  const totalWeight =
    weights.growth +
    weights.quality +
    weights.stability +
    weights.valuation +
    weights.momentum;

  return Math.round(total / totalWeight);
}

export default { getSectorWeights, mapSectorToType, computeSectorWeightedHealth };
