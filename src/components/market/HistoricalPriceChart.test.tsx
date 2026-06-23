import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HistoricalPriceChart from "./HistoricalPriceChart";

const points = Array.from({ length: 90 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
  close: 100 + index,
  high: 102 + index,
  low: 98 + index,
  volume: 1_000_000 + index,
}));

describe("HistoricalPriceChart", () => {
  it("renders real daily observations with an accessible chart label", () => {
    render(<HistoricalPriceChart symbol="RELIANCE" points={points} />);
    expect(screen.getByRole("img", { name: /RELIANCE 6M daily closing-price chart/i })).toBeInTheDocument();
    expect(screen.getByText(/daily close/i)).toBeInTheDocument();
  });

  it("changes the visible daily range without fabricating observations", () => {
    render(<HistoricalPriceChart symbol="RELIANCE" points={points} />);
    fireEvent.click(screen.getByRole("button", { name: "1M" }));
    expect(screen.getByRole("button", { name: "1M" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: /RELIANCE 1M daily closing-price chart/i })).toBeInTheDocument();
  });

  it("shows an honest empty state when history is insufficient", () => {
    render(<HistoricalPriceChart symbol="RELIANCE" points={[]} />);
    expect(screen.getByText(/Price history is being prepared/i)).toBeInTheDocument();
  });
});
