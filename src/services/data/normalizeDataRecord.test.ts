import { describe, expect, it } from "vitest";
import {
  dedupeBy,
  normalizeAdapterSymbol,
  normalizeFiniteNumber,
  normalizeIsoTimestamp,
  normalizeNullableString,
  normalizePriceCandle,
  normalizeSafeUrl,
} from "./normalizeDataRecord";

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("data record normalization", () => {
  it("normalizes exchange-style symbols and rejects malformed symbols", () => {
    expect(normalizeAdapterSymbol(" pse:bdo.ps ")).toBe("BDO");
    expect(normalizeAdapterSymbol("bad symbol")).toBeNull();
  });

  it("normalizes strings and finite numbers", () => {
    expect(normalizeNullableString("  hello   world ")).toBe("hello world");
    expect(normalizeNullableString("   ")).toBeNull();
    expect(normalizeFiniteNumber("1,234.5")).toBe(1234.5);
    expect(normalizeFiniteNumber(Infinity)).toBeNull();
  });

  it("normalizes timestamps and safe urls", () => {
    expect(normalizeIsoTimestamp("2026-06-29")).toMatch(ISO_PATTERN);
    expect(normalizeIsoTimestamp("not-a-date")).toBeNull();
    expect(normalizeSafeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(normalizeSafeUrl("http://example.com/a")).toBeNull();
  });

  it("dedupes by stable key", () => {
    expect(dedupeBy([{ id: "a" }, { id: "a" }, { id: "b" }], item => item.id)).toHaveLength(2);
  });

  it("normalizes valid candles and rejects malformed candles", () => {
    const candle = normalizePriceCandle({ symbol: "tcs", timestamp: "2026-06-29", open: 1, high: 2, low: 1, close: 1.5, volume: 0 }, "1d");
    expect(candle?.symbol).toBe("TCS");
    expect(candle?.timestamp).toMatch(ISO_PATTERN);
    expect(normalizePriceCandle({ symbol: "TCS", timestamp: "2026-06-29", open: 1, high: 0.5, low: 1, close: 1 }, "1d")).toBeNull();
  });
});
