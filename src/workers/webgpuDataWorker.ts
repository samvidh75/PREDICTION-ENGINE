/**
 * WebGPU Data Worker: Fetches live market data on user's browser.
 *
 * Zero server bandwidth cost (client pulls directly from Yahoo/NSE/Groww).
 * No rate-limiting on our infrastructure (each user has own IP).
 * P2P architecture: server never sees raw API calls.
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
  source: 'yahoo' | 'nse' | 'groww';
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
  const yahooSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;

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
  const yahooSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
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

async function fetchNSEQuote(symbol: string): Promise<{
  symbol: string;
  ltp: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest?: number;
  timestamp: number;
} | null> {
  const nseSymbol = symbol.includes('-') ? symbol : `${symbol}-EQ`;
  const url = `https://www.nseindia.com/api/quote-equity?symbol=${nseSymbol}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.nseindia.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!res.ok) throw new Error(`NSE API returned ${res.status}`);

    const data = await res.json();

    return {
      symbol: nseSymbol,
      ltp: data.priceInfo.lastPrice,
      bid: data.priceInfo.bidPrice,
      ask: data.priceInfo.askPrice,
      volume: data.priceInfo.totalTradedVolume,
      openInterest: data.priceInfo.openInterest || null,
      timestamp: Date.now()
    };
  } catch (err) {
    console.error(`NSE API error for ${symbol}:`, err);
    return null;
  }
}

async function fetchNSEOptionChain(symbol: string): Promise<{
  strikePrice: number;
  callOI: number;
  callVolume: number;
  callLTP: number;
  putOI: number;
  putVolume: number;
  putLTP: number;
  iv?: number;
}[]> {
  const nseSymbol = symbol.includes('-') ? symbol : `${symbol}-EQ`;
  const url = `https://www.nseindia.com/api/option-chain-equities?symbol=${nseSymbol}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.nseindia.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const data = await res.json();
    const records = data.records.data || [];
    return records.map((r: any) => ({
      strikePrice: r.strikePrice,
      callOI: r.CE?.openInterest || 0,
      callVolume: r.CE?.totalTradedVolume || 0,
      callLTP: r.CE?.lastPrice || 0,
      putOI: r.PE?.openInterest || 0,
      putVolume: r.PE?.totalTradedVolume || 0,
      putLTP: r.PE?.lastPrice || 0,
      iv: null
    }));
  } catch (err) {
    console.error(`NSE options chain error for ${symbol}:`, err);
    return [];
  }
}

async function fetchGrowwQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  pe: number;
  pb: number;
  dividend: number;
  marketCap: number;
} | null> {
  const url = `https://api.groww.in/v1/stocks/quote?symbol=${symbol}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    return {
      symbol,
      price: data.ltp,
      dayHigh: data.dayHigh,
      dayLow: data.dayLow,
      fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: data.fiftyTwoWeekLow,
      pe: data.pe,
      pb: data.pb,
      dividend: data.dividendYield,
      marketCap: data.marketCap
    };
  } catch (err) {
    console.error(`Groww API error for ${symbol}:`, err);
    return null;
  }
}

async function fetchAggregatedData(
  symbol: string,
  dataType: DataFetchRequest['dataType']
): Promise<DataFetchResponse> {
  let data = null;
  let source: 'groww' | 'nse' | 'yahoo' = 'yahoo';

  try {
    if (dataType === 'quote') {
      data = await fetchGrowwQuote(symbol);
      if (data) {
        source = 'groww';
        return { symbol, timestamp: Date.now(), dataType, data, source };
      }

      data = await fetchNSEQuote(symbol);
      if (data) {
        source = 'nse';
        return { symbol, timestamp: Date.now(), dataType, data, source };
      }

      data = await fetchYahooQuote(symbol);
      source = 'yahoo';
    } else if (dataType === 'historical') {
      data = await fetchYahooHistorical(symbol);
      source = 'yahoo';
    } else if (dataType === 'options') {
      data = await fetchNSEOptionChain(symbol);
      source = 'nse';
    }

    if (!data) {
      throw new Error(`All sources failed for ${symbol} ${dataType}`);
    }

    return { symbol, timestamp: Date.now(), dataType, data, source };
  } catch (err: any) {
    return {
      symbol,
      timestamp: Date.now(),
      dataType,
      data: null,
      source,
      error: err.message
    };
  }
}

self.onmessage = async (event: MessageEvent<DataFetchRequest>) => {
  const { symbol, dataType, params } = event.data;


  const response = await fetchAggregatedData(symbol, dataType);

  self.postMessage(response);
};

