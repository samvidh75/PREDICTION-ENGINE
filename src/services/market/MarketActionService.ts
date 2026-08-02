import { query } from '../../db/index';

export type MarketActionAvailability = 'real' | 'partial' | 'unavailable';

export interface MarketActionRow extends Record<string, unknown> {
  symbol: string;
  company_name: string | null;
  sector: string | null;
  trade_date: string;
  close: number | string;
  volume: number | string | null;
  previous_trade_date: string | null;
  previous_close: number | string | null;
  market_cap: number | string | null;
  pe_ratio: number | string | null;
  roe: number | string | null;
  revenue_growth: number | string | null;
  rsi: number | string | null;
  momentum: number | string | null;
  volatility: number | string | null;
  moving_average_distance: number | string | null;
}

export interface MarketMover {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  tradeDate: string;
  price: number;
  changePercent: number | null;
  volume: number | null;
}

export interface SectorMover {
  sector: string;
  averageChangePercent: number;
  symbolsAnalyzed: number;
}

export interface ScannerItem {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  value: number;
  displayValue: string;
  asOf: string;
}

export interface ScannerPreset {
  id: 'positive-momentum' | 'lower-volatility' | 'value-watch' | 'large-cap';
  label: string;
  description: string;
  sourceFields: string[];
  availability: MarketActionAvailability;
  items: ScannerItem[];
}

export interface MarketActionResponse {
  status: MarketActionAvailability;
  asOf: string | null;
  message: string;
  data: {
    gainers: MarketMover[];
    losers: MarketMover[];
    volumeLeaders: MarketMover[];
    sectorMovers: SectorMover[];
    scannerPresets: ScannerPreset[];
  };
  dataState: {
    availability: MarketActionAvailability;
    sourceTables: string[];
    rowsAnalyzed: number;
    rowsWithComparisons: number;
    missingInputs: string[];
  };
}

