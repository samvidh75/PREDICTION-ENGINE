import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StockNewsPanel from "../StockNewsPanel";

describe("StockNewsPanel", () => {
  it("renders loading state", () => {
    const { container } = render(<StockNewsPanel items={[]} loading />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows empty state when no news", () => {
    render(<StockNewsPanel items={[]} />);
    expect(screen.getByText(/No major recent story/i)).toBeTruthy();
  });

  it("renders news items", () => {
    const items = [
      {
        id: "1",
        symbol: "RELIANCE",
        headline: "Q3 results exceed expectations",
        publisher: "Financial Times",
        publishedAt: new Date().toISOString(),
        summary: "Revenue grew 15% YoY.",
        whyItMatters: "Indicates strong demand momentum.",
        category: "results" as const,
      },
    ];
    render(<StockNewsPanel items={items} />);
    expect(screen.getByText("Q3 results exceed expectations")).toBeTruthy();
    expect(screen.getByText("Financial Times")).toBeTruthy();
    expect(screen.getByText(/Revenue grew/)).toBeTruthy();
    expect(screen.getByText(/strong demand/)).toBeTruthy();
  });

  it("shows refreshed time when available", () => {
    render(<StockNewsPanel items={[]} refreshedAt={new Date().toISOString()} />);
    expect(screen.getByText(/Refreshed/i)).toBeTruthy();
  });
});
