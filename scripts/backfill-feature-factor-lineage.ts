/**
 * Backfill lineage columns (source_provider, source_domain, etc.) into
 * feature_snapshots and factor_snapshots from prediction_input_lineage.
 *
 * Usage:
 *   --dry-run        Preview only (default)
 *   --apply          Actually write changes
 *   --symbols=A,B    Limit to specific symbols
 *   --limit=100      Max rows per table
 *   --since=YYYY-MM-DD  Only rows newer than this date
 */
import { query } from "../src/db/index";

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes("--apply");
  const symbolFilter = args.find((a) => a.startsWith("--symbols="))?.split("=")[1];
  const limitStr = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const sinceStr = args.find((a) => a.startsWith("--since="))?.split("=")[1];

  const limit = limitStr ? parseInt(limitStr, 10) : null;
  const symbols = symbolFilter ? symbolFilter.split(",").map((s) => s.trim().toUpperCase()) : null;
  const since = sinceStr || null;

  console.log(`=== Feature/Factor Lineage Backfill ===`);
  console.log(`Mode: ${isDryRun ? "DRY RUN (no writes)" : "APPLY"}`);
  if (symbols) console.log(`Symbols: ${symbols.join(", ")}`);
  if (limit) console.log(`Limit: ${limit}`);
  if (since) console.log(`Since: ${since}`);
  console.log("");

  let totalScanned = 0;
  let totalMatched = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const table of ["feature_snapshots", "factor_snapshots"]) {
    console.log(`\n=== Processing: ${table} ===`);

    let sql = `SELECT fs.symbol, fs.trade_date, fs.created_at
               FROM ${table} fs
               WHERE fs.source_provider IS NULL`;
    if (symbols) sql += ` AND fs.symbol = ANY($1)`;
    if (since) sql += symbols ? ` AND fs.trade_date >= $2` : ` AND fs.trade_date >= $1`;
    sql += ` ORDER BY fs.trade_date DESC`;
    if (limit) sql += symbols ? ` LIMIT $${since ? 3 : 2}` : since ? ` LIMIT $2` : ` LIMIT $1`;

    const params: any[] = [];
    if (symbols) params.push(symbols);
    if (since) params.push(since);
    if (limit) params.push(limit);

    const res = await query(sql, params);
    const rows = res.rows || [];
    totalScanned += rows.length;
    console.log(`  Scanned ${rows.length} snapshots without lineage`);

    let matched = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const linRes = await query(
          `SELECT source_name, source_table, as_of, retrieved_at, is_fallback, availability
           FROM prediction_input_lineage
           WHERE symbol = $1 AND source_table = $2
           ORDER BY retrieved_at DESC
           LIMIT 1`,
          [row.symbol, table]
        );

        if (linRes.rows.length > 0) {
          const lin = linRes.rows[0];
          if (!isDryRun) {
            const provider = lin.source_name || "unknown";
            const quality = lin.availability === "real" ? "verified" : "inferred";
            await query(
              `UPDATE ${table}
               SET source_provider = $1,
                   source_domain = $2,
                   source_as_of_date = $3::date,
                   source_ingested_at = $4::timestamp,
                   source_quality = $5,
                   source_lineage_id = $6
               WHERE symbol = $7 AND trade_date = $8`,
              [
                provider,
                lin.source_table,
                lin.as_of,
                lin.retrieved_at,
                quality,
                `backfill-${table}-${row.symbol}-${row.trade_date}`,
                row.symbol,
                row.trade_date,
              ]
            );
          }
          matched++;
        } else {
          if (!isDryRun) {
            await query(
              `UPDATE ${table}
               SET source_provider = 'unknown',
                   source_quality = 'lineage_unavailable',
                   source_notes = 'No matching prediction_input_lineage record found'
               WHERE symbol = $1 AND trade_date = $2`,
              [row.symbol, row.trade_date]
            );
          }
          skipped++;
        }
      } catch (e: any) {
        errors++;
        if (!isDryRun) {
          console.error(`  Error processing ${row.symbol} ${row.trade_date}: ${e.message}`);
        }
      }
    }

    totalMatched += matched;
    totalSkipped += skipped;
    totalErrors += errors;

    console.log(`  Matched lineage: ${matched}`);
    console.log(`  Unmatched (lineage unavailable): ${skipped}`);
    console.log(`  Errors: ${errors}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Snapshots scanned: ${totalScanned}`);
  console.log(`Matched lineage: ${totalMatched}`);
  console.log(`Unmatched (lineage_unavailable): ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
  if (isDryRun) console.log(`\n[DRY RUN] No changes were applied. Run with --apply to write.`);
  console.log(`\nDone.`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
