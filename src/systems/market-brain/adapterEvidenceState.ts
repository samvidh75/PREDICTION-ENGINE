import { MARKET_BRAIN_EVIDENCE_DOMAINS } from './marketBrainGuardrails';
import type { EvidenceState, MarketDataDomain } from './indiaMarketBrain';

export type MarketBrainAdapterEvidenceDomain = MarketDataDomain;

export interface MarketBrainAdapterEvidenceState {
  available: MarketBrainAdapterEvidenceDomain[];
  partial: MarketBrainAdapterEvidenceDomain[];
  missing: MarketBrainAdapterEvidenceDomain[];
  needsReview: boolean;
}

const MARKET_BRAIN_DOMAIN_SET: ReadonlySet<MarketDataDomain> = new Set(MARKET_BRAIN_EVIDENCE_DOMAINS);
const EVIDENCE_STRENGTH: Record<EvidenceState, number> = {
  missing: 0,
  partial: 1,
  ready: 2,
};

function asAllowedDomain(value: unknown): MarketDataDomain | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return MARKET_BRAIN_DOMAIN_SET.has(trimmed as MarketDataDomain) ? trimmed as MarketDataDomain : null;
}

function uniqueDomains(value: unknown): MarketDataDomain[] {
  if (!Array.isArray(value)) return [];

  const domains: MarketDataDomain[] = [];
  const seen = new Set<MarketDataDomain>();

  value.forEach((item) => {
    const domain = asAllowedDomain(item);
    if (domain && !seen.has(domain)) {
      seen.add(domain);
      domains.push(domain);
    }
  });

  return domains;
}

function removeDomains(
  domains: MarketDataDomain[],
  domainsToRemove: ReadonlySet<MarketDataDomain>,
): MarketDataDomain[] {
  return domains.filter((domain) => !domainsToRemove.has(domain));
}

export function normalizeAdapterEvidenceState(value: unknown): MarketBrainAdapterEvidenceState {
  const candidate = value && typeof value === 'object' ? value as Partial<MarketBrainAdapterEvidenceState> : {};
  const available = uniqueDomains(candidate.available);
  const availableSet = new Set(available);
  const partial = removeDomains(uniqueDomains(candidate.partial), availableSet);
  const partialSet = new Set(partial);
  const missing = removeDomains(uniqueDomains(candidate.missing), new Set([...available, ...partial]));
  const needsReview = partial.length > 0 || missing.length > 0 || candidate.needsReview === true;

  return {
    available: [...available],
    partial: [...partial],
    missing: [...missing],
    needsReview,
  };
}

export function adapterEvidenceStateToEvidence(
  value: unknown,
): Partial<Record<MarketDataDomain, EvidenceState>> {
  const state = normalizeAdapterEvidenceState(value);
  const evidence: Partial<Record<MarketDataDomain, EvidenceState>> = {};

  state.missing.forEach((domain) => {
    evidence[domain] = 'missing';
  });
  state.partial.forEach((domain) => {
    evidence[domain] = 'partial';
  });
  state.available.forEach((domain) => {
    evidence[domain] = 'ready';
  });

  return { ...evidence };
}

export function mergeEvidenceWithAdapterState(
  existingEvidence: Partial<Record<MarketDataDomain, EvidenceState>> | null | undefined,
  adapterEvidenceState: unknown,
): Partial<Record<MarketDataDomain, EvidenceState>> {
  const adapterEvidence = adapterEvidenceStateToEvidence(adapterEvidenceState);
  const merged: Partial<Record<MarketDataDomain, EvidenceState>> = { ...(existingEvidence ?? {}) };

  Object.entries(adapterEvidence).forEach(([domain, adapterState]) => {
    if (!adapterState) return;
    const marketDomain = domain as MarketDataDomain;
    const existingState = merged[marketDomain];
    if (!existingState || EVIDENCE_STRENGTH[adapterState] > EVIDENCE_STRENGTH[existingState]) {
      merged[marketDomain] = adapterState;
    }
  });

  return { ...merged };
}
