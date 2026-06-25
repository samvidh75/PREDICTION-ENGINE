import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StockResearchPage from "../StockResearchPage";

vi.mock("../../hooks/useStockData", () => ({
  useStockData: vi.fn(),
}));

import { useStockData } from "../../hooks/useStockData";

const mockFullData = {
  symbol: "TCS",
  price: {
    current: 3890.5,
    change: 45.2,
    changeAbs: 1.18,
    open: 3850.0,
    high: 3910.0,
    low: 3845.0,
    volume: 2500000,
    weekHigh52: 4200.0,
    weekLow52: 3200.0,
    marketCap: 14000000000000,
    exchange: "NSE",
    companyName: "Tata Consultancy Services",
    sector: "Technology",
    error: null,
  },
  fundamentals: {
    peRatio: 28.5,
    pbRatio: 12.3,
    roe: 38.2,
    roce: 45.1,
    dividendYield: 1.2,
    eps: 142.5,
    debtToEquity: 0.05,
    currentRatio: 2.8,
    revenueGrowth: 12.5,
    profitGrowth: 10.2,
    marketCap: 14000000000000,
    error: null,
  },
  historical: {
    closes: [3800, 3820, 3850, 3880, 3890],
    highs: [3810, 3830, 3860, 3890, 3910],
    lows: [3790, 3810, 3840, 3870, 3880],
    timestamps: [1700000000, 1700086400, 1700172800, 1700259200, 1700345600],
    error: null,
  },
  dataCompleteness: 0.85,
  fetchedAt: new Date().toISOString(),
  errors: [],
};

const mockPartialData = {
  ...mockFullData,
  price: {
    ...mockFullData.price,
    sector: null,
  },
  fundamentals: {
    ...mockFullData.fundamentals,
    peRatio: null,
    roe: null,
    roce: null,
    dividendYield: null,
    eps: null,
    debtToEquity: null,
    currentRatio: null,
    revenueGrowth: null,
    profitGrowth: null,
  },
  historical: {
    closes: [],
    highs: [],
    lows: [],
    timestamps: [],
    error: null,
  },
};

describe("StockResearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    expect(screen.getByText("TCS")).toBeDefined();
  });

  it("renders error state", () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      loading: false,
      error: "Failed to fetch",
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    expect(screen.getByText("Market data is temporarily unavailable")).toBeDefined();
    expect(screen.getByText("Retry")).toBeDefined();
  });

  it("renders company header section", async () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText("Tata Consultancy Services")).toBeDefined();
    });
    expect(screen.getByText("TCS")).toBeDefined();
  });

  it("renders Healthometer section", async () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText("Healthometer")).toBeDefined();
    });
  });

  it("renders price chart section", async () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      const intervals = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "MAX"];
      intervals.forEach((interval) => {
        expect(screen.getByText(interval)).toBeDefined();
      });
    });
  });

  it("renders Key Metrics section", async () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText("Key Metrics")).toBeDefined();
    });
  });

  it("renders company details section", async () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText(/About/)).toBeDefined();
    });
  });

  it("renders Financial Performance section", async () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText("Financial Performance")).toBeDefined();
    });
  });

  it("renders News & Updates section", async () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText("News & Updates")).toBeDefined();
    });
  });

  it("renders light background instead of dark", () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<StockResearchPage symbol="TCS" />);
    const outerDiv = container.firstChild as HTMLElement;
    const bg = outerDiv.style.background || outerDiv.style.backgroundColor || "";
    const isLight = !bg.includes("0, 0, 0") && !bg.includes("#000") && !bg.includes("black") && !bg.includes("rgb(0");
    expect(isLight).toBe(true);
  });

  it("renders Actions section on desktop", async () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText("Actions")).toBeDefined();
      expect(screen.getByText("Track")).toBeDefined();
    });
  });

  it("handles partial data without crashing", () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockPartialData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<StockResearchPage symbol="TCS" />);
    expect(container.querySelector('[style*="background: rgb(247, 248, 250)"]')).toBeTruthy();
    const text = container.textContent || "";
    expect(text).toContain("Tata Consultancy Services");
  });

  it("does not contain provider/API wording in UI", async () => {
    (useStockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockFullData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<StockResearchPage symbol="TCS" />);
    await waitFor(() => {
      expect(screen.getByText("Tata Consultancy Services")).toBeDefined();
    });
    const body = document.body.textContent || "";
    expect(body).not.toContain("Provider");
    expect(body).not.toContain("API");
    expect(body).not.toContain("Backend");
    expect(body).not.toContain("Screener");
  });
});
