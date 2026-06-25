import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StockResearchPage from "../StockResearchPage";

vi.mock("../../hooks/useStockData", () => ({
  useStockData: vi.fn(),
}));

import { useStockData } from "../../hooks/useStockData";

const mockFullData = {
  symbol: "TCS",
  price: {
    current: 3890.5, change: 45.2, changeAbs: 1.18,
    open: 3850.0, high: 3910.0, low: 3845.0,
    volume: 2500000, weekHigh52: 4200.0, weekLow52: 3200.0,
    marketCap: 14000000000000, exchange: "NSE",
    companyName: "Tata Consultancy Services", sector: "Technology",
    industry: "IT Services", description: null, website: null, error: null,
  },
  fundamentals: {
    peRatio: 28.5, pbRatio: 12.3, roe: 38.2, roce: 45.1,
    dividendYield: 1.2, eps: 142.5, debtToEquity: 0.05,
    currentRatio: 2.8, revenueGrowth: 12.5, profitGrowth: 10.2,
    marketCap: 14000000000000, error: null,
  },
  health: { score: 75, classification: "Very Healthy", confidence: { level: "High", score: 85 }, sector: "Technology" },
  historical: { closes: [3800, 3820, 3850, 3880, 3890], highs: [3810, 3830, 3860, 3890, 3910], lows: [3790, 3810, 3840, 3870, 3880], timestamps: [1700000000, 1700086400, 1700172800, 1700259200, 1700345600], error: null },
  dataCompleteness: 0.85,
  fetchedAt: new Date().toISOString(),
  errors: [],
};

describe("Part BM Data Reality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData, loading: false, error: null, refetch: vi.fn(),
    });
  });

  it("renders price without NaN or undefined", async () => {
    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      const body = document.body.textContent || "";
      expect(body).not.toMatch(/NaN/);
      expect(body).not.toMatch(/undefined/);
      expect(body).not.toMatch(/null/);
      expect(body).not.toMatch(/\[object Object\]/);
    });
  });

  it("renders company name correctly", async () => {
    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText("Tata Consultancy Services")).toBeTruthy();
    });
  });

  it("renders Healthometer section exactly once", async () => {
    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      const healthometers = screen.getAllByText("Healthometer");
      expect(healthometers.length).toBe(1);
    });
  });

  it("renders price chart section", async () => {
    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      const chartContainers = document.querySelectorAll('.recharts-responsive-container');
      expect(chartContainers.length).toBeGreaterThan(0);
    });
  });

  it("renders Key Metrics section", async () => {
    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getAllByText("Key Metrics").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders Financial Performance section", async () => {
    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText("Financial Performance")).toBeDefined();
    });
  });

  it("renders stock detail sections in correct order", async () => {
    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      const body = document.body.textContent || "";
      const healthIndex = body.indexOf("Healthometer");
      const metricsIndex = body.indexOf("Key Metrics");
      const financialIndex = body.indexOf("Financial Performance");
      expect(healthIndex).toBeGreaterThan(0);
      expect(metricsIndex).toBeGreaterThan(healthIndex);
      expect(financialIndex).toBeGreaterThan(metricsIndex);
    });
  });
});
