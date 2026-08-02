// ─────────────────────────────────────────────────────────────────────────────
// Phase 19D-4 — Evidence Retrieval Adapters
//
// Five source-specific adapters that retrieve real, deterministic data from
// the app's existing data sources and transform them into the retrieval
// contracts defined in evidenceRetrievalContracts.ts.
//
// Every function is pure or uses only existing deterministic services —
// no fake data, no scraping, no LLM calls.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  RetrievalOptions,
  RetrieveNewsResult,
  RetrievedNewsItem,
  RetrieveFilingResult,
  RetrievedFilingItem,
  RetrieveCorporateActionResult,
  RetrievedCorporateActionItem,
  RetrieveResultEventResult,
  RetrievedResultItem,
  RetrieveAlertResult,
  RetrievedAlertItem,
} from '../../research/contracts/evidenceRetrievalContracts';

/* ── Helpers ────────────────────────────────────────────────────── */

function classifyNewsSentiment(article: { title: string; summary: string | null }): 'positive' | 'negative' | 'neutral' {
  const text = `${article.title} ${article.summary ?? ''}`.toLowerCase();
  const positiveWords = ['rise', 'grew', 'surge', 'gain', 'profit', 'positive', 'upgrade', 'bullish', 'strong', 'record'];
  const negativeWords = ['fall', 'drop', 'decline', 'loss', 'negative', 'downgrade', 'bearish', 'weak', 'slump', 'cut'];
  const posCount = positiveWords.filter((w) => text.includes(w)).length;
  const negCount = negativeWords.filter((w) => text.includes(w)).length;
  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}

function sanitizeRetrievalText(text: string): string {
  const forbidden = /\b(provider|backend|api|adapter|diagnostic|coverage|freshness|lineage|migration|backfill|rag|vector|embedding|chunk|webllm|webgpu|wasm|ollama|llama|qwen|phi|multibagger|guaranteed|sure shot|buys?|sells?|holds?|target)\b/gi;
  return text.replace(forbidden, '[redacted]');
}

/* ── 1. News Evidence Adapter ───────────────────────────────────── */

/**
 * Retrieve news evidence for a symbol by calling MarketDataGateway.
 *
 * Falls back iteratively through available providers so this function
 * works whether the app has a live market data feed or is in dev/test.
 */
export async function retrieveNewsEvidence(
  symbol: string,
  options?: RetrievalOptions
): Promise<RetrieveNewsResult> {
  const maxItems = options?.maxPerSource ?? 10;

  try {
    // Dynamic import so the adapter doesn't require MarketDataGateway at module level
    const { MarketDataGateway } = await import('../../services/data/MarketDataGateway');
    const rawItems = await MarketDataGateway.getNews(symbol);

    if (!rawItems || rawItems.length === 0) {
      return { symbol, items: [], source: 'None' };
    }

    const items: RetrievedNewsItem[] = rawItems.slice(0, maxItems).map((r) => ({
      title: r.title,
      summary: sanitizeRetrievalText(r.summary.slice(0, 300)),
      source: 'Market Data',
      publishedAt: r.timestamp ?? new Date().toISOString(),
      sentiment: r.impact === 'Positive' ? 'positive' : r.impact === 'Negative' ? 'negative' : 'neutral',
      url: '',
    }));

    return { symbol, items, source: 'MarketDataGateway' };
  } catch {
    // Fallback: use NewsService
    try {
      const { newsService } = await import('../../services/NewsService');
      const rawItems = await newsService.getNews(symbol, maxItems);

      if (!rawItems || rawItems.length === 0) {
        return { symbol, items: [], source: 'None' };
      }

      const items: RetrievedNewsItem[] = rawItems.map((r) => ({
        title: r.title,
        summary: sanitizeRetrievalText(r.summary.slice(0, 300)),
        source: r.source || 'Google News',
        publishedAt: r.publishedAt,
        sentiment: classifyNewsSentiment(r),
        url: r.link,
      }));

      return { symbol, items, source: 'NewsService' };
    } catch {
      return { symbol, items: [], source: 'None' };
    }
  }
}

/* ── 2. Filing / Regulatory Evidence Adapter ────────────────────── */

/**
 * Retrieve filing evidence from company metadata and financial snapshots.
 *
 * Uses MarketDataGateway.getCompany() for sector/industry metadata and
 * the FactorEngine's financial_snapshots table for stored fundamentals.
 */
