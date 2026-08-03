/**
 * DataSourceLabeler — Labels all data with its provenance so users
 * always know whether data is real, cached, or model-derived.
 *
 * KNOWN GAP (fixed from a real bug): this previously had a 'psxapi'
 * (Pakistan Stock Exchange) entry in the DataSource union but the actual
 * SOURCE_METADATA object defined an 'indianapi' key instead — neither of
 * which is a real PSE (Philippine) data source. Both have been removed;
 * 'upstox' (a real Indian broker, already removed elsewhere as dead) has
 * also been removed.
 *
 * Every data point returned by the API includes a `dataSource` field:
 *   - 'pse_direct'     — Fetched live from the Philippine Stock Exchange
 *   - 'yahoo_finance'  — Fetched live from Yahoo Finance
 *   - 'google_finance' — Fetched live from Google Finance
 *   - 'screener_in'    — Fetched live from Screener.in (KNOWN GAP: India-only, no PSE equivalent confirmed)
 *   - 'tradingview'    — Fetched live from TradingView
 *   - 'cache'          — From in-memory or DB cache
 *   - 'derived'         — Computed from other data (e.g. DCF, SMA)
 *   - 'synthetic'      — Estimated/model-derived (not real)
 */

export type DataSource =
  | 'pse_direct'
  | 'yahoo_finance'
  | 'google_finance'
  | 'screener_in'
  | 'tradingview'
  | 'cache'
  | 'derived'
  | 'synthetic'
  | 'unavailable';

export interface DataSourceInfo {
  source: DataSource;
  label: string;
  badgeColor: string;
  badgeBg: string;
  isRealTime: boolean;
  confidence: 'high' | 'medium' | 'low';
  latency: string;
}

export const SOURCE_METADATA: Record<DataSource, DataSourceInfo> = {
  pse_direct: { source: 'pse_direct', label: 'PSE Direct', badgeColor: '#22c55e', badgeBg: 'rgba(34,197,94,0.15)', isRealTime: true, confidence: 'high', latency: '<1s' },
  yahoo_finance: { source: 'yahoo_finance', label: 'Yahoo Finance', badgeColor: '#3b82f6', badgeBg: 'rgba(59,130,246,0.15)', isRealTime: true, confidence: 'high', latency: '<2s' },
  google_finance: { source: 'google_finance', label: 'Google Finance', badgeColor: '#3b82f6', badgeBg: 'rgba(59,130,246,0.15)', isRealTime: true, confidence: 'high', latency: '<2s' },
  screener_in: { source: 'screener_in', label: 'Screener.in', badgeColor: '#f59e0b', badgeBg: 'rgba(245,158,11,0.15)', isRealTime: false, confidence: 'high', latency: '<3s' },
  tradingview: { source: 'tradingview', label: 'TradingView', badgeColor: '#3b82f6', badgeBg: 'rgba(59,130,246,0.15)', isRealTime: true, confidence: 'high', latency: '<1s' },
  cache: { source: 'cache', label: 'Cached', badgeColor: '#a0a0a0', badgeBg: 'rgba(160,160,160,0.15)', isRealTime: false, confidence: 'high', latency: '<1ms' },
  derived: { source: 'derived', label: 'Model-Derived', badgeColor: '#f59e0b', badgeBg: 'rgba(245,158,11,0.15)', isRealTime: false, confidence: 'medium', latency: '<10ms' },
  synthetic: { source: 'synthetic', label: 'Estimated', badgeColor: '#ef4444', badgeBg: 'rgba(239,68,68,0.15)', isRealTime: false, confidence: 'low', latency: '<1ms' },
  unavailable: { source: 'unavailable', label: 'Unavailable', badgeColor: '#666', badgeBg: 'rgba(102,102,102,0.15)', isRealTime: false, confidence: 'low', latency: '—' },
};

export class DataSourceLabeler {
  private sources: Record<string, DataSource> = {};

  set(category: string, source: DataSource): void {
    this.sources[category] = source;
  }

  get(category: string): DataSourceInfo {
    return SOURCE_METADATA[this.sources[category] || 'unavailable'];
  }

  getAll(): Record<string, DataSourceInfo> {
    const result: Record<string, DataSourceInfo> = {};
    for (const [key, source] of Object.entries(this.sources)) {
      result[key] = SOURCE_METADATA[source];
    }
    return result;
  }

  static label(source: DataSource): string {
    return SOURCE_METADATA[source]?.label || source;
  }

  static confidence(source: DataSource): 'high' | 'medium' | 'low' {
    return SOURCE_METADATA[source]?.confidence || 'low';
  }
}

export const dataSourceLabeler = new DataSourceLabeler();
