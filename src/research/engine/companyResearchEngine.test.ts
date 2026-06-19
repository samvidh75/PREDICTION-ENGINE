import { describe, expect, it } from "vitest";
import { buildCompanyResearch } from "./companyResearchEngine";
import type { CompanyResearchInput } from "./companyResearchEngine";

const baseInput: CompanyResearchInput = {
  symbol: "TCS",
  companyName: "Tata Consultancy Services",
  sector: "IT",
  industry: "Software",
  fundamentals: {
    symbol: "TCS", peRatio: 28, pbRatio: 8, evEbitda: 22, dividendYield: 1.2,
    eps: 120, bookValue: 400, roe: 35, roa: 18, roic: 30,
    debtToEquity: 0.1, currentRatio: 2.5, grossMargin: 45, operatingMargin: 25,
    netMargin: 20, revenueGrowth: 12, profitGrowth: 10, epsGrowth: 11,
    sales: 200000, netProfit: 45000, operatingProfit: 55000,
    totalAssets: 150000, totalDebt: 15000, equity: 120000,
    cashFlow: 40000, freeCashFlow: 35000,
    timestamp: "2024-01-01", sourceSuccess: true,
  },
  quote: { lastPrice: 3500, change: 25, changePercent: 0.72, open: 3480, high: 3520, low: 3470, close: 3500, volume: 1000000, marketCap: 13000000, week52High: 3800, week52Low: 3000, dayRange: "3470-3520" },
  candles: [{ date: "2024-01-01", close: 3400, high: 3420, low: 3380, open: 3390, volume: 900000 }, { date: "2024-01-02", close: 3450, high: 3460, low: 3430, open: 3440, volume: 850000 }, { date: "2024-01-03", close: 3480, high: 3490, low: 3460, open: 3470, volume: 950000 }, { date: "2024-01-04", close: 3500, high: 3520, low: 3480, open: 3490, volume: 1000000 }, { date: "2024-01-05", close: 3520, high: 3530, low: 3500, open: 3510, volume: 1100000 }],
  relativeStrength: 65,
  beta: 0.8,
  priorThesisStatus: null,
};

describe("buildCompanyResearch", () => {
  it("produces complete research output for valid inputs", () => {
    const r = buildCompanyResearch(baseInput);
    expect(r.profile.symbol).toBe("TCS");
    expect(r.quote.lastPrice).toBe(3500);
    expect(r.fundamentals.peRatio).toBe(28);
    expect(r.factorScores.convictionScore).not.toBeNull();
    expect(r.thesis.status).toBeTruthy();
    expect(r.history.dataPoints).toBe(5);
  });

  it("handles null fundamentals gracefully", () => {
    const input = { ...baseInput, fundamentals: null };
    const r = buildCompanyResearch(input);
    expect(r.fundamentals.peRatio).toBeNull();
    expect(r.factorScores.qualityScore).toBeNull();
  });

  it("handles null quote gracefully", () => {
    const input = { ...baseInput, quote: null };
    const r = buildCompanyResearch(input);
    expect(r.quote.lastPrice).toBeNull();
  });

  it("no Buy/Sell/backend/provider wording in output", () => {
    const r = buildCompanyResearch(baseInput);
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/buy|sell|hold|strong buy|target price|guaranteed|multibagger|provider|backend|source|diagnostic/i);
  });

  it("produces invest context", () => {
    const r = buildCompanyResearch(baseInput);
    expect(r.investContext.symbol).toBe("TCS");
    expect(r.investContext.whatToWatch.length).toBeGreaterThan(0);
  });
});
