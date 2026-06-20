import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TrendlyneWidget } from "../TrendlyneWidget";

describe("TrendlyneWidget", () => {
  beforeEach(() => {
    (window as any).__trendlyneWidgetLoaded = true;
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders technicals widget with symbol in URL", async () => {
    render(<TrendlyneWidget kind="technicals" symbol="RELIANCE" lazy={false} />);
    await waitFor(() => {
      const blockquote = document.querySelector(".trendlyne-widgets");
      expect(blockquote).toBeTruthy();
    });
    const blockquote = document.querySelector(".trendlyne-widgets");
    const url = blockquote?.getAttribute("data-get-url") ?? "";
    expect(url).toContain("technical-widget");
    expect(url).toContain(encodeURIComponent("RELIANCE"));
  });

  it("renders checklist widget with symbol in URL", async () => {
    render(<TrendlyneWidget kind="checklist" symbol="TCS" lazy={false} />);
    await waitFor(() => {
      const blockquote = document.querySelector(".trendlyne-widgets");
      expect(blockquote).toBeTruthy();
    });
    const blockquote = document.querySelector(".trendlyne-widgets");
    const url = blockquote?.getAttribute("data-get-url") ?? "";
    expect(url).toContain("checklist-widget");
    expect(url).toContain(encodeURIComponent("TCS"));
  });

  it("renders IPO widget without symbol in URL", async () => {
    render(<TrendlyneWidget kind="ipo" lazy={false} />);
    await waitFor(() => {
      const blockquote = document.querySelector(".trendlyne-widgets");
      expect(blockquote).toBeTruthy();
    });
    const blockquote = document.querySelector(".trendlyne-widgets");
    const url = blockquote?.getAttribute("data-get-url") ?? "";
    expect(url).toContain("ipo-widget");
    expect(url).not.toContain("APIS");
  });

  it("shows fallback when symbol is missing for technicals", () => {
    render(<TrendlyneWidget kind="technicals" />);
    expect(screen.getByText(/External research panel unavailable/i)).toBeInTheDocument();
  });

  it("shows fallback when symbol is missing for checklist", () => {
    render(<TrendlyneWidget kind="checklist" />);
    expect(screen.getByText(/External research panel unavailable/i)).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <TrendlyneWidget kind="technicals" fallback={<div>Custom fallback</div>} />
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  it("loads script only once", () => {
    const appendChild = vi.spyOn(document.body, "appendChild");
    render(<TrendlyneWidget kind="ipo" lazy={false} />);
    render(<TrendlyneWidget kind="technicals" symbol="RELIANCE" lazy={false} />);
    const scriptLoads = appendChild.mock.calls.filter(
      (call) =>
        call[0] instanceof HTMLScriptElement &&
        (call[0] as HTMLScriptElement).src.includes("trendlyne.com")
    );
    expect(scriptLoads.length).toBeLessThanOrEqual(1);
  });

  it("does not crash test environment", () => {
    expect(() =>
      render(<TrendlyneWidget kind="ipo" lazy={false} />)
    ).not.toThrow();
  });
});
