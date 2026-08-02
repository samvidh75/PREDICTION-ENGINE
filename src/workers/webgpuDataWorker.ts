/**
 * WebGPU Data Worker: Fetches live market data on user's browser.
 *
 * Zero server bandwidth cost (client pulls directly from Yahoo Finance).
 * No rate-limiting on our infrastructure (each user has own IP).
 * P2P architecture: server never sees raw API calls.
 *
 * A prior version of this worker prioritized api.groww.in (India) and a
 * function literally named fetchPSEQuote that actually called
 * www.nseindia.com (India's National Stock Exchange) — both real Indian
 * data sources mislabeled/misused for what should be PSE-only quotes.
 * There's also no PSE equity options market, so the fake PSE-backed
 * "options chain" fetcher has been removed rather than fixed.
 */

interface DataFetchRequest {
  symbol: string;
  dataType: 'quote' | 'historical' | 'options' | 'fundamentals';
  params?: Record<string, any>;
}

interface DataFetchResponse {
  symbol: string;
  timestamp: number;
  dataType: string;
  data: any;
  source: 'yahoo' | 'unavailable';
  error?: string;
}

async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  currency: string;
  timestamp: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  pe: number;
  dividend: number;
  trailingPE: number;
} | null> {
  const yahooSymbol = symbol.endsWith('.PS') ? symbol : `${symbol}.PS`;

  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yahooSymbol}?modules=price,summaryDetail`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) throw new Error(`Yahoo API returned ${res.status}`);

    const data = await res.json();
    const quoteData = data.quoteSummary.result[0];

    return {
      price: quoteData.price.regularMarketPrice.raw,
      currency: quoteData.price.currency,
      timestamp: Date.now(),
      fiftyTwoWeekHigh: quoteData.summaryDetail.fiftyTwoWeekHigh.raw,
      fiftyTwoWeekLow: quoteData.summaryDetail.fiftyTwoWeekLow.raw,
      marketCap: quoteData.summaryDetail.marketCap.raw,
      pe: quoteData.summaryDetail.trailingPE?.raw || null,
      dividend: quoteData.summaryDetail.trailingAnnualDividendYield?.raw || 0,
      trailingPE: quoteData.summaryDetail.trailingPE?.raw || null
    };
  } catch (err) {
    console.error(`Yahoo Finance error for ${symbol}:`, err);
    return null;
  }
}

async function fetchYahooHistorical(symbol: string): Promise<any[]> {
  const yahooSymbol = symbol.endsWith('.PS') ? symbol : `${symbol}.PS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1y`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const data = await res.json();
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjclose = result.indicators.adjclose[0].adjclose;

    return timestamps.map((t: number, i: number) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      open: quotes.open[i],
      high: quotes.high[i],
      low: quotes.low[i],
      close: quotes.close[i],
      volume: quotes.volume[i],
      adjClose: adjclose[i]
    })).filter((c: any) => c.close !== null);
  } catch (err) {
    console.error(`Yahoo historical error for ${symbol}:`, err);
    return [];
  }
}

async function fetchAggregatedData(
  symbol: string,
  dataType: DataFetchRequest['dataType']
): Promise<DataFetchResponse> {
  const source: 'yahoo' | 'unavailable' = 'yahoo';

  try {
    let data: any = null;

    if (dataType === 'quote') {
      data = await fetchYahooQuote(symbol);
    } else if (dataType === 'historical') {
      data = await fetchYahooHistorical(symbol);
    } else if (dataType === 'options') {
      // The Philippine Stock Exchange has no listed equity options market.
      return {
        symbol, timestamp: Date.now(), dataType, data: [],
        source: 'unavailable', error: 'PSE has no equity options market',
      };
    }

    if (!data) {
      throw new Error(`Yahoo Finance returned no data for ${symbol} ${dataType}`);
    }

    return { symbol, timestamp: Date.now(), dataType, data, source };
  } catch (err: any) {
    return {
      symbol,
      timestamp: Date.now(),
      dataType,
      data: null,
      source: 'unavailable',
      error: err.message
    };
  }
}

self.onmessage = async (event: MessageEvent<DataFetchRequest>) => {
  const { symbol, dataType } = event.data;

  const response = await fetchAggregatedData(symbol, dataType);

  self.postMessage(response);
};
