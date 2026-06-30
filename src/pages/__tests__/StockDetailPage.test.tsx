import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import StockPage from "../StockPage";
import { getStockResearch } from "../../lib/stockResearch";

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
  vi.stubGlobal("IntersectionObserver", vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })));
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

describe("StockDetailPage", () => {
  it("renders explanation panel without breaking healthometer context", async () => {
    const stock = getStockResearch("TCS");
    expect(stock).toBeTruthy();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stock,
        financialChartData: stock?.financials?.annual?.revenue ?? [],
        shareholding: stock?.shareholding ?? [],
        shareholdingSeries: stock?.shareholding ?? [],
        period: "Sep 2025",
      }),
    }));
    renderPage();

    expect(await screen.findAllByText(/AI explanation/i)).toHaveLength(2);
    expect(screen.getAllByText(/Research context only\. Not a recommendation\./i).length).toBeGreaterThan(0);
  });
});
