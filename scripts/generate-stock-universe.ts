import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getUniverseCount, listAllStockResearch } from "../src/lib/stockResearch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const target = path.join(root, "data", "stock-universe.json");
const publicTarget = path.join(root, "public", "stock-universe.json");

async function main() {
  const entries = listAllStockResearch().map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    exchange: stock.exchange,
    sector: stock.sector,
    industry: stock.industry,
    marketCap: stock.marketCap,
    scores: stock.scores,
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    totalUniverse: getUniverseCount(),
    entries,
  };

  await mkdir(path.dirname(target), { recursive: true });
  const serialized = JSON.stringify(payload, null, 2);
  await writeFile(target, serialized);
  await mkdir(path.dirname(publicTarget), { recursive: true });
  await copyFile(target, publicTarget);
  console.log(`Wrote ${payload.totalUniverse} stock records to ${target} and ${publicTarget}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
