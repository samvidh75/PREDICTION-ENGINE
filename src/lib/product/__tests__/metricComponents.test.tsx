import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { FinancialMetricGrid } from "../../../components/research/FinancialMetricGrid";
import { ValuationContextPanel } from "../../../components/research/ValuationContextPanel";
import type { FinancialMetricGroup, ValuationContext } from "../financialDataModel";

describe("FinancialMetricGrid", () => {
  it("renders limited state for empty groups", () => {
    render(<FinancialMetricGrid groups={[]} />);
    expect(screen.getByText(/financial data is limited/i)).toBeInTheDocument();
  });

  it("renders metric groups with data", () => {
    const groups: FinancialMetricGroup[] = [{
      title: "Profitability & efficiency",
      metrics: [{ label: "ROE", value: 0.18, format: "percent" }],
    }];
    render(<FinancialMetricGrid groups={groups} />);
    expect(screen.getByText("ROE")).toBeInTheDocument();
  });

  it("omits null metrics", () => {
    const groups: FinancialMetricGroup[] = [{
      title: "Valuation",
      metrics: [{ label: "P/E", value: null, format: "ratio" }],
    }];
    render(<FinancialMetricGrid groups={groups} />);
    expect(screen.getByText("P/E")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("ValuationContextPanel", () => {
  const pe20 = { label: "P/E", value: 20, format: "ratio" as const };
  const pb3 = { label: "P/B", value: 3, format: "ratio" as const };
  const ev12 = { label: "EV/EBITDA", value: 12, format: "ratio" as const };
  const div2 = { label: "Div yield", value: 0.02, format: "percent" as const };

  it("renders limited state when no data", () => {
    render(<ValuationContextPanel context={null} />);
    expect(screen.getByText(/valuation context is limited/i)).toBeInTheDocument();
  });

  it("renders PE ratio when available", () => {
    const ctx: ValuationContext = { peRatio: pe20, pbRatio: null, evEbitda: null, dividendYield: null, interpretation: "P/E is within a typical range" };
    render(<ValuationContextPanel context={ctx} />);
    expect(screen.getByText("P/E")).toBeInTheDocument();
  });

  it("renders multiple metrics", () => {
    const ctx: ValuationContext = { peRatio: pe20, pbRatio: pb3, evEbitda: ev12, dividendYield: div2, interpretation: "Valuation context appears moderate" };
    render(<ValuationContextPanel context={ctx} />);
    expect(screen.getByText("P/E")).toBeInTheDocument();
    expect(screen.getByText("P/B")).toBeInTheDocument();
    expect(screen.getByText("EV/EBITDA")).toBeInTheDocument();
    expect(screen.getByText("Div yield")).toBeInTheDocument();
  });

  it("shows interpretation when provided", () => {
    const ctx: ValuationContext = { peRatio: pe20, pbRatio: null, evEbitda: null, dividendYield: null, interpretation: "P/E is within a typical range" };
    render(<ValuationContextPanel context={ctx} />);
    expect(screen.getByText("P/E is within a typical range")).toBeInTheDocument();
  });
});
