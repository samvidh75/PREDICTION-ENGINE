// src/systems/market-brain/evidencePackContract.ts
// Phase 2 – Safe Market Brain ↔ Data Adapter integration contract.
//
// Maps adapter MarketEvidencePack into Market Brain's evidence coverage model
// without leaking internal plumbing terminology to the public UX.
//
// Key invariants:
//  1. Internal error codes NEVER reach public copy.
//  2. "missing" domains are reported as "Unavailable" — never "API down".
//  3. Adapter warnings are filtered to only public-safe categories.
//  4. Domain names are humanized before rendering.

import type { MarketEvidencePack, MarketEvidenceItem } from '../../services/data/evidencePackBuilder';
import type { MarketDataDomain } from '../../services/data/dataAdapterTypes';

// ─── Public-Facing Evidence Domain View ─────────────────────────────────────

export interface EvidenceDomainView {
  domain: string; // humanized label
  state: 'Available' | 'Partial' | 'Unavailable';
  note: string;
}

export interface EvidencePackView {
  symbol: string;
  domains: EvidenceDomainView[];
  summary: string;
  generatedAt: string;
}

// ─── Domain Humanization ────────────────────────────────────────────────────

const DOMAIN_LABELS: Record<string, string> = {
  financial_statements: 'Financials',
  price_volume: 'Price & Volume',
  news_events: 'News & Events',
  ownership: 'Shareholding',
  derivatives: 'Derivatives',
  sector_context: 'Sector Context',
  corporate_actions: 'Corporate Actions',
};

export function humanizeDomain(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// ─── State mapping from domain membership ───────────────────────────────────

type EvidenceState = 'ready' | 'partial' | 'missing';

function domainState(
  domain: MarketDataDomain,
  pack: MarketEvidencePack,
): EvidenceState {
  if (pack.availableDomains.includes(domain)) return 'ready';
  if (pack.partialDomains.includes(domain)) return 'partial';
  return 'missing';
}

const STATE_LABEL: Record<EvidenceState, EvidenceDomainView['state']> = {
  ready: 'Available',
  partial: 'Partial',
  missing: 'Unavailable',
};

// ─── Find item for a domain (first match) ───────────────────────────────────

function findItem(domain: MarketDataDomain, pack: MarketEvidencePack): MarketEvidenceItem | undefined {
  return pack.evidenceItems.find((item) => item.domain === domain);
}

// ─── Evidence Pack → Market Brain Evidence Coverage ─────────────────────────

export function evidencePackToCoverage(
  pack: MarketEvidencePack,
): Partial<Record<MarketDataDomain, 'ready' | 'partial' | 'missing'>> {
  const coverage: Partial<Record<MarketDataDomain, 'ready' | 'partial' | 'missing'>> = {};

  const allDomains = new Set([
    ...pack.availableDomains,
    ...pack.partialDomains,
    ...pack.missingDomains,
  ]);

  for (const domain of allDomains) {
    coverage[domain] = domainState(domain, pack);
  }

  return coverage;
}

// ─── Evidence Pack → Public-Facing View ─────────────────────────────────────

export function evidencePackToView(symbol: string, pack: MarketEvidencePack): EvidencePackView {
  const domains: EvidenceDomainView[] = [];

  for (const domain of pack.availableDomains) {
    const item = findItem(domain, pack);
    domains.push({
      domain: humanizeDomain(domain),
      state: 'Available',
      note: item?.summary ?? `${humanizeDomain(domain)} evidence is available.`,
    });
  }

  for (const domain of pack.partialDomains) {
    const item = findItem(domain, pack);
    domains.push({
      domain: humanizeDomain(domain),
      state: 'Partial',
      note: item?.summary ?? `${humanizeDomain(domain)} evidence is partially available.`,
    });
  }

  for (const domain of pack.missingDomains) {
    domains.push({
      domain: humanizeDomain(domain),
      state: 'Unavailable',
      note: `${humanizeDomain(domain)} data is not currently available.`,
    });
  }

  const availableCount = pack.availableDomains.length + pack.partialDomains.length;
  const totalCount = availableCount + pack.missingDomains.length;

  let summary: string;
  if (pack.missingDomains.length === 0) {
    summary = `Research evidence is available across all ${totalCount} data domains.`;
  } else if (pack.availableDomains.length === 0 && pack.partialDomains.length === 0) {
    summary = `Research data is currently unavailable. This is expected during the foundation phase — no data sources have been wired yet.`;
  } else {
    summary = `Research evidence available for ${availableCount} of ${totalCount} data domains. Some areas may reflect incomplete analysis.`;
  }

  return {
    symbol,
    domains,
    summary,
    generatedAt: pack.asOf,
  };
}

// ─── Forbidden Language Audit ───────────────────────────────────────────────

const FORBIDDEN_TERMS = [
  'Buy', 'Sell', 'Hold', 'Strong Buy',
  'guaranteed', 'sure shot', 'multibagger',
  'provider', 'API', 'backend', 'diagnostics',
  'coverage', 'freshness', 'source pending',
  'source verified', 'migration', 'backfill',
  'lineage', 'quote unavailable', 'history unavailable',
];

export function assertCleanPublicView(view: EvidencePackView): void {
  const text = [
    view.summary,
    ...view.domains.map((d) => `${d.domain} ${d.note}`),
  ].join(' ');

  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (lower.includes(term.toLowerCase())) {
      throw new Error(`Evidence pack view contains forbidden language: "${term}"`);
    }
  }
}