export async function retrieveFilingEvidence(
  symbol: string,
  _options?: RetrievalOptions
): Promise<RetrieveFilingResult> {
  const items: RetrievedFilingItem[] = [];

  try {
    // 1. Get company metadata for sector/industry context
    const { MarketDataGateway } = await import('../../services/data/MarketDataGateway');
    const meta = await MarketDataGateway.getCompany(symbol);
    if (meta?.sector || meta?.industry) {
      items.push({
        label: 'Company Classification',
        detail: `Sector: ${meta.sector ?? 'N/A'} | Industry: ${meta.industry ?? 'N/A'}`,
        date: new Date().toISOString().split('T')[0],
        filingType: 'reference',
      });
    }
    if (meta?.isin) {
      items.push({
        label: 'Reg Identifier (ISIN)',
        detail: `ISIN: ${meta.isin}`,
        date: new Date().toISOString().split('T')[0],
        filingType: 'reference',
      });
    }

    // 2. Query financial_snapshots from the database
    try {
      const { query } = await import('../../db/index');
      const rows = await query(
        `SELECT pe_ratio, dividend_yield, beta, eps FROM financial_snapshots WHERE symbol = ? ORDER BY rowid DESC LIMIT 1`,
        [symbol]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0] as Record<string, unknown>;
        const peRatio = row.pe_ratio ?? row.peRatio ?? null;
        items.push({
          label: 'Latest Financial Filing Data',
          detail: `PE Ratio: ${peRatio ?? 'N/A'} | Dividend Yield: ${row.dividend_yield ?? 'N/A'} | Beta: ${row.beta ?? 'N/A'}${row.eps ? ` | EPS: ${row.eps}` : ''}`,
          date: new Date().toISOString().split('T')[0],
          filingType: 'financial_snapshot',
        });
      }
    } catch {
      // DB may not be available — skip gracefully
    }

    return { symbol, items, source: items.length > 0 ? 'CompanyMetadata' : 'None' };
  } catch {
    return { symbol, items: [], source: 'None' };
  }
}

/* ── 3. Corporate Action Evidence Adapter ───────────────────────── */

/**
 * Retrieve corporate actions for a symbol by looking at news articles
 * classified as 'corporate-action' events and financial snapshot data.
 */
export async function retrieveCorporateActionEvidence(
  symbol: string,
  _options?: RetrievalOptions
): Promise<RetrieveCorporateActionResult> {
  const items: RetrievedCorporateActionItem[] = [];

  try {
    // Derive corporate actions from news data that has 'corporate-action' category
    const { MarketDataGateway } = await import('../../services/data/MarketDataGateway');
    const rawNews = await MarketDataGateway.getNews(symbol);

    if (rawNews && rawNews.length > 0) {
      const corpActionPatterns = [
        { pattern: /dividend/i, type: 'dividend' as const },
        { pattern: /bonus/i, type: 'bonus' as const },
        { pattern: /stock.?split|split/i, type: 'stock_split' as const },
        { pattern: /buyback|share repurchase/i, type: 'buyback' as const },
        { pattern: /record.?date|scheme/i, type: 'other' as const },
      ];

      for (const news of rawNews) {
        const text = `${news.title} ${news.summary ?? ''}`;
        for (const { pattern, type } of corpActionPatterns) {
          if (pattern.test(text)) {
            items.push({
              label: sanitizeRetrievalText(news.title.slice(0, 120)),
              detail: sanitizeRetrievalText((news.summary ?? '').slice(0, 300)),
              date: news.timestamp ?? new Date().toISOString(),
              actionType: type,
            });
            break;
          }
        }
      }
    }
  } catch {
    // News source unavailable — skip
  }

  return { symbol, items, source: items.length > 0 ? 'NewsHeadline' : 'None' };
}

/* ── 4. Result Event / Earnings Evidence Adapter ─────────────────── */

/**
 * Retrieve quarterly/annual result evidence from financial snapshot data
 * and any stored earnings results in the database.
 */
export async function retrieveResultEventEvidence(
  symbol: string,
  _options?: RetrievalOptions
): Promise<RetrieveResultEventResult> {
  const items: RetrievedResultItem[] = [];

  try {
    const { query } = await import('../../db/index');

    // Try financial_snapshots table which stores the latest fundamentals
    const rows = await query(
      `SELECT pe_ratio, eps, dividend_yield, beta FROM financial_snapshots WHERE symbol = ? ORDER BY rowid DESC LIMIT 1`,
      [symbol]
    );

    const epsValue = Array.isArray(rows) && rows.length > 0
      ? (rows[0] as Record<string, unknown>).eps ?? null
      : null;

    // Build a result item from what's available
    items.push({
      period: 'Latest Period',
      revenue: null,
      netProfit: null,
      eps: epsValue !== null ? Number(epsValue) : null,
      revenueGrowthYoy: null,
      profitGrowthYoy: null,
      filingDate: new Date().toISOString().split('T')[0],
    });

    return { symbol, items, source: items.length > 0 ? 'FinancialSnapshot' : 'None' };
  } catch {
    return { symbol, items: [], source: 'None' };
  }
}

/* ── 5. Alert Evidence Adapter ───────────────────────────────────── */

/**
 * Retrieve alert evidence from the in-memory AlertStore.
 *
 * Works only in browser context where AlertStore is loaded.
 * Returns empty items when running in Node/SSR context.
 */
export async function retrieveAlertEvidence(
  symbol: string,
  _options?: RetrievalOptions
): Promise<RetrieveAlertResult> {
  try {
    // AlertStore is browser-only; graceful fallback for SSR/Node
    const { getAlertsBySymbol } = await import('../../services/personalization/AlertStore') as typeof import('../../services/personalization/AlertStore');
    const rawItems = getAlertsBySymbol(symbol);

    if (!rawItems || rawItems.length === 0) {
      return { symbol, items: [], source: 'None' };
    }

    const items: RetrievedAlertItem[] = rawItems.slice(0, 10).map((r) => ({
      id: r.alert.id,
      type: r.alert.type,
      title: sanitizeRetrievalText(r.alert.title),
      body: sanitizeRetrievalText(r.alert.body),
      timestamp: r.alert.timestamp,
      acknowledged: r.alert.acknowledged,
    }));

    return { symbol, items, source: 'AlertStore' };
  } catch {
    return { symbol, items: [], source: 'None' };
  }
}
