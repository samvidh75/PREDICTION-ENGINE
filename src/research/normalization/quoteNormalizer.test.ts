import { describe, expect, it } from "vitest";
import { normalizeQuote } from "./quoteNormalizer";

describe("normalizeQuote", () => {
  it("normalizes a valid quote", () => {
    const result = normalizeQuote({ symbol: "RELIANCE", lastPrice: 2500, change: 25, changePercent: 1.01 });
    expect(result.error).toBeNull();
    expect(result.data?.symbol).toBe("RELIANCE");
    expect(result.data?.lastPrice).toBe(2500);
    expect(result.data?.changePercent).toBe(1.01);
  });

  it("fails on missing symbol", () => {
    const result = normalizeQuote({} as any);
    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
  });

  it("handles null prices gracefully", () => {
    const result = normalizeQuote({ symbol: "TCS", lastPrice: null });
    expect(result.data?.lastPrice).toBeNull();
  });

  it("handles malformed input", () => {
    const result = normalizeQuote(null as any);
    expect(result.error).not.toBeNull();
  });
});
