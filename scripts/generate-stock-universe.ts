/**
 * Regenerate data/stock-universe.json (and its public/ copy) from real sources.
 *
 * History: this script used to import listAllStockResearch()/getUniverseCount()
 * from src/lib/stockResearch, a module that does not exist in this branch — so
 * it could not run, and the committed stock-universe.json it was meant to
 * produce had gone stale as pure placeholder data: every entry scored a flat 50
 * across all seven factors, marketCap 0, and sector "PSE Listed" for 264 of 294
 * entries. That file is not inert — it backs /api/company-master,
 * /api/screener/execute and /api/analytics/* (via DataWarehouseService), and
 * the server-side SEO meta injection.
 *
 * Every field below now comes from a real, sourced dataset:
 *   symbol / name / sector / industry / listingDate → data/pse-sectors.json
 *       (PSE Edge company directory, via PSESectorsData.ts)
 *   marketCap                                       → data/pse-market-cap.json
 *       (stockanalysis.com, via PseMarketCapAdapter.ts), in millions PHP
 *
 * Factor scores are deliberately OMITTED rather than defaulted. The real
 * per-symbol scoring pipeline is not batch-callable from here, and emitting a
 * placeholder is what produced the uniform-50 problem in the first place.
 * Consumers already null-coalesce (DataWarehouseService.loadUniverseRows() does
 * `entry.scores?.quality ?? null`), so an absent object degrades honestly.
 *
 *   npx tsx scripts/generate-stock-universe.ts
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPseSector } from "../src/services/scrapers/PSESectorsData";
import { getMarketCapBySymbol } from "../src/services/data/providers/PseMarketCapAdapter";
import { getCanonicalSymbols } from "./lib/canonical-symbols";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const target = path.join(root, "data", "stock-universe.json");
const publicTarget = path.join(root, "public", "stock-universe.json");

async function main() {
  const symbols = getCanonicalSymbols();
  if (symbols.length === 0) {
    throw new Error(
      "No canonical symbols found — run scripts/scrape-pse-sectors.ts to produce data/pse-sectors.json first.",
    );
  }

  let withMarketCap = 0;

  const entries = symbols.flatMap((symbol) => {
    const record = loadPseSector(symbol);
    if (!record) return [];

    const marketCap = getMarketCapBySymbol(symbol);
    if (marketCap !== null) withMarketCap++;

    return [{
      symbol,
      name: record.companyName,
      exchange: "PSE" as const,
      sector: record.sector,
      industry: record.subsector || null,
      marketCap,
      listingDate: record.listingDate ?? null,
    }];
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    totalUniverse: entries.length,
    sources: [
      "data/pse-sectors.json (edge.pse.com.ph company directory)",
      "data/pse-market-cap.json (stockanalysis.com)",
    ],
    marketCapUnits: "millions PHP",
    entries,
  };

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`);
  await mkdir(path.dirname(publicTarget), { recursive: true });
  await copyFile(target, publicTarget);

  console.log(`Wrote ${entries.length} stock records to ${target} and ${publicTarget}`);
  console.log(`  market cap resolved: ${withMarketCap}/${entries.length}`);
  console.log(`  factor scores: omitted (no real scoring pipeline — see file header)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
