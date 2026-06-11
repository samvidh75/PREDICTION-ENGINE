import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  clearStockStoryResponseCacheForTests,
  makeStockStoryCacheKey,
  StockStoryPage,
  SUPPORTED_PREDICTION_HORIZONS,
} from "./StockStoryPage";

vi.mock("../architecture/navigation/routeCoordinator", () => ({
  navigateToStock: vi.fn(),
}));

vi.mock("../hooks/useLiveQuotes", () => ({
  formatINR: (value?: number | null) => typeof value === "number" ? `Rs ${value.toFixed(2)}` : "Unavailable",
  formatPercent: (value?: number | null) => typeof value === "number" ? `${value.toFixed(2)}%` : "Unavailable",
  useLiveQuote: vi.fn(() => ({ quote: null, loading: false, error: null })),
}));

vi.mock("../services/portfolio/NoteEngine", () => ({
  NoteEngine: {
    getNote: vi.fn(() => ({ note: "" })),
    saveNote: vi.fn(),
  },
}));

vi.mock("../services/portfolio/WatchlistEngine", () => ({
  WatchlistEngine: {
    getWatchlists: vi.fn(() => [{ id: "default", tickers: [] }]),
    addTicker: vi.fn(),
    removeTicker: vi.fn(),
  },
}));

vi.mock("../services/search/RecentSearchStore", () => ({
  RecentSearchStore: {
    addTicker: vi.fn(),
  },
}));

vi.mock("../services/stocks/StockRegistry", () => ({
  StockRegistry: {
    getStock: vi.fn((ticker: string) => ({ symbol: ticker, companyName: `${ticker} Limited`, sector: "IT" })),
    getAllStocks: vi.fn(() => []),
  },
}));

vi.mock("../components/intelligence/WhyItChangedTab", () => ({
  default: ({ symbol, horizon }: { symbol: string; horizon: number }) => (
    <div data-testid="why-horizon">{symbol}:{horizon}</div>
  ),
}));

function stockStoryEnvelope(horizon: number) {
  return {
    status: "ok",
    dataState: { availability: "available" },
    data: {
      symbol: "TCS",
      predictionDate: "2026-06-10",
      predictionHorizon: horizon,
      rankingScore: horizon === 90 ? 91 : 70 + horizon / 10,
      healthScore: horizon === 90 ? 91 : 70 + horizon / 10,
      classification: horizon === 90 ? "Excellent" : "Healthy",
      confidence: { level: horizon === 90 ? "Very High" : "High", score: 80, source: "prediction_registry", snapshotDate: "2026-06-10" },
      confidenceLevel: horizon === 90 ? "Very High" : "High",
      confidenceScore: 80,
      narrative: `Horizon ${horizon} analysis`,
      factors: {
        growth: { score: 70, source: "prediction_registry", snapshotDate: "2026-06-10" },
        quality: { score: 71, source: "prediction_registry", snapshotDate: "2026-06-10" },
        stability: { score: null, source: "prediction_registry", snapshotDate: "2026-06-10" },
        value: { score: 72, source: "prediction_registry", snapshotDate: "2026-06-10" },
        momentum: { score: 73, source: "prediction_registry", snapshotDate: "2026-06-10" },
        risk: { score: 30, source: "prediction_registry", snapshotDate: "2026-06-10" },
      },
    },
  };
}

function installFetch(metadata: Record<string, unknown> = { companyName: "TCS Limited", sector: "IT", industry: "Software", exchange: "BSE", currency: "INR" }) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.startsWith("/api/market-data/metadata/")) {
      return { ok: true, json: vi.fn().mockResolvedValue(metadata) } as unknown as Response;
    }
    if (url.startsWith("/api/stockstory/")) {
      const horizon = Number(new URL(url, "https://example.test").searchParams.get("horizon"));
      return { ok: true, json: vi.fn().mockResolvedValue(stockStoryEnvelope(horizon)) } as unknown as Response;
    }
    if (url.includes("/ownership")) {
      return { ok: true, json: vi.fn().mockResolvedValue(null) } as unknown as Response;
    }
    if (url.includes("/timeline")) {
      return { ok: true, json: vi.fn().mockResolvedValue([]) } as unknown as Response;
    }
    return { ok: false, json: vi.fn().mockResolvedValue({}) } as unknown as Response;
  }));
  return calls;
}

describe("StockStoryPage horizon and exchange honesty", () => {
  beforeEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    clearStockStoryResponseCacheForTests();
    window.history.replaceState({}, "", "?page=stock&id=TCS");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each(SUPPORTED_PREDICTION_HORIZONS)("requests supported horizon %s explicitly", async (horizon) => {
    window.history.replaceState({}, "", `?page=stock&id=TCS&horizon=${horizon}`);
    const calls = installFetch();

    render(<StockStoryPage />);

    await screen.findByText(`Horizon ${horizon} analysis`);
    expect(calls.some(url => url === `/api/stockstory/TCS?horizon=${horizon}`)).toBe(true);
  });

  it("changing horizon updates URL and visible analysis", async () => {
    const calls = installFetch();
    render(<StockStoryPage />);

    await screen.findByText("Horizon 30 analysis");
    fireEvent.click(screen.getByRole("button", { name: "90 days" }));

    await screen.findByText("Horizon 90 analysis");
    expect(window.location.search).toContain("horizon=90");
    expect(screen.getByText("Excellent")).toBeTruthy();
    expect(calls.some(url => url === "/api/stockstory/TCS?horizon=90")).toBe(true);
  });

  it("passes selected horizon into Why It Changed", async () => {
    window.history.replaceState({}, "", "?page=stock&id=TCS&tab=whychange&horizon=180");
    installFetch();

    render(<StockStoryPage />);

    await screen.findByText("Horizon 180 analysis");
    expect(screen.getByTestId("why-horizon").textContent).toBe("TCS:180");
  });

  it("uses horizon-specific cache keys", () => {
    expect(makeStockStoryCacheKey("TCS", 30)).toBe("stockstory:TCS:horizon:30");
    expect(makeStockStoryCacheKey("TCS", 90)).toBe("stockstory:TCS:horizon:90");
    expect(makeStockStoryCacheKey("TCS", 30)).not.toBe(makeStockStoryCacheKey("TCS", 90));
  });

  it("renders Data unavailable when exchange metadata is missing", async () => {
    installFetch({ companyName: "TCS Limited", sector: "IT", industry: "Software", currency: "INR" });

    render(<StockStoryPage />);

    await screen.findByText("Horizon 30 analysis");
    expect(screen.getAllByText("Data unavailable").length).toBeGreaterThan(0);
    expect(screen.queryByText("NSE")).toBeNull();
  });
});
