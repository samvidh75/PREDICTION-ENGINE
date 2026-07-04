import type { VercelRequest, VercelResponse } from '@vercel/node';

interface StockPrice {
  price: number;
  change: number;
  changePercent: number;
  marketCap: number | null;
}

// Fetch real stock price from Yahoo Finance
async function fetchYahooPrice(symbol: string): Promise<StockPrice | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?range=1d&interval=1m`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json() as any;
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta?.regularMarketPrice) return null;

    const closes = (data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter((v: any) => v !== null);
    const latest = closes[closes.length - 1] ?? meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? latest;

    return {
      price: Number(latest.toFixed(2)),
      change: Number((latest - prevClose).toFixed(2)),
      changePercent: prevClose > 0 ? Number((((latest - prevClose) / prevClose) * 100).toFixed(2)) : 0,
      marketCap: meta.marketCap ? Math.round(meta.marketCap / 10000000 * 100) / 100 : null,
    };
  } catch (error) {
    console.error(`Failed to fetch Yahoo price for ${symbol}:`, error);
    return null;
  }
}

// Fetch real fundamentals from Yahoo Finance
async function fetchYahooFundamentals(symbol: string): Promise<any> {
  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}.NS?modules=financialData,defaultKeyStatistics`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json() as any;
    const financial = data?.quoteSummary?.result?.[0]?.financialData || {};
    const keyStats = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics || {};

    return {
      pe: financial.trailingPE ?? keyStats.trailingPE ?? null,
      pb: keyStats.priceToBook ?? null,
      eps: financial.epsTrailingTwelveMonths ?? null,
      dividendYield: keyStats.dividendYield ? (keyStats.dividendYield * 100) : null,
      roe: financial.returnOnEquity ? (financial.returnOnEquity * 100) : null,
    };
  } catch (error) {
    console.error(`Failed to fetch Yahoo fundamentals for ${symbol}:`, error);
    return null;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract symbol from URL or query parameter
  const symbol = (req.query.symbol as string || req.url?.split('/').pop() || '').toUpperCase();

  if (!symbol || symbol === 'STOCK') {
    return res.status(400).json({ error: 'Symbol required' });
  }

  try {
    // Fetch real price data from Yahoo Finance
    const price = await fetchYahooPrice(symbol);

    if (!price) {
      // Return 404 if we can't fetch real data
      return res.status(404).json({ error: 'Stock not found', symbol });
    }

    // Fetch fundamentals in parallel
    const fundamentals = await fetchYahooFundamentals(symbol);

    // Return combined data
    return res.status(200).json({
      symbol,
      price,
      fundamentals: fundamentals || {},
      source: 'yahoo-finance',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to fetch stock data' });
  }
}
