import https from "node:https";

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      timeout: 8000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => data += chunk.toString());
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode}`));
      });
    }).on("error", reject).on("timeout", function(this: import("node:http").ClientRequest) { this.destroy(); reject(new Error("timeout")); });
  });
}

export interface YahooQuote {
  price: number;
  change: number;
  changePercent: number;
  marketCap: number | null;
}

export async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    const ticker = `${symbol}.NS`;
    const raw = await httpGet(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`);
    const d = JSON.parse(raw);
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const closes: (number | null)[] = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter((v): v is number => v !== null);
    const latest = valid[valid.length - 1] ?? meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? latest;
    return {
      price: Number(latest.toFixed(2)),
      change: Number((latest - prevClose).toFixed(2)),
      changePercent: prevClose > 0 ? Number((((latest - prevClose) / prevClose) * 100).toFixed(2)) : 0,
      marketCap: meta.marketCap ? Math.round(meta.marketCap / 10000000 * 100) / 100 : null,
    };
  } catch { return null; }
}

export interface YahooFundamentals {
  pe: number | null;
  pb: number | null;
  eps: number | null;
  roe: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  revenueGrowth: number | null;
}

export async function fetchYahooFundamentals(symbol: string): Promise<YahooFundamentals | null> {
  try {
    const raw = await httpGet(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}.NS?modules=financialData,defaultKeyStatistics,summaryDetail`);
    const d = JSON.parse(raw);
    const qs = d?.quoteSummary?.result?.[0];
    if (!qs) return null;
    const fd = qs.financialData || {};
    const ks = qs.defaultKeyStatistics || {};
    const sd = qs.summaryDetail || {};
    return {
      pe: sd.trailingPE?.raw ?? sd.forwardPE?.raw ?? null,
      pb: sd.priceToBook?.raw ?? null,
      eps: ks.trailingEps?.raw ?? ks.forwardEps?.raw ?? null,
      roe: fd.returnOnEquity?.raw ? Number((fd.returnOnEquity.raw * 100).toFixed(1)) : null,
      debtToEquity: fd.debtToEquity?.raw ? Number(fd.debtToEquity.raw.toFixed(2)) : null,
      dividendYield: sd.dividendYield?.raw ? Number((sd.dividendYield.raw * 100).toFixed(2)) : null,
      revenueGrowth: fd.revenueGrowth?.raw ? Number((fd.revenueGrowth.raw * 100).toFixed(1)) : null,
    };
  } catch { return null; }
}

export interface YahooHistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchYahooHistory(symbol: string): Promise<YahooHistoryPoint[] | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const raw = await httpGet(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?period1=${now - 365*86400}&period2=${now}&interval=1d`);
    const d = JSON.parse(raw);
    const result = d?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];
    if (!timestamps.length || !quote) return null;
    const pts: YahooHistoryPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = quote.close?.[i];
      if (c != null) {
        pts.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: quote.open?.[i] ?? c,
          high: quote.high?.[i] ?? c,
          low: quote.low?.[i] ?? c,
          close: c,
          volume: quote.volume?.[i] ?? 0,
        });
      }
    }
    return pts.length > 0 ? pts : null;
  } catch { return null; }
}

export interface YahooNewsItem {
  headline: string;
  source: string;
  time: string;
  link?: string;
}

export async function fetchYahooNews(symbol: string): Promise<YahooNewsItem[] | null> {
  try {
    const raw = await httpGet(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&lang=en-IN&region=IN&quotesCount=0&newsCount=6`);
    const d = JSON.parse(raw);
    const articles = ((d?.news ?? []) as any[]).slice(0, 5).map((item: any) => ({
      headline: item.title || "",
      source: item.publisher || "Financial News",
      time: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
      link: item.link || undefined,
    }));
    return articles.length > 0 ? articles : null;
  } catch { return null; }
}
