// src/scripts/ingest-news.ts
//
// DEPRECATED — This script was originally a data-seeding helper that inserted
// hardcoded/hypothetical news articles with fake URLs. The runtime news
// pipeline now uses DataAcquisitionCoordinator.fetchNews() which pulls real
// articles from Yahoo News (Tier 1) → GoogleNewsRSS (Tier 2) at request time.
//
// Keep this stub for backwards compat; no-op in production.
// Remove entirely once all consumers switch to the runtime pipeline.

import pool from "../db/index";

async function main() {
  console.log("=== News Ingestion (DEPRECATED — using runtime pipeline instead) ===");
  console.log("Runtime news pipeline: DataAcquisitionCoordinator.fetchNews()");
  console.log("No direct DB insertion needed — news is fetched at request time.");
  await pool.end();
}

main().catch(err => {
  console.error("News ingestion failed:", err);
  process.exit(1);
});
