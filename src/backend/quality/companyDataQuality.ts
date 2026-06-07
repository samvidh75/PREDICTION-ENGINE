export type VerificationStatus = "VERIFIED" | "PARTIAL" | "INVALID";

export type WarehouseSymbolRow = {
  symbol: string;
  exchange: string;
  isin: string | null;
  company_name: string;
  sector: string | null;
  industry: string | null;
  listing_status: string | null;
};

export type WarehouseFinancialRow = {
  symbol: string;
  period_end: string;
  market_cap: number | null;
  pe_ratio: number | null;
  eps: number | null;
  dividend_yield: number | null;
  beta: number | null;
  free_float: number | null;
};

export type VerificationResult = {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string | null;
  industry: string | null;
  isin: string | null;
  status: VerificationStatus;
  reasons: string[];
};

const REQUIRED_FINANCIAL_COVERAGE = [
  "Revenue",
  "Net Profit",
  "Operating Margin",
  "ROE",
  "ROCE",
  "Debt",
  "Cash",
  "EPS",
  "Book Value",
] as const;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValidIsin(isin: string | null): boolean {
  return !!isin && /^[A-Z]{2}[A-Z0-9]{10}$/.test(isin.trim().toUpperCase());
}

export function verifyCompanyRow(row: WarehouseSymbolRow): VerificationResult {
  const reasons: string[] = [];
  const symbol = row.symbol.trim().toUpperCase();
  const companyName = row.company_name.trim();
  const exchange = row.exchange.trim().toUpperCase();

  if (!hasText(row.symbol)) reasons.push("missing_symbol");
  if (!hasText(row.company_name)) reasons.push("missing_company_name");
  if (!hasText(row.exchange)) reasons.push("missing_exchange");
  if (!hasText(row.sector)) reasons.push("missing_sector");
  if (!hasText(row.industry)) reasons.push("missing_industry");
  if (!hasValidIsin(row.isin)) reasons.push("invalid_isin");

  const requiredCount = [row.symbol, row.company_name, row.exchange, row.sector, row.industry].filter(hasText).length;
  const status: VerificationStatus =
    reasons.length === 0
      ? "VERIFIED"
      : requiredCount >= 4
        ? "PARTIAL"
        : "INVALID";

  return {
    symbol,
    companyName,
    exchange,
    sector: row.sector,
    industry: row.industry,
    isin: row.isin,
    status,
    reasons,
  };
}

export function buildVerificationReport(rows: WarehouseSymbolRow[]): string {
  const results = rows.map(verifyCompanyRow);
  const verified = results.filter((r) => r.status === "VERIFIED").length;
  const partial = results.filter((r) => r.status === "PARTIAL").length;
  const invalid = results.filter((r) => r.status === "INVALID").length;

  const header = [
    "# REAL_COMPANY_VERIFICATION_REPORT",
    "",
    `- Total symbols: ${results.length}`,
    `- Verified: ${verified}`,
    `- Partial: ${partial}`,
    `- Invalid: ${invalid}`,
    "",
    "| Symbol | Company | Exchange | Sector | Industry | ISIN | Status | Reasons |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  const rowsText = results.map((r) => {
    const reasons = r.reasons.length ? r.reasons.join(", ") : "-";
    return `| ${r.symbol} | ${r.companyName || "-"} | ${r.exchange || "-"} | ${r.sector || "-"} | ${r.industry || "-"} | ${r.isin || "-"} | ${r.status} | ${reasons} |`;
  });

  return [...header, ...rowsText].join("\n");
}

export function buildFinancialExpansionReport(args: {
  verifiedCompanies: VerificationResult[];
  financialRows: WarehouseFinancialRow[];
}): string {
  const coveredSymbols = new Set(args.financialRows.map((r) => r.symbol.trim().toUpperCase()));
  const verifiedCount = args.verifiedCompanies.filter((c) => c.status === "VERIFIED").length;
  const partialCount = args.verifiedCompanies.filter((c) => c.status === "PARTIAL").length;
  const invalidCount = args.verifiedCompanies.filter((c) => c.status === "INVALID").length;
  const withFinancialSnapshot = args.verifiedCompanies.filter((c) => coveredSymbols.has(c.symbol)).length;

  const coverageLines = REQUIRED_FINANCIAL_COVERAGE.map((metric) => `- ${metric}: warehouse coverage not yet materialized in the current schema snapshot`).join("\n");

  const detailRows = args.verifiedCompanies.slice(0, 25).map((c) => {
    const hasSnapshot = coveredSymbols.has(c.symbol) ? "yes" : "no";
    return `| ${c.symbol} | ${c.companyName} | ${c.status} | ${hasSnapshot} |`;
  });

  return [
    "# FINANCIAL_EXPANSION_REPORT",
    "",
    `- Verified companies reviewed: ${args.verifiedCompanies.length}`,
    `- Verified: ${verifiedCount}`,
    `- Partial: ${partialCount}`,
    `- Invalid: ${invalidCount}`,
    `- Companies with financial snapshot rows: ${withFinancialSnapshot}`,
    "",
    "## Coverage state",
    coverageLines,
    "",
    "## Sample verification linkage",
    "| Symbol | Company | Verification Status | Financial Snapshot Present |",
    "| --- | --- | --- | --- |",
    ...detailRows,
  ].join("\n");
}

export function getRequiredFinancialCoverage(): readonly string[] {
  return REQUIRED_FINANCIAL_COVERAGE;
}
