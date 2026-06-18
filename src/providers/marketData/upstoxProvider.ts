/**
 * upstoxProvider.ts — Upstox REST data provider (read-only).
 *
 * Covers:
 *   - Live quotes via GET /v2/market-quote/ltp
 *   - Historical daily via GET /v2/historical/{instrument_key}/day/...
 *   - Health check via GET /v2/market-quote/ltp for a known symbol
 *
 * Auth: Bearer token in Authorization header.
 * No trading/order methods exposed.
 */

import { getUpstoxInstrumentKey } from '../instruments/instrumentMap';
import type {
  NormalizedQuote, NormalizedCandle, ProviderHealth, ProviderId,
  MarketDataProvider,
} from './types';

const UPSTOX_BASE = 'https://api.upstox.com/v2';
const FETCH_TIMEOUT = 10_000;

function getAccessToken(): string | null {
  return process.env.UPSTOX_ACCESS_TOKEN?.trim() || null;
}

function authHeaders(): Record<string, string> | null {
  const token = getAccessToken();
  if (!token) return null;
  return {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

class UpstoxProviderError extends Error {
  constructor(
    public readonly safeCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'UpstoxProviderError';
  }
}

async function upstoxGet<T>(path: string): Promise<T> {
  const hdrs = authHeaders();
  if (!hdrs) {
    throw new UpstoxProviderError('missing_optional', 'Upstox access token not configured');
  }

  const url = `${UPSTOX_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const resp = await fetch(url, { headers: hdrs, signal: controller.signal });

    if (resp.status === 401 || resp.status === 403) {
      throw new UpstoxProviderError('expired_or_unauthorized', `Upstox auth failed (HTTP ${resp.status})`);
    }
    if (resp.status === 429) {
      throw new UpstoxProviderError('rate_limited', 'Upstox rate limited');
    }
    if (!resp.ok) {
      throw new UpstoxProviderError('provider_error', `Upstox HTTP ${resp.status}`);
    }

    return await resp.json() as T;
  } catch (err: unknown) {
    if (err instanceof UpstoxProviderError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('aborted') || msg.includes('timeout')) {
      throw new UpstoxProviderError('provider_unreachable', 'Upstox request timed out');
    }
    throw new UpstoxProviderError('provider_unreachable', msg);
  } finally {
    clearTimeout(timer);
  }
}

interface UpstoxQuoteResponse {
  status: string;
  data: Record<string, {
    instrument_token: string;
    symbol: string;
    last_price: number;
    ohlc: { open: number; high: number; low: number; close: number };
    volume: number;
  }>;
}

interface UpstoxHistoricalResponse {
  status: string;
  data: {
    candles: [string, number, number, number, number, number, number][];
  };
}

export class UpstoxProvider implements MarketDataProvider {
  readonly providerId: ProviderId = 'upstox';

  async getQuote(symbol: string): Promise<NormalizedQuote> {
    const instrKey = getUpstoxInstrumentKey(symbol);
    if (!instrKey) {
      throw new UpstoxProviderError('symbol_mapping_missing', `No Upstox instrument key for ${symbol}`);
    }

    const result = await upstoxGet<UpstoxQuoteResponse>(
      `/market-quote/ltp?instrument_key=${encodeURIComponent(instrKey)}`,
    );

    const entry = result.data?.[instrKey];
    if (!entry || entry.last_price == null) {
      throw new UpstoxProviderError('provider_error', `No quote data for ${symbol}`);
    }

    const lp = Number(entry.last_price);
    if (!Number.isFinite(lp)) {
      throw new UpstoxProviderError('provider_error', `Invalid price for ${symbol}`);
    }

    return {
      symbol,
      exchange: 'NSE',
      lastPrice: lp,
      previousClose: Number.isFinite(entry.ohlc?.close) ? entry.ohlc.close : null,
      open: Number.isFinite(entry.ohlc?.open) ? entry.ohlc.open : null,
      high: Number.isFinite(entry.ohlc?.high) ? entry.ohlc.high : null,
      low: Number.isFinite(entry.ohlc?.low) ? entry.ohlc.low : null,
      volume: entry.volume ?? null,
      timestamp: new Date().toISOString(),
      provider: 'upstox',
      sourceQuality: 'live',
    };
  }

  async getHistoricalDaily(
    symbol: string,
    fromDate: string,
    toDate: string,
  ): Promise<NormalizedCandle[]> {
    const instrKey = getUpstoxInstrumentKey(symbol);
    if (!instrKey) {
      throw new UpstoxProviderError('symbol_mapping_missing', `No Upstox instrument key for ${symbol}`);
    }

    const result = await upstoxGet<UpstoxHistoricalResponse>(
      `/historical/${encodeURIComponent(instrKey)}/day/${fromDate}/${toDate}`,
    );

    const raw = result.data?.candles;
    if (!raw || !Array.isArray(raw)) {
      throw new UpstoxProviderError('provider_error', `No historical data for ${symbol}`);
    }

    const candles: NormalizedCandle[] = [];
    for (const row of raw) {
      const [dateStr, o, h, l, c, v, _oi] = row;
      if (!Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) continue;

      candles.push({
        symbol,
        date: dateStr.split('T')[0],
        open: o,
        high: h,
        low: l,
        close: c,
        volume: Math.round(v) || 0,
        provider: 'upstox',
        sourceQuality: 'exchange',
      });
    }

    return candles;
  }

  async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    const token = getAccessToken();
    if (!token) {
      return { provider: 'upstox', status: 'missing_optional', latencyMs: null, checkedAt: new Date().toISOString() };
    }

    try {
      const resp = await fetch(`${UPSTOX_BASE}/market-quote/ltp?instrument_key=NSE_EQ|INE002A01018`, {
        headers: authHeaders()!,
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      const latency = Date.now() - start;

      if (resp.ok) {
        return { provider: 'upstox', status: 'healthy', latencyMs: latency, checkedAt: new Date().toISOString() };
      }
      if (resp.status === 401 || resp.status === 403) {
        return { provider: 'upstox', status: 'expired_or_unauthorized', latencyMs: latency, checkedAt: new Date().toISOString() };
      }
      if (resp.status === 429) {
        return { provider: 'upstox', status: 'rate_limited', latencyMs: latency, checkedAt: new Date().toISOString() };
      }
      return { provider: 'upstox', status: 'provider_error', latencyMs: latency, checkedAt: new Date().toISOString() };
    } catch {
      return { provider: 'upstox', status: 'provider_unreachable', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    }
  }
}
