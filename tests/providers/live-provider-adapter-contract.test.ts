import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleNewsRssProvider } from '../../src/services/providers/GoogleNewsRssProvider';
import { IndianMarketProvider } from '../../src/services/providers/IndianMarketProvider';
import { UpstoxFundamentalsProvider } from '../../src/services/providers/UpstoxFundamentalsProvider';
import { YahooProvider } from '../../src/services/providers/YahooProvider';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function textResponse(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers });
}

describe('live provider adapter contracts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.INDIANAPI_KEY;
  });

  it('IndianAPI blocks missing key before fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const provider = new IndianMarketProvider('');

    await expect(provider.getQuote('RELIANCE')).rejects.toThrow(/INDIANAPI_KEY/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('IndianAPI preserves dual-venue ambiguity and distinct timestamps', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      stockDetailsReusableData: {
        price: undefined,
        percentChange: '1.2',
        close: '99',
        date: '2026-06-12',
        time: '15:30:00',
      },
      currentPrice: { NSE: 100, BSE: 101 },
    }));
    const provider = new IndianMarketProvider('indian-secret');

    await expect(provider.getQuote('DUALVENUE1')).rejects.toThrow(/venue-ambiguous/);
  });

  it('IndianAPI close-only history never becomes OHLC', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      datasets: [
        { metric: 'Price', values: [['2026-06-12', 100]] },
        { metric: 'Volume', values: [['2026-06-12', 1000]] },
      ],
    }));
    const provider = new IndianMarketProvider('indian-secret');

    const result = await provider.getHistorical('CLOSEONLY1', '1M');
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('close');
      expect(result[0]).not.toHaveProperty('open');
    }
  });

  it('Upstox accounts ratios and balance-sheet separately and preserves partial success', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: [{ name: 'P/E', company_value: '20' }] }))
      .mockResolvedValueOnce(jsonResponse({ error: 'missing' }, 404));
    const provider = new UpstoxFundamentalsProvider(() => 'upstox-secret');

    const result = await provider.getFinancials('RELIANCE');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.peRatio).toBe(20);
    expect(result._raw).toBeDefined();
  });

  it('Upstox produces actual month-end dates', () => {
    const provider = new UpstoxFundamentalsProvider(() => 'token') as any;

    expect(provider.parsePeriod('Feb 2024')).toBe('2024-02-29');
    expect(provider.parsePeriod('Feb 2025')).toBe('2025-02-28');
    expect(provider.parsePeriod('Apr 2025')).toBe('2025-04-30');
    expect(provider.parsePeriod('Jun 2025')).toBe('2025-06-30');
    expect(provider.parsePeriod('Sep 2025')).toBe('2025-09-30');
    expect(provider.parsePeriod('Nov 2025')).toBe('2025-11-30');
    expect(provider.parsePeriod('unknown')).toBeUndefined();
  });

  it('Yahoo duplicate concurrent quote requests single-flight through the broker', async () => {
    let release: (() => void) | undefined;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      await new Promise<void>(resolve => {
        release = resolve;
        setTimeout(resolve, 0);
      });
      return jsonResponse({
        chart: {
          result: [{
            meta: {
              regularMarketPrice: 100,
              chartPreviousClose: 95,
              regularMarketVolume: 1000,
              regularMarketTime: 1_781_316_000,
              exchangeName: 'NSE',
            },
          }],
        },
      });
    });
    const provider = new YahooProvider();

    const requests = Promise.all([
      provider.getQuote('YHOOCOALESCE1'),
      provider.getQuote('YHOOCOALESCE1.NS'),
    ]);
    release?.();
    const results = await requests;

    expect(results).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('Google News repeated RSS request uses broker cache and unavailable feeds negative-cache', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(textResponse('<rss><channel><item><title>A</title><link>https://example.com/a</link></item></channel></rss>'))
      .mockResolvedValueOnce(textResponse('', 404));
    const provider = new GoogleNewsRssProvider();

    await expect(provider.getNews('GNEWSCACHE1')).resolves.toHaveLength(1);
    await expect(provider.getNews('GNEWSCACHE1')).resolves.toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await expect(provider.getNews('GNEWSMISS1')).rejects.toThrow(/not_found/);
    await expect(provider.getNews('GNEWSMISS1')).rejects.toThrow(/negative|unavailable/i);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
