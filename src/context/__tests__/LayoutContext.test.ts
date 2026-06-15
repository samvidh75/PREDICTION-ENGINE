import { describe, expect, it } from "vitest";
import { NAVIGATION_VIEWS, mapPageToView, mapViewToPage } from "../LayoutContext";

describe("LayoutContext route mapping", () => {
  it("round-trips every product navigation view", () => {
    for (const view of NAVIGATION_VIEWS) {
      expect(mapPageToView(mapViewToPage(view))).toBe(view);
    }
  });

  it("normalizes legacy route aliases", () => {
    expect(mapPageToView("market")).toBe("dashboard");
    expect(mapPageToView("explore")).toBe("dashboard");
    expect(mapPageToView("discovery")).toBe("dashboard");
    expect(mapPageToView("methodology")).toBe("trust");
    expect(mapPageToView("validation")).toBe("trust");
  });

  it("falls back to the dashboard for unknown routes", () => {
    expect(mapPageToView("not-a-real-page")).toBe("dashboard");
    expect(mapPageToView(null)).toBe("dashboard");
  });
});
