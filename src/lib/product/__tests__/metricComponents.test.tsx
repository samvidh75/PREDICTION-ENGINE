import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { FinancialMetricGrid } from "../../../components/research/FinancialMetricGrid";
import { ValuationContextPanel } from "../../../components/research/ValuationContextPanel";
import type { FinancialMetricGroup } from "../financialDataModel";

describe("FinancialMetricGrid", () => {
  it("renders limited state for empty groups", () => {
    render(<FinancialMetricGrid groups={[]} />);
    expect(screen.getByText(/financial data is limited/i)).toBeInTheDocument();
  });

  it("renders metric groups with data", () => {
    const groups: FinancialMetricGroup[] = [{
      title: "Profitability & efficiency",
      metrics: [{ label: "ROE", value: 0.18, unit: "percent", interpretation: "ROE indicates efficient capital use", isPositive: true }],
    }];
    render(<FinancialMetricGrid groups={groups} />);
    expect(screen.getByText("ROE")).toBeInTheDocument();
  });

  it("omits null metrics", () => {
    const groups: FinancialMetricGroup[] = [{
      title: "Valuation",
      metrics: [{ label: "P/E", value: null, unit: "multiple", interpretation: null, isPositive: null }],
    }];
    render(<FinancialMetricGrid groups={groups} />);
    expect(screen.getByText("P/E")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("ValuationContextPanel", () => {
  it("renders limited state when no data", () => {
    render(<ValuationContextPanel interpretation={null} peRatio={null} pbRatio={null} evEbitda={null} dividendYield={null} />);
    expect(screen.getByText(/valuation context is limited/i)).toBeInTheDocument();
  });

  it("renders PE ratio when available", () => {
    render(<ValuationContextPanel interpretation="P/E is within a typical range" peRatio={20} pbRatio={null} evEbitda={null} dividendYield={null} />);
    expect(screen.getByText("P/E")).toBeInTheDocument();
    expect(screen.getByText("20.00")).toBeInTheDocument();
  });

  it("renders multiple metrics", () => {
    render(<ValuationContextPanel interpretation="Valuation context appears moderate" peRatio={20} pbRatio={3} evEbitda={12} dividendYield={0.02} />);
    expect(screen.getByText("P/E")).toBeInTheDocument();
    expect(screen.getByText("P/B")).toBeInTheDocument();
    expect(screen.getByText("EV/EBITDA")).toBeInTheDocument();
    expect(screen.getByText("Div yield")).toBeInTheDocument();
  });

  it("shows interpretation when provided", () => {
    render(<ValuationContextPanel interpretation="P/E is within a typical range" peRatio={20} pbRatio={null} evEbitda={null} dividendYield={null} />);
    expect(screen.getByText("P/E is within a typical range")).toBeInTheDocument();
  });
});
