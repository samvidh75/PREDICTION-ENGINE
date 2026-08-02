// ─────────────────────────────────────────────────────────────────────────────
// Phase 19C-5 — Event Evidence Pack Builder
//
// Adapts existing deterministic app data (news headlines, alerts, earnings
// results) into EventEvidenceItem[] for LLM context consumption.
//
// Uses only real existing data sources — no new providers, no fake data.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EventEvidenceItem,
  EventEvidenceKind,
  EventEvidenceImpact,
  EventEvidencePack,
} from '../../research/contracts/eventEvidenceContracts';

/* ── Existing data types (imported by reference, no direct dep) ── */

/** Mirrors NewsArticle from stockstory/ingestion/NewsIngestion */
interface EvNewsArticle {
  symbol: string;
  title: string;
  summary: string | null;
  url: string;
  publishedAt: string;
  sourceName: string;
  sentiment: number | null;
  categories: string[];
}

/** Mirrors EarningsResult from stockstory/ingestion/EarningsIngestion */
interface EvEarningsResult {
  symbol: string;
  period: string;
  revenue: number | null;
  netProfit: number | null;
  eps: number | null;
  revenueGrowthYoy: number | null;
  profitGrowthYoy: number | null;
  operatingMargin: number | null;
  filingDate: string;
}

/** Mirrors AlertChangeView from research/contracts/productContracts */
interface EvAlertChangeView {
  id: string;
  symbol: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  acknowledged: boolean;
}

/* ── Helpers ─────────────────────────────────────────────────── */

let _itemIdCounter = 0;
function nextItemId(kind: EventEvidenceKind): string {
  _itemIdCounter += 1;
  return `ev-${kind}-${_itemIdCounter}-${Date.now()}`;
}

function classifyNewsImpact(sentiment: number | null, _categories: string[]): EventEvidenceImpact {
  if (sentiment === null) return 'neutral';
  if (sentiment >= 0.2) return 'positive';
  if (sentiment <= -0.2) return 'negative';
  return 'neutral';
}

function classifyEarningsImpact(result: EvEarningsResult): EventEvidenceImpact {
  if (result.profitGrowthYoy === null && result.revenueGrowthYoy === null) return 'neutral';
  const growths: number[] = [];
  if (result.revenueGrowthYoy !== null) growths.push(result.revenueGrowthYoy);
  if (result.profitGrowthYoy !== null) growths.push(result.profitGrowthYoy);
  if (result.eps !== null) growths.push(result.eps * 0.1); // scale eps for balanced comparison
  const avg = growths.reduce((s, v) => s + v, 0) / growths.length;
  if (avg > 5) return 'positive';
  if (avg < -5) return 'negative';
  return 'mixed';
}

