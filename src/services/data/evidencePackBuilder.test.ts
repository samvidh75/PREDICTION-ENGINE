import { describe, expect, it } from "vitest";
import type { AdapterResult, PriceCandle } from "./dataAdapterTypes";
import { buildMarketEvidencePack } from "./evidencePackBuilder";

const price: AdapterResult<PriceCandle[]> = {
  ok: true,
  asOf: "2026-06-29T00:00:00.000Z",
  warnings: [],
  data: [{ symbol: "RELIANCE", timeframe: "1d", timestamp: "2026-06-29T00:00:00.000Z", open: 1, high: 2, low: 1, close: 1.5, volume: 10 }],
};

describe("market evidence pack builder", () => {
  it("marks available price evidence and missing unwired domains", () => {
    const pack = buildMarketEvidencePack({ symbol: "reliance", price });
    expect(pack.symbol).toBe("RELIANCE");
    expect(pack.availableDomains).toEqual(["price_volume"]);
    expect(pack.missingDomains).toContain("financial_statements");
    expect(pack.evidenceItems).toHaveLength(1);
    expect(pack.evidenceItems[0]?.summary).toBe("Price and volume evidence is available for RELIANCE.");
  });

  it("returns fresh arrays without raw error details", () => {
    const packA = buildMarketEvidencePack({ symbol: "TCS" });
    const packB = buildMarketEvidencePack({ symbol: "TCS" });
    expect(packA.availableDomains).not.toBe(packB.availableDomains);
    expect(packA.missingDomains).not.toBe(packB.missingDomains);
    expect(packA.evidenceItems).toEqual([]);
    expect(packA.missingDomains).toContain("price_volume");
  });
});
