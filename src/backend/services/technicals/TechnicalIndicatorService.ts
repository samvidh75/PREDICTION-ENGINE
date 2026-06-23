import { query } from "../../../db/index";
import type { OhlcvPoint, TechnicalIndicatorSnapshot } from "../../../shared/technicals/TechnicalIndicatorTypes";
import { computeTechnicalIndicators } from "./TechnicalIndicatorComputer";
import { isIndianTradingSessionDate } from "../../../shared/market/IndianTradingCalendar";

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map<string, { snapshot: TechnicalIndicatorSnapshot; ts: number }>();

async function fetchOhlcvFromDb(symbol: string): Promise<OhlcvPoint[]> {
  const res = await query(
    `SELECT trade_date, open, high, low, close, volume
     FROM daily_prices
     WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
       AND close > 0
     ORDER BY trade_date ASC
     LIMIT 500`,
    [symbol.toUpperCase().trim()],
  );
  return (res.rows || [])
    .filter((r: Record<string, unknown>) => {
      const date = String(r.trade_date ?? "");
      return date.length >= 10 && isIndianTradingSessionDate(date);
    })
    .map((r: Record<string, unknown>) => ({
      date: String(r.trade_date ?? ""),
      open: Number(r.open) || 0,
      high: Number(r.high) || 0,
      low: Number(r.low) || 0,
      close: Number(r.close) || 0,
      volume: Number(r.volume) || 0,
    }));
}

export async function getTechnicalSnapshot(symbol: string): Promise<TechnicalIndicatorSnapshot> {
  const clean = symbol.toUpperCase().trim();
  const cached = cache.get(clean);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.snapshot;

  const candles = await fetchOhlcvFromDb(clean);
  const { snapshot } = computeTechnicalIndicators(clean, candles);

  cache.set(clean, { snapshot, ts: Date.now() });
  return snapshot;
}

export async function computeAndCache(symbol: string): Promise<TechnicalIndicatorSnapshot> {
  const clean = symbol.toUpperCase().trim();
  const candles = await fetchOhlcvFromDb(clean);
  const { snapshot } = computeTechnicalIndicators(clean, candles);
  cache.set(clean, { snapshot, ts: Date.now() });
  return snapshot;
}
