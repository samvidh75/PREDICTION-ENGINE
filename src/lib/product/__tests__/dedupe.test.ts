import { describe, expect, it } from "vitest";
import { dedupeBySymbol } from "../dedupe";
import { normalizeSymbol } from "../identity";
import { buildSingleActionCluster } from "../stockDisplay";

describe("product identity deduplication", () => {
  it.each(["ITC", "CHENNPETRO", "RELIANCE"])("collapses duplicate %s rows", (symbol) => {
    const rows = [{ symbol }, { symbol: symbol.toLowerCase() }, { symbol: `${symbol}.NS` }];
    expect(dedupeBySymbol(rows, (row) => row.symbol)).toHaveLength(1);
  });

  it("normalizes exchange suffixes", () => {
    expect(normalizeSymbol(" reliance.nse ")).toBe("RELIANCE");
  });

  it("creates one primary action at every maturity level", () => {
    for (const state of ["ready", "partial", "limited"] as const) {
      expect(buildSingleActionCluster(state, false).filter((action) => action.primary)).toHaveLength(1);
    }
  });
});
