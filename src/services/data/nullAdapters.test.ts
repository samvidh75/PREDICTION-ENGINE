import { describe, expect, it } from "vitest";
import type { AdapterResult, PriceCandle } from "./dataAdapterTypes";
import { createDataAdapterRegistry } from "./dataAdapterRegistry";
import { nullCompanyMasterAdapter, nullPriceAdapter } from "./nullAdapters";

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("null adapters and registry", () => {
  it("returns explicit unavailable results without placeholder records", async () => {
    const result = await nullCompanyMasterAdapter.getCompanyMaster("RELIANCE");
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    if (!result.ok) expect(result.errorCode).toBe("ADAPTER_UNAVAILABLE");
    expect(result.asOf).toMatch(ISO_PATTERN);
  });

  it("rejects malformed symbols consistently", async () => {
    const result = await nullPriceAdapter.getDailyCandles("bad symbol");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("INVALID_SYMBOL");
  });

  it("uses safe null adapters by default and accepts injected adapters", async () => {
    const registry = createDataAdapterRegistry();
    expect((await registry.price.getDailyCandles("RELIANCE")).ok).toBe(false);

    const priceResult: AdapterResult<PriceCandle[]> = {
      ok: true,
      asOf: "2026-06-29T00:00:00.000Z",
      warnings: [],
      data: [{ symbol: "RELIANCE", timeframe: "1d", timestamp: "2026-06-29T00:00:00.000Z", open: 1, high: 2, low: 1, close: 1.5, volume: 10 }],
    };
    const injected = createDataAdapterRegistry({
      price: {
        getDailyCandles: async () => priceResult,
        getIntradayCandles: async () => priceResult,
      },
    });
    expect((await injected.price.getDailyCandles("RELIANCE")).ok).toBe(true);
  });
});
