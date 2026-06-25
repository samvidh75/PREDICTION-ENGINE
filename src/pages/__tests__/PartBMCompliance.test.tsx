import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../App";

vi.mock("../../hooks/useStockData", () => ({
  useStockData: vi.fn(() => ({
    data: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock("../../services/universe/StockUniverse", () => ({
  NIFTY50_SYMBOLS: ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"],
}));

describe("Part BM Compliance", () => {
  it("does not render Buy/Sell/Hold as investment recommendations in main pages", async () => {
    render(<App />);
    await waitFor(() => {
      const body = document.body.textContent || "";
      // StockStory does not use Buy/Hold/Sell as recommendations
      const buySellHold = ["Buy ", "Sell ", "Hold "].some(term => body.includes(term));
      // TrustCentrePage explains we don't use Buy/Hold/Sell — allow that
      expect(buySellHold).toBe(false);
    });
  });

  it("does not render guaranteed or sure shot language", async () => {
    render(<App />);
    await waitFor(() => {
      const body = document.body.textContent || "";
      expect(body).not.toContain("guaranteed");
      expect(body).not.toContain("sure shot");
      expect(body).not.toContain("multibagger");
    });
  });

  it("does not render hardcoded featured stock cards", async () => {
    render(<App />);
    await waitFor(() => {
      const body = document.body.textContent || "";
      // The home page should not have a hardcoded featured HDFCBANK card
      // HDFCBANK may appear in stock lists/search results but not as a featured block
      const hdfcBankCount = (body.match(/HDFCBANK/g) || []).length;
      // HDFCBANK can appear in the market ticker and suggested stocks, but not be singled out
      expect(hdfcBankCount).toBeLessThan(5);
    });
  });
});
