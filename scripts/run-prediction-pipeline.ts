import { DatabaseSnapshotProvider } from "../src/backend/data/providers/DatabaseSnapshotProvider";
import { scoreSnapshot } from "../src/backend/data/scoring/scoreEngine";
import { query } from "../src/db";

const apply = process.argv.includes("--apply");
const symbolArg = process.argv.find((arg) => arg.startsWith("--symbols="))?.split("=")[1];
const symbols = symbolArg ? symbolArg.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : (await query(`SELECT DISTINCT symbol FROM daily_prices ORDER BY symbol LIMIT 50`)).rows.map((r) => String(r.symbol));
const provider = new DatabaseSnapshotProvider();
const to = new Date().toISOString().slice(0, 10);
const fromDate = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);
const prices = await provider.fetchPrices(symbols, fromDate, to);
const fundamentals = await provider.fetchFundamentals(symbols);
const bySymbolPrices = new Map<string, typeof prices>();
for (const price of prices) bySymbolPrices.set(price.symbol, [...(bySymbolPrices.get(price.symbol) ?? []), price]);
const bySymbolFund = new Map(fundamentals.map((f) => [f.symbol, f]));
const snapshots = symbols.map((symbol) => scoreSnapshot({ symbol, prices: bySymbolPrices.get(symbol) ?? [], fundamental: bySymbolFund.get(symbol) ?? null }));
const vectors = new Map<string, string[]>();
for (const snap of snapshots) {
  const key = Object.values(snap.factors).map((f) => f.value ?? "null").join("|");
  vectors.set(key, [...(vectors.get(key) ?? []), snap.symbol]);
}
console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  symbols: symbols.length,
  scored: snapshots.filter((s) => s.rankingScore != null).length,
  partial: snapshots.filter((s) => s.availability === "partial").length,
  unavailable: snapshots.filter((s) => s.availability === "unavailable").length,
  examples: snapshots.slice(0, 10),
  identicalVectorGroups: [...vectors.values()].filter((g) => g.length > 1).slice(0, 10),
}, null, 2));
if (apply && process.env.CONFIRM_F1_PIPELINE_APPLY !== "true") {
  throw new Error("Apply mode requires CONFIRM_F1_PIPELINE_APPLY=true");
}

