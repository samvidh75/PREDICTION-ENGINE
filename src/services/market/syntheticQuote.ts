import type { ChartTimeframe } from "../../components/charts/chartTypes";
import { getSyntheticChartSeries } from "../../components/charts/chartData";

export type SyntheticQuote = {
  price: number;
  prevClose: number;
  changeAbs: number;
  changePct: number;
  direction: "UP" | "DOWN" | "FLAT";
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function getSyntheticQuote(tickerSeed: string, timeframe: ChartTimeframe = "1D"): SyntheticQuote {
  const series = getSyntheticChartSeries(tickerSeed, timeframe).candles;
  if (series.length === 0) {
    return { price: 0, prevClose: 0, changeAbs: 0, changePct: 0, direction: "FLAT" };
  }

  const last = series[series.length - 1];
  const prev = series.length >= 2 ? series[series.length - 2] : last;

  const price = last.c;
  const prevClose = prev.c;

  const changeAbs = price - prevClose;
  const rawPct = prevClose === 0 ? 0 : (changeAbs / prevClose) * 100;
  const changePct = clamp(rawPct, -99.9, 99.9);

  const direction: SyntheticQuote["direction"] = changePct > 0.0001 ? "UP" : changePct < -0.0001 ? "DOWN" : "FLAT";

  return { price, prevClose, changeAbs, changePct, direction };
}
