import { config as loadDotEnv } from "dotenv";
loadDotEnv({ path: ".env", quiet: true });

import { buildSnapshot } from "../src/backend/services/research/StockPageSnapshotService";
import { upsertSnapshot } from "../src/backend/services/research/StockPageSnapshotRepository";
import { setCachedSnapshot } from "../src/backend/services/research/StockPageSnapshotCache";

async function main() {
  const args = process.argv.slice(2);
  const symbolsArg = args.find((a) => a.startsWith("--symbols="))?.split("=")[1];
  const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const isDryRun = args.includes("--dry-run");

  const symbols = symbolsArg ? symbolsArg.split(",").map((s) => s.trim().toUpperCase()) : ["RELIANCE", "ITC", "TCS", "INFY", "HDFCBANK"];

  console.log(`=== Stock Page Snapshot Materializer ===`);
  console.log(`Symbols: ${symbols.length}`);
  console.log(`Dry run: ${isDryRun}`);
  console.log("");

  let ok = 0;
  let fail = 0;

  for (const symbol of symbols) {
    try {
      const snapshot = await buildSnapshot(symbol);
      if (!isDryRun) {
        await upsertSnapshot(symbol, snapshot);
        setCachedSnapshot(symbol, snapshot);
      }
      const dimCount = snapshot.healthometer.dimensions.filter((d) => d.score !== null).length;
      const historyCount = snapshot.priceHistory.length;
      console.log(`  ${symbol}: score=${snapshot.healthometer.overallScore}, dims=${dimCount}, candles=${historyCount}, state=${snapshot.freshnessState}`);
      ok++;
    } catch (err) {
      console.log(`  ${symbol}: FAILED — ${err instanceof Error ? err.message : "unknown"}`);
      fail++;
    }
  }

  console.log("");
  console.log(`Done. ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exitCode = 1;
});
