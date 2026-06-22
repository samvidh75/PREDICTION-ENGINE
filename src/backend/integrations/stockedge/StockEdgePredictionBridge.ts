import type { StockEdgeCanonicalSnapshot } from "./StockEdgeTypes";

export interface StockEdgePredictionInput {
  symbol: string;
  valuation: Record<string, number>;
  quality: Record<string, number>;
  growth: Record<string, number>;
  balanceSheet: Record<string, number>;
  technicals: Record<string, number>;
  ownership: Record<string, number>;
  activeFieldCount: number;
  missingFields: string[];
}

function addFinite(target: Record<string, number>, key: string, value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  target[key] = value;
  return 1;
}

export function buildStockEdgePredictionInput(snapshot: StockEdgeCanonicalSnapshot): StockEdgePredictionInput {
  const valuation: Record<string, number> = {};
  const quality: Record<string, number> = {};
  const growth: Record<string, number> = {};
  const balanceSheet: Record<string, number> = {};
  const technicals: Record<string, number> = {};
  const ownership: Record<string, number> = {};
  const missingFields: string[] = [];
  let activeFieldCount = 0;

  activeFieldCount += addFinite(valuation, "peRatio", snapshot.fundamentals?.peRatio);
  activeFieldCount += addFinite(valuation, "pbRatio", snapshot.fundamentals?.pbRatio);
  activeFieldCount += addFinite(valuation, "dividendYield", snapshot.fundamentals?.dividendYield);
  activeFieldCount += addFinite(quality, "roe", snapshot.fundamentals?.roe);
  activeFieldCount += addFinite(quality, "roce", snapshot.fundamentals?.roce);
  activeFieldCount += addFinite(quality, "operatingMargin", snapshot.fundamentals?.operatingMargin);
  activeFieldCount += addFinite(quality, "netMargin", snapshot.fundamentals?.netMargin);
  activeFieldCount += addFinite(growth, "revenueGrowth", snapshot.fundamentals?.revenueGrowth);
  activeFieldCount += addFinite(growth, "profitGrowth", snapshot.fundamentals?.profitGrowth);
  activeFieldCount += addFinite(growth, "epsGrowth", snapshot.fundamentals?.epsGrowth);
  activeFieldCount += addFinite(balanceSheet, "debtToEquity", snapshot.fundamentals?.debtToEquity);
  activeFieldCount += addFinite(technicals, "rsi", snapshot.technicals?.rsi);
  activeFieldCount += addFinite(technicals, "macd", snapshot.technicals?.macd);
  activeFieldCount += addFinite(technicals, "sma20", snapshot.technicals?.sma20);
  activeFieldCount += addFinite(technicals, "sma50", snapshot.technicals?.sma50);
  activeFieldCount += addFinite(technicals, "sma200", snapshot.technicals?.sma200);
  activeFieldCount += addFinite(technicals, "adx", snapshot.technicals?.adx);
  activeFieldCount += addFinite(technicals, "atr", snapshot.technicals?.atr);

  const latestOwnership = snapshot.ownership[0];
  activeFieldCount += addFinite(ownership, "promoter", latestOwnership?.promoter);
  activeFieldCount += addFinite(ownership, "fii", latestOwnership?.fii);
  activeFieldCount += addFinite(ownership, "dii", latestOwnership?.dii);
  activeFieldCount += addFinite(ownership, "publicRetail", latestOwnership?.publicRetail);
  activeFieldCount += addFinite(ownership, "pledge", latestOwnership?.pledge);

  for (const [section, values] of Object.entries({ valuation, quality, growth, balanceSheet, technicals, ownership })) {
    if (Object.keys(values).length === 0) missingFields.push(section);
  }

  return {
    symbol: snapshot.symbol,
    valuation,
    quality,
    growth,
    balanceSheet,
    technicals,
    ownership,
    activeFieldCount,
    missingFields,
  };
}
