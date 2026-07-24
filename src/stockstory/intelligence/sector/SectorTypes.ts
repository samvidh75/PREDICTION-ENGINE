/**
 * Sector Intelligence Types
 *
 * The Sector Intelligence Profile provides context about the sector
 * a company operates in — sector health, cycles, tailwinds/headwinds.
 */

export interface SectorIntelligenceProfile {
  sectorName: string;
  generatedAt: string;

  /** Sector health & momentum */
  health: SectorHealth;

  /** Competitive dynamics */
  competitiveDynamics: CompetitiveDynamics;

  /** Sector-level risks */
  risks: SectorRisk[];

  /** PSX market specific context */
  indiaContext: PakistanSectorContext;

  /** Aggregate scores */
  aggregate: SectorAggregate;
}

export interface SectorHealth {
  healthScore: number;             // 0-100
  sectorStrength: number;          // 0-100
  momentum: 'accelerating' | 'steady' | 'decelerating' | 'unclear';
  tailwindScore: number;           // -100 to 100
  headwindScore: number;           // 0-100
  cyclicality: 'defensive' | 'cyclical' | 'highly_cyclical' | 'unclear';
  avgGrowth: number | null;
  avgMargin: number | null;
  avgPE: number | null;
  avgROE: number | null;
  trendDirection: 'improving' | 'stable' | 'deteriorating' | 'unclear';
}

export interface CompetitiveDynamics {
  intensity: 'high' | 'moderate' | 'low' | 'unclear';
  fragmentation: 'consolidated' | 'moderate' | 'fragmented' | 'unclear';
  barriers: 'high' | 'moderate' | 'low' | 'unclear';
  regulatoryBurden: 'high' | 'moderate' | 'low' | 'unclear';
  innovationRate: 'high' | 'moderate' | 'low' | 'unclear';
}

export interface SectorRisk {
  riskType: 'regulatory' | 'demand' | 'supply' | 'currency' | 'commodity' | 'policy' | 'competition' | 'disruption';
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface PakistanSectorContext {
  /** Government focus areas (PLI, infrastructure, digitization) */
  governmentSupport: 'strong' | 'moderate' | 'weak' | 'unclear';
  /** Formalisation benefit */
  formalisationBenefit: 'significant' | 'moderate' | 'limited' | 'unclear';
  /** Import substitution potential */
  importSubstitution: 'high' | 'moderate' | 'low' | 'unclear';
  /** Export potential */
  exportPotential: 'high' | 'moderate' | 'low' | 'unclear';
  /** Relevant regulations (SEC, RBI, TRAI, etc.) */
  relevantRegulations: string[];
}

export interface SectorAggregate {
  overallScore: number;
  peerCount: number;
  dataCompleteness: number;
  confidence: number;
}
