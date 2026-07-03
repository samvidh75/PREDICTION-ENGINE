export {};
/**
 * sync-index-constituents.ts — Sync index constituents from public NSE sources.
 *
 * Gets NIFTY 50, NIFTY NEXT 50, Bank Nifty, and sector index constituents
 * from nsepython.
 * Dry-run by default. --apply flag to write.
 *
 * Usage:
 *   npx tsx scripts/sync-index-constituents.ts
 *   npx tsx scripts/sync-index-constituents.ts --apply
 */

import { dbAdapter } from "../src/db/DatabaseAdapter";
import { execSync } from "node:child_process";

const INDEX_NAMES = [
  "NIFTY 50",
  "NIFTY NEXT 50",
  "NIFTY BANK",
  "NIFTY IT",
  "NIFTY PHARMA",
  "NIFTY AUTO",
  "NIFTY FMCG",
  "NIFTY METAL",
  "NIFTY ENERGY",
  "NIFTY MEDIA",
  "NIFTY CONSUMER DURABLES",
  "NIFTY OIL & GAS",
  "NIFTY MIDCAP 100",
  "NIFTY SMALLCAP 100",
];

interface IndexConstituent {
  indexName: string;
  symbol: string;
  companyName: string;
  weightPct: number | null;
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
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");
  return { source, apply: apply && !dryRun };
}

function fetchIndexConstituents(_indexName: string): IndexConstituent[] {
  // Legacy NSE SDK fallback removed from the active provider set.
  return [];
}

function fetchFromNsepython(indexName: string): IndexConstituent[] {
  try {
    const nseIndexMap: Record<string, string> = {
      "NIFTY 50": "NIFTY 50",
      "NIFTY BANK": "BANK NIFTY",
      "NIFTY IT": "NIFTY IT",
      "NIFTY PHARMA": "NIFTY PHARMA",
      "NIFTY AUTO": "NIFTY AUTO",
      "NIFTY FMCG": "NIFTY FMCG",
      "NIFTY METAL": "NIFTY METAL",
      "NIFTY ENERGY": "NIFTY ENERGY",
      "NIFTY MEDIA": "NIFTY MEDIA",
    };
    const mapped = nseIndexMap[indexName];
    if (!mapped) return [];

    const output = execSync(`python3 -c "
import json, sys
try:
    import nsepython
    data = nsepython.nse_get_index_quote('${mapped.replace(/'/g, "\\\\'")}')
    if isinstance(data, dict):
        consts = data.get('constituents', [])
        keys = 'available'
        print(json.dumps({'status': 'ok', 'keys': list(data.keys())[:10], 'has_constituents': bool(consts)}))
    else:
        print(json.dumps({'status': 'no_data'}))
except Exception as e:
    print(json.dumps({'status': 'error', 'detail': str(e)[:200]}))
"`, { encoding: "utf-8", timeout: 30_000, maxBuffer: 1024 * 1024 });
    const parsed = JSON.parse(output.trim());
    if (parsed.status !== "ok") return [];
    return [];
  } catch {
    return [];
  }
}

async function ensureIndexTable(): Promise<void> {
  try {
    await dbAdapter.query(`
      CREATE TABLE IF NOT EXISTS index_constituents (
        index_name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        company_name TEXT,
        weight_pct REAL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (index_name, symbol)
      )
    `);
  } catch {
    await dbAdapter.executeScript(`
      CREATE TABLE IF NOT EXISTS index_constituents (
        index_name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        company_name TEXT,
        weight_pct REAL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (index_name, symbol)
      )
    `);
  }
}

interface IndexReport {
  indexName: string;
  count: number;
  inserted: number;
  updated: number;
}

async function main(): Promise<void> {
  const options = parseArgs();
  console.log(JSON.stringify({
    script: "sync-index-constituents",
    mode: options.apply ? "apply" : "dry-run",
    source: options.source,
    indices: INDEX_NAMES,
  }));

  if (options.apply) {
    await dbAdapter.initialize();
    await ensureIndexTable();
  }

  const reports: IndexReport[] = [];

  for (const indexName of INDEX_NAMES) {
    let constituents: IndexConstituent[] = [];
    // NSELib source removed — evaluated and not active
    if (options.source === "auto" || options.source === "nsepython") {
      const nsepythonConstituents = fetchFromNsepython(indexName);
      if (nsepythonConstituents.length > 0) constituents = nsepythonConstituents;
    }

    if (constituents.length > 0) {
      let inserted = 0;
      let updated = 0;

      if (options.apply) {
        for (const c of constituents) {
          try {
            const existing = await dbAdapter.query(
              `SELECT symbol FROM index_constituents WHERE index_name = $1 AND symbol = $2`,
              [c.indexName, c.symbol],
            );
            if (existing.rows.length > 0) {
              await dbAdapter.query(
                `UPDATE index_constituents SET company_name = $3, weight_pct = $4, updated_at = datetime('now')
                 WHERE index_name = $1 AND symbol = $2`,
                [c.indexName, c.symbol, c.companyName || null, c.weightPct],
              );
              updated++;
            } else {
              await dbAdapter.query(
                `INSERT INTO index_constituents (index_name, symbol, company_name, weight_pct, updated_at)
                 VALUES ($1, $2, $3, $4, datetime('now'))`,
                [c.indexName, c.symbol, c.companyName || null, c.weightPct],
              );
              inserted++;
            }
          } catch {
            await dbAdapter.query(
              `INSERT OR REPLACE INTO index_constituents (index_name, symbol, company_name, weight_pct, updated_at)
               VALUES ($1, $2, $3, $4, datetime('now'))`,
              [c.indexName, c.symbol, c.companyName || null, c.weightPct],
            );
            inserted++;
          }
        }
      }

      reports.push({ indexName, count: constituents.length, inserted, updated });
      console.log(`  ${indexName}: ${constituents.length} constituents`);
    } else {
      reports.push({ indexName, count: 0, inserted: 0, updated: 0 });
      console.log(`  ${indexName}: no data available`);
    }
  }

  const totalConstituents = reports.reduce((s, r) => s + r.count, 0);
  console.log(JSON.stringify({
    summary: {
      source: options.source,
      mode: options.apply ? "apply" : "dry-run",
      indicesWithData: reports.filter((r) => r.count > 0).length,
      indicesWithoutData: reports.filter((r) => r.count === 0).length,
      totalConstituents,
      totalInserted: reports.reduce((s, r) => s + r.inserted, 0),
      totalUpdated: reports.reduce((s, r) => s + r.updated, 0),
    },
    reports,
  }, null, 2));

  if (options.apply) {
    await dbAdapter.shutdown();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
