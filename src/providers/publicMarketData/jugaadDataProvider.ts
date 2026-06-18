import type { NormalizedCandle, ProviderHealth, ProviderId } from '../marketData/types';
import type { NormalizedQuote, PublicProviderId, PublicMarketDataProvider } from './types';
import { probeJugaadData, runStockQuery, runBhavcopyQuery, runIndexQuery, runRbiRatesQuery } from './jugaadDataBridge';

const FETCH_TIMEOUT = 30_000;

class JugaadDataProviderError extends Error {
  constructor(
    public readonly safeCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'JugaadDataProviderError';
  }
}

export class JugaadDataProvider implements PublicMarketDataProvider {
  readonly providerId: PublicProviderId = 'jugaad-data';

  async getQuote(symbol: string): Promise<NormalizedQuote> {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = new Date().toISOString().split('T')[0];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const rows = await runStockQuery(symbol, from, to);
      if (rows.length === 0) {
        throw new JugaadDataProviderError('provider_error', `No data returned for ${symbol}`);
      }
      const latest = rows[rows.length - 1];
      return {
        symbol,
        exchange: 'NSE',
        lastPrice: latest.CLOSE,
        previousClose: latest.PREV_CLOSE ?? null,
        open: latest.OPEN ?? null,
        high: latest.HIGH ?? null,
        low: latest.LOW ?? null,
        volume: latest.TOT_TRD_QTY ?? null,
        timestamp: new Date().toISOString(),
        provider: 'jugaad-data' as ProviderId,
        sourceQuality: 'delayed',
        freshnessStatus: 'stale',
      };
    } catch (err: unknown) {
      if (err instanceof JugaadDataProviderError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new JugaadDataProviderError('provider_error', `jugaad-data quote error for ${symbol}: ${msg}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async getHistoricalDaily(symbol: string, fromDate: string, toDate: string): Promise<NormalizedCandle[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const rows = await runStockQuery(symbol, fromDate, toDate);
      const candles: NormalizedCandle[] = [];
      for (const row of rows) {
        if (row.CLOSE == null || !Number.isFinite(row.CLOSE)) continue;
        candles.push({
          symbol,
          date: row.DATE,
          open: Number.isFinite(row.OPEN) ? row.OPEN : row.CLOSE,
          high: Number.isFinite(row.HIGH) ? row.HIGH : row.CLOSE,
          low: Number.isFinite(row.LOW) ? row.LOW : row.CLOSE,
          close: row.CLOSE,
          volume: row.TOT_TRD_QTY != null && Number.isFinite(row.TOT_TRD_QTY) ? Math.round(row.TOT_TRD_QTY) : 0,
          provider: 'jugaad-data' as ProviderId,
          sourceQuality: 'exchange',
        });
      }
      return candles;
    } catch (err: unknown) {
      if (err instanceof JugaadDataProviderError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new JugaadDataProviderError('provider_error', `jugaad-data historical error for ${symbol}: ${msg}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async getBhavcopy(date: string): Promise<unknown[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      return await runBhavcopyQuery(date);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new JugaadDataProviderError('provider_error', `jugaad-data bhavcopy error: ${msg}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async getRbiRates(): Promise<Record<string, unknown>> {
    try {
      return await runRbiRatesQuery();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new JugaadDataProviderError('provider_error', `jugaad-data RBI rates error: ${msg}`);
    }
  }

  async getIndexData(): Promise<Record<string, unknown>> {
    try {
      return await runIndexQuery();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new JugaadDataProviderError('provider_error', `jugaad-data index data error: ${msg}`);
    }
  }

  async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const probe = await probeJugaadData();
      const stockOk = probe.stock_data_RELIANCE?.status === 'healthy';
      const latency = Date.now() - start;
      if (stockOk) {
        return { provider: 'jugaad-data' as ProviderId, status: 'healthy', latencyMs: latency, checkedAt: new Date().toISOString() };
      }
      if (probe.package_import?.status === 'import_failed') {
        return { provider: 'jugaad-data' as ProviderId, status: 'missing_optional', latencyMs: latency, checkedAt: new Date().toISOString() };
      }
      return { provider: 'jugaad-data' as ProviderId, status: 'provider_error', latencyMs: latency, checkedAt: new Date().toISOString() };
    } catch {
      return { provider: 'jugaad-data' as ProviderId, status: 'provider_unreachable', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    }
  }
}
