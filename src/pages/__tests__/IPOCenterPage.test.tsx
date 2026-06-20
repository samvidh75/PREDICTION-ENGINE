import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import IPOCenterPage from "../IPOCenterPage";

describe("IPOCenterPage", () => {
  beforeEach(() => {
    (window as any).__trendlyneWidgetLoaded = true;
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders IPO Center page", () => {
    render(<IPOCenterPage />);
    expect(screen.getAllByText(/Track current and upcoming IPO activity/i).length).toBeGreaterThan(0);
  });

  it("renders product-safe copy", () => {
    render(<IPOCenterPage />);
    expect(screen.getByText(/Review before applying/i)).toBeInTheDocument();
    expect(screen.getByText(/Track instead/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Research context/i).length).toBeGreaterThan(0);
  });

  it("renders IPO widget container", async () => {
    render(<IPOCenterPage />);
    await waitFor(() => {
      const blockquote = document.querySelector(".trendlyne-widgets");
      expect(blockquote).toBeTruthy();
    });
  });

  it("has no forbidden native copy", () => {
    render(<IPOCenterPage />);
    const forbidden = ["Buy", "Sell", "Hold", "price target", "guaranteed return", "multibagger"];
    forbidden.forEach((term) => {
      expect(screen.queryByText(new RegExp(term, "i"))).toBeNull();
    });
  });

  it("has no fake IPO data", () => {
    render(<IPOCenterPage />);
    const allText = document.body.textContent ?? "";
    expect(allText).not.toMatch(/\bGMP\b/i);
    expect(allText).not.toContain("Strong Buy");
    expect(allText).not.toContain("Buy now");
    expect(allText).not.toContain("guaranteed return");
  });
});
