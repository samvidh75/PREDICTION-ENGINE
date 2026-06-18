/**
 * dhanProvider.ts — DhanHQ REST data provider (read-only).
 *
 * Covers:
 *   - Live quotes via POST /v2/marketfeed/ohlc
 *   - Historical daily via POST /v2/charts/historical
 *   - Health check via GET /v2/ (or portfolio endpoint)
 *
 * Auth: X-AUTH-TOKEN + X-CLIENT-ID headers.
 * Rate limit: 1 req/s for data APIs; 10 req/s for non-trading.
 *
 * No trading/order methods exposed.
 */

import { getDhanSecurityId } from '../instruments/instrumentMap';
import type {
  NormalizedQuote, NormalizedCandle, ProviderHealth, ProviderId,
  MarketDataProvider,
} from './types';

const DHAN_BASE = 'https://api.dhan.co/v2';
const FETCH_TIMEOUT = 10_000;

function getClientId(): string | null {
  return process.env.DHAN_CLIENT_ID?.trim() || null;
}

function getAccessToken(): string | null {
  return process.env.DHAN_ACCESS_TOKEN?.trim() || null;
}

function headers(): Record<string, string> | null {
  const clientId = getClientId();
  const token = getAccessToken();
  if (!clientId || !token) return null;
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'access-token': token,
    'client-id': clientId,
  };
}

class DhanProviderError extends Error {
  constructor(
    public readonly safeCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'DhanProviderError';
  }
}

async function dhanFetch<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const hdrs = headers();
  if (!hdrs) {
    throw new DhanProviderError('missing_optional', 'Dhan credentials not configured');
  }

  const url = `${DHAN_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (resp.status === 401 || resp.status === 403) {
      throw new DhanProviderError('expired_or_unauthorized', `Dhan auth failed (HTTP ${resp.status})`);
    }
    if (resp.status === 429) {
      throw new DhanProviderError('rate_limited', 'Dhan rate limited');
    }
    if (!resp.ok) {
      throw new DhanProviderError('provider_error', `Dhan HTTP ${resp.status}`);
    }

    const json = await resp.json() as { status: string; data?: Record<string, unknown> };
    if (json.status !== 'success' || !json.data) {
      throw new DhanProviderError('provider_error', 'Dhan returned non-success status');
    }
    return json as unknown as T;
  } catch (err: unknown) {
    if (err instanceof DhanProviderError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('aborted') || msg.includes('timeout')) {
      throw new DhanProviderError('provider_unreachable', 'Dhan request timed out');
    }
    throw new DhanProviderError('provider_unreachable', msg);
  } finally {
    clearTimeout(timer);
  }
}

export class DhanProvider implements MarketDataProvider {
  readonly providerId: ProviderId = 'dhan';

  async getQuote(symbol: string): Promise<NormalizedQuote> {
    const secId = getDhanSecurityId(symbol);
    if (!secId) {
      throw new DhanProviderError('symbol_mapping_missing', `No Dhan security_id for ${symbol}`);
    }

    const payload = { NSE_EQ: [Number(secId)] };
    const result = await dhanFetch<{
      status: string;
      data: Record<string, Record<string, { last_price: number; ohlc: { open: number; high: number; low: number; close: number } }>>;
    }>('/marketfeed/ohlc', payload);

    const eqData = result.data?.NSE_EQ?.[secId];
    if (!eqData || eqData.last_price == null) {
      throw new DhanProviderError('provider_error', `No quote data for ${symbol}`);
    }

    const lp = Number(eqData.last_price);
    const ohlc = eqData.ohlc || { open: 0, close: 0, high: 0, low: 0 };

    if (!Number.isFinite(lp)) {
      throw new DhanProviderError('provider_error', `Invalid price for ${symbol}`);
    }

    return {
      symbol,
      exchange: 'NSE',
      lastPrice: lp,
      previousClose: Number.isFinite(ohlc.close) ? ohlc.close : null,
      open: Number.isFinite(ohlc.open) ? ohlc.open : null,
      high: Number.isFinite(ohlc.high) ? ohlc.high : null,
      low: Number.isFinite(ohlc.low) ? ohlc.low : null,
      volume: null,
      timestamp: new Date().toISOString(),
      provider: 'dhan',
      sourceQuality: 'live',
    };
  }

  async getHistoricalDaily(
    symbol: string,
    fromDate: string,
    toDate: string,
  ): Promise<NormalizedCandle[]> {
    const secId = getDhanSecurityId(symbol);
    if (!secId) {
      throw new DhanProviderError('symbol_mapping_missing', `No Dhan security_id for ${symbol}`);
    }

    const payload = {
      securityId: secId,
      exchangeSegment: 'NSE_EQ',
      instrument: 'EQUITY',
      expiryCode: 0,
      oi: false,
      fromDate,
      toDate,
    };

    const result = await dhanFetch<{
      status: string;
      open: number[];
      high: number[];
      low: number[];
      close: number[];
      volume: number[];
      timestamp: number[];
    }>('/charts/historical', payload);

    const { open, high, low, close, volume, timestamp } = result;
    const count = Math.min(open.length, high.length, low.length, close.length, volume.length, timestamp.length);

    const candles: NormalizedCandle[] = [];
    for (let i = 0; i < count; i++) {
      const o = open[i], h = high[i], l = low[i], c = close[i], v = volume[i], t = timestamp[i];
      if (!Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) continue;

      candles.push({
        symbol,
        date: new Date(t * 1000).toISOString().split('T')[0],
        open: o,
        high: h,
        low: l,
        close: c,
        volume: Math.round(v) || 0,
        provider: 'dhan',
        sourceQuality: 'exchange',
      });
    }

    return candles;
  }

  async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    const hdrs = headers();
    if (!hdrs) {
      return { provider: 'dhan', status: 'missing_optional', latencyMs: null, checkedAt: new Date().toISOString() };
    }

    try {
      const resp = await fetch(`${DHAN_BASE}/marketfeed/ltp`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ NSE_EQ: [11536] }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      const latency = Date.now() - start;

      if (resp.ok) {
        return { provider: 'dhan', status: 'healthy', latencyMs: latency, checkedAt: new Date().toISOString() };
      }
      if (resp.status === 401 || resp.status === 403) {
        return { provider: 'dhan', status: 'expired_or_unauthorized', latencyMs: latency, checkedAt: new Date().toISOString() };
      }
      if (resp.status === 429) {
        return { provider: 'dhan', status: 'rate_limited', latencyMs: latency, checkedAt: new Date().toISOString() };
      }
      return { provider: 'dhan', status: 'provider_error', latencyMs: latency, checkedAt: new Date().toISOString() };
    } catch {
      return { provider: 'dhan', status: 'provider_unreachable', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    }
  }
}
