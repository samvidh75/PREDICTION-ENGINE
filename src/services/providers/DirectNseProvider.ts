/**
 * DirectNseProvider — Fetches data directly from NSE/BSE/TradingView APIs
 *
 * Uses the user's own internet connection to fetch from:
 *   1. NSE India (www.nseindia.com) — quotes, indices
 *   2. BSE India (api.bseindia.com) — quotes, corporate actions
 *   3. TradingView (scanner.tradingview.com) — screener data
 *   4. Screener.in (www.screener.in) — fundamental data (via scraping)
 *   5. Yahoo Finance (query1.finance.yahoo.com) — historical, news
 *   6. Google Finance (www.google.com/finance) — quotes, news
 *
 * No API keys required. All calls originate from the user's browser/server.
 */

import type { StockQuote, CompanyMetadata, HistoricalPoint, FinancialSnapshot } from '../data/types';

const NSE_QUOTE_URL = 'https://www.nseindia.com/api/quote-equity?symbol=';
const BSE_QUOTE_URL = 'https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w?scripcode=';
const TRADINGVIEW_SEARCH_URL = 'https://scanner.tradingview.com/india/scan';
const SCREENER_API_URL = 'https://www.screener.in/api/company/';
const YAHOO_QUERY_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const GOOGLE_FINANCE_URL = 'https://www.google.com/finance/quote/';

type SourceLabel = 'nse' | 'bse' | 'tradingview' | 'screener' | 'yahoo' | 'google_finance' | 'alphavantage';

export interface DirectFetchResult<T> {
  data: T | null;
  source: SourceLabel | null;
  timing: number;
  error: string | null;
}

export class DirectNseProvider {
  private nseCookies: string | null = null;
  private lastNseFetch = 0;
  private readonly NSE_RATE_LIMIT = 1100;

