import type { EvidenceState, MarketDataDomain } from './indiaMarketBrain';

export interface EvidenceDomainStatus {
  domain: MarketDataDomain;
  state: EvidenceState;
  isUsable: boolean;
  needsReview: boolean;
}

export interface EvidenceCoverageSummary {
  domains: EvidenceDomainStatus[];
  ready: MarketDataDomain[];
  partial: MarketDataDomain[];
  missing: MarketDataDomain[];
  usableCount: number;
  requiredCount: number;
  coverageRatio: number;
}

export const REQUIRED_MARKET_BRAIN_EVIDENCE: MarketDataDomain[] = [
  'instrument_master',
  'prices',
  'fundamentals',
  'financial_statements',
  'technicals',
  'sector_context',
];

const VALID_EVIDENCE_STATES: ReadonlySet<EvidenceState> = new Set(['ready', 'partial', 'missing']);

export function normalizeEvidenceState(state: EvidenceState | null | undefined): EvidenceState {
  if (!state) return 'missing';
  return VALID_EVIDENCE_STATES.has(state) ? state : 'missing';
}

export function normalizeEvidenceCoverage(
  evidence: Partial<Record<MarketDataDomain, EvidenceState>> | null | undefined,
  requiredDomains: MarketDataDomain[] = REQUIRED_MARKET_BRAIN_EVIDENCE,
): EvidenceCoverageSummary {
  const domains = requiredDomains.map((domain): EvidenceDomainStatus => {
    const state = normalizeEvidenceState(evidence?.[domain]);
    return {
      domain,
      state,
      isUsable: state === 'ready' || state === 'partial',
      needsReview: state !== 'ready',
    };
  });

  const ready = domains.filter((item) => item.state === 'ready').map((item) => item.domain);
  const partial = domains.filter((item) => item.state === 'partial').map((item) => item.domain);
  const missing = domains.filter((item) => item.state === 'missing').map((item) => item.domain);
  const usableCount = ready.length + partial.length;
  const requiredCount = domains.length;

  return {
    domains,
    ready,
    partial,
    missing,
    usableCount,
    requiredCount,
    coverageRatio: requiredCount === 0 ? 1 : usableCount / requiredCount,
  };
}

export function missingRequiredEvidence(
  evidence: Partial<Record<MarketDataDomain, EvidenceState>> | null | undefined,
  requiredDomains: MarketDataDomain[] = REQUIRED_MARKET_BRAIN_EVIDENCE,
): MarketDataDomain[] {
  return normalizeEvidenceCoverage(evidence, requiredDomains).missing;
}
