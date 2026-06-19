import { describe, expect, it } from "vitest";
import { normalizeFundamentals } from "./fundamentalsNormalizer";

describe("normalizeFundamentals", () => {
  it("normalizes valid fundamentals", () => {
    const r = normalizeFundamentals({ symbol: "INFY", peRatio: 28.5, roe: 25.3, sales: 150000 });
    expect(r.error).toBeNull();
    expect(r.data?.peRatio).toBe(28.5);
    expect(r.data?.roe).toBe(25.3);
  });

  it("handles partial fundamentals", () => {
    const r = normalizeFundamentals({ symbol: "HDFC", peRatio: null, roe: null });
    expect(r.data?.sourceSuccess).toBe(false);
  });

  it("fails on missing symbol", () => {
    const r = normalizeFundamentals({ peRatio: 15 } as any);
    expect(r.error).not.toBeNull();
  });

  it("handles malformed input", () => {
    const r = normalizeFundamentals("garbage" as any);
    expect(r.error).not.toBeNull();
  });
});