  private async getNseCookies(): Promise<string | null> {
    if (this.nseCookies && Date.now() - this.lastNseFetch < 60000) return this.nseCookies;
    try {
      const r = await fetch('https://www.nseindia.com', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.nseindia.com/',
        },
      });
      const cookies = r.headers.get('set-cookie') || '';
      this.nseCookies = cookies;
      this.lastNseFetch = Date.now();
      return cookies;
    } catch {
      return null;
    }
  }

  async getQuote(symbol: string): Promise<DirectFetchResult<StockQuote>> {
    const start = performance.now();

    const result = await this.tryAll<StockQuote>([
      () => this.fetchNseQuote(symbol),
      () => this.fetchYahooQuote(symbol),
      () => this.fetchGoogleFinanceQuote(symbol),
    ]);

    return { ...result, timing: Math.round(performance.now() - start) };
  }

  async getFinancials(symbol: string): Promise<DirectFetchResult<FinancialSnapshot>> {
    const start = performance.now();

    const result = await this.tryAll<FinancialSnapshot>([
      () => this.fetchScreenerFinancials(symbol),
      () => this.fetchYahooFinancials(symbol),
    ]);

    return { ...result, timing: Math.round(performance.now() - start) };
  }

  async getHistory(symbol: string): Promise<DirectFetchResult<HistoricalPoint[]>> {
    const start = performance.now();

    const result = await this.tryAll<HistoricalPoint[]>([
      () => this.fetchYahooHistory(symbol),
      () => this.fetchNseHistory(symbol),
    ]);

    return { ...result, timing: Math.round(performance.now() - start) };
  }

  async getNews(symbol: string): Promise<DirectFetchResult<{ headline: string; source: string; time: string; link?: string }[]>> {
    const start = performance.now();

    const result = await this.tryAll([
      () => this.fetchGoogleFinanceNews(symbol),
      () => this.fetchYahooNews(symbol),
    ]);

    return { ...result, timing: Math.round(performance.now() - start) };
  }

  private async tryAll<T>(fetchers: Array<() => Promise<{ data: T | null; source: SourceLabel }>>): Promise<{ data: T | null; source: SourceLabel | null; error: string | null }> {
    let lastError: string | null = null;

    for (const fetcher of fetchers) {
      try {
        const result = await fetcher();
        if (result.data !== null && result.data !== undefined) {
          return { data: result.data, source: result.source, error: null };
        }
      } catch (e: any) {
        lastError = e?.message || String(e);
      }
    }

    return { data: null, source: null, error: lastError || 'All providers failed' };
  }

  // ─── NSE India ────────────────────────────────────────────────────

  private async fetchNseQuote(symbol: string): Promise<{ data: StockQuote | null; source: SourceLabel }> {
    const cookies = await this.getNseCookies();
    if (!cookies) return { data: null, source: 'nse' };

    await new Promise(r => setTimeout(r, this.NSE_RATE_LIMIT));

    const r = await fetch(`${NSE_QUOTE_URL}${encodeURIComponent(symbol)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Cookie': cookies,
        'Accept': 'application/json, text/plain, */*',
        'Referer': `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,
      },
    });

    if (!r.ok) return { data: null, source: 'nse' };

    const d = await r.json();
    const priceInfo = d?.priceInfo;
    if (!priceInfo?.lastPrice) return { data: null, source: 'nse' };

    return {
      data: {
        symbol,
        exchange: 'NSE',
        price: priceInfo.lastPrice,
        change: priceInfo.change || 0,
        changePercent: priceInfo.pChange || 0,
        volume: priceInfo.totalTradedVolume,
        updatedAt: new Date().toISOString(),
        retrievedAt: new Date().toISOString(),
        source: 'provider',
        freshness: 'current',
      },
      source: 'nse',
    };
  }

  private async fetchNseHistory(symbol: string): Promise<{ data: HistoricalPoint[] | null; source: SourceLabel }> {
    const cookies = await this.getNseCookies();
    if (!cookies) return { data: null, source: 'nse' };

    await new Promise(r => setTimeout(r, this.NSE_RATE_LIMIT));

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 365 * 86400000);
    const from = startDate.toISOString().split('T')[0].replace(/-/g, '-');
    const to = endDate.toISOString().split('T')[0].replace(/-/g, '-');

    const r = await fetch(
      `https://www.nseindia.com/api/historical/cm/equity?symbol=${encodeURIComponent(symbol)}&series=EQ&from=${from}&to=${to}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Cookie': cookies,
          'Accept': 'application/json',
          'Referer': `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,
        },
      }
    );

    if (!r.ok) return { data: null, source: 'nse' };

    const d = await r.json();
    const records = d?.data ?? [];
    if (!Array.isArray(records) || records.length === 0) return { data: null, source: 'nse' };

    const points: HistoricalPoint[] = records.map((row: any) => ({
      date: row['CH_TIMESTAMP'] || row['TIMESTAMP'] || '',
      open: Number(row['CH_OPEN']) || 0,
      high: Number(row['CH_HIGH']) || 0,
      low: Number(row['CH_LOW']) || 0,
      close: Number(row['CH_CLOSE']) || 0,
      volume: Number(row['CH_TOTAL_TRADED_QTY']) || 0,
    })).filter((p: HistoricalPoint) => p.date && p.close > 0).sort((a: HistoricalPoint, b: HistoricalPoint) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { data: points.length > 0 ? points : null, source: 'nse' };
  }

  // ─── Yahoo Finance ────────────────────────────────────────────────

  private async fetchYahooQuote(symbol: string): Promise<{ data: StockQuote | null; source: SourceLabel }> {
    const ticker = `${symbol}.NS`;
    const r = await fetch(
      `${YAHOO_QUERY_URL}${encodeURIComponent(ticker)}?range=1d&interval=1m`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!r.ok) return { data: null, source: 'yahoo' };

    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return { data: null, source: 'yahoo' };

    const closes: (number | null)[] = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter((v): v is number => v !== null);
    const latest = validCloses[validCloses.length - 1] ?? meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? latest;

    return {
      data: {
        symbol,
        exchange: 'NSE',
        price: Number(latest.toFixed(2)),
        change: Number((latest - prevClose).toFixed(2)),
        changePercent: prevClose > 0 ? Number((((latest - prevClose) / prevClose) * 100).toFixed(2)) : 0,
        volume: meta.regularMarketVolume || 0,
        updatedAt: new Date(meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()).toISOString(),
        retrievedAt: new Date().toISOString(),
        source: 'provider',
        freshness: 'current',
      },
      source: 'yahoo',
    };
  }

  private async fetchYahooFinancials(symbol: string): Promise<{ data: FinancialSnapshot | null; source: SourceLabel }> {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol + '.NS')}?modules=financialData,defaultKeyStatistics,summaryDetail`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!r.ok) return { data: null, source: 'yahoo' };

    const d = await r.json();
    const qs = d?.quoteSummary?.result?.[0];
    if (!qs) return { data: null, source: 'yahoo' };

    const fd = qs.financialData;
    const ks = qs.defaultKeyStatistics;
    const sd = qs.summaryDetail;

    const snapshot: FinancialSnapshot = {
      symbol,
      periodEnd: new Date().toISOString(),
      marketCap: sd?.marketCap?.raw,
      peRatio: sd?.trailingPE?.raw ?? sd?.forwardPE?.raw,
      pbRatio: sd?.priceToBook?.raw,
      eps: ks?.trailingEps?.raw ?? ks?.forwardEps?.raw,
      dividendYield: sd?.dividendYield?.raw ? sd.dividendYield.raw * 100 : undefined,
      beta: ks?.beta?.raw,
      revenue: fd?.totalRevenue?.raw,
      netIncome: fd?.netIncomeToCommon?.raw,
      roe: fd?.returnOnEquity?.raw ? fd.returnOnEquity.raw * 100 : undefined,
      roa: fd?.returnOnAssets?.raw ? fd.returnOnAssets.raw * 100 : undefined,
      debtToEquity: fd?.debtToEquity?.raw,
      freeCashFlow: fd?.freeCashFlow?.raw,
      grossMargin: fd?.grossMargins?.raw ? fd.grossMargins.raw * 100 : undefined,
      operatingMargin: fd?.operatingMargins?.raw ? fd.operatingMargins.raw * 100 : undefined,
      revenueGrowth: fd?.revenueGrowth?.raw ? fd.revenueGrowth.raw * 100 : undefined,
      currentRatio: fd?.currentRatio?.raw,
      bookValue: ks?.bookValue?.raw,
    };

    return { data: snapshot, source: 'yahoo' };
  }

  private async fetchYahooHistory(symbol: string): Promise<{ data: HistoricalPoint[] | null; source: SourceLabel }> {
    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - 365 * 86400;
    const ticker = `${symbol}.NS`;

    const r = await fetch(
      `${YAHOO_QUERY_URL}${encodeURIComponent(ticker)}?period1=${oneYearAgo}&period2=${now}&interval=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!r.ok) return { data: null, source: 'yahoo' };

    const d = await r.json();
    const result = d?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];
    if (!timestamps.length || !quote) return { data: null, source: 'yahoo' };

    const points: HistoricalPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = quote.close?.[i];
      if (close != null) {
        points.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: quote.open?.[i] ?? close,
          high: quote.high?.[i] ?? close,
          low: quote.low?.[i] ?? close,
          close,
          volume: quote.volume?.[i] ?? 0,
        });
      }
    }

    return { data: points.length > 0 ? points : null, source: 'yahoo' };
  }

  private async fetchYahooNews(symbol: string): Promise<{ data: { headline: string; source: string; time: string; link?: string }[] | null; source: SourceLabel }> {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&lang=en-IN&region=IN&quotesCount=0&newsCount=8`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(4000),
      }
    );

    if (!r.ok) return { data: null, source: 'yahoo' };

    const d = await r.json();
    const articles = (d?.news ?? []).slice(0, 6).map((item: any) => ({
      headline: item.title || '',
      source: item.publisher || 'Yahoo Finance',
      time: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
      link: item.link || undefined,
    }));

    return { data: articles.length > 0 ? articles : null, source: 'yahoo' };
  }

  // ─── Google Finance ───────────────────────────────────────────────

  private async fetchGoogleFinanceQuote(symbol: string): Promise<{ data: StockQuote | null; source: SourceLabel }> {
    const url = `${GOOGLE_FINANCE_URL}${symbol}:NSE`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!r.ok) return { data: null, source: 'google_finance' };
    const html = await r.text();

    const priceMatch = html.match(/"([0-9,]+(?:\.[0-9]+)?)"[^>]*data-last-price/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

    if (!price) return { data: null, source: 'google_finance' };

    return {
      data: {
        symbol,
        exchange: 'NSE',
        price,
        change: 0,
        changePercent: 0,
        updatedAt: new Date().toISOString(),
        retrievedAt: new Date().toISOString(),
        source: 'provider',
        freshness: 'current',
      },
      source: 'google_finance',
    };
  }

  private async fetchGoogleFinanceNews(symbol: string): Promise<{ data: { headline: string; source: string; time: string; link?: string }[] | null; source: SourceLabel }> {
    const url = `${GOOGLE_FINANCE_URL}${symbol}:NSE`;
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) return { data: null, source: 'google_finance' };
      const html = await r.text();
      const articleMatches = html.matchAll(/<a[^>]*class="[^"]*article[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
      const articles: { headline: string; source: string; time: string; link?: string }[] = [];
      for (const match of articleMatches) {
        if (match[2]?.trim()) {
          articles.push({
            headline: match[2].trim(),
            source: 'Google Finance',
            time: new Date().toISOString(),
            link: match[1]?.startsWith('http') ? match[1] : `https://www.google.com${match[1] || ''}`,
          });
        }
        if (articles.length >= 5) break;
      }
      return { data: articles.length > 0 ? articles : null, source: 'google_finance' };
    } catch {
      return { data: null, source: 'google_finance' };
    }
  }

  // ─── Screener.in ──────────────────────────────────────────────────

  private async fetchScreenerFinancials(symbol: string): Promise<{ data: FinancialSnapshot | null; source: SourceLabel }> {
    try {
      const r = await fetch(`${SCREENER_API_URL}${encodeURIComponent(symbol)}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) return { data: null, source: 'screener' };

      const d = await r.json();
      if (!d) return { data: null, source: 'screener' };

      const snapshot: FinancialSnapshot = {
        symbol,
        periodEnd: d?.last_updated || new Date().toISOString(),
        marketCap: d?.market_cap || d?.marketCapitalization,
        peRatio: d?.pe_ratio || d?.price_to_earning,
        pbRatio: d?.price_to_book,
        eps: d?.earnings_per_share,
        dividendYield: d?.dividend_yield,
        debtToEquity: d?.debt_to_equity,
        roe: d?.return_on_equity,
        revenue: d?.revenue || d?.sales,
        netIncome: d?.net_profit || d?.profit,
        operatingMargin: d?.operating_margin,
        netMargin: d?.net_margin,
        revenueGrowth: d?.revenue_growth,
        profitGrowth: d?.profit_growth,
      };

      const hasData = Object.values(snapshot).some(v => v !== undefined && v !== null && typeof v !== 'string');
      return { data: hasData ? snapshot : null, source: 'screener' };
    } catch {
      return { data: null, source: 'screener' };
    }
  }
}

export const directNseProvider = new DirectNseProvider();
