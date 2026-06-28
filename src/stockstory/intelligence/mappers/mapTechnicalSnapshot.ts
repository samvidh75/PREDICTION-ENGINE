/**
 * Technical Snapshot Mapper
 *
 * Maps a raw DB row from feature_snapshots to canonical
 * IntelligenceInput.technicals with safe numeric conversion.
 */

export interface TechnicalSnapshotRaw {
  rsi?: number | string | null;
  macd?: number | string | null;
  macd_signal?: number | string | null;
  macd_histogram?: number | string | null;
  adx?: number | string | null;
  atr?: number | string | null;
  bollinger_width?: number | string | null;
  bollinger_position?: number | string | null;
  momentum?: number | string | null; // 1-month momentum
  momentum_3m?: number | string | null;
  momentum_6m?: number | string | null;
  momentum_12m?: number | string | null;
  volatility?: number | string | null;
  sma50?: number | string | null;
  sma200?: number | string | null;
  sma50_distance?: number | string | null;
  sma200_distance?: number | string | null;
  volume?: number | string | null;
  avg_volume?: number | string | null;
  volume_ratio?: number | string | null;
  relative_strength?: number | string | null;
  trend_strength?: number | string | null;
  avg_true_range?: number | string | null;
  asOf?: string;
}

export interface TechnicalSnapshotMapped {
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  adx: number | null;
  atr: number | null;
  bollingerWidth: number | null;
  bollingerPosition: number | null;
  momentum1m: number | null;
  momentum3m: number | null;
  momentum6m: number | null;
  momentum12m: number | null;
  volatility: number | null;
  sma50: number | null;
  sma200: number | null;
  sma50Distance: number | null;
  sma200Distance: number | null;
  volume: number | null;
  avgVolume: number | null;
  volumeRatio: number | null;
  relativeStrength: number | null;
  trendStrength: number | null;
  avgTrueRange: number | null;
  asOf: string | null;
}

export function mapTechnicalSnapshot(raw: TechnicalSnapshotRaw): TechnicalSnapshotMapped {
  return {
    rsi: toNumber(raw.rsi),
    macd: toNumber(raw.macd),
    macdSignal: toNumber(raw.macd_signal),
    macdHistogram: toNumber(raw.macd_histogram),
    adx: toNumber(raw.adx),
    atr: toNumber(raw.atr),
    bollingerWidth: toNumber(raw.bollinger_width),
    bollingerPosition: toNumber(raw.bollinger_position),
    momentum1m: toNumber(raw.momentum),
    momentum3m: toNumber(raw.momentum_3m),
    momentum6m: toNumber(raw.momentum_6m),
    momentum12m: toNumber(raw.momentum_12m),
    volatility: toNumber(raw.volatility),
    sma50: toNumber(raw.sma50),
    sma200: toNumber(raw.sma200),
    sma50Distance: toNumber(raw.sma50_distance),
    sma200Distance: toNumber(raw.sma200_distance),
    volume: toNumber(raw.volume),
    avgVolume: toNumber(raw.avg_volume),
    volumeRatio: toNumber(raw.volume_ratio),
    relativeStrength: toNumber(raw.relative_strength),
    trendStrength: toNumber(raw.trend_strength),
    avgTrueRange: toNumber(raw.avg_true_range),
    asOf: raw.asOf ?? null,
  };
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}
