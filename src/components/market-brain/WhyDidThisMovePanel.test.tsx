// src/components/market-brain/WhyDidThisMovePanel.test.tsx
// Phase 19A-6 — Tests for the standalone WhyDidThisMovePanel.

import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WhyDidThisMovePanel } from "./WhyDidThisMovePanel";
import type { MarketAnomalyEvidencePack } from "../../systems/market-brain/anomalyEvidencePack";

function makePack(overrides: Partial<MarketAnomalyEvidencePack> = {}): MarketAnomalyEvidencePack {
  return {
    symbol: "TCS",
    companyName: null,
    timeframe: "1d",
    anomalyType: "Stock-specific move",
    severity: "High",
    headline: "Price moved significantly relative to sector and index",
    evidence: [
      "Price moved +5.2% over 1d",
      "Volume at 2.8x the 20-day average",
      "Sector moved +0.8% in the same period",
      "Index moved +0.3% in the same period",
    ],
    risksToReview: [],
    whatToWatch: [],
    missingEvidence: [],
    compressedContext: "TCS | Stock-specific move | High | price: +5.2%, volume: 2.8x",
    narrativePromptPayload: JSON.stringify({ type: "stock-specific", severity: "High" }),
    ...overrides,
  };
}

describe("WhyDidThisMovePanel", () => {
  it("renders the anomaly type and severity", () => {
    render(<WhyDidThisMovePanel pack={makePack()} />);
    expect(screen.getByText("Stock-specific move")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders the symbol and timeframe", () => {
    render(<WhyDidThisMovePanel pack={makePack()} />);
    expect(screen.getByText(/· TCS/)).toBeInTheDocument();
    expect(screen.getByText(/1d ·/)).toBeInTheDocument();
  });

  it("renders evidence items", () => {
    render(<WhyDidThisMovePanel pack={makePack()} />);
    expect(screen.getByText(/Price moved \+5\.2%/)).toBeInTheDocument();
    expect(screen.getByText(/Volume at 2\.8x/)).toBeInTheDocument();
  });

  it("renders risks derived from missing evidence when provided", () => {
    const pack = makePack({
      missingEvidence: ["Delivery volume", "Open interest change"],
    });
    render(<WhyDidThisMovePanel pack={pack} />);
    // Missing evidence items are surfaced as risks with "needs more context" suffix
    const items = screen.getAllByText(/— needs more context/);
    expect(items.length).toBe(2);
  });

  it("returns null when pack is null", () => {
    const { container } = render(<WhyDidThisMovePanel pack={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when pack is undefined", () => {
    const { container } = render(<WhyDidThisMovePanel pack={undefined} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders an enhance button when onEnhance is provided", () => {
    const onEnhance = vi.fn();
    render(<WhyDidThisMovePanel pack={makePack()} onEnhance={onEnhance} />);
    expect(screen.getByText("Enhance explanation")).toBeInTheDocument();
  });

  it("does not render enhance button when onEnhance is omitted", () => {
    render(<WhyDidThisMovePanel pack={makePack()} />);
    expect(screen.queryByText("Enhance explanation")).not.toBeInTheDocument();
  });

  it("calls onEnhance when the enhance button is clicked", () => {
    const onEnhance = vi.fn();
    render(<WhyDidThisMovePanel pack={makePack()} onEnhance={onEnhance} />);
    fireEvent.click(screen.getByText("Enhance explanation"));
    expect(onEnhance).toHaveBeenCalledTimes(1);
    expect(onEnhance).toHaveBeenCalledWith(expect.stringContaining("5.2%"));
  });

  it("shows enhanced explanation when provided", () => {
    render(
      <WhyDidThisMovePanel
        pack={makePack()}
        onEnhance={vi.fn()}
        enhancedExplanation="This move was driven by strong delivery volumes."
        onDismissEnhance={vi.fn()}
      />,
    );
    // Click enhance first
    fireEvent.click(screen.getByText("Enhance explanation"));
    expect(screen.getByText("This move was driven by strong delivery volumes.")).toBeInTheDocument();
  });

  it("disables enhance button while enhancing", () => {
    const onEnhance = vi.fn();
    render(
      <WhyDidThisMovePanel pack={makePack()} onEnhance={onEnhance} enhancing />,
    );
    const btn = screen.getByText(/Enhancing/);
    expect(btn).toBeInTheDocument();
    expect(btn.closest("button")).toBeDisabled();
  });

  it("shows loading indicator while enhancing", () => {
    render(
      <WhyDidThisMovePanel pack={makePack()} onEnhance={vi.fn()} enhancing />,
    );
    expect(screen.getByText("Enhancing…")).toBeInTheDocument();
  });
});
