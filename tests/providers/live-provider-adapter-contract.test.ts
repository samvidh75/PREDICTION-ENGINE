import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleNewsRssProvider } from '../../src/services/providers/GoogleNewsRssProvider';
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
              exchangeName: 'PSE',
            },
          }],
        },
      });
    });
    const provider = new YahooProvider();

    const requests = Promise.all([
      provider.getQuote('YHOOCOALESCE1'),
      provider.getQuote('YHOOCOALESCE1.PS'),
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
