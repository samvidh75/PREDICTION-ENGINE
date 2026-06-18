export {};
/**
 * sync-public-nse-universe.ts — Sync NSE universe from public providers.
 *
 * Gets equity list from nsepython (nse_eq_symbols or similar) and nselib (equity_list).
 * Upserts into master_security_registry. Dry-run by default.
 *
 * Usage:
 *   npx tsx scripts/sync-public-nse-universe.ts
 *   npx tsx scripts/sync-public-nse-universe.ts --apply
 *   npx tsx scripts/sync-public-nse-universe.ts --apply --source=nselib
 */

import { dbAdapter } from "../src/db/DatabaseAdapter";
import { execSync } from "node:child_process";

const VALID_SOURCES = ["auto", "nsepython", "nselib"];

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

function fetchFromNselib(): EquityEntry[] {
  try {
    const output = execSync(`python3 -c "
import json, sys
try:
    from nselib import capital_market
    df = capital_market.equity_list()
    if hasattr(df, 'shape') and df.shape[0] > 0:
        cols = list(df.columns[:15])
        rows = []
        for _, r in df.iterrows():
            row = {}
            for c in cols:
                try: row[c.lower()] = str(r[c])[:100]
                except: row[c.lower()] = ''
            rows.append(row)
        print(json.dumps({'status': 'ok', 'count': len(rows), 'columns': cols, 'sample': rows[:3]}))
    else:
        print(json.dumps({'status': 'no_data'}))
except Exception as e:
    print(json.dumps({'status': 'error', 'detail': str(e)[:200]}))
"`, { encoding: "utf-8", timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
    const parsed = JSON.parse(output.trim());
    if (parsed.status !== "ok" || !parsed.sample || parsed.sample.length === 0) {
      console.warn(`  nselib.equity_list: ${parsed.status} - ${parsed.detail || "no data"}`);
      return [];
    }
    const rawOutput = execSync(`python3 -c "
import json, sys
try:
    from nselib import capital_market
    import pandas as pd
    df = capital_market.equity_list()
    if hasattr(df, 'shape') and df.shape[0] > 0:
        symbol_col = [c for c in df.columns if 'symbol' in c.lower() or 'ticker' in c.lower() or 'scrip' in c.lower()]
        name_col = [c for c in df.columns if 'name' in c.lower() or 'company' in c.lower()]
        isin_col = [c for c in df.columns if 'isin' in c.lower()]
        sector_col = [c for c in df.columns if 'sector' in c.lower()]
        industry_col = [c for c in df.columns if 'industry' in c.lower()]
        sc = symbol_col[0] if symbol_col else df.columns[0]
        nc = name_col[0] if name_col else sc
        ic = isin_col[0] if isin_col else None
        sec = sector_col[0] if sector_col else None
        indc = industry_col[0] if industry_col else None
        rows = []
        for _, r in df.iterrows():
            rows.append({'symbol': str(r[sc]).upper().strip(), 'company_name': str(r[nc])[:200], 'isin': str(r[ic])[:20] if ic else None, 'sector': str(r[sec])[:100] if sec and str(r[sec]) != 'nan' else None, 'industry': str(r[indc])[:100] if indc and str(r[indc]) != 'nan' else None})
        print(json.dumps(rows))
    else:
        print(json.dumps([]))
except Exception as e:
    print(json.dumps({'error': str(e)[:200]}))
"`, { encoding: "utf-8", timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
    const rows: Record<string, string | null>[] = JSON.parse(rawOutput.trim());
    if ("error" in rows[0]) {
      console.warn(`  nselib.equity_list: parse error - ${rows[0].error}`);
      return [];
    }
    return rows.map((r) => ({
      symbol: String(r.symbol ?? "").replace(/-/g, "").toUpperCase(),
      companyName: String(r.company_name ?? r.symbol ?? ""),
      isin: r.isin && String(r.isin) !== "nan" ? String(r.isin) : null,
      sector: r.sector && String(r.sector) !== "nan" ? String(r.sector) : null,
      industry: r.industry && String(r.industry) !== "nan" ? String(r.industry) : null,
    })).filter((e) => e.symbol && /^[A-Z0-9]+$/.test(e.symbol));
  } catch (err) {
    console.warn(`  nselib.equity_list: error - ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    return [];
  }
}

async function main(): Promise<void> {
  const options = parseArgs();
  console.log(JSON.stringify({
    script: "sync-public-nse-universe",
    mode: options.apply ? "apply" : "dry-run",
    source: options.source,
  }));

  let entries: EquityEntry[] = [];
  if (options.source === "auto" || options.source === "nsepython") {
    console.log("  Fetching from nsepython.nse_eq_symbols...");
    entries = fetchFromNsepython();
    if (entries.length > 0) console.log(`  nsepython: ${entries.length} symbols`);
  }
  if ((options.source === "auto" || options.source === "nselib") && entries.length === 0) {
    console.log("  Fetching from nselib.equity_list...");
    entries = fetchFromNselib();
    if (entries.length > 0) console.log(`  nselib: ${entries.length} symbols`);
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
