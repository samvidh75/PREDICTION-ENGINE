// src/systems/market-brain/evidenceSanitization.ts
// Phase 8 — Evidence sanitization helpers for safe public copy.
//
// Every evidence item that could reach the public UX must pass through
// these sanitizers.  The goal is to ensure no internal plumbing
// terminology leaks into user-facing text.
//
// Plumbing terms that MUST be removed BEFORE any public rendering:
//   RAG, vector, embedding, chunk, query, retrieval, pipeline,
//   source pending/verified, backend, provider, API, adapter,
//   diagnostics, migration, backfill, lineage
//
// ALLOWED contexts (internal / admin / report / test):
//   - Internal provider schemas and adapter configuration
//   - Admin dashboards and diagnostics panels
//   - Test assertions and test descriptions
//   - Architecture reports and audit logs

import type { EvidenceItem, EvidenceDomain, EvidenceStrength, EvidencePack } from './evidencePackContract';

// ─── Forbidden patterns in user-facing text ─────────────────────────────────

const BANNED_WORDS = [
  'RAG', 'vector', 'embedding', 'chunk', 'retrieval',
  'adapter', 'pipeline', 'provider', 'API', 'backend',
  'diagnostics', 'migration', 'backfill', 'lineage',
  'source pending', 'source verified',
  'quote unavailable', 'history unavailable',
];

// ─── Evidence Domain ────────────────────────────────────────────────────────

const ALLOWED_DOMAINS: readonly EvidenceDomain[] = [
  'price_volume',
  'financial_statements',
  'news_events',
  'ownership',
  'derivatives',
  'filings',
  'corporate_actions',
  'sector_context',
] as const;

export function sanitizeEvidenceDomain(raw: string): EvidenceDomain | null {
  const cleaned = raw.trim().toLowerCase() as EvidenceDomain;
  return ALLOWED_DOMAINS.includes(cleaned) ? cleaned : null;
}

// ─── Evidence Strength ──────────────────────────────────────────────────────

const ALLOWED_STRENGTHS: readonly EvidenceStrength[] = [
  'strong',
  'moderate',
  'weak',
  'missing',
] as const;

export function sanitizeEvidenceStrength(raw: string): EvidenceStrength {
  const cleaned = raw.trim().toLowerCase() as EvidenceStrength;
  return ALLOWED_STRENGTHS.includes(cleaned) ? cleaned : 'missing';
}

// ─── Text Sanitization ──────────────────────────────────────────────────────

function stripBannedTerms(text: string): string {
  let result = text;
  for (const word of BANNED_WORDS) {
    // Case-insensitive replacement
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(re, '');
  }
  // Collapse multiple spaces
  result = result.replace(/\s{2,}/g, ' ').trim();
  return result;
}

export function sanitizeEvidenceText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return '';
  return stripBannedTerms(trimmed);
}

// ─── URL Sanitization ───────────────────────────────────────────────────────

export function sanitizeEvidenceUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  try {
    const url = new URL(trimmed);
    // Only allow http/https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

// ─── Full Evidence Item Sanitization ────────────────────────────────────────

export function sanitizeEvidenceItem(raw: {
  id: string;
  domain: string;
  title: string;
  summary: string;
  strength?: string;
  occurredAt?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown>;
}): EvidenceItem | null {
  const domain = sanitizeEvidenceDomain(raw.domain);
  if (!domain) return null;

  const title = raw.title.trim();
  const summary = sanitizeEvidenceText(raw.summary);

  if (title.length === 0 && summary.length === 0) return null;

  return {
    id: raw.id,
    domain,
    title,
    summary,
    strength: sanitizeEvidenceStrength(raw.strength ?? 'missing'),
    occurredAt: raw.occurredAt ?? null,
    url: sanitizeEvidenceUrl(raw.url),
    metadata: raw.metadata ?? undefined,
  };
}

// ─── Evidence Pack Builder ──────────────────────────────────────────────────

export interface BuildEvidencePackInput {
  symbol: string;
  items: Array<{
    id: string;
    domain: string;
    title: string;
    summary: string;
    strength?: string;
    occurredAt?: string | null;
    url?: string | null;
    metadata?: Record<string, unknown>;
  }>;
}

export function buildEvidencePack(input: BuildEvidencePackInput): EvidencePack {
  const domainSet = new Set<EvidenceDomain>();
  const partialDomainSet = new Set<EvidenceDomain>();
  const items: EvidenceItem[] = [];

  for (const raw of input.items) {
    const sanitized = sanitizeEvidenceItem(raw);
    if (!sanitized) continue;

    items.push(sanitized);
    domainSet.add(sanitized.domain);

    if (sanitized.strength === 'weak' || sanitized.strength === 'missing') {
      partialDomainSet.add(sanitized.domain);
    }
  }

  const missingDomains = ALLOWED_DOMAINS.filter(
    (d) => !domainSet.has(d),
  );

  return {
    symbol: input.symbol.toUpperCase().trim(),
    generatedAt: new Date().toISOString(),
    items,
    missingDomains,
    partialDomains: [...partialDomainSet],
    availableDomains: [...domainSet],
    needsReview: partialDomainSet.size > 0,
  };
}
