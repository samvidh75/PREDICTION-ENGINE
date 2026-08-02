// ─────────────────────────────────────────────────────────────────────────────
// Phase 19D-5 — Evidence Retrieval Orchestrator
//
// Calls every source-specific adapter from Phase 4, collects results, feeds
// them into buildEventEvidencePack() to create a unified EventEvidencePack,
// and returns both the aggregate and the pack for LLM context consumption.
//
// All data comes from existing deterministic sources — no fake data, no LLM.
// ─────────────────────────────────────────────────────────────────────────────

import type { RetrievalOptions, EvidenceRetrievalAggregate } from '../../research/contracts/evidenceRetrievalContracts';
import type { EventEvidencePack } from '../../research/contracts/eventEvidenceContracts';
import {
  retrieveNewsEvidence,
  retrieveFilingEvidence,
  retrieveCorporateActionEvidence,
  retrieveResultEventEvidence,
  retrieveAlertEvidence,
} from './evidenceRetrievalAdapters';
import { buildEventEvidencePack, compressEventEvidencePack } from './eventEvidencePack';

/* ── Orchestrator ───────────────────────────────────────────────── */

/**
 * Build a full evidence retrieval aggregate and EventEvidencePack for a given
 * symbol. This is the main entry point for Phase 19D evidence retrieval.
 *
 * 1. Calls all five source-specific adapters in parallel.
 * 2. Wraps results into an EvidenceRetrievalAggregate.
 * 3. Feeds deterministic data into buildEventEvidencePack() for LLM context.
 * 4. Returns both the aggregate and the pack.
 */
export async function buildEvidenceRetrievalAggregate(
  symbol: string,
  options?: RetrievalOptions
): Promise<{
  aggregate: EvidenceRetrievalAggregate;
  pack: EventEvidencePack;
}> {
  const maxPerSource = options?.maxPerSource ?? 10;
  const opts: RetrievalOptions = { symbol, maxPerSource, lookbackDays: options?.lookbackDays ?? 90 };

  // Run all five adapters in parallel
  const [news, filings, corporateActions, resultEvents, alerts] = await Promise.all([
    retrieveNewsEvidence(symbol, opts),
    retrieveFilingEvidence(symbol, opts),
    retrieveCorporateActionEvidence(symbol, opts),
    retrieveResultEventEvidence(symbol, opts),
    retrieveAlertEvidence(symbol, opts),
  ]);

  // Build aggregate
  const aggregate: EvidenceRetrievalAggregate = {
    symbol,
    news,
    filings,
    corporateActions,
    resultEvents,
    alerts,
    retrievedAt: Date.now(),
    totalItems: news.items.length
      + filings.items.length
      + corporateActions.items.length
      + resultEvents.items.length
      + alerts.items.length,
  };

  // Convert each adapter's output into eventEvidencePack's expected shapes

  // News → EvNewsArticle-like
  const newsArticles = news.items.map((n) => ({
    symbol,
    title: n.title,
    summary: n.summary,
    url: n.url ?? '',
    publishedAt: n.publishedAt,
    sourceName: n.source,
    sentiment: n.sentiment === 'positive' ? 0.5 : n.sentiment === 'negative' ? -0.5 : 0,
    categories: ['news_headline'],
  }));

  // Result events → EvEarningsResult-like
  const earningsResults = resultEvents.items.map((r) => ({
    symbol,
    period: r.period,
    revenue: r.revenue,
    netProfit: r.netProfit,
    eps: r.eps,
    revenueGrowthYoy: r.revenueGrowthYoy,
    profitGrowthYoy: r.profitGrowthYoy,
    operatingMargin: null as number | null,
    filingDate: r.filingDate,
  }));

  // Alerts → EvAlertChangeView-like
  const alertChanges = alerts.items.map((a) => ({
    id: a.id,
    symbol,
    type: a.type,
    title: a.title,
    body: a.body,
    timestamp: a.timestamp,
    acknowledged: a.acknowledged,
  }));

  // Build the event evidence pack from deterministic data
  const pack = buildEventEvidencePack({
    symbol,
    newsArticles,
    earningsResults,
    alertChanges,
  });

  // Manually enrich the pack with filing and corporate-action items, since
  // they are not yet handled by buildEventEvidencePack()
  for (const filing of filings.items) {
    pack.items.push({
      id: `ev-filing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'filing_event',
      label: filing.label,
      detail: filing.detail,
      impact: 'neutral',
      date: filing.date,
      source: 'Company Filing Data',
      confidence: 'high',
    });
    pack.byKind.filing_event.push({
      id: `ev-filing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'filing_event',
      label: filing.label,
      detail: filing.detail,
      impact: 'neutral',
      date: filing.date,
      source: 'Company Filing Data',
      confidence: 'high',
    });
  }

  for (const action of corporateActions.items) {
    const impact = action.actionType === 'dividend' || action.actionType === 'buyback' ? 'positive' :
      action.actionType === 'stock_split' ? 'neutral' : 'mixed';
    pack.items.push({
      id: `ev-corp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'corporate_action',
      label: action.label,
      detail: action.detail,
      impact,
      date: action.date,
      source: 'Corporate Action Notice',
      confidence: 'high',
    });
    pack.byKind.corporate_action.push({
      id: `ev-corp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'corporate_action',
      label: action.label,
      detail: action.detail,
      impact,
      date: action.date,
      source: 'Corporate Action Notice',
      confidence: 'high',
    });
  }

  // Re-sort pack items by recency and rebuild highlighted
  pack.items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  pack.highlighted = pack.items.slice(0, 3);
  pack.totalCount = pack.items.length;

  return { aggregate, pack };
}

/**
 * Convenience: build just the compressed text excerpt for LLM context,
 * skipping the full aggregate when only a summary is needed.
 */
export async function buildEvidenceRetrievalContext(
  symbol: string,
  options?: RetrievalOptions
): Promise<string> {
  const { pack } = await buildEvidenceRetrievalAggregate(symbol, options);
  return compressEventEvidencePack(pack);
}
