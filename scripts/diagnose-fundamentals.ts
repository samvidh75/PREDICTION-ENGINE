export {};

import pool from "../src/db/index";

async function main(): Promise<void> {
  console.log("=== Fundamentals Diagnostic ===\n");

  let snapshots;
  try {
    snapshots = await pool.query(`
      SELECT
        COUNT(*)::int AS rows,
        COUNT(DISTINCT symbol)::int AS symbols,
        MAX(period_end_date)::text AS latest_period,
        MAX(ingestion_timestamp)::text AS latest_ingestion
      FROM financial_snapshots
    `);
  } catch {
    snapshots = await pool.query(`
      SELECT
        COUNT(*)::int AS rows,
        COUNT(DISTINCT symbol)::int AS symbols,
        MAX(period_end)::text AS latest_period,
        NULL AS latest_ingestion
      FROM financial_snapshots
    `);
  }
  const row = snapshots.rows[0] as {
    rows: number;
    symbols: number;
    latest_period: string | null;
    latest_ingestion: string | null;
  };

  console.log(`Snapshot rows:       ${row.rows}`);
  console.log(`Covered symbols:     ${row.symbols}`);
  console.log(`Latest period:       ${row.latest_period ?? "Unavailable"}`);
  console.log(`Latest ingestion:    ${row.latest_ingestion ?? "Unavailable"}`);

  const missing = await pool.query(`
    SELECT s.symbol
    FROM symbols s
    LEFT JOIN financial_snapshots f ON f.symbol = s.symbol
    WHERE s.listing_status = 'Active'
    GROUP BY s.symbol
    HAVING COUNT(f.symbol) = 0
    ORDER BY s.symbol
    LIMIT 25
  `);

  if (missing.rows.length > 0) {
    console.log("\nMissing fundamentals sample:");
    for (const item of missing.rows as Array<{ symbol: string }>) {
      console.log(`  - ${item.symbol}`);
    }
  }

  console.log("\nDiagnostic complete. Missing fundamentals are reported as unavailable; no synthetic fundamentals were created.");
}

main().catch((error) => {
  console.error("Fundamentals diagnostic failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
