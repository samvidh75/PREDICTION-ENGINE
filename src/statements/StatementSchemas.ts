/**
 * StatementSchemas — TRACK-21 Phase 3 Task 8
 *
 * Type definitions and validation for Balance Sheet, Income Statement,
 * and Cash Flow Statement data structures across quarterly, annual, and TTM periods.
 */

// ─── Balance Sheet ─────────────────────────────────────────

export interface BalanceSheet {
  symbol: string;
  periodEnd: string;        // ISO date
  periodType: 'annual' | 'quarterly' | 'ttm';
  reportingCurrency: string;

  // Assets
  totalAssets: number | null;
  currentAssets: number | null;
  cashAndEquivalents: number | null;
  inventory: number | null;
  goodwill: number | null;

  // Liabilities
  totalLiabilities: number | null;
  currentLiabilities: number | null;
  shortTermDebt: number | null;
  longTermDebt: number | null;
  totalDebt: number | null;

  // Equity
  totalEquity: number | null;
  sharesOutstanding: number | null;

  // Metadata
  sourceProvider: string;
  ingestedAt: string;
}

// ─── Income Statement ──────────────────────────────────────

export interface IncomeStatement {
  symbol: string;
  periodEnd: string;
  periodType: 'annual' | 'quarterly' | 'ttm';
  reportingCurrency: string;

  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebitda: number | null;
  netIncome: number | null;
  eps: number | null;
  interestExpense: number | null;
  incomeTaxExpense: number | null;
  preTaxIncome: number | null;

  sourceProvider: string;
  ingestedAt: string;
}

// ─── Cash Flow Statement ───────────────────────────────────

export interface CashFlowStatement {
  symbol: string;
  periodEnd: string;
  periodType: 'annual' | 'quarterly' | 'ttm';
  reportingCurrency: string;

  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  dividendsPaid: number | null;
  depreciationAmortization: number | null;

  sourceProvider: string;
  ingestedAt: string;
}

// ─── Combined Statement Set ──────────────────────────────

export interface StatementSet {
  symbol: string;
  balanceSheet: BalanceSheet | null;
  incomeStatement: IncomeStatement | null;
  cashFlow: CashFlowStatement | null;
  periodType: 'annual' | 'quarterly' | 'ttm';
  sourceProvider: string;
}

// ─── Validation ────────────────────────────────────────────

export interface StatementValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

export function validateBalanceSheet(bs: BalanceSheet): StatementValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!bs.totalAssets || bs.totalAssets <= 0) {
    issues.push('totalAssets is missing or <= 0');
  }

  if (bs.totalAssets != null && bs.totalLiabilities != null && bs.totalEquity != null) {
    const diff = Math.abs(bs.totalAssets - (bs.totalLiabilities + bs.totalEquity));
    if (bs.totalAssets > 0 && diff > 0.01 * bs.totalAssets) {
      warnings.push(`Balance sheet equation off by ${(diff / bs.totalAssets * 100).toFixed(2)}%`);
    }
  }

  if (bs.currentAssets != null && bs.totalAssets != null && bs.currentAssets > bs.totalAssets) {
    issues.push('currentAssets > totalAssets');
  }

  if (bs.currentLiabilities != null && bs.totalLiabilities != null && bs.currentLiabilities > bs.totalLiabilities) {
    issues.push('currentLiabilities > totalLiabilities');
  }

  return { valid: issues.length === 0, issues, warnings };
}

export function validateIncomeStatement(is: IncomeStatement): StatementValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Revenue should be positive for going concerns
  if (is.revenue != null && is.revenue <= 0) {
    warnings.push('revenue is <= 0 — possible dormant company or data issue');
  }

  // Gross profit should be <= revenue
  if (is.grossProfit != null && is.revenue != null && is.grossProfit > is.revenue) {
    warnings.push('grossProfit > revenue');
  }

  // Net income should not wildly exceed revenue
  if (is.netIncome != null && is.revenue != null && is.revenue > 0 && is.netIncome > is.revenue * 2) {
    warnings.push('netIncome > 2x revenue — unusual (check for extraordinary items)');
  }

  // Operating income <= EBITDA in most cases
  if (is.operatingIncome != null && is.ebitda != null && is.operatingIncome > is.ebitda) {
    warnings.push('operatingIncome > ebitda — unusual');
  }

  return { valid: issues.length === 0, issues, warnings };
}

export function validateCashFlow(cf: CashFlowStatement): StatementValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // CapEx should generally be <= operating CF (company spends less than it earns)
  if (cf.capitalExpenditure != null && cf.operatingCashFlow != null && cf.capitalExpenditure > cf.operatingCashFlow * 3) {
    warnings.push('CapEx > 3x operating cash flow — unusual spending pattern');
  }

  // FCF = OCF - CapEx minus (approximate)
  if (cf.freeCashFlow != null && cf.operatingCashFlow != null && cf.capitalExpenditure != null) {
    const expectedFcf = cf.operatingCashFlow - Math.abs(cf.capitalExpenditure);
    if (Math.abs(cf.freeCashFlow - expectedFcf) > Math.abs(expectedFcf) * 0.5) {
      warnings.push('freeCashFlow differs significantly from OCF - CapEx — verify definition');
    }
  }

  return { valid: issues.length === 0, issues, warnings };
}

export function validateStatementSet(set: StatementSet): StatementValidationResult {
  const allIssues: string[] = [];
  const allWarnings: string[] = [];

  if (set.balanceSheet) {
    const bs = validateBalanceSheet(set.balanceSheet);
    allIssues.push(...bs.issues.map(i => `BS: ${i}`));
    allWarnings.push(...bs.warnings.map(w => `BS: ${w}`));
  } else {
    allIssues.push('Balance sheet is missing');
  }

  if (set.incomeStatement) {
    const is = validateIncomeStatement(set.incomeStatement);
    allIssues.push(...is.issues.map(i => `IS: ${i}`));
    allWarnings.push(...is.warnings.map(w => `IS: ${w}`));
  } else {
    allIssues.push('Income statement is missing');
  }

  if (set.cashFlow) {
    const cf = validateCashFlow(set.cashFlow);
    allIssues.push(...cf.issues.map(i => `CF: ${i}`));
    allWarnings.push(...cf.warnings.map(w => `CF: ${w}`));
  } else {
    allWarnings.push('Cash flow statement is missing');
  }

  return { valid: allIssues.length === 0, issues: allIssues, warnings: allWarnings };
}
