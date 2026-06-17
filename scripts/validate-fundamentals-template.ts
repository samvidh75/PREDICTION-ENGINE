export {};
/**
 * validate-fundamentals-template.ts
 *
 * Validates a fundamentals CSV before import.
 * Checks required columns, numeric fields, dates, and symbol existence.
 *
 * Usage:
 *   npx tsx scripts/validate-fundamentals-template.ts --file=data/templates/fundamentals-import-template.csv
 */

import fs from "fs";

type Severity = "error" | "warning" | "info";

interface ValidationIssue {
  row: number;
  field: string;
  severity: Severity;
  message: string;
}

const KNOWN_SYMBOLS = new Set([
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "BHARTIARTL",
  "SBIN", "ITC", "LT", "AXISBANK", "KOTAKBANK", "HINDUNILVR",
  "MARUTI", "SUNPHARMA", "BAJFINANCE", "HCLTECH", "WIPRO",
  "ASIANPAINT", "ULTRACEMCO", "TITAN", "NTPC", "POWERGRID",
  "M&M", "ADANIENT", "ADANIPORTS", "TATASTEEL", "JSWSTEEL",
  "COALINDIA", "ONGC", "NESTLEIND", "TECHM",
]);

const REQUIRED_COLUMNS = ["symbol", "period_end_date", "source_label"];
const NUMERIC_COLUMNS = [
  "revenue", "operating_profit", "net_profit", "eps", "book_value",
  "debt", "equity", "roe", "roce", "debt_to_equity",
  "operating_margin", "net_margin", "pe_ratio", "pb_ratio",
  "revenue_growth", "profit_growth", "operating_cash_flow", "free_cash_flow",
];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] || "").trim(); });
    return row;
  });
  return { headers, rows };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let file = "";

  for (const arg of args) {
    if (arg.startsWith("--file=")) file = arg.split("=")[1].trim();
  }

  if (!file) {
    console.error("Usage: npx tsx scripts/validate-fundamentals-template.ts --file=<path>");
    process.exit(1);
  }

  let text: string;
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch {
    console.error(`ERROR: Cannot read file: ${file}`);
    process.exit(1);
  }

  const { headers, rows } = parseCsv(text);
  const issues: ValidationIssue[] = [];

  console.log(`\n=== Fundamentals Template Validation: ${file} ===`);
  console.log(`  Columns: ${headers.length}`);
  console.log(`  Rows:    ${rows.length}\n`);

  // Check required columns
  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      issues.push({ row: 0, field: col, severity: "error", message: `Missing required column: "${col}"` });
    }
  }

  // Check for unknown columns (warn, don't fail)
  const knownCols = new Set([...REQUIRED_COLUMNS, ...NUMERIC_COLUMNS,
    "company_name", "ticker", "period_type", "currency", "unit",
    "sales", "ebit", "pat", "bv", "total_debt", "shareholders_funds",
    "d_e", "pe", "pb", "sales_growth", "earnings_growth", "ocf", "fcf",
    "source_url", "url", "source",
  ]);
  for (const col of headers) {
    if (col === "") continue;
    if (!knownCols.has(col)) {
      issues.push({ row: 0, field: col, severity: "warning", message: `Unknown column: "${col}" (will be ignored)` });
    }
  }

  // Validate each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const symbol = (row.symbol || "").toUpperCase();
    if (!symbol) {
      issues.push({ row: rowNum, field: "symbol", severity: "error", "message": "Missing symbol" });
    } else if (!KNOWN_SYMBOLS.has(symbol) && !symbol.startsWith("TEST")) {
      issues.push({ row: rowNum, field: "symbol", severity: "warning", "message": `Symbol "${symbol}" not in known universe` });
    }

    const date = row.period_end_date || "";
    if (!date) {
      issues.push({ row: rowNum, field: "period_end_date", severity: "error", "message": "Missing date" });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      issues.push({ row: rowNum, field: "period_end_date", severity: "error", "message": `Invalid date: "${date}" (expected YYYY-MM-DD)` });
    }

    const periodType = (row.period_type || "annual").toLowerCase();
    if (!["annual", "quarterly", "ttm", "unknown"].includes(periodType)) {
      issues.push({ row: rowNum, field: "period_type", severity: "warning", "message": `Unusual period_type: "${periodType}"` });
    }

    if (!row.source_label) {
      issues.push({ row: rowNum, field: "source_label", severity: "error", "message": "Missing source_label" });
    }

    // Validate numeric fields
    for (const col of NUMERIC_COLUMNS) {
      const val = row[col];
      if (val !== undefined && val !== "") {
        const cleaned = val.replace(/[₹,$%\s,]/g, "").trim();
        const num = Number(cleaned);
        if (!Number.isFinite(num)) {
          issues.push({ row: rowNum, field: col, severity: "error", message: `Invalid number: "${val}"` });
        }
      }
    }
  }

  // Print issues
  if (issues.length === 0) {
    console.log("  ✓ No issues found — template is valid.\n");
    process.exit(0);
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  for (const issue of issues) {
    const icon = issue.severity === "error" ? "✗" : issue.severity === "warning" ? "△" : "ℹ";
    const rowLabel = issue.row > 0 ? `Row ${issue.row}` : "Header";
    console.log(`  ${icon} [${issue.severity}] ${rowLabel}, ${issue.field}: ${issue.message}`);
  }

  console.log(`\n  --- Summary ---`);
  console.log(`  Errors:   ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log(`\n  FAIL: Fix errors and re-run.\n`);
    process.exit(1);
  }

  console.log(`\n  PASS (with warnings).\n`);
  process.exit(0);
}

main();
