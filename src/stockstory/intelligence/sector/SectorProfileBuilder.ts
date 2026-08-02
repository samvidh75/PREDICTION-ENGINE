/**
 * Sector Profile Builder
 *
 * Builds a SectorIntelligenceProfile from sector data and PSE market context.
 * Provides sector-level intelligence for the company thesis engine.
 */

import type { IntelligenceInput } from '../../types';
import type {
  SectorIntelligenceProfile,
  SectorHealth,
  CompetitiveDynamics,
  SectorRisk,
  PhilippinesSectorContext,
  SectorAggregate,
} from './SectorTypes';
import { clampScore } from '../scoring';

export class SectorProfileBuilder {
  build(input: IntelligenceInput): SectorIntelligenceProfile {
    const sector = input.sector;
    const health = this.buildHealth(sector, input);
    const dynamics = this.buildDynamics(sector);
    const risks = this.buildRisks(sector);
    const philippines = this.buildPhilippinesContext(sector);
    const aggregate = this.buildAggregate(health);

    return {
      sectorName: sector.name || 'Unclassified',
      generatedAt: new Date().toISOString(),
      health,
      competitiveDynamics: dynamics,
      risks,
      philippinesContext: philippines,
      aggregate,
    };
  }

  private buildHealth(
    sector: IntelligenceInput['sector'],
    input: IntelligenceInput,
  ): SectorHealth {
    const strength = sector.sectorStrength ?? 50;
    const momentum = sector.sectorMomentum ?? 'steady';

    // Tailwind/headwind from macro context
    let tailwindScore = 0;
    let headwindScore = 0;

    if (sector.sectorAvgGrowth !== null && sector.sectorAvgGrowth > 15) tailwindScore += 30;
    else if (sector.sectorAvgGrowth !== null && sector.sectorAvgGrowth > 8) tailwindScore += 15;

    if (sector.sectorPe !== null && sector.sectorPe > 40) headwindScore += 20;
    else if (sector.sectorPe !== null && sector.sectorPe > 25) headwindScore += 10;

    // Cyclicality classification based on sector
    const cyclicality = this.classifyCyclicality(sector.name);

    // Trend direction
    const trendDirection: SectorHealth['trendDirection'] =
      momentum === 'accelerating' ? 'improving'
      : momentum === 'decelerating' ? 'deteriorating'
      : 'stable';

    return {
      healthScore: clampScore(strength),
      sectorStrength: clampScore(strength),
      momentum,
      tailwindScore: Math.min(100, Math.max(-100, tailwindScore)),
      headwindScore: clampScore(headwindScore),
      cyclicality,
      avgGrowth: sector.sectorAvgGrowth,
      avgMargin: sector.sectorAvgMargin,
      avgPE: sector.sectorPe,
      avgROE: null,
      trendDirection,
    };
  }

  private buildDynamics(sector: IntelligenceInput['sector']): CompetitiveDynamics {
    const barriers = sector.sectorStrength !== null && sector.sectorStrength > 70 ? 'high'
      : sector.sectorStrength !== null && sector.sectorStrength > 40 ? 'moderate'
      : 'unclear';

    return {
      intensity: 'moderate',
      fragmentation: 'unclear',
      barriers,
      regulatoryBurden: 'moderate',
      innovationRate: 'unclear',
    };
  }

