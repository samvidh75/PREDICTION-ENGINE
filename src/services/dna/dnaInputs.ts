import type { RegisteredStock } from "../stocks/StockRegistry";

export function finitePeRatio(stock: RegisteredStock): number | null {
  return typeof stock.peRatio === "number" && Number.isFinite(stock.peRatio)
    ? stock.peRatio
    : null;
}

export function rangeProximity(stock: RegisteredStock): number | null {
  const range = stock.fiftyTwoWeekRange;
  const { current, low, high } = range;
  if (
    typeof current !== "number" ||
    typeof low !== "number" ||
    typeof high !== "number" ||
    !Number.isFinite(current) ||
    !Number.isFinite(low) ||
    !Number.isFinite(high) ||
    high === low
  ) {
    return null;
  }
  return (current - low) / (high - low);
}