function classifyAlertImpact(type: string): EventEvidenceImpact {
  switch (type) {
    case 'thesis_change':
    case 'risk_change':
      return 'negative';
    case 'valuation_change':
    case 'peer_change':
      return 'mixed';
    case 'price_move':
    case 'watchlist_review':
    case 'event':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function newsKindToEventKind(category: string): EventEvidenceKind {
  switch (category) {
    case 'earnings-result':
      return 'result_event';
    case 'corporate-action':
      return 'corporate_action';
    case 'regulatory':
    case 'litigation':
      return 'filing_event';
    default:
      return 'news_headline';
  }
}

function formatNewsDetail(article: EvNewsArticle): string {
  const parts = [article.title];
  if (article.summary) parts.push(article.summary);
  parts.push(`Source: ${article.sourceName}`);
  return parts.join(' | ').slice(0, 500);
}

function formatEarningsDetail(result: EvEarningsResult): string {
  const parts: string[] = [`${result.period} Results`];
  if (result.revenue !== null) parts.push(`Revenue: ${result.revenue.toLocaleString('en-PH')}`);
  if (result.netProfit !== null) parts.push(`Net Profit: ${result.netProfit.toLocaleString('en-PH')}`);
  if (result.eps !== null) parts.push(`EPS: ${result.eps}`);
  if (result.revenueGrowthYoy !== null) parts.push(`Revenue Growth: ${result.revenueGrowthYoy.toFixed(1)}% YoY`);
  if (result.profitGrowthYoy !== null) parts.push(`Profit Growth: ${result.profitGrowthYoy.toFixed(1)}% YoY`);
  if (result.operatingMargin !== null) parts.push(`Operating Margin: ${result.operatingMargin.toFixed(1)}%`);
  return parts.join(' | ').slice(0, 500);
}

/* ── Builder ─────────────────────────────────────────────────── */

const EMPTY_BY_KIND: Record<EventEvidenceKind, EventEvidenceItem[]> = {
  news_headline: [],
  alert_event: [],
  corporate_action: [],
  result_event: [],
  filing_event: [],
  analyst_event: [],
};

/**
 * Build an EventEvidencePack from existing app data sources.
 *
 * Accepts arrays of real deterministic data and converts them into
 * the event evidence format for LLM context consumption.
 *
 * Returns an empty pack (totalCount: 0) if no data is provided.
 */
export function buildEventEvidencePack(options: {
  symbol: string;
  newsArticles?: EvNewsArticle[];
  earningsResults?: EvEarningsResult[];
  alertChanges?: EvAlertChangeView[];
}): EventEvidencePack {
  const items: EventEvidenceItem[] = [];
  const byKind: Record<EventEvidenceKind, EventEvidenceItem[]> = {
    news_headline: [],
    alert_event: [],
    corporate_action: [],
    result_event: [],
    filing_event: [],
    analyst_event: [],
  };

  // Convert news articles
  for (const article of options.newsArticles ?? []) {
    if (article.symbol !== options.symbol) continue;
    const kind = newsKindToEventKind(article.categories[0] ?? 'unknown');
    const item: EventEvidenceItem = {
      id: nextItemId(kind),
      kind,
      label: article.title.slice(0, 120),
      detail: formatNewsDetail(article),
      impact: classifyNewsImpact(article.sentiment, article.categories),
      date: article.publishedAt,
      source: article.sourceName,
      confidence: article.sentiment !== null ? 'high' : 'medium',
    };
    items.push(item);
    byKind[kind].push(item);
  }

  // Convert earnings results
  for (const result of options.earningsResults ?? []) {
    if (result.symbol !== options.symbol) continue;
    const item: EventEvidenceItem = {
      id: nextItemId('result_event'),
      kind: 'result_event',
      label: `${result.period} Result`,
      detail: formatEarningsDetail(result),
      impact: classifyEarningsImpact(result),
      date: result.filingDate,
      source: 'Earnings Filing',
      confidence: 'high',
    };
    items.push(item);
    byKind.result_event.push(item);
  }

  // Convert alert changes
  for (const alert of options.alertChanges ?? []) {
    if (alert.symbol !== options.symbol) continue;
    const item: EventEvidenceItem = {
      id: nextItemId('alert_event'),
      kind: 'alert_event',
      label: alert.title.slice(0, 120),
      detail: alert.body.slice(0, 500),
      impact: classifyAlertImpact(alert.type),
      date: alert.timestamp,
      source: `Alert: ${alert.type}`,
      confidence: 'high',
    };
    items.push(item);
    byKind.alert_event.push(item);
  }

  // Sort by recency (newest first), with fallback to stable order
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const kind of Object.keys(byKind) as EventEvidenceKind[]) {
    byKind[kind].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Highlight most recent items (up to 3)
  const highlighted = items.slice(0, 3);

  return {
    symbol: options.symbol,
    items,
    totalCount: items.length,
    retrievedAt: Date.now(),
    byKind,
    highlighted,
  };
}

/**
 * Build a compressed text representation of an event evidence pack
 * for LLM context, capped at 2000 characters.
 */
export function compressEventEvidencePack(pack: EventEvidencePack): string {
  if (pack.totalCount === 0) return '';
  const parts: string[] = [`Recent events for ${pack.symbol}:`];
  for (const item of pack.items.slice(0, 8)) {
    parts.push(`[${item.kind}] ${item.label} (${item.date})`);
  }
  const text = parts.join('\n').slice(0, 2000);
  return text;
}
