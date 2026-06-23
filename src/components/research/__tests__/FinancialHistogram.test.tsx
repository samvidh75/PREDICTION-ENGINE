import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FinancialHistogram from "../FinancialHistogram";

describe("FinancialHistogram", () => {
  it("renders loading state", () => {
    const { container } = render(<FinancialHistogram series={[]} loading />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows empty state when no data", () => {
    render(<FinancialHistogram series={[]} />);
    const headings = screen.getAllByText(/being prepared/i);
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders metric tabs", () => {
    render(<FinancialHistogram series={[]} />);
    expect(screen.getByText("Revenue")).toBeTruthy();
    expect(screen.getByText("PAT / Net Profit")).toBeTruthy();
    expect(screen.getByText("EBITDA")).toBeTruthy();
  });

  it("renders chart bars when data exists", () => {
    const series = [
      {
        metric: "revenue" as const,
        label: "Revenue",
        points: [
          { period: "FY22", value: 1000 },
          { period: "FY23", value: 1200 },
          { period: "FY24", value: 1400 },
        ],
      },
    ];
    const { container } = render(<FinancialHistogram series={series} />);
    expect(screen.getByText("₹14Cr")).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelector('rect')).toBeTruthy();
    expect(container.querySelectorAll("g").length).toBeGreaterThanOrEqual(3);
  });

  it("handles missing values without creating fake bars", () => {
    const series = [
      {
        metric: "revenue" as const,
        label: "Revenue",
        points: [
          { period: "FY22", value: null },
          { period: "FY23", value: null },
        ],
      },
    ];
    const { container } = render(<FinancialHistogram series={series} />);
    expect(screen.getByText(/being prepared/i)).toBeTruthy();
  });

  it("selects first metric by default", () => {
    const series = [
      {
        metric: "revenue" as const,
        label: "Revenue",
        points: [{ period: "FY24", value: 1000 }],
      },
    ];
    render(<FinancialHistogram series={series} />);
    const revenueTab = screen.getByText("Revenue");
    expect(revenueTab.getAttribute("aria-selected")).toBe("true");
  });
});