const MARKET_ACTION_SQL = `
WITH ranked_prices AS (
  SELECT
    symbol,
    trade_date,
    close,
    volume,
    ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trade_date DESC) AS rn
  FROM daily_prices
  WHERE close IS NOT NULL AND close > 0
),
latest_price AS (
  SELECT symbol, trade_date, close, volume
  FROM ranked_prices
  WHERE rn = 1
),
previous_price AS (
  SELECT symbol, trade_date, close
  FROM ranked_prices
  WHERE rn = 2
),
latest_financial AS (
  SELECT fs.symbol, fs.market_cap, fs.pe_ratio, fs.roe, fs.revenue_growth
  FROM financial_snapshots fs
  INNER JOIN (
    SELECT symbol, MAX(period_end) AS period_end
    FROM financial_snapshots
    GROUP BY symbol
  ) latest
    ON latest.symbol = fs.symbol AND latest.period_end = fs.period_end
),
latest_feature AS (
  SELECT fs.symbol, fs.rsi, fs.momentum, fs.volatility, fs.moving_average_distance
  FROM feature_snapshots fs
  INNER JOIN (
    SELECT symbol, MAX(trade_date) AS trade_date
    FROM feature_snapshots
    GROUP BY symbol
  ) latest
    ON latest.symbol = fs.symbol AND latest.trade_date = fs.trade_date
)
SELECT
  lp.symbol,
  symbols.company_name,
  symbols.sector,
  lp.trade_date,
  lp.close,
  lp.volume,
  pp.trade_date AS previous_trade_date,
  pp.close AS previous_close,
  lf.market_cap,
  lf.pe_ratio,
  lf.roe,
  lf.revenue_growth,
  lft.rsi,
  lft.momentum,
  lft.volatility,
  lft.moving_average_distance
FROM latest_price lp
LEFT JOIN previous_price pp ON pp.symbol = lp.symbol
LEFT JOIN symbols ON symbols.symbol = lp.symbol
LEFT JOIN latest_financial lf ON lf.symbol = lp.symbol
LEFT JOIN latest_feature lft ON lft.symbol = lp.symbol
ORDER BY lp.symbol ASC`;

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveNumber(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function displayNumber(value: number, suffix = ''): string {
  return `${round(value, 2).toLocaleString('en-PH')}${suffix}`;
}

function marketCapDisplay(value: number): string {
  if (value >= 1_000_000_000) return `₱${round(value / 1_000_000_000, 2).toLocaleString('en-PH')}B`;
  return `₱${Math.round(value / 1_000_000).toLocaleString('en-PH')}M`;
}

function asMover(row: MarketActionRow): MarketMover | null {
  const price = positiveNumber(row.close);
  if (price === null) return null;

  const previousClose = positiveNumber(row.previous_close);
  const changePercent = previousClose === null ? null : round(((price - previousClose) / previousClose) * 100);
  const volume = positiveNumber(row.volume);

  return {
    symbol: String(row.symbol).toUpperCase(),
    companyName: typeof row.company_name === 'string' && row.company_name.trim() ? row.company_name.trim() : null,
    sector: typeof row.sector === 'string' && row.sector.trim() ? row.sector.trim() : null,
    tradeDate: String(row.trade_date),
    price,
    changePercent,
    volume,
  };
}

function scannerItem(row: MarketActionRow, rawValue: unknown, displayValue: (value: number) => string): ScannerItem | null {
  const value = finiteNumber(rawValue);
  if (value === null) return null;

  return {
    symbol: String(row.symbol).toUpperCase(),
    companyName: typeof row.company_name === 'string' && row.company_name.trim() ? row.company_name.trim() : null,
    sector: typeof row.sector === 'string' && row.sector.trim() ? row.sector.trim() : null,
    value,
    displayValue: displayValue(value),
    asOf: String(row.trade_date),
  };
}

function preset(
  id: ScannerPreset['id'],
  label: string,
  description: string,
  sourceFields: string[],
  items: ScannerItem[],
): ScannerPreset {
  return {
    id,
    label,
    description,
    sourceFields,
    availability: items.length > 0 ? 'real' : 'unavailable',
    items: items.slice(0, 5),
  };
}

export function unavailableMarketActionResponse(message: string): MarketActionResponse {
  return {
    status: 'unavailable',
    asOf: null,
    message,
    data: {
      gainers: [],
      losers: [],
      volumeLeaders: [],
      sectorMovers: [],
      scannerPresets: [],
    },
    dataState: {
      availability: 'unavailable',
      sourceTables: ['daily_prices', 'symbols', 'financial_snapshots', 'feature_snapshots'],
      rowsAnalyzed: 0,
      rowsWithComparisons: 0,
      missingInputs: ['daily_prices.latest_snapshot'],
    },
  };
}

export function buildMarketActionResponse(rows: MarketActionRow[]): MarketActionResponse {
  const movers = rows.map(asMover).filter((item): item is MarketMover => item !== null);
  if (movers.length === 0) {
    return unavailableMarketActionResponse('Market action is unavailable because no valid daily price snapshots were found.');
  }

  const compared = movers.filter((item) => item.changePercent !== null);
  const gainers = compared
    .filter((item) => (item.changePercent ?? 0) > 0)
    .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
    .slice(0, 5);
  const losers = compared
    .filter((item) => (item.changePercent ?? 0) < 0)
    .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))
    .slice(0, 5);
  const volumeLeaders = movers
    .filter((item) => item.volume !== null)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, 5);

  const sectorMap = new Map<string, number[]>();
  for (const item of compared) {
    if (!item.sector || item.changePercent === null) continue;
    const values = sectorMap.get(item.sector) ?? [];
    values.push(item.changePercent);
    sectorMap.set(item.sector, values);
  }
  const sectorMovers = [...sectorMap.entries()]
    .map(([sector, values]) => ({
      sector,
      averageChangePercent: round(values.reduce((sum, value) => sum + value, 0) / values.length),
      symbolsAnalyzed: values.length,
    }))
    .sort((a, b) => Math.abs(b.averageChangePercent) - Math.abs(a.averageChangePercent))
    .slice(0, 5);

  const positiveMomentum = rows
    .map((row) => scannerItem(row, row.momentum, (value) => displayNumber(value, '%')))
    .filter((item): item is ScannerItem => item !== null && item.value > 0)
    .sort((a, b) => b.value - a.value);
  const lowerVolatility = rows
    .map((row) => scannerItem(row, row.volatility, (value) => displayNumber(value, '%')))
    .filter((item): item is ScannerItem => item !== null && item.value >= 0)
    .sort((a, b) => a.value - b.value);
  const valueWatch = rows
    .map((row) => scannerItem(row, row.pe_ratio, (value) => `${displayNumber(value)}x PE`))
    .filter((item): item is ScannerItem => item !== null && item.value > 0)
    .sort((a, b) => a.value - b.value);
  const largeCap = rows
    .map((row) => scannerItem(row, row.market_cap, marketCapDisplay))
    .filter((item): item is ScannerItem => item !== null && item.value > 0)
    .sort((a, b) => b.value - a.value);

  const scannerPresets = [
    preset('positive-momentum', 'Positive momentum', 'Latest feature snapshot momentum above zero, ranked highest first.', ['feature_snapshots.momentum'], positiveMomentum),
    preset('lower-volatility', 'Lower volatility', 'Latest feature snapshot volatility ranked lowest first.', ['feature_snapshots.volatility'], lowerVolatility),
    preset('value-watch', 'Value watch', 'Latest positive PE ratios ranked lowest first. This is a screen, not a recommendation.', ['financial_snapshots.pe_ratio'], valueWatch),
    preset('large-cap', 'Large cap', 'Latest populated market capitalisation ranked highest first.', ['financial_snapshots.market_cap'], largeCap),
  ];

  const asOf = movers.map((item) => item.tradeDate).sort().at(-1) ?? null;
  const missingInputs: string[] = [];
  if (compared.length === 0) missingInputs.push('daily_prices.previous_trade_date');
  if (scannerPresets.every((item) => item.availability === 'unavailable')) {
    missingInputs.push('financial_snapshots_or_feature_snapshots');
  }

  const status: MarketActionAvailability = compared.length > 0 ? 'real' : 'partial';
  return {
    status,
    asOf,
    message: status === 'real'
      ? 'Market action is derived from stored daily prices and certified snapshot fields.'
      : 'Current market snapshots are available, but movers require at least two price dates per symbol.',
    data: {
      gainers,
      losers,
      volumeLeaders,
      sectorMovers,
      scannerPresets,
    },
    dataState: {
      availability: status,
      sourceTables: ['daily_prices', 'symbols', 'financial_snapshots', 'feature_snapshots'],
      rowsAnalyzed: movers.length,
      rowsWithComparisons: compared.length,
      missingInputs,
    },
  };
}

export async function loadMarketActionSnapshot(): Promise<MarketActionResponse> {
  const result = await query<MarketActionRow>(MARKET_ACTION_SQL);
  return buildMarketActionResponse(result.rows);
}
