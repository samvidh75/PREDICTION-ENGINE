import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { loadEnv } from "../src/backend/config/env";
import { PostgresClient } from "../src/backend/persistence/postgres/postgresClient";
import {
  buildFinancialExpansionReport,
  buildVerificationReport,
  type WarehouseFinancialRow,
  type WarehouseSymbolRow,
  verifyCompanyRow,
} from "../src/backend/quality/companyDataQuality";

type LatestFinancialMap = Map<string, WarehouseFinancialRow>;

function getProjectRoot(): string {
  return path.resolve("PREDICTION-ENGINE");
}

function loadProjectEnv(): void {
  dotenv.config({ path: path.join(getProjectRoot(), ".env") });
}

async function fetchSymbols(db: PostgresClient): Promise<WarehouseSymbolRow[]> {
  const { rows } = await db.query<WarehouseSymbolRow>(
    "select symbol, exchange, isin, company_name, sector, industry, listing_status from symbols order by symbol asc",
  );
  return rows;
}

async function fetchLatestFinancials(db: PostgresClient): Promise<WarehouseFinancialRow[]> {
  const { rows } = await db.query<WarehouseFinancialRow>(
    "select distinct on (symbol) symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta, free_float from financial_snapshots order by symbol asc, period_end desc",
  );
  return rows;
}

function indexLatestFinancials(rows: WarehouseFinancialRow[]): LatestFinancialMap {
  const map: LatestFinancialMap = new Map();
  for (const row of rows) {
    const key = row.symbol.trim().toUpperCase();
    if (!map.has(key)) map.set(key, row);
  }
  return map;
}

async function main(): Promise<void> {
  loadProjectEnv();
  const env = loadEnv();
  if (!env.postgres) {
    throw new Error("DATABASE_URL is not configured");
  }

  const db = new PostgresClient(env);
  const symbols = await fetchSymbols(db);
  const financials = await fetchLatestFinancials(db);
  const verification = symbols.map(verifyCompanyRow);

  const reportsDir = path.join(getProjectRoot(), "reports");
  const verifiedPath = path.join(reportsDir, "REAL_COMPANY_VERIFICATION_REPORT.md");
  const financialPath = path.join(reportsDir, "FINANCIAL_EXPANSION_REPORT.md");

  await mkdir(reportsDir, { recursive: true });

  const verificationReport = buildVerificationReport(symbols);
  const financialReport = buildFinancialExpansionReport({
    verifiedCompanies: verification,
    financialRows: financials,
  });

  await writeFile(verifiedPath, verificationReport, "utf8");
  await writeFile(financialPath, financialReport, "utf8");

  const latestFinancials = indexLatestFinancials(financials);
  const verifiedCount = verification.filter((row) => row.status === "VERIFIED").length;
  const partialCount = verification.filter((row) => row.status === "PARTIAL").length;
  const invalidCount = verification.filter((row) => row.status === "INVALID").length;
  const coveredCount = verification.filter((row) => latestFinancials.has(row.symbol)).length;

  console.log(
    JSON.stringify(
      {
        symbols: symbols.length,
        verified: verifiedCount,
        partial: partialCount,
        invalid: invalidCount,
        financialSnapshots: financials.length,
        verifiedWithFinancialSnapshot: coveredCount,
        reports: {
          verification: verifiedPath,
          financial: financialPath,
        },
      },
      null,
      2,
    ),
  );

  await db.shutdown();
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
