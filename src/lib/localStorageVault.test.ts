import { describe, expect, it, beforeEach, vi } from "vitest";
import { LocalStorageVault, vault } from "./localStorageVault";

let uuidCounter = 0;
vi.mock("uuid", () => ({
  v4: () => {
    uuidCounter++;
    return `fixed-uuid-${uuidCounter}`;
  },
}));

describe("LocalStorageVault", () => {
  let v: LocalStorageVault;

  beforeEach(() => {
    localStorage.clear();
    v = new LocalStorageVault();
  });

  it("initialises and creates an encryption key", async () => {
    await v.init();
    const key = localStorage.getItem("stockstory_v2_encryption_key");
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("reuses existing encryption key across init calls", async () => {
    await v.init();
    const key1 = localStorage.getItem("stockstory_v2_encryption_key");
    await v.init();
    const key2 = localStorage.getItem("stockstory_v2_encryption_key");
    expect(key1).toBe(key2);
  });

  it("saves and retrieves watchlists", async () => {
    const id = await v.saveWatchlist("My List", ["RELIANCE", "TCS"]);
    expect(id).toBe("fixed-uuid-1");

    const lists = await v.getWatchlists();
    expect(lists).toHaveLength(1);
    expect(lists[0].name).toBe("My List");
    expect(lists[0].tickers).toEqual(["RELIANCE", "TCS"]);
    expect(lists[0].id).toBe("fixed-uuid-1");
  });

  it("saves multiple watchlists and returns them all", async () => {
    await v.saveWatchlist("Tech", ["TCS", "INFY"]);
    await v.saveWatchlist("Banking", ["HDFCBANK", "ICICIBANK"]);

    const lists = await v.getWatchlists();
    expect(lists).toHaveLength(2);
  });

  it("deletes a watchlist", async () => {
    const id = await v.saveWatchlist("Temp", ["WIPRO"]);
    await v.deleteWatchlist(id);

    const lists = await v.getWatchlists();
    expect(lists).toHaveLength(0);
  });

  it("normalises tickers to uppercase", async () => {
    await v.saveWatchlist("Mixed", ["reliance", "Tcs"]);
    const lists = await v.getWatchlists();
    expect(lists[0].tickers).toEqual(["RELIANCE", "TCS"]);
  });

  it("saves and retrieves portfolio", async () => {
    const positions = [
      { symbol: "RELIANCE", quantity: 10, entryPrice: 2500, entryDate: "2025-01-15" },
      { symbol: "TCS", quantity: 5, entryPrice: 3800, entryDate: "2025-02-01", notes: "Long term" },
    ];
    await v.savePortfolio(positions);

    const portfolio = await v.getPortfolio();
    expect(portfolio.positions).toEqual(positions);
    expect(portfolio.updatedAt).toBeGreaterThan(0);
  });

  it("returns empty portfolio when none saved", async () => {
    const portfolio = await v.getPortfolio();
    expect(portfolio.positions).toEqual([]);
    expect(portfolio.updatedAt).toBe(0);
  });

  it("adds and retrieves search history", async () => {
    await v.addSearchHistory("RELIANCE", 1000);
    await v.addSearchHistory("TCS", 2000);
    await v.addSearchHistory("reliance", 3000);

    const history = await v.getSearchHistory();
    expect(history).toHaveLength(3);
    expect(history[0].symbol).toBe("RELIANCE");
    expect(history[1].symbol).toBe("TCS");
    expect(history[2].symbol).toBe("RELIANCE");
  });

  it("caps search history at 5000 entries", async () => {
    for (let i = 0; i < 5001; i++) {
      await v.addSearchHistory(`S${i}`, i);
    }
    const history = await v.getSearchHistory();
    expect(history.length).toBeLessThanOrEqual(5000);
  });

  it("clears all data", async () => {
    await v.saveWatchlist("Test", ["A"]);
    await v.savePortfolio([{ symbol: "B", quantity: 1, entryPrice: 100, entryDate: "2025-01-01" }]);
    await v.addSearchHistory("C");
    await v.clearAll();

    expect(await v.getWatchlists()).toHaveLength(0);
    expect((await v.getPortfolio()).positions).toHaveLength(0);
    expect(await v.getSearchHistory()).toHaveLength(0);
  });

  it("rejects tampered ciphertext gracefully", async () => {
    await v.init();
    const key = localStorage.getItem("stockstory_v2_encryption_key")!;

    localStorage.setItem("stockstory_v2_watchlist_fake", "tampered-invalid-base64!!!");
    localStorage.setItem(
      "stockstory_v2_watchlists_index",
      JSON.stringify(["fake"]),
    );

    const lists = await v.getWatchlists();
    expect(lists).toHaveLength(0);
  });
});

describe("singleton vault", () => {
  beforeEach(() => localStorage.clear());

  it("exports a pre-initialised instance", () => {
    expect(vault).toBeInstanceOf(LocalStorageVault);
  });
});
