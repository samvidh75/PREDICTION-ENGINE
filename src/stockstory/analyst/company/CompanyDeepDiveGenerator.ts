/**
 * CompanyDeepDiveGenerator — deterministic company research deep dive.
 */

import type { CompanyDeepDive, DeepDiveInput } from './CompanyDeepDiveTypes';
import { CompanyDeepDiveValidator } from './CompanyDeepDiveValidator';

export class CompanyDeepDiveGenerator {
  private validator = new CompanyDeepDiveValidator();

  generate(input: DeepDiveInput): CompanyDeepDive {
    const sym = input.symbol.toUpperCase();
    const limitations: string[] = [];

    if (!input.companyName) limitations.push('Company identity details limited.');
    if (!input.hasDocuments) limitations.push('Research documents may be limited.');
    if (!input.governanceEvidence) limitations.push('Governance claims require supporting evidence.');

    const dive: CompanyDeepDive = {
      symbol: sym,
      companyIdentity: input.companyName
        ? `${input.companyName} (${sym})`
        : `${sym} — company identity limited`,
      businessProfile: null,
      thesisSummary: input.thesis ?? 'Thesis summary requires additional research context.',
      businessQuality: this.scoreLabel(input.qualityScore, 'business quality'),
      growthProfile: this.scoreLabel(input.growthScore, 'growth'),
      valuationProfile: this.scoreLabel(input.valuationScore, 'valuation'),
      riskRadar: this.scoreLabel(input.riskScore, 'risk', true),
      earningsQuality: 'Review latest results and margin trends for earnings quality assessment.',
      governanceOwnership: input.governanceEvidence
        ? 'Governance and ownership context available from shareholding data.'
        : 'Governance context limited — review shareholding pattern when available.',
      liquidityTechnical: 'Review price action and liquidity for trading context.',
      sectorPeerContext: input.sector
        ? `${sym} operates in ${input.sector}. ${this.peerContext(input.peers)}`
        : 'Sector context limited.',
      filingsDocuments: input.hasDocuments
        ? 'Recent filings and documents available for review.'
        : 'Limited filing and document availability.',
      scenarioSensitivity: 'Review scenario analysis for key thesis drivers.',
      whatChanged: input.whatChanged ?? ['No recent changes tracked'],
      whatToWatch: [
        'Next quarterly results',
        'Sector peer developments',
        'Governance and filing updates',
      ],
      limitations,
      methodologyNote: 'Deep dive based on available structured metrics and research evidence.',
      disclaimer: 'This deep dive is research-only and not investment advice.',
      generatedAt: new Date().toISOString(),
      confidence: limitations.length <= 1 ? 'Moderate confidence' : 'Limited confidence',
    };

    const validation = this.validator.validate(dive, input.peers);
    if (!validation.passed) dive.limitations.push(...validation.errors);

    return dive;
  }

  private scoreLabel(score: number | null | undefined, label: string, invert = false): string {
    if (score == null) return `${label.charAt(0).toUpperCase() + label.slice(1)} assessment limited by available data.`;
    const effective = invert ? 100 - score : score;
    if (effective >= 70) return `Favourable ${label} profile based on available metrics.`;
    if (effective >= 45) return `Mixed ${label} profile — review supporting evidence.`;
    return `${label.charAt(0).toUpperCase() + label.slice(1)} may warrant closer review.`;
  }

  private peerContext(peers?: string[]): string {
    if (!peers || peers.length === 0) return 'Peer comparison data limited.';
    return `Compare with ${peers.slice(0, 3).join(', ')} where data is available.`;
  }
}

export const companyDeepDiveGenerator = new CompanyDeepDiveGenerator();
