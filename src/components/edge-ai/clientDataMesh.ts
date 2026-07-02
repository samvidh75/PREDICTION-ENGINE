interface WebCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class ClientDataMesh {
  private static mirrors = [
    "query1.finance.yahoo.com",
    "query2.finance.yahoo.com",
  ];

  public static async fetchUnrestrictedHistory(ticker: string): Promise<WebCandle[]> {
    const symbol = ticker.toUpperCase().replace('.NS', '').replace('.BO', '').trim();
    const mirror = this.mirrors[Math.floor(Math.random() * this.mirrors.length)];
    const endpointUrl = `https://${mirror}/v8/finance/chart/${symbol}.NS?interval=1d&range=3mo`;

    try {
      const response = await fetch(endpointUrl, { headers: { Accept: 'application/json' } });

      if (!response.ok) {
        throw new Error(`Direct connection node returned status code: ${response.status}`);
      }

      const payload = (await response.json()) as any;
      const resultBlock = payload.chart.result[0];
      const timelines = resultBlock.timestamp || [];
      const quotes = resultBlock.indicators.quote[0];

      const mappedCandles: WebCandle[] = [];
      for (let i = 0; i < timelines.length; i++) {
        if (quotes.open[i] === null || quotes.close[i] === null) continue;
        mappedCandles.push({
          timestamp: timelines[i],
          open: parseFloat(quotes.open[i].toFixed(3)),
          high: parseFloat(quotes.high[i].toFixed(3)),
          low: parseFloat(quotes.low[i].toFixed(3)),
          close: parseFloat(quotes.close[i].toFixed(3)),
          volume: parseInt(quotes.volume[i] || 0),
        });
      }

      return mappedCandles;
    } catch (err) {
      console.warn(`Frontend browser fetch rate-limited for ${symbol}. Pulling from database backup lines...`);
      try {
        const serverCacheRes = await fetch(`/api/v1/market-stream/${symbol}`);
        const serverCacheData = await serverCacheRes.json();
        return serverCacheData.candles || [];
      } catch {
        return [];
      }
    }
  }
}
