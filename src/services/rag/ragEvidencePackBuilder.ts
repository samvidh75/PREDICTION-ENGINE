// src/services/rag/ragEvidencePackBuilder.ts
// Phase 8 — Builds canonical EvidencePack from RAG retrieval results.
//
// Converts RagRetrievalResult → EvidencePack by mapping document chunks
// to evidence items with domain classification and strength scoring.
//
// The evidence strength is derived from the chunk's relevance score:
//   >= 0.8 → strong
//   >= 0.5 → moderate
//   >= 0.2 → weak
//   <  0.2 → missing (dropped)

import type { EvidencePack, EvidenceDomain, EvidenceStrength } from '../../systems/market-brain/evidencePackContract';
import type { RagRetrievalResult, RagDocumentChunk } from './ragRetrievalContract';
import { buildEvidencePack } from '../../systems/market-brain/evidenceSanitization';

// ─── Document type → Evidence Domain mapping ────────────────────────────────

function classifyDomain(documentType: string): EvidenceDomain | null {
  const map: Record<string, EvidenceDomain> = {
    news_article: 'news_events',
    filing: 'filings',
    corporate_action: 'corporate_actions',
    analyst_note: 'news_events',
    earnings_transcript: 'financial_statements',
    research_report: 'sector_context',
    regulatory_filing: 'filings',
  };
  return map[documentType] ?? null;
}

// ─── Relevance score → Evidence Strength ────────────────────────────────────

function classifyStrength(score: number): EvidenceStrength {
  if (score >= 0.8) return 'strong';
  if (score >= 0.5) return 'moderate';
  if (score >= 0.2) return 'weak';
  return 'missing';
}

// ─── Build EvidencePack from RAG retrieval result ───────────────────────────

export function buildEvidencePackFromRagResult(
  ragResult: RagRetrievalResult,
): EvidencePack {
  const items: Array<{
    id: string;
    domain: string;
    title: string;
    summary: string;
    strength?: string;
    occurredAt?: string | null;
    url?: string | null;
  }> = [];

  for (const chunk of ragResult.results) {
    const domain = classifyDomain(chunk.documentType);
    if (!domain) continue; // skip unmapped types

    // Truncate long content for summary
    const summary = chunk.content.length > 500
      ? chunk.content.slice(0, 500) + '…'
      : chunk.content;

    items.push({
      id: chunk.id,
      domain,
      title: chunk.title,
      summary,
      strength: classifyStrength(chunk.relevanceScore),
      occurredAt: chunk.publishedAt,
      url: chunk.sourceUrl,
    });
  }

  return buildEvidencePack({
    symbol: ragResult.symbol,
    items,
  });
}
