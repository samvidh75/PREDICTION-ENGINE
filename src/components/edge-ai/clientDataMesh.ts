interface WebCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MeshResult {
  candles: WebCandle[];
  data_mode: 'LIVE_MIRROR' | 'SERVER_CACHE' | 'DETERMINISTIC_SAFE_ANCHOR';
  source: string;
}

export class ClientDataMesh {
  private static nseMirrors = [
    'query1.finance.yahoo.com',
    'query2.finance.yahoo.com',
    'query1.finance.yahoo.com',
  ];

  private static bseMirror = 'query1.finance.yahoo.com';

  private static readonly RANGE_DAYS = '6mo';

  public static async fetchUnrestrictedHistory(ticker: string): Promise<MeshResult> {
    const raw = ticker.toUpperCase().trim();
    const isBse = raw.endsWith('.BO');
    const isNse = raw.endsWith('.NS') || (!raw.endsWith('.BO') && !raw.endsWith('.NS'));
    const symbol = raw.replace('.NS', '').replace('.BO', '').trim();
    const suffix = isBse ? '.BO' : '.NS';

    const mirrors = isBse
      ? [this.bseMirror]
      : this.nseMirrors.sort(() => Math.random() - 0.5);

    for (const mirror of mirrors) {
      const endpointUrl = `https://${mirror}/v8/finance/chart/${symbol}${suffix}?interval=1d&range=${this.RANGE_DAYS}`;
      try {
        const response = await fetch(endpointUrl, { headers: { Accept: 'application/json' } });
        if (!response.ok) continue;

        const payload = (await response.json()) as any;
        const resultBlock = payload.chart?.result?.[0];
        if (!resultBlock) continue;

        const timelines = resultBlock.timestamp || [];
        const quotes = resultBlock.indicators?.quote?.[0];
        if (!quotes) continue;

        const mappedCandles: WebCandle[] = [];
        for (let i = 0; i < timelines.length; i++) {
          if (quotes.open[i] === null || quotes.close[i] === null) continue;
          mappedCandles.push({
            timestamp: timelines[i],
            open: parseFloat(quotes.open[i].toFixed(3)),
            high: parseFloat(quotes.high[i].toFixed(3)),
            low: parseFloat(quotes.low[i].toFixed(3)),
            close: parseFloat(quotes.close[i].toFixed(3)),
            volume: parseInt(quotes.volume[i] || 0, 10),
          });
        }
        if (mappedCandles.length > 0) {
          return { candles: mappedCandles, data_mode: 'LIVE_MIRROR', source: mirror };
        }
      } catch {
        continue;
      }
    }

    console.warn(`All direct mirrors exhausted for ${symbol}. Falling back to server-side cache...`);
    try {
      const serverRes = await fetch(`/api/v1/market-stream/${symbol}`);
      const serverData = await serverRes.json();
      const candles: WebCandle[] = (serverData.candles || []).map((c: any) => ({
        timestamp: c.timestamp,
        open: parseFloat(Number(c.open).toFixed(3)),
        high: parseFloat(Number(c.high).toFixed(3)),
        low: parseFloat(Number(c.low).toFixed(3)),
        close: parseFloat(Number(c.close).toFixed(3)),
        volume: parseInt(c.volume || 0, 10),
      }));
      return { candles, data_mode: 'SERVER_CACHE', source: 'neon-db' };
    } catch {
      return { candles: [], data_mode: 'DETERMINISTIC_SAFE_ANCHOR', source: 'fallback-empty' };
    }
  }
}
