import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import StockPage from "../StockPage";

vi.mock("../../components/edge-ai/EdgeAiChatSection", () => ({
  EdgeAiChatSection: () => null,
}));

vi.mock("../../components/NativeAd", () => ({
  NativeAd: () => null,
}));

vi.mock("../../services/llm/AIAnalysisService", () => ({
  generateStockAnalysis: vi.fn().mockResolvedValue(null),
  fallbackAnalysis: vi.fn().mockReturnValue(null),
}));

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
  class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/stock/TCS"]}>
        <Routes>
          <Route path="/stock/:symbol" element={<StockPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function buildStockPayload() {
  return {
    symbol: "TCS",
    companyName: "Tata Consultancy Services",
    exchange: "NSE" as const,
    sector: "Technology",
    industry: "IT Services",
    price: { current: 4020, changeAbs: 18, changePercent: 0.45, marketCap: 1450000 },
    fundamentals: {
      pe: 29.4,
      industryPe: 31.2,
      pb: 12.1,
      dividendYield: 1.2,
      eps: 136.7,
      high52w: 4280,
      low52w: 3310,
    },
    roe: 48.2,
    debtToEquity: 0.08,
    revenueGrowth: 8.4,
    profitGrowth: 9.1,
    rsi: 54.3,
    scores: {
      quality: 84,
      valuation: 61,
      growth: 72,
      momentum: 58,
      risk: 43,
      health: 78,
      riskAdjusted: 74,
    },
    confidenceMeter: 76,
    timeline: [
      { day: "Mon", health: 74 },
      { day: "Tue", health: 75 },
      { day: "Wed", health: 76 },
      { day: "Thu", health: 77 },
      { day: "Fri", health: 78 },
    ],
    whatChanged: ["Margin discipline improved this quarter."],
    sectorRelative: [
      { label: "PE", company: "29.4", sectorMedian: "31.2" },
      { label: "ROE", company: "48.2%", sectorMedian: "22.4%" },
    ],
    sectorComparison: [
      { company: "TCS", value: "29.4x", percentile: 58, metric: "PE" },
      { company: "Sector", value: "31.2x", percentile: 50, metric: "PE" },
    ],
    description: "TCS is tracked for business quality, valuation context, conviction, and risk.",
    companyProfile: {
      founded: "1968",
      ceo: "K Krithivasan",
      hq: "Mumbai, India",
      employees: "600000",
      website: "https://www.tcs.com",
      isin: "INE467B01029",
      businessSegments: ["IT Services", "Consulting", "Platforms"],
    },
    financials: {
      annual: {
        revenue: [{ period: "FY24", value: 240000 }],
        profit: [{ period: "FY24", value: 46000 }],
        ebitda: [{ period: "FY24", value: 62000 }],
      },
      quarterly: {
        revenue: [{ period: "Q4 FY24", value: 61000 }],
        profit: [{ period: "Q4 FY24", value: 11800 }],
        ebitda: [{ period: "Q4 FY24", value: 15800 }],
      },
    },
    shareholding: [
      {
        period: "Mar 2025",
        promoter: 72.4,
        fii: 14.1,
        dii: 8.7,
        retail: 4.8,
        deltas: { promoter: 0, fii: 0.2, dii: -0.1, retail: -0.1 },
      },
    ],
    shareholdings: [
      {
        period: "Mar 2025",
        promoter: 72.4,
        fii: 14.1,
        dii: 8.7,
        retail: 4.8,
        deltas: { promoter: 0, fii: 0.2, dii: -0.1, retail: -0.1 },
      },
    ],
    news: [
      { headline: "TCS reports steady deal wins", source: "Research Desk", time: "1h ago" },
      { headline: "Margin mix improves sequentially", source: "Research Desk", time: "3h ago" },
    ],
    thesis: {
      thesis: "Execution remains resilient with healthy large-deal momentum.",
      bullCase: "Margin mix and client retention continue to support Research and Conviction.",
      bearCase: "Slower discretionary demand could delay conversion.",
      whatToWatch: "Order book cadence and BFSI client spending.",
      stance: "High conviction" as const,
    },
    priceHistory: {
      "1W": [{ label: "Mon", price: 3980 }, { label: "Fri", price: 4020 }],
      "1M": [{ label: "Week 1", price: 3900 }, { label: "Week 4", price: 4020 }],
      "3M": [{ label: "Jan", price: 3810 }, { label: "Mar", price: 4020 }],
      "1Y": [{ label: "2025", price: 4020 }],
      "5Y": [{ label: "2021", price: 3200 }, { label: "2026", price: 4020 }],
    },
  };
}

describe("StockDetailPage", () => {
  it("renders a single research summary panel without duplicate labels", async () => {
    const stock = buildStockPayload();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => stock,
    }));
    renderPage();

    expect(await screen.findByText(/Research summary/i)).toBeTruthy();
    expect(screen.queryByText(/AI explanation/i)).toBeNull();
    expect(screen.queryByText(/Research context only\. Not a recommendation\./i)).toBeNull();
  });
});
