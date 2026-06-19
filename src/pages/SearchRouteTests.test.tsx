import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { LayoutProvider } from "../context/LayoutContext";
import SearchPage from "./SearchPage";

const renderWithLayout = (ui: React.ReactElement) => render(<LayoutProvider>{ui}</LayoutProvider>);

vi.mock("../services/stocks/StockSearchEngine", () => ({
  StockSearchEngine: {
    search: vi.fn((query: string) =>
      query.toUpperCase().includes("REL")
        ? [
            {
              symbol: "RELIANCE",
              companyName: "Reliance Industries Limited",
              sector: "Energy",
              exchange: "NSE",
              marketCap: { numeric: 0, formatted: "Data unavailable" },
              peRatio: 0,
              fiftyTwoWeekRange: { low: 0, high: 0, current: 0 },
              healthStatus: "stable",
              lastUpdated: "2026-01-01T00:00:00.000Z",
            },
          ]
        : []
    ),
  },
}));

vi.mock("../services/search/RecentSearchStore", () => ({
  RecentSearchStore: {
    getRecent: vi.fn(() => ["RELIANCE", "TCS"]),
    addTicker: vi.fn(),
  },
}));

vi.mock("../services/behavior/UserJourneyEngine", () => ({
  UserJourneyEngine: {
    trackEvent: vi.fn(),
  },
}));

vi.mock("../architecture/navigation/routeCoordinator", () => ({
  navigateToStock: vi.fn(),
}));

describe("SearchPage routing", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "?page=search&q=REL");
  });

  it("hydrates from the deep-linked q param", () => {
    renderWithLayout(<SearchPage />);

    expect(screen.getByDisplayValue("REL")).toBeTruthy();
    expect(screen.getByText("Reliance Industries Limited")).toBeTruthy();
  });

  it("keeps the browser URL in sync while editing the query", () => {
    renderWithLayout(<SearchPage />);

    const input = screen.getByDisplayValue("REL");
    fireEvent.change(input, { target: { value: "INF" } });

    expect(window.location.search).toContain("page=search");
    expect(window.location.search).toContain("q=INF");
  });
});
