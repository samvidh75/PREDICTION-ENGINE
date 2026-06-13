import { describe, expect, it } from "vitest";
import { NAVIGATION_VIEWS, mapPageToView, mapViewToPage } from "../LayoutContext";

describe("LayoutContext route mapping", () => {
  it("round-trips every product navigation view", () => {
    for (const view of NAVIGATION_VIEWS) {
      expect(mapPageToView(mapViewToPage(view))).toBe(view);
    }
  });

  it("normalizes legacy route aliases", () => {
    expect(mapPageToView("market")).toBe("terminal");
    expect(mapPageToView("explore")).toBe("discovery");
    expect(mapPageToView("methodology")).toBe("trust");
    expect(mapPageToView("validation")).toBe("trust");
  });

  it("falls back to the market home for unknown routes", () => {
    expect(mapPageToView("not-a-real-page")).toBe("terminal");
    expect(mapPageToView(null)).toBe("terminal");
  });
});
