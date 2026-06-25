import { describe, it, expect } from "vitest";
import { mapToMarketLivePrice, mapToProfile, mapToFundamentals, mapToFinancialTable, mapToShareholding, buildFactorInputFromSnapshot } from "../IndianApiMapper";

describe("IndianApiMapper", () => {
  describe("mapToMarketLivePrice", () => {
    it("maps from unified response with currentPrice object and keyMetrics", () => {
      const raw = {
        name: "RELIANCE", currentPrice: { NSE: "1318.10", BSE: "1318.25" },
        percentChange: 0.35, yearHigh: 1611.20, yearLow: 1253.65,
        keyMetrics: { priceandVolume: [
          { displayName: "Market Cap", value: "1783926.92" },
          { displayName: "52 week High", value: "1611.80" },
          { displayName: "52 week Low", value: "1253.20" },
        ]},
      };
      const result = mapToMarketLivePrice(raw);
      expect(result.price).toBe(1318.10);
      expect(result.changePercent).toBe(0.35);
      expect(result.dataState).toBe("available");
    });

    it("handles empty payload", () => {
      const result = mapToMarketLivePrice({});
      expect(result.price).toBeNull();
      expect(result.dataState).toBe("partial");
    });

    it("handles null payload", () => {
      const result = mapToMarketLivePrice(null);
      expect(result.price).toBeNull();
    });

    it("parses Indian number strings from currentPrice object", () => {
      const raw = { currentPrice: { NSE: "₹1,318.10" } };
      const result = mapToMarketLivePrice(raw);
      expect(result.price).toBe(1318.10);
    });

    it("no NaN/Infinity in output", () => {
      const result = mapToMarketLivePrice({ currentPrice: "invalid" });
      expect(result.price).toBeNull();
    });
  });

  describe("mapToProfile", () => {
    it("maps from unified response", () => {
      const raw = {
        companyName: "Reliance Industries", industry: "Oil & Gas Operations",
        companyProfile: "Reliance is a conglomerate...",
      };
      const result = mapToProfile(raw);
      expect(result.companyName).toBe("Reliance Industries");
      expect(result.sector).toBe("Oil & Gas Operations");
      expect(result.industry).toBe("Oil & Gas Operations");
      expect(result.description).toBe("Reliance is a conglomerate...");
      expect(result.dataState).toBe("available");
    });

    it("handles missing profile fields", () => {
      const result = mapToProfile({});
      expect(result.companyName).toBe("Unidentified security");
      expect(result.dataState).toBe("partial");
    });
  });

  describe("mapToFundamentals", () => {
    it("maps from unified response with keyMetrics", () => {
      const raw = {
        keyMetrics: {
          valuation: [
            { displayName: "P/E excluding extraordinary items, most recent fiscal year", value: "22.01" },
            { displayName: "Price to Book - most recent fiscal year", value: "1.97" },
            { displayName: "Current Dividend Yield - Common Stock Primary Issue, LTM", value: "0.46" },
          ],
          persharedata: [
            { displayName: "EPS including extraordinary items - trailing 12 month", value: "59.69" },
            { displayName: "Book value per share - most recent fiscal year", value: "668.04" },
          ],
          mgmtEffectiveness: [
            { displayName: "Return on average equity - 5 year average", value: "8.78" },
          ],
          financialstrength: [
            { displayName: "Total debt/total equity - most recent fiscal year", value: "0.44" },
            { displayName: "Current ratio - most recent fiscal year", value: "1.10" },
          ],
        },
      };
      const result = mapToFundamentals(raw);
      expect(result.peRatio).toBe(22.01);
      expect(result.pbRatio).toBe(1.97);
      expect(result.roe).toBe(8.78);
      expect(result.eps).toBe(59.69);
      expect(result.bookValue).toBe(668.04);
      expect(result.dividendYield).toBe(0.46);
      expect(result.debtToEquity).toBe(0.44);
      expect(result.currentRatio).toBe(1.10);
      expect(result.dataState).toBe("available");
    });

    it("handles missing fundamentals", () => {
      const result = mapToFundamentals({});
      expect(result.peRatio).toBeNull();
      expect(result.dataState).toBe("partial");
    });
  });

  describe("mapToFinancialTable", () => {
    it("maps quarterly results rows", () => {
      const raw = {
        symbol: "RELIANCE",
        quarterly_results: [
          { period: "Mar 2024", sales: 50000, expenses: 40000, profit: 10000 },
          { period: "Dec 2023", sales: 48000, expenses: 39000, profit: 9000 },
        ],
      };
      const result = mapToFinancialTable(raw);
      expect(result.periodType).toBe("quarterly");
      expect(result.periods.length).toBe(2);
      expect(result.rows.length).toBe(3);
      expect(result.dataState).toBe("available");
    });

    it("handles empty quarterly results", () => {
      const result = mapToFinancialTable({ symbol: "RELIANCE" });
      expect(result.rows.length).toBe(0);
      expect(result.dataState).toBe("partial");
    });
  });

  describe("mapToShareholding", () => {
    it("maps shareholding trend data", () => {
      const raw = {
        symbol: "RELIANCE",
        shareholding_pattern: [
          { period: "Mar 2024", promoter: 50, fii: 25, dii: 15, public_: 10 },
        ],
      };
      const result = mapToShareholding(raw);
      expect(result.snapshots.length).toBe(1);
      expect(result.snapshots[0].promoter).toBe(50);
      expect(result.snapshots[0].fii).toBe(25);
      expect(result.dataState).toBe("available");
    });

    it("handles missing shareholding", () => {
      const result = mapToShareholding({});
      expect(result.snapshots.length).toBe(0);
      expect(result.dataState).toBe("partial");
    });
  });

  describe("buildFactorInputFromSnapshot", () => {
    it("maps snapshot fields to factor input format", () => {
      const result = buildFactorInputFromSnapshot({
        fundamentals: { peRatio: 22, pbRatio: 3, roe: 15, debtToEquity: 0.5, dividendYield: 0.8, eps: 85, bookValue: 500, salesGrowth: 0.12, profitGrowth: 0.1, operatingMargin: 0.25, netMargin: 0.18, currentRatio: 1.5, interestCoverage: 5 },
        price: { price: 2500, marketCap: 1500000000000, volume: 5000000, week52High: 2600, week52Low: 2200 },
        profile: { marketCap: 1500000000000 },
      } as any);
      expect(result.pe_ratio).toBe(22);
      expect(result.return_on_equity).toBe(15);
      expect(result.debt_to_equity).toBe(0.5);
      expect(result.price).toBe(2500);
      expect(result.market_cap).toBe(1500000000000);
    });

    it("handles null inputs", () => {
      const result = buildFactorInputFromSnapshot({ fundamentals: null, price: null, profile: null });
      expect(result.pe_ratio).toBeNull();
    });

    it("no NaN/Infinity in output", () => {
      const result = buildFactorInputFromSnapshot({ fundamentals: null, price: null, profile: null });
      expect(result.pe_ratio).toBeNull();
    });
  });
});
