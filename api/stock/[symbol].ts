import type { VercelRequest, VercelResponse } from '@vercel/node';

// Fetch real stock price from Yahoo Finance
async function fetchYahooPrice(symbol: string): Promise<any> {
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
      marketCap: meta.marketCap ? Math.round(meta.marketCap / 10000000) : null,
      longName: meta.longName || symbol,
      exchange: 'NSE',
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
      debtToEquity: financial.totalDebt && financial.totalEquity ? (financial.totalDebt / financial.totalEquity) : null,
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

  const symbol = (req.query.symbol as string || '').toUpperCase().trim();

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol required' });
  }

  try {
    // Fetch real price data from Yahoo Finance
    const priceData = await fetchYahooPrice(symbol);

    if (!priceData) {
      return res.status(404).json({ error: 'Stock not found', symbol });
    }

    // Fetch fundamentals in parallel
    const fundamentalsData = await fetchYahooFundamentals(symbol);

    // Return data in format compatible with normalizeStockData
    const response = {
      symbol,
      name: priceData.longName,
      companyName: priceData.longName,
      exchange: priceData.exchange || 'NSE',
      sector: 'Unknown',
      industry: 'Unknown',
      price: {
        current: priceData.price,
        changeAbs: priceData.change,
        changePercent: priceData.changePercent,
        marketCap: priceData.marketCap,
      },
      pe: fundamentalsData?.pe ?? null,
      pb: fundamentalsData?.pb ?? null,
      eps: fundamentalsData?.eps ?? null,
      dividendYield: fundamentalsData?.dividendYield ?? null,
      roe: fundamentalsData?.roe ?? null,
      debtToEquity: fundamentalsData?.debtToEquity ?? null,
      industryPe: null,
      revenueGrowth: null,
      profitGrowth: null,
      rsi: null,
      macdSignal: null,
      above50Dma: null,
      interestCoverage: null,
      volatility: null,
      scores: {
        quality: null,
        valuation: null,
        growth: null,
        momentum: null,
        risk: null,
        health: 50,
        riskAdjusted: null,
      },
      source: 'yahoo-finance',
      timestamp: new Date().toISOString(),
    };

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(response);
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to fetch stock data', details: String(error) });
  }
}
