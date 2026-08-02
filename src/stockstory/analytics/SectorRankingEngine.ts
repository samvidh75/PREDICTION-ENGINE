import type { LensoryOutput } from '../types';
import { getSectorProfile } from '../SectorAdapter';
import { SectorPercentileEngine } from '../scoring/SectorPercentileEngine';

export interface RankedCompany {
  symbol: string;
  companyName: string;
  sector: string;
  healthScore: number;
  classification: LensoryOutput['classification'];
  peerPercentile: number;
  sectorQuartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

export class SectorRankingEngine {
  static rank(entries: Array<{
    symbol: string;
    companyName: string;
    sector: string;
    output: LensoryOutput;
  }>): RankedCompany[] {
    const grouped = new Map<string, Array<{
      symbol: string;
      companyName: string;
      sector: string;
      output: LensoryOutput;
    }>>();

    for (const entry of entries) {
      const sector = getSectorProfile(entry.sector).name;
      const bucket = grouped.get(sector) ?? [];
      bucket.push({ ...entry, sector });
      grouped.set(sector, bucket);
    }

    const ranked: RankedCompany[] = [];

    for (const [sector, companies] of grouped.entries()) {
      const sortedScores = companies.map((item) => item.output.healthScore).sort((a, b) => a - b);
      const metricSector = this.toPercentileSector(sector);
      SectorPercentileEngine.registerDistribution(metricSector, 'roe', sortedScores);

      for (const company of companies) {
        const percentile = Math.round(
          SectorPercentileEngine.rank(company.output.healthScore, metricSector, 'roe') * 100
        );
        ranked.push({
          symbol: company.symbol,
          companyName: company.companyName,
          sector,
          healthScore: company.output.healthScore,
          classification: company.output.classification,
          peerPercentile: percentile,
          sectorQuartile: this.toQuartile(percentile),
        });
      }
    }

    return ranked.sort((a, b) => b.healthScore - a.healthScore || b.peerPercentile - a.peerPercentile);
  }

  private static toQuartile(percentile: number): RankedCompany['sectorQuartile'] {
    if (percentile >= 75) return 'Q1';
    if (percentile >= 50) return 'Q2';
    if (percentile >= 25) return 'Q3';
    return 'Q4';
  }

  private static toPercentileSector(sector: string): Parameters<typeof SectorPercentileEngine.registerDistribution>[0] {
    const upper = sector.toUpperCase();
    if (upper.includes('BANK')) return 'BANKING';
    if (upper.includes('TECH')) return 'IT';
    if (upper.includes('FMCG') || upper.includes('CONSUMER')) return 'FMCG';
    if (upper.includes('PHARMA')) return 'PHARMA';
    if (upper.includes('AUTO')) return 'AUTO';
    if (upper.includes('ENERGY') || upper.includes('OIL') || upper.includes('UTILITY')) return 'ENERGY';
    return 'GENERAL';
  }
}

export default SectorRankingEngine;
