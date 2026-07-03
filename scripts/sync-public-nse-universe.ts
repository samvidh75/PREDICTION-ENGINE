export {};
/**
 * sync-public-nse-universe.ts — Sync NSE universe from public providers.
 *
 * Gets equity list from nsepython.
 * Upserts into master_security_registry. Dry-run by default.
 *
 * Usage:
 *   npx tsx scripts/sync-public-nse-universe.ts
 *   npx tsx scripts/sync-public-nse-universe.ts --apply
 */

import { dbAdapter } from "../src/db/DatabaseAdapter";
import { execSync } from "node:child_process";

const VALID_SOURCES = ["auto", "nsepython"];

interface EquityEntry {
  symbol: string;
  companyName: string;
  isin: string | null;
  sector: string | null;
  industry: string | null;
}

interface CliOptions {
  source: string;
  apply: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let source = "auto";
  for (const arg of args) {
    if (arg.startsWith("--source=")) source = arg.split("=")[1].trim().toLowerCase();
  }
  if (!VALID_SOURCES.includes(source)) {
    console.error(`ERROR: invalid source "${source}". Valid: ${VALID_SOURCES.join(", ")}`);
    process.exit(1);
  }
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");
  return { source, apply: apply && !dryRun };
}

function fetchFromNsepython(): EquityEntry[] {
  const output = execSync(`python3 -c "
import json, sys
try:
    import nsepython
    symbols = nsepython.nse_eq_symbols()
    if isinstance(symbols, (list, tuple)) and len(symbols) > 0:
        sample = symbols[:5] if len(symbols) > 5 else symbols
        print(json.dumps({'status': 'ok', 'count': len(symbols), 'sample': sample}))
    else:
        print(json.dumps({'status': 'no_data', 'detail': str(type(symbols))}))
except Exception as e:
    print(json.dumps({'status': 'error', 'detail': str(e)[:200]}))
"`, { encoding: "utf-8", timeout: 30_000, maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(output.trim());
  if (parsed.status !== "ok") {
    console.warn(`  nsepython.nse_eq_symbols: ${parsed.status} - ${parsed.detail}`);
    return [];
  }
  try {
    const rawOutput = execSync(`python3 -c "
import json, sys
try:
    from nsepython import nse_eq_symbols
    symbols = nse_eq_symbols()
    if isinstance(symbols, (list, tuple)):
        print(json.dumps(sorted(set(str(s).upper().strip() for s in symbols if str(s).strip()))))
    else:
        print(json.dumps([]))
except Exception:
    print(json.dumps([]))
"`, { encoding: "utf-8", timeout: 30_000, maxBuffer: 10 * 1024 * 1024 });
    const symbols: string[] = JSON.parse(rawOutput.trim());
    return symbols.map((s) => ({ symbol: s, companyName: s, isin: null, sector: null, industry: null }));
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const options = parseArgs();
  console.log(JSON.stringify({
    script: "sync-public-nse-universe",
    mode: options.apply ? "apply" : "dry-run",
    source: options.source,
    note: "Legacy NSE SDK fallback removed from active provider set.",
  }));

  let entries: EquityEntry[] = [];
  if (options.source === "auto" || options.source === "nsepython") {
    console.log("  Fetching from nsepython.nse_eq_symbols...");
    entries = fetchFromNsepython();
    if (entries.length > 0) console.log(`  nsepython: ${entries.length} symbols`);
  }

  if (entries.length === 0) {
    console.error("ERROR: No symbols fetched from any source");
    process.exit(1);
  }

  console.log(`  Total: ${entries.length} unique symbols`);
  console.log(`  Sample: ${entries.slice(0, 5).map((e) => e.symbol).join(", ")}`);

  if (options.apply) {
    await dbAdapter.initialize();
    let inserted = 0;
    let updated = 0;

    for (const entry of entries) {
      try {
        const existing = await dbAdapter.query(
          `SELECT symbol FROM master_security_registry WHERE symbol = $1`,
          [entry.symbol],
        );
        if (existing.rows.length > 0) {
          await dbAdapter.query(
            `UPDATE master_security_registry SET
              company_name = COALESCE($2, company_name),
              isin = COALESCE($3, isin),
              sector = COALESCE($4, sector),
              industry = COALESCE($5, industry),
              last_verified = $6
             WHERE symbol = $1`,
            [entry.symbol, entry.companyName || null, entry.isin, entry.sector, entry.industry, new Date().toISOString()],
          );
          updated++;
        } else {
          await dbAdapter.query(
            `INSERT INTO master_security_registry (symbol, company_name, isin, sector, industry, listing_status, last_verified)
             VALUES ($1, $2, $3, $4, $5, 'Active', $6)`,
            [entry.symbol, entry.companyName || null, entry.isin, entry.sector, entry.industry, new Date().toISOString()],
          );
          inserted++;
        }
      } catch {
        await dbAdapter.query(
          `INSERT OR REPLACE INTO master_security_registry (symbol, company_name, isin, sector, industry, listing_status, last_verified)
           VALUES ($1, $2, $3, $4, $5, 'Active', $6)`,
          [entry.symbol, entry.companyName || null, entry.isin, entry.sector, entry.industry, new Date().toISOString()],
        );
        inserted++;
      }
    }

    console.log(JSON.stringify({
      summary: { source: options.source, total: entries.length, inserted, updated },
    }));
    await dbAdapter.shutdown();
  } else {
    console.log(JSON.stringify({
      summary: { source: options.source, total: entries.length, mode: "dry-run" },
      dryRunWrite: entries.map((e) => ({ symbol: e.symbol, companyName: e.companyName, isin: e.isin })),
    }, null, 2));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
