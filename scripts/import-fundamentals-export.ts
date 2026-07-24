export {};
/**
 * import-fundamentals-export.ts
 *
 * Imports financial fundamentals from user-provided CSV exports.
 * Sources: Screener.in, Moneycontrol, or manual CSV templates.
 *
 * Usage:
 *   npx tsx scripts/import-fundamentals-export.ts --source=screener --file=./data/exports/RELIANCE.csv --dry-run
 *   npx tsx scripts/import-fundamentals-export.ts --source=manual --file=./data/templates/fundamentals-import-template.csv --apply
 *
 * Environment:
 *   IMPORT_TIMEOUT_MS  — per-row timeout (default: 5000)
 *   DRY_RUN            — set to "true" to default to dry-run
 */

import fs from "fs";
import path from "path";

const TIMEOUT_MS = parseInt(process.env.IMPORT_TIMEOUT_MS || "5000", 10);

interface ImportRow {
  symbol: string;
  companyName?: string;
  periodEndDate: string;
  periodType: "annual" | "quarterly" | "ttm" | "unknown";
  currency?: string;
  unit?: string;
  revenue?: number | null;
  operatingProfit?: number | null;
  netProfit?: number | null;
  eps?: number | null;
  bookValue?: number | null;
  debt?: number | null;
  equity?: number | null;
  roe?: number | null;
  roce?: number | null;
  debtToEquity?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  peRatio?: number | null;
  pbRatio?: number | null;
  revenueGrowth?: number | null;
  profitGrowth?: number | null;
  operatingCashFlow?: number | null;
  freeCashFlow?: number | null;
  sourceLabel: string;
  sourceUrl?: string;
}

interface ImportResult {
  row: number;
  symbol: string;
  status: "ok" | "skipped" | "error";
  reason?: string;
  fields?: number;
}

const VALID_SOURCES = ["screener", "moneycontrol", "manual", "csv"];
const VALID_PERIOD_TYPES = ["annual", "quarterly", "ttm", "unknown"];

// Column name normalization maps
const COLUMN_ALIASES: Record<string, string> = {
  symbol: "symbol",
  ticker: "symbol",
  company_name: "companyName",
  company: "companyName",
  period_end_date: "periodEndDate",
  period_end: "periodEndDate",
  period_type: "periodType",
  currency: "currency",
  unit: "unit",
  revenue: "revenue",
  sales: "revenue",
  operating_profit: "operatingProfit",
  ebit: "operatingProfit",
  net_profit: "netProfit",
  pat: "netProfit",
  eps: "eps",
  book_value: "bookValue",
  bv: "bookValue",
  debt: "debt",
  total_debt: "debt",
  equity: "equity",
  shareholders_funds: "equity",
  roe: "roe",
  roce: "roce",
  debt_to_equity: "debtToEquity",
  d_e: "debtToEquity",
  operating_margin: "operatingMargin",
  net_margin: "netMargin",
  pe_ratio: "peRatio",
  pe: "peRatio",
  pb_ratio: "pbRatio",
  pb: "pbRatio",
  revenue_growth: "revenueGrowth",
  sales_growth: "revenueGrowth",
  profit_growth: "profitGrowth",
  earnings_growth: "profitGrowth",
  operating_cash_flow: "operatingCashFlow",
  ocf: "operatingCashFlow",
  free_cash_flow: "freeCashFlow",
  fcf: "freeCashFlow",
  source_label: "sourceLabel",
  source: "sourceLabel",
  source_url: "sourceUrl",
  url: "sourceUrl",
};

function parseArgs(): { source: string; file: string; apply: boolean; dryRun: boolean } {
  const args = process.argv.slice(2);
  let source = "csv";
  let file = "";
  let apply = false;
  let dryRun = true;

  for (const arg of args) {
    if (arg.startsWith("--source=")) source = arg.split("=")[1].trim().toLowerCase();
    else if (arg.startsWith("--file=")) file = arg.split("=")[1].trim();
    else if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") dryRun = true;
  }

  if (!file) {
    console.error("ERROR: --file=<path> is required");
    process.exit(1);
  }

  if (!VALID_SOURCES.includes(source)) {
    console.error(`ERROR: invalid source "${source}". Valid: ${VALID_SOURCES.join(", ")}`);
    process.exit(1);
  }

  return { source, file, apply, dryRun };
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.toLowerCase().trim()] = (values[i] || "").trim();
    });
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseNumeric(val: string | undefined): number | null {
  if (!val || val.trim() === "") return null;
  const cleaned = val.replace(/[Rs,$%\s,]/g, "").trim();
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return num;
}

