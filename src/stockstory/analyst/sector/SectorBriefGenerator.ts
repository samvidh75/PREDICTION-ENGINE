/**
 * SectorBriefGenerator — deterministic sector research brief.
 */

import type { SectorBrief, SectorCompanyMetric } from './SectorBriefTypes';
import { SectorBriefValidator } from './SectorBriefValidator';

export class SectorBriefGenerator {
  private validator = new SectorBriefValidator();

  generate(sector: string, companies: SectorCompanyMetric[]): SectorBrief {
    const limitations: string[] = [];
    const knownSymbols = new Set(companies.map((c) => c.symbol.toUpperCase()));

    if (companies.length === 0) {
      limitations.push('Insufficient sector company data for full brief.');
    }

    const qualityLeaders = companies
      .filter((c) => c.qualityScore != null && c.qualityScore >= 60)
      .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))
      .slice(0, 5)
      .map((c) => ({
        symbol: c.symbol.toUpperCase(),
        note: 'Quality score above sector median based on available metrics.',
      }));

    if (qualityLeaders.length === 0 && companies.length > 0) {
      limitations.push('No companies met quality leader threshold with available data.');
    }

    const brief: SectorBrief = {
      sector,
      sectorSummary: companies.length > 0
        ? `${sector} sector brief covering ${companies.length} companies with available research metrics.`
        : `${sector} sector brief — limited company data available.`,
      qualityLeaders,
      valuationContext: 'Valuation context varies across sector constituents; compare individual companies for detail.',
      riskThemes: this.deriveRiskThemes(companies),
      earningsThemes: ['Review latest quarterly results across sector constituents'],
      momentumThemes: this.deriveMomentumThemes(companies),
      filingsEventsToReview: ['Recent exchange filings and result announcements'],
      peerDislocations: companies.length >= 2
        ? ['Compare valuation and quality scores across sector peers']
        : [],
      scannerOpportunities: [],
      limitations,
      disclaimer: 'This sector brief is research-only and not investment advice.',
      generatedAt: new Date().toISOString(),
      confidence: companies.length >= 3 ? 'Moderate confidence' : 'Limited confidence',
    };

    const validation = this.validator.validate(brief, knownSymbols);
    if (!validation.passed) {
      brief.limitations.push(...validation.errors);
    }

    return brief;
  }

  private deriveRiskThemes(companies: SectorCompanyMetric[]): string[] {
    if (companies.length === 0) return ['Sector risk themes require more company data'];
    return ['Monitor governance and leverage trends across sector'];
  }

  private deriveMomentumThemes(companies: SectorCompanyMetric[]): string[] {
    const withMomentum = companies.filter((c) => c.momentumScore != null);
    if (withMomentum.length === 0) return ['Momentum data limited for sector'];
    return ['Review relative momentum across sector constituents'];
  }
}

export const sectorBriefGenerator = new SectorBriefGenerator();
