import { describe, it, expect } from "vitest";
import { mapToMarketLivePrice, mapToProfile, mapToFundamentals, mapToFinancialTable, mapToShareholding, buildFactorInputFromSnapshot } from "../IndianApiMapper";

describe("IndianApiMapper", () => {
  describe("mapToMarketLivePrice", () => {
    it("maps full price payload", () => {
      const raw = {
        symbol: "RELIANCE", last_price: 2500, previous_close: 2480,
        open: 2490, high: 2520, low: 2485, change: 20, change_percent: 0.81,
        volume: 5000000, week_52_high: 2600, week_52_low: 2200,
        market_cap: 1500000000000, exchange: "NSE",
      };
      const result = mapToMarketLivePrice(raw);
      expect(result.symbol).toBe("RELIANCE");
      expect(result.price).toBe(2500);
      expect(result.previousClose).toBe(2480);
      expect(result.changePercent).toBe(0.81);
      expect(result.volume).toBe(5000000);
      expect(result.week52High).toBe(2600);
      expect(result.week52Low).toBe(2200);
      expect(result.marketCap).toBe(1500000000000);
      expect(result.exchange).toBe("NSE");
      expect(result.currency).toBe("INR");
      expect(result.halted).toBe(false);
      expect(result.delisted).toBe(false);
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

    it("parses Indian number strings", () => {
      const raw = { last_price: "₹2,500.50" };
      const result = mapToMarketLivePrice(raw);
      expect(result.price).toBe(2500.50);
    });

    it("flags halted symbols", () => {
      const raw = { halted: true, last_price: 100 };
      const result = mapToMarketLivePrice(raw);
      expect(result.halted).toBe(true);
    });

    it("no NaN/Infinity in output", () => {
      const result = mapToMarketLivePrice({ last_price: "invalid" });
      expect(result.price).toBeNull();
      expect(Number.isFinite(result.price)).toBe(false);
    });
  });

  describe("mapToProfile", () => {
    it("maps full profile payload", () => {
      const raw = {
        symbol: "RELIANCE", company_name: "Reliance Industries Ltd",
        sector: "Energy & Oil", industry: "Oil & Gas",
        nse_ticker: "RELIANCE", isin: "INE002A01018",
        website: "https://ril.com", market_cap: 1500000000000,
      };
      const result = mapToProfile(raw);
      expect(result.companyName).toBe("Reliance Industries Ltd");
      expect(result.sector).toBe("Energy & Oil");
      expect(result.isin).toBe("INE002A01018");
      expect(result.dataState).toBe("available");
    });

    it("handles missing profile fields", () => {
      const result = mapToProfile({});
      expect(result.companyName).toBe("Unidentified security");
      expect(result.dataState).toBe("partial");
    });
  });

  describe("mapToFundamentals", () => {
    it("maps full fundamental payload", () => {
      const raw = {
        pe_ratio: 22.5, pb_ratio: 3.1, roce: 12.5, roe: 15.2,
        debt_to_equity: 0.45, dividend_yield: 0.8, eps: 85,
        sales_growth: 0.12, operating_margin: 0.25, net_margin: 0.18,
      };
      const result = mapToFundamentals(raw);
      expect(result.peRatio).toBe(22.5);
      expect(result.roe).toBe(15.2);
      expect(result.debtToEquity).toBe(0.45);
      expect(result.operatingMargin).toBe(0.25);
      expect(result.dataState).toBe("available");
    });

    it("handles missing fundamentals", () => {
      const result = mapToFundamentals({});
      expect(result.peRatio).toBeNull();
      expect(result.dataState).toBe("partial");
    });

    it("accepts alternative key names", () => {
      const raw = { pe: 20, "debt/equity": 0.5, revenue_growth: 0.15, profit_growth: 0.1 };
      const result = mapToFundamentals(raw);
      expect(result.peRatio).toBe(20);
      expect(result.debtToEquity).toBe(0.5);
      expect(result.salesGrowth).toBe(0.15);
      expect(result.profitGrowth).toBe(0.1);
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
