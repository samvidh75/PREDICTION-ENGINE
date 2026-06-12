import type { MarketPriceRecord } from "../providers/types";
import type { ValidationResult } from "./types";

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function validateMarketPriceRecords(records: MarketPriceRecord[]): ValidationResult<MarketPriceRecord> {
  const accepted: MarketPriceRecord[] = [];
  const rejected: ValidationResult<MarketPriceRecord>["rejected"] = [];

  for (const record of records) {
    const reasons: string[] = [];
    if (!record.symbol?.trim()) reasons.push("symbol is empty");
    if (!isValidDateOnly(record.tradingDate)) reasons.push("tradingDate is not a valid date");
    if (!finitePositive(record.open)) reasons.push("open <= 0");
    if (!finitePositive(record.high)) reasons.push("high <= 0");
    if (!finitePositive(record.low)) reasons.push("low <= 0");
    if (!finitePositive(record.close)) reasons.push("close <= 0");
    if (record.high < record.low) reasons.push("high < low");
    if (record.open < record.low) reasons.push("open < low");
    if (record.open > record.high) reasons.push("open > high");
    if (record.close < record.low) reasons.push("close < low");
    if (record.close > record.high) reasons.push("close > high");
    if (record.volume !== null && (!Number.isFinite(record.volume) || record.volume < 0)) {
      reasons.push("volume is negative or non-finite");
    }

    if (reasons.length > 0) {
      rejected.push({ record, reason: reasons.join("; "), severity: "error" });
    } else {
      accepted.push({ ...record, symbol: record.symbol.trim().toUpperCase() });
    }
  }

  return { accepted, rejected };
}

export function assertValidFactorScore(value: number | null): void {
  if (value === null) return;
  if (!Number.isFinite(value)) throw new Error("Non-finite factor score");
  if (value < 0 || value > 100) throw new Error("Factor score outside [0, 100]");
}