function normalizeRow(raw: Record<string, string>, source: string): ImportRow {
  const row: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const normalized = COLUMN_ALIASES[key] || key;
    row[normalized] = val;
  }

  const periodType = (row.periodType || "annual").toLowerCase() as ImportRow["periodType"];
  if (!VALID_PERIOD_TYPES.includes(periodType)) {
    throw new Error(`Invalid period_type: "${periodType}". Valid: ${VALID_PERIOD_TYPES.join(", ")}`);
  }

  const sourceLabel = row.sourceLabel || source;

  return {
    symbol: (row.symbol || "").toUpperCase(),
    companyName: row.companyName || undefined,
    periodEndDate: row.periodEndDate || "",
    periodType,
    currency: row.currency || "PKR",
    unit: row.unit || "unspecified",
    revenue: parseNumeric(row.revenue),
    operatingProfit: parseNumeric(row.operatingProfit),
    netProfit: parseNumeric(row.netProfit),
    eps: parseNumeric(row.eps),
    bookValue: parseNumeric(row.bookValue),
    debt: parseNumeric(row.debt),
    equity: parseNumeric(row.equity),
    roe: parseNumeric(row.roe),
    roce: parseNumeric(row.roce),
    debtToEquity: parseNumeric(row.debtToEquity),
    operatingMargin: parseNumeric(row.operatingMargin),
    netMargin: parseNumeric(row.netMargin),
    peRatio: parseNumeric(row.peRatio),
    pbRatio: parseNumeric(row.pbRatio),
    revenueGrowth: parseNumeric(row.revenueGrowth),
    profitGrowth: parseNumeric(row.profitGrowth),
    operatingCashFlow: parseNumeric(row.operatingCashFlow),
    freeCashFlow: parseNumeric(row.freeCashFlow),
    sourceLabel,
    sourceUrl: row.sourceUrl || undefined,
  };
}

function validateRow(row: ImportRow, index: number): string | null {
  if (!row.symbol) return `Row ${index}: missing symbol`;
  if (!row.periodEndDate) return `Row ${index}: missing period_end_date`;
  if (row.periodEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.periodEndDate)) {
    return `Row ${index}: invalid date format "${row.periodEndDate}" (expected YYYY-MM-DD)`;
  }
  // Check for NaN/Infinity in all numeric fields
  const numericFields: (keyof ImportRow)[] = [
    "revenue", "operatingProfit", "netProfit", "eps", "bookValue", "debt", "equity",
    "roe", "roce", "debtToEquity", "operatingMargin", "netMargin", "peRatio", "pbRatio",
    "revenueGrowth", "profitGrowth", "operatingCashFlow", "freeCashFlow",
  ];
  for (const field of numericFields) {
    const val = row[field];
    if (val !== null && val !== undefined && !Number.isFinite(val)) {
      return `Row ${index}: ${field} is NaN/Infinity`;
    }
  }
  return null;
}

function formatRowDisplay(row: ImportRow): string {
  const flags: string[] = [];
  if (row.revenue !== null) flags.push("revenue");
  if (row.netProfit !== null) flags.push("net_profit");
  if (row.eps !== null) flags.push("eps");
  if (row.roe !== null) flags.push("roe");
  if (row.peRatio !== null) flags.push("pe");
  const fields = flags.length;
  return `${row.symbol} | ${row.periodEndDate} | ${row.periodType} | ${fields} fields | source: ${row.sourceLabel}`;
}

async function main(): Promise<void> {
  const { source, file, apply, dryRun } = parseArgs();

  console.log(`\n=== Fundamentals Import: ${file} ===`);
  console.log(`  Source: ${source}`);
  console.log(`  Mode:   ${apply ? "apply" : "dry-run"}\n`);

  // Read and parse file
  let text: string;
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch (err) {
    console.error(`ERROR: Cannot read file: ${file}`);
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const rawRows = parseCsv(text);
  if (rawRows.length === 0) {
    console.error("ERROR: No rows found in CSV (need header + at least 1 data row)");
    process.exit(1);
  }

  console.log(`  Parsed ${rawRows.length} rows from CSV\n`);

  // Normalize and validate
  const results: ImportResult[] = [];
  let okCount = 0;
  const skipCount = 0;
  let errCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    try {
      const row = normalizeRow(rawRows[i], source);
      const validationError = validateRow(row, i + 2);

      if (validationError) {
        results.push({ row: i + 2, symbol: row.symbol, status: "error", reason: validationError });
        errCount++;
        continue;
      }

      results.push({ row: i + 2, symbol: row.symbol, status: "ok", fields: countFields(row) });
      okCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ row: i + 2, symbol: "?", status: "error", reason: msg });
      errCount++;
    }
  }

  // Print results
  for (const r of results) {
    const icon = r.status === "ok" ? "✓" : r.status === "skipped" ? "△" : "✗";
    console.log(`  ${icon} Row ${r.row}: ${r.symbol}  ${r.reason || `${r.fields} fields`}`);
  }

  console.log(`\n  --- Summary ---`);
  console.log(`  OK:      ${okCount}`);
  console.log(`  Errors:  ${errCount}`);
  console.log(`  Skipped: ${skipCount}`);

  if (errCount > 0) {
    console.log(`\n  ERROR: ${errCount} row(s) failed validation. Fix and re-run.`);
    process.exit(1);
  }

  if (dryRun || !apply) {
    console.log(`\n  Dry-run complete. No DB writes.`);
    console.log(`  Run with --apply to write to database.`);
    process.exit(0);
  }

  // Apply mode (placeholder for actual DB write — will use dbAdapter)
  console.log(`\n  Apply mode: writing ${okCount} rows to financial_snapshots...`);
  console.log(`  (DB write requires implementation via dbAdapter.query)`);
  process.exit(0);
}

function countFields(row: ImportRow): number {
  let count = 0;
  const fields: (keyof ImportRow)[] = [
    "revenue", "operatingProfit", "netProfit", "eps", "bookValue", "debt", "equity",
    "roe", "roce", "debtToEquity", "operatingMargin", "netMargin", "peRatio", "pbRatio",
    "revenueGrowth", "profitGrowth", "operatingCashFlow", "freeCashFlow",
  ];
  for (const field of fields) {
    if (row[field] !== null && row[field] !== undefined) count++;
  }
  return count;
}

main();
