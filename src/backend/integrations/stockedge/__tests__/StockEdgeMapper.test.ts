import { describe, expect, it } from "vitest";
import { buildStockEdgePredictionInput } from "../StockEdgePredictionBridge";
import { mapCanonicalSnapshot, normalizeFinancialRowKey } from "../StockEdgeMapper";

const fixture = {
  profile: {
    symbol: "RELIANCE",
    companyName: "Reliance Industries Ltd",
    sector: "Energy",
    isin: "INE002A01018",
  },
  price: {
    price: "2900.5",
    previousClose: "2850",
    volume: "1000000",
    deliveryPercent: "48.5%",
    week52High: "3020",
    week52Low: "2200",
  },
  technicals: {
    rsi: "58.2",
    macd: "3.5",
    sma20: "2875",
    sma50: "2810",
    adx: "24",
  },
  fundamentals: {
    pe: "27.4",
    pb: "2.1",
    ROE: "13.2",
    ROCE: "11.8",
    debtToEquity: "0.42",
    dividendYield: "0.35",
    salesGrowth: "8.5",
    netProfitGrowth: "6.2",
  },
  financialTables: {
    profitLoss: [
      { label: "Sales", periods: { FY2024: "900000", FY2023: "850000" } },
      { label: "Profit After Tax", periods: { FY2024: "72000", FY2023: "67000" } },
    ],
  },
  shareholding: [{ period: "Mar 2024", promoter: "50.3", fii: "21.2", dii: "15.1", public: "13.4" }],
  corporateActions: [{ type: "dividend", date: "2024-08-01", description: "Final dividend" }],
  checklist: [{ label: "Debt manageable", evidence: "Debt to equity below 0.5" }],
};

describe("StockEdgeMapper", () => {
  it("normalizes important financial row synonyms", () => {
    expect(normalizeFinancialRowKey("Sales")).toBe("revenue");
    expect(normalizeFinancialRowKey("Profit After Tax")).toBe("net_profit");
    expect(normalizeFinancialRowKey("Borrowings")).toBe("debt");
  });

  it("maps a full wrapper payload into canonical StockStory layers", () => {
    const snapshot = mapCanonicalSnapshot("RELIANCE", fixture);

    expect(snapshot.symbol).toBe("RELIANCE");
    expect(snapshot.profile?.companyName).toBe("Reliance Industries Ltd");
    expect(snapshot.price?.price).toBe(2900.5);
    expect(snapshot.technicals?.rsi).toBe(58.2);
    expect(snapshot.fundamentals?.peRatio).toBe(27.4);
    expect(snapshot.financialTables).toHaveLength(1);
    expect(snapshot.financialTables[0].rows[0].normalizedKey).toBe("revenue");
    expect(snapshot.ownership[0].promoter).toBe(50.3);
    expect(snapshot.corporateActions[0].type).toBe("dividend");
    expect(snapshot.screenerSignals[0].status).toBe("neutral");
    expect(snapshot.rawStructuralKeys).toContain("profile");
  });

  it("builds Prediction Engine input without fake values", () => {
    const snapshot = mapCanonicalSnapshot("RELIANCE", fixture);
    const input = buildStockEdgePredictionInput(snapshot);

    expect(input.symbol).toBe("RELIANCE");
    expect(input.activeFieldCount).toBeGreaterThan(10);
    expect(input.valuation.peRatio).toBe(27.4);
    expect(input.technicals.rsi).toBe(58.2);
    expect(input.missingFields).not.toContain("valuation");
  });

  it("keeps missing data missing instead of zero-filling", () => {
    const snapshot = mapCanonicalSnapshot("TCS", { fundamentals: { pe: "-" }, technicals: {} });
    const input = buildStockEdgePredictionInput(snapshot);

    expect(snapshot.fundamentals?.peRatio).toBeUndefined();
    expect(input.valuation.peRatio).toBeUndefined();
    expect(input.activeFieldCount).toBe(0);
    expect(input.missingFields).toContain("valuation");
  });
});
