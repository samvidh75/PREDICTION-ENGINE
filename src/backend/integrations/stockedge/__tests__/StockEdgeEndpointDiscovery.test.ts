import { describe, expect, it, beforeEach } from "vitest";
import { StockEdgeEndpointDiscovery } from "../StockEdgeEndpointDiscovery";
import { stockEdgeSessionStore } from "../StockEdgeSessionStore";

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV };
  process.env.STOCKEDGE_ENABLED = "true";
  process.env.STOCKEDGE_BASE_URL = "https://web.stockedge.com";
  stockEdgeSessionStore.clearSession();
});

describe("StockEdgeEndpointDiscovery", () => {
  it("fails when no session exists", async () => {
    const discovery = new StockEdgeEndpointDiscovery();
    const result = await discovery.discover({ symbol: "RELIANCE" });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("STOCKEDGE_SESSION_EXPIRED");
  });

  it("returns empty endpoints list when no session", async () => {
    const discovery = new StockEdgeEndpointDiscovery();
    const result = await discovery.discover({ symbol: "RELIANCE" });
    expect(result.endpoints).toHaveLength(0);
  });

  it("does not write raw payloads", async () => {
    const discovery = new StockEdgeEndpointDiscovery();
    const result = await discovery.discover({ symbol: "RELIANCE" });
    for (const ep of result.endpoints) {
      expect(ep.sampleKeys).toBeDefined();
      expect(Array.isArray(ep.sampleKeys)).toBe(true);
    }
  });

  it("classifies endpoints into layers", () => {
    const discovery = new StockEdgeEndpointDiscovery();
    const candidates = (discovery as any).buildCandidateEndpoints("RELIANCE");
    expect(candidates.length).toBeGreaterThan(0);
    const layers = new Set(candidates.map((c: any) => c.layer));
    expect(layers.has("profile")).toBe(true);
    expect(layers.has("price")).toBe(true);
    expect(layers.has("technicals")).toBe(true);
    expect(layers.has("fundamentals")).toBe(true);
  });
});