  private buildRisks(sector: IntelligenceInput['sector']): SectorRisk[] {
    const risks: SectorRisk[] = [];
    const name = (sector.name || '').toLowerCase();

    // PSE sector-specific risk patterns
    if (name.includes('bank') || name.includes('financial') || name.includes('nbfc')) {
      risks.push({ riskType: 'regulatory', severity: 'medium', description: 'BSP regulatory changes may affect lending norms and capital requirements.' });
      risks.push({ riskType: 'demand', severity: 'medium', description: 'Credit growth sensitivity to economic cycles.' });
    }
    if (name.includes('pharma') || name.includes('health')) {
      risks.push({ riskType: 'regulatory', severity: 'medium', description: 'FDA Philippines and international drug pricing regulations.' });
      risks.push({ riskType: 'competition', severity: 'medium', description: 'Intense generic competition and patent cliffs.' });
    }
    if (name.includes('it') || name.includes('software') || name.includes('tech')) {
      risks.push({ riskType: 'currency', severity: 'medium', description: 'Revenue exposed to USD/PHP exchange rate fluctuations.' });
      risks.push({ riskType: 'demand', severity: 'medium', description: 'Global IT spending cycles affect revenue growth.' });
    }
    if (name.includes('oil') || name.includes('gas') || name.includes('energy')) {
      risks.push({ riskType: 'commodity', severity: 'high', description: 'Crude oil and natural gas price volatility directly impacts margins.' });
      risks.push({ riskType: 'policy', severity: 'medium', description: 'Government pricing and subsidy policies.' });
    }
    if (name.includes('auto') || name.includes('automobile')) {
      risks.push({ riskType: 'demand', severity: 'medium', description: 'Discretionary spending sensitivity to economic conditions.' });
      risks.push({ riskType: 'regulation', severity: 'medium', description: 'EV transition and emissions regulatory costs.' });
    }
    if (name.includes('metal') || name.includes('mining')) {
      risks.push({ riskType: 'commodity', severity: 'high', description: 'Global commodity price cycles drive profitability.' });
    }
    if (name.includes('retail') || name.includes('consumer')) {
      risks.push({ riskType: 'demand', severity: 'medium', description: 'Consumer spending sensitive to inflation and OFW remittances.' });
      risks.push({ riskType: 'competition', severity: 'medium', description: 'Organised vs unorganised sector competition.' });
    }

    // Add generic sector risk if none matched
    if (risks.length === 0) {
      risks.push({ riskType: 'competition', severity: 'medium', description: 'Sector-level competitive dynamics may shift over time.' });
      risks.push({ riskType: 'policy', severity: 'low', description: 'Monitor regulatory and policy changes.' });
    }

    return risks;
  }

  private buildPhilippinesContext(sector: IntelligenceInput['sector']): PhilippinesSectorContext {
    const name = (sector.name || '').toLowerCase();

    let governmentSupport: PhilippinesSectorContext['governmentSupport'] = 'unclear';
    let formalisationBenefit: PhilippinesSectorContext['formalisationBenefit'] = 'unclear';
    let importSubstitution: PhilippinesSectorContext['importSubstitution'] = 'unclear';
    let exportPotential: PhilippinesSectorContext['exportPotential'] = 'unclear';

    // Infrastructure beneficiaries
    if (name.includes('construction') || name.includes('cement') || name.includes('engineering')) {
      governmentSupport = 'strong';
      importSubstitution = 'high';
    }
    if (name.includes('auto') || name.includes('automobile')) {
      governmentSupport = 'moderate';
      formalisationBenefit = 'moderate';
    }
    if (name.includes('retail') || name.includes('consumer')) {
      governmentSupport = 'moderate';
      formalisationBenefit = 'moderate';
    }

    return {
      governmentSupport,
      formalisationBenefit,
      importSubstitution,
      exportPotential,
      relevantRegulations: ['SEC Philippines', 'BSP', 'PSE'],
    };
  }

  private buildAggregate(health: SectorHealth): SectorAggregate {
    return {
      overallScore: health.healthScore,
      peerCount: 0,
      dataCompleteness: 0.5,
      confidence: 0.5,
    };
  }

  private classifyCyclicality(name: string): SectorHealth['cyclicality'] {
    const n = (name || '').toLowerCase();
    if (n.includes('bank') || n.includes('food') || n.includes('pharma') || n.includes('utility') || n.includes('telecom')) {
      return 'defensive';
    }
    if (n.includes('metal') || n.includes('oil') || n.includes('construction') || n.includes('auto')) {
      return 'cyclical';
    }
    return 'unclear';
  }
}
